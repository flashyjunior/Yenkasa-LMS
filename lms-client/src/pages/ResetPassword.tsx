import React, { useState, useMemo } from 'react';
import './UserManagement.css';
import api from '../api';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [search] = useSearchParams();
  const navigate = useNavigate();

  // token and userId can be supplied in query string by email link
  const userId = search.get('userId') || '';
  const token = search.get('token') || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    // Enforce same client-side password policy as user management
    if (!isStrongPassword(password)) {
      setStatus('Password does not meet policy: 8+ chars, uppercase, digit and symbol required.');
      return;
    }
    try {
      await api.post('/api/lms/auth/reset-password', { userId, token, newPassword: password });
      setStatus('Password reset successful.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setStatus((err?.response?.data) || 'Failed to reset password');
    }
  };

  const calcPwScore = (p: string) => {
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[!@#\$%\^&\*\(\)_\+\-=`~\[\]\{\};:'"\\|,.<>\/?]/.test(p)) score += 1;
    return score;
  };

  const isStrongPassword = (p: string) => calcPwScore(p) === 4 && p.length >= 8;

  const pwFillWidth = useMemo(() => `${Math.min(100, calcPwScore(password) * 25)}%`, [password]);

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto' }}>
      <h2>Reset Password</h2>
      <form onSubmit={submit}>
        {!userId && (
          <>
            <label htmlFor="userId">User Id</label>
            <input id="userId" value={userId} readOnly />
          </>
        )}
        {!token && (
          <>
            <label htmlFor="token">Token</label>
            <input id="token" value={token} readOnly />
          </>
        )}
        <label htmlFor="password">New password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <div className="pw-strength">
          <div className="pw-meter">
            <div className="pw-meter-fill" style={{ width: pwFillWidth }} />
          </div>
          <ul className="pw-checklist">
            <li className={password.length >= 8 ? 'ok' : ''}>At least 8 characters</li>
            <li className={/[A-Z]/.test(password) ? 'ok' : ''}>Uppercase letter (A-Z)</li>
            <li className={/[0-9]/.test(password) ? 'ok' : ''}>A number (0-9)</li>
            <li className={/[!@#\$%\^&\*\(\)_\+\-=`~\[\]\{\};:'"\\|,.<>\/?]/.test(password) ? 'ok' : ''}>A symbol</li>
          </ul>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="btn-save">Set password</button>
          <button type="button" onClick={() => navigate('/login')} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
};

export default ResetPassword;
