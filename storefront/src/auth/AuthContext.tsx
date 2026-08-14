import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setStoreToken } from '../api/client';

type User = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    phone: string;
    password: string;
    email?: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await api<{ id: string; name: string; phone?: string; email?: string }>('/store/me');
      setUser({ id: me.id, name: me.name, phone: me.phone, email: me.email });
    } catch {
      setStoreToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('store_token')) {
      setLoading(false);
      return;
    }
    void refresh();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      refresh,
      logout: () => {
        setStoreToken(null);
        setUser(null);
      },
      login: async (phone, password) => {
        const res = await api<{ accessToken: string; user: User }>('/store/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        setStoreToken(res.accessToken);
        setUser(res.user);
      },
      register: async (payload) => {
        const res = await api<{ accessToken: string; user: User }>('/store/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStoreToken(res.accessToken);
        setUser(res.user);
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
