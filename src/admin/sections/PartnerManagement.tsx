import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import {
  UserCircle, CreditCard, Shield, Building2,
  Plus, Pencil, Trash2, Check, X, Loader2,
  Search, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

const SECTION_META = {
  rms:                { icon: UserCircle, label: 'Relationship Managers', description: 'Manage RM profiles used in insurance cases.' },
  loan_products:      { icon: CreditCard, label: 'Loan Products',         description: 'Configure loan product types available in the CRM.' },
  insurance_products: { icon: Shield,     label: 'Insurance Products',    description: 'Manage insurance product catalogue and partners.' },
  banks:              { icon: Building2,  label: 'Banks / NBFCs',         description: 'Add or update bank and NBFC partner details.' },
} as const;

type SectionKey = keyof typeof SECTION_META;

// ── Shared helpers ────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
          <div className="h-3.5 bg-slate-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-1/5" />
        </div>
      ))}
    </div>
  );
}

// ── RM Section ────────────────────────────────────────────────────────────────

function RmSection({ search }: { search: string }) {
  const [items, setItems] = useState<RmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', mobile: '', email: '', designation: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.RM_PROFILES).select('*').order('full_name');
    setItems((data ?? []) as RmUser[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setForm({ full_name: '', mobile: '', email: '', designation: '' }); setEditing('new'); setErr(''); }
  function startEdit(r: RmUser) { setForm({ full_name: r.full_name, mobile: r.mobile, email: r.email || '', designation: r.designation || '' }); setEditing(r.id); setErr(''); }

  async function save() {
    if (!form.full_name.trim() || !form.mobile.trim()) { setErr('Name and mobile are required'); return; }
    setSaving(true); setErr('');
    const payload = { ...form };
    let error;
    if (editing === 'new') {
      ({ error } = await supabase.from(T.RM_PROFILES).insert(payload));
    } else {
      ({ error } = await supabase.from(T.RM_PROFILES).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing!));
    }
    if (error) { setErr(error.message); setSaving(false); return; }
    setSaving(false); setEditing(null); load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.RM_PROFILES).update({ is_active: !val }).eq('id', id);
    load();
  }

  async function del(id: string) {
    if (!confirm('Remove this RM? This cannot be undone.')) return;
    await supabase.from(T.RM_PROFILES).delete().eq('id', id);
    load();
  }

  const q = search.toLowerCase();
  const filtered = items.filter(r => !q || r.full_name?.toLowerCase().includes(q) || r.mobile?.includes(q) || r.email?.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filtered.length} relationship manager{filtered.length !== 1 ? 's' : ''}</p>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add RM
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Relationship Manager</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full Name *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="Mobile *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Designation" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <UserCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No RMs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Designation</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Mobile</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  {editing === r.id ? (
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full Name *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="Mobile *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Designation" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                      </div>
                      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"><X className="w-3 h-3" /> Cancel</button>
                        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {r.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.designation || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{r.mobile}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.email || '—'}</td>
                      <td className="px-4 py-3"><ActiveBadge active={r.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => toggle(r.id, r.is_active)} title={r.is_active ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                            {r.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                          </button>
                          <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4 text-blue-500" /></button>
                          <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Loan Products Section ─────────────────────────────────────────────────────

function LoanProductsSection({ search }: { search: string }) {
  const [items, setItems] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.LOAN_PRODUCTS).select('*').order('name');
    setItems((data ?? []) as LoanProduct[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setForm({ name: '', description: '' }); setEditing('new'); setErr(''); }
  function startEdit(l: LoanProduct) { setForm({ name: l.name, description: l.description || '' }); setEditing(l.id); setErr(''); }

  async function save() {
    if (!form.name.trim()) { setErr('Product name is required'); return; }
    setSaving(true); setErr('');
    let error;
    if (editing === 'new') {
      ({ error } = await supabase.from(T.LOAN_PRODUCTS).insert({ ...form }));
    } else {
      ({ error } = await supabase.from(T.LOAN_PRODUCTS).update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing!));
    }
    if (error) { setErr(error.message); setSaving(false); return; }
    setSaving(false); setEditing(null); load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.LOAN_PRODUCTS).update({ is_active: !val }).eq('id', id);
    load();
  }

  async function del(id: string) {
    if (!confirm('Remove this loan product?')) return;
    await supabase.from(T.LOAN_PRODUCTS).delete().eq('id', id);
    load();
  }

  const q = search.toLowerCase();
  const filtered = items.filter(l => !q || l.name?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filtered.length} loan product{filtered.length !== 1 ? 's' : ''}</p>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Loan Product</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Name *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No loan products found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Product Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  {editing === l.id ? (
                    <td colSpan={4} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Name *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                      </div>
                      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"><X className="w-3 h-3" /> Cancel</button>
                        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-semibold text-slate-800">{l.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{l.description || '—'}</td>
                      <td className="px-4 py-3"><ActiveBadge active={l.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => toggle(l.id, l.is_active)} className="p-1.5 rounded-lg hover:bg-slate-100">
                            {l.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                          </button>
                          <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg hover:bg-blue-50"><Pencil className="w-4 h-4 text-blue-500" /></button>
                          <button onClick={() => del(l.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Insurance Products Section ────────────────────────────────────────────────

function InsuranceProductsSection({ search }: { search: string }) {
  const [items, setItems] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', partner: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.INSURANCE_PRODUCTS).select('*').order('name');
    setItems((data ?? []) as InsuranceProduct[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setForm({ name: '', partner: '', description: '' }); setEditing('new'); setErr(''); }
  function startEdit(i: InsuranceProduct) { setForm({ name: i.name, partner: i.partner || '', description: i.description || '' }); setEditing(i.id); setErr(''); }

  async function save() {
    if (!form.name.trim()) { setErr('Product name is required'); return; }
    setSaving(true); setErr('');
    let error;
    if (editing === 'new') {
      ({ error } = await supabase.from(T.INSURANCE_PRODUCTS).insert({ ...form }));
    } else {
      ({ error } = await supabase.from(T.INSURANCE_PRODUCTS).update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing!));
    }
    if (error) { setErr(error.message); setSaving(false); return; }
    setSaving(false); setEditing(null); load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.INSURANCE_PRODUCTS).update({ is_active: !val }).eq('id', id);
    load();
  }

  async function del(id: string) {
    if (!confirm('Remove this insurance product?')) return;
    await supabase.from(T.INSURANCE_PRODUCTS).delete().eq('id', id);
    load();
  }

  const q = search.toLowerCase();
  const filtered = items.filter(i => !q || i.name?.toLowerCase().includes(q) || i.partner?.toLowerCase().includes(q));

  // Group by product name
  const grouped: Record<string, InsuranceProduct[]> = {};
  filtered.forEach(i => { if (!grouped[i.name]) grouped[i.name] = []; grouped[i.name].push(i); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filtered.length} insurance product{filtered.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} type{Object.keys(grouped).length !== 1 ? 's' : ''}</p>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Insurance Product</p>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Type *  (e.g. Motor)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.partner} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))} placeholder="Partner / Company" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No insurance products found</p>
        </div>
      ) : Object.entries(grouped).map(([name, ins]) => (
        <div key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">{name}</span>
            <span className="ml-auto text-[10px] text-slate-400">{ins.length} partner{ins.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {ins.map(item => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  {editing === item.id ? (
                    <td colSpan={4} className="px-4 py-3">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Type *" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.partner} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))} placeholder="Partner / Company" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                      </div>
                      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"><X className="w-3 h-3" /> Cancel</button>
                        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.partner || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.description || ''}</td>
                      <td className="px-4 py-3"><ActiveBadge active={item.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => toggle(item.id, item.is_active)} className="p-1.5 rounded-lg hover:bg-slate-100">
                            {item.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                          </button>
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50"><Pencil className="w-4 h-4 text-blue-500" /></button>
                          <button onClick={() => del(item.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── Banks & NBFCs Section ─────────────────────────────────────────────────────

function BanksSection({ search }: { search: string }) {
  const [items, setItems] = useState<BankNbfc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'bank' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.BANKS_NBFC).select('*').order('type').order('name');
    setItems((data ?? []) as BankNbfc[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setForm({ name: '', type: 'bank' }); setEditing('new'); setErr(''); }
  function startEdit(b: BankNbfc) { setForm({ name: b.name, type: b.type }); setEditing(b.id); setErr(''); }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    let error;
    if (editing === 'new') {
      ({ error } = await supabase.from(T.BANKS_NBFC).insert({ ...form }));
    } else {
      ({ error } = await supabase.from(T.BANKS_NBFC).update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing!));
    }
    if (error) { setErr(error.message); setSaving(false); return; }
    setSaving(false); setEditing(null); load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.BANKS_NBFC).update({ is_active: !val }).eq('id', id);
    load();
  }

  async function del(id: string) {
    if (!confirm('Remove this bank/NBFC?')) return;
    await supabase.from(T.BANKS_NBFC).delete().eq('id', id);
    load();
  }

  const q = search.toLowerCase();
  const filtered = items.filter(b => !q || b.name?.toLowerCase().includes(q));
  const banks = filtered.filter(b => b.type === 'bank');
  const nbfcs = filtered.filter(b => b.type === 'nbfc');

  function TypeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white text-sm self-start">
        {['bank', 'nbfc'].map(t => (
          <button key={t} type="button" onClick={() => onChange(t)}
            className={`px-4 py-2 font-medium uppercase transition-colors ${value === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>
    );
  }

  function BankTable({ group, color }: { group: BankNbfc[]; color: string }) {
    if (group.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {group.map(b => (
              <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                {editing === b.id ? (
                  <td colSpan={3} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                      <TypeToggle value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} />
                    </div>
                    {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"><X className="w-3 h-3" /> Cancel</button>
                      <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
                          {b.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ActiveBadge active={b.is_active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggle(b.id, b.is_active)} className="p-1.5 rounded-lg hover:bg-slate-100">
                          {b.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                        </button>
                        <button onClick={() => startEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50"><Pencil className="w-4 h-4 text-blue-500" /></button>
                        <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{filtered.length} bank{filtered.length !== 1 ? 's' : ''} & NBFC{filtered.length !== 1 ? 's' : ''}</p>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Bank / NBFC</p>
          <div className="flex items-center gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <TypeToggle value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {loading ? <Skeleton /> : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No banks or NBFCs found</p>
        </div>
      ) : (
        <div className="space-y-5">
          {banks.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Banks ({banks.length})</p>
              <BankTable group={banks} color="bg-blue-100 text-blue-700" />
            </div>
          )}
          {nbfcs.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">NBFCs ({nbfcs.length})</p>
              <BankTable group={nbfcs} color="bg-amber-100 text-amber-700" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function PartnerManagement({ section = 'rms' }: { section?: SectionKey }) {
  const [search, setSearch] = useState('');
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{meta.label}</h2>
          </div>
          <p className="text-xs text-slate-500">{meta.description}</p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}...`}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Section content */}
      {section === 'rms'                && <RmSection search={search} />}
      {section === 'loan_products'      && <LoanProductsSection search={search} />}
      {section === 'insurance_products' && <InsuranceProductsSection search={search} />}
      {section === 'banks'              && <BanksSection search={search} />}
    </div>
  );
}
