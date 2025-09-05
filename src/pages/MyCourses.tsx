// ...new file...
import React, { useEffect, useState } from 'react';
import api from '../api';
import CourseCard from '../components/CourseCard';

const MyCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      // backend reads user from JWT; no query param required
      const resp = await api.get('/api/lms/my-courses');
      // guard if resp is undefined or resp.data isn't an array
      const data = resp?.data ?? [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load my courses', err);
      setError(err?.response?.data ?? err?.message ?? 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) return <div style={{ marginLeft: 260, padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ marginLeft: 260, padding: 24, color: 'red' }}>{error}</div>;

  return (
    <div style={{ marginLeft: 260, maxWidth: 900, padding: '2rem 1rem' }}>
      <h2>My Courses</h2>
      {courses.length === 0 ? (
        <div>You have not subscribed to any courses yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {courses.map(c => (
            <CourseCard key={c.id} course={{ ...c, isSubscribed: true }} onSubscribed={fetchCourses} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
// ...new file...