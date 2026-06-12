import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Search, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  view_sensitive: 'bg-amber-100 text-amber-700',
  reassign: 'bg-violet-100 text-violet-700',
  export: 'bg-cyan-100 text-cyan-700',
  login: 'bg-slate-100 text-slate-700',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-600', rm: 'text-blue-600', operations: 'text-amber-600', agent: 'text-emerald-600',
};

const PAGE_SIZE = 50;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function load() {
    setLoading(true);
    let query = supabase
      .from(T.AUDIT_LOGS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterAction) query = query.eq('action', filterAction);
    if (filterResource) query = query.eq('resource_type', filterResource);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data, count } = await query;
    let results = (data ?? []) as AuditLog[];

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(l =>
        l.actor_name?.toLowerCase().includes(q) ||
        l.resource_type?.toLowerCase().includes(q) ||
        l.resource_id?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q)
      );
    }

    setLogs(results);
    setTotal(count ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, filterAction, filterResource, dateFrom, dateTo]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const ACTIONS = ['create', 'update', 'delete', 'view_sensitive', 'reassign', 'export', 'login'];
  const RESOURCES = ['customers', 'loans', 'insurance_cases', 'documents', 'tasks', 'profiles', 'role_permissions'];

  const filteredLogs = search.trim()
    ? logs.filter(l => {
        const q = search.toLowerCase();
        return l.actor_name?.toLowerCase().includes(q) || l.resource_type?.toLowerCase().includes(q) || l.resource_id?.includes(q) || l.action?.includes(q);
      })
    : logs;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">{total.toLocaleString()} total events recorded</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actor, resource..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
        <select value={filterResource} onChange={e => { setFilterResource(e.target.value); setPage(0); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Resources</option>
          {RESOURCES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No audit logs found</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredLogs.map(log => {
              const isExpanded = expanded.has(log.id);
              const hasChanges = log.old_values || log.new_values;
              return (
                <div key={log.id}>
                  <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                    {hasChanges ? (
                      <button onClick={() => toggleExpand(log.id)} className="text-slate-400 flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : <div className="w-3.5 flex-shrink-0" />}

                    <div className="text-xs text-slate-400 w-32 flex-shrink-0 font-mono">{formatDate(log.created_at)}</div>

                    <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 flex-shrink-0">
                        {(log.actor_name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{log.actor_name || 'System'}</p>
                        {log.actor_role && <p className={`text-[10px] font-bold capitalize ${ROLE_COLORS[log.actor_role] ?? 'text-slate-400'}`}>{log.actor_role}</p>}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.action?.replace('_', ' ')}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-600 capitalize">{log.resource_type?.replace('_', ' ')}</span>
                      {log.resource_id && <span className="text-xs text-slate-400 ml-1.5 font-mono">{log.resource_id.slice(0, 8)}…</span>}
                    </div>
                  </div>

                  {isExpanded && hasChanges && (
                    <div className="px-8 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {log.old_values && (
                          <div>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1.5">Before</p>
                            <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-3 overflow-auto max-h-40 text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">After</p>
                            <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl p-3 overflow-auto max-h-40 text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
