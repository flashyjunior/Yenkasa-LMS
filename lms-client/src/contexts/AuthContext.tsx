import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

type AuthContextShape = {
  token: string | null;
  userName: string | null;
  fullName?: string | null;
  profileImageUrl?: string | null;
  isAuthenticated: boolean;
  privileges: string[];
  hasPrivilege: (p: string) => boolean;
  login: (token: string, refreshToken?: string, userName?: string, fullName?: string, profileImageUrl?: string) => Promise<void>;
  logout: (prompt?: boolean) => void;
  checkTokenValid: () => boolean;
};

export const AuthContext = createContext<AuthContextShape>({
  token: null,
  userName: null,
  isAuthenticated: false,
  privileges: [],
  hasPrivilege: () => false,
  login: async () => {},
  logout: () => {},
  checkTokenValid: () => false,
});

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh';
const USERNAME_KEY = 'auth_username';
const FULLNAME_KEY = 'auth_fullname';
const AVATAR_KEY = 'profile_image';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
  const [fullName, setFullName] = useState<string | null>(() => localStorage.getItem(FULLNAME_KEY));
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(() => localStorage.getItem(AVATAR_KEY));
  const [privileges, setPrivileges] = useState<string[]>(() => {
    try { const v = localStorage.getItem('auth_privileges'); return v ? JSON.parse(v) : []; } catch { return []; }
  });

  const isAuthenticated = Boolean(token) && checkTokenNotExpired(token);

  const login = useCallback(async (t: string, refreshToken?: string, uName?: string, fName?: string, avatar?: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    if (uName) localStorage.setItem(USERNAME_KEY, uName);
    if (fName) localStorage.setItem(FULLNAME_KEY, fName);
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar);
    setToken(t);
    setUserName(uName ?? null);
    setFullName(fName ?? null);
    setProfileImageUrl(avatar ?? null);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;

    // fetch privileges and then navigate based on access
    try {
      const res = await api.get('/api/lms/users/me/privileges');
      const p = (res.data as string[]) || [];
      setPrivileges(p);
      try { localStorage.setItem('auth_privileges', JSON.stringify(p)); } catch {}

      // decide default landing page: if user can view dashboard, go there, otherwise go to courses
  const canViewDashboard = p.includes('ViewDashboard') || p.includes('ViewAdminMenu');
      navigate(canViewDashboard ? '/' : '/courses', { replace: true });
    } catch (ex) {
      setPrivileges([]);
      try { localStorage.removeItem('auth_privileges'); } catch {}
      navigate('/courses', { replace: true });
    }
  }, [navigate]);

  const logout = useCallback((prompt = true) => {
    if (prompt) {
      try { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'You have been signed out', type: 'error', ms: 2500 } })); } catch {}
    }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(FULLNAME_KEY);
  localStorage.removeItem(AVATAR_KEY);
  localStorage.removeItem('auth_privileges');
  setToken(null);
  setUserName(null);
  setFullName(null);
  setProfileImageUrl(null);
  setPrivileges([]);
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
    // if token present, fetch privileges and refresh profile image if missing
    if (token) {
      api.get('/api/lms/users/me/privileges').then(res => { const p = (res.data as string[]) || []; setPrivileges(p); }).catch(() => setPrivileges([]));
      // refresh profile if not set
      if (!profileImageUrl || !fullName) {
        api.get('/api/lms/users/me').then(res => {
          const u = res.data as any;
          if (u?.fullName) { setFullName(u.fullName); try { localStorage.setItem(FULLNAME_KEY, u.fullName); } catch {} }
          if (u?.profileImageUrl) { setProfileImageUrl(u.profileImageUrl); try { localStorage.setItem(AVATAR_KEY, u.profileImageUrl); } catch {} }
        }).catch(() => {});
      }
    }
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
    <AuthContext.Provider value={{ token, userName, fullName, profileImageUrl, isAuthenticated, privileges, hasPrivilege: (p: string) => privileges.includes(p), login, logout, checkTokenValid }}>
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