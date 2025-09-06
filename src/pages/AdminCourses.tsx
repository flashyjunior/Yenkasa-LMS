import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link,useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function useDebounce<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function renderPageButtons(total: number, pageSize: number, current: number, setPage: (p:number) => void) {
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const result: React.ReactNode[] = [];
  const push = (n:number) => result.push(<button key={n} onClick={() => setPage(n)} className={`btn ${current === n ? 'active' : ''}`}>{n}</button>);
  if (pages <= 10) {
    for (let i = 1; i <= pages; i++) push(i);
    return result;
  }
  // first 2
  push(1); push(2);
  if (current > 4) result.push(<span key="e1">…</span>);
  const start = Math.max(3, current - 2);
  const end = Math.min(pages - 2, current + 2);
  for (let i = start; i <= end; i++) push(i);
  if (current < pages - 3) result.push(<span key="e2">…</span>);
  push(pages-1); push(pages);
  return result;
}

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<string>('');
  const [dir, setDir] = useState<'asc'|'desc'>('asc');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // no modal/editing state — use dedicated pages for create/edit

  useEffect(() => {
  fetchData();
  }, []);

  function fetchData() {
    setLoading(true);
    setError(null);
  api.get('/api/lms/admin/courses', { params: { page, pageSize, q: debouncedQuery, sort: sort || undefined, dir } })
    .then(res => {
      const d = res.data as any;
      setCourses(d.items || []);
      setTotal(d.total || 0);
      setLoading(false);
    })
    .catch(() => { setError('Failed to load courses.'); setToast('Failed to load courses.'); setLoading(false); });

  }

  useEffect(() => { fetchData(); }, [page, debouncedQuery, pageSize]);
  useEffect(() => { setPage(1); }, [debouncedQuery]);

  return (
    <div className="admin-dashboard card fade-in">
      <h2>Courses</h2>
      <button
        onClick={() => navigate('/admin/courses/create')}
        style={{
          background: '#00bfae',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.5rem 1.2rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        + Create Course
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div>
          <input placeholder="Search courses..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', width: 260 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ color: '#999' }}>{Math.min((page-1)*pageSize + 1, total || 0)} - {Math.min(page*pageSize, total || 0)} of {total}</div>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ padding: 6, borderRadius: 6 }}>
            <option value="">Sort</option>
            <option value="title">Title</option>
            <option value="published">Published</option>
          </select>
          <button onClick={() => { setDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }} className="btn">{dir === 'asc' ? 'Asc' : 'Desc'}</button>
          <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }} style={{ padding: 6, borderRadius: 6 }}>
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
          </select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {renderPageButtons(total, pageSize, page, setPage)}
          </div>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="btn">Prev</button>
          <button onClick={() => setPage(p => p+1)} disabled={page*pageSize >= total} className="btn">Next</button>
        </div>
      </div>
      <div className="admin-record-list" style={{ marginBottom: '2rem', marginTop: 12 }}>
        {courses.map(c => (
          <div key={c.id} className="admin-record">
            <div style={{ flex: '0 0 56px' }}>
              {c.thumbnailUrl || c.image ? (
                <img src={c.thumbnailUrl || c.image} alt={c.title} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{ width: 56, height: 40, borderRadius: 6, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.title ? c.title.charAt(0) : 'C'}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="title">{c.title}</div>
              <div className="meta" style={{ maxHeight: 120, overflow: 'auto' }}>
                {/* Render HTML description instead of raw HTML text */}
                <div dangerouslySetInnerHTML={{ __html: c.description }} />
              </div>
            </div>
            <div style={{ marginLeft: 12 }} className="meta">{c.published ? <span style={{ color: 'green' }}>Published</span> : <span style={{ color: 'red' }}>Draft</span>}</div>
            <div className="actions">
              <Link to={`/edit-course/${c.id}`} className="btn btn-sm">Edit</Link>
              <button className="btn btn-sm" style={{ background: c.published ? '#f44336' : '#00bfae', color: '#fff' }} onClick={async () => {
                if (c.published) {
                  await api.put(`/api/lms/admin/courses/${c.id}`, { ...c, published: false });
                } else {
                  await api.put(`/api/lms/admin/courses/${c.id}/publish`);
                }
                fetchData();
              }}>{c.published ? 'Unpublish' : 'Publish'}</button>
            </div>
          </div>
        ))}
      </div>
      {/* navigation to create/edit pages handled by routes */}
  <Toast message={toast} onClose={() => setToast(undefined)} />
    </div>
  );
};

export default AdminCourses;
