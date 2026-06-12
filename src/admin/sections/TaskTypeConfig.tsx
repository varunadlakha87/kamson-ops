import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';

interface TaskTypeConfig {
  id: string;
  type_key: string;
  label: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

const COLORS = ['slate', 'blue', 'cyan', 'amber', 'orange', 'emerald', 'red', 'violet', 'teal'];
const COLOR_CLASSES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-700',
  cyan: 'bg-cyan-100 text-cyan-700', amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700', emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700', violet: 'bg-violet-100 text-violet-700', teal: 'bg-teal-100 text-teal-700',
};
const ICON_OPTIONS = ['Phone', 'FileText', 'RefreshCw', 'IndianRupee', 'MapPin', 'Send', 'Mail', 'CheckSquare', 'Calendar', 'MessageSquare', 'MoreHorizontal'];

const emptyForm = { type_key: '', label: '', icon: 'CheckSquare', color: 'slate', sort_order: 0 };

export default function TaskTypeConfig() {
  const [types, setTypes] = useState<TaskTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.TASK_TYPES).select('*').order('sort_order');
    setTypes((data ?? []) as TaskTypeConfig[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.label.trim() || !form.type_key.trim()) return;
    setSaving(true);
    if (editing === 'new') {
      await supabase.from(T.TASK_TYPES).insert({ ...form });
    } else {
      await supabase.from(T.TASK_TYPES).update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing!);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this task type?')) return;
    await supabase.from(T.TASK_TYPES).delete().eq('id', id);
    load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.TASK_TYPES).update({ is_active: !val }).eq('id', id);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Task Types</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure available task types — active types appear in the task creation form</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditing('new'); }} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Task Type</p>
          <div className="flex gap-2 flex-wrap">
            <input value={form.type_key} onChange={e => setForm(f => ({ ...f, type_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="type_key (snake_case) *" className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Display Label *" className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving || !form.label.trim() || !form.type_key.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 w-8" />
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Key</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Icon</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No task types</td></tr>
            ) : types.map(t => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                {editing === t.id ? (
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" placeholder="Label *" />
                      <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm">
                        {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm">
                        {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-slate-300"><GripVertical className="w-3.5 h-3.5" /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLOR_CLASSES[t.color] ?? 'bg-slate-100 text-slate-600'}`}>{t.label}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.type_key}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.icon}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(t.id, t.is_active)}>
                        {t.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setForm({ type_key: t.type_key, label: t.label, icon: t.icon, color: t.color, sort_order: t.sort_order }); setEditing(t.id); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
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
