"""
MIS Insurance Import Script
Run locally: python scripts/import_mis_insurance.py
Requirements: pip install openpyxl supabase
"""
import sys, os, datetime
try:
    import openpyxl
    from supabase import create_client
except ImportError:
    print("Install: pip install openpyxl supabase")
    sys.exit(1)

SUPABASE_URL  = "https://wroofywjkfqglbsnnovo.supabase.co"
SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb29meXdqa2ZxZ2xic25ub3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjY2MjcsImV4cCI6MjA5NTYwMjYyN30.zmCAqdixj-yaiWp-n46AAqwrtUM0qDp__5N7eZZBYD4"
ADMIN_USER_ID = "bbb91714-eb65-43e9-bc9f-0eb708b75924"
EXCEL_PATH    = os.path.join(os.path.dirname(__file__), "MIS REPORT-INSURANCE.xlsx")

C_SERIAL=0; C_VEH_NO=1; C_PROPOSAL=2; C_LEAD_DATE=3; C_CHQ_DATE=4
C_POLICY_NO=5; C_INSURED=6; C_PHONE=9; C_EMAIL=10; C_INS_TYPE=11
C_INS_CO=12; C_THROUGH=13; C_FRESH_REN=14; C_START=18; C_VEH_MODEL=20
C_OD=23; C_TP=24; C_CHQ_ONLINE=26; C_PAYOUT_ST=27; C_CASHBACK=29; C_PAY_PCT=30

def to_date(val):
    if val is None: return None
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    if not s or s == 'None': return None
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
        try: return datetime.datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except: pass
    return None

def f(v): return float(v) if v is not None else 0.0
def s(v): return str(v).strip() if v is not None else ''

print("Connecting to Supabase...")
sb = create_client(SUPABASE_URL, SUPABASE_ANON)
wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb['Sheet2']

existing = sb.table('core_customers').select('id,mobile').execute()
phone_to_id = {str(c['mobile']).strip(): c['id'] for c in existing.data if c.get('mobile')}
print(f"Loaded {len(phone_to_id)} existing customers")

created = 0; inserted = 0; errors = 0; row_num = 0

for row in ws.iter_rows(min_row=2, values_only=True):
    if row[C_SERIAL] is None: continue
    row_num += 1
    name = s(row[C_INSURED])
    if not name: continue
    phone = s(row[C_PHONE]); email = s(row[C_EMAIL])
    cid = phone_to_id.get(phone) if phone else None
    if not cid:
        r = sb.table('core_customers').insert({
            'full_name': name, 'mobile': phone, 'email': email,
            'status': 'active', 'active': True,
            'owner_id': ADMIN_USER_ID, 'created_by': ADMIN_USER_ID,
            'access_level': 'team', 'is_restricted': False,
            'notes': 'Imported from MIS Insurance register',
        }).execute()
        if r.data:
            cid = r.data[0]['id']
            if phone: phone_to_id[phone] = cid
            created += 1
        else:
            print(f"  ERROR customer {name}: {getattr(r,'error',r)}")
            errors += 1; continue

    ins_type = s(row[C_INS_TYPE]).upper()
    cat = {'FW':'FW','TW':'TW','HEALTH':'Health','SME':'SME'}.get(ins_type, ins_type)
    policy_type = {'FW':'Motor','TW':'Motor','Health':'Health','SME':'Other'}.get(cat,'Other')

    od = f(row[C_OD]); tp = f(row[C_TP])
    premium = round((od+tp)*1.18, 2)
    pay_pct = f(row[C_PAY_PCT]); cashback = f(row[C_CASHBACK])
    payout_amt = round(od*pay_pct, 2)
    profitable = round(payout_amt - cashback, 2)

    start_date = to_date(row[C_START])
    renewal_date = None
    if start_date:
        d = datetime.datetime.strptime(start_date,'%Y-%m-%d') + datetime.timedelta(days=364)
        renewal_date = d.strftime('%Y-%m-%d')

    ps = s(row[C_PAYOUT_ST]).upper()
    payout_status = 'paid' if ps=='PAID' else ('na' if ps.startswith('NA') else 'pending')
    is_renewal = 'RENEWAL' in s(row[C_FRESH_REN]).upper()
    pm_raw = s(row[C_CHQ_ONLINE]).upper()
    pay_mode = 'Online' if 'ONLINE' in pm_raw else ('Cheque' if pm_raw else '')

    ref_id = s(row[C_PROPOSAL]) or f'IMP-{row_num:04d}'
    r = sb.table('core_insurance_policies').insert({
        'ref_id': ref_id,
        'customer_id': cid, 'policy_type': policy_type,
        'insurance_company': s(row[C_INS_CO]), 'policy_number': s(row[C_POLICY_NO]),
        'premium_amount': premium, 'sum_assured': 0,
        'policy_start_date': start_date, 'renewal_date': renewal_date,
        'nominee_name': '', 'status': 'active', 'notes': s(row[C_VEH_MODEL]),
        'active': True, 'created_by': ADMIN_USER_ID, 'owner_id': ADMIN_USER_ID,
        'insurance_category': cat, 'vehicle_number': s(row[C_VEH_NO]),
        'vehicle_model': s(row[C_VEH_MODEL]), 'proposal_number': s(row[C_PROPOSAL]),
        'lead_date': to_date(row[C_LEAD_DATE]), 'is_renewal': is_renewal,
        'channel': s(row[C_THROUGH]), 'od_amount': od, 'tp_amount': tp,
        'payout_percentage': pay_pct, 'payout_amount': payout_amt,
        'cashback_amount': cashback, 'profitable_amount': profitable,
        'payout_status': payout_status, 'payment_mode': pay_mode,
        'payment_reference': '', 'chq_reported_date': to_date(row[C_CHQ_DATE]),
    }).execute()

    if r.data:
        inserted += 1
        if renewal_date:
            sb.table('core_renewals').insert({
                'customer_id': cid, 'policy_id': r.data[0]['id'],
                'renewal_type': 'insurance',
                'title': f"{cat} - {s(row[C_INS_CO])}",
                'renewal_date': renewal_date, 'amount': premium,
                'status': 'pending', 'active': True,
            }).execute()
    else:
        print(f"  ERROR policy {name}: {getattr(r,'error',r)}")
        errors += 1

    if inserted % 50 == 0 and inserted > 0:
        print(f"  ... {inserted} policies inserted")

print(f"\nDone! Policies: {inserted} | New customers: {created} | Errors: {errors}")
