import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import './Courses.css';

interface Course {
  id: number;
  title: string;
  description: string;
  rating?: number;
  published?: boolean;
  lessons?: { id: number; title: string; duration?: number }[];
  reviews?: { user: string; comment: string }[];
  thumbnailUrl?: string;
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'subscribed'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [usersByName, setUsersByName] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<string>('');
  const [dir, setDir] = useState<'asc'|'desc'>('asc');
  const { userName, hasPrivilege } = useAuth();

  useEffect(() => {
    // load subscribed courses once
    const loadMy = async () => {
      try {
        const myResp = await api.get('/api/lms/my-courses').catch(() => ({ data: [] }));
        const rawMine: any = myResp?.data;
        const mineArr: Course[] = Array.isArray(rawMine) ? rawMine : (rawMine && Array.isArray(rawMine.items) ? rawMine.items : []);
        setMyCourses(mineArr);
      } catch (err) {
        setMyCourses([]);
      }
    };

    loadMy();
  }, []);

  // debounce helper
  function useDebounce<T>(value: T, delay = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setV(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return v;
  }

  const debouncedQuery = useDebounce(query, 400);

  function renderPageButtons(total: number, pageSize: number, current: number, setPage: (p:number) => void) {
    const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
    const result: React.ReactNode[] = [];
    const push = (n:number) => result.push(<button key={n} onClick={() => setPage(n)} className={`pager-btn ${n === current ? 'active' : ''}`}>{n}</button>);
    let start = Math.max(1, current - 2);
    let end = Math.min(pages, current + 2);
    if (start > 1) { push(1); if (start > 2) result.push(<span key="e">…</span>); }
    for (let i = start; i <= end; i++) push(i);
    if (end < pages) { if (end < pages - 1) result.push(<span key="e2">…</span>); push(pages); }
    return result;
  }

  // fetch courses whenever paging/search/sort changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const params: any = { page, pageSize, q: debouncedQuery || undefined, sort: sort || undefined, dir };
        // Only add createdBy for instructors (not students or admins)
        if (
          userName &&
          !(hasPrivilege && hasPrivilege('ViewAdminMenu')) &&
          (hasPrivilege && hasPrivilege('Instructor'))
        ) {
          params.createdBy = userName;
        }
        // For students and admins, do NOT add createdBy

        // fetch courses and users in parallel so we can show instructor full names
        const [res, usersRes] = await Promise.all([
          api.get('/api/lms/courses', { params }),
          api.get('/api/lms/users').catch(() => ({ data: [] }))
        ] as const);

        const d: any = res.data;
        const arr: Course[] = Array.isArray(d) ? d : (d && Array.isArray(d.items) ? d.items : []);

        // build username -> fullName map
        try {
          const rawUsers: any = usersRes?.data ?? [];
          const usersArr: any[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers && Array.isArray(rawUsers.items) ? rawUsers.items : []);
          const map: Record<string, string> = {};
          usersArr.forEach(u => {
            const uname = u?.userName || u?.userName?.toString?.() || u?.id || '';
            if (!uname) return;
            map[uname] = u?.fullName || u?.fullName?.toString?.() || uname;
          });
          if (mounted) setUsersByName(map);
        } catch { /* ignore user map errors */ }

        if (!mounted) return;
        setCourses(arr.filter(c => (c as any).published));
        setTotal(d.total || (Array.isArray(d) ? d.length : arr.length));
      } catch (err) {
        if (!mounted) return;
        setCourses([]);
        setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [page, pageSize, debouncedQuery, sort, dir]);

  const renderStars = (rating: number = 0) => (
    <span style={{ color: '#FFD700', fontSize: '1.2rem' }}>
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))}
    </span>
  );

  const getMockReviews = (course: Course) =>
    course.reviews || [
      { user: 'Jane Doe', comment: 'Great course!' },
      { user: 'John Smith', comment: 'Very helpful and well explained.' }
    ];

  const displayed = activeTab === 'all' ? courses : myCourses;

  return (
    <div className="main-content">
      <div className="courses-list-enhanced">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <h2>Featured Courses</h2>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            >
              All Published
            </button>
            <button
              onClick={() => setActiveTab('subscribed')}
              className={`tab-btn ${activeTab === 'subscribed' ? 'active' : ''}`}
            >
              Subscribed
            </button>
          </div>
          <div className="courses-controls">
            <input className="search-input" placeholder="Search courses..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            <select className="page-size-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}>
              <option value={6}>6 / page</option>
              <option value={9}>9 / page</option>
              <option value={12}>12 / page</option>
            </select>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ color: '#6b7280' }}>Sort:</label>
              <select className="page-size-select" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="">Default</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
              </select>
              <button className="pager-btn" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}>{dir === 'asc' ? 'Asc' : 'Desc'}</button>
            </div>
          </div>
        </div>
      </div>

  {loading ? (
        <p>Loading...</p>
      ) : displayed.length === 0 ? (
        <div style={{ padding: 16 }}>
          {activeTab === 'all' ? <p>No published courses found.</p> : <p>You have no subscribed courses.</p>}
        </div>
      ) : (
        <div className="courses-grid compact-grid">
          {displayed.map(course => {
            // some endpoints (my-courses) return a wrapper like { id, course: { ... } }
            const raw: any = course as any;
            const actual = raw.course ?? raw;
            const instructorUsername = actual.instructor || actual.createdBy || 'Instructor';
            // Prefer an explicit instructor full name on the course when available,
            // otherwise fall back to the usersByName map (which maps username -> fullName),
            // then to the raw username.
            const instructor = actual.instructorFullName || usersByName[instructorUsername] || instructorUsername || 'Instructor';
            const rating = typeof actual.rating === 'number' ? actual.rating : (actual.avgRating ?? 4);
            const reviewsCount = actual.reviewsCount ?? (Array.isArray(actual.reviews) ? actual.reviews.length : 0);
            const thumb = actual.thumbnailUrl || actual.image || actual.thumbnail || raw.thumbnailUrl || raw.image || '/images/default-course-thumbnail.svg';
            const title = actual.title || raw.title || 'Untitled course';
            const courseId = actual.id ?? raw.id;

            return (
              <Link to={`/courses/${courseId}`} key={courseId} className="course-card compact card-link">
                {thumb ? (
                  <div className="thumb-wrap">
                    <img src={thumb} alt={title} className="course-thumb" />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 200, background: '#eee' }} />
                )}

                <div className="card-body">
                  <div className="course-title" title={title}>{title}</div>
                  <div className="course-instructor">{instructor}</div>
                  <div className="course-meta">
                    <span className="thumb-rating">{renderStars(rating)}</span>
                    {reviewsCount ? <span className="rating-count"> ({reviewsCount})</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default Courses;
