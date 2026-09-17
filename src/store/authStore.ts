import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import * as authService from '@/services/authService';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  initialized: boolean;
  register: (input: { firstName: string; lastName: string; email: string; phone: string; password: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'phone'>>) => Promise<void>;
}

async function profileFromSession(session: Session | null): Promise<UserProfile | null> {
  return session?.user ? authService.getCurrentProfile(session.user.id) : null;
}

export const useAuthStore = create<AuthState>((set, get) => {
  void supabase.auth.getSession().then(async ({ data }) => {
    set({ user: await profileFromSession(data.session), initialized: true, isLoading: false });
  }).catch(() => set({ initialized: true, isLoading: false }));

  supabase.auth.onAuthStateChange((_event, session) => {
    void profileFromSession(session).then((user) => set({ user, initialized: true, isLoading: false })).catch(() => set({ user: null, initialized: true, isLoading: false }));
  });

  return {
    user: null, isLoading: true, initialized: false,
    register: async (input) => { set({ isLoading: true }); try { const result = await authService.signUp(input); set({ user: result.status === 'confirmed' ? result.profile : null, isLoading: false }); return { needsEmailConfirmation: result.status !== 'confirmed' }; } catch (error) { set({ isLoading: false }); throw error; } },
    login: async (email, password) => { set({ isLoading: true }); try { await authService.signIn(email, password); } finally { set({ isLoading: false }); } },
    logout: async () => { await authService.signOut(); set({ user: null }); },
    updateProfile: async (updates) => { const current = get().user; if (!current) return; set({ user: await authService.updateProfile(current.id, updates) }); },
  };
});

export function useIsAuthenticated(): boolean { return useAuthStore((state) => Boolean(state.user)); }
export function useIsAdmin(): boolean { return useAuthStore((state) => state.user?.role === 'admin'); }
