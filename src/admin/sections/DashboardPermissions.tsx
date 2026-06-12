import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Loader2, Info } from 'lucide-react';

interface WidgetPerm { id: string; widget_key: string; role: string; is_visible: boolean; }

const ROLES = ['admin', 'rm', 'operations', 'agent'];
const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-600', rm: 'text-blue-600', operations: 'text-amber-600', agent: 'text-emerald-600',
};
const WIDGETS: { key: string; label: string; description: string }[] = [
  { key: 'kpi_overview',     label: 'KPI Overview',        description: 'Summary cards: revenue, customers, disbursals' },
  { key: 'insurance_month',  label: 'Insurance This Month', description: 'Monthly insurance cases and premiums' },
  { key: 'loans_month',      label: 'Loans This Month',     description: 'Monthly loan disbursals and pipeline' },
  { key: 'renewals_due',     label: 'Renewals Due',         description: 'Upcoming insurance and policy renewals' },
  { key: 'recent_activity',  label: 'Recent Activity',      description: 'Latest actions across the system' },
  { key: 'team_leaderboard', label: 'Team Leaderboard',     description: 'RM performance ranking' },
];

export default function DashboardPermissions() {
  const [perms, setPerms] = useState<WidgetPerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.DASHBOARD_WIDGETS).select('*');
    setPerms((data ?? []) as WidgetPerm[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function getEntry(widgetKey: string, role: string) {
    return perms.find(p => p.widget_key === widgetKey && p.role === role);
  }

  async function toggle(entry: WidgetPerm | undefined, widgetKey: string, role: string) {
    const key = `${widgetKey}-${role}`;
    setSaving(key);
    if (!entry) {
      await supabase.from(T.DASHBOARD_WIDGETS).insert({ widget_key: widgetKey, role, is_visible: false });
    } else {
      await supabase.from(T.DASHBOARD_WIDGETS).update({ is_visible: !entry.is_visible, updated_at: new Date().toISOString() }).eq('id', entry.id);
      setPerms(prev => prev.map(p => p.id === entry.id ? { ...p, is_visible: !p.is_visible } : p));
    }
    setSaving(null);
    if (!entry) load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Control which widgets each role sees on the dashboard</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-amber-500" /> Changes apply immediately
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Widget</th>
              {ROLES.map(r => (
                <th key={r} className={`text-center px-4 py-3 text-xs font-bold uppercase tracking-wide ${ROLE_COLORS[r]}`}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WIDGETS.map(widget => (
              <tr key={widget.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{widget.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{widget.description}</p>
                </td>
                {ROLES.map(role => {
                  const entry = getEntry(widget.key, role);
                  const isVisible = entry?.is_visible ?? true;
                  const key = `${widget.key}-${role}`;
                  const isSaving = saving === key;

                  return (
                    <td key={role} className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(entry, widget.key, role)}
                        disabled={isSaving}
                        className={`w-12 h-6 rounded-full transition-all relative disabled:opacity-50 ${isVisible ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isVisible ? 'right-0.5' : 'left-0.5'}`} />
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin absolute inset-0 m-auto text-white" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-full bg-emerald-500 inline-block" /> Visible</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-full bg-slate-200 inline-block" /> Hidden</span>
      </div>
    </div>
  );
}
