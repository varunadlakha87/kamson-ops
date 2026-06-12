import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Pencil, Check, X, Loader2, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';

interface RenewalRule {
  id: string;
  rule_name: string;
  renewal_type: string;
  alert_days_before: number[];
  is_active: boolean;
}

const RENEWAL_TYPES = ['insurance', 'emi', 'fd_maturity', 'policy_expiry'];

export default function RenewalRules() {
  const [rules, setRules] = useState<RenewalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ rule_name: '', renewal_type: 'insurance', alert_days_before: '30,15,7,1' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.RENEWAL_RULES).select('*').order('renewal_type');
    setRules((data ?? []) as RenewalRule[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function parseDays(s: string): number[] {
    return s.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0).sort((a, b) => b - a);
  }

  async function save() {
    if (!form.rule_name.trim()) return;
    setSaving(true);
    const days = parseDays(form.alert_days_before);
    const payload = { rule_name: form.rule_name, renewal_type: form.renewal_type, alert_days_before: days, updated_at: new Date().toISOString() };
    if (editing === 'new') {
      await supabase.from(T.RENEWAL_RULES).insert(payload);
    } else {
      await supabase.from(T.RENEWAL_RULES).update(payload).eq('id', editing!);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function toggle(id: string, val: boolean) {
    await supabase.from(T.RENEWAL_RULES).update({ is_active: !val }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this renewal rule?')) return;
    await supabase.from(T.RENEWAL_RULES).delete().eq('id', id);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Renewal Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure alert timing (days before due date) for each renewal type</p>
        </div>
        <button onClick={() => { setForm({ rule_name: '', renewal_type: 'insurance', alert_days_before: '30,15,7,1' }); setEditing('new'); }} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Renewal Rule</p>
          <div className="flex gap-3 flex-wrap">
            <input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} placeholder="Rule name *" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <select value={form.renewal_type} onChange={e => setForm(f => ({ ...f, renewal_type: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {RENEWAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alert Days Before (comma-separated)</label>
            <input value={form.alert_days_before} onChange={e => setForm(f => ({ ...f, alert_days_before: e.target.value }))} placeholder="e.g. 30,15,7,1" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
            <p className="text-xs text-slate-400 mt-1">Preview: {parseDays(form.alert_days_before).map(d => <span key={d} className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1">{d}d</span>)}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving || !form.rule_name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-slate-400">Loading...</div>
        ) : rules.map(rule => (
          <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            {editing === rule.id ? (
              <div className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                  <select value={form.renewal_type} onChange={e => setForm(f => ({ ...f, renewal_type: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
                    {RENEWAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <input value={form.alert_days_before} onChange={e => setForm(f => ({ ...f, alert_days_before: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono" placeholder="Alert days comma-separated" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
                  <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-60">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-800 text-sm">{rule.rule_name}</p>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full capitalize">{rule.renewal_type.replace('_', ' ')}</span>
                    {!rule.is_active && <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alerts at:</span>
                    {rule.alert_days_before?.map(d => (
                      <span key={d} className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{d}d before</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(rule.id, rule.is_active)}>
                    {rule.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                  </button>
                  <button onClick={() => { setForm({ rule_name: rule.rule_name, renewal_type: rule.renewal_type, alert_days_before: rule.alert_days_before?.join(', ') ?? '' }); setEditing(rule.id); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
