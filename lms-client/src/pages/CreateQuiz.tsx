import React, { useState, useEffect } from 'react';
import api from '../api';

const CreateQuiz: React.FC = () => {
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/lms/courses').then(res => {
      const raw: any = res.data;
      const arr = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
      setCourses(arr as any[]);
    });
  }, []);

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...options];
    newOptions[idx] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/lms/quizzes', { courseId, question, options, correctOptionIndex });
      setSuccess(true);
      setCourseId('');
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectOptionIndex(0);
    } catch {
      setError('Failed to create quiz');
    }
  };

  return (
    <div className="card fade-in">
      <h2>Create Quiz</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <input type="text" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} required />
        {options.map((opt, idx) => (
          <input key={idx} type="text" placeholder={`Option ${idx + 1}`} value={opt} onChange={e => handleOptionChange(idx, e.target.value)} required />
        ))}
        <label>
          Correct Option:
          <select value={correctOptionIndex} onChange={e => setCorrectOptionIndex(Number(e.target.value))}>
            {options.map((_, idx) => <option key={idx} value={idx}>{`Option ${idx + 1}`}</option>)}
          </select>
        </label>
        <button type="submit">Create</button>
      </form>
      {success && <p style={{ color: '#00bfae' }}>Quiz created!</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default CreateQuiz;
