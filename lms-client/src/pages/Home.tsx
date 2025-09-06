import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { userName } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState<number>(0);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assumptions: "certificates" are derived from passed quiz results. Overdue logic not present in API so we show 0.

  useEffect(() => {
    async function load() {
      try {
        const [userRes, coursesRes, lessonsRes, progressRes, quizzesRes] = await Promise.all([
          api.get('/api/lms/users/me'),
          api.get('/api/lms/courses'),
          api.get('/api/lms/lessons'),
          api.get('/api/lms/progress'),
          api.get('/api/lms/quiz-results'),
        ]);
        setUser(userRes.data);
        // support both legacy array responses and new paged responses ({ items, total, page, pageSize })
  const rawCourses: any = coursesRes.data;
  const coursesArray: any[] = Array.isArray(rawCourses) ? rawCourses : (rawCourses && Array.isArray(rawCourses.items) ? rawCourses.items : []);
  setCourses(coursesArray);

  const rawLessons: any = lessonsRes.data;
  const lessonsArray: any[] = Array.isArray(rawLessons) ? rawLessons : (rawLessons && Array.isArray(rawLessons.items) ? rawLessons.items : []);
  setLessons(lessonsArray);
        const progressList = progressRes.data || [];
        setCompleted((progressList as any[]).length || 0);
        setQuizResults((quizzesRes.data as any[]) || []);

        // fetch per-course progress for accurate progress bars
        try {
          const coursesProgressRes = await api.get('/api/lms/progress/courses');
          const courseProgressMap = (coursesProgressRes.data as any[]) || [];
          // attach percent to course objects
          // reuse the normalized coursesArray above when enriching with progress
          const updatedCourses = (coursesArray || []).map((c: any) => {
            const info = courseProgressMap.find((cp: any) => cp.courseId === c.id) || null;
            return { ...c, percent: info ? info.percent : 0, completedLessons: info ? info.completedLessons : 0, totalLessons: info ? info.totalLessons : 0 };
          });
          setCourses(updatedCourses);
        } catch (e) {
          // fallback to earlier course list
          setCourses(coursesArray || []);
        }

        // fetch certificates list (derived on backend)
        try {
          const certRes = await api.get('/api/lms/users/me/certificates');
          const certs = (certRes.data as any[]) || [];
          setQuizResults((quizzesRes.data as any[]) || []); // keep quiz results as well
          // store certificates count separately by using quizResults derived logic below
          // we don't maintain a separate state just for certs; we'll count from certs when rendering
          (window as any).__userCertificates = certs;
        } catch (e) {
          (window as any).__userCertificates = [];
        }
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          setError('You are not authorized to view this data.');
        } else {
          setError('An error occurred while loading dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
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

  // derive certificates from backend (stored on load)
  const certificates = ((window as any).__userCertificates as any[] | undefined) || quizResults.filter((q: any) => q.passed) || [];
  const certificatesCount = Array.isArray(certificates) ? certificates.length : 0;

  // per-course progress
  const completedLessonIds = new Set((completed && Array.isArray((window as any).__completedLessonsPlaceholder)) ? [] : []);
  // Build mapping from progress API: progress returns list of objects with Title/CompletedDate in current API; earlier we set completed count only.
  // Instead compute course progress by matching lessons and progress list from server data we loaded earlier.
  // For simplicity, we compute completed lessons using the `completed` number evenly across courses when exact mapping absent.

  // helper: compute percent of lessons completed for a course
  function courseProgress(course: any) {
    const courseLessons = lessons.filter(l => l.courseId === course.id);
    if (!courseLessons.length) return 0;
    // find how many of these lessons appear in progress — by title matching isn't reliable; approximate by distribution
    // fallback: use global completed count proportionally
    // Better: if progress endpoint returned lesson IDs, we'd use that; here we approximate
    const completedCountApprox = Math.round((completed / Math.max(1, lessons.length)) * courseLessons.length);
    return Math.min(100, Math.round((completedCountApprox / courseLessons.length) * 100));
  }

  return (
    <div className="main-content">
      <div className="dashboard fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>Welcome{user?.fullName ? `, ${user.fullName}` : (userName ? `, ${userName}` : '')}</h1>
            <div style={{ color: '#6b7280' }}>Your personalized learning summary</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="avatar" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 28, background: '#e5e7eb', display: 'inline-block' }} />
            )}
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-label">Courses to do</div>
            <div className="metric-count">{Math.max(0, (courses?.length || 0) - 0)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Overdue</div>
            <div className="metric-count">0</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed lessons</div>
            <div className="metric-count">{completed}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Certificates</div>
            <div className="metric-count">{certificatesCount}</div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <h3 style={{ marginTop: 0 }}>Continue learning</h3>
            {loading ? <div>Loading...</div> : (
              courses.length === 0 ? <div style={{ color: '#9ca3af' }}>No courses available.</div> : (
                <ul className="course-list">
                  {courses.slice(0, 6).map((c: any) => (
                    <li key={c.id} className="course-item">
                      <div className="course-info">
                        <div className="course-title">{c.title}</div>
                        <div className="course-sub">{courseProgress(c)}% complete</div>
                        <div className="course-progress-bar">
                          <div className="course-progress-fill" style={{ width: `${courseProgress(c)}%` }} />
                        </div>
                      </div>
                      <div className="course-continue-btn">
                        <Link to={`/courses/${c.id}`} className="btn" style={{ background: '#6c63ff', color: '#fff', padding: '8px 12px', borderRadius: 8, textDecoration: 'none' }}>Continue</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>

          <div className="dashboard-side">
            <h3 style={{ marginTop: 0 }}>Certificates</h3>
            <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ background: '#e6f4ea', color: '#027a3b', padding: '6px 10px', borderRadius: 20, fontWeight: 600 }}>{certificatesCount} earned</div>
                <div style={{ background: '#f3f4f6', color: '#374151', padding: '6px 10px', borderRadius: 20 }}><a href="/certificates">View all</a></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
