import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AdminListStyles.css';

interface SmtpForm {
  SmtpHost: string;
  SmtpPort: number;
  EnableSsl: boolean;
  User: string;
  Password: string;
  From: string;
}

interface SmtpApiResponse {
  SmtpHost?: string;
  SmtpPort?: number;
  EnableSsl?: boolean;
  User?: string;
  From?: string;
}

function mapApiToForm(api: SmtpApiResponse): SmtpForm {
  // API may return camelCase (smtpHost) or PascalCase (SmtpHost) depending on server serializer.
  // Normalize both possibilities.
  const anyApi = api as any;
  const smtpHost = anyApi.SmtpHost ?? anyApi.smtpHost ?? '';
  const smtpPort = anyApi.SmtpPort ?? anyApi.smtpPort ?? 587;
  const enableSsl = anyApi.EnableSsl ?? anyApi.enableSsl ?? true;
  const user = anyApi.User ?? anyApi.user ?? '';
  const from = anyApi.From ?? anyApi.from ?? '';
  return { SmtpHost: smtpHost, SmtpPort: smtpPort, EnableSsl: enableSsl, User: user, Password: '', From: from };
}

const SMTPSettings: React.FC = () => {
  const { hasPrivilege } = useAuth();
  const defaultForm: SmtpForm = { SmtpHost: '', SmtpPort: 587, EnableSsl: true, User: '', Password: '', From: '' };
  const [form, setForm] = useState<SmtpForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  // password is write-only; we don't expose presence in the UI

  // Only load SMTP settings after auth/privileges are resolved so the request includes the auth token.
  useEffect(() => {
    try {
      if (hasPrivilege && hasPrivilege('ViewAdminMenu')) {
        load();
      }
    } catch {
      // if hasPrivilege is not ready or throws, don't call load yet
    }
  }, [hasPrivilege]);

  async function load() {
    setLoading(true);
      try {
  const res = await api.get<SmtpApiResponse>('/api/admin/config/smtp');
      if (res.data) {
        const data = mapApiToForm(res.data);
        setForm({ ...defaultForm, ...data });
      }
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to load'), 'error');
    } finally { setLoading(false); }
  }

  async function save() {
    setLoading(true);
    try {
      // Only send Password when user provided a value — otherwise don't overwrite stored password
      const payload: any = { ...form };
      if (!form.Password) delete payload.Password;

  const res = await api.post<SmtpApiResponse>('/api/admin/config/smtp', payload);
      // api returns saved config with PasswordPresent flag
      if (res && res.data) {
        const data = mapApiToForm(res.data);
        setForm({ ...defaultForm, ...data });
      }
      (window as any).showAppToast?.('SMTP settings saved', 'success');
    } catch (ex: any) {
      (window as any).showAppToast?.(String(ex?.response?.data || ex?.message || 'Failed to save'), 'error');
    } finally { setLoading(false); }
  }

  if (!hasPrivilege || !hasPrivilege('ViewAdminMenu')) return <div>You are not authorized to view this page.</div>;

  return (
    <div className="main-content">
      <h1>SMTP Settings</h1>
      <div style={{ maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            Host
            <input value={form.SmtpHost} onChange={e => setForm({ ...form, SmtpHost: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            Port
            <input type="number" value={String(form.SmtpPort)} onChange={e => setForm({ ...form, SmtpPort: Number(e.target.value) })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            Use SSL
            <select value={String(form.EnableSsl)} onChange={e => setForm({ ...form, EnableSsl: e.target.value === 'true' })}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            From Address
            <input value={form.From} onChange={e => setForm({ ...form, From: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            Username
            <input value={form.User} onChange={e => setForm({ ...form, User: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            Password
            <input value={form.Password} onChange={e => setForm({ ...form, Password: e.target.value })} type="password" />
            {/* password is write-only; leave blank to keep current password */}
          </label>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div style={{ marginTop: 12, color: '#666' }}>These settings will be used to send system emails (password reset, welcome, certificates).</div>
      </div>
    </div>
  );
};

export default SMTPSettings;
