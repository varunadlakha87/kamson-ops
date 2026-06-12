import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { AdminSidebar, AdminSection } from './AdminSidebar';

interface AdminLayoutProps {
  activeSection: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onExit: () => void;
  children: ReactNode;
}

export default function AdminLayout({ activeSection, onNavigate, onExit, children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden fixed inset-0 z-50">
      <AdminSidebar activeSection={activeSection} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <span className="font-bold text-slate-800 text-sm">Kamson Admin</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 capitalize">{activeSection.replace(/_/g, ' ')}</span>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Exit Admin
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
