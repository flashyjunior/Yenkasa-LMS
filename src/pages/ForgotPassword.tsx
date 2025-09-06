import React, { useState } from 'react';
import api from '../api';
import '../components/Modal.css'; // ensure loader CSS is available
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const navigate = useNavigate();

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email?.trim()) {
      (window as any).showAppToast?.('Please enter your email address', 'error');
      return;
    }

    // show top-right toast + loader
    (window as any).showAppToast?.('Sending password reset email…', 'info');
    setSending(true);
    try {
      await api.post('/api/lms/auth/forgot-password', { email: email.trim() });

      // show inline confirmation alert (do not navigate away)
      setShowConfirmation(true);
      (window as any).showAppToast?.('Password reset email sent. Check your inbox.', 'success');
      setEmail('');
    } catch (ex: any) {
      const msg = String(ex?.response?.data || ex?.message || 'Failed to send password reset email');
      (window as any).showAppToast?.(msg, 'error');
      console.warn('ForgotPassword send failed:', ex?.response || ex);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="forgot-password-page" style={{ maxWidth: 520, margin: '2rem auto' }}>
      <h2>Forgot Password</h2>

      {/* Inline confirmation alert (top of page) */}
      {showConfirmation && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, background: '#e6ffed', border: '1px solid #b9f1c7', color: '#08320b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Check your inbox</strong>
              <div style={{ marginTop: 6 }}>We have sent a password reset link to your email address. Follow the instructions in the email to reset your password.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                onClick={() => { setShowConfirmation(false); }}
                style={{ background: '#fff' }}
              >
                Dismiss
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={sending}
            required
          />
        </label>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send reset link'}
          </button>
        </div>
      </form>

      {/* global full-screen loader while sending (uses Modal.css .global-loader-overlay/.spinner) */}
      {sending && (
        <div className="global-loader-overlay" role="status" aria-live="polite">
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div className="spinner" />
            <div style={{ marginTop: 10, fontWeight: 600 }}>Sending password reset email…</div>
          </div>
        </div>
      )}
    </div>
  );
}
