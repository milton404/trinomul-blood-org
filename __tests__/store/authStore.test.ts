import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Auth Store (Zustand)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should initialize with default state', async () => {
    const { useAuthStore } = await import('@/store/authStore');
    
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('should set user correctly', async () => {
    const { useAuthStore } = await import('@/store/authStore');
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      aud: 'authenticated',
      role: '',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    
    useAuthStore.getState().setUser(mockUser as any);
    
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('should set role correctly', async () => {
    const { useAuthStore } = await import('@/store/authStore');
    
    useAuthStore.getState().setRole('admin');
    
    expect(useAuthStore.getState().role).toBe('admin');
  });

  it('should clear auth state correctly', async () => {
    const { useAuthStore } = await import('@/store/authStore');
    
    useAuthStore.setState({
      user: { id: '123' } as any,
      role: 'admin',
      isLoading: false,
    });
    
    useAuthStore.getState().clearAuth();
    
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
