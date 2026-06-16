import { useState } from 'react';
import { Home, Users, CheckSquare, RefreshCw, FileText, UserCircle, Shield, CreditCard, Settings2, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Tab } from '../App';

interface BottomNavProps { activeTab: Tab; onTabChange: (tab: Tab) => void; }

const PRIMARY_TABS = [
  { id: 'home'      as Tab, label: 'Home',      icon: Home,        roles: null },
  { id: 'customers' as Tab, label: 'Customers', icon: Users,       roles: null },
  { id: 'tasks'     as Tab, label: 'Tasks',     icon: CheckSquare, roles: null },
  { id: 'renewals'  as Tab, label: 'Renewals',  icon: RefreshCw,   roles: null },
];

const MORE_TABS = [
  { id: 'loans'     as Tab, label: 'Loans',     icon: CreditCard,  roles: null },
  { id: 'insurance' as Tab, label: 'Insurance', icon: Shield,      roles: null },
  { id: 'documents' as Tab, label: 'Docs',      icon: FileText,    roles: null },
  { id: 'profile'   as Tab, label: 'Profile',   icon: UserCircle,  roles: null },
  { id: 'admin'     as Tab, label: 'Admin',     icon: Settings2,   roles: ['admin'] },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { profile } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const role = profile?.role ?? '';

  const moreTabs = MORE_TABS.filter(t => !t.roles || t.roles.includes(role));
  const moreActive = moreTabs.some(t => t.id === activeTab);

  function handleTabChange(tab: Tab) {
    onTabChange(tab);
    setShowMore(false);
  }

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div
          className="fixed bottom-[65px] left-0 right-0 z-50 max-w-lg mx-auto px-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">More</span>
              <button onClick={() => setShowMore(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-0 p-2">
              {moreTabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-500'}`}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                    <span className={`text-[11px] font-medium ${active ? 'text-blue-600' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center max-w-lg mx-auto">
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                  <Icon
                    className={`w-5 h-5 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </div>
                <span className={`text-[11px] transition-colors ${active ? 'text-blue-600 font-semibold' : 'text-slate-400 font-medium'}`}>
                  {label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setShowMore(v => !v)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors"
          >
            <div className={`p-1.5 rounded-xl transition-all ${showMore || moreActive ? 'bg-blue-50' : ''}`}>
              <MoreHorizontal
                className={`w-5 h-5 transition-colors ${showMore || moreActive ? 'text-blue-600' : 'text-slate-400'}`}
                strokeWidth={showMore || moreActive ? 2.5 : 1.8}
              />
            </div>
            <span className={`text-[11px] transition-colors ${showMore || moreActive ? 'text-blue-600 font-semibold' : 'text-slate-400 font-medium'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
