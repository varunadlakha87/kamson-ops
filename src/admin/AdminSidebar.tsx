import {
  Users, GitBranch, Grid3X3, FileKey,
  ArrowLeftRight, Layers, ListChecks, CalendarClock,
  UserCircle, CreditCard, Shield, Building2,
  LayoutDashboard, ScrollText, ChevronRight, BookOpen,
} from 'lucide-react';

export type AdminSection =
  | 'users' | 'teams' | 'permissions' | 'doc_permissions'
  | 'reassignment' | 'statuses' | 'task_types' | 'renewal_rules'
  | 'rms' | 'loan_products' | 'insurance_products' | 'banks'
  | 'dashboard_perms' | 'audit_logs' | 'data_dictionary';

interface NavGroup {
  label: string;
  items: { id: AdminSection; label: string; icon: React.ElementType }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'People & Access',
    items: [
      { id: 'users',           label: 'User Management',     icon: Users },
      { id: 'teams',           label: 'Team Hierarchy',       icon: GitBranch },
      { id: 'permissions',     label: 'Permission Matrix',    icon: Grid3X3 },
      { id: 'doc_permissions', label: 'Document Permissions', icon: FileKey },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'reassignment',  label: 'Customer Reassignment', icon: ArrowLeftRight },
      { id: 'statuses',      label: 'Status Management',     icon: Layers },
      { id: 'task_types',    label: 'Task Types',            icon: ListChecks },
      { id: 'renewal_rules', label: 'Renewal Rules',         icon: CalendarClock },
    ],
  },
  {
    label: 'Partners',
    items: [
      { id: 'rms',                label: 'Relationship Managers', icon: UserCircle },
      { id: 'loan_products',      label: 'Loan Products',         icon: CreditCard },
      { id: 'insurance_products', label: 'Insurance Products',    icon: Shield },
      { id: 'banks',              label: 'Banks / NBFCs',         icon: Building2 },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'dashboard_perms', label: 'Dashboard Permissions', icon: LayoutDashboard },
      { id: 'audit_logs',      label: 'Audit Logs',            icon: ScrollText },
      { id: 'data_dictionary', label: 'Data Dictionary',       icon: BookOpen },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: AdminSection;
  onNavigate: (s: AdminSection) => void;
}

export function AdminSidebar({ activeSection, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto flex-shrink-0">
      <div className="p-4 border-b border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Panel</p>
      </div>

      <nav className="flex-1 py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-4 mb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {group.label}
            </p>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all group ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-xs flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 text-blue-400" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
