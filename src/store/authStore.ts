import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/types";
import * as authService from "@/services/authService";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, "firstName" | "lastName" | "phone">>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      register: async (input) => {
        set({ isLoading: true });
        try {
          const result = await authService.signUp(input);
          if (result.status === "confirmed") {
            // Session Supabase réelle : on peut connecter l'utilisateur.
            set({ user: result.profile, isLoading: false });
            return { needsEmailConfirmation: false };
          }
          // Pas de session tant que l'email n'est pas confirmé : on ne
          // connecte PAS l'utilisateur localement (il n'a pas de session
          // Supabase valide, les appels authentifiés échoueraient).
          set({ isLoading: false });
          return { needsEmailConfirmation: true };
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const user = await authService.signIn(email, password);
          set({ user, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },
      logout: () => set({ user: null }),
      updateProfile: async (updates) => {
        const current = get().user;
        if (!current) return;
        const user = await authService.updateProfile(current.id, updates);
        set({ user });
      },
    }),
    { name: "fitora-auth" }
  )
);

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => Boolean(s.user));
}

export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.user?.role === "admin");
}
