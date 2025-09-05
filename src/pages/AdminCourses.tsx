import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link,useNavigate } from 'react-router-dom';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  function fetchData() {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    axios.get('/api/lms/admin/courses', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(res => setCourses(res.data as any[]))
    .catch(() => setError('Failed to load courses.'))

  }

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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        {courses.map(c => (
          <div key={c.id} style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '1.5rem',
            minWidth: 260,
            maxWidth: 320,
            flex: '1 1 260px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            position: 'relative',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>{c.title}</div>
            <div style={{ color: '#666', marginBottom: 12 }}>{c.description}</div>
            <div style={{ marginBottom: 12 }}>
              {c.published ? (
                <span style={{ color: 'green', fontWeight: 500 }}>[Published]</span>
              ) : (
                <span style={{ color: 'red', fontWeight: 500 }}>[Unpublished]</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                to={`/edit-course/${c.id}`}
                style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', fontSize: 15, textDecoration: 'none', fontWeight: 500 }}
              >Edit</Link>
              <button
                style={{ background: c.published ? '#f44336' : '#00bfae', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', fontSize: 15, fontWeight: 500 }}
                onClick={async () => {
                  if (c.published) {
                      await axios.put(`/api/lms/admin/courses/${c.id}`, { ...c, published: false });
                  } else {
                      await axios.put(`/api/lms/admin/courses/${c.id}/publish`);
                  }
                  fetchData();
                }}
              >{c.published ? 'Unpublish' : 'Publish'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCourses;
