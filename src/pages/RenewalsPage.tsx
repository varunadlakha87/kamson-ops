import { useEffect, useState } from 'react';
import { supabase, T, Renewal, Customer } from '../lib/supabase';
import Modal from '../components/Modal';
import { RefreshCw, Calendar, Phone, MessageCircle, AlertTriangle, CheckCircle, Clock, Plus, Loader2 } from 'lucide-react';

const RENEWAL_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'emi', label: 'EMI' },
  { value: 'fd_maturity', label: 'FD Maturity' },
  { value: 'policy_expiry', label: 'Policy Expiry' },
];

const emptyForm = {
  customer_id: '',
  renewal_type: 'insurance',
  title: '',
  renewal_date: '',
  amount: '',
  notes: '',
};

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<(Renewal & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | '7days' | '30days'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { loadRenewals(); }, []);

  useEffect(() => {
    supabase.from(T.CUSTOMERS).select('id, full_name, mobile').eq('active', true).order('full_name').then(({ data }) => {
      setCustomers(data ?? []);
    });
  }, []);

  async function loadRenewals() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from(T.RENEWALS)
        .select('*, customer:core_customers(id, full_name, mobile)')
        .eq('active', true)
        .order('renewal_date', { ascending: true });
      setRenewals((data ?? []) as (Renewal & { customer?: Customer })[]);
    } catch (err) {
      console.error('Load renewals error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markRenewed(id: string) {
    await supabase.from(T.RENEWALS).update({ status: 'completed' }).eq('id', id);
    loadRenewals();
  }

  async function handleSave() {
    if (!form.title.trim() || !form.renewal_date) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from(T.RENEWALS).insert({
      customer_id: form.customer_id || null,
      renewal_type: form.renewal_type,
      title: form.title.trim(),
      renewal_date: form.renewal_date,
      amount: parseFloat(form.amount) || 0,
      notes: form.notes || null,
      status: 'pending',
    });
    if (error) { setSaveError(error.message); setSaving(false); return; }
    setSaving(false);
    setShowAddModal(false);
    setForm({ ...emptyForm });
    loadRenewals();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredRenewals = renewals.filter(r => {
    const rDate = new Date(r.renewal_date);
    rDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((rDate.getTime() - today.getTime()) / 86400000);

    if (filter === 'overdue') return diff < 0 && r.status !== 'completed';
    if (filter === '7days') return diff >= 0 && diff <= 7 && r.status !== 'completed';
    if (filter === '30days') return diff >= 0 && diff <= 30 && r.status !== 'completed';
    return true;
  });

  const getDaysDiff = (dateStr: string) => {
    const rDate = new Date(dateStr);
    rDate.setHours(0, 0, 0, 0);
    return Math.ceil((rDate.getTime() - today.getTime()) / 86400000);
  };

  const formatRenewalDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getRenewalUrgency = (diff: number, status: string) => {
    if (status === 'completed') return { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'Renewed', icon: CheckCircle, iconColor: 'text-emerald-500' };
    if (diff < 0) return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', text: `${Math.abs(diff)}d overdue`, icon: AlertTriangle, iconColor: 'text-red-500' };
    if (diff <= 7) return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', text: diff === 0 ? 'Today' : `${diff}d left`, icon: AlertTriangle, iconColor: 'text-amber-500' };
    if (diff <= 30) return { bg: 'bg-blue-50', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700', text: `${diff}d left`, icon: Clock, iconColor: 'text-blue-500' };
    return { bg: 'bg-white', border: 'border-slate-100', badge: 'bg-slate-100 text-slate-600', text: `${diff}d left`, icon: Calendar, iconColor: 'text-slate-400' };
  };

  const overdueCount = renewals.filter(r => getDaysDiff(r.renewal_date) < 0 && r.status !== 'completed').length;
  const urgentCount = renewals.filter(r => { const d = getDaysDiff(r.renewal_date); return d >= 0 && d <= 7 && r.status !== 'completed'; }).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Renewals</h1>
            <button
              onClick={() => { setShowAddModal(true); setForm({ ...emptyForm }); setSaveError(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Alert Counts */}
          {(overdueCount > 0 || urgentCount > 0) && (
            <div className="flex gap-2 mb-3">
              {overdueCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl border border-red-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600">{overdueCount} overdue</span>
                </div>
              )}
              {urgentCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">{urgentCount} this week</span>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {[
              { value: 'all', label: 'All' },
              { value: 'overdue', label: 'Overdue' },
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilter(f.value as typeof filter)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === f.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-100">
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : filteredRenewals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">No renewals found</p>
            <p className="text-slate-400 text-sm mt-1">Add a renewal manually or mark an insurance case as Policy Issued</p>
          </div>
        ) : filteredRenewals.map(renewal => {
          const diff = getDaysDiff(renewal.renewal_date);
          const u = getRenewalUrgency(diff, renewal.status);
          const StatusIcon = u.icon;
          const customer = renewal.customer as Customer;

          return (
            <div key={renewal.id} className={`rounded-2xl shadow-sm border overflow-hidden ${u.bg} ${u.border}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{renewal.title}</p>
                    {customer && (
                      <p className="text-slate-600 text-xs mt-0.5 font-medium">{customer.full_name}</p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-1.5">
                    <StatusIcon className={`w-4 h-4 ${u.iconColor}`} />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.badge}`}>
                      {u.text}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatRenewalDate(renewal.renewal_date)}</span>
                  </div>
                  {renewal.amount > 0 && (
                    <span className="font-semibold text-slate-700">₹{renewal.amount.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              {renewal.status !== 'completed' && (
                <div className="flex border-t border-black/5">
                  <button onClick={() => markRenewed(renewal.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-emerald-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Renewed
                  </button>
                  {customer && (
                    <>
                      <a href={`tel:${customer.mobile}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-blue-600 text-sm font-medium border-x border-black/5">
                        <Phone className="w-4 h-4" /> Call
                      </a>
                      <a href={`https://wa.me/91${customer.mobile.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
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

      {/* Add Renewal Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setSaveError(''); }}
        title="Add Renewal"
        footer={
          <div className="space-y-2">
            {saveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.renewal_date}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Renewal'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Health Insurance Renewal"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Renewal Type</label>
            <select
              value={form.renewal_type}
              onChange={e => setForm(f => ({ ...f, renewal_type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              {RENEWAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Customer</label>
            <select
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
            >
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Renewal Date *</label>
            <input
              type="date"
              value={form.renewal_date}
              onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Premium / Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
