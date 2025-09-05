import React, { useEffect, useState } from 'react';
import axios from 'axios';

const QuizHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/account/quizhistory').then(res => setHistory(res.data as any[]));
  }, []);

  return (
    <div className="card fade-in">
      <h2>Quiz History</h2>
      <ul>
        {history.length === 0 ? <li>No quiz history found.</li> : history.map((q, idx) => (
          <li key={idx}>
            <strong>Lesson:</strong> {q.lessonTitle} <br />
            <strong>Score:</strong> {q.score} <br />
            <strong>Date:</strong> {q.date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuizHistory;
