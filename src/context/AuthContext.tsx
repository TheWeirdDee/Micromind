'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (username: string, email: string, password: string, rememberMe: boolean) => Promise<void>;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkUsername: (username: string) => Promise<'available' | 'taken' | 'error'>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUsername = useCallback(async (username: string): Promise<'available' | 'taken' | 'error'> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();
      return data ? 'taken' : 'available';
    } catch {
      return 'error';
    }
  }, []);

  const signUp = useCallback(async (username: string, email: string, password: string, rememberMe: boolean) => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check username
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();
    if (existingUsername) throw new Error('Username already taken. Please choose another.');

    // Check email
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existingEmail) throw new Error('An account with this email already exists. Try logging in.');

    // Create auth user
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Signup failed. Please try again.');

    // Sign in immediately to get an authenticated session before inserting the profile.
    // This is required because signUp() alone does not establish a session when email
    // confirmation is enabled — auth.uid() would be null and the RLS INSERT would 401.
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (loginError) {
      throw new Error('Account created! Please check your email to verify, then log in.');
    }

    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (!freshSession?.user) throw new Error('Authentication session missing after signup.');

    // Insert profile row — now authenticated so RLS passes
    const { error: profileError } = await supabase.from('profiles').insert({
      id: freshSession.user.id,
      username: cleanUsername,
      email: cleanEmail,
    });
    if (profileError) throw new Error('Could not save profile. Please try again.');

    // Seed local profile so settings page shows name/email immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('mm_user_profile', JSON.stringify({
        name: cleanUsername,
        email: cleanEmail,
        goals: [],
        loginMethod: 'credentials',
        onboardedAt: Date.now(),
      }));
    }

    if (!rememberMe) {
      sessionStorage.setItem('mm_no_persist', '1');
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw new Error('Incorrect email or password. Please try again.');

    // Seed local profile if not already set (e.g. logging in on a new device)
    if (typeof window !== 'undefined' && !localStorage.getItem('mm_user_profile')) {
      localStorage.setItem('mm_user_profile', JSON.stringify({
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        goals: [],
        loginMethod: 'credentials',
        onboardedAt: Date.now(),
      }));
    }

    if (!rememberMe) {
      sessionStorage.setItem('mm_no_persist', '1');
    }
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('mm_no_persist');
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/app/reset-password` : undefined,
    });
    if (error) throw new Error(error.message);
  }, []);

  // Sign out if user chose not to persist and this is a new page load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const noPersist = sessionStorage.getItem('mm_no_persist');
    if (!noPersist && user) {
      // If mm_no_persist isn't set, session came from localStorage (persistent) — keep it
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, login, logout, checkUsername, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
