import { useEffect, useState } from 'react';
import { supabase, T } from '../lib/supabase';
import {
  Users, CreditCard, Shield, Building2,
  Plus, Pencil, Trash2, Check, X, Loader2,
  ChevronRight, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface RmUser {
  id: string;
  full_name: string;
  mobile: string;
  email: string;
  designation: string;
  is_active: boolean;
  created_at: string;
}

interface LoanProduct {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface InsuranceProduct {
  id: string;
  name: string;
  partner: string;
  description: string;
  is_active: boolean;
}

interface BankNbfc {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

type Section = 'rm' | 'loans' | 'insurance' | 'banks';

// ── Inline edit row ──────────────────────────────────────────────────────────

interface EditRowProps {
  fields: { key: string; placeholder: string; half?: boolean }[];
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  extraLeft?: React.ReactNode;
}

function EditRow({ fields, values, onChange, onSave, onCancel, saving, extraLeft }: EditRowProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {fields.map(f => (
          <input
            key={f.key}
            type="text"
            value={values[f.key] ?? ''}
            onChange={e => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            className={`px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${f.half ? 'flex-1 min-w-[140px]' : 'w-full'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {extraLeft}
        <div className="flex gap-2 ml-auto">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>('rm');
  const [search, setSearch] = useState('');

  // RM state
  const [rms, setRms] = useState<RmUser[]>([]);
  const [rmLoading, setRmLoading] = useState(true);
  const [rmEdit, setRmEdit] = useState<string | null>(null); // id or 'new'
  const [rmForm, setRmForm] = useState({ full_name: '', mobile: '', email: '', designation: '' });
  const [rmSaving, setRmSaving] = useState(false);

  // Loan products state
  const [loans, setLoans] = useState<LoanProduct[]>([]);
  const [loanLoading, setLoanLoading] = useState(true);
  const [loanEdit, setLoanEdit] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ name: '', description: '' });
  const [loanSaving, setLoanSaving] = useState(false);

  // Insurance products state
  const [insurance, setInsurance] = useState<InsuranceProduct[]>([]);
  const [insLoading, setInsLoading] = useState(true);
  const [insEdit, setInsEdit] = useState<string | null>(null);
  const [insForm, setInsForm] = useState({ name: '', partner: '', description: '' });
  const [insSaving, setInsSaving] = useState(false);

  // Banks state
  const [banks, setBanks] = useState<BankNbfc[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankEdit, setBankEdit] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({ name: '', type: 'bank' });
  const [bankSaving, setBankSaving] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  async function loadRms() {
    setRmLoading(true);
    const { data } = await supabase.from(T.RM_PROFILES).select('*').order('full_name');
    setRms(data ?? []);
    setRmLoading(false);
  }

  async function loadLoans() {
    setLoanLoading(true);
    const { data } = await supabase.from(T.LOAN_PRODUCTS).select('*').order('name');
    setLoans(data ?? []);
    setLoanLoading(false);
  }

  async function loadInsurance() {
    setInsLoading(true);
    const { data } = await supabase.from(T.INSURANCE_PRODUCTS).select('*').order('name');
    setInsurance(data ?? []);
    setInsLoading(false);
  }

  async function loadBanks() {
    setBankLoading(true);
    const { data } = await supabase.from(T.BANKS_NBFC).select('*').order('type').order('name');
    setBanks(data ?? []);
    setBankLoading(false);
  }

  useEffect(() => { loadRms(); loadLoans(); loadInsurance(); loadBanks(); }, []);

  // ── RM handlers ────────────────────────────────────────────────────────────

  function startAddRm() {
    setRmForm({ full_name: '', mobile: '', email: '', designation: '' });
    setRmEdit('new');
  }

  function startEditRm(r: RmUser) {
    setRmForm({ full_name: r.full_name, mobile: r.mobile, email: r.email, designation: r.designation });
    setRmEdit(r.id);
  }

  async function saveRm() {
    if (!rmForm.full_name.trim() || !rmForm.mobile.trim()) return;
    setRmSaving(true);
    if (rmEdit === 'new') {
      await supabase.from(T.RM_PROFILES).insert({ ...rmForm });
    } else {
      await supabase.from(T.RM_PROFILES).update({ ...rmForm, updated_at: new Date().toISOString() }).eq('id', rmEdit!);
    }
    setRmEdit(null);
    setRmSaving(false);
    loadRms();
  }

  async function toggleRm(id: string, val: boolean) {
    await supabase.from(T.RM_PROFILES).update({ is_active: !val }).eq('id', id);
    loadRms();
  }

  async function deleteRm(id: string) {
    if (!confirm('Remove this RM?')) return;
    await supabase.from(T.RM_PROFILES).delete().eq('id', id);
    loadRms();
  }

  // ── Loan product handlers ──────────────────────────────────────────────────

  function startAddLoan() {
    setLoanForm({ name: '', description: '' });
    setLoanEdit('new');
  }

  function startEditLoan(l: LoanProduct) {
    setLoanForm({ name: l.name, description: l.description });
    setLoanEdit(l.id);
  }

  async function saveLoan() {
    if (!loanForm.name.trim()) return;
    setLoanSaving(true);
    if (loanEdit === 'new') {
      await supabase.from(T.LOAN_PRODUCTS).insert({ ...loanForm });
    } else {
      await supabase.from(T.LOAN_PRODUCTS).update({ ...loanForm, updated_at: new Date().toISOString() }).eq('id', loanEdit!);
    }
    setLoanEdit(null);
    setLoanSaving(false);
    loadLoans();
  }

  async function toggleLoan(id: string, val: boolean) {
    await supabase.from(T.LOAN_PRODUCTS).update({ is_active: !val }).eq('id', id);
    loadLoans();
  }

  async function deleteLoan(id: string) {
    if (!confirm('Remove this loan product?')) return;
    await supabase.from(T.LOAN_PRODUCTS).delete().eq('id', id);
    loadLoans();
  }

  // ── Insurance product handlers ─────────────────────────────────────────────

  function startAddIns() {
    setInsForm({ name: '', partner: '', description: '' });
    setInsEdit('new');
  }

  function startEditIns(i: InsuranceProduct) {
    setInsForm({ name: i.name, partner: i.partner, description: i.description });
    setInsEdit(i.id);
  }

  async function saveIns() {
    if (!insForm.name.trim()) return;
    setInsSaving(true);
    if (insEdit === 'new') {
      await supabase.from(T.INSURANCE_PRODUCTS).insert({ ...insForm });
    } else {
      await supabase.from(T.INSURANCE_PRODUCTS).update({ ...insForm, updated_at: new Date().toISOString() }).eq('id', insEdit!);
    }
    setInsEdit(null);
    setInsSaving(false);
    loadInsurance();
  }

  async function toggleIns(id: string, val: boolean) {
    await supabase.from(T.INSURANCE_PRODUCTS).update({ is_active: !val }).eq('id', id);
    loadInsurance();
  }

  async function deleteIns(id: string) {
    if (!confirm('Remove this insurance product?')) return;
    await supabase.from(T.INSURANCE_PRODUCTS).delete().eq('id', id);
    loadInsurance();
  }

  // ── Bank handlers ──────────────────────────────────────────────────────────

  function startAddBank() {
    setBankForm({ name: '', type: 'bank' });
    setBankEdit('new');
  }

  function startEditBank(b: BankNbfc) {
    setBankForm({ name: b.name, type: b.type });
    setBankEdit(b.id);
  }

  async function saveBank() {
    if (!bankForm.name.trim()) return;
    setBankSaving(true);
    if (bankEdit === 'new') {
      await supabase.from(T.BANKS_NBFC).insert({ ...bankForm });
    } else {
      await supabase.from(T.BANKS_NBFC).update({ ...bankForm, updated_at: new Date().toISOString() }).eq('id', bankEdit!);
    }
    setBankEdit(null);
    setBankSaving(false);
    loadBanks();
  }

  async function toggleBank(id: string, val: boolean) {
    await supabase.from(T.BANKS_NBFC).update({ is_active: !val }).eq('id', id);
    loadBanks();
  }

  async function deleteBank(id: string) {
    if (!confirm('Remove this bank/NBFC?')) return;
    await supabase.from(T.BANKS_NBFC).delete().eq('id', id);
    loadBanks();
  }

  // ── Section tab config ─────────────────────────────────────────────────────

  const sections: { id: Section; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'rm',        label: 'RMs',        icon: Users,     count: rms.length },
    { id: 'loans',     label: 'Loan Prods', icon: CreditCard,count: loans.length },
    { id: 'insurance', label: 'Ins. Prods', icon: Shield,    count: insurance.length },
    { id: 'banks',     label: 'Banks',      icon: Building2, count: banks.length },
  ];

  // ── Search helpers ─────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredRms       = rms.filter(r => !q || r.full_name.toLowerCase().includes(q) || r.mobile.includes(q) || r.email.toLowerCase().includes(q));
  const filteredLoans     = loans.filter(l => !q || l.name.toLowerCase().includes(q));
  const filteredInsurance = insurance.filter(i => !q || i.name.toLowerCase().includes(q) || i.partner.toLowerCase().includes(q));
  const filteredBanks     = banks.filter(b => !q || b.name.toLowerCase().includes(q));

  // ── Loading skeleton ───────────────────────────────────────────────────────

  function Skeleton() {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
            <div className="h-3.5 bg-slate-100 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // ── Active badge ───────────────────────────────────────────────────────────

  function ActiveBadge({ active }: { active: boolean }) {
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage RMs, products, and partners</p>
        </div>

        {/* Section tabs */}
        <div className="flex border-t border-slate-100 overflow-x-auto">
          {sections.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSearch(''); }}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 min-w-[70px] gap-0.5 transition-all border-b-2 ${
                  active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{s.count}</span>
                </div>
                <span className="text-[10px] font-semibold">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${sections.find(s => s.id === activeSection)?.label ?? ''}...`}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* ── RM Section ──────────────────────────────────────────────────── */}
        {activeSection === 'rm' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{filteredRms.length} Relationship Managers</p>
              <button
                onClick={startAddRm}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add RM
              </button>
            </div>

            {rmEdit === 'new' && (
              <EditRow
                fields={[
                  { key: 'full_name', placeholder: 'Full Name *', half: true },
                  { key: 'mobile', placeholder: 'Mobile *', half: true },
                  { key: 'email', placeholder: 'Email', half: true },
                  { key: 'designation', placeholder: 'Designation', half: true },
                ]}
                values={rmForm}
                onChange={(k, v) => setRmForm(f => ({ ...f, [k]: v }))}
                onSave={saveRm}
                onCancel={() => setRmEdit(null)}
                saving={rmSaving}
              />
            )}

            {rmLoading ? <Skeleton /> : filteredRms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No RMs found</p>
              </div>
            ) : filteredRms.map(r => (
              <div key={r.id}>
                {rmEdit === r.id ? (
                  <EditRow
                    fields={[
                      { key: 'full_name', placeholder: 'Full Name *', half: true },
                      { key: 'mobile', placeholder: 'Mobile *', half: true },
                      { key: 'email', placeholder: 'Email', half: true },
                      { key: 'designation', placeholder: 'Designation', half: true },
                    ]}
                    values={rmForm}
                    onChange={(k, v) => setRmForm(f => ({ ...f, [k]: v }))}
                    onSave={saveRm}
                    onCancel={() => setRmEdit(null)}
                    saving={rmSaving}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {r.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{r.full_name}</p>
                          <ActiveBadge active={r.is_active} />
                        </div>
                        {r.designation && <p className="text-xs text-slate-500 mt-0.5">{r.designation}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{r.mobile}{r.email ? ` · ${r.email}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleRm(r.id, r.is_active)} className="p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                          {r.is_active
                            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                            : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                        </button>
                        <button onClick={() => startEditRm(r)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                          <Pencil className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => deleteRm(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Loan Products Section ────────────────────────────────────────── */}
        {activeSection === 'loans' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{filteredLoans.length} Loan Products</p>
              <button
                onClick={startAddLoan}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            {loanEdit === 'new' && (
              <EditRow
                fields={[
                  { key: 'name', placeholder: 'Product Name *' },
                  { key: 'description', placeholder: 'Description (optional)' },
                ]}
                values={loanForm}
                onChange={(k, v) => setLoanForm(f => ({ ...f, [k]: v }))}
                onSave={saveLoan}
                onCancel={() => setLoanEdit(null)}
                saving={loanSaving}
              />
            )}

            {loanLoading ? <Skeleton /> : filteredLoans.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No loan products found</p>
              </div>
            ) : filteredLoans.map(l => (
              <div key={l.id}>
                {loanEdit === l.id ? (
                  <EditRow
                    fields={[
                      { key: 'name', placeholder: 'Product Name *' },
                      { key: 'description', placeholder: 'Description (optional)' },
                    ]}
                    values={loanForm}
                    onChange={(k, v) => setLoanForm(f => ({ ...f, [k]: v }))}
                    onSave={saveLoan}
                    onCancel={() => setLoanEdit(null)}
                    saving={loanSaving}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4.5 h-4.5 text-blue-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 text-sm">{l.name}</p>
                          <ActiveBadge active={l.is_active} />
                        </div>
                        {l.description && <p className="text-xs text-slate-400 mt-0.5">{l.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleLoan(l.id, l.is_active)} className="p-1.5 rounded-lg hover:bg-slate-50">
                          {l.is_active
                            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                            : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                        </button>
                        <button onClick={() => startEditLoan(l)} className="p-1.5 rounded-lg hover:bg-blue-50">
                          <Pencil className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => deleteLoan(l.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Insurance Products Section ───────────────────────────────────── */}
        {activeSection === 'insurance' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{filteredInsurance.length} Insurance Products</p>
              <button
                onClick={startAddIns}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            {insEdit === 'new' && (
              <EditRow
                fields={[
                  { key: 'name', placeholder: 'Product Name *', half: true },
                  { key: 'partner', placeholder: 'Partner/Company', half: true },
                  { key: 'description', placeholder: 'Description (optional)' },
                ]}
                values={insForm}
                onChange={(k, v) => setInsForm(f => ({ ...f, [k]: v }))}
                onSave={saveIns}
                onCancel={() => setInsEdit(null)}
                saving={insSaving}
              />
            )}

            {/* Group by product name */}
            {insLoading ? <Skeleton /> : (() => {
              const grouped: Record<string, InsuranceProduct[]> = {};
              filteredInsurance.forEach(i => {
                if (!grouped[i.name]) grouped[i.name] = [];
                grouped[i.name].push(i);
              });

              return Object.entries(grouped).map(([name, items]) => (
                <div key={name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{name}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{items.length} partner{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {items.map((ins, idx) => (
                    <div key={ins.id}>
                      {insEdit === ins.id ? (
                        <div className="p-3">
                          <EditRow
                            fields={[
                              { key: 'name', placeholder: 'Product Name *', half: true },
                              { key: 'partner', placeholder: 'Partner/Company', half: true },
                              { key: 'description', placeholder: 'Description (optional)' },
                            ]}
                            values={insForm}
                            onChange={(k, v) => setInsForm(f => ({ ...f, [k]: v }))}
                            onSave={saveIns}
                            onCancel={() => setInsEdit(null)}
                            saving={insSaving}
                          />
                        </div>
                      ) : (
                        <div className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? 'border-b border-slate-50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-700">{ins.partner || '—'}</p>
                              <ActiveBadge active={ins.is_active} />
                            </div>
                            {ins.description && <p className="text-xs text-slate-400 mt-0.5">{ins.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => toggleIns(ins.id, ins.is_active)} className="p-1.5 rounded-lg hover:bg-slate-50">
                              {ins.is_active
                                ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                            </button>
                            <button onClick={() => startEditIns(ins)} className="p-1.5 rounded-lg hover:bg-blue-50">
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </button>
                            <button onClick={() => deleteIns(ins.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ));
            })()}

            {!insLoading && filteredInsurance.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No insurance products found</p>
              </div>
            )}
          </div>
        )}

        {/* ── Banks & NBFC Section ─────────────────────────────────────────── */}
        {activeSection === 'banks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{filteredBanks.length} Banks & NBFCs</p>
              <button
                onClick={startAddBank}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {bankEdit === 'new' && (
              <EditRow
                fields={[{ key: 'name', placeholder: 'Bank / NBFC Name *', half: true }]}
                values={bankForm}
                onChange={(k, v) => setBankForm(f => ({ ...f, [k]: v }))}
                onSave={saveBank}
                onCancel={() => setBankEdit(null)}
                saving={bankSaving}
                extraLeft={
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white text-sm">
                    {['bank', 'nbfc'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBankForm(f => ({ ...f, type: t }))}
                        className={`px-4 py-2 font-medium capitalize transition-colors ${bankForm.type === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                }
              />
            )}

            {bankLoading ? <Skeleton /> : (() => {
              const bankOnly = filteredBanks.filter(b => b.type === 'bank');
              const nbfcOnly = filteredBanks.filter(b => b.type === 'nbfc');

              return (
                <div className="space-y-4">
                  {[{ label: 'Banks', items: bankOnly, color: 'bg-blue-50 text-blue-700' }, { label: 'NBFCs', items: nbfcOnly, color: 'bg-amber-50 text-amber-700' }].map(group => (
                    group.items.length > 0 && (
                      <div key={group.label}>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{group.label}</p>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          {group.items.map((b, idx) => (
                            <div key={b.id}>
                              {bankEdit === b.id ? (
                                <div className="p-3">
                                  <EditRow
                                    fields={[{ key: 'name', placeholder: 'Name *', half: true }]}
                                    values={bankForm}
                                    onChange={(k, v) => setBankForm(f => ({ ...f, [k]: v }))}
                                    onSave={saveBank}
                                    onCancel={() => setBankEdit(null)}
                                    saving={bankSaving}
                                    extraLeft={
                                      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white text-sm">
                                        {['bank', 'nbfc'].map(t => (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => setBankForm(f => ({ ...f, type: t }))}
                                            className={`px-4 py-2 font-medium capitalize transition-colors ${bankForm.type === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                          >
                                            {t.toUpperCase()}
                                          </button>
                                        ))}
                                      </div>
                                    }
                                  />
                                </div>
                              ) : (
                                <div className={`flex items-center gap-3 px-4 py-3 ${idx < group.items.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${group.color} flex-shrink-0`}>
                                    {b.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-800">{b.name}</p>
                                      <ActiveBadge active={b.is_active} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => toggleBank(b.id, b.is_active)} className="p-1.5 rounded-lg hover:bg-slate-50">
                                      {b.is_active
                                        ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                                        : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                                    </button>
                                    <button onClick={() => startEditBank(b)} className="p-1.5 rounded-lg hover:bg-blue-50">
                                      <Pencil className="w-4 h-4 text-blue-500" />
                                    </button>
                                    <button onClick={() => deleteBank(b.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  {filteredBanks.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No banks/NBFCs found</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Summary cards at bottom */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSearch(''); }}
                className={`bg-white rounded-2xl border p-4 text-left transition-all ${activeSection === s.id ? 'border-blue-300 shadow-md' : 'border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSection === s.id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Icon className={`w-4 h-4 ${activeSection === s.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-lg font-bold text-slate-800">{s.count}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
