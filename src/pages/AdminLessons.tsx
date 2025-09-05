import React, { useEffect, useState } from 'react';
import './AdminListStyles.css';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Lesson {
  id: number;
  title: string;
  courseTitle?: string;
  published?: boolean;
}

const AdminLessons: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/lms/lessons')
      .then(res => {
        setLessons(res.data as Lesson[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="admin-list-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Lessons</h2>
        <Link to="/create-lesson" className="btn btn-primary">+ Add New Lesson</Link>
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
  );
};

export default AdminLessons;
