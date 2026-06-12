import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Loader2, Info, Eye, EyeOff, Download, Lock } from 'lucide-react';

interface DocPerm {
  id: string;
  document_type: string;
  role: string;
  can_view: boolean;
  can_download: boolean;
  is_masked: boolean;
  mask_pattern: string;
}

const ROLES = ['admin', 'rm', 'operations', 'agent'];
const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-600', rm: 'text-blue-600', operations: 'text-amber-600', agent: 'text-emerald-600',
};

const DOC_TYPES = [
  'PAN Card', 'Aadhaar Card', 'Passport', 'Voter ID',
  'Bank Statement', 'Salary Slip', 'ITR', 'Property Document', 'Other',
];

export default function DocumentPermissions() {
  const [perms, setPerms] = useState<DocPerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.DOC_PERMISSIONS).select('*');
    setPerms((data ?? []) as DocPerm[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function getEntry(docType: string, role: string) {
    return perms.find(p => p.document_type === docType && p.role === role);
  }

  async function toggle(entry: DocPerm | undefined, docType: string, role: string, field: 'can_view' | 'can_download' | 'is_masked') {
    const key = `${docType}-${role}-${field}`;
    setSaving(key);

    if (!entry) {
      // Create a new row
      const newRow: Omit<DocPerm, 'id'> = {
        document_type: docType, role,
        can_view: true, can_download: true, is_masked: false, mask_pattern: '',
        [field]: field === 'can_view' ? true : (field === 'can_download' ? false : true),
      };
      await supabase.from(T.DOC_PERMISSIONS).insert(newRow);
    } else {
      const newVal = !entry[field];
      await supabase.from(T.DOC_PERMISSIONS).update({
        [field]: newVal,
        updated_at: new Date().toISOString(),
      }).eq('id', entry.id);
      setPerms(prev => prev.map(p => p.id === entry.id ? { ...p, [field]: newVal } : p));
    }

    setSaving(null);
    if (!entry) load();
  }

  function ToggleCell({ entry, docType, role, field, icon: Icon, activeColor }: {
    entry: DocPerm | undefined; docType: string; role: string;
    field: 'can_view' | 'can_download' | 'is_masked';
    icon: React.ElementType; activeColor: string;
  }) {
    const key = `${docType}-${role}-${field}`;
    const isActive = entry?.[field] ?? false;
    const isSaving = saving === key;

    return (
      <button
        onClick={() => toggle(entry, docType, role, field)}
        disabled={isSaving}
        title={field.replace('_', ' ')}
        className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${isActive ? `${activeColor} bg-opacity-10` : 'text-slate-200 hover:text-slate-400'}`}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      </button>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Document Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Control visibility, download, and masking of sensitive documents per role</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-amber-500" />
          Changes apply immediately
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500 bg-white rounded-xl border border-slate-100 px-4 py-2.5">
        <span className="font-semibold text-slate-600">Icons:</span>
        <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-blue-500" /> Can View</span>
        <span className="flex items-center gap-1.5"><Download className="w-4 h-4 text-emerald-500" /> Can Download</span>
        <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-amber-500" /> Masked</span>
        <span className="text-slate-300">Active = colored, Inactive = grey</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Document Type</th>
              {ROLES.map(role => (
                <th key={role} className={`text-center px-3 py-3 text-xs font-bold uppercase tracking-wide ${ROLE_COLORS[role]}`}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOC_TYPES.map(docType => (
              <tr key={docType} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{docType}</span>
                </td>
                {ROLES.map(role => {
                  const entry = getEntry(docType, role);
                  return (
                    <td key={role} className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <ToggleCell entry={entry} docType={docType} role={role} field="can_view" icon={Eye} activeColor="text-blue-600" />
                        <ToggleCell entry={entry} docType={docType} role={role} field="can_download" icon={Download} activeColor="text-emerald-600" />
                        <ToggleCell entry={entry} docType={docType} role={role} field="is_masked" icon={Lock} activeColor="text-amber-600" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
