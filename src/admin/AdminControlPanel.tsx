import { useState } from 'react';
import AdminLayout from './AdminLayout';
import { AdminSection } from './AdminSidebar';
import UserManagement from './sections/UserManagement';
import TeamHierarchy from './sections/TeamHierarchy';
import PermissionMatrix from './sections/PermissionMatrix';
import DocumentPermissions from './sections/DocumentPermissions';
import CustomerReassignment from './sections/CustomerReassignment';
import StatusManagement from './sections/StatusManagement';
import TaskTypeConfig from './sections/TaskTypeConfig';
import RenewalRules from './sections/RenewalRules';
import DashboardPermissions from './sections/DashboardPermissions';
import AuditLogs from './sections/AuditLogs';
import PartnerManagement from './sections/PartnerManagement';
import DataDictionary from './sections/DataDictionary';

interface AdminControlPanelProps {
  onExit: () => void;
}

export default function AdminControlPanel({ onExit }: AdminControlPanelProps) {
  const [section, setSection] = useState<AdminSection>('users');

  function renderSection() {
    switch (section) {
      case 'users':           return <UserManagement />;
      case 'teams':           return <TeamHierarchy />;
      case 'permissions':     return <PermissionMatrix />;
      case 'doc_permissions': return <DocumentPermissions />;
      case 'reassignment':    return <CustomerReassignment />;
      case 'statuses':        return <StatusManagement />;
      case 'task_types':      return <TaskTypeConfig />;
      case 'renewal_rules':   return <RenewalRules />;
      case 'dashboard_perms': return <DashboardPermissions />;
      case 'audit_logs':      return <AuditLogs />;
      case 'data_dictionary': return <DataDictionary />;
      case 'rms':                return <PartnerManagement section="rms" />;
      case 'loan_products':      return <PartnerManagement section="loan_products" />;
      case 'insurance_products': return <PartnerManagement section="insurance_products" />;
      case 'banks':              return <PartnerManagement section="banks" />;
      default:                return null;
    }
  }

  return (
    <AdminLayout activeSection={section} onNavigate={setSection} onExit={onExit}>
      {renderSection()}
    </AdminLayout>
  );
}
