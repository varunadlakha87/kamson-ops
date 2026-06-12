import { supabase, T } from './supabase';

export interface AuditEvent {
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: 'create' | 'update' | 'delete' | 'view_sensitive' | 'reassign' | 'export' | 'login';
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await supabase.from(T.AUDIT_LOGS).insert({
      actor_id: event.actor_id,
      actor_name: event.actor_name,
      actor_role: event.actor_role,
      action: event.action,
      resource_type: event.resource_type,
      resource_id: event.resource_id ?? '',
      old_values: event.old_values ?? null,
      new_values: event.new_values ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Fire-and-forget — never block the UI
  }
}
