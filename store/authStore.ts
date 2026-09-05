import { create } from 'zustand';

/**
 * Lightweight auth user shape. Replaces the previous dependency on
 * `@supabase/supabase-js`'s `User` type now that auth is handled by our own
 * JWT/session-cookie flow (see `lib/auth/`). Only the fields actually used by
 * the UI are kept.
 */
export interface AuthUser {
  id: number | string;
  email?: string;
  aud?: string;
  role?: string;
}

interface AuthState {
  user: AuthUser | null;
  role: string | null;
  setUser: (user: AuthUser | null) => void;
  setRole: (role: string | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ user: null, role: null, isLoading: false }),
}));
