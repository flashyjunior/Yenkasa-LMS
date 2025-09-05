import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

type AuthContextShape = {
  token: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken?: string, userName?: string) => void;
  logout: (prompt?: boolean) => void;
  checkTokenValid: () => boolean;
};

export const AuthContext = createContext<AuthContextShape>({
  token: null,
  userName: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  checkTokenValid: () => false,
});

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh';
const USERNAME_KEY = 'auth_username';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));

  const isAuthenticated = Boolean(token) && checkTokenNotExpired(token);

  const login = useCallback((t: string, refreshToken?: string, uName?: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (uName) localStorage.setItem(USERNAME_KEY, uName);
    setToken(t);
    setUserName(uName ?? null);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    navigate('/', { replace: true });
  }, [navigate]);

  const logout = useCallback((prompt = true) => {
    if (prompt) {
      try { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'You have been signed out', type: 'error', ms: 2500 } })); } catch {}
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setToken(null);
    setUserName(null);
    delete api.defaults.headers.common['Authorization'];
    navigate('/login', { replace: true });
  }, [navigate]);

  const checkTokenValid = useCallback(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    return Boolean(t) && checkTokenNotExpired(t);
  }, []);

  useEffect(() => {
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete api.defaults.headers.common['Authorization'];
  }, [token]);

  useEffect(() => {
    const iv = setInterval(() => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t && !checkTokenNotExpired(t)) {
        logout(true);
      }
    }, 30_000);
    return () => clearInterval(iv);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, userName, isAuthenticated, login, logout, checkTokenValid }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}

// default export for compatibility with older imports
export default AuthContext;

function checkTokenNotExpired(jwt: string | null): boolean {
  if (!jwt) return false;
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const exp = payload.exp;
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return exp > now + 5;
  } catch (ex) {
    console.error('checkTokenNotExpired parse error', ex);
    return false;
  }
}