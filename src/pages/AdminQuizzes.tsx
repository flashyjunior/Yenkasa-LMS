import React, { useEffect, useState } from 'react';
import './AdminListStyles.css';
import { Link } from 'react-router-dom';
import api from '../api';

interface Quiz {
  id: number;
  title: string;
  lessonTitle?: string;
  published?: boolean;
}

const AdminQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/lms/admin/quizzes')
      .then(res => {
        setQuizzes(res.data as Quiz[]);
        setLoading(false);
      })
      .catch(() => {
        // ignore - show empty state
        setLoading(false);
      });
  }, []);

  return (
    <div className="main-content">
      <div className="admin-list-page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Quizzes</h2>
        <Link to="/create-quiz" className="btn btn-primary">+ Add New Quiz</Link>
      </div>
      {loading ? (
        <div className="loader">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="empty-state">No quizzes found. <Link to="/create-quiz">Create your first quiz</Link>.</div>
      ) : (
        <div className="admin-card-list">
          {quizzes.map(quiz => (
            <div className="admin-card" key={quiz.id}>
              <div className="admin-card-header">
                <h3>{quiz.title}</h3>
                <span className={quiz.published ? 'status published' : 'status draft'}>{quiz.published ? 'Published' : 'Draft'}</span>
              </div>
              <div className="admin-card-meta">
                <span>Lesson: <b>{quiz.lessonTitle || '-'}</b></span>
              </div>
              <div className="admin-card-actions">
                <Link to={`/edit-quiz/${quiz.id}`} className="btn btn-sm">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminQuizzes;
