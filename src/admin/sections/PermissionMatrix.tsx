import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { PermissionEntry } from '../../lib/rbac';
import { Loader2, Info } from 'lucide-react';

const ROLES = ['admin', 'rm', 'operations', 'agent'];
const RESOURCES = ['customers', 'loans', 'insurance_cases', 'documents', 'tasks', 'renewals'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'reassign', 'view_sensitive'];
const SCOPES = ['all', 'own_team', 'own', 'none'];

const ACTION_LABELS: Record<string, string> = {
  view: 'View', create: 'Create', edit: 'Edit',
  delete: 'Delete', reassign: 'Reassign', view_sensitive: 'View Sensitive',
};

const SCOPE_COLORS: Record<string, string> = {
  all: 'bg-emerald-100 text-emerald-700',
  own_team: 'bg-blue-100 text-blue-700',
  own: 'bg-amber-100 text-amber-700',
  none: 'bg-slate-100 text-slate-400',
};

export default function PermissionMatrix() {
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState('admin');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.ROLE_PERMISSIONS).select('*');
    setPermissions((data ?? []) as PermissionEntry[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function getEntry(role: string, resource: string, action: string) {
    return permissions.find(p => p.role === role && p.resource === resource && p.action === action);
  }

  async function toggleAllowed(entry: PermissionEntry) {
    const key = `${entry.role}-${entry.resource}-${entry.action}`;
    setSaving(key);
    await supabase.from(T.ROLE_PERMISSIONS).update({
      is_allowed: !entry.is_allowed,
      updated_at: new Date().toISOString(),
    }).eq('id', entry.id);
    setPermissions(prev => prev.map(p => p.id === entry.id ? { ...p, is_allowed: !p.is_allowed } : p));
    setSaving(null);
  }

  async function updateScope(entry: PermissionEntry, scope: string) {
    setSaving(entry.id);
    await supabase.from(T.ROLE_PERMISSIONS).update({
      scope, updated_at: new Date().toISOString(),
    }).eq('id', entry.id);
    setPermissions(prev => prev.map(p => p.id === entry.id ? { ...p, scope: scope as PermissionEntry['scope'] } : p));
    setSaving(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Permission Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure what each role can do — changes apply immediately, no code deploy needed</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          Changes are live immediately
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {ROLES.map(r => (
          <button
            key={r}
            onClick={() => setActiveRole(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeRole === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Matrix table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-36">Resource</th>
              {ACTIONS.map(a => (
                <th key={a} className="text-center px-2 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{ACTION_LABELS[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map(resource => (
              <tr key={resource} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700 capitalize">{resource.replace('_', ' ')}</span>
                </td>
                {ACTIONS.map(action => {
                  const entry = getEntry(activeRole, resource, action);
                  const key = `${activeRole}-${resource}-${action}`;
                  const isSaving = saving === key || saving === entry?.id;

                  if (!entry) {
                    return <td key={action} className="px-2 py-3 text-center"><span className="text-slate-200 text-xs">—</span></td>;
                  }

                  return (
                    <td key={action} className="px-2 py-3">
                      <div className="flex flex-col items-center gap-1">
                        {/* Toggle */}
                        <button
                          onClick={() => toggleAllowed(entry)}
                          disabled={!!isSaving}
                          className={`w-full max-w-[80px] py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                            entry.is_allowed
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-50 text-red-400 hover:bg-red-100'
                          }`}
                        >
                          {isSaving ? '...' : entry.is_allowed ? 'ON' : 'OFF'}
                        </button>
                        {/* Scope */}
                        {entry.is_allowed && (
                          <select
                            value={entry.scope}
                            onChange={e => updateScope(entry, e.target.value)}
                            disabled={!!isSaving}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded border-0 cursor-pointer outline-none ${SCOPE_COLORS[entry.scope]}`}
                          >
                            {SCOPES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold">Scope:</span>
        {SCOPES.map(s => (
          <span key={s} className={`px-2 py-0.5 rounded-full font-medium ${SCOPE_COLORS[s]}`}>{s.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  );
}
