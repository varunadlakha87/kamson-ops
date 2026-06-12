import { useEffect, useState } from 'react';
import { supabase, T } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  parent_team_id: string | null;
  team_type: string;
  is_active: boolean;
  member_count?: number;
}

interface Profile { id: string; full_name: string; role: string; }

const TEAM_TYPES = ['admin_team', 'rm_team', 'agent_team'];
const TYPE_COLORS: Record<string, string> = {
  admin_team: 'bg-red-100 text-red-700',
  rm_team: 'bg-blue-100 text-blue-700',
  agent_team: 'bg-emerald-100 text-emerald-700',
};

const emptyForm = { name: '', parent_team_id: '', team_type: 'rm_team', is_active: true };

export default function TeamHierarchy() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Record<string, Profile[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [memberProfile, setMemberProfile] = useState('');

  async function load() {
    const [{ data: t }, { data: p }, { data: m }] = await Promise.all([
      supabase.from(T.TEAMS).select('*').order('name'),
      supabase.from(T.USERS).select('id, full_name, role').eq('is_active', true).order('full_name'),
      supabase.from(T.TEAM_MEMBERS).select('team_id, profile_id, master_users(id, full_name, role)').eq('is_active', true),
    ]);
    setTeams(t ?? []);
    setProfiles(p ?? []);
    const memberMap: Record<string, Profile[]> = {};
    (m ?? []).forEach((row: { team_id: string; profiles: unknown }) => {
      if (!memberMap[row.team_id]) memberMap[row.team_id] = [];
      const prof = row.profiles as Profile;
      if (prof) memberMap[row.team_id].push(prof);
    });
    setMembers(memberMap);
  }

  useEffect(() => { load(); }, []);

  async function saveTeam() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      parent_team_id: form.parent_team_id || null,
      team_type: form.team_type,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    if (editing === 'new') {
      await supabase.from(T.TEAMS).insert(payload);
    } else {
      await supabase.from(T.TEAMS).update(payload).eq('id', editing!);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function deleteTeam(id: string) {
    if (!confirm('Delete this team? Members will be unassigned.')) return;
    await supabase.from(T.TEAMS).delete().eq('id', id);
    load();
  }

  async function addMember(teamId: string) {
    if (!memberProfile) return;
    await supabase.from(T.TEAM_MEMBERS).upsert({ team_id: teamId, profile_id: memberProfile, role_in_team: 'member' });
    setAddingMemberTo(null);
    setMemberProfile('');
    load();
  }

  async function removeMember(teamId: string, profileId: string) {
    await supabase.from(T.TEAM_MEMBERS).delete().eq('team_id', teamId).eq('profile_id', profileId);
    load();
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const roots = teams.filter(t => !t.parent_team_id);
  const children = (parentId: string) => teams.filter(t => t.parent_team_id === parentId);

  function TeamNode({ team, depth }: { team: Team; depth: number }) {
    const kids = children(team.id);
    const isExpanded = expanded.has(team.id);
    const teamMembers = members[team.id] ?? [];

    return (
      <div>
        <div className={`flex items-center gap-2 py-2.5 px-4 rounded-xl group hover:bg-slate-50 transition-colors ${depth > 0 ? 'ml-6 border-l-2 border-slate-100' : ''}`}>
          <button onClick={() => toggleExpand(team.id)} className="text-slate-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <div className="flex-1">
            {editing === team.id ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="px-2 py-1 rounded-lg border border-slate-200 text-sm" />
                <select value={form.team_type} onChange={e => setForm(f => ({ ...f, team_type: e.target.value }))} className="px-2 py-1 rounded-lg border border-slate-200 text-sm">
                  {TEAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <select value={form.parent_team_id} onChange={e => setForm(f => ({ ...f, parent_team_id: e.target.value }))} className="px-2 py-1 rounded-lg border border-slate-200 text-sm">
                  <option value="">No parent</option>
                  {teams.filter(t => t.id !== team.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={saveTeam} disabled={saving} className="p-1.5 rounded-lg bg-blue-600 text-white"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">{team.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[team.team_type] ?? 'bg-slate-100 text-slate-600'}`}>{team.team_type.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" />{teamMembers.length}</span>
              </div>
            )}
          </div>
          {editing !== team.id && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setForm({ name: team.name, parent_team_id: team.parent_team_id ?? '', team_type: team.team_type, is_active: team.is_active }); setEditing(team.id); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteTeam(team.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="ml-6 pl-2 border-l border-slate-100 space-y-1 mb-2">
            {/* Members */}
            {teamMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-xs">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[9px]">{m.full_name.charAt(0)}</div>
                <span className="flex-1 text-slate-700 font-medium">{m.full_name}</span>
                <span className="text-slate-400 capitalize">{m.role}</span>
                <button onClick={() => removeMember(team.id, m.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
              </div>
            ))}

            {/* Add member */}
            {addingMemberTo === team.id ? (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <select value={memberProfile} onChange={e => setMemberProfile(e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-xs">
                  <option value="">Select user...</option>
                  {profiles.filter(p => !(members[team.id] ?? []).find(m => m.id === p.id)).map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
                </select>
                <button onClick={() => addMember(team.id)} className="p-1.5 rounded-lg bg-blue-600 text-white"><Check className="w-3 h-3" /></button>
                <button onClick={() => setAddingMemberTo(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={() => { setAddingMemberTo(team.id); setMemberProfile(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add member
              </button>
            )}

            {kids.map(child => <TeamNode key={child.id} team={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Team Hierarchy</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage organizational teams and membership</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditing('new'); }} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      {editing === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-blue-800">New Team</p>
          <div className="flex gap-3 flex-wrap">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Team Name *" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <select value={form.team_type} onChange={e => setForm(f => ({ ...f, team_type: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {TEAM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <select value={form.parent_team_id} onChange={e => setForm(f => ({ ...f, parent_team_id: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">No parent (top-level)</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={saveTeam} disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Create Team
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
        {teams.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            <p className="text-sm">No teams yet. Create your first team above.</p>
          </div>
        ) : roots.map(t => <TeamNode key={t.id} team={t} depth={0} />)}
      </div>
    </div>
  );
}
