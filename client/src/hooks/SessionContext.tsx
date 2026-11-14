// Keeps track of who is signed in, for every page.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDTO } from '@riverbound/shared';
import { ApiError } from '../services/apiClient.ts';
import { authApi } from '../services/gameApi.ts';

type SessionStatus = 'checking' | 'signed_in' | 'signed_out' | 'unreachable';

type SessionValue = {
  status: SessionStatus;
  user: UserDTO | null;
  refresh: () => Promise<void>;
  setUser: (user: UserDTO) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [user, setUserState] = useState<UserDTO | null>(null);

  const refresh = useCallback(async () => {
    setStatus('checking');
    try {
      const { user: current } = await authApi.session();
      setUserState(current);
      setStatus('signed_in');
    } catch (error) {
      setUserState(null);
      // A network problem is NOT the same as "signed out": the Splash page shows Retry instead.
      setStatus(error instanceof ApiError && error.status === 401 ? 'signed_out' : 'unreachable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      refresh,
      setUser: (next) => {
        setUserState(next);
        setStatus('signed_in');
      },
      signOut: async () => {
        await authApi.logout().catch(() => undefined);
        setUserState(null);
        setStatus('signed_out');
      },
    }),
    [status, user, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
