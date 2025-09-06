import React, { useEffect, useState } from 'react';
import api from '../api';
import './AdminAnnouncementsBadges.css';

const AdminAnnouncementsBadges: React.FC = () => {
  const [cfg, setCfg] = useState<any>({ enabled: false, text: '', speed: 60, textColor: '#ffffff', backgroundColor: '#111827' });
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [newBadge, setNewBadge] = useState({ name: '', description: '', iconUrl: '' });
  const [award, setAward] = useState({ userId: '', badgeId: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => { loadCfg(); loadBadges(); }, []);

  const loadCfg = async () => { setLoadingCfg(true); try { const res = await api.get('/api/lms/admin/announcements'); if (res?.data) setCfg(res.data); } catch (e) {} finally { setLoadingCfg(false); } };
  const saveCfg = async () => { try { await api.put('/api/lms/admin/announcements', cfg); setMessage('Saved'); setTimeout(() => setMessage(''), 2000); } catch (e:any) { setMessage(e?.response?.data || 'Save failed'); } };

  const loadBadges = async () => { try { const res = await api.get('/api/lms/admin/badges'); setBadges(Array.isArray(res.data) ? res.data : []); } catch { setBadges([]); } };
  const createBadge = async () => { try { const res = await api.post('/api/lms/admin/badges', newBadge); setMessage('Badge created'); setNewBadge({ name: '', description: '', iconUrl: '' }); await loadBadges(); } catch (e:any) { setMessage(e?.response?.data || 'Create failed'); } };
  const awardBadge = async () => { try { await api.post('/api/lms/admin/badges/award', award); setMessage('Badge awarded'); setAward({ userId: '', badgeId: 0 }); } catch (e:any) { setMessage(e?.response?.data || 'Award failed'); } };

  return (
    <div className="main-content">
      <div className="announcements-container">
      <h2>Announcements</h2>
      {loadingCfg ? <div>Loading...</div> : (
        <div className="announcements-panel">
          <label className="form-row"><input type="checkbox" checked={!!cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} /> Enabled</label>
          <label className="form-label">Text</label>
          <textarea className="textarea" value={cfg.text || ''} onChange={e => setCfg({ ...cfg, text: e.target.value })} rows={4} />
          <div className="form-row">
            <div className="form-col">
              <label className="form-label">Speed (s)</label>
              <input className="input-small" type="number" value={cfg.speed || 60} onChange={e => setCfg({ ...cfg, speed: Number(e.target.value || 60) })} />
            </div>
            <div className="form-col">
              <label className="form-label">Text color</label>
              <input className="input-medium" value={cfg.textColor || '#ffffff'} onChange={e => setCfg({ ...cfg, textColor: e.target.value })} />
            </div>
            <div className="form-col">
              <label className="form-label">Background</label>
              <input className="input-medium" value={cfg.backgroundColor || '#111827'} onChange={e => setCfg({ ...cfg, backgroundColor: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <button onClick={saveCfg} className="btn-save">Save Announcements</button>
            <div className="message-ok">{message}</div>
          </div>
        </div>
      )}

      <hr style={{ margin: '16px 0' }} />

      <h2>Badges</h2>
      <div className="panel-flex">
        <div className="panel-column">
          <h4>Create badge</h4>
          <label>Name</label>
          <input className="input" value={newBadge.name} onChange={e => setNewBadge({ ...newBadge, name: e.target.value })} />
          <label>Description</label>
          <input className="input" value={newBadge.description} onChange={e => setNewBadge({ ...newBadge, description: e.target.value })} />
          <label>Icon URL</label>
          <input className="input" value={newBadge.iconUrl} onChange={e => setNewBadge({ ...newBadge, iconUrl: e.target.value })} />
          <div className="create-button">
            <button onClick={createBadge}>Create Badge</button>
          </div>
        </div>

        <div className="panel-column">
          <h4>Award badge</h4>
          <label>User ID</label>
          <input className="input" value={award.userId} onChange={e => setAward({ ...award, userId: e.target.value })} />
          <label>Badge</label>
          <select className="input" value={award.badgeId || 0} onChange={e => setAward({ ...award, badgeId: Number(e.target.value) })}>
            <option value={0}>Select badge</option>
            {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="create-button">
            <button onClick={awardBadge}>Award Badge</button>
          </div>
        </div>
      </div>

      <hr style={{ margin: '16px 0' }} />
      <h4>Existing badges</h4>
      <div className="badges-grid">
        {badges.map(b => (
          <div key={b.id} className="badge-card">
            <div style={{ fontWeight: 700 }}>{b.name}</div>
            <div style={{ color: '#666' }}>{b.description}</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsBadges;
