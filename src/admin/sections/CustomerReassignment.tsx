import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logAuditEvent } from '../../lib/auditLogger';
import { Search, ArrowRight, Loader2, Check, Users } from 'lucide-react';

interface Customer { id: string; full_name: string; mobile: string; assigned_rm_id: string | null; rm_name?: string; }
interface Profile { id: string; full_name: string; role: string; }

export default function CustomerReassignment() {
  const { user, profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetRm, setTargetRm] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [filterRm, setFilterRm] = useState('');

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from(T.CUSTOMERS).select('id, full_name, mobile, assigned_rm_id, assigned_rm:master_users!core_customers_assigned_rm_id_fkey(full_name)').order('full_name'),
      supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).eq('is_active', true).order('full_name'),
    ]);
    const mapped = (c ?? []).map((row: { id: string; full_name: string; mobile: string; assigned_rm_id: string | null; assigned_rm: unknown }) => ({
      ...row,
      rm_name: (row.assigned_rm as { full_name?: string } | null)?.full_name ?? '—',
    }));
    setCustomers(mapped as Customer[]);
    setProfiles(p ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  }

  async function reassign() {
    if (!targetRm || selected.size === 0) return;
    setSaving(true);
    const ids = Array.from(selected);

    await supabase.from(T.CUSTOMERS).update({
      assigned_rm_id: targetRm,
      owner_id: targetRm,
      updated_at: new Date().toISOString(),
    }).in('id', ids);

    // Log reassignment requests
    const targetProfile = profiles.find(p => p.id === targetRm);
    for (const id of ids) {
      const cust = customers.find(c => c.id === id);
      await supabase.from(T.REASSIGNMENTS).insert({
        resource_type: 'customer',
        resource_id: id,
        from_profile_id: cust?.assigned_rm_id ?? null,
        to_profile_id: targetRm,
        requested_by: user.id,
        reason,
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      });
    }

    await logAuditEvent({
      actor_id: user.id,
      actor_name: profile.full_name,
      actor_role: profile.role,
      action: 'reassign',
      resource_type: 'customers',
      new_values: { customer_ids: ids, to_rm: targetProfile?.full_name, reason },
    });

    setSaving(false);
    setDone(true);
    setSelected(new Set());
    setTargetRm('');
    setReason('');
    load();
    setTimeout(() => setDone(false), 3000);
  }

  const q = search.toLowerCase();
  const filtered = customers.filter(c => {
    const matchSearch = !q || c.full_name.toLowerCase().includes(q) || c.mobile.includes(q);
    const matchRm = !filterRm || c.assigned_rm_id === filterRm;
    return matchSearch && matchRm;
  });

  const rmOptions = profiles.filter(p => p.role === 'rm' || p.role === 'admin');

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Customer Reassignment</h2>
        <p className="text-xs text-slate-500 mt-0.5">Bulk reassign customers to a different Relationship Manager</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: customer list */}
        <div className="col-span-2 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <select value={filterRm} onChange={e => setFilterRm(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">All RMs</option>
              {rmOptions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={selectAll} className="rounded" />
              <span className="text-xs font-semibold text-slate-600">{filtered.length} customers</span>
              {selected.size > 0 && <span className="ml-auto text-xs font-bold text-blue-600">{selected.size} selected</span>}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {loading ? (
                <div className="py-10 text-center text-slate-400 text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No customers found</div>
              ) : filtered.map(c => (
                <label key={c.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${selected.has(c.id) ? 'bg-blue-50' : ''}`}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                    <p className="text-xs text-slate-400">{c.mobile}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />{c.rm_name}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: reassign panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-0">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-blue-500" /> Reassign To
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">New RM *</label>
              <select value={targetRm} onChange={e => setTargetRm(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select RM...</option>
                {rmOptions.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for reassignment..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
              <p className="font-semibold">{selected.size} customer{selected.size !== 1 ? 's' : ''} selected</p>
              {selected.size === 0 && <p className="text-slate-400 mt-0.5">Select customers from the list</p>}
            </div>

            {done && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-700 text-sm">
                <Check className="w-4 h-4" /> Reassignment complete
              </div>
            )}

            <button
              onClick={reassign}
              disabled={saving || !targetRm || selected.size === 0}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Reassign {selected.size > 0 ? `${selected.size} Customer${selected.size !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
