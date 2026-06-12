import { useEffect, useState, useCallback } from 'react';
import { supabase, T, Task, Customer, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { Plus, CheckSquare, Phone, MessageCircle, Clock, Filter, Loader2, Search } from 'lucide-react';

const TASK_TYPE_LABELS: Record<string, string> = {
  customer_call: 'Customer Call', document_collection: 'Document Collection',
  insurance_renewal: 'Insurance Renewal', emi_followup: 'EMI Follow-up',
  site_visit: 'Site Visit', quote_sharing: 'Quote Sharing', other: 'Other',
};

const TASK_TYPES = Object.keys(TASK_TYPE_LABELS);

interface TasksPageProps {
  initialAction?: string;
}

export default function TasksPage({ initialAction }: TasksPageProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<(Task & { customer?: Customer; assignee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    customer_id: '', task_type: 'customer_call', title: '',
    description: '', due_date: '', assigned_to: ''
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.TASKS)
        .select('*, customer:core_customers(id, full_name, mobile), assignee:master_users!core_tasks_assigned_to_fkey(full_name)')
        .eq('active', true)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      let results = (data ?? []) as (Task & { customer?: Customer; assignee?: Profile })[];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(t =>
          t.title.toLowerCase().includes(s) ||
          (t.customer as Customer)?.full_name?.toLowerCase().includes(s)
        );
      }

      setTasks(results);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    supabase.from(T.CUSTOMERS).select('id, full_name, mobile').eq('active', true).order('full_name').then(({ data }) => {
      setCustomers(data ?? []);
    });
    supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, []);

  async function saveTask() {
    setSaving(true);
    const { error } = await supabase.from(T.TASKS).insert({
      customer_id: form.customer_id || null,
      task_type: form.task_type,
      title: form.title || TASK_TYPE_LABELS[form.task_type],
      description: form.description,
      due_date: form.due_date || null,
      status: 'pending',
      assigned_to: form.assigned_to || user?.id,
      created_by: user?.id,
    });
    if (!error) {
      setShowAddModal(false);
      setForm({ customer_id: '', task_type: 'customer_call', title: '', description: '', due_date: '', assigned_to: '' });
      loadTasks();
    }
    setSaving(false);
  }

  async function completeTask(taskId: string) {
    await supabase.from(T.TASKS).update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
    loadTasks();
  }

  const filters = [
    { value: 'all', label: 'All Tasks' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
  ];

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
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Tasks</h1>
            <button
              onClick={() => { setShowAddModal(true); setForm({ customer_id: '', task_type: 'customer_call', title: '', description: '', due_date: '', assigned_to: '' }); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <button onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl transition-colors ${statusFilter !== 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
            <p className="text-slate-400 text-sm mt-1">Tasks will appear here</p>
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
                    <p className="text-slate-400 text-xs mt-0.5">{TASK_TYPE_LABELS[task.task_type]}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ml-2 flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    due?.urgent ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                </div>

                {customer && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                      {customer.full_name.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-600 font-medium">{customer.full_name}</span>
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
                <div className="flex border-t border-slate-50">
                  <button onClick={() => completeTask(task.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-emerald-600 text-sm font-medium">
                    <CheckSquare className="w-4 h-4" /> Done
                  </button>
                  {customer && (
                    <>
                      <a href={`tel:${customer.mobile}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-blue-600 text-sm font-medium border-x border-slate-50">
                        <Phone className="w-4 h-4" /> Call
                      </a>
                      <a href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-green-600 text-sm font-medium">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Task"
        footer={
          <button onClick={saveTask} disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Task'}
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Task Type</label>
            <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={TASK_TYPE_LABELS[form.task_type]}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Due Date & Time</label>
            <input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign To</label>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
              <option value="">Myself</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Task details" rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
          </div>
        </div>
      </Modal>

      <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Tasks">
        <div className="space-y-2">
          {filters.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setShowFilterModal(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
