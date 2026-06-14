import { useEffect, useState } from 'react';
import { supabase, T, Customer, Loan, InsurancePolicy, Document, Task, Activity, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { MaskedField } from '../components/MaskedField';
import {
  ArrowLeft, Phone, MessageCircle, Upload, StickyNote,
  CreditCard, Shield, FileText, CheckSquare, Clock,
  Plus, Loader2, Calendar, TrendingUp, Building, MapPin, Mail, Briefcase
} from 'lucide-react';

interface InsuranceCaseItem {
  id: string;
  customer_name: string;
  policy_type: string;
  insurance_partner: string;
  premium_amount: number;
  case_status: string;
  quote_date: string | null;
  policy_issue_date: string | null;
  created_at: string;
}

const CASE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'Lead Generated':     { label: 'Lead Generated',     color: 'bg-slate-100 text-slate-600' },
  'Quote Requested':    { label: 'Quote Requested',    color: 'bg-blue-50 text-blue-700' },
  'Quote Received':     { label: 'Quote Received',     color: 'bg-sky-50 text-sky-700' },
  'Customer Discussion':{ label: 'Customer Discussion',color: 'bg-amber-50 text-amber-700' },
  'Documents Pending':  { label: 'Docs Pending',       color: 'bg-orange-50 text-orange-700' },
  'Under Process':      { label: 'Under Process',      color: 'bg-violet-50 text-violet-700' },
  'Policy Issued':      { label: 'Policy Issued',      color: 'bg-emerald-50 text-emerald-700' },
  'Rejected':           { label: 'Rejected',           color: 'bg-red-50 text-red-700' },
  'Closed':             { label: 'Closed',             color: 'bg-slate-100 text-slate-500' },
};

const LOAN_TYPES = ['Home Loan', 'Personal Loan', 'Business Loan', 'Car Loan', 'Loan Against Property', 'Education Loan', 'Gold Loan', 'Other'];
const LOAN_STATUSES = ['lead', 'logged_in', 'documents_pending', 'approved', 'sanctioned', 'disbursed', 'rejected', 'closed'];
const LOAN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-slate-100 text-slate-600' },
  logged_in: { label: 'Logged In', color: 'bg-blue-50 text-blue-700' },
  documents_pending: { label: 'Docs Pending', color: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700' },
  sanctioned: { label: 'Sanctioned', color: 'bg-teal-50 text-teal-700' },
  disbursed: { label: 'Disbursed', color: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-500' },
};

const POLICY_TYPES = ['Term Life', 'Health', 'ULIP', 'Endowment', 'Motor', 'Home', 'Travel', 'Other'];
const INSURANCE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700' },
  renewal_due: { label: 'Renewal Due', color: 'bg-amber-50 text-amber-700' },
  expired: { label: 'Expired', color: 'bg-red-50 text-red-700' },
  claim_initiated: { label: 'Claim', color: 'bg-blue-50 text-blue-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-500' },
};

const DOC_TYPES = ['PAN', 'Aadhaar', 'Bank Statement', 'Salary Slip', 'GST Certificate', 'ITR', 'Policy PDF', 'Sanction Letter', 'Property Docs', 'Other'];
const DOC_CATEGORIES = ['kyc', 'loan', 'insurance', 'property', 'other'];

const TASK_TYPES = ['customer_call', 'document_collection', 'insurance_renewal', 'emi_followup', 'site_visit', 'quote_sharing', 'other'];
const TASK_TYPE_LABELS: Record<string, string> = {
  customer_call: 'Customer Call', document_collection: 'Document Collection',
  insurance_renewal: 'Insurance Renewal', emi_followup: 'EMI Follow-up',
  site_visit: 'Site Visit', quote_sharing: 'Quote Sharing', other: 'Other',
};

interface Customer360PageProps {
  customer: Customer;
  onBack: () => void;
}

type ActiveTab = 'overview' | 'loans' | 'insurance' | 'documents' | 'tasks' | 'timeline';

