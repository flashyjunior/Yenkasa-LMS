import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Switch from '@mui/material/Switch';
import { useAuth } from '../contexts/AuthContext';

const CreateLesson: React.FC = () => {
  const navigate = useNavigate();
  const { hasPrivilege } = useAuth();
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passMark, setPassMark] = useState<number>(50);
  const [duration, setDuration] = useState<number | ''>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.get('/api/lms/courses');
        if (!mounted) return;
        const raw: any = resp?.data ?? [];
        const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
        // Only show published courses for assignment
        setCourses(list.filter((c:any) => c.published));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load courses', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!courseId) { setError('Please select a course.'); return; }
    try {
      const payload: any = {
        CourseId: Number(courseId),
        Title: title,
        // prefer VideoUrl; keep Content for backward compatibility
        VideoUrl: videoUrl,
        Content: videoUrl,
        PassMark: Number(passMark),
        Published: Boolean(published)
      };
      if (duration !== '') payload.Duration = Number(duration);

      await api.post('/api/lms/lessons', payload);
      if (hasPrivilege && hasPrivilege('ViewAdminMenu')) navigate('/admin-lessons');
      else navigate(-1);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to create lesson', err);
      setError(err?.response?.data?.message || err?.response?.data || 'Failed to create lesson');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640, margin: '2rem auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Create Lesson</h2>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: 8 }}>Published</span>
        <Switch checked={published} onChange={(_, v) => setPublished(v)} color="primary" />
        <span style={{ marginLeft: 8, color: published ? 'green' : 'gray', fontWeight: 'bold' }}>{published ? 'ON' : 'OFF'}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Video URL / Content</label>
          <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Course</label>
          <select value={courseId} onChange={e => setCourseId(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }}>
            <option value="">Select a course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Pass Mark (%)</label>
          <input type="number" value={passMark} min={0} max={100} onChange={e => setPassMark(Number(e.target.value))} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Duration (minutes)</label>
          <input type="number" min={0} value={duration} onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: 8, marginTop: 4 }} placeholder="e.g. 10" />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold' }}>Create</button>
      </form>
    </div>
  );
};

export default CreateLesson;
