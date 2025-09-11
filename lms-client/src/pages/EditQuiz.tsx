import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import Switch from '@mui/material/Switch';
import { useAuth } from '../contexts/AuthContext';

const EditQuiz: React.FC = () => {
  // ...existing code...
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPrivilege } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [courseId, setCourseId] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [published, setPublished] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleTogglePublish = async () => {
    try {
      if (!published) {
  await api.post(`/api/lms/lessons/${id}/publish`);
        setPublished(true);
      } else {
  await api.post(`/api/lms/lessons/${id}/unpublish`);
        setPublished(false);
      }
    } catch {
      setError('Failed to update publish status.');
    }
  };

  useEffect(() => {
  api.get(`/api/lms/admin/quizzes/${id}`)
    .then(res => {
      const data = res.data as { question: string; options: string[]; correctOptionIndex: number; courseId: number; courseTitle?: string };
      setQuestion(data.question || '');
      let opts = data.options || [];
      while (opts.length < 2) opts.push('');
      setOptions(opts);
      setCorrectOptionIndex(data.correctOptionIndex ?? 0);
      setCourseId(data.courseId?.toString() || '');
      setCourseTitle(data.courseTitle || '');
      setLoading(false);
    })
    .catch(() => {
      setError('Failed to load quiz.');
      setLoading(false);
    });
  api.get('/api/lms/courses')
    .then(res => {
      const raw: any = res.data;
      const arr = Array.isArray(raw) ? raw : (raw && Array.isArray((raw as any).items) ? (raw as any).items : []);
      setCourses(arr as any[]);
    })
    .catch(() => setCourses([]));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.put(`/api/lms/admin/quizzes/${id}`,
        {
          id,
          question,
          options,
          correctOptionIndex,
          courseId: Number(courseId)
        }
      );
      navigate(-1);
    } catch (err) {
      setError('Failed to update quiz.');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card" style={{ maxWidth: 600, margin: '2rem auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Edit Quiz</h2>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8 }}>Published</span>
          <Switch
            checked={published}
            onChange={handleTogglePublish}
            color="primary"
          />
          <span style={{ marginLeft: 8, color: published ? 'green' : 'gray', fontWeight: 'bold' }}>
            {published ? 'ON' : 'OFF'}
          </span>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="course-select"><b>Course:</b></label>
          <select id="course-select" value={courseId} onChange={e => setCourseId(e.target.value)} required>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Question</label>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Options</label>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <input
                type="text"
                value={opt}
                onChange={e => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  setOptions(newOpts);
                }}
                required
                style={{ flex: 1, marginRight: 8, padding: 6 }}
              />
              <input
                type="radio"
                name="correctOption"
                checked={correctOptionIndex === idx}
                onChange={() => setCorrectOptionIndex(idx)}
                style={{ marginRight: 4 }}
              />
              <span style={{ fontSize: 12, color: '#00bfae' }}>{correctOptionIndex === idx ? 'Correct' : ''}</span>
              <button type="button" onClick={() => {
                const newOpts = options.filter((_, i) => i !== idx);
                setOptions(newOpts);
                if (correctOptionIndex === idx) setCorrectOptionIndex(0);
                else if (correctOptionIndex > idx) setCorrectOptionIndex(correctOptionIndex - 1);
              }} style={{ marginLeft: 8, color: '#ff5252', background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
          <button type="button" onClick={() => setOptions([...options, ''])} style={{ marginTop: 8, background: '#00bfae', color: '#fff', border: 'none', borderRadius: 4, padding: '0.3rem 1rem', fontWeight: 'bold' }}>+ Add Option</button>
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
          Delete Quiz
        </button>
        {showDeleteModal && (
          <Modal
            title="Delete Quiz"
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              try {
                await api.delete(`/api/lms/quizzes/${id}`);
                if (hasPrivilege && hasPrivilege('ViewAdminMenu')) navigate('/admin-quizzes');
              } catch {
                setError('Failed to delete quiz.');
              }
            }}
          >
            <p>Are you sure you want to delete this quiz? This action cannot be undone.</p>
          </Modal>
        )}
      </form>
    </div>
  );
};

export default EditQuiz;
