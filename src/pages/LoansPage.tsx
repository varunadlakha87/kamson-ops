import { useEffect, useState, useCallback } from 'react';
import { supabase, T, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  Plus, Loader2, CreditCard, Filter, X, BarChart2,
  TrendingUp, CheckCircle, Clock, ChevronRight,
  Search, IndianRupee, Banknote, AlertCircle
} from 'lucide-react';

const LOAN_TYPES = ['Home Loan', 'Personal Loan', 'Business Loan', 'Car Loan', 'Loan Against Property', 'Education Loan', 'Gold Loan', 'Other'];

const LOAN_STATUSES = ['lead', 'logged_in', 'documents_pending', 'approved', 'sanctioned', 'disbursed', 'rejected', 'closed'] as const;
type LoanStatus = typeof LOAN_STATUSES[number];

const STATUS_CONFIG: Record<LoanStatus, { label: string; color: string; bg: string; dot: string }> = {
  lead:               { label: 'Lead',            color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400' },
  logged_in:          { label: 'Logged In',        color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  documents_pending:  { label: 'Docs Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500' },
  approved:           { label: 'Approved',         color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  sanctioned:         { label: 'Sanctioned',       color: 'text-teal-700',    bg: 'bg-teal-50',     dot: 'bg-teal-500' },
  disbursed:          { label: 'Disbursed',        color: 'text-green-700',   bg: 'bg-green-50',    dot: 'bg-green-500' },
  rejected:           { label: 'Rejected',         color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500' },
  closed:             { label: 'Closed',           color: 'text-slate-500',   bg: 'bg-slate-100',   dot: 'bg-slate-300' },
};

// Each pipeline column maps to one or more statuses — every status must appear in exactly one column
const PIPELINE_COLUMNS: { statuses: LoanStatus[]; label: string; key: string }[] = [
  { key: 'lead',       statuses: ['lead'],                          label: 'Leads' },
  { key: 'active',     statuses: ['logged_in', 'documents_pending'],label: 'Active' },
  { key: 'approved',   statuses: ['approved', 'sanctioned'],        label: 'Approved' },
  { key: 'disbursed',  statuses: ['disbursed'],                     label: 'Disbursed' },
  { key: 'closed',     statuses: ['rejected', 'closed'],            label: 'Closed' },
];

interface LoanCase {
  id: string;
  ref_id: string;
  case_number: string | null;
  customer_id: string | null;
  loan_type: string;
  bank_nbfc: string;
  loan_amount: number;
  emi_amount: number;
  roi: number;
  tenure_months: number;
  login_date: string | null;
  disbursal_date: string | null;
  loan_account_number: string;
  status: LoanStatus;
  assigned_rm_id: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  customer?: { full_name: string; mobile: string };
  assigned_rm?: { full_name: string };
}

type ViewMode = 'pipeline' | 'analytics';

const emptyForm = {
  customer_search: '',
  customer_id: '',
  loan_type: '',
  bank_nbfc: '',
  loan_amount: '',
  emi_amount: '',
  roi: '',
  tenure_months: '',
  login_date: '',
  disbursal_date: '',
  loan_account_number: '',
  status: 'lead' as LoanStatus,
  assigned_rm_id: '',
  notes: '',
};

interface LoansPageProps {
  initialAction?: string;
}

export default function LoansPage({ initialAction }: LoansPageProps) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('pipeline');
  const [loans, setLoans] = useState<LoanCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allCustomers, setAllCustomers] = useState<{ id: string; full_name: string; mobile: string }[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRm, setFilterRm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingLoan, setEditingLoan] = useState<LoanCase | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanCase | null>(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.LOANS)
        .select('*, customer:core_customers!core_loans_customer_id_fkey(full_name, mobile), assigned_rm:master_users!core_loans_assigned_rm_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterRm) query = query.eq('assigned_rm_id', filterRm);
      if (filterType) query = query.eq('loan_type', filterType);

      const { data } = await query;
      let results = (data as LoanCase[]) ?? [];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(l =>
          (l.customer as unknown as { full_name: string })?.full_name?.toLowerCase().includes(s) ||
          l.loan_type.toLowerCase().includes(s) ||
          l.bank_nbfc.toLowerCase().includes(s) ||
          (l.loan_account_number || '').toLowerCase().includes(s)
        );
      }

      setLoans(results);
    } catch (err) {
      console.error('Load loans error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterRm, filterType]);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  useEffect(() => {
    supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, []);

  useEffect(() => {
    supabase.from(T.CUSTOMERS).select('id, full_name, mobile').order('full_name').then(({ data }) => {
      setAllCustomers(data ?? []);
    });
  }, []);

  async function handleSave() {
    if (!form.loan_type || !form.bank_nbfc.trim()) return;
    setSaving(true);
    setSaveError('');

    const payload = {
      customer_id: form.customer_id || null,
      loan_type: form.loan_type,
      bank_nbfc: form.bank_nbfc.trim(),
      loan_amount: parseFloat(form.loan_amount) || 0,
      emi_amount: parseFloat(form.emi_amount) || 0,
      roi: parseFloat(form.roi) || 0,
      tenure_months: parseInt(form.tenure_months) || 0,
      login_date: form.login_date || null,
      disbursal_date: form.disbursal_date || null,
      loan_account_number: form.loan_account_number || null,
      status: form.status,
      assigned_rm_id: form.assigned_rm_id || null,
      notes: form.notes || null,
      created_by: user?.id,
    };

    const { error } = editingLoan
      ? await supabase.from(T.LOANS).update(payload).eq('id', editingLoan.id)
      : await supabase.from(T.LOANS).insert(payload);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowAddModal(false);
    setEditingLoan(null);
    setForm({ ...emptyForm });
    setCustomerQuery('');
    loadLoans();
  }

  async function updateStatus(loanId: string, newStatus: LoanStatus) {
    await supabase.from(T.LOANS).update({ status: newStatus }).eq('id', loanId);
    setShowStatusModal(false);
    setSelectedLoan(null);
    loadLoans();
  }

  function openEdit(l: LoanCase) {
    setEditingLoan(l);
    setCustomerQuery((l.customer as unknown as { full_name: string })?.full_name || '');
    setForm({
      customer_search: (l.customer as unknown as { full_name: string })?.full_name || '',
      customer_id: l.customer_id ?? '',
      loan_type: l.loan_type,
      bank_nbfc: l.bank_nbfc,
      loan_amount: l.loan_amount > 0 ? String(l.loan_amount) : '',
      emi_amount: l.emi_amount > 0 ? String(l.emi_amount) : '',
      roi: l.roi > 0 ? String(l.roi) : '',
      tenure_months: l.tenure_months > 0 ? String(l.tenure_months) : '',
      login_date: l.login_date ?? '',
      disbursal_date: l.disbursal_date ?? '',
      loan_account_number: l.loan_account_number ?? '',
      status: l.status,
      assigned_rm_id: l.assigned_rm_id ?? '',
      notes: l.notes ?? '',
    });
    setShowAddModal(true);
  }

  const formatAmount = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  const daysPending = (l: LoanCase) =>
    Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000);

  const totalLoans = loans.length;
  const activeLoans = loans.filter(l => !['closed', 'rejected'].includes(l.status)).length;
  const disbursedLoans = loans.filter(l => l.status === 'disbursed').length;
  const totalDisbursedAmount = loans.filter(l => l.status === 'disbursed').reduce((s, l) => s + (l.loan_amount || 0), 0);

  // Bank-wise analytics
  const bankMap = new Map<string, { total: number; disbursed: number; amount: number; rejected: number }>();
  loans.forEach(l => {
    const key = l.bank_nbfc || 'Unknown';
    const existing = bankMap.get(key) ?? { total: 0, disbursed: 0, amount: 0, rejected: 0 };
    bankMap.set(key, {
      total: existing.total + 1,
      disbursed: existing.disbursed + (l.status === 'disbursed' ? 1 : 0),
      amount: existing.amount + (l.status === 'disbursed' ? (l.loan_amount || 0) : 0),
      rejected: existing.rejected + (l.status === 'rejected' ? 1 : 0),
    });
  });
  const bankStats = Array.from(bankMap.entries())
    .map(([bank, s]) => ({ bank, ...s, successRatio: s.total > 0 ? Math.round((s.disbursed / s.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  const activeFilterCount = [filterStatus, filterRm, filterType].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Loans</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView(v => v === 'pipeline' ? 'analytics' : 'pipeline')}
                className={`p-2.5 rounded-xl transition-colors ${view === 'analytics' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowAddModal(true); setEditingLoan(null); setForm({ ...emptyForm }); }}
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
                  placeholder="Search customer, bank, loan type..."
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

      {/* Filter chips */}
      {(filterStatus || filterRm || filterType) && view === 'pipeline' && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {filterStatus && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {STATUS_CONFIG[filterStatus as LoanStatus]?.label}
              <button onClick={() => setFilterStatus('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterType && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {filterType}
              <button onClick={() => setFilterType('')}><X className="w-3 h-3" /></button>
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
              { label: 'Total', value: totalLoans, color: 'text-slate-700' },
              { label: 'Active', value: activeLoans, color: 'text-blue-600' },
              { label: 'Disbursed', value: disbursedLoans, color: 'text-emerald-600' },
              { label: 'Volume', value: formatAmount(totalDisbursedAmount), color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-center">
                <div className={`text-base font-bold ${color} leading-tight`}>{value}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline kanban */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2" style={{ minWidth: `${PIPELINE_COLUMNS.length * 200}px` }}>
              {PIPELINE_COLUMNS.map(({ statuses, label, key }) => {
                const colLoans = loans.filter(l => statuses.includes(l.status));
                const cfg = STATUS_CONFIG[statuses[0]];
                return (
                  <div key={key} className="flex-shrink-0 w-48">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{colLoans.length}</span>
                    </div>
                    <div className="space-y-2">
                      {loading ? (
                        [1, 2].map(i => (
                          <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 animate-pulse">
                            <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                          </div>
                        ))
                      ) : colLoans.length === 0 ? (
                        <div className="bg-white rounded-xl p-4 border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-400">Empty</p>
                        </div>
                      ) : colLoans.map(l => {
                        const cust = l.customer as unknown as { full_name: string } | undefined;
                        return (
                          <div
                            key={l.id}
                            className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50"
                            onClick={() => { setSelectedLoan(l); setShowStatusModal(true); }}
                          >
                            {l.case_number && (
                              <p className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block mb-1">{l.case_number}</p>
                            )}
                            <p className="font-semibold text-slate-800 text-xs leading-tight truncate">{cust?.full_name || 'Unnamed'}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5 truncate">{l.loan_type}</p>
                            <p className="text-slate-400 text-[10px] truncate">{l.bank_nbfc}</p>
                            {l.loan_amount > 0 && (
                              <p className="text-[10px] text-blue-600 mt-1 font-semibold">{formatAmount(l.loan_amount)}</p>
                            )}
                            <div className="flex items-center justify-between mt-1.5">
                              {l.assigned_rm && (
                                <p className="text-[10px] text-slate-400 truncate">{(l.assigned_rm as unknown as Profile).full_name}</p>
                              )}
                              <p className="text-[10px] text-slate-400 ml-auto">{daysPending(l)}d</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All loans list */}
          <div className="mt-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">All Loans</h2>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse mb-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : loans.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-800 font-semibold">No loan cases yet</p>
                <p className="text-slate-400 text-sm mt-1">Add your first loan case to get started</p>
              </div>
            ) : loans.map(l => {
              const cfg = STATUS_CONFIG[l.status];
              const cust = l.customer as unknown as { full_name: string; mobile: string } | undefined;
              return (
                <div key={l.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{cust?.full_name || 'Unnamed Customer'}</p>
                        {l.ref_id && (
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{l.ref_id}</span>
                        )}
                        {l.case_number && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{l.case_number}</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">{l.loan_type} · {l.bank_nbfc}</p>
                      {l.assigned_rm && (
                        <p className="text-slate-400 text-xs mt-0.5">RM: {(l.assigned_rm as unknown as Profile).full_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      {l.loan_amount > 0 && <p className="text-xs font-semibold text-slate-700">{formatAmount(l.loan_amount)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 flex-wrap">
                    {l.login_date && <span>Login: {formatDate(l.login_date)}</span>}
                    {l.disbursal_date && <span className="text-emerald-600 font-medium">Disbursed: {formatDate(l.disbursal_date)}</span>}
                    {l.roi > 0 && <span>{l.roi}% ROI</span>}
                    {l.tenure_months > 0 && <span>{l.tenure_months}m</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setSelectedLoan(l); setShowStatusModal(true); }}
                      className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Update Status
                    </button>
                    <button
                      onClick={() => openEdit(l)}
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
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Overview</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Loans', value: totalLoans, icon: CreditCard, bg: 'bg-blue-50', ic: 'text-blue-600' },
                { label: 'Disbursed', value: disbursedLoans, icon: CheckCircle, bg: 'bg-emerald-50', ic: 'text-emerald-600' },
                { label: 'Active Cases', value: activeLoans, icon: Clock, bg: 'bg-amber-50', ic: 'text-amber-600' },
                { label: 'Disbursed Vol.', value: formatAmount(totalDisbursedAmount), icon: IndianRupee, bg: 'bg-sky-50', ic: 'text-sky-600' },
                { label: 'Rejected', value: loans.filter(l => l.status === 'rejected').length, icon: AlertCircle, bg: 'bg-red-50', ic: 'text-red-600' },
                { label: 'Docs Pending', value: loans.filter(l => l.status === 'documents_pending').length, icon: Banknote, bg: 'bg-orange-50', ic: 'text-orange-600' },
              ].map(({ label, value, icon: Icon, bg, ic }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className={`p-2 rounded-xl ${bg} w-fit mb-3`}><Icon className={`w-4 h-4 ${ic}`} /></div>
                  <div className="text-2xl font-bold text-slate-800">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank/NBFC Performance */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Bank / NBFC Performance</h2>
            {bankStats.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No data yet</p>
              </div>
            ) : bankStats.map(s => (
              <div key={s.bank} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.bank}</p>
                    <p className="text-slate-400 text-xs">{s.total} cases</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{s.successRatio}%</div>
                    <div className="text-[10px] text-slate-400">success</div>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                    style={{ width: `${s.successRatio}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <div className="font-bold text-emerald-700">{s.disbursed}</div>
                    <div className="text-emerald-600 mt-0.5">Disbursed</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2">
                    <div className="font-bold text-amber-700">{s.total - s.disbursed - s.rejected}</div>
                    <div className="text-amber-600 mt-0.5">Active</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2">
                    <div className="font-bold text-red-700">{s.rejected}</div>
                    <div className="text-red-600 mt-0.5">Rejected</div>
                  </div>
                </div>
                {s.amount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    <p className="text-xs text-slate-500">Disbursed Volume: <span className="font-bold text-slate-700">{formatAmount(s.amount)}</span></p>
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
                const rmLoans = loans.filter(l => l.assigned_rm_id === profile.id);
                if (rmLoans.length === 0) return null;
                const rmDisbursed = rmLoans.filter(l => l.status === 'disbursed').length;
                const rmActive = rmLoans.filter(l => !['closed', 'rejected', 'disbursed'].includes(l.status)).length;
                const rmRejected = rmLoans.filter(l => l.status === 'rejected').length;
                const rmVolume = rmLoans.filter(l => l.status === 'disbursed').reduce((s, l) => s + (l.loan_amount || 0), 0);
                const rmRatio = rmLoans.length > 0 ? Math.round((rmDisbursed / rmLoans.length) * 100) : 0;

                return (
                  <div key={profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {profile.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{profile.full_name}</p>
                          <p className="text-slate-400 text-xs">{rmLoans.length} cases</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{rmRatio}%</div>
                        <div className="text-[10px] text-slate-400">success</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${rmRatio}%` }} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div><div className="font-bold text-slate-700">{rmLoans.length}</div><div className="text-slate-400">Total</div></div>
                      <div><div className="font-bold text-emerald-600">{rmDisbursed}</div><div className="text-slate-400">Disbursed</div></div>
                      <div><div className="font-bold text-amber-600">{rmActive}</div><div className="text-slate-400">Active</div></div>
                      <div><div className="font-bold text-red-500">{rmRejected}</div><div className="text-slate-400">Rejected</div></div>
                    </div>
                    {rmVolume > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-50">
                        <p className="text-xs text-slate-500">Volume: <span className="font-bold text-slate-700">{formatAmount(rmVolume)}</span></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingLoan(null); setSaveError(''); setCustomerQuery(''); setForm({ ...emptyForm }); }}
        title={editingLoan ? 'Edit Loan Case' : 'New Loan Case'}
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !form.loan_type || !form.bank_nbfc.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : editingLoan ? 'Update Case' : 'Save Case'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Customer picker */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
            {form.customer_id ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-300 bg-blue-50">
                <span className="flex-1 text-sm font-medium text-blue-800">{customerQuery}</span>
                <button
                  onClick={() => { setForm(f => ({ ...f, customer_id: '' })); setCustomerQuery(''); }}
                  className="text-blue-400 hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={e => { setCustomerQuery(e.target.value); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  placeholder="Search by name or mobile..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                {showCustomerDrop && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {allCustomers
                      .filter(c => {
                        const q = customerQuery.toLowerCase();
                        return !q || c.full_name.toLowerCase().includes(q) || c.mobile.includes(q);
                      })
                      .slice(0, 20)
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setForm(f => ({ ...f, customer_id: c.id }));
                            setCustomerQuery(c.full_name);
                            setShowCustomerDrop(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <p className="text-sm font-medium text-slate-800">{c.full_name}</p>
                          <p className="text-xs text-slate-400">{c.mobile}</p>
                        </button>
                      ))}
                    {allCustomers.filter(c => {
                      const q = customerQuery.toLowerCase();
                      return !q || c.full_name.toLowerCase().includes(q) || c.mobile.includes(q);
                    }).length === 0 && (
                      <p className="px-3 py-3 text-xs text-slate-400">No customers found</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Type *</label>
            <select
              value={form.loan_type}
              onChange={e => setForm(f => ({ ...f, loan_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select loan type</option>
              {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bank / NBFC *</label>
            <input
              type="text"
              value={form.bank_nbfc}
              onChange={e => setForm(f => ({ ...f, bank_nbfc: e.target.value }))}
              placeholder="e.g., SBI, HDFC, Bajaj Finserv"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as LoanStatus }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              {LOAN_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign RM</label>
            <select
              value={form.assigned_rm_id}
              onChange={e => setForm(f => ({ ...f, assigned_rm_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select RM</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Amount</label>
              <input
                type="number"
                value={form.loan_amount}
                onChange={e => setForm(f => ({ ...f, loan_amount: e.target.value }))}
                placeholder="₹0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">EMI Amount</label>
              <input
                type="number"
                value={form.emi_amount}
                onChange={e => setForm(f => ({ ...f, emi_amount: e.target.value }))}
                placeholder="₹0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ROI (%)</label>
              <input
                type="number"
                value={form.roi}
                onChange={e => setForm(f => ({ ...f, roi: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tenure (months)</label>
              <input
                type="number"
                value={form.tenure_months}
                onChange={e => setForm(f => ({ ...f, tenure_months: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Login Date</label>
              <input
                type="date"
                value={form.login_date}
                onChange={e => setForm(f => ({ ...f, login_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Disbursal Date</label>
              <input
                type="date"
                value={form.disbursal_date}
                onChange={e => setForm(f => ({ ...f, disbursal_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Account Number</label>
            <input
              type="text"
              value={form.loan_account_number}
              onChange={e => setForm(f => ({ ...f, loan_account_number: e.target.value }))}
              placeholder="Account number"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedLoan(null); }}
        title="Update Status"
      >
        {selectedLoan && (
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-semibold text-slate-800 text-sm">
                  {(selectedLoan.customer as unknown as { full_name: string } | undefined)?.full_name || 'Loan Case'}
                </p>
                {selectedLoan.case_number && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">{selectedLoan.case_number}</span>
                )}
              </div>
              <p className="text-slate-500 text-xs">{selectedLoan.loan_type} · {selectedLoan.bank_nbfc}</p>
            </div>
            {LOAN_STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const active = selectedLoan.status === status;
              return (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedLoan.id, status)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                    active ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-blue-300` : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  {cfg.label}
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
        title="Filter Loans"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {LOAN_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === s ? `${cfg.bg} ${cfg.color} ring-2 ring-blue-300` : 'bg-slate-100 text-slate-600'}`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Loan Type</label>
            <div className="flex flex-wrap gap-2">
              {LOAN_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t}
                </button>
              ))}
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
            onClick={() => { setFilterStatus(''); setFilterType(''); setFilterRm(''); setShowFilterModal(false); }}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
          >
            Clear All Filters
          </button>
        </div>
      </Modal>
    </div>
  );
}
