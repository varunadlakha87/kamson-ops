import { supabase, T } from './supabase';

export type Resource = 'customers' | 'loans' | 'insurance_cases' | 'insurance_policies' | 'documents' | 'tasks' | 'renewals';
export type Action   = 'view' | 'create' | 'edit' | 'delete' | 'reassign' | 'view_sensitive';
export type Scope    = 'all' | 'own_team' | 'own' | 'none';

export interface PermissionEntry {
  id: string;
  role: string;
  resource: string;
  action: string;
  scope: Scope;
  is_allowed: boolean;
}

export interface DocumentPermission {
  id: string;
  document_type: string;
  role: string;
  can_view: boolean;
  can_download: boolean;
  is_masked: boolean;
  mask_pattern: string;
}

export function checkPermission(
  permissions: PermissionEntry[],
  resource: Resource,
  action: Action
): { allowed: boolean; scope: Scope } {
  const entry = permissions.find(p => p.resource === resource && p.action === action);
  if (!entry || !entry.is_allowed) return { allowed: false, scope: 'none' };
  return { allowed: true, scope: entry.scope };
}

export async function loadPermissions(role: string): Promise<{
  permissions: PermissionEntry[];
  documentPermissions: DocumentPermission[];
}> {
  const [{ data: perms }, { data: docPerms }] = await Promise.all([
    supabase.from(T.ROLE_PERMISSIONS).select('*').eq('role', role),
    supabase.from(T.DOC_PERMISSIONS).select('*').eq('role', role),
  ]);
  return {
    permissions: (perms ?? []) as PermissionEntry[],
    documentPermissions: (docPerms ?? []) as DocumentPermission[],
  };
}