export default function Customer360Page({ customer, onBack }: Customer360PageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [insuranceCases, setInsuranceCases] = useState<InsuranceCaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [loanForm, setLoanForm] = useState({ loan_type: '', bank_nbfc: '', loan_amount: '', emi_amount: '', roi: '', tenure_months: '', login_date: '', status: 'lead', notes: '' });
  const [policyForm, setPolicyForm] = useState({ policy_type: '', insurance_company: '', policy_number: '', premium_amount: '', sum_assured: '', policy_start_date: '', renewal_date: '', nominee_name: '', status: 'active', notes: '' });
  const [taskForm, setTaskForm] = useState({ task_type: 'customer_call', title: '', description: '', due_date: '' });
  const [noteText, setNoteText] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, customer.id]);

  useEffect(() => {
    supabase.from(T.USERS).select('id, full_name').then(({ data }) => setProfiles(data ?? []));
  }, []);

  async function loadTabData(tab: ActiveTab) {
    setLoading(true);
    try {
      switch (tab) {
        case 'loans':
          const { data: l } = await supabase.from(T.LOANS).select('*').eq('customer_id', customer.id).eq('active', true).order('created_at', { ascending: false });
          setLoans(l ?? []);
          break;
        case 'insurance': {
          const [{ data: p }, { data: ic }] = await Promise.all([
            supabase.from(T.INSURANCE_POLICIES).select('*').eq('customer_id', customer.id).eq('active', true).order('created_at', { ascending: false }),
            supabase.from(T.INSURANCE_CASES).select('*').eq('customer_id', customer.id).eq('active', true).order('created_at', { ascending: false }),
          ]);
          setPolicies(p ?? []);
          setInsuranceCases((ic ?? []) as InsuranceCaseItem[]);
          break;
        }
        case 'documents':
          const { data: d } = await supabase.from(T.DOCUMENTS).select('*, uploader:master_users!core_documents_uploaded_by_fkey(full_name)').eq('customer_id', customer.id).eq('active', true).order('created_at', { ascending: false });
          setDocuments(d ?? []);
          break;
        case 'tasks':
          const { data: t } = await supabase.from(T.TASKS).select('*, assignee:master_users!core_tasks_assigned_to_fkey(full_name)').eq('customer_id', customer.id).eq('active', true).order('due_date', { ascending: true });
          setTasks(t ?? []);
          break;
        case 'timeline':
          const { data: a } = await supabase.from(T.ACTIVITIES).select('*, performer:master_users!core_activities_performed_by_fkey(full_name)').eq('customer_id', customer.id).order('created_at', { ascending: false });
          setActivities(a ?? []);
          break;
      }
    } catch (err) {
      console.error('Load tab data error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveLoan() {
    setSaving(true);
    try {
      const { error } = await supabase.from(T.LOANS).insert({
        customer_id: customer.id,
        loan_type: loanForm.loan_type,
        bank_nbfc: loanForm.bank_nbfc,
        loan_amount: parseFloat(loanForm.loan_amount) || 0,
        emi_amount: parseFloat(loanForm.emi_amount) || 0,
        roi: parseFloat(loanForm.roi) || 0,
        tenure_months: parseInt(loanForm.tenure_months) || 0,
        login_date: loanForm.login_date || null,
        status: loanForm.status,
        notes: loanForm.notes,
        created_by: user?.id,
        owner_id: user?.id,
      });
      if (!error) {
        await supabase.from(T.ACTIVITIES).insert({ customer_id: customer.id, activity_type: 'loan_created', description: `Loan case created: ${loanForm.loan_type} - ${loanForm.bank_nbfc}`, performed_by: user?.id });
        setShowLoanModal(false);
        setLoanForm({ loan_type: '', bank_nbfc: '', loan_amount: '', emi_amount: '', roi: '', tenure_months: '', login_date: '', status: 'lead', notes: '' });
        loadTabData('loans');
      }
    } finally {
      setSaving(false);
    }
  }

  async function savePolicy() {
    setSaving(true);
    const { data: pol, error } = await supabase.from(T.INSURANCE_POLICIES).insert({
      customer_id: customer.id,
      policy_type: policyForm.policy_type,
      insurance_company: policyForm.insurance_company,
      policy_number: policyForm.policy_number,
      premium_amount: parseFloat(policyForm.premium_amount) || 0,
      sum_assured: parseFloat(policyForm.sum_assured) || 0,
      policy_start_date: policyForm.policy_start_date || null,
      renewal_date: policyForm.renewal_date || null,
      nominee_name: policyForm.nominee_name,
      status: policyForm.status,
      notes: policyForm.notes,
      created_by: user?.id,
      owner_id: user?.id,
    }).select().single();
    if (!error) {
      if (policyForm.renewal_date) {
        await supabase.from(T.RENEWALS).insert({
          customer_id: customer.id,
          policy_id: pol?.id,
          renewal_type: 'insurance',
          title: `${policyForm.policy_type} - ${policyForm.insurance_company}`,
          renewal_date: policyForm.renewal_date,
          amount: parseFloat(policyForm.premium_amount) || 0,
          status: 'pending',
        });
      }
      await supabase.from(T.ACTIVITIES).insert({ customer_id: customer.id, activity_type: 'policy_created', description: `Policy added: ${policyForm.policy_type} - ${policyForm.insurance_company}`, performed_by: user?.id });
      setShowPolicyModal(false);
      setPolicyForm({ policy_type: '', insurance_company: '', policy_number: '', premium_amount: '', sum_assured: '', policy_start_date: '', renewal_date: '', nominee_name: '', status: 'active', notes: '' });
      loadTabData('insurance');
    }
    setSaving(false);
  }

  async function saveTask() {
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from(T.TASKS).insert({
      customer_id: customer.id,
      task_type: taskForm.task_type,
      title: taskForm.title || TASK_TYPE_LABELS[taskForm.task_type],
      description: taskForm.description,
      due_date: taskForm.due_date || null,
      status: 'pending',
      assigned_to: user?.id,
      created_by: user?.id,
      owner_id: user?.id,
    });
    if (error) {
      setSaveError(error.message);
    } else {
      await supabase.from(T.ACTIVITIES).insert({ customer_id: customer.id, activity_type: 'task_created', description: `Task created: ${taskForm.title || TASK_TYPE_LABELS[taskForm.task_type]}`, performed_by: user?.id });
      setShowTaskModal(false);
      setTaskForm({ task_type: 'customer_call', title: '', description: '', due_date: '' });
      loadTabData('tasks');
    }
    setSaving(false);
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const { error } = await supabase.from(T.ACTIVITIES).insert({ customer_id: customer.id, activity_type: 'note_added', description: noteText.trim(), performed_by: user?.id });
    if (error) {
      console.error('Save note failed:', error.message);
    } else {
      setShowNoteModal(false);
      setNoteText('');
      if (activeTab === 'timeline') loadTabData('timeline');
    }
    setSaving(false);
  }

  async function completeTask(taskId: string) {
    const { error } = await supabase.from(T.TASKS).update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
    if (error) { console.error('Complete task failed:', error.message); return; }
    loadTabData('tasks');
  }

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'loans', label: 'Loans', icon: CreditCard },
    { id: 'insurance', label: 'Insurance', icon: Shield },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatAmount = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const activityIcons: Record<string, string> = {
    customer_added: '👤', document_uploaded: '📄', loan_created: '💰',
    policy_created: '🛡️', task_completed: '✅', task_created: '📋',
    renewal_updated: '🔄', note_added: '📝',
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="px-4 pt-12 pb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-300 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Customers
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {customer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white truncate">{customer.full_name}</h1>
                {customer.ref_id && <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-full flex-shrink-0">{customer.ref_id}</span>}
              </div>
              <p className="text-slate-300 text-sm">{customer.mobile}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                customer.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                customer.status === 'renewal_due' ? 'bg-amber-500/20 text-amber-300' :
                'bg-slate-500/20 text-slate-300'
              }`}>
                {customer.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <a href={`tel:${customer.mobile}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20">
              <Phone className="w-4 h-4" /> Call
            </a>
            <a href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button onClick={() => setShowNoteModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20">
              <StickyNote className="w-4 h-4" /> Note
            </button>
            <button onClick={() => setShowTaskModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20">
              <Plus className="w-4 h-4" /> Task
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 pb-0 gap-1 scrollbar-hide">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === id
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && !loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">Personal Details</h3>
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">{customer.email}</span>
                </div>
              )}
              {customer.occupation && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">{customer.occupation}</span>
                </div>
              )}
              {customer.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">{formatDate(customer.date_of_birth)}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{customer.address}</span>
                </div>
              )}
              {customer.pan && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">PAN: <MaskedField value={customer.pan} fieldType="pan" /></span>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                <p className="text-sm text-amber-900">{customer.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setActiveTab('loans'); setShowLoanModal(true); }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 active:bg-slate-50">
                <div className="p-2 bg-blue-50 rounded-xl"><CreditCard className="w-5 h-5 text-blue-600" /></div>
                <span className="text-sm font-semibold text-slate-700">Add Loan</span>
              </button>
              <button onClick={() => { setActiveTab('insurance'); setShowPolicyModal(true); }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 active:bg-slate-50">
                <div className="p-2 bg-emerald-50 rounded-xl"><Shield className="w-5 h-5 text-emerald-600" /></div>
                <span className="text-sm font-semibold text-slate-700">Add Policy</span>
              </button>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && !loading && (
          <div className="space-y-3">
            <button onClick={() => setShowLoanModal(true)}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              <Plus className="w-4 h-4" /> Add Loan Case
            </button>
            {loans.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No loans yet</p>
              </div>
            ) : loans.map(loan => {
              const s = LOAN_STATUS_LABELS[loan.status];
              return (
                <div key={loan.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{loan.loan_type}</p>
                        {(loan as Loan & { ref_id?: string }).ref_id && (
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{(loan as Loan & { ref_id?: string }).ref_id}</span>
                        )}
                        {loan.case_number && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{loan.case_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-slate-500 text-sm">{loan.bank_nbfc}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {loan.loan_amount > 0 && (
                      <div><p className="text-slate-400 text-xs">Loan Amount</p><p className="font-semibold text-slate-700">{formatAmount(loan.loan_amount)}</p></div>
                    )}
                    {loan.emi_amount > 0 && (
                      <div><p className="text-slate-400 text-xs">EMI</p><p className="font-semibold text-slate-700">{formatAmount(loan.emi_amount)}</p></div>
                    )}
                    {loan.roi > 0 && (
                      <div><p className="text-slate-400 text-xs">ROI</p><p className="font-semibold text-slate-700">{loan.roi}%</p></div>
                    )}
                    {loan.tenure_months > 0 && (
                      <div><p className="text-slate-400 text-xs">Tenure</p><p className="font-semibold text-slate-700">{loan.tenure_months}m</p></div>
                    )}
                  </div>
                  {loan.login_date && (
                    <p className="text-xs text-slate-400 mt-2">Login: {formatDate(loan.login_date)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === 'insurance' && !loading && (
          <div className="space-y-3">
            <button onClick={() => setShowPolicyModal(true)}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              <Plus className="w-4 h-4" /> Add Policy
            </button>

            {insuranceCases.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Case Pipeline</p>
                {insuranceCases.map(ic => {
                  const s = CASE_STATUS_LABELS[ic.case_status] ?? CASE_STATUS_LABELS['Lead Generated'];
                  return (
                    <div key={ic.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{ic.policy_type}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{ic.insurance_partner}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                      </div>
                      {ic.premium_amount > 0 && (
                        <p className="text-xs text-slate-500 mt-2">Premium: <span className="font-semibold text-slate-700">₹{ic.premium_amount.toLocaleString('en-IN')}</span></p>
                      )}
                      {ic.quote_date && <p className="text-xs text-slate-400 mt-1">Quote: {formatDate(ic.quote_date)}</p>}
                      {ic.policy_issue_date && <p className="text-xs text-emerald-600 mt-0.5 font-medium">Issued: {formatDate(ic.policy_issue_date)}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {policies.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No policies yet</p>
              </div>
            ) : policies.map(policy => {
              const s = INSURANCE_STATUS_LABELS[policy.status];
              const renewalDays = policy.renewal_date ? Math.ceil((new Date(policy.renewal_date).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={policy.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${renewalDays !== null && renewalDays <= 30 && renewalDays > 0 ? 'border-amber-200' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{policy.policy_type}</p>
                      <p className="text-slate-500 text-sm">{policy.insurance_company}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {policy.premium_amount > 0 && (
                      <div><p className="text-slate-400 text-xs">Premium</p><p className="font-semibold text-slate-700">{formatAmount(policy.premium_amount)}</p></div>
                    )}
                    {policy.sum_assured > 0 && (
                      <div><p className="text-slate-400 text-xs">Sum Assured</p><p className="font-semibold text-slate-700">{formatAmount(policy.sum_assured)}</p></div>
                    )}
                  </div>
                  {policy.renewal_date && (
                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${renewalDays !== null && renewalDays <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      Renewal: {formatDate(policy.renewal_date)}
                      {renewalDays !== null && renewalDays <= 30 && renewalDays > 0 && (
                        <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{renewalDays}d left</span>
                      )}
                    </div>
                  )}
                  {policy.policy_number && <p className="text-xs text-slate-400 mt-1">Policy #: {policy.policy_number}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && !loading && (
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-3 text-xs text-amber-700">
              Document upload via camera or file is available. File storage powered by Supabase.
            </div>
            {documents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No documents yet</p>
                <p className="text-slate-400 text-xs mt-1">Upload documents from the Documents tab</p>
              </div>
            ) : documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{doc.document_name}</p>
                    <p className="text-slate-400 text-xs">{doc.document_type} · {new Date(doc.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && !loading && (
          <div className="space-y-3">
            <button onClick={() => setShowTaskModal(true)}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              <Plus className="w-4 h-4" /> Add Task
            </button>
            {tasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No tasks yet</p>
              </div>
            ) : tasks.map(task => {
              const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
              return (
                <div key={task.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${overdue ? 'border-red-200' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                      <p className="text-slate-400 text-xs">{TASK_TYPE_LABELS[task.task_type]}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ml-2 ${
                      task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      overdue ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {task.status === 'completed' ? 'Done' : overdue ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                  {task.due_date && (
                    <p className="text-xs text-slate-400">{formatDate(task.due_date)}</p>
                  )}
                  {task.status !== 'completed' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => completeTask(task.id)}
                        className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium">
                        Mark Done
                      </button>
                      <a href={`tel:${customer.mobile}`}
                        className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium text-center">
                        Call
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && !loading && (
          <div className="space-y-2">
            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />
                {activities.map(activity => (
                  <div key={activity.id} className="relative flex gap-4 pb-4">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-base z-10 flex-shrink-0 shadow-sm">
                      {activityIcons[activity.activity_type] || '📌'}
                    </div>
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-3 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{activity.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-400">{(activity.performer as unknown as Profile)?.full_name || 'System'}</p>
                        <p className="text-xs text-slate-400">{new Date(activity.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      <Modal
        open={showLoanModal}
        onClose={() => setShowLoanModal(false)}
        title="Add Loan Case"
        footer={
          <button onClick={saveLoan} disabled={saving || !loanForm.loan_type || !loanForm.bank_nbfc}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Loan Case'}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Type *</label>
            <select value={loanForm.loan_type} onChange={e => setLoanForm(f => ({ ...f, loan_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">Select type</option>
              {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bank / NBFC *</label>
            <input type="text" value={loanForm.bank_nbfc} onChange={e => setLoanForm(f => ({ ...f, bank_nbfc: e.target.value }))}
              placeholder="e.g., SBI, HDFC, Bajaj" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Amount</label>
              <input type="number" value={loanForm.loan_amount} onChange={e => setLoanForm(f => ({ ...f, loan_amount: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">EMI Amount</label>
              <input type="number" value={loanForm.emi_amount} onChange={e => setLoanForm(f => ({ ...f, emi_amount: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ROI (%)</label>
              <input type="number" value={loanForm.roi} onChange={e => setLoanForm(f => ({ ...f, roi: e.target.value }))}
                placeholder="0.0" step="0.01" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tenure (months)</label>
              <input type="number" value={loanForm.tenure_months} onChange={e => setLoanForm(f => ({ ...f, tenure_months: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Login Date</label>
            <input type="date" value={loanForm.login_date} onChange={e => setLoanForm(f => ({ ...f, login_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select value={loanForm.status} onChange={e => setLoanForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              {LOAN_STATUSES.map(s => <option key={s} value={s}>{LOAN_STATUS_LABELS[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes" rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
          </div>
        </div>
      </Modal>

      {/* Add Policy Modal */}
      <Modal
        open={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        title="Add Insurance Policy"
        footer={
          <button onClick={savePolicy} disabled={saving || !policyForm.policy_type || !policyForm.insurance_company}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Type *</label>
            <select value={policyForm.policy_type} onChange={e => setPolicyForm(f => ({ ...f, policy_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">Select type</option>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Insurance Company *</label>
            <input type="text" value={policyForm.insurance_company} onChange={e => setPolicyForm(f => ({ ...f, insurance_company: e.target.value }))}
              placeholder="e.g., LIC, HDFC Life, Star Health" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Number</label>
            <input type="text" value={policyForm.policy_number} onChange={e => setPolicyForm(f => ({ ...f, policy_number: e.target.value }))}
              placeholder="Policy number" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Premium Amount</label>
              <input type="number" value={policyForm.premium_amount} onChange={e => setPolicyForm(f => ({ ...f, premium_amount: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sum Assured</label>
              <input type="number" value={policyForm.sum_assured} onChange={e => setPolicyForm(f => ({ ...f, sum_assured: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
              <input type="date" value={policyForm.policy_start_date} onChange={e => setPolicyForm(f => ({ ...f, policy_start_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Renewal Date</label>
              <input type="date" value={policyForm.renewal_date} onChange={e => setPolicyForm(f => ({ ...f, renewal_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nominee Name</label>
            <input type="text" value={policyForm.nominee_name} onChange={e => setPolicyForm(f => ({ ...f, nominee_name: e.target.value }))}
              placeholder="Nominee full name" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button onClick={saveTask} disabled={saving}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Task Type</label>
            <select value={taskForm.task_type} onChange={e => setTaskForm(f => ({ ...f, task_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title</label>
            <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title (optional)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date</label>
            <input type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Task details" rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
          </div>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add Note"
        footer={
          <button onClick={saveNote} disabled={saving || !noteText.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        }
      >
        <div className="space-y-3">
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Write your note..." rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
        </div>
      </Modal>
    </div>
  );
}
