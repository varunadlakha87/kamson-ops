import { ReactNode } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import { Resource, Action } from '../lib/rbac';

interface AccessGuardProps {
  resource: Resource;
  action: Action;
  fallback?: ReactNode;
  children: ReactNode;
}

export function AccessGuard({ resource, action, fallback = null, children }: AccessGuardProps) {
  const { can } = useRBAC();
  const { allowed } = can(resource, action);
  return <>{allowed ? children : fallback}</>;
}
