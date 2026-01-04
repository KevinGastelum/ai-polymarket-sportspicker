/**
 * useAuth Hook - Authentication State Management
 * 
 * Provides auth state and actions for React components.
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { 
  supabase, 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as authSignOut,
  getSession 
} from '../services/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
}

// DEV MODE: Set to true to skip auth for testing
// WARNING: Set to false before deploying!
const DEV_MODE_SKIP_AUTH = __DEV__ && false;

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!DEV_MODE_SKIP_AUTH); // Skip loading if dev mode

  // In dev mode, return fake auth immediately
  if (DEV_MODE_SKIP_AUTH) {
    return {
      user: { id: 'dev-user', email: 'dev@test.com' } as User,
      session: { user: { id: 'dev-user', email: 'dev@test.com' } } as Session,
      loading: false,
      isAuthenticated: true,
      signIn: async () => ({ success: true }),
      signUp: async () => ({ success: true }),
      signOut: async () => {},
    };
  }

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    getSession().then((sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [isGuest, setIsGuest] = useState(false);

  // Sign in action
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmail(email, password);
      setIsGuest(false); // Reset guest state on login
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up action
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await signUpWithEmail(email, password);
      setIsGuest(false); // Reset guest state on login
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out action
  const signOut = useCallback(async () => {
    setLoading(true);
    await authSignOut();
    setIsGuest(false); // Reset guest state on logout
    setLoading(false);
  }, []);

  // Guest login action
  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
  }, []);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    isGuest,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
  };
}
