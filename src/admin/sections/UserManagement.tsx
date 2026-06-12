import { useEffect, useState } from 'react';
import { supabase, T, Profile, UserRole } from '../../lib/supabase';
import { Plus, Pencil, Check, X, Loader2, Search, ToggleLeft, ToggleRight, UserCircle } from 'lucide-react';

const ROLES: UserRole[] = ['admin', 'rm', 'operations', 'agent'];
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  rm: 'bg-blue-100 text-blue-700',
  operations: 'bg-amber-100 text-amber-700',
  agent: 'bg-emerald-100 text-emerald-700',
};

interface ExtendedProfile extends Profile {
  employee_id?: string;
  designation?: string;
  reports_to?: string;
  joined_at?: string;
}

const emptyForm = {
  full_name: '', mobile: '', role: 'rm' as UserRole,
  employee_id: '', designation: '', is_active: true,
};

export default function UserManagement() {
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(T.USERS).select('*').order('full_name');
    setUsers((data ?? []) as ExtendedProfile[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startAdd() {
    setForm({ ...emptyForm });
    setEditing('new');
    setSaveError('');
  }

  function startEdit(u: ExtendedProfile) {
    setForm({
      full_name: u.full_name,
      mobile: u.mobile,
      role: u.role,
      employee_id: u.employee_id ?? '',
      designation: u.designation ?? '',
      is_active: u.is_active,
    });
    setEditing(u.id);
    setSaveError('');
  }

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    setSaveError('');
    if (editing === 'new') {
      // profiles.id is a PK that normally references auth.users.
      // Since this app uses mock auth, we generate a UUID client-side.
      const newId = crypto.randomUUID();
      const { error } = await supabase.from(T.USERS).insert({
        id: newId,
        full_name: form.full_name,
        mobile: form.mobile,
        role: form.role,
        employee_id: form.employee_id,
        designation: form.designation,
        is_active: form.is_active,
        avatar_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) { setSaveError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from(T.USERS).update({
        full_name: form.full_name,
        mobile: form.mobile,
        role: form.role,
        employee_id: form.employee_id,
        designation: form.designation,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editing!);
      if (error) { setSaveError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from(T.USERS).update({ is_active: !current }).eq('id', id);
    load();
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.mobile.includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<string, number>);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage system users and their roles</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3">
        {ROLES.map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(roleFilter === r ? '' : r)}
            className={`bg-white rounded-xl border p-3 text-left transition-all ${roleFilter === r ? 'border-blue-400 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <p className="text-xl font-bold text-slate-800">{roleCounts[r] ?? 0}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[r]}`}>{r}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      {/* Add form */}
      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-bold text-blue-800">New User</p>
          <div className="grid grid-cols-3 gap-3">
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full Name *" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="Mobile" className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} placeholder="Employee ID" className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Designation" className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
          {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} disabled={saving || !form.full_name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Designation</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Mobile</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  {editing === u.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm" placeholder="Full Name *" />
                        <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm" placeholder="Mobile" />
                        <input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm" placeholder="Employee ID" />
                        <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm" placeholder="Designation" />
                      </div>
                      {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.full_name}</p>
                        {(u as ExtendedProfile).employee_id && <p className="text-xs text-slate-400">{(u as ExtendedProfile).employee_id}</p>}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing === u.id ? (
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm">
                      {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{(u as ExtendedProfile).designation || '—'}</td>
                <td className="px-4 py-3 text-slate-600 text-xs font-mono">{u.mobile || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u.id, u.is_active)} className="flex items-center gap-1.5">
                    {u.is_active
                      ? <><ToggleRight className="w-5 h-5 text-emerald-500" /><span className="text-xs text-emerald-600">Active</span></>
                      : <><ToggleLeft className="w-5 h-5 text-slate-300" /><span className="text-xs text-slate-400">Inactive</span></>}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {editing === u.id ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <p className="text-xs text-slate-400 text-right">{filtered.length} of {users.length} users shown</p>
      )}
    </div>
  );
}
