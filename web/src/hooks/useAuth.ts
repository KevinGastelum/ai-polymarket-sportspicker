"use client";

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signInWithEmail, signUpWithEmail, signOut as authSignOut, getSession } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmail(email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await signUpWithEmail(email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await authSignOut();
    setLoading(false);
  }, []);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
  };
}
