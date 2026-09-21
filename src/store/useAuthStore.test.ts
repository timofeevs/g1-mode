import { useAuthStore } from '@/store/useAuthStore';

/**
 * Auth store tests. The store is deliberately dormant when Supabase is not
 * configured, so these verify the no-op path is safe and that `clearSession`
 * resets mirror state without throwing.
 */

beforeEach(() => {
  useAuthStore.setState({
    configured: false,
    hydrated: false,
    userId: null,
    phone: null,
    busy: false,
    error: null,
  });
});

describe('useAuthStore (unconfigured)', () => {
  it('restoreSession resolves signed-out without throwing', async () => {
    await useAuthStore.getState().restoreSession();
    const state = useAuthStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.userId).toBeNull();
    expect(state.busy).toBe(false);
    expect(state.error).toBeNull();
  });

  it('clearSession resets mirror state without throwing', async () => {
    useAuthStore.setState({ userId: 'user-1', phone: '+14165551234', hydrated: true });
    await useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.userId).toBeNull();
    expect(state.phone).toBeNull();
    expect(state.hydrated).toBe(true);
    expect(state.busy).toBe(false);
  });

  it('exposes configured=false when no env is present', () => {
    expect(useAuthStore.getState().configured).toBe(false);
  });
});
