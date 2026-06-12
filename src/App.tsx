import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import Customer360Page from './pages/Customer360Page';
import TasksPage from './pages/TasksPage';
import RenewalsPage from './pages/RenewalsPage';
import DocumentsPage from './pages/DocumentsPage';
import ProfilePage from './pages/ProfilePage';
import InsurancePage from './pages/InsurancePage';
import LoansPage from './pages/LoansPage';
import AdminControlPanel from './admin/AdminControlPanel';
import BottomNav from './components/BottomNav';
import { Customer } from './lib/supabase';

export type Tab = 'home' | 'customers' | 'tasks' | 'renewals' | 'documents' | 'profile' | 'insurance' | 'loans' | 'admin';

interface NavState { tab: Tab; data?: unknown; }

function AppContent() {
  const { user, profile } = useAuth();
  const [navState, setNavState] = useState<NavState>({ tab: 'home' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Not authenticated — show login screen
  if (!user || !profile) return <LoginPage />;

  function handleNavigate(tab: string, data?: unknown) {
    setNavState({ tab: tab as Tab, data });
    setSelectedCustomer(null);
  }

  function handleTabChange(tab: Tab) {
    setNavState({ tab, data: undefined });
    setSelectedCustomer(null);
  }

  // Admin — full screen, no bottom nav wrapper
  if (navState.tab === 'admin' && profile.role === 'admin') {
    return <AdminControlPanel onExit={() => handleTabChange('home')} />;
  }

  // Customer 360 — overlay on top of current tab
  if (selectedCustomer) {
    return (
      <div className="max-w-lg mx-auto relative min-h-screen">
        <Customer360Page customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />
      </div>
    );
  }

  const navData = navState.data as { action?: string } | undefined;

  return (
    <div className="max-w-lg mx-auto relative min-h-screen">
      {navState.tab === 'home'      && <DashboardPage onNavigate={handleNavigate} />}
      {navState.tab === 'customers' && <CustomersPage onViewCustomer={setSelectedCustomer} initialAction={navData?.action} />}
      {navState.tab === 'tasks'     && <TasksPage initialAction={navData?.action} />}
      {navState.tab === 'renewals'  && <RenewalsPage />}
      {navState.tab === 'documents' && <DocumentsPage initialAction={navData?.action} />}
      {navState.tab === 'insurance' && <InsurancePage initialAction={navData?.action} />}
      {navState.tab === 'loans'     && <LoansPage initialAction={navData?.action} />}
      {navState.tab === 'profile'   && <ProfilePage />}
      <BottomNav activeTab={navState.tab} onTabChange={handleTabChange} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
