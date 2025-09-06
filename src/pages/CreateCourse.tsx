import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Switch from '@mui/material/Switch';

const CreateCourse: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // backend expects POST /api/lms/courses for creating a course (Authorize Admin/Instructor)
      await api.post('/api/lms/courses', { title, description, published, thumbnailUrl });
      navigate('/admin-courses');
    } catch (err: any) {
      setError(err?.response?.data ?? 'Failed to create course');
    }
  };

  return (
    <div className="card" style={{ maxWidth: 640, margin: '2rem auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Create Course</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4, minHeight: 90 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Thumbnail URL</label>
          <input type="text" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://.../image.jpg" style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Published</span>
          <Switch checked={published} onChange={(_, v) => setPublished(v)} />
          <span style={{ color: published ? 'green' : 'gray', fontWeight: 700 }}>{published ? 'ON' : 'OFF'}</span>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold' }}>Create</button>
      </form>
    </div>
  );
};

export default CreateCourse;
