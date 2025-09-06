import React, { useEffect, useState } from 'react';
import api from '../api';

type Announcement = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  author: string;
};

const Announcements: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/api/lms/courses/${courseId}/announcements`);
        setAnnouncements(Array.isArray(resp.data) ? resp.data : []);
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchAnnouncements();
  }, [courseId]);

  return (
    <div>
      <h3>Course Announcements</h3>
      <p>
        Important updates, reminders, and instructor messages for this course will appear here.
        Please check regularly for new announcements.
      </p>
      {loading ? (
        <p>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements available for this course.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {announcements.map(a => (
            <li key={a.id} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <div style={{ margin: '6px 0' }}>{a.body}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {a.author} • {new Date(a.createdAt).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Announcements;