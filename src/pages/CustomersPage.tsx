import { useEffect, useState, useCallback } from 'react';
import { supabase, T, Customer, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import {
  Search, Plus, Phone, MessageCircle, ChevronRight,
  User, Loader2, Filter, X, Users
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700' },
  follow_up_pending: { label: 'Follow-up', color: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-500' },
  renewal_due: { label: 'Renewal Due', color: 'bg-blue-50 text-blue-700' },
};

const TAGS = ['Loan Customer', 'Insurance Customer', 'Business Owner', 'HNI', 'Priority Customer'];
const OCCUPATIONS = ['Salaried', 'Self-Employed', 'Business Owner', 'Professional', 'Other'];

interface CustomersPageProps {
  onViewCustomer: (customer: Customer) => void;
  initialAction?: string;
}

export default function CustomersPage({ onViewCustomer, initialAction }: CustomersPageProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '', mobile: '', alternate_mobile: '', email: '',
    pan: '', aadhaar: '', date_of_birth: '', address: '', occupation: '',
    status: 'active', assigned_rm_id: '', notes: '', tags: [] as string[]
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from(T.CUSTOMERS)
        .select('*, assigned_rm:master_users!core_customers_assigned_rm_id_fkey(id, full_name, role), tags:core_customer_tags(id, tag)')
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);

      const { data } = await query;
      let results = (data as Customer[]) ?? [];

      if (search.trim()) {
        const s = search.toLowerCase();
        results = results.filter(c =>
          c.full_name.toLowerCase().includes(s) ||
          c.mobile.includes(s) ||
          (c.pan || '').toLowerCase().includes(s)
        );
      }

      setCustomers(results);
    } catch (err) {
      console.error('Load customers error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    supabase.from(T.USERS).select('id, full_name, role').in('role', ['admin', 'rm']).then(({ data }) => {
      setProfiles(data ?? []);
    });
  }, []);

  const [saveError, setSaveError] = useState('');

  async function handleSave() {
    if (!form.full_name.trim() || !form.mobile.trim()) return;
    setSaving(true);
    setSaveError('');

    const { data: customer, error } = await supabase.from(T.CUSTOMERS).insert({
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      alternate_mobile: form.alternate_mobile || null,
      email: form.email || null,
      pan: form.pan || null,
      aadhaar: form.aadhaar || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      occupation: form.occupation || null,
      status: form.status,
      assigned_rm_id: form.assigned_rm_id || null,
      notes: form.notes || null,
      created_by: user?.id,
    }).select().single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    if (customer && form.tags.length > 0) {
      await supabase.from(T.CUSTOMER_TAGS).insert(
        form.tags.map(tag => ({ customer_id: customer.id, tag }))
      );
    }

    await supabase.from(T.ACTIVITIES).insert({
      customer_id: customer?.id,
      activity_type: 'customer_added',
      description: `Customer ${form.full_name} was added`,
      performed_by: user?.id,
    });

    setSaving(false);
    setShowAddModal(false);
    resetForm();
    loadCustomers();
  }

  function resetForm() {
    setForm({
      full_name: '', mobile: '', alternate_mobile: '', email: '',
      pan: '', aadhaar: '', date_of_birth: '', address: '', occupation: '',
      status: 'active', assigned_rm_id: '', notes: '', tags: []
    });
  }

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Customers</h1>
            <button
              onClick={() => { setShowAddModal(true); resetForm(); }}
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
                type="text"
                placeholder="Search name, mobile, PAN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl transition-colors ${statusFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {statusFilter && (
        <div className="px-4 py-2 flex gap-2">
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {STATUS_LABELS[statusFilter]?.label}
            <button onClick={() => setStatusFilter('')}><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      {/* List */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">No customers found</p>
            <p className="text-slate-400 text-sm mt-1">Add your first customer to get started</p>
          </div>
        ) : (
          customers.map(customer => {
            const status = STATUS_LABELS[customer.status] ?? STATUS_LABELS.active;
            const initials = customer.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm truncate">{customer.full_name}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-slate-500 text-xs">{customer.mobile}</p>
                        {customer.ref_id && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{customer.ref_id}</span>}
                      </div>
                      {customer.assigned_rm && (
                        <p className="text-slate-400 text-xs mt-0.5">RM: {(customer.assigned_rm as Profile).full_name}</p>
                      )}
                    </div>
                    <button onClick={() => onViewCustomer(customer)} className="p-2 text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {customer.tags && customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {customer.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {t.tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex border-t border-slate-50">
                  <a
                    href={`tel:${customer.mobile}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-blue-600 text-sm font-medium active:bg-slate-50"
                    onClick={e => e.stopPropagation()}
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  <a
                    href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-emerald-600 text-sm font-medium border-x border-slate-50 active:bg-slate-50"
                    onClick={e => e.stopPropagation()}
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <button
                    onClick={() => onViewCustomer(customer)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-slate-600 text-sm font-medium active:bg-slate-50"
                  >
                    <User className="w-4 h-4" /> Profile
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setSaveError(''); }}
        title="Add Customer"
        footer={
          <div className="space-y-2">
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !form.full_name.trim() || !form.mobile.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Customer full name"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Number *</label>
              <input
                type="tel"
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alternate Mobile</label>
              <input
                type="tel"
                value={form.alternate_mobile}
                onChange={e => setForm(f => ({ ...f, alternate_mobile: e.target.value }))}
                placeholder="Alternate number"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email address"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">PAN</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Occupation</label>
              <select
                value={form.occupation}
                onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
              >
                <option value="">Select occupation</option>
                {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign RM</label>
              <select
                value={form.assigned_rm_id}
                onChange={e => setForm(f => ({ ...f, assigned_rm_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
              >
                <option value="">Select RM</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      form.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Customers">
        <div className="space-y-3">
          {[{ value: '', label: 'All Customers' }, ...Object.entries(STATUS_LABELS).map(([v, { label }]) => ({ value: v, label }))].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setShowFilterModal(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${statusFilter === value ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
