import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, T, InsuranceCase, InsuranceQuote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle2, X,
  Phone, MessageCircle, IndianRupee, FileText, Clock, Shield,
  Edit3, Save, ChevronDown, Upload, Star,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_CONFIG = {
  Lead:   { label: 'Lead',   color: 'text-slate-600',   bg: 'bg-slate-100',  dot: 'bg-slate-400'   },
  Quote:  { label: 'Quote',  color: 'text-blue-700',    bg: 'bg-blue-50',    dot: 'bg-blue-500'    },
  Policy: { label: 'Policy', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  Payout: { label: 'Payout', color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500'   },
  Closed: { label: 'Closed', color: 'text-slate-500',   bg: 'bg-slate-100',  dot: 'bg-slate-300'   },
} as const;
type Stage = keyof typeof STAGE_CONFIG;

const TABS = [
  { key: 'overview',  label: 'Overview', icon: Shield     },
  { key: 'quotes',    label: 'Quotes',   icon: Star       },
  { key: 'policy',    label: 'Policy',   icon: FileText   },
  { key: 'docs',      label: 'Docs',     icon: Upload     },
  { key: 'payout',    label: 'Payout',   icon: IndianRupee},
  { key: 'activity',  label: 'Activity', icon: Clock      },
] as const;
type TabKey = typeof TABS[number]['key'];

const INSURANCE_COMPANIES = [
  'Tata AIG', 'HDFC ERGO', 'ICICI Lombard', 'New India Assurance',
  'Star Health', 'Niva Bupa', 'Care Health', 'Bajaj Allianz',
  'Reliance General', 'SBI General', 'Cholamandalam', 'Other',
];

const DOC_TYPES = ['Policy PDF', 'RC Copy', 'Payment Proof', 'Invoice', 'KYC', 'Commission Sheet', 'Other'];
const PAYMENT_MODES = ['Online', 'Cheque', 'Cash', 'NEFT', 'UPI'];
const PAYOUT_STATUSES = ['Pending', 'Partial', 'Received'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface CaseDoc {
  id: string; document_name: string; document_type: string;
  file_url: string; file_size: number; created_at: string;
  uploader: { full_name: string } | null;
}

interface CaseActivity {
  id: string; activity_type: string; description: string;
  created_at: string; performer: { full_name: string } | null;
}

interface RMOption { id: string; full_name: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStage(c: InsuranceCase | null): Stage {
  if (!c) return 'Lead';
  if (c.current_stage && c.current_stage in STAGE_CONFIG) return c.current_stage as Stage;
  return 'Lead';
}

function fmt(n: number | null | undefined) {
  if (!n) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StageBadge({ stage }: { stage: Stage }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mx-4 mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className={`text-xs font-semibold text-slate-700 text-right max-w-[60%] ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{children}</label>;
}

function Input({ value, onChange, placeholder, type = 'text', mono, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; error?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${mono ? 'font-mono uppercase' : ''} ${error ? 'border-red-400 bg-red-50 focus:border-red-400' : 'border-slate-200'}`} />
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props { caseId: string; onBack: () => void; }

export default function InsuranceCaseDetailPage({ caseId, onBack }: Props) {
  const { user } = useAuth();

  const [cas, setCas]             = useState<InsuranceCase | null>(null);
  const [quotes, setQuotes]       = useState<InsuranceQuote[]>([]);
  const [docs, setDocs]           = useState<CaseDoc[]>([]);
  const [activities, setActivities] = useState<CaseActivity[]>([]);
  const [rms, setRms]             = useState<RMOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Edit / action states
  const [editOverview, setEditOverview] = useState(false);
  const [editPolicy, setEditPolicy]     = useState(false);
  const [editPayout, setEditPayout]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [actionError, setActionError]   = useState('');
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});

  // Form states
  const [ovForm, setOvForm] = useState({
    customer_name: '', mobile: '', insurance_type: '', business_type: 'Fresh' as 'Fresh'|'Renewal',
    vehicle_number: '', vehicle_model: '',
    contact_person: '', relation: '',
    policy_mobile: '', policy_email: '',
    lead_source: '',
    rm_id: '', remarks: '',
  });
  const [polForm, setPolForm] = useState({
    insurance_company: '', policy_number: '', policy_start_date: '', policy_end_date: '',
    policy_tenure: '',
    payment_mode: '', payment_reference: '', cheque_reported_date: '',
    insurance_done_by: '',
  });
  const [payForm, setPayForm] = useState({
    payout_status: 'Pending', actual_payout_amount: '', payout_received_date: '', cashback_amount: '',
  });

  // Quote form
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    insurance_company: '', proposal_number: '', premium_od: '', premium_tp: '',
    total_premium: '', payout_percent: '', expected_payout_amount: '', remarks: '',
  });
  const [quoteSaving, setQuoteSaving] = useState(false);

  // Doc upload
  const [docType, setDocType]     = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadCase = useCallback(async () => {
    const { data } = await supabase
      .from(T.INSURANCE_CASES)
      .select('*, rm:master_users!core_insurance_cases_rm_id_fkey(full_name), customer:core_customers!core_insurance_cases_customer_id_fkey(customer_code)')
      .eq('id', caseId)
      .single();
    if (data) {
      const c = data as InsuranceCase;
      setCas(c);
      setOvForm({ customer_name: c.customer_name, mobile: c.mobile || '', insurance_type: c.insurance_type || c.policy_type || '', business_type: (c.business_type as 'Fresh'|'Renewal') || 'Fresh', vehicle_number: c.vehicle_number || '', vehicle_model: c.vehicle_model || '', contact_person: c.contact_person || '', relation: c.relation || '', policy_mobile: c.policy_mobile || '', policy_email: c.policy_email || '', lead_source: (c as any).lead_source || (c as any).source || '', rm_id: c.rm_id || '', remarks: c.remarks || '' });
      setPolForm({ insurance_company: c.insurance_company || '', policy_number: c.policy_number || '', policy_start_date: c.policy_start_date || '', policy_end_date: c.policy_end_date || '', policy_tenure: (c as any).policy_tenure || '', payment_mode: c.payment_mode || '', payment_reference: c.payment_reference || '', cheque_reported_date: c.cheque_reported_date || '', insurance_done_by: c.insurance_done_by || '' });
      setPayForm({ payout_status: c.payout_status || 'Pending', actual_payout_amount: c.actual_payout_amount ? String(c.actual_payout_amount) : '', payout_received_date: c.payout_received_date || '', cashback_amount: c.cashback_amount ? String(c.cashback_amount) : '' });
    }
  }, [caseId]);

  const loadQuotes = useCallback(async () => {
    const { data } = await supabase.from(T.INSURANCE_QUOTES).select('*').eq('case_id', caseId).order('created_at', { ascending: false });
    setQuotes((data as InsuranceQuote[]) || []);
  }, [caseId]);

  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from(T.DOCUMENTS)
      .select('id,document_name,document_type,file_url,file_size,created_at,uploader:master_users!uploaded_by(full_name)')
      .eq('insurance_case_id', caseId).eq('active', true)
      .order('created_at', { ascending: false });
    setDocs((data as CaseDoc[]) || []);
  }, [caseId]);

  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from(T.ACTIVITIES)
      .select('id,activity_type,description,created_at,performer:master_users!performed_by(full_name)')
      .eq('insurance_case_id', caseId)
      .order('created_at', { ascending: false });
    setActivities((data as CaseActivity[]) || []);
  }, [caseId]);

  useEffect(() => {
    Promise.all([loadCase(), loadQuotes(), loadDocs(), loadActivities()])
      .then(() => setLoading(false));
    supabase.from(T.USERS).select('id,full_name').eq('is_active', true).order('full_name')
      .then(({ data }) => setRms((data as RMOption[]) || []));
  }, [loadCase, loadQuotes, loadDocs, loadActivities]);

  // ── Activity helper ─────────────────────────────────────────────────────────

  async function addActivity(type: string, desc: string) {
    await supabase.from(T.ACTIVITIES).insert({
      customer_id: cas?.customer_id || null,
      insurance_case_id: caseId,
      activity_type: type,
      description: desc,
      performed_by: user?.id,
    });
    await loadActivities();
  }

  // ── Stage-gate validation helpers ─────────────────────────────────────────
  // Principle: DB stays nullable. UI enforces required fields per stage.

  function validateQuoteForm(): boolean {
    const errs: Record<string, string> = {};
    if (!quoteForm.insurance_company.trim()) errs.qInsuranceCompany = 'Required';
    if (!quoteForm.total_premium && !quoteForm.premium_od && !quoteForm.premium_tp)
      errs.qTotalPremium = 'Enter OD, TP or Total Premium';
    if (!quoteForm.payout_percent) errs.qPayoutPercent = 'Required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validatePolicyForm(): boolean {
    const errs: Record<string, string> = {};
    if (!polForm.policy_number.trim())   errs.polNumber    = 'Policy number required';
    if (!polForm.policy_start_date)      errs.polStartDate = 'Start date required';
    if (!polForm.policy_end_date)        errs.polEndDate   = 'End date required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validatePayoutForm(): boolean {
    const errs: Record<string, string> = {};
    if (!payForm.payout_status)                errs.payStatus       = 'Payout status required';
    if (!payForm.actual_payout_amount)         errs.payAmount       = 'Actual payout amount required';
    if (!payForm.payout_received_date)         errs.payReceivedDate = 'Date received required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save Overview ──────────────────────────────────────────────────────────

  async function saveOverview() {
    setSaving(true); setActionError('');
    const { error } = await supabase.from(T.INSURANCE_CASES).update({
      customer_name: ovForm.customer_name,
      mobile: ovForm.mobile,
      insurance_type: ovForm.insurance_type,
      policy_type: ovForm.insurance_type,
      business_type: ovForm.business_type,
      vehicle_number: ovForm.vehicle_number.toUpperCase(),
      vehicle_model: ovForm.vehicle_model || null,
      contact_person: ovForm.contact_person || null,
      relation: ovForm.relation || null,
      policy_mobile: ovForm.policy_mobile || null,
      policy_email: ovForm.policy_email || null,
      lead_source: ovForm.lead_source || null,
      source: ovForm.lead_source || null,
      rm_id: ovForm.rm_id || null,
      remarks: ovForm.remarks,
      updated_by: user?.id,
    }).eq('id', caseId);
    setSaving(false);
    if (error) { setActionError(error.message); return; }
    setEditOverview(false);
    await loadCase();
    await addActivity('updated', 'Case details updated');
  }

  // ── Add Quote ──────────────────────────────────────────────────────────────

  async function addQuote() {
    if (!validateQuoteForm()) return;
    setQuoteSaving(true); setActionError(''); setFieldErrors({});
    const od = parseFloat(quoteForm.premium_od) || 0;
    const tp = parseFloat(quoteForm.premium_tp) || 0;
    const total = parseFloat(quoteForm.total_premium) || (od + tp);
    const pct = parseFloat(quoteForm.payout_percent) || 0;
    const exp = parseFloat(quoteForm.expected_payout_amount) || total * pct / 100;
    const { error } = await supabase.from(T.INSURANCE_QUOTES).insert({
      case_id: caseId,
      insurance_company: quoteForm.insurance_company,
      proposal_number: quoteForm.proposal_number || null,
      premium_od: od, premium_tp: tp, total_premium: total,
      payout_percent: pct, expected_payout_amount: exp,
      remarks: quoteForm.remarks || null,
      created_by: user?.id,
    });
    setQuoteSaving(false);
    if (error) { setActionError(error.message); return; }
    // Advance stage to Quote if still on Lead
    if (getStage(cas) === 'Lead') {
      await supabase.from(T.INSURANCE_CASES).update({ current_stage: 'Quote', case_status: 'Quote Received', updated_by: user?.id }).eq('id', caseId);
    }
    setShowQuoteSheet(false);
    setQuoteForm({ insurance_company: '', proposal_number: '', premium_od: '', premium_tp: '', total_premium: '', payout_percent: '', expected_payout_amount: '', remarks: '' });
    await loadQuotes();
    await loadCase();
    await addActivity('quote_added', `Quote added: ${quoteForm.insurance_company}`);
  }

  // ── Select Quote ───────────────────────────────────────────────────────────

  async function selectQuote(quoteId: string, q: InsuranceQuote) {
    setSaving(true); setActionError('');
    // Deselect all others
    await supabase.from(T.INSURANCE_QUOTES).update({ is_selected: false }).eq('case_id', caseId);
    await supabase.from(T.INSURANCE_QUOTES).update({ is_selected: true }).eq('id', quoteId);
    // Update case
    await supabase.from(T.INSURANCE_CASES).update({
      selected_quote_id: quoteId,
      insurance_company: q.insurance_company,
      proposal_number: q.proposal_number,
      od_amount: q.premium_od,
      tp_amount: q.premium_tp,
      premium_amount: q.total_premium,
      expected_commission: q.expected_payout_amount,
      current_stage: 'Policy',
      case_status: 'Policy Issued',
      updated_by: user?.id,
    }).eq('id', caseId);
    setSaving(false);
    await loadQuotes();
    await loadCase();
    await addActivity('quote_selected', `Quote selected: ${q.insurance_company} — ₹${q.total_premium}`);
    setActiveTab('policy');
  }

  // ── Save Policy ────────────────────────────────────────────────────────────

  async function savePolicy() {
    // UI enforces required fields before advancing to Policy stage
    if (!validatePolicyForm()) return;
    setSaving(true); setActionError(''); setFieldErrors({});
    const isAdvancing = getStage(cas) === 'Quote';
    const { error } = await supabase.from(T.INSURANCE_CASES).update({
      insurance_company: polForm.insurance_company || null,
      policy_number: polForm.policy_number || null,
      policy_start_date: polForm.policy_start_date || null,
      policy_end_date: polForm.policy_end_date || null,
      policy_tenure: polForm.policy_tenure || null,
      payment_mode: polForm.payment_mode || null,
      payment_reference: polForm.payment_reference || null,
      cheque_reported_date: polForm.cheque_reported_date || null,
      insurance_done_by: polForm.insurance_done_by || null,
      // Advance stage only if currently at Quote — DB column stays nullable for all others
      ...(isAdvancing && { current_stage: 'Policy', case_status: 'Policy Issued' }),
      updated_by: user?.id,
    }).eq('id', caseId);
    setSaving(false);
    if (error) { setActionError(error.message); return; }
    setEditPolicy(false);
    // Create renewal if policy_end_date set
    if (polForm.policy_end_date && cas) {
      const renewalDate = new Date(polForm.policy_end_date);
      renewalDate.setDate(renewalDate.getDate() - 30);
      await supabase.from(T.RENEWALS).upsert([{
        customer_id: cas.customer_id,
        renewal_type: cas.insurance_type || cas.policy_type || 'Insurance',
        title: `${cas.insurance_type || 'Insurance'} renewal — ${cas.customer_name}`,
        renewal_date: renewalDate.toISOString().split('T')[0],
        amount: cas.premium_amount,
        status: 'upcoming',
        active: true,
      }], { onConflict: 'customer_id, renewal_date' });
    }
    await loadCase();
    await addActivity('policy_saved', 'Policy details updated');
  }

  // ── Save Payout ────────────────────────────────────────────────────────────

  async function savePayout() {
    setSaving(true); setActionError('');
    const actual = parseFloat(payForm.actual_payout_amount) || 0;
    const cashback = parseFloat(payForm.cashback_amount) || 0;
    const profit = actual - cashback;
    const { error } = await supabase.from(T.INSURANCE_CASES).update({
      payout_status: payForm.payout_status,
      actual_payout_amount: actual || null,
      payout_received_date: payForm.payout_received_date || null,
      cashback_amount: cashback,
      profit_amount: profit > 0 ? profit : null,
      current_stage: payForm.payout_status === 'Received' ? 'Payout' : undefined,
      updated_by: user?.id,
    }).eq('id', caseId);
    setSaving(false);
    if (error) { setActionError(error.message); return; }
    setEditPayout(false);
    await loadCase();
    await addActivity('payout_updated', `Payout status: ${payForm.payout_status}${actual ? ` — ₹${actual}` : ''}`);
  }

  // ── Upload Document ────────────────────────────────────────────────────────

  async function handleFileUpload(file: File) {
    setUploading(true); setActionError('');
    const path = `insurance/${caseId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (upErr) { setActionError(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
    await supabase.from(T.DOCUMENTS).insert({
      insurance_case_id: caseId,
      customer_id: cas?.customer_id || null,
      document_name: file.name,
      document_type: docType,
      category: 'insurance',
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user?.id,
      owner_id: user?.id,
      active: true,
    });
    setUploading(false);
    await loadDocs();
    await addActivity('document_uploaded', `${docType} uploaded: ${file.name}`);
  }

  // ── Stage CTA ──────────────────────────────────────────────────────────────

  async function handleCTA() {
    const stage = getStage(cas);
    setActionError(''); setFieldErrors({});

    // Lead → open quote sheet (first quote auto-advances to Quote stage)
    if (stage === 'Lead') {
      setShowQuoteSheet(true); setActiveTab('quotes'); return;
    }

    // Quote → Mark Policy Issued: requires a selected quote + policy fields
    if (stage === 'Quote') {
      const selected = quotes.find(q => q.is_selected);
      if (!selected) {
        setActionError('Select a quote before marking policy issued');
        setActiveTab('quotes'); return;
      }
      // Pre-fill insurance company from selected quote so user doesn't retype
      setPolForm(f => ({ ...f, insurance_company: f.insurance_company || selected.insurance_company || '' }));
      setActiveTab('policy'); setEditPolicy(true);
      return;
    }

    // Policy → Track Payout: requires policy fields are saved (already validated in savePolicy)
    if (stage === 'Policy') {
      // Verify policy is actually filled before advancing
      if (!cas?.policy_number) {
        setActionError('Save policy details first (policy number is required)');
        setActiveTab('policy'); setEditPolicy(true); return;
      }
      setSaving(true);
      await supabase.from(T.INSURANCE_CASES).update({ current_stage: 'Payout', updated_by: user?.id }).eq('id', caseId);
      setSaving(false);
      await loadCase();
      await addActivity('stage_advanced', 'Moved to Payout tracking');
      setActiveTab('payout'); setEditPayout(true);
      return;
    }

    // Payout → Close Case: requires payout fields are filled
    if (stage === 'Payout') {
      if (!validatePayoutForm()) {
        setActiveTab('payout'); setEditPayout(true); return;
      }
      setSaving(true);
      await supabase.from(T.INSURANCE_CASES).update({
        current_stage: 'Closed',
        case_status: 'Closed',
        updated_by: user?.id,
      }).eq('id', caseId);
      setSaving(false);
      await loadCase();
      await addActivity('case_closed', 'Case closed');
      return;
    }
  }

  function ctaLabel() {
    const stage = getStage(cas);
    if (stage === 'Lead')   return 'Add Quote';
    if (stage === 'Quote')  return 'Mark Policy Issued';
    if (stage === 'Policy') return 'Track Payout';
    if (stage === 'Payout') return 'Close Case';
    return '';
  }

  // ── Tab: Overview ──────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <>
        <SectionCard title="Case Info" action={
          <button onClick={() => setEditOverview(v => !v)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        }>
          {editOverview ? (
            <div className="space-y-3">
              <div><FieldLabel>Customer Name</FieldLabel>
                <Input value={ovForm.customer_name} onChange={v => setOvForm(f => ({ ...f, customer_name: v }))} /></div>
              <div><FieldLabel>Mobile</FieldLabel>
                <Input type="tel" value={ovForm.mobile} onChange={v => setOvForm(f => ({ ...f, mobile: v }))} /></div>
              <div><FieldLabel>Insurance Type</FieldLabel>
                <Input value={ovForm.insurance_type} onChange={v => setOvForm(f => ({ ...f, insurance_type: v }))} placeholder="Motor, Health…" /></div>
              <div><FieldLabel>Business Type</FieldLabel>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  {['Fresh','Renewal'].map(bt => (
                    <button key={bt} onClick={() => setOvForm(f => ({ ...f, business_type: bt as 'Fresh'|'Renewal' }))}
                      className={`flex-1 py-2 text-xs font-semibold ${ovForm.business_type === bt ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>{bt}</button>
                  ))}
                </div>
              </div>
              <div><FieldLabel>Vehicle Number</FieldLabel>
                <Input value={ovForm.vehicle_number} onChange={v => setOvForm(f => ({ ...f, vehicle_number: v }))} mono /></div>
              {(ovForm.insurance_type || '').toLowerCase().includes('motor') && (
                <div><FieldLabel>Vehicle Model</FieldLabel>
                  <Input value={ovForm.vehicle_model} onChange={v => setOvForm(f => ({ ...f, vehicle_model: v }))} placeholder="e.g. Swift Dzire" /></div>
              )}
              <div><FieldLabel>Contact Person</FieldLabel>
                <Input value={ovForm.contact_person} onChange={v => setOvForm(f => ({ ...f, contact_person: v }))} placeholder="Name if different from customer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Relation</FieldLabel>
                  <Input value={ovForm.relation} onChange={v => setOvForm(f => ({ ...f, relation: v }))} placeholder="Self / Spouse…" /></div>
                <div><FieldLabel>Contact No.</FieldLabel>
                  <Input type="tel" value={ovForm.policy_mobile} onChange={v => setOvForm(f => ({ ...f, policy_mobile: v }))} placeholder="Mobile" /></div>
              </div>
              <div><FieldLabel>Email ID</FieldLabel>
                <Input type="email" value={ovForm.policy_email} onChange={v => setOvForm(f => ({ ...f, policy_email: v }))} placeholder="email@example.com" /></div>
              <div><FieldLabel>Through (Lead Source)</FieldLabel>
                <Input value={ovForm.lead_source} onChange={v => setOvForm(f => ({ ...f, lead_source: v }))} placeholder="Reference / Direct / Agent…" /></div>
              <div><FieldLabel>Assigned RM</FieldLabel>
                <select value={ovForm.rm_id} onChange={e => setOvForm(f => ({ ...f, rm_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">None</option>
                  {rms.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
              </div>
              <div><FieldLabel>Remarks</FieldLabel>
                <textarea value={ovForm.remarks} onChange={e => setOvForm(f => ({ ...f, remarks: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 resize-none" /></div>
              <div className="flex gap-2">
                <button onClick={saveOverview} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setEditOverview(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Customer"   value={cas?.customer_name} />
              <InfoRow label="Type"       value={cas?.insurance_type || cas?.policy_type} />
              <InfoRow label="Business"   value={cas?.business_type} />
              {(cas?.vehicle_number) && <InfoRow label="Vehicle No." value={cas.vehicle_number} mono />}
              {cas?.vehicle_model && <InfoRow label="Vehicle Model" value={cas.vehicle_model} />}
              <InfoRow label="Contact No." value={cas?.policy_mobile || cas?.mobile} />
              {cas?.contact_person && <InfoRow label="Contact Person" value={cas.contact_person} />}
              {cas?.relation && <InfoRow label="Relation" value={cas.relation} />}
              {cas?.policy_email && <InfoRow label="Email" value={cas.policy_email} />}
              {((cas as any)?.lead_source || (cas as any)?.source) && <InfoRow label="Through" value={(cas as any).lead_source || (cas as any).source} />}
              <InfoRow label="Lead Date"  value={fmtDate(cas?.created_at)} />
              <InfoRow label="RM"         value={(cas?.rm as any)?.full_name} />
              {cas?.remarks && <InfoRow label="Remarks" value={cas.remarks} />}
            </>
          )}
        </SectionCard>

        {/* Quick contacts */}
        {(cas?.policy_mobile || cas?.mobile) && (() => {
          const ph = (cas?.policy_mobile || cas?.mobile || '').replace(/\D/g, '');
          return (
            <div className="flex gap-3 mx-4 mb-3">
              <a href={`tel:${ph}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 shadow-sm">
                <Phone className="w-4 h-4" /> Call
              </a>
              <a href={`https://wa.me/91${ph}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-100 rounded-2xl text-sm font-semibold text-green-700 shadow-sm">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          );
        })()}
      </>
    );
  }

  // ── Tab: Quotes ────────────────────────────────────────────────────────────

  function renderQuotes() {
    return (
      <>
        <div className="mx-4 mb-3">
          <button onClick={() => { setShowQuoteSheet(true); setActionError(''); }}
            className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-sm font-semibold text-blue-600 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Quote
          </button>
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No quotes yet</p>
          </div>
        ) : quotes.map(q => (
          <div key={q.id} className={`mx-4 mb-3 rounded-2xl border shadow-sm overflow-hidden ${q.is_selected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">{q.insurance_company}</p>
                {q.proposal_number && <p className="text-[11px] font-mono text-slate-400">{q.proposal_number}</p>}
              </div>
              {q.is_selected
                ? <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Selected</span>
                : <button onClick={() => selectQuote(q.id, q)} disabled={saving}
                    className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    Select
                  </button>
              }
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div><p className="text-[10px] text-slate-400">OD</p><p className="text-xs font-bold text-slate-700">{fmt(q.premium_od)}</p></div>
                <div><p className="text-[10px] text-slate-400">TP</p><p className="text-xs font-bold text-slate-700">{fmt(q.premium_tp)}</p></div>
                <div className="bg-blue-50 rounded-lg py-1"><p className="text-[10px] text-blue-400">Total</p><p className="text-xs font-bold text-blue-700">{fmt(q.total_premium)}</p></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Payout {q.payout_percent}%</span>
                <span className="font-semibold text-slate-700">{fmt(q.expected_payout_amount)}</span>
              </div>
              {q.remarks && <p className="text-xs text-slate-400 mt-1.5 italic">{q.remarks}</p>}
            </div>
          </div>
        ))}
      </>
    );
  }

  // ── Tab: Policy ────────────────────────────────────────────────────────────

  function renderPolicy() {
    const selectedQuote = quotes.find(q => q.is_selected);
    return (
      <>
        {!cas?.selected_quote_id && (
          <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">Select a quote first to fill policy details.</p>
          </div>
        )}
        <SectionCard title="Policy Details" action={
          <button onClick={() => setEditPolicy(v => !v)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        }>
          {editPolicy ? (
            <div className="space-y-3">
              <div><FieldLabel>Insurance Company</FieldLabel>
                <select value={polForm.insurance_company} onChange={e => setPolForm(f => ({ ...f, insurance_company: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">Select company</option>
                  {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Policy Number <span className="text-red-400">*</span></FieldLabel>
                <Input value={polForm.policy_number} onChange={v => { setPolForm(f => ({ ...f, policy_number: v })); setFieldErrors(e => ({ ...e, polNumber: '' })); }}
                  placeholder="Policy number" mono error={!!fieldErrors.polNumber} />
                <FieldError msg={fieldErrors.polNumber} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Start Date <span className="text-red-400">*</span></FieldLabel>
                  <input type="date" value={polForm.policy_start_date} onChange={e => { setPolForm(f => ({ ...f, policy_start_date: e.target.value })); setFieldErrors(ex => ({ ...ex, polStartDate: '' })); }}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${fieldErrors.polStartDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
                  <FieldError msg={fieldErrors.polStartDate} />
                </div>
                <div>
                  <FieldLabel>End Date <span className="text-red-400">*</span></FieldLabel>
                  <input type="date" value={polForm.policy_end_date} onChange={e => { setPolForm(f => ({ ...f, policy_end_date: e.target.value })); setFieldErrors(ex => ({ ...ex, polEndDate: '' })); }}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${fieldErrors.polEndDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
                  <FieldError msg={fieldErrors.polEndDate} />
                </div>
              </div>
              <div><FieldLabel>Payment Mode</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map(pm => (
                    <button key={pm} onClick={() => setPolForm(f => ({ ...f, payment_mode: pm }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${polForm.payment_mode === pm ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{pm}</button>
                  ))}
                </div>
              </div>
              <div><FieldLabel>Payment Reference / UTR / Cheque No.</FieldLabel>
                <Input value={polForm.payment_reference} onChange={v => setPolForm(f => ({ ...f, payment_reference: v }))} /></div>
              {polForm.payment_mode === 'Cheque' && (
                <div><FieldLabel>Cheque Reported Date</FieldLabel>
                  <input type="date" value={polForm.cheque_reported_date} onChange={e => setPolForm(f => ({ ...f, cheque_reported_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              )}
              <div><FieldLabel>Policy Tenure</FieldLabel>
                <input value={polForm.policy_tenure} onChange={e => setPolForm(f => ({ ...f, policy_tenure: e.target.value }))}
                  placeholder="e.g. 1 Year, 3 Years"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              <div><FieldLabel>Insurance Done By</FieldLabel>
                <select value={polForm.insurance_done_by} onChange={e => setPolForm(f => ({ ...f, insurance_done_by: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">Select</option>
                  {rms.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={savePolicy} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setEditPolicy(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {selectedQuote && <InfoRow label="Company (quote)" value={selectedQuote.insurance_company} />}
              <InfoRow label="Policy Number"  value={cas?.policy_number} mono />
              <InfoRow label="Start Date"     value={fmtDate(cas?.policy_start_date)} />
              <InfoRow label="End Date"       value={fmtDate(cas?.policy_end_date)} />
              <InfoRow label="Payment Mode"   value={cas?.payment_mode} />
              <InfoRow label="Reference"      value={cas?.payment_reference} mono />
              {cas?.cheque_reported_date && <InfoRow label="Cheque Date" value={fmtDate(cas.cheque_reported_date)} />}
              {(cas as any)?.policy_tenure && <InfoRow label="Tenure" value={(cas as any).policy_tenure} />}
              {cas?.insurance_done_by && <InfoRow label="Done By" value={rms.find(r => r.id === cas.insurance_done_by)?.full_name || cas.insurance_done_by} />}
            </>
          )}
        </SectionCard>

        {/* Premiums from quote */}
        {selectedQuote && (
          <SectionCard title="Premium Breakdown">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-slate-400 mb-1">OD</p><p className="text-sm font-bold text-slate-700">{fmt(selectedQuote.premium_od)}</p></div>
              <div><p className="text-[10px] text-slate-400 mb-1">TP</p><p className="text-sm font-bold text-slate-700">{fmt(selectedQuote.premium_tp)}</p></div>
              <div className="bg-blue-50 rounded-xl py-2"><p className="text-[10px] text-blue-400 mb-1">Total</p><p className="text-sm font-bold text-blue-700">{fmt(selectedQuote.total_premium)}</p></div>
            </div>
          </SectionCard>
        )}
      </>
    );
  }

  // ── Tab: Payout ────────────────────────────────────────────────────────────

  function renderPayout() {
    const selectedQuote = quotes.find(q => q.is_selected);
    const actual = parseFloat(payForm.actual_payout_amount) || 0;
    const cashback = parseFloat(payForm.cashback_amount) || 0;
    const profit = actual - cashback;
    return (
      <>
        {selectedQuote && (
          <SectionCard title="Expected from Quote">
            <InfoRow label="Expected Payout" value={fmt(selectedQuote.expected_payout_amount)} />
            <InfoRow label="Payout %" value={`${selectedQuote.payout_percent}%`} />
          </SectionCard>
        )}
        <SectionCard title="Payout Tracking" action={
          <button onClick={() => setEditPayout(v => !v)} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        }>
          {editPayout ? (
            <div className="space-y-3">
              <div>
                <FieldLabel>Payout Status <span className="text-red-400">*</span></FieldLabel>
                <div className={`flex rounded-xl overflow-hidden border ${fieldErrors.payStatus ? 'border-red-400' : 'border-slate-200'}`}>
                  {PAYOUT_STATUSES.map(ps => (
                    <button key={ps} onClick={() => { setPayForm(f => ({ ...f, payout_status: ps })); setFieldErrors(ex => ({ ...ex, payStatus: '' })); }}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-all ${payForm.payout_status === ps ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>{ps}</button>
                  ))}
                </div>
                <FieldError msg={fieldErrors.payStatus} />
              </div>
              <div>
                <FieldLabel>Actual Payout Received <span className="text-red-400">*</span></FieldLabel>
                <div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="number" value={payForm.actual_payout_amount} onChange={e => { setPayForm(f => ({ ...f, actual_payout_amount: e.target.value })); setFieldErrors(ex => ({ ...ex, payAmount: '' })); }}
                    placeholder="0" className={`w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${fieldErrors.payAmount ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} /></div>
                <FieldError msg={fieldErrors.payAmount} />
              </div>
              <div>
                <FieldLabel>Payout Received Date <span className="text-red-400">*</span></FieldLabel>
                <input type="date" value={payForm.payout_received_date} onChange={e => { setPayForm(f => ({ ...f, payout_received_date: e.target.value })); setFieldErrors(ex => ({ ...ex, payReceivedDate: '' })); }}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${fieldErrors.payReceivedDate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
                <FieldError msg={fieldErrors.payReceivedDate} />
              </div>
              <div><FieldLabel>Cashback to Customer</FieldLabel>
                <div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="number" value={payForm.cashback_amount} onChange={e => setPayForm(f => ({ ...f, cashback_amount: e.target.value }))}
                    placeholder="0" className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              </div>
              {(actual > 0 || cashback > 0) && (
                <div className={`flex justify-between items-center p-3 rounded-xl ${profit >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className="text-xs font-semibold text-slate-600">Net Profit</span>
                  <span className={`text-base font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(profit)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={savePayout} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setEditPayout(false)} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Status"          value={cas?.payout_status} />
              <InfoRow label="Actual Payout"   value={fmt(cas?.actual_payout_amount)} />
              <InfoRow label="Received Date"   value={fmtDate(cas?.payout_received_date)} />
              <InfoRow label="Cashback"        value={fmt(cas?.cashback_amount)} />
              {(cas?.profit_amount != null) && <InfoRow label="Net Profit" value={fmt(cas.profit_amount)} />}
            </>
          )}
        </SectionCard>
      </>
    );
  }

  // ── Tab: Docs ──────────────────────────────────────────────────────────────

  function renderDocs() {
    return (
      <>
        <SectionCard title="Upload Document">
          <div className="space-y-3">
            <div>
              <FieldLabel>Document Type</FieldLabel>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white">
                {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-sm font-semibold text-blue-600 flex items-center justify-center gap-2 disabled:opacity-60">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Choose File'}
            </button>
          </div>
        </SectionCard>

        {docs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No documents uploaded</p>
          </div>
        ) : (
          <SectionCard title="Documents">
            {docs.map(d => (
              <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{d.document_name}</p>
                    <p className="text-[10px] text-slate-400">{d.document_type} · {fmtDate(d.created_at)}</p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 rotate-[-90deg]" />
              </a>
            ))}
          </SectionCard>
        )}
      </>
    );
  }

  // ── Tab: Activity ──────────────────────────────────────────────────────────

  function renderActivity() {
    return (
      <SectionCard title="Timeline">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : activities.map((a, i) => (
          <div key={a.id} className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1" />
              {i < activities.length - 1 && <div className="w-0.5 h-full bg-slate-100" />}
            </div>
            <div className="pb-1">
              <p className="text-xs font-semibold text-slate-700">{a.description}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {a.performer?.full_name || 'System'} · {fmtDate(a.created_at)}
              </p>
            </div>
          </div>
        ))}
      </SectionCard>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const stage = getStage(cas);
  const showCTA = stage !== 'Closed';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button onClick={onBack} className="p-2 -ml-1 rounded-xl hover:bg-slate-100 active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono text-slate-400">{cas?.insurance_code}</p>
            <h1 className="text-base font-bold text-slate-800 truncate">{cas?.customer_name}</h1>
          </div>
          <StageBadge stage={stage} />
        </div>
        {/* Sub-info row */}
        <div className="flex items-center gap-3 px-4 pb-3 text-xs text-slate-500">
          <span>{cas?.insurance_type || cas?.policy_type || '—'}</span>
          {cas?.vehicle_number && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{cas.vehicle_number}</span>}
          {cas?.insurance_company && <span className="text-blue-700 font-medium">{cas.insurance_company}</span>}
        </div>
      </div>

      {/* ── Error banner ── */}
      {actionError && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 flex-1">{actionError}</p>
          <button onClick={() => setActionError('')}><X className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
      )}

      {/* ── Tab Content ── */}
      <div className="pt-3 pb-48">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'quotes'   && renderQuotes()}
        {activeTab === 'policy'   && renderPolicy()}
        {activeTab === 'docs'     && renderDocs()}
        {activeTab === 'payout'   && renderPayout()}
        {activeTab === 'activity' && renderActivity()}
      </div>

      {/* ── Bottom: CTA + Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-100 shadow-lg z-20">
        {showCTA && (
          <div className="px-4 pt-3">
            <button onClick={handleCTA} disabled={saving}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {ctaLabel()}
            </button>
          </div>
        )}
        <div className="flex pb-safe">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[9px] font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Add Quote Bottom Sheet ── */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${showQuoteSheet ? 'visible' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showQuoteSheet ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowQuoteSheet(false)} />
        <div className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${showQuoteSheet ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Add Quote</h2>
            <button onClick={() => setShowQuoteSheet(false)} className="p-1.5 rounded-full hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh] pb-10">
            <div>
              <FieldLabel>Insurance Company <span className="text-red-500">*</span></FieldLabel>
              <select value={quoteForm.insurance_company} onChange={e => { setQuoteForm(f => ({ ...f, insurance_company: e.target.value })); setFieldErrors(ex => ({ ...ex, qInsuranceCompany: '' })); }}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 bg-white ${fieldErrors.qInsuranceCompany ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                <option value="">Select company</option>
                {INSURANCE_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={fieldErrors.qInsuranceCompany} />
            </div>
            <div>
              <FieldLabel>Proposal Number</FieldLabel>
              <Input value={quoteForm.proposal_number} onChange={v => setQuoteForm(f => ({ ...f, proposal_number: v }))} placeholder="Optional" mono />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>OD Premium</FieldLabel>
                <div className="relative"><IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="number" value={quoteForm.premium_od}
                    onChange={e => {
                      const od = e.target.value;
                      const tp = parseFloat(quoteForm.premium_tp) || 0;
                      const total = (parseFloat(od) || 0) + tp;
                      const exp = total * (parseFloat(quoteForm.payout_percent) || 0) / 100;
                      setQuoteForm(f => ({ ...f, premium_od: od, total_premium: total > 0 ? total.toFixed(2) : '', expected_payout_amount: exp > 0 ? exp.toFixed(2) : '' }));
                    }}
                    placeholder="0" className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              </div>
              <div>
                <FieldLabel>TP Premium</FieldLabel>
                <div className="relative"><IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="number" value={quoteForm.premium_tp}
                    onChange={e => {
                      const tp = e.target.value;
                      const od = parseFloat(quoteForm.premium_od) || 0;
                      const total = od + (parseFloat(tp) || 0);
                      const exp = total * (parseFloat(quoteForm.payout_percent) || 0) / 100;
                      setQuoteForm(f => ({ ...f, premium_tp: tp, total_premium: total > 0 ? total.toFixed(2) : '', expected_payout_amount: exp > 0 ? exp.toFixed(2) : '' }));
                    }}
                    placeholder="0" className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              </div>
            </div>
            <div>
              <FieldLabel>Total Premium <span className="text-[10px] font-normal text-slate-400">OD + TP — editable</span></FieldLabel>
              <div className="relative"><IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                <input type="number" value={quoteForm.total_premium} onChange={e => { setQuoteForm(f => ({ ...f, total_premium: e.target.value })); setFieldErrors(ex => ({ ...ex, qTotalPremium: '' })); }}
                  placeholder="Auto-calculated" className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-semibold outline-none focus:border-blue-400 ${fieldErrors.qTotalPremium ? 'border-red-400 bg-red-50' : 'border-blue-200 bg-blue-50'}`} /></div>
              <FieldError msg={fieldErrors.qTotalPremium} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Payout % <span className="text-red-400">*</span></FieldLabel>
                <input type="number" value={quoteForm.payout_percent}
                  onChange={e => {
                    const pct = e.target.value;
                    const total = parseFloat(quoteForm.total_premium) || 0;
                    const exp = total * (parseFloat(pct) || 0) / 100;
                    setQuoteForm(f => ({ ...f, payout_percent: pct, expected_payout_amount: exp > 0 ? exp.toFixed(2) : '' }));
                    setFieldErrors(ex => ({ ...ex, qPayoutPercent: '' }));
                  }}
                  placeholder="0" className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-blue-400 ${fieldErrors.qPayoutPercent ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
                <FieldError msg={fieldErrors.qPayoutPercent} />
              </div>
              <div>
                <FieldLabel>Expected Payout</FieldLabel>
                <div className="relative"><IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="number" value={quoteForm.expected_payout_amount} onChange={e => setQuoteForm(f => ({ ...f, expected_payout_amount: e.target.value }))}
                    placeholder="Auto" className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
              </div>
            </div>
            <div>
              <FieldLabel>Remarks</FieldLabel>
              <textarea value={quoteForm.remarks} onChange={e => setQuoteForm(f => ({ ...f, remarks: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 resize-none" />
            </div>
            {actionError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{actionError}</p>
              </div>
            )}
            <button onClick={addQuote} disabled={quoteSaving}
              className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              {quoteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {quoteSaving ? 'Saving…' : 'Add Quote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
