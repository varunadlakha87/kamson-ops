import { Home, Users, CheckSquare, RefreshCw, FileText, UserCircle, Shield, CreditCard, Settings2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '../App';

interface BottomNavProps { activeTab: Tab; onTabChange: (tab: Tab) => void; }

const ALL_TABS = [
  { id: 'home'      as Tab, label: 'Home',      icon: Home,        roles: null },
  { id: 'customers' as Tab, label: 'Customers', icon: Users,       roles: null },
  { id: 'loans'     as Tab, label: 'Loans',     icon: CreditCard,  roles: null },
  { id: 'insurance' as Tab, label: 'Insurance', icon: Shield,      roles: null },
  { id: 'tasks'     as Tab, label: 'Tasks',     icon: CheckSquare, roles: null },
  { id: 'renewals'  as Tab, label: 'Renewals',  icon: RefreshCw,   roles: null },
  { id: 'documents' as Tab, label: 'Docs',      icon: FileText,    roles: null },
  { id: 'profile'   as Tab, label: 'Profile',   icon: UserCircle,  roles: null },
  { id: 'admin'     as Tab, label: 'Admin',     icon: Settings2,   roles: ['admin'] },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { profile } = useAuth();
  const tabs = ALL_TABS.filter(t => !t.roles || t.roles.includes(profile!.role));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center max-w-lg mx-auto overflow-x-auto scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 min-w-[48px] flex flex-col items-center py-2 gap-0.5 transition-colors"
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                <Icon
                  className={`w-[18px] h-[18px] transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </div>
              <span className={`text-[9px] font-medium transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
