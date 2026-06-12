import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, T } from '../lib/supabase';
import {
  Users, CreditCard, Shield, RefreshCw, FileText, CheckSquare,
  Plus, Bell, TrendingUp, ChevronRight, Clock, IndianRupee, Banknote
} from 'lucide-react';

interface KPIData {
  totalCustomers: number;
  activeLoans: number;
  activePolicies: number;
  renewalsDue: number;
  pendingDocuments: number;
  pendingTasks: number;
  insuranceCasesMonth: number;
  insuranceIssuedMonth: number;
  insurancePremiumMonth: number;
  loansMonthCount: number;
  loansDisbursedMonth: number;
  loansDisbursedAmountMonth: number;
}

interface RecentActivity {
  id: string;
  description: string;
  activity_type: string;
  created_at: string;
}

interface RenewalItem {
  id: string;
  title: string;
  renewal_date: string;
  amount: number;
  customer?: { full_name: string };
}

interface DashboardPageProps {
  onNavigate: (tab: string, data?: unknown) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { profile } = useAuth();
  const [kpi, setKpi] = useState<KPIData>({ totalCustomers: 0, activeLoans: 0, activePolicies: 0, renewalsDue: 0, pendingDocuments:0, pendingTasks: 0, insuranceCasesMonth: 0, insuranceIssuedMonth: 0, insurancePremiumMonth: 0, loansMonthCount: 0, loansDisbursedMonth: 0, loansDisbursedAmountMonth: 0 });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [customersRes, loansRes, policiesRes, renewalsRes, tasksRes, docsRes, activitiesRes, insMonthRes, insIssuedRes, insPremiumRes, loansMonthRes, loansDisbRes, loansDisbAmtRes] = await Promise.all([
      supabase.from(T.CUSTOMERS).select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from(T.LOANS).select('id', { count: 'exact', head: true }).not('status', 'in', '("closed","rejected")').eq('active', true),
      supabase.from(T.INSURANCE_POLICIES).select('id', { count: 'exact', head: true }).eq('status', 'active').eq('active', true),
      supabase.from(T.RENEWALS).select('id, title, renewal_date, amount, customer:core_customers(full_name)', { count: 'exact' }).eq('status', 'pending').eq('active', true).lte('renewal_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]).order('renewal_date').limit(5),
      supabase.from(T.TASKS).select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']).eq('active', true),
      supabase.from(T.DOCUMENTS).select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from(T.ACTIVITIES).select('id, description, activity_type, created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from(T.INSURANCE_CASES).select('id', { count: 'exact', head: true }).eq('active', true).gte('created_at', monthStart.toISOString()),
      supabase.from(T.INSURANCE_CASES).select('id', { count: 'exact', head: true }).eq('case_status', 'Policy Issued').eq('active', true).gte('created_at', monthStart.toISOString()),
      supabase.from(T.INSURANCE_CASES).select('premium_amount').eq('case_status', 'Policy Issued').eq('active', true).gte('created_at', monthStart.toISOString()),
      supabase.from(T.LOANS).select('id', { count: 'exact', head: true }).eq('active', true).gte('created_at', monthStart.toISOString()),
      supabase.from(T.LOANS).select('id', { count: 'exact', head: true }).eq('status', 'disbursed').eq('active', true).gte('created_at', monthStart.toISOString()),
      supabase.from(T.LOANS).select('loan_amount').eq('status', 'disbursed').eq('active', true).gte('created_at', monthStart.toISOString()),
    ]);

    const premiumTotal = (insPremiumRes.data ?? []).reduce((s: number, r: { premium_amount: number }) => s + (r.premium_amount || 0), 0);
    const loansDisbAmt = (loansDisbAmtRes.data ?? []).reduce((s: number, r: { loan_amount: number }) => s + (r.loan_amount || 0), 0);

    setKpi({
      totalCustomers: customersRes.count ?? 0,
      activeLoans: loansRes.count ?? 0,
      activePolicies: policiesRes.count ?? 0,
      renewalsDue: renewalsRes.count ?? 0,
      pendingDocuments: docsRes.count ?? 0,
      pendingTasks: tasksRes.count ?? 0,
      insuranceCasesMonth: insMonthRes.count ?? 0,
      insuranceIssuedMonth: insIssuedRes.count ?? 0,
      insurancePremiumMonth: premiumTotal,
      loansMonthCount: loansMonthRes.count ?? 0,
      loansDisbursedMonth: loansDisbRes.count ?? 0,
      loansDisbursedAmountMonth: loansDisbAmt,
    });

    setActivities((activitiesRes.data as RecentActivity[]) ?? []);
    setRenewals((renewalsRes.data as unknown as RenewalItem[]) ?? []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const kpiCards = [
    { label: 'Total Customers', value: kpi.totalCustomers, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Loans', value: kpi.activeLoans, icon: CreditCard, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active Policies', value: kpi.activePolicies, icon: Shield, color: 'bg-sky-50 text-sky-600' },
    { label: 'Renewals Due', value: kpi.renewalsDue, icon: RefreshCw, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Docs', value: kpi.pendingDocuments, icon: FileText, color: 'bg-teal-50 text-teal-600' },
    { label: 'Open Tasks', value: kpi.pendingTasks, icon: CheckSquare, color: 'bg-rose-50 text-rose-600' },
  ];

  const formatAmount = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const insSuccessRatio = kpi.insuranceCasesMonth > 0
    ? Math.round((kpi.insuranceIssuedMonth / kpi.insuranceCasesMonth) * 100)
    : 0;

  const insuranceKpis = [
    { label: 'Cases', value: kpi.insuranceCasesMonth, icon: Shield, color: 'bg-blue-50 text-blue-600' },
    { label: 'Issued', value: kpi.insuranceIssuedMonth, icon: CheckSquare, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Success', value: `${insSuccessRatio}%`, icon: TrendingUp, color: 'bg-sky-50 text-sky-600' },
    { label: 'Premium', value: formatAmount(kpi.insurancePremiumMonth), icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
  ];

  const loanKpis = [
    { label: 'New Cases', value: kpi.loansMonthCount, icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
    { label: 'Disbursed', value: kpi.loansDisbursedMonth, icon: CheckSquare, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active', value: kpi.activeLoans, icon: Banknote, color: 'bg-sky-50 text-sky-600' },
    { label: 'Volume', value: formatAmount(kpi.loansDisbursedAmountMonth), icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
  ];

  const quickActions = [
    { label: 'Add Customer', icon: Plus, action: () => onNavigate('customers', { action: 'add' }), color: '#1d4ed8' },
    { label: 'New Case', icon: Shield, action: () => onNavigate('insurance', { action: 'add' }), color: '#059669' },
    { label: 'Add Task', icon: Bell, action: () => onNavigate('tasks', { action: 'add' }), color: '#d97706' },
    { label: 'View Loans', icon: CreditCard, action: () => onNavigate('loans'), color: '#0284c7' },
  ];

  const activityIcons: Record<string, string> = {
    customer_added: '👤',
    document_uploaded: '📄',
    loan_created: '💰',
    policy_created: '🛡️',
    task_completed: '✅',
    renewal_updated: '🔄',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatRenewalDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    if (diff <= 0) return 'Overdue';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return `${diff} days`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{greeting()},</p>
              <h1 className="text-white text-xl font-bold">{profile?.full_name || 'Team'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* KPI Grid */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Overview</h2>
          <div className="grid grid-cols-3 gap-2">
            {kpiCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className={`p-1.5 rounded-lg ${color} w-fit mb-2`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {loading ? <div className="h-6 w-8 bg-slate-100 rounded animate-pulse" /> : value}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance KPIs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Insurance This Month</h2>
            <button onClick={() => onNavigate('insurance')} className="text-blue-600 text-xs font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {insuranceKpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className={`p-1.5 rounded-lg ${color} w-fit mb-2`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {loading ? <div className="h-6 w-8 bg-slate-100 rounded animate-pulse" /> : value}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loans KPIs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Loans This Month</h2>
            <button onClick={() => onNavigate('loans')} className="text-blue-600 text-xs font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {loanKpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className={`p-1.5 rounded-lg ${color} w-fit mb-2`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {loading ? <div className="h-6 w-8 bg-slate-100 rounded animate-pulse" /> : value}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, action, color }) => (
              <button
                key={label}
                onClick={action}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-[10px] font-medium text-slate-600 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Renewals Due */}
        {renewals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Renewals Due</h2>
              <button onClick={() => onNavigate('renewals')} className="text-blue-600 text-xs font-medium flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {renewals.map(renewal => {
                const daysLeft = Math.ceil((new Date(renewal.renewal_date).getTime() - Date.now()) / 86400000);
                const urgent = daysLeft <= 7;
                return (
                  <div key={renewal.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${urgent ? 'border-amber-200' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{renewal.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{renewal.customer?.full_name}</p>
                      </div>
                      <div className="text-right ml-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${urgent ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                          {formatRenewalDate(renewal.renewal_date)}
                        </span>
                        {renewal.amount > 0 && (
                          <p className="text-xs text-slate-500 mt-1">₹{renewal.amount.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Activity</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No recent activity yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {activities.map((activity, idx) => (
                <div key={activity.id} className={`flex items-start gap-3 p-4 ${idx < activities.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-sm flex-shrink-0">
                    {activityIcons[activity.activity_type] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
