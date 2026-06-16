import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, T } from '../lib/supabase';
import { RBACProvider } from './RBACContext';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase.from(T.USERS).select('*').eq('id', userId).single();
    if (error) {
      console.error('[fetchProfile] error:', error.code, error.message, error.details);
    }
    if (data) {
      setProfile(data as Profile);
    } else {
      console.warn('[fetchProfile] no data returned for userId:', userId);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    // Safety net: if Supabase is unreachable, stop spinning after 8 seconds
    const safetyTimer = setTimeout(() => { setTimedOut(true); setLoading(false); }, 8000);

    // Restore existing session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).finally(() => {
            clearTimeout(safetyTimer);
            setLoading(false);
          });
        } else {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(safetyTimer);
        setLoading(false);
      });

    // Keep in sync with auth state changes
    // NOTE: do NOT await fetchProfile here — Supabase v2 awaits onAuthStateChange callbacks,
    // which would cause signInWithPassword to hang until the DB query resolves.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        clearTimeout(safetyTimer);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Show spinner while session is being restored
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Supabase timed out — show a clear error instead of a blank screen
  if (timedOut && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-slate-800 rounded-2xl p-6 text-center border border-slate-700">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-white font-semibold mb-2">Cannot connect to server</h2>
          <p className="text-slate-400 text-sm mb-4">
            The app cannot reach the database. Check that your Supabase environment variables
            are set in Vercel and the project is not paused.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not logged in — render children without RBAC (App shows LoginPage)
  if (!user || !profile) {
    return (
      <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      <RBACProvider role={profile.role} userId={user.id}>
        {children}
      </RBACProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
