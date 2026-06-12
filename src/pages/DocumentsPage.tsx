import { useEffect, useState, useCallback } from 'react';
import { supabase, T } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  FileText, Upload, Search, Filter, Loader2, Plus,
  Image, X, Download, ChevronDown, ChevronRight, User,
  CreditCard, Shield, FolderOpen
} from 'lucide-react';

const DOC_CATEGORIES = ['kyc', 'loan', 'insurance', 'property', 'other'] as const;
type DocCategory = typeof DOC_CATEGORIES[number];

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string; bg: string }> = {
  kyc:       { label: 'KYC',       color: 'text-blue-700',    bg: 'bg-blue-50' },
  loan:      { label: 'Loan',      color: 'text-amber-700',   bg: 'bg-amber-50' },
  insurance: { label: 'Insurance', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  property:  { label: 'Property',  color: 'text-orange-700',  bg: 'bg-orange-50' },
  other:     { label: 'Other',     color: 'text-slate-600',   bg: 'bg-slate-100' },
};

const DOC_TYPES_BY_CATEGORY: Record<DocCategory, string[]> = {
  kyc:       ['PAN Card', 'Aadhaar Card', 'Passport', 'Voter ID', 'Driving Licence', 'Photo', 'Other'],
  loan:      ['Bank Statement', 'Salary Slip', 'ITR', 'Form 16', 'GST Certificate', 'Business Proof', 'Sanction Letter', 'Agreement', 'Other'],
  insurance: ['Policy Document', 'Premium Receipt', 'Claim Form', 'Medical Report', 'Proposal Form', 'Other'],
  property:  ['Sale Deed', 'Property Tax Receipt', 'Encumbrance Certificate', 'Approved Plan', 'NOC', 'Other'],
  other:     ['Other'],
};

interface DocRow {
  id: string;
  customer_id: string;
  loan_id: string | null;
  policy_id: string | null;
  insurance_case_id: string | null;
  document_name: string;
  document_type: string;
  category: DocCategory;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  customer?: { id: string; full_name: string; mobile: string };
  loan?: { loan_type: string; bank_nbfc: string } | null;
  insurance_case?: { policy_type: string; insurance_partner: string } | null;
}

interface CustomerGroup {
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  docs: DocRow[];
  expanded: boolean;
}

interface LoanOption { id: string; loan_type: string; bank_nbfc: string }
interface InsuranceCaseOption { id: string; policy_type: string; insurance_partner: string }

interface DocumentsPageProps {
  initialAction?: string;
}

const emptyForm = {
  customer_id: '',
  document_name: '',
  document_type: 'PAN Card',
  category: 'kyc' as DocCategory,
  tag_type: 'customer' as 'customer' | 'loan' | 'insurance_case',
  loan_id: '',
  insurance_case_id: '',
  file: null as File | null,
};

export default function DocumentsPage({ initialAction }: DocumentsPageProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | ''>('');
  const [showUploadModal, setShowUploadModal] = useState(initialAction === 'upload');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [customers, setCustomers] = useState<{ id: string; full_name: string; mobile: string }[]>([]);
  const [loanOptions, setLoanOptions] = useState<LoanOption[]>([]);
  const [caseOptions, setCaseOptions] = useState<InsuranceCaseOption[]>([]);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.DOCUMENTS)
        .select('*, customer:core_customers!core_documents_customer_id_fkey(id, full_name, mobile), loan:core_loans!core_documents_loan_id_fkey(loan_type, bank_nbfc), insurance_case:core_insurance_cases!core_documents_insurance_case_id_fkey(policy_type, insurance_partner)')
        .order('created_at', { ascending: false });

      if (categoryFilter) query = query.eq('category', categoryFilter);

      const { data } = await query;
      let results = (data as DocRow[]) ?? [];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(d =>
          d.document_name.toLowerCase().includes(s) ||
          d.document_type.toLowerCase().includes(s) ||
          d.customer?.full_name?.toLowerCase().includes(s) ||
          d.loan?.bank_nbfc?.toLowerCase().includes(s) ||
          d.insurance_case?.insurance_partner?.toLowerCase().includes(s)
        );
      }

      setAllDocs(results);

      // Build grouped view
      const groupMap = new Map<string, CustomerGroup>();
      results.forEach(doc => {
        const cid = doc.customer_id;
        if (!groupMap.has(cid)) {
          groupMap.set(cid, {
            customer_id: cid,
            customer_name: doc.customer?.full_name ?? 'Unknown',
            customer_mobile: doc.customer?.mobile ?? '',
            docs: [],
            expanded: true,
          });
        }
        groupMap.get(cid)!.docs.push(doc);
      });
      setGroups(Array.from(groupMap.values()));
    } catch (err) {
      console.error('Load documents error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    supabase.from(T.CUSTOMERS).select('id, full_name, mobile').order('full_name').then(({ data }) => {
      setCustomers(data ?? []);
    });
  }, []);

  // Load loans and insurance cases when customer is selected
  useEffect(() => {
    if (!form.customer_id) { setLoanOptions([]); setCaseOptions([]); return; }
    Promise.all([
      supabase.from(T.LOANS).select('id, loan_type, bank_nbfc').eq('customer_id', form.customer_id),
      supabase.from(T.INSURANCE_CASES).select('id, policy_type, insurance_partner').eq('customer_id', form.customer_id),
    ]).then(([{ data: loans }, { data: cases }]) => {
      setLoanOptions(loans ?? []);
      setCaseOptions(cases ?? []);
    });
  }, [form.customer_id]);

  // Auto-set doc types when category changes
  useEffect(() => {
    const types = DOC_TYPES_BY_CATEGORY[form.category];
    setForm(f => ({ ...f, document_type: types[0] }));
  }, [form.category]);

  function toggleGroup(cid: string) {
    setGroups(gs => gs.map(g => g.customer_id === cid ? { ...g, expanded: !g.expanded } : g));
  }

  async function handleUpload() {
    if (!form.customer_id || !form.document_name.trim()) return;
    setSaving(true);
    setSaveError('');

    let fileUrl = '';
    let fileSize = 0;
    let mimeType = '';

    if (form.file) {
      const ext = form.file.name.split('.').pop();
      const path = `${form.customer_id}/${Date.now()}.${ext}`;
      setUploadProgress(30);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, form.file, { upsert: false });

      if (!uploadError && uploadData) {
        setUploadProgress(80);
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(uploadData.path);
        fileUrl = urlData.publicUrl;
        fileSize = form.file.size;
        mimeType = form.file.type;
      }
    }

    setUploadProgress(90);

    const { error } = await supabase.from(T.DOCUMENTS).insert({
      customer_id: form.customer_id,
      loan_id: form.tag_type === 'loan' && form.loan_id ? form.loan_id : null,
      insurance_case_id: form.tag_type === 'insurance_case' && form.insurance_case_id ? form.insurance_case_id : null,
      document_name: form.document_name.trim(),
      document_type: form.document_type,
      category: form.category,
      file_url: fileUrl,
      file_size: fileSize,
      mime_type: mimeType,
      uploaded_by: user?.id,
    });

    if (error) {
      setSaveError(error.message);
      setUploadProgress(0);
      setSaving(false);
      return;
    }

    await supabase.from(T.ACTIVITIES).insert({
      customer_id: form.customer_id,
      activity_type: 'document_uploaded',
      description: `Document uploaded: ${form.document_name} (${form.document_type})`,
      performed_by: user?.id,
    });

    setShowUploadModal(false);
    setForm({ ...emptyForm });
    setUploadProgress(0);
    setSaving(false);
    loadDocuments();
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  };

  const totalDocs = allDocs.length;
  const kycCount = allDocs.filter(d => d.category === 'kyc').length;
  const loanCount = allDocs.filter(d => d.category === 'loan').length;
  const insuranceCount = allDocs.filter(d => d.category === 'insurance').length;

  const activeFilterCount = categoryFilter ? 1 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Documents</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(v => v === 'grouped' ? 'list' : 'grouped')}
                className={`p-2.5 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowUploadModal(true); setForm({ ...emptyForm }); setSaveError(''); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
              >
                <Plus className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search docs, customer, bank..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl transition-colors relative ${activeFilterCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">1</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chip */}
      {categoryFilter && (
        <div className="px-4 py-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {CATEGORY_CONFIG[categoryFilter].label}
            <button onClick={() => setCategoryFilter('')}><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: totalDocs, color: 'text-slate-700' },
            { label: 'KYC', value: kycCount, color: 'text-blue-600' },
            { label: 'Loan', value: loanCount, color: 'text-amber-600' },
            { label: 'Insurance', value: insuranceCount, color: 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-center">
              <div className={`text-lg font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-100 mb-2">
              <div className="flex gap-3"><div className="w-12 h-12 bg-slate-100 rounded-xl" /><div className="flex-1"><div className="h-4 bg-slate-100 rounded w-2/3 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div></div>
            </div>
          ))
        ) : allDocs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">No documents yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload customer documents to get started</p>
          </div>
        ) : viewMode === 'grouped' ? (
          // GROUPED VIEW — by customer
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.customer_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Customer header */}
                <button
                  onClick={() => toggleGroup(group.customer_id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{group.customer_name}</p>
                    <p className="text-slate-400 text-xs">{group.customer_mobile} · {group.docs.length} document{group.docs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Category mini-badges */}
                    {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(cat => {
                      const count = group.docs.filter(d => d.category === cat).length;
                      if (count === 0) return null;
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <span key={cat} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label} {count}
                        </span>
                      );
                    })}
                    {group.expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Documents under this customer */}
                {group.expanded && (
                  <div className="border-t border-slate-50">
                    {/* Group by category within customer */}
                    {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map(cat => {
                      const catDocs = group.docs.filter(d => d.category === cat);
                      if (catDocs.length === 0) return null;
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <div key={cat}>
                          <div className={`px-4 py-2 flex items-center gap-2 ${cfg.bg}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                            <span className={`text-[10px] font-bold ${cfg.color}`}>· {catDocs.length}</span>
                          </div>
                          {catDocs.map((doc, idx) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              last={idx === catDocs.length - 1}
                              formatSize={formatSize}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // FLAT LIST VIEW
          <div className="space-y-2">
            {allDocs.map(doc => (
              <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <DocCard doc={doc} formatSize={formatSize} showCustomer />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        open={showUploadModal}
        onClose={() => { setShowUploadModal(false); setSaveError(''); }}
        title="Upload Document"
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button
              onClick={handleUpload}
              disabled={saving || !form.customer_id || !form.document_name.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {saving ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer *</label>
            <select
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value, loan_id: '', insurance_case_id: '' }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
            </select>
          </div>

          {/* Category chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
            <div className="flex flex-wrap gap-2">
              {DOC_CATEGORIES.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${form.category === cat ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-blue-300` : 'bg-slate-100 text-slate-600'}`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Document Type</label>
            <select
              value={form.document_type}
              onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              {DOC_TYPES_BY_CATEGORY[form.category].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Document Name *</label>
            <input
              type="text"
              value={form.document_name}
              onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))}
              placeholder="e.g., PAN Card — Rajesh Kumar"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          {/* Tag to lead (loan/case) — only for non-KYC */}
          {form.customer_id && form.category !== 'kyc' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tag to</label>
              <div className="flex gap-2 mb-3">
                {[
                  { v: 'customer', label: 'Customer only', icon: User },
                  ...(loanOptions.length > 0 ? [{ v: 'loan', label: 'Loan case', icon: CreditCard }] : []),
                  ...(caseOptions.length > 0 ? [{ v: 'insurance_case', label: 'Insurance case', icon: Shield }] : []),
                ].map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    onClick={() => setForm(f => ({ ...f, tag_type: v as typeof form.tag_type }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${form.tag_type === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {form.tag_type === 'loan' && loanOptions.length > 0 && (
                <select
                  value={form.loan_id}
                  onChange={e => setForm(f => ({ ...f, loan_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                >
                  <option value="">Select loan case</option>
                  {loanOptions.map(l => <option key={l.id} value={l.id}>{l.loan_type} — {l.bank_nbfc}</option>)}
                </select>
              )}

              {form.tag_type === 'insurance_case' && caseOptions.length > 0 && (
                <select
                  value={form.insurance_case_id}
                  onChange={e => setForm(f => ({ ...f, insurance_case_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                >
                  <option value="">Select insurance case</option>
                  {caseOptions.map(c => <option key={c.id} value={c.id}>{c.policy_type} — {c.insurance_partner}</option>)}
                </select>
              )}
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">File (optional)</label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-5 h-5 text-slate-300 mb-1.5" />
              <p className="text-xs text-slate-400">{form.file ? form.file.name : 'Tap to upload PDF or photo'}</p>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) setForm(prev => ({ ...prev, file: f })); }}
              />
            </label>
            {form.file && (
              <button
                onClick={() => setForm(f => ({ ...f, file: null }))}
                className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove file
              </button>
            )}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter by Category"
      >
        <div className="space-y-2">
          <button
            onClick={() => { setCategoryFilter(''); setShowFilterModal(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${!categoryFilter ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
          >
            All Categories
          </button>
          {DOC_CATEGORIES.map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => { setCategoryFilter(cat); setShowFilterModal(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${categoryFilter === cat ? `${cfg.bg} ${cfg.color} ring-2 ring-blue-300` : 'bg-slate-50 text-slate-700'}`}
              >
                <span className={`w-2 h-2 rounded-full inline-block ${cfg.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

// Inline document row for grouped view
function DocRow({ doc, last, formatSize }: { doc: DocRow; last: boolean; formatSize: (n: number) => string }) {
  const isImage = doc.mime_type?.startsWith('image/');
  const tagLabel = doc.loan
    ? `${doc.loan.loan_type} · ${doc.loan.bank_nbfc}`
    : doc.insurance_case
    ? `${doc.insurance_case.policy_type} · ${doc.insurance_case.insurance_partner}`
    : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!last ? 'border-b border-slate-50' : ''}`}>
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
        {isImage ? <Image className="w-4 h-4 text-slate-400" /> : <FileText className="w-4 h-4 text-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{doc.document_name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-slate-400">{doc.document_type}</span>
          {tagLabel && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
              {tagLabel}
            </span>
          )}
          {doc.file_size > 0 && <span className="text-[10px] text-slate-400">{formatSize(doc.file_size)}</span>}
        </div>
      </div>
      {doc.file_url ? (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" />
        </a>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-slate-300" />
        </div>
      )}
    </div>
  );
}

// Card for flat list view
function DocCard({ doc, formatSize, showCustomer }: { doc: DocRow; formatSize: (n: number) => string; showCustomer?: boolean }) {
  const isImage = doc.mime_type?.startsWith('image/');
  const cfg = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.other;
  const tagLabel = doc.loan
    ? `${doc.loan.loan_type} · ${doc.loan.bank_nbfc}`
    : doc.insurance_case
    ? `${doc.insurance_case.policy_type} · ${doc.insurance_case.insurance_partner}`
    : null;

  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        {isImage ? <Image className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{doc.document_name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-slate-400">{doc.document_type}</span>
          {tagLabel && <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">{tagLabel}</span>}
          {doc.file_size > 0 && <span className="text-xs text-slate-400">{formatSize(doc.file_size)}</span>}
        </div>
        {showCustomer && doc.customer && (
          <p className="text-xs text-slate-400 mt-0.5">{doc.customer.full_name}</p>
        )}
      </div>
      {doc.file_url && (
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0">
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
