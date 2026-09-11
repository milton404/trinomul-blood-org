'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { serverGetProfileByEmail } from '@/lib/db-actions';

interface MockUser {
  id: number;
  email: string;
  aud: string;
  role?: string;
}

const SESSION_KEY = 'bloodbank_session';

export function saveSession(email: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setRole, setIsLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        let emailToCheck = null;

        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            emailToCheck = parsed.email;
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        }

        if (!emailToCheck) {
          setIsLoading(false);
          return;
        }

        const profile = await serverGetProfileByEmail(emailToCheck) as any;

        if (profile) {
          const mockUser: MockUser = {
            id: profile.id,
            email: profile.email,
            aud: 'authenticated',
            role: profile.role,
          };

          setUser(mockUser as any);
          setRole(profile.role);
        } else {
          clearSession();
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [setUser, setRole, setIsLoading]);

  return <>{children}</>;
}
