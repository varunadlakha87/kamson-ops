import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface StatusConfig {
  id: string;
  resource_type: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_terminal: boolean;
}

const RESOURCE_TYPES = ['loan', 'insurance_case', 'customer', 'task'];
const COLORS = ['slate', 'blue', 'cyan', 'amber', 'orange', 'emerald', 'red', 'violet', 'teal'];
const COLOR_CLASSES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-700',
  cyan: 'bg-cyan-100 text-cyan-700', amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700', emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700', violet: 'bg-violet-100 text-violet-700', teal: 'bg-teal-100 text-teal-700',
};

const emptyForm = { resource_type: 'loan', status_key: '', label: '', color: 'slate', sort_order: 0, is_active: true, is_terminal: false };

export default function StatusManagement() {
  const [configs, setConfigs] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('loan');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.STATUSES).select('*').order('resource_type').order('sort_order');
    setConfigs((data ?? []) as StatusConfig[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startAdd() {
    setForm({ ...emptyForm, resource_type: activeType });
    setEditing('new');
  }

  function startEdit(s: StatusConfig) {
    setForm({ resource_type: s.resource_type, status_key: s.status_key, label: s.label, color: s.color, sort_order: s.sort_order, is_active: s.is_active, is_terminal: s.is_terminal });
    setEditing(s.id);
  }

  async function save() {
    if (!form.label.trim() || !form.status_key.trim()) return;
    setSaving(true);
    if (editing === 'new') {
      await supabase.from(T.STATUSES).insert({ ...form });
    } else {
      await supabase.from(T.STATUSES).update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing!);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this status? This may break existing records using this status.')) return;
    await supabase.from(T.STATUSES).delete().eq('id', id);
    load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.STATUSES).update({ is_active: !val }).eq('id', id);
    load();
  }

  const filtered = configs.filter(c => c.resource_type === activeType);

  function FormRow({ inline = false }: { inline?: boolean }) {
    return (
      <div className={`${inline ? '' : 'bg-blue-50 border border-blue-200 rounded-2xl'} p-4 space-y-3`}>
        {!inline && <p className="text-sm font-bold text-blue-800">New Status</p>}
        <div className="flex gap-2 flex-wrap">
          <input value={form.status_key} onChange={e => setForm(f => ({ ...f, status_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="status_key (snake_case) *" className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Display Label *" className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} placeholder="Order" className="w-20 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.is_terminal} onChange={e => setForm(f => ({ ...f, is_terminal: e.target.checked }))} className="rounded" />
            Terminal (end state)
          </label>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving || !form.label.trim() || !form.status_key.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Status Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure statuses for each resource type — no code deploy needed</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Status
        </button>
      </div>

      {/* Resource type tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {RESOURCE_TYPES.map(r => (
          <button key={r} onClick={() => setActiveType(r)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeType === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {r.replace('_', ' ')}
          </button>
        ))}
      </div>

      {editing === 'new' && <FormRow />}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">#</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Key</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Label</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Flags</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No statuses for this type</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                {editing === s.id ? (
                  <td colSpan={6} className="px-4 py-3"><FormRow inline /></td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{s.sort_order}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.status_key}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLOR_CLASSES[s.color] ?? 'bg-slate-100 text-slate-600'}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.is_terminal && <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full font-bold">TERMINAL</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(s.id, s.is_active)}>
                        {s.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
