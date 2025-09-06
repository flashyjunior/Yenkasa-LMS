import React, { useState, useContext } from 'react';
import api, { setAuthToken } from '../api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

import './Login.css';

interface LoginResponse { token?: string; refreshToken?: string; userName?: string; }

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Use PUBLIC_URL so webpack doesn't try to resolve the file from src
  const bgUrl = `${process.env.PUBLIC_URL || ''}/assets/login-bg.jpg`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post<LoginResponse>('/api/lms/login', { username, password }) as any;
      const data: LoginResponse = res?.data || {};
      if (data && data.token) {
        // persist token immediately for subsequent requests
        setAuthToken(data.token);
        // forward fullName and profileImageUrl if provided by backend
        await login(data.token, data.refreshToken, data.userName ?? username, (data as any).fullName, (data as any).profileImageUrl);
      } else {
        setError('Invalid credentials');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
      (window as any).showAppToast?.(String(err?.response?.data || 'Login failed'), 'error');
    }
  };

  return (
    <div className="login-root">
      <div className="login-card" role="region" aria-label="Login">
        <div className="login-left">
          <div className="login-brand">
            <h1>TheCubeFactory</h1>
            <p className="subtitle">Welcome back — please enter your details</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <label>
              <span className="label-text">Username or email</span>
              <input type="text" placeholder="Username or email" value={username} onChange={e => setUsername(e.target.value)} required />
            </label>

            <label>
              <span className="label-text">Password</span>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>

            <div className="login-actions">
              <button type="submit" className="btn-primary">Login</button>
              <button type="button" onClick={() => navigate('/register')}>Sign up</button>
            </div>
              <div style={{ marginTop: 8 }}>
                <button type="button" className="link-like" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
              </div>

            {error && <div className="login-error" role="alert">{error}</div>}
          </form>
        </div>

        <div
          className="login-right"
          style={{ backgroundImage: `url("${bgUrl}")` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default Login;
