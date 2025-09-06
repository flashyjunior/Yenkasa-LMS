import React, { useEffect, useState } from 'react';
import api from '../api';

interface Props {
  courseId?: number | null;
  onClose?: () => void;
  onSaved?: () => void;
}

const CourseForm: React.FC<Props> = ({ courseId, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/lms/admin/courses/${courseId}`);
        if (!mounted) return;
        const d: any = res.data;
        setTitle(d.title || '');
        setDescription(d.description || '');
        setPublished(!!d.published);
        setThumbnailUrl(d.thumbnailUrl || d.image || '');
      } catch {
        if (mounted) setError('Failed to load course');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (courseId) {
        await api.put(`/api/lms/admin/courses/${courseId}`, { id: courseId, title, description, published, thumbnailUrl });
      } else {
        // Creating a course uses the public courses endpoint (backend: [HttpPost("courses")])
        await api.post('/api/lms/courses', { title, description, published, thumbnailUrl });
      }
      onSaved && onSaved();
      onClose && onClose();
    } catch (err) {
      setError('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', boxSizing: 'border-box' }}>
      <div>
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 6 }} />
      </div>
      <div>
        <label>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 6, minHeight: 90 }} />
      </div>
      <div>
        <label>Thumbnail URL</label>
        <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://.../image.jpg" style={{ width: '100%', padding: 8, marginTop: 6 }} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ marginRight: 8 }} /> Published
        </label>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => onClose && onClose()} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff' }}>Cancel</button>
        <button type="submit" disabled={loading} style={{ padding: '8px 14px', borderRadius: 6, background: '#00bfae', color: '#fff', border: 'none' }}>{loading ? 'Saving...' : (courseId ? 'Save' : 'Create')}</button>
      </div>
    </form>
  );
};

export default CourseForm;
