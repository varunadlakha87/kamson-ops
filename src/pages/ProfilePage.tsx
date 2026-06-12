import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, T } from '../lib/supabase';
import { User, Shield, Phone, Save, Loader2, Building2, LogOut } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator', rm: 'Relationship Manager',
  operations: 'Operations', agent: 'Agent',
};

export default function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [editing, setEditing]       = useState(false);
  const [fullName, setFullName]     = useState(profile!.full_name);
  const [mobile, setMobile]         = useState(profile!.mobile);
  const [saving, setSaving]         = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    const { error } = await supabase
      .from(T.USERS)
      .update({ full_name: fullName, mobile })
      .eq('id', profile!.id);
    if (!error) {
      await refreshProfile();
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  }

  const initials = profile!.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <div className="px-4 pt-12 pb-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
            {initials}
          </div>
          <h1 className="text-xl font-bold text-white">{profile!.full_name}</h1>
          <span className="inline-block mt-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-300">
            {ROLE_LABELS[profile!.role] || profile!.role}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl text-center font-medium">
            ✓ Profile updated successfully
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm">Profile Information</h3>
            {!editing && (
              <button onClick={() => { setEditing(true); setFullName(profile!.full_name); setMobile(profile!.mobile); }}
                className="text-blue-600 text-sm font-medium">Edit</button>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              {editing
                ? <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                : <p className="text-slate-700 text-sm font-medium">{profile!.full_name}</p>
              }
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Mobile
              </label>
              {editing
                ? <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                : <p className="text-slate-700 text-sm font-medium">{profile!.mobile || 'Not set'}</p>
              }
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <Shield className="w-3.5 h-3.5" /> Role
              </label>
              <p className="text-slate-700 text-sm font-medium">{ROLE_LABELS[profile!.role] || profile!.role}</p>
            </div>
            {editing && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)' }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Kamson Financials</p>
              <p className="text-xs text-slate-400">Operations Platform v1.0</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your digital operational memory system. Manage customers, loans, insurance, documents, and follow-ups all in one place.
          </p>
        </div>

        <button onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
