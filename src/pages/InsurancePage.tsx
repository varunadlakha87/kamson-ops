import { useEffect, useState, useCallback } from 'react';
import { supabase, T, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  Plus, Loader2, Shield, Filter, X, BarChart2,
  Users, TrendingUp, CheckCircle, AlertCircle, Clock,
  ChevronRight, Search, Calendar, IndianRupee
} from 'lucide-react';

const INSURANCE_PARTNERS = ['HDFC ERGO', 'Tata AIG', 'Cateye', 'ICICI Lombard', 'Star Health', 'Other'] as const;
type InsurancePartner = typeof INSURANCE_PARTNERS[number];

const CASE_STATUSES = [
  'Lead Generated', 'Quote Requested', 'Quote Received',
  'Customer Discussion', 'Documents Pending', 'Under Process',
  'Policy Issued', 'Rejected', 'Closed'
] as const;
type CaseStatus = typeof CASE_STATUSES[number];

const POLICY_TYPES = ['Term Life', 'Health', 'ULIP', 'Endowment', 'Motor', 'Home', 'Travel', 'Other'];

const STATUS_CONFIG: Record<CaseStatus, { color: string; bg: string; dot: string }> = {
  'Lead Generated':     { color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400' },
  'Quote Requested':    { color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  'Quote Received':     { color: 'text-sky-700',     bg: 'bg-sky-50',      dot: 'bg-sky-500' },
  'Customer Discussion':{ color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500' },
  'Documents Pending':  { color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-500' },
  'Under Process':      { color: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-500' },
  'Policy Issued':      { color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  'Rejected':           { color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500' },
  'Closed':             { color: 'text-slate-500',   bg: 'bg-slate-100',   dot: 'bg-slate-300' },
};

const PARTNER_COLORS: Record<string, string> = {
  'HDFC ERGO':    'bg-blue-100 text-blue-700',
  'Tata AIG':     'bg-emerald-100 text-emerald-700',
  'Cateye':       'bg-amber-100 text-amber-700',
  'ICICI Lombard':'bg-sky-100 text-sky-700',
  'Star Health':  'bg-rose-100 text-rose-700',
  'Other':        'bg-slate-100 text-slate-600',
};

interface InsuranceCase {
  id: string;
  ref_id: string;
  case_number: string | null;
  customer_id: string | null;
  customer_name: string;
  policy_type: string;
  insurance_partner: InsurancePartner;
  rm_id: string | null;
  premium_amount: number;
  expected_commission: number;
  actual_commission: number;
  commission_received: boolean;
  commission_received_date: string | null;
  quote_date: string | null;
  policy_issue_date: string | null;
  renewal_date: string | null;
  case_status: CaseStatus;
  rejection_reason: string;
  remarks: string;
  created_at: string;
  rm?: { full_name: string };
}

interface PartnerStats {
  partner: InsurancePartner;
  total: number;
  issued: number;
  rejected: number;
  pending: number;
  premium: number;
  commission: number;
  successRatio: number;
}

type ViewMode = 'pipeline' | 'analytics';

// Every status maps to exactly one column — nothing falls through
const PIPELINE_COLUMNS: { statuses: CaseStatus[]; label: string; key: string }[] = [
  { key: 'leads',      statuses: ['Lead Generated'],                                              label: 'Leads' },
  { key: 'quoted',     statuses: ['Quote Requested', 'Quote Received'],                           label: 'Quoted' },
  { key: 'active',     statuses: ['Customer Discussion', 'Documents Pending', 'Under Process'],   label: 'Active' },
  { key: 'issued',     statuses: ['Policy Issued'],                                               label: 'Issued' },
  { key: 'closed',     statuses: ['Rejected', 'Closed'],                                          label: 'Closed' },
];

const emptyForm = {
  customer_name: '', policy_type: '', insurance_partner: '' as InsurancePartner | '',
  premium_amount: '', expected_commission: '', quote_date: '', policy_issue_date: '',
  renewal_date: '', case_status: 'Lead Generated' as CaseStatus,
  rejection_reason: '', remarks: '', rm_id: '',
};

interface InsurancePageProps {
  initialAction?: string;
}

export default function InsurancePage({ initialAction }: InsurancePageProps) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('pipeline');
  const [cases, setCases] = useState<InsuranceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRm, setFilterRm] = useState('');
  const [editingCase, setEditingCase] = useState<InsuranceCase | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<InsuranceCase | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.INSURANCE_CASES)
        .select('*, rm:master_users!core_insurance_cases_rm_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filterPartner) query = query.eq('insurance_partner', filterPartner);
      if (filterStatus) query = query.eq('case_status', filterStatus);
      if (filterRm) query = query.eq('rm_id', filterRm);

      const { data } = await query;
      let results = (data as InsuranceCase[]) ?? [];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(c =>
          c.customer_name.toLowerCase().includes(s) ||
          c.policy_type.toLowerCase().includes(s) ||
          c.insurance_partner.toLowerCase().includes(s)
        );
      }

      setCases(results);
    } catch (err) {
      console.error('Load insurance cases error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterPartner, filterStatus, filterRm]);

  useEffect(() => { loadCases(); }, [loadCases]);

  useEffect(() => {
    supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, []);

  async function handleSave() {
    if (!form.customer_name.trim() || !form.insurance_partner || !form.policy_type) return;
    setSaving(true);
    setSaveError('');

    const payload = {
      customer_name: form.customer_name.trim(),
      policy_type: form.policy_type,
      insurance_partner: form.insurance_partner,
      rm_id: form.rm_id || null,
      premium_amount: parseFloat(form.premium_amount) || 0,
      expected_commission: parseFloat(form.expected_commission) || 0,
      quote_date: form.quote_date || null,
      policy_issue_date: form.policy_issue_date || null,
      renewal_date: form.renewal_date || null,
      case_status: form.case_status,
      rejection_reason: form.rejection_reason || null,
      remarks: form.remarks || null,
      created_by: user?.id,
    };

    const { data: savedCase, error } = editingCase
      ? await supabase.from(T.INSURANCE_CASES).update(payload).eq('id', editingCase.id).select().single()
      : await supabase.from(T.INSURANCE_CASES).insert(payload).select().single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    // Auto-create renewal when saving a new case (or updating) with Policy Issued + renewal date
    if (
      !editingCase &&
      form.case_status === 'Policy Issued' &&
      form.renewal_date &&
      savedCase
    ) {
      await supabase.from(T.RENEWALS).insert({
        customer_id: savedCase.customer_id ?? null,
        renewal_type: 'insurance',
        title: `${form.policy_type} Renewal — ${form.customer_name}`,
        renewal_date: form.renewal_date,
        amount: parseFloat(form.premium_amount) || 0,
        status: 'pending',
      });
    }

    setSaving(false);
    setShowAddModal(false);
    setEditingCase(null);
    setForm({ ...emptyForm });
    loadCases();
  }

  async function updateStatus(caseId: string, newStatus: CaseStatus) {
    await supabase.from(T.INSURANCE_CASES).update({ case_status: newStatus }).eq('id', caseId);

    // Auto-create renewal when a case is marked as Policy Issued and has a renewal date
    if (newStatus === 'Policy Issued' && selectedCase && selectedCase.renewal_date) {
      const existing = await supabase
        .from(T.RENEWALS)
        .select('id')
        .eq('renewal_date', selectedCase.renewal_date)
        .ilike('title', `%${selectedCase.customer_name}%`)
        .limit(1);
      if (!existing.data?.length) {
        await supabase.from(T.RENEWALS).insert({
          customer_id: selectedCase.customer_id ?? null,
          renewal_type: 'insurance',
          title: `${selectedCase.policy_type} Renewal — ${selectedCase.customer_name}`,
          renewal_date: selectedCase.renewal_date,
          amount: selectedCase.premium_amount ?? 0,
          status: 'pending',
        });
      }
    }

    setShowStatusModal(false);
    setSelectedCase(null);
    loadCases();
  }

  function openEdit(c: InsuranceCase) {
    setEditingCase(c);
    setForm({
      customer_name: c.customer_name,
      policy_type: c.policy_type,
      insurance_partner: c.insurance_partner,
      premium_amount: c.premium_amount > 0 ? String(c.premium_amount) : '',
      expected_commission: c.expected_commission > 0 ? String(c.expected_commission) : '',
      quote_date: c.quote_date ?? '',
      policy_issue_date: c.policy_issue_date ?? '',
      renewal_date: c.renewal_date ?? '',
      case_status: c.case_status,
      rejection_reason: c.rejection_reason ?? '',
      remarks: c.remarks ?? '',
      rm_id: c.rm_id ?? '',
    });
    setShowAddModal(true);
  }

  const partnerStats: PartnerStats[] = INSURANCE_PARTNERS.map(partner => {
    const partnerCases = cases.filter(c => c.insurance_partner === partner);
    const issued = partnerCases.filter(c => c.case_status === 'Policy Issued').length;
    const rejected = partnerCases.filter(c => c.case_status === 'Rejected').length;
    const pending = partnerCases.filter(c => !['Policy Issued', 'Rejected', 'Closed'].includes(c.case_status)).length;
    const premium = partnerCases.reduce((s, c) => s + (c.premium_amount || 0), 0);
    const commission = partnerCases.reduce((s, c) => s + (c.actual_commission || c.expected_commission || 0), 0);
    return {
      partner,
      total: partnerCases.length,
      issued, rejected, pending, premium, commission,
      successRatio: partnerCases.length > 0 ? Math.round((issued / partnerCases.length) * 100) : 0,
    };
  }).filter(s => s.total > 0);

  const totalCases = cases.length;
  const totalIssued = cases.filter(c => c.case_status === 'Policy Issued').length;
  const totalPending = cases.filter(c => !['Policy Issued', 'Rejected', 'Closed'].includes(c.case_status)).length;
  const totalPremium = cases.reduce((s, c) => s + (c.premium_amount || 0), 0);
  const overallSuccessRatio = totalCases > 0 ? Math.round((totalIssued / totalCases) * 100) : 0;

  const activeFilterCount = [filterPartner, filterStatus, filterRm].filter(Boolean).length;

  const formatAmount = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const daysPending = (c: InsuranceCase) => {
    return Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Insurance</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView(v => v === 'pipeline' ? 'analytics' : 'pipeline')}
                className={`p-2.5 rounded-xl transition-colors ${view === 'analytics' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowAddModal(true); setEditingCase(null); setForm({ ...emptyForm }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {view === 'pipeline' && (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, policy, partner..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
              <button
                onClick={() => setShowFilterModal(true)}
                className={`p-2.5 rounded-xl transition-colors relative ${activeFilterCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {(filterPartner || filterStatus || filterRm) && view === 'pipeline' && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {filterPartner && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {filterPartner}
              <button onClick={() => setFilterPartner('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterStatus && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {filterStatus}
              <button onClick={() => setFilterStatus('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterRm && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {profiles.find(p => p.id === filterRm)?.full_name || 'RM'}
              <button onClick={() => setFilterRm('')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div className="px-4 py-3">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Total', value: totalCases, color: 'text-slate-700' },
              { label: 'Pending', value: totalPending, color: 'text-amber-600' },
              { label: 'Issued', value: totalIssued, color: 'text-emerald-600' },
              { label: 'Success%', value: `${overallSuccessRatio}%`, color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline columns (horizontal scroll) */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2" style={{ minWidth: `${PIPELINE_COLUMNS.length * 200}px` }}>
              {PIPELINE_COLUMNS.map(({ statuses, label, key }) => {
                const colCases = cases.filter(c => statuses.includes(c.case_status));
                const cfg = STATUS_CONFIG[statuses[0]];
                return (
                  <div key={key} className="flex-shrink-0 w-48">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{colCases.length}</span>
                    </div>
                    <div className="space-y-2">
                      {loading ? (
                        [1, 2].map(i => (
                          <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 animate-pulse">
                            <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                          </div>
                        ))
                      ) : colCases.length === 0 ? (
                        <div className="bg-white rounded-xl p-4 border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-400">Empty</p>
                        </div>
                      ) : colCases.map(c => (
                        <div
                          key={c.id}
                          className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50"
                          onClick={() => { setSelectedCase(c); setShowStatusModal(true); }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {c.ref_id && (
                              <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">{c.ref_id}</span>
                            )}
                            {c.case_number && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{c.case_number}</span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 text-xs leading-tight truncate">{c.customer_name}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 truncate">{c.policy_type}</p>
                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1.5 ${PARTNER_COLORS[c.insurance_partner] || PARTNER_COLORS.Other}`}>
                            {c.insurance_partner}
                          </span>
                          {c.premium_amount > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">{formatAmount(c.premium_amount)}</p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            {c.rm && <p className="text-[10px] text-slate-400 truncate">{(c.rm as unknown as Profile).full_name}</p>}
                            <p className="text-[10px] text-slate-400 ml-auto">{daysPending(c)}d</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All cases list below */}
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">All Cases</h2>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse mb-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : cases.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-800 font-semibold">No insurance cases yet</p>
                <p className="text-slate-400 text-sm mt-1">Add your first case to get started</p>
              </div>
            ) : cases.map(c => {
              const cfg = STATUS_CONFIG[c.case_status];
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{c.customer_name}</p>
                        {c.case_number && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{c.case_number}</span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PARTNER_COLORS[c.insurance_partner] || PARTNER_COLORS.Other}`}>
                          {c.insurance_partner}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">{c.policy_type}</p>
                      {c.rm && <p className="text-slate-400 text-xs mt-0.5">RM: {(c.rm as unknown as Profile).full_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{c.case_status}</span>
                      {c.premium_amount > 0 && <p className="text-xs font-semibold text-slate-700">{formatAmount(c.premium_amount)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => { setSelectedCase(c); setShowStatusModal(true); }}
                      className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Update Status
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {view === 'analytics' && (
        <div className="px-4 py-4 space-y-5">
          {/* Top KPI cards */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Overview</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Cases', value: totalCases, icon: Shield, bg: 'bg-blue-50', ic: 'text-blue-600' },
                { label: 'Policies Issued', value: totalIssued, icon: CheckCircle, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
                { label: 'Pending Cases', value: totalPending, icon: Clock, bg: 'bg-amber-50', ic: 'text-amber-600' },
                { label: 'Success Ratio', value: `${overallSuccessRatio}%`, icon: TrendingUp, bg: 'bg-sky-50', ic: 'text-sky-600' },
                { label: 'Total Premium', value: formatAmount(totalPremium), icon: IndianRupee, bg: 'bg-teal-50', ic: 'text-teal-600' },
                { label: 'Rejected', value: cases.filter(c => c.case_status === 'Rejected').length, icon: AlertCircle, bg: 'bg-red-50', ic: 'text-red-600' },
              ].map(({ label, value, icon: Icon, bg, ic }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className={`p-2 rounded-xl ${bg} w-fit mb-3`}><Icon className={`w-4 h-4 ${ic}`} /></div>
                  <div className="text-2xl font-bold text-slate-800">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Analytics */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Partner Performance</h2>
            {partnerStats.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No data yet</p>
              </div>
            ) : partnerStats.map(s => (
              <div key={s.partner} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PARTNER_COLORS[s.partner]}`}>{s.partner}</span>
                    <span className="text-sm font-bold text-slate-700">{s.total} cases</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{s.successRatio}%</div>
                    <div className="text-[10px] text-slate-400">success</div>
                  </div>
                </div>

                {/* Success ratio bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${s.successRatio}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <div className="font-bold text-emerald-700">{s.issued}</div>
                    <div className="text-emerald-600 mt-0.5">Issued</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2">
                    <div className="font-bold text-amber-700">{s.pending}</div>
                    <div className="text-amber-600 mt-0.5">Pending</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2">
                    <div className="font-bold text-red-700">{s.rejected}</div>
                    <div className="text-red-600 mt-0.5">Rejected</div>
                  </div>
                </div>

                {s.premium > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Premium Generated</p>
                      <p className="text-sm font-bold text-slate-700">{formatAmount(s.premium)}</p>
                    </div>
                    {s.commission > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium">Commission</p>
                        <p className="text-sm font-bold text-slate-700">{formatAmount(s.commission)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* RM Performance */}
          {profiles.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">RM Performance</h2>
              {profiles.map(profile => {
                const rmCases = cases.filter(c => c.rm_id === profile.id);
                if (rmCases.length === 0) return null;
                const rmIssued = rmCases.filter(c => c.case_status === 'Policy Issued').length;
                const rmPending = rmCases.filter(c => !['Policy Issued', 'Rejected', 'Closed'].includes(c.case_status)).length;
                const rmRejected = rmCases.filter(c => c.case_status === 'Rejected').length;
                const rmPremium = rmCases.reduce((s, c) => s + (c.premium_amount || 0), 0);
                const rmSuccessRatio = rmCases.length > 0 ? Math.round((rmIssued / rmCases.length) * 100) : 0;

                return (
                  <div key={profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {profile.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{profile.full_name}</p>
                          <p className="text-slate-400 text-xs">{rmCases.length} cases</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{rmSuccessRatio}%</div>
                        <div className="text-[10px] text-slate-400">success</div>
                      </div>
                    </div>

                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${rmSuccessRatio}%` }} />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div><div className="font-bold text-slate-700">{rmCases.length}</div><div className="text-slate-400">Total</div></div>
                      <div><div className="font-bold text-emerald-600">{rmIssued}</div><div className="text-slate-400">Issued</div></div>
                      <div><div className="font-bold text-amber-600">{rmPending}</div><div className="text-slate-400">Pending</div></div>
                      <div><div className="font-bold text-red-500">{rmRejected}</div><div className="text-slate-400">Rejected</div></div>
                    </div>

                    {rmPremium > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-50">
                        <p className="text-xs text-slate-500">Premium: <span className="font-bold text-slate-700">{formatAmount(rmPremium)}</span></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Case Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingCase(null); setSaveError(''); }}
        title={editingCase ? 'Edit Case' : 'New Insurance Case'}
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !form.customer_name.trim() || !form.insurance_partner || !form.policy_type}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : editingCase ? 'Update Case' : 'Save Case'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer Name *</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              placeholder="Customer full name"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Type *</label>
            <select
              value={form.policy_type}
              onChange={e => setForm(f => ({ ...f, policy_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select policy type</option>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Insurance Partner *</label>
            <select
              value={form.insurance_partner}
              onChange={e => setForm(f => ({ ...f, insurance_partner: e.target.value as InsurancePartner }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select partner</option>
              {INSURANCE_PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Case Status</label>
            <select
              value={form.case_status}
              onChange={e => setForm(f => ({ ...f, case_status: e.target.value as CaseStatus }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign RM</label>
            <select
              value={form.rm_id}
              onChange={e => setForm(f => ({ ...f, rm_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select RM</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Premium Amount</label>
              <input
                type="number"
                value={form.premium_amount}
                onChange={e => setForm(f => ({ ...f, premium_amount: e.target.value }))}
                placeholder="₹0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expected Commission</label>
              <input
                type="number"
                value={form.expected_commission}
                onChange={e => setForm(f => ({ ...f, expected_commission: e.target.value }))}
                placeholder="₹0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quote Date</label>
              <input
                type="date"
                value={form.quote_date}
                onChange={e => setForm(f => ({ ...f, quote_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Issue Date</label>
              <input
                type="date"
                value={form.policy_issue_date}
                onChange={e => setForm(f => ({ ...f, policy_issue_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Renewal Date</label>
            <input
              type="date"
              value={form.renewal_date}
              onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          {form.case_status === 'Rejected' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rejection Reason</label>
              <input
                type="text"
                value={form.rejection_reason}
                onChange={e => setForm(f => ({ ...f, rejection_reason: e.target.value }))}
                placeholder="Reason for rejection"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Any additional remarks"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedCase(null); }}
        title="Update Status"
      >
        {selectedCase && (
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-semibold text-slate-800 text-sm">{selectedCase.customer_name}</p>
                {selectedCase.case_number && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{selectedCase.case_number}</span>
                )}
              </div>
              <p className="text-slate-500 text-xs">{selectedCase.policy_type} · {selectedCase.insurance_partner}</p>
            </div>
            {CASE_STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const active = selectedCase.case_status === status;
              return (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedCase.id, status)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                    active ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-blue-300` : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  {status}
                  {active && <span className="ml-auto text-[10px] font-bold">Current</span>}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Cases"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Partner</label>
            <div className="flex flex-wrap gap-2">
              {INSURANCE_PARTNERS.map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPartner(filterPartner === p ? '' : p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterPartner === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {CASE_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === s ? `${cfg.bg} ${cfg.color} ring-2 ring-blue-300` : 'bg-slate-100 text-slate-600'}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">RM</label>
            <div className="flex flex-wrap gap-2">
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterRm(filterRm === p.id ? '' : p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRm === p.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {p.full_name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setFilterPartner(''); setFilterStatus(''); setFilterRm(''); setShowFilterModal(false); }}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </Modal>
    </div>
  );
}
