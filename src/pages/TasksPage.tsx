import { useEffect, useState, useCallback } from 'react';
import { supabase, T, Task, Customer, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { Plus, CheckSquare, Phone, MessageCircle, Clock, Loader2, Search } from 'lucide-react';

const TASK_TYPE_LABELS: Record<string, string> = {
  customer_call: 'Customer Call', document_collection: 'Document Collection',
  insurance_renewal: 'Insurance Renewal', emi_followup: 'EMI Follow-up',
  site_visit: 'Site Visit', quote_sharing: 'Quote Sharing', other: 'Other',
};

const TASK_TYPES = Object.keys(TASK_TYPE_LABELS);

// Quick date helpers
function dateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const QUICK_DATES = [
  { label: 'Today',     days: 0 },
  { label: 'Tomorrow',  days: 1 },
  { label: '+3 Days',   days: 3 },
  { label: 'Next Week', days: 7 },
];

const STATUS_FILTERS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue',     label: 'Overdue' },
  { value: 'completed',   label: 'Done' },
  { value: 'all',         label: 'All' },
];

interface TasksPageProps { initialAction?: string; }

export default function TasksPage({ initialAction }: TasksPageProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<(Task & { customer?: Customer; assignee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const emptyForm = { customer_id: '', task_type: 'customer_call', description: '', due_date: '', assigned_to: '' };
  const [form, setForm] = useState({ ...emptyForm });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.TASKS)
        .select('*, customer:core_customers(id, full_name, mobile), assignee:master_users!core_tasks_assigned_to_fkey(full_name)')
        .eq('active', true)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (statusFilter === 'overdue') {
        // Overdue = past due date AND not completed
        query = query.lt('due_date', new Date().toISOString()).neq('status', 'completed');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) console.error('Load tasks error:', error.message);
      let results = (data ?? []) as (Task & { customer?: Customer; assignee?: Profile })[];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(t =>
          t.title.toLowerCase().includes(s) ||
          (t.customer as Customer)?.full_name?.toLowerCase().includes(s)
        );
      }
      setTasks(results);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    supabase.from(T.CUSTOMERS).select('id, full_name, mobile').eq('active', true).order('full_name').then(({ data }) => setCustomers(data ?? []));
    supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).eq('active', true).then(({ data }) => setProfiles(data ?? []));
  }, []);

  async function saveTask() {
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from(T.TASKS).insert({
      customer_id: form.customer_id || null,
      task_type: form.task_type,
      title: TASK_TYPE_LABELS[form.task_type],
      description: form.description,
      due_date: form.due_date || null,
      status: 'pending',
      assigned_to: form.assigned_to || user?.id,
      active: true,
      created_by: user?.id,
      owner_id: user?.id,
    });
    if (error) {
      setSaveError(error.message);
    } else {
      setShowAddModal(false);
      setForm({ ...emptyForm });
      loadTasks();
    }
    setSaving(false);
  }

  async function completeTask(taskId: string) {
    setCompletingId(taskId);
    const { error } = await supabase.from(T.TASKS).update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
    if (error) console.error('Complete task failed:', error.message);
    setCompletingId(null);
    loadTasks();
  }

  const formatDue = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, urgent: true };
    if (diff === 0) return { text: 'Today', urgent: true };
    if (diff === 1) return { text: 'Tomorrow', urgent: false };
    return { text: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), urgent: false };
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
            <button
              onClick={() => { setShowAddModal(true); setForm({ ...emptyForm }); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks or customer..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          {/* Inline filter chips — no modal needed */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-100">
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">No tasks found</p>
            <p className="text-slate-400 text-sm mt-1">
              {statusFilter === 'overdue' ? 'No overdue tasks — great!' : 'Tap + Add to create one'}
            </p>
          </div>
        ) : tasks.map(task => {
          const due = formatDue(task.due_date);
          const customer = task.customer as Customer;
          return (
            <div key={task.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${due?.urgent && task.status !== 'completed' ? 'border-red-200' : 'border-slate-100'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-snug">{task.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{TASK_TYPE_LABELS[task.task_type] ?? task.task_type}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ml-2 flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    due?.urgent ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                </div>

                {customer && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold flex-shrink-0">
                      {customer.full_name.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-600 font-medium truncate">{customer.full_name}</span>
                    <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{customer.mobile}</span>
                  </div>
                )}

                {due && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${due.urgent ? 'text-red-500' : 'text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{due.text}</span>
                  </div>
                )}
              </div>

              {task.status !== 'completed' && (
                <div className="flex border-t border-slate-100">
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={completingId === task.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-emerald-600 text-sm font-semibold disabled:opacity-60 active:bg-emerald-50">
                    {completingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                    Done
                  </button>
                  {customer && (
                    <>
                      <a href={`tel:${customer.mobile}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-blue-600 text-sm font-semibold border-x border-slate-100 active:bg-blue-50">
                        <Phone className="w-4 h-4" /> Call
                      </a>
                      <a href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-green-600 text-sm font-semibold active:bg-green-50">
                        <MessageCircle className="w-4 h-4" /> WA
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task Modal — streamlined for phone calls */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Task"
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button onClick={saveTask} disabled={saving}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Task type — large tap targets */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Task Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, task_type: t }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-colors ${
                    form.task_type === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {TASK_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">No customer linked</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
            </select>
          </div>

          {/* Due date with quick buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date</label>
            <div className="flex gap-1.5 mb-2">
              {QUICK_DATES.map(q => (
                <button
                  key={q.label}
                  onClick={() => setForm(f => ({ ...f, due_date: dateStr(q.days) }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    form.due_date === dateStr(q.days) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>


          {/* Assign to */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign To</label>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">Myself</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Quick note about this task..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
