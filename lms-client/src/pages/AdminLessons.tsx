import React, { useEffect, useState } from 'react';
import './AdminListStyles.css';
import { Link } from 'react-router-dom';
import api from '../api';
import Toast from '../components/Toast';

function useDebounce<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
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
  push(1); push(2);
  if (current > 4) result.push(<span key="e1">…</span>);
  const start = Math.max(3, current - 2);
  const end = Math.min(pages - 2, current + 2);
  for (let i = start; i <= end; i++) push(i);
  if (current < pages - 3) result.push(<span key="e2">…</span>);
  push(pages-1); push(pages);
  return result;
}

interface Lesson {
  id: number;
  title: string;
  courseTitle?: string;
  published?: boolean;
}

const AdminLessons: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<string>('');
  const [dir, setDir] = useState<'asc'|'desc'>('asc');

  useEffect(() => {
    setLoading(true);
  api.get('/api/lms/lessons', { params: { page, pageSize, q: debouncedQuery, sort: sort || undefined, dir } })
      .then(res => {
        const d = res.data as any;
        setLessons(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => { setToast('Failed to load lessons'); setLoading(false); });
  }, [page, debouncedQuery, pageSize]);

  useEffect(() => { setPage(1); }, [debouncedQuery]);

  return (
    <div className="main-content">
      <div className="admin-list-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Lessons</h2>
          <input placeholder="Search lessons..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: '#999' }}>{Math.min((page-1)*pageSize + 1, total || 0)} - {Math.min(page*pageSize, total || 0)} of {total}</div>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ padding: 6, borderRadius: 6 }}>
            <option value="">Sort</option>
            <option value="title">Title</option>
            <option value="coursetitle">Course</option>
            <option value="published">Published</option>
          </select>
          <button onClick={() => { setDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }} className="btn">{dir === 'asc' ? 'Asc' : 'Desc'}</button>
          <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }} style={{ padding: 6, borderRadius: 6 }}>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            {renderPageButtons(total, pageSize, page, setPage)}
          </div>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="btn">Prev</button>
          <button onClick={() => setPage(p => p+1)} disabled={page*pageSize >= total} className="btn">Next</button>
          <Link to="/create-lesson" className="btn btn-primary">+ Add New Lesson</Link>
        </div>
      </div>
      {loading ? (
        <div className="loader">Loading lessons...</div>
      ) : lessons.length === 0 ? (
        <div className="empty-state">No lessons found. <Link to="/create-lesson">Create your first lesson</Link>.</div>
      ) : (
        <div className="admin-card-list">
          {lessons.map(lesson => (
            <div className="admin-card" key={lesson.id}>
              <div className="admin-card-header">
                <h3>{lesson.title}</h3>
                <span className={lesson.published ? 'status published' : 'status draft'}>{lesson.published ? 'Published' : 'Draft'}</span>
              </div>
              <div className="admin-card-meta">
                <span>Course: <b>{lesson.courseTitle || '-'}</b></span>
              </div>
              <div className="admin-card-actions">
                <Link to={`/edit-lesson/${lesson.id}`} className="btn btn-sm">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminLessons;
