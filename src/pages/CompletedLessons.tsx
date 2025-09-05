import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CompletedLessons: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
  axios.get('/api/lms/progress').then(res => setLessons(res.data as any[]));
  }, []);

  return (
    <div className="card fade-in">
      <h2>Completed Lessons</h2>
      <ul>
        {lessons.length === 0 ? <li>No completed lessons found.</li> : lessons.map((l, idx) => (
          <li key={idx}>
            <strong>{l.title}</strong> <br />
            <span>{l.completedDate}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompletedLessons;
