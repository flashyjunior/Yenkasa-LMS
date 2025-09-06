import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

type Report = {
  id: number;
  targetType: string;
  targetId: number;
  reporterUserId: string | null;
  reason: string;
  createdAt: string;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  targetInfo?: { lessonId?: number | null; courseId?: number | null; questionId?: number | null; replyId?: number | null; snippet?: string | null };
  reporterName?: string | null;
  targetAuthorName?: string | null;
};

const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('all');
  const [q, setQ] = useState<string>('');
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/lms/admin/reports');
      // API may return a paged object { items, total, ... } or an array directly
      const data: any = res?.data ?? {};
      let rawItems: any[] = [];
      if (Array.isArray(data)) rawItems = data;
      else if (data && Array.isArray(data.items)) rawItems = data.items;
      else rawItems = [];
  // Normalize server-side PascalCase -> camelCase for JS usage
  const items = (rawItems || []).map((it: any) => ({
    ...it,
    id: it.id ?? it.Id,
    targetType: it.targetType ?? it.TargetType,
    targetId: it.targetId ?? it.TargetId,
    reporterUserId: it.reporterUserId ?? it.ReporterUserId,
    reason: it.reason ?? it.Reason,
    createdAt: it.createdAt ?? it.CreatedAt,
    isResolved: it.isResolved ?? it.IsResolved,
    resolvedBy: it.resolvedBy ?? it.ResolvedBy,
    resolvedAt: it.resolvedAt ?? it.ResolvedAt,
    targetInfo: it.targetInfo ?? it.targetInfo
  }));
  setReports(items as Report[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const resolveReport = async (id: number) => {
    try {
      await api.post(`/api/lms/admin/reports/${id}/resolve`);
      setReports(prev => prev.map(r => r.id === id ? { ...r, isResolved: true, resolvedAt: new Date().toISOString() } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = reports.filter(r => {
    if (filterType !== 'all' && r.targetType !== filterType) return false;
    if (filterResolved !== 'all') {
      const wantResolved = filterResolved === 'resolved';
      if (r.isResolved !== wantResolved) return false;
    }
    if (q && q.trim().length > 0) {
      const s = (r.reason || '') + ' ' + (r.targetInfo?.snippet || '') + ' ' + (r.reporterUserId || '');
      if (!s.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <h2>Reported Comments</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap', background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <label>Type:</label>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All</option>
          <option value="question">Question</option>
          <option value="reply">Reply</option>
        </select>
        <label>Resolved:</label>
        <select value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
          <option value="all">All</option>
          <option value="resolved">Resolved</option>
          <option value="unresolved">Unresolved</option>
        </select>
        <input placeholder="search reason/snippet" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 220, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
        <button onClick={fetchReports} style={{ padding: '8px 12px', borderRadius: 6, background: '#5146D8', color: '#fff', border: 'none' }}>Refresh</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
        <th style={{ textAlign: 'left', padding: 8 }}>Target</th>
        <th style={{ textAlign: 'left', padding: 8 }}>Snippet / Reason</th>
        <th style={{ textAlign: 'left', padding: 8 }}>Reported By</th>
        <th style={{ textAlign: 'left', padding: 8 }}>Author</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Reported At</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Resolved</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{r.id}</td>
                <td style={{ padding: 8 }}>
                  <div>{r.targetType} #{r.targetId}</div>
                  {r.targetInfo?.courseId && r.targetInfo?.lessonId && (
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => navigate(`/courses/${r.targetInfo!.courseId}/lessons/${r.targetInfo!.lessonId}?focusQuestion=${r.targetInfo!.questionId ?? ''}&focusReply=${r.targetInfo!.replyId ?? ''}`)} style={{ fontSize: 12 }}>Open lesson</button>
                    </div>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ fontSize: 13, color: '#333' }}>{r.targetInfo?.snippet || r.reason}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{r.reason}</div>
                </td>
                <td style={{ padding: 8 }}>{(r as any).reporterName ?? r.reporterUserId}</td>
                <td style={{ padding: 8 }}>{(r as any).targetAuthorName ?? ''}</td>
                <td style={{ padding: 8 }}>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{r.isResolved ? `Yes (${r.resolvedBy})` : 'No'}</td>
                <td style={{ padding: 8 }}>
                  {!r.isResolved && <button onClick={() => resolveReport(r.id)} style={{ marginRight: 8 }}>Mark Resolved</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminReports;
