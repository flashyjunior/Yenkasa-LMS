import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Notification from '../components/Notification';
import { Link } from 'react-router-dom';

interface Quiz {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
}

const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    axios.get(`/api/quiz/lesson/${id}`)
      .then(res => {
        // Only show published quizzes
        const all = res.data as Quiz[];
        setQuizzes(all.filter(q => (q as any).published));
      })
      .catch(() => setQuizzes([]));
  }, [id]);

  const handleChange = (qIdx: number, optIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[qIdx] = optIdx;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    axios.post('/api/quiz/submit', answers)
      .then(res => {
        setScore((res.data as { score: number }).score);
        setNotification((res.data as { feedback: string }).feedback);
        setSubmitted(true);
      });
  };

  return (
    <div className="quiz card">
      <h2>Quiz</h2>
      <ul>
        {quizzes.map((quiz, qIdx) => (
          <li key={quiz.id}>
            <div>{quiz.question}</div>
            <ul>
              {quiz.options.map((opt, optIdx) => (
                <li key={optIdx}>
                  <label>
                    <input
                      type="radio"
                      name={`q${qIdx}`}
                      checked={answers[qIdx] === optIdx}
                      onChange={() => handleChange(qIdx, optIdx)}
                      disabled={submitted}
                    />
                    {opt}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 16 }}>
        <Link to={`/edit-quiz/${quizzes[0]?.id}`} style={{ color: '#00bfae', fontWeight: 'bold' }}>Edit Quiz</Link>
      </div>
      {!submitted && <button onClick={handleSubmit}>Submit</button>}
      {submitted && score !== null && <p>Your score: {score}</p>}
      {notification && <Notification message={notification} onClose={() => setNotification('')} />}
    </div>
  );
};

export default Quiz;
