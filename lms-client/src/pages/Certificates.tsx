import React, { useEffect, useState } from 'react';
import api from '../api';

const Certificates: React.FC = () => {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/lms/users/me/certificates');
        const data = res.data;
        // Normalize to array: server may return a single object or an array
        if (Array.isArray(data)) setCerts(data);
        else if (data) setCerts([data]);
        else setCerts([]);
      } catch (err: any) {
        setError('Failed to load certificates');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="main-content"><div className="card">Loading...</div></div>;
  if (error) return <div className="main-content"><div className="card">{error}</div></div>;

  return (
    <div className="main-content">
      {/* Preview modal */}
      {previewUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
          <div style={{ width: '80%', height: '80%', background: '#fff', borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
              <button className="btn" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>Close</button>
            </div>
            <iframe title="certificate-preview" src={previewUrl} style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }} />
          </div>
        </div>
      )}
      <div className="card">
        <h2>Your Certificates</h2>
        {certs.length === 0 ? <div>No certificates yet.</div> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {certs.map(c => {
              // defensive field resolution
              const rawTitle = c?.courseTitle ?? c?.lessonTitle ?? c?.course ?? 'Certificate';
              const title = typeof rawTitle === 'string' ? rawTitle : (rawTitle?.title ?? JSON.stringify(rawTitle));
              const rawDate = c?.dateIssued ?? c?.dateTaken ?? c?.date ?? null;
              const dateString = rawDate ? new Date(rawDate).toLocaleString() : '';
              return (
                <li key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600 }}>{title || 'Certificate'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{dateString}</div>
                  <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={async (e) => {
                              e.preventDefault();
                              // preview in new tab
                              try {
                                setFetchingId(c.id);
                                const resp = await api.get(`/api/lms/users/me/certificates/${c.id}/download`, { responseType: 'blob' });
                                const blob = new Blob([resp.data as any], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                setPreviewUrl(url);
                              } catch (err) {
                                window.alert('Failed to load preview');
                              } finally {
                                setFetchingId(null);
                              }
                            }}
                            style={{ marginRight: 8 }}
                            disabled={fetchingId === c.id}
                          >
                            {fetchingId === c.id ? 'Loading…' : 'Preview'}
                          </button>
                          <button
                            className="btn"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                setFetchingId(c.id);
                                const resp = await api.get(`/api/lms/users/me/certificates/${c.id}/download`, { responseType: 'blob' });
                                const blob = new Blob([resp.data as any], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `certificate_${c.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                setTimeout(() => URL.revokeObjectURL(url), 60_000);
                              } catch (err) {
                                window.alert('Download failed');
                              } finally {
                                setFetchingId(null);
                              }
                            }}
                            disabled={fetchingId === c.id}
                          >
                            Download
                          </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Certificates;
