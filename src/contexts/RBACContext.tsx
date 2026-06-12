import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  PermissionEntry, DocumentPermission,
  checkPermission, loadPermissions, Resource, Action, Scope,
} from '../lib/rbac';
import { supabase, T } from '../lib/supabase';

interface RBACContextType {
  permissions: PermissionEntry[];
  documentPermissions: DocumentPermission[];
  teamMemberIds: string[];
  can: (resource: Resource, action: Action) => { allowed: boolean; scope: Scope };
  canViewDocument: (documentType: string) => { canView: boolean; canDownload: boolean; isMasked: boolean; maskPattern: string };
  loading: boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  role: string;
  userId: string;
  children: ReactNode;
}

export function RBACProvider({ role, userId, children }: RBACProviderProps) {
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [documentPermissions, setDocumentPermissions] = useState<DocumentPermission[]>([]);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { permissions: perms, documentPermissions: docPerms } = await loadPermissions(role);
      setPermissions(perms);
      setDocumentPermissions(docPerms);

      // Load team members for scope-based filtering
      const { data: membership } = await supabase
        .from(T.TEAM_MEMBERS)
        .select('team_id')
        .eq('profile_id', userId);

      if (membership && membership.length > 0) {
        const teamIds = membership.map(m => m.team_id);
        const { data: members } = await supabase
          .from(T.TEAM_MEMBERS)
          .select('profile_id')
          .in('team_id', teamIds);
        setTeamMemberIds(members?.map(m => m.profile_id) ?? []);
      }

      setLoading(false);
    }
    init();
  }, [role, userId]);

  function can(resource: Resource, action: Action) {
    return checkPermission(permissions, resource, action);
  }

  function canViewDocument(documentType: string) {
    const entry = documentPermissions.find(d => d.document_type === documentType);
    if (!entry) return { canView: true, canDownload: true, isMasked: false, maskPattern: '' };
    return {
      canView: entry.can_view,
      canDownload: entry.can_download,
      isMasked: entry.is_masked,
      maskPattern: entry.mask_pattern ?? '',
    };
  }

  return (
    <RBACContext.Provider value={{ permissions, documentPermissions, teamMemberIds, can, canViewDocument, loading }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within RBACProvider');
  return ctx;
}
