import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const TOKEN_KEY = 'recruiter_token';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((t: string | null) => {
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    }
    setTokenState(t);
    if (!t) setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    setTokenState(t);
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data as User);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await axios.post('/api/auth/login', { email, password });
      const t = res.data.access_token;
      setToken(t);
      setUser(res.data.user as User);
    },
    [setToken]
  );

  const setup = useCallback(
    async (email: string, password: string) => {
      const res = await axios.post('/api/auth/setup', { email, password });
      const t = res.data.access_token;
      setToken(t);
      setUser(res.data.user as User);
    },
    [setToken]
  );

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, setup, logout, setToken, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
