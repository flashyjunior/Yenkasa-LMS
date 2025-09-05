import React, { useState, useEffect } from 'react';
import api from '../api';
import Switch from '@mui/material/Switch';

const CreateLesson: React.FC = () => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [courses, setCourses] = useState<any[]>([]);
  const [published, setPublished] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passMark, setPassMark] = useState<number>(50); // Default to 50%
  const [duration, setDuration] = useState<number | ''>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.get('/api/lms/courses');
        if (!mounted) return;
        const data = resp?.data ?? [];
        setCourses(Array.isArray(data) ? data : []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load courses', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!courseId) {
      setError('Please select a course.');
      return;
    }

    try {
      const payload: any = {
        CourseId: Number(courseId),
        Title: title,
        Content: videoUrl, // backend Lesson.Content will hold the video URL/content
        PassMark: Number(passMark),
        Published: Boolean(published)
      };
      if (duration !== '') payload.Duration = Number(duration);

      await api.post('/api/lms/lessons', payload);
      setSuccess(true);
      setTitle('');
      setVideoUrl('');
      setCourseId('');
      setPassMark(50);
      setDuration('');
      setPublished(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to create lesson', err);
      setError(err?.response?.data ?? 'Failed to create lesson');
    }
  };

  return (
    <div className="card fade-in">
      <h2>Create Lesson</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Lesson Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Video URL or Content"
          value={videoUrl}
          onChange={e => setVideoUrl(e.target.value)}
          required
        />

        <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <label>
          Pass Mark (%):
          <input
            type="number"
            value={passMark}
            min={0}
            max={100}
            onChange={e => setPassMark(Number(e.target.value))}
            required
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Published
          <Switch checked={published} onChange={(_, v) => setPublished(v)} />
        </label>

        <label>
          Duration (minutes):
          <input
            type="number"
            min={0}
            value={duration}
            onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 10"
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>

        <button type="submit">Create</button>
      </form>

      {success && <p style={{ color: '#00bfae' }}>Lesson created!</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default CreateLesson;
