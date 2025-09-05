import React, { useState } from 'react';
import axios from 'axios';

const CreateCourse: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/lms/courses', { title, description });
      setSuccess(true);
      setTitle('');
      setDescription('');
    } catch {
      setError('Failed to create course');
    }
  };

  return (
    <div className="card fade-in">
      <h2>Create Course</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="text" placeholder="Course Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required />
        <button type="submit">Create</button>
      </form>
      {success && <p style={{ color: '#00bfae' }}>Course created!</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default CreateCourse;
