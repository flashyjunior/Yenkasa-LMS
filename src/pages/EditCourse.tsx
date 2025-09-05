import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../components/Modal';

const EditCourse: React.FC = () => {
  // ...existing code...
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
  axios.get(`/api/lms/admin/courses/${id}`)
      .then(res => {
        const data = res.data as { title: string; description: string; published: boolean };
        setTitle(data.title);
        setDescription(data.description);
        setPublished(!!data.published);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load course.');
        setLoading(false);
      });
    axios.get(`/api/lms/courses/${id}`)
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
    await axios.put(`/api/lms/courses/${id}`, { id, title, description, published });
      navigate('/admin-courses');
    } catch (err) {
      setError('Failed to update course.');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card" style={{ maxWidth: 500, margin: '2rem auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Edit Course</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4, minHeight: 80 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={e => setPublished(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Published
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold' }}>
          Save Changes
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{ background: '#ff5252', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold', marginLeft: 12 }}
        >
          Delete Course
        </button>
        {showDeleteModal && (
          <Modal
            title="Delete Course"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              try {
                await axios.delete(`/api/lms/courses/${id}`);
                navigate('/admin-courses');
              } catch {
                setError('Failed to delete course.');
              }
            }}
          >
            <p>Are you sure you want to delete this course? This action cannot be undone.</p>
          </Modal>
        )}
      </form>
    </div>
  );
};

export default EditCourse;
