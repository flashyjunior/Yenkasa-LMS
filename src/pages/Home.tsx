import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api';
import { Link } from 'react-router-dom';

interface ActivityItem {
  type: string;
  message: string;
  date: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, courses: 0, lessons: 0, quizzes: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const usersRes = await api.get('/api/lms/users');
        const coursesRes = await axios.get('/api/lms/courses');
        const lessonsRes = await axios.get('/api/lms/lessons');
        const quizzesRes = await axios.get('/api/lms/quizzes');
        setStats({
          users: (usersRes.data as any[]).length,
          courses: (coursesRes.data as any[]).length,
          lessons: (lessonsRes.data as any[]).length,
          quizzes: (quizzesRes.data as any[]).length,
        });
        setActivity([
          { type: 'course', message: 'New course "React Basics" created', date: '2025-08-13' },
          { type: 'lesson', message: 'Lesson "Intro to Components" added', date: '2025-08-13' },
          { type: 'quiz', message: 'Quiz "React Fundamentals" taken', date: '2025-08-12' },
          { type: 'user', message: 'User "Jane Smith" registered', date: '2025-08-12' },
        ]);
      } catch (err: any) {
          if (err.response && err.response.status === 403) {
            setStats({ users: 0, courses: 0, lessons: 0, quizzes: 0 });
            setActivity([]);
            setError('You are not authorized to view this data. Please log in with the correct permissions.');
          } else {
            setError('An error occurred while loading dashboard data.');
          }
        } finally {
          setLoading(false);
        }
      }
      fetchStats();
    }, []);

    if (error) {
      return (
        <div className="main-content">
          <div className="dashboard fade-in">
            <h1 style={{ marginBottom: '2rem', color: 'red' }}>Error</h1>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="main-content">
        <div className="dashboard fade-in">
          <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
          <div className="dashboard-widgets" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            <div className="dashboard-card" style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <h3>Users</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#6c63ff' }}>{stats.users}</div>
            </div>
            <div className="dashboard-card" style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <h3>Courses</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#00bfae' }}>{stats.courses}</div>
            </div>
            <div className="dashboard-card" style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <h3>Lessons</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#5146d8' }}>{stats.lessons}</div>
            </div>
            <div className="dashboard-card" style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '2rem', textAlign: 'center' }}>
              <h3>Quizzes</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#ff9800' }}>{stats.quizzes}</div>
            </div>
          </div>
          <div className="dashboard-section" style={{ marginBottom: '2rem' }}>
            <h2>Recent Activity</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {activity.length === 0 ? (
                  <li style={{ color: '#b0b8c1' }}>No recent activity yet.</li>
                ) : (
                  activity.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '0.7rem', color: '#23272f' }}>
                      <span style={{ fontWeight: 500, marginRight: 8 }}>{item.type.toUpperCase()}</span>
                      {item.message} <span style={{ color: '#b0b8c1', marginLeft: 8 }}>{item.date}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', padding: 0 }}>
            <li><Link to="/courses" style={{ color: '#6c63ff', fontWeight: 500 }}>Browse Courses</Link></li>
            <li><Link to="/profile" style={{ color: '#00bfae', fontWeight: 500 }}>View Profile</Link></li>
            {/* <li><Link to="/admin" style={{ color: '#5146d8', fontWeight: 500 }}>Admin Dashboard</Link></li>
            <li><Link to="/create-course" style={{ color: '#5146d8', fontWeight: 500 }}>Create Course</Link></li> */}
            <li><Link to="/quiz-history" style={{ color: '#ff9800', fontWeight: 500 }}>Quiz History</Link></li>
          </ul>
        </div>
      </div>
    );
  };
export default Dashboard;
