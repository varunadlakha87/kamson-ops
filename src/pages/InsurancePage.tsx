import { useEffect, useState, useCallback } from 'react';
import { supabase, T } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Search, Shield, Phone, MessageCircle, ChevronRight,
  IndianRupee, User, X, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const INSURANCE_TYPES = [
  'Motor', 'Health', 'Term Life', 'ULIP', 'Endowment', 'Home', 'Travel', 'SME', 'Other',
] as const;

const STAGE_CONFIG = {
  Lead:   { label: 'Lead',   color: 'text-slate-600',   bg: 'bg-slate-100',  dot: 'bg-slate-400'   },
  Quote:  { label: 'Quote',  color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500'    },
  Policy: { label: 'Policy', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  Payout: { label: 'Payout', color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500'   },
  Closed: { label: 'Closed', color: 'text-slate-500',   bg: 'bg-slate-100',  dot: 'bg-slate-300'   },
} as const;
type Stage = keyof typeof STAGE_CONFIG;

const STAGE_FILTERS = [
  { key: 'all' as const,    label: 'All'    },
  { key: 'Lead' as const,   label: 'Lead'   },
  { key: 'Quote' as const,  label: 'Quote'  },
  { key: 'Policy' as const, label: 'Policy' },
  { key: 'Payout' as const, label: 'Payout' },
  { key: 'Closed' as const, label: 'Closed' },
];
type StageFilter = typeof STAGE_FILTERS[number]['key'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface CaseListItem {
  id: string; insurance_code: string | null; ref_id: string;
  customer_name: string; mobile: string;
  insurance_type: string | null; policy_type: string | null;
  insurance_company: string | null; vehicle_number: string | null;
  current_stage: string | null; case_status: string | null;
  premium_amount: number; payout_status: string | null;
  policy_end_date: string | null; created_at: string;
  rm: { full_name: string } | null;
  customer: { customer_code: string } | null;
}

interface CustomerOption {
  id: string; full_name: string; mobile: string;
  customer_code: string; assigned_rm_id: string | null;
}

interface RMOption { id: string; full_name: string; }

const emptyLeadForm = {
  customer_id: '', customer_name: '', customer_code: '', mobile: '',
  insurance_type: '',
  business_type: 'Fresh' as 'Fresh' | 'Renewal',
  vehicle_number: '',
  contact_person: '',
  rm_id: '',
  remarks: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStage(c: CaseListItem): Stage {
  const s = c.current_stage;
  if (s && s in STAGE_CONFIG) return s as Stage;
  const cs = c.case_status || '';
  if (cs === 'Policy Issued') return 'Policy';
  if (['Quote Requested','Quote Received','Customer Discussion','Documents Pending','Under Process'].includes(cs)) return 'Quote';
  if (['Closed','Rejected'].includes(cs)) return 'Closed';
  return 'Lead';
}

function isMotor(c: CaseListItem) {
  return (c.insurance_type || c.policy_type || '').toLowerCase().includes('motor');
}

function isRenewalDue(c: CaseListItem) {
  if (!c.policy_end_date) return false;
  const diff = (new Date(c.policy_end_date).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 30;
}

function formatAmount(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: Stage }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 font-medium leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── InsurancePage ─────────────────────────────────────────────────────────────

interface InsurancePageProps {
  initialAction?: string;
  onViewCase?: (caseId: string) => void;
}

export default function InsurancePage({ initialAction, onViewCase }: InsurancePageProps) {
  const { user } = useAuth();

  const [cases, setCases]               = useState<CaseListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [stageFilter, setStageFilter]   = useState<StageFilter>('all');

  // Lead sheet
  const [showLeadSheet, setShowLeadSheet] = useState(false);
  const [leadForm, setLeadForm]           = useState(emptyLeadForm);
  const [customers, setCustomers]         = useState<CustomerOption[]>([]);
  const [custSearch, setCustSearch]       = useState('');
  const [showCustDrop, setShowCustDrop]   = useState(false);
  const [rms, setRms]                     = useState<RMOption[]>([]);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [queryError, setQueryError]       = useState('');

  const loadCases = useCallback(async () => {
    setLoading(true); setQueryError('');
    // Try full query (requires migrations to be run)
    let { data, error } = await supabase
      .from(T.INSURANCE_CASES)
      .select([
        'id, insurance_code, ref_id, customer_id, customer_name, mobile,',
        'insurance_type, policy_type, insurance_company, vehicle_number,',
        'current_stage, case_status, premium_amount, payout_status,',
        'policy_end_date, created_at,',
        'rm:master_users!core_insurance_cases_rm_id_fkey(full_name)',
      ].join(''))
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Insurance loadCases (full):', error.message);
      // Migrations not yet run — fall back to original columns only
      const res = await supabase
        .from(T.INSURANCE_CASES)
        .select('id, ref_id, customer_id, customer_name, vehicle_number, policy_type, case_status, premium_amount, payout_status, policy_end_date, created_at')
        .order('created_at', { ascending: false });
      if (res.error) {
        setQueryError(res.error.message);
      } else {
        setQueryError('Run pending migrations to unlock full insurance module features');
      }
      setCases((res.data as CaseListItem[]) || []);
    } else {
      setQueryError('');
      setCases((data as CaseListItem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  useEffect(() => {
    if (initialAction === 'new') { setShowLeadSheet(true); }
  }, [initialAction]);

  useEffect(() => {
    if (!showLeadSheet) return;
    supabase.from(T.CUSTOMERS).select('id,full_name,mobile,customer_code,assigned_rm_id')
      .eq('active', true).order('full_name')
      .then(({ data }) => setCustomers((data as CustomerOption[]) || []));
    supabase.from(T.USERS).select('id,full_name')
      .eq('is_active', true).order('full_name')
      .then(({ data }) => setRms((data as RMOption[]) || []));
  }, [showLeadSheet]);

  const filteredCases = cases.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      c.customer_name?.toLowerCase().includes(s) ||
      c.mobile?.includes(s) ||
      c.vehicle_number?.toLowerCase().includes(s) ||
      c.insurance_code?.toLowerCase().includes(s) ||
      c.customer?.customer_code?.toLowerCase().includes(s);
    const stage = getStage(c);
    const matchStage = stageFilter === 'all' || stage === stageFilter;
    return matchSearch && matchStage;
  });

  const kpi = {
    total: cases.length,
    premium: cases.reduce((s, c) => s + (c.premium_amount || 0), 0),
    payoutPending: cases.filter(c => (c.payout_status || 'Pending') === 'Pending').length,
    renewalsDue: cases.filter(isRenewalDue).length,
  };

  const filteredCustomers = customers.filter(c => {
    const s = custSearch.toLowerCase();
    return !s || c.full_name.toLowerCase().includes(s) || c.mobile.includes(s) || c.customer_code?.toLowerCase().includes(s);
  }).slice(0, 8);

  async function createLead() {
    if (!leadForm.insurance_type) { setSaveError('Insurance type is required'); return; }
    setSaving(true); setSaveError('');
    const { data, error } = await supabase
      .from(T.INSURANCE_CASES)
      .insert({
        customer_id:    leadForm.customer_id || null,
        customer_name:  leadForm.customer_name.trim() || 'Unknown',
        mobile:         leadForm.mobile,
        insurance_type: leadForm.insurance_type,
        policy_type:    leadForm.insurance_type,
        business_type:  leadForm.business_type,
        vehicle_number: leadForm.vehicle_number.toUpperCase(),
        contact_person: leadForm.contact_person || null,
        rm_id:          leadForm.rm_id || null,
        current_stage:  'Lead',
        case_status:    'Lead Generated',
        payout_status:  'Pending',
        remarks:        leadForm.remarks,
        active:         true,
        created_by:     user?.id,
        owner_id:       user?.id,
      })
      .select('id')
      .single();
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    if (leadForm.customer_id) {
      await supabase.from(T.ACTIVITIES).insert({
        customer_id:       leadForm.customer_id,
        insurance_case_id: data?.id,
        activity_type:     'lead_created',
        description:       `Insurance lead created: ${leadForm.insurance_type}`,
        performed_by:      user?.id,
      });
    }
    setShowLeadSheet(false);
    setLeadForm(emptyLeadForm);
    await loadCases();
    if (data?.id && onViewCase) onViewCase(data.id);
  }

  function openSheet() {
    setLeadForm(emptyLeadForm);
    setCustSearch('');
    setSaveError('');
    setShowLeadSheet(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Insurance</h1>
            <p className="text-xs text-slate-400">{cases.length} cases</p>
          </div>
          <button onClick={openSheet}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-transform">
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Customer, vehicle, policy no, mobile…"
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Stage filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {STAGE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setStageFilter(f.key)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${stageFilter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Query error banner (usually means migrations not yet run) ── */}
      {queryError && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">DB schema mismatch — run pending migrations</p>
            <p className="text-[11px] text-amber-600 mt-0.5 font-mono break-all">{queryError}</p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-2">
        <KPICard label="Total Cases"    value={kpi.total}                   color="text-slate-800"   />
        <KPICard label="Total Premium"  value={formatAmount(kpi.premium)}   color="text-emerald-600" />
        <KPICard label="Payout Pending" value={kpi.payoutPending} sub="cases" color="text-amber-600" />
        <KPICard label="Renewals Due"   value={kpi.renewalsDue}  sub="30 days" color="text-red-500" />
      </div>

      {/* ── Case List ── */}
      <div className="px-4 space-y-3 pt-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No cases found</p>
            <p className="text-xs mt-1">Tap "New Lead" to create one</p>
          </div>
        ) : filteredCases.map(c => {
          const stage   = getStage(c);
          const motor   = isMotor(c);
          const renewal = isRenewalDue(c);
          return (
            <div key={c.id}
              onClick={() => onViewCase?.(c.id)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform">
              <div className="p-4">
                {/* Row 1: code + stage */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400">{c.insurance_code || c.ref_id}</span>
                  <div className="flex items-center gap-1.5">
                    {renewal && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <RefreshCw className="w-2.5 h-2.5" /> Due
                      </span>
                    )}
                    <StageBadge stage={stage} />
                  </div>
                </div>

                {/* Row 2: customer */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold text-slate-800 text-[15px]">{c.customer_name}</span>
  
                </div>

                {/* Row 3: details */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mb-3">
                  {motor && c.vehicle_number && (
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{c.vehicle_number}</span>
                  )}
                  <span>{c.insurance_type || c.policy_type || '—'}</span>
                  {c.insurance_company && <span className="text-blue-700 font-medium">{c.insurance_company}</span>}
                  {(c.premium_amount || 0) > 0 && (
                    <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                      <IndianRupee className="w-2.5 h-2.5" />{formatAmount(c.premium_amount)}
                    </span>
                  )}
                </div>

                {/* Row 4: RM + quick actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <User className="w-3 h-3" />
                    <span>{c.rm?.full_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    {c.mobile && (
                      <>
                        <a href={`tel:${c.mobile}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 font-medium">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a href={`https://wa.me/91${c.mobile.replace(/\D/g,'')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 rounded-lg text-[11px] text-green-700 font-medium">
                          <MessageCircle className="w-3 h-3" /> WA
                        </a>
                      </>
                    )}
                    <button onClick={() => onViewCase?.(c.id)}
                      className="flex items-center gap-0.5 px-2.5 py-1.5 bg-blue-50 rounded-lg text-[11px] text-blue-700 font-medium">
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Lead Creation Bottom Sheet ── */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${showLeadSheet ? 'visible' : 'invisible pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showLeadSheet ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowLeadSheet(false)}
        />
        <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${showLeadSheet ? 'translate-y-0' : 'translate-y-full'}`}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">New Insurance Lead</h2>
            <button onClick={() => setShowLeadSheet(false)} className="p-1.5 rounded-full hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[60vh] pb-2">
            {/* Customer search */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Customer</label>
              <div className="relative">
                <input
                  value={custSearch || leadForm.customer_name}
                  onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); setLeadForm(f => ({ ...f, customer_id: '', customer_name: e.target.value })); }}
                  onFocus={() => setShowCustDrop(true)}
                  placeholder="Search or type name…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
                {showCustDrop && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setLeadForm(f => ({ ...f, customer_id: c.id, customer_name: c.full_name, customer_code: c.customer_code, mobile: c.mobile, rm_id: c.assigned_rm_id || f.rm_id }));
                          setCustSearch('');
                          setShowCustDrop(false);
                        }}>
                        <p className="text-sm font-medium text-slate-800">{c.full_name}</p>
                        <p className="text-xs text-slate-400">{c.mobile}{c.customer_code ? ` · ${c.customer_code}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {leadForm.customer_id && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Linked to {leadForm.customer_code}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Contact Number</label>
              <input type="tel" value={leadForm.mobile}
                onChange={e => setLeadForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
            </div>

            {/* Insurance Type */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Insurance Type <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {INSURANCE_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => setLeadForm(f => ({ ...f, insurance_type: t }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${leadForm.insurance_type === t ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Fresh / Renewal */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Fresh / Renewal</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200">
                {(['Fresh', 'Renewal'] as const).map(bt => (
                  <button key={bt} type="button"
                    onClick={() => setLeadForm(f => ({ ...f, business_type: bt }))}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-all ${leadForm.business_type === bt ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle number — Motor only */}
            {leadForm.insurance_type === 'Motor' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Vehicle Number</label>
                <input value={leadForm.vehicle_number}
                  onChange={e => setLeadForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
                  placeholder="MH01AB1234"
                  className="w-full px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm font-mono uppercase outline-none focus:border-amber-400" />
              </div>
            )}

            {/* Contact Person */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Contact Person</label>
              <input value={leadForm.contact_person}
                onChange={e => setLeadForm(f => ({ ...f, contact_person: e.target.value }))}
                placeholder="Name of contact (if different from customer)"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
            </div>

            {/* RM */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Assigned RM</label>
              <select value={leadForm.rm_id} onChange={e => setLeadForm(f => ({ ...f, rm_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white">
                <option value="">Select RM</option>
                {rms.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Remarks</label>
              <textarea value={leadForm.remarks} onChange={e => setLeadForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Any notes…" rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 resize-none" />
            </div>

          </div>

          {/* Sticky footer — always visible */}
          <div className="px-5 pb-6 pt-3 border-t border-slate-100 bg-white">
            {saveError && (
              <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{saveError}</p>
              </div>
            )}
            <button onClick={createLead} disabled={saving}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
