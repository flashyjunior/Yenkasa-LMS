import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const TakeQuiz: React.FC = () => {
  const params = useParams<{ id?: string }>();
  const lessonOrQuizId = params.id;
  const [quiz, setQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz interaction state
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<number>(0);
  const [grade, setGrade] = useState<string>('');
  const [passed, setPassed] = useState<boolean>(false);
  const [serverSaveError, setServerSaveError] = useState<string | null>(null);
  const [serverSaveResponse, setServerSaveResponse] = useState<any | null>(null);

  useEffect(() => {
    if (!lessonOrQuizId) {
      setError('Missing quiz id (route param is empty).');
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        // DEBUG: confirm correct id is used
        // eslint-disable-next-line no-console
        console.debug('[TakeQuiz] fetching quiz for id', lessonOrQuizId);

        // adapt endpoint if your backend exposes /api/lms/quizzes/:id instead
        const resp = await api.get(`/api/lms/lessons/${lessonOrQuizId}/quiz`);
        if (!mounted) return;
        const fetched = resp?.data ?? null;
        setQuiz(fetched);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn('[TakeQuiz] fetch failed', { status: err?.response?.status, data: err?.response?.data, msg: err?.message });
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load quiz.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [lessonOrQuizId]);

  if (loading) return <div>Loading quiz...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!quiz) return <div>No quiz found for this lesson.</div>;

  return (
    <div style={{ marginLeft: 260, maxWidth: 700, padding: '2rem 1rem' }}>
      <h2>Quiz</h2>
      <div style={{ marginBottom: 16 }}>
        <strong>Pass Mark:</strong> {quiz.passMark}%
      </div>
      {quiz.quizzes.map((q: any, idx: number) => (
        <div key={q.id} style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{idx + 1}. {q.question}</div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {q.options.map((opt: string, optIdx: number) => (
              <li key={optIdx} style={{ marginBottom: 8 }}>
                <label>
                  <input
                    type="radio"
                    name={`quiz-${q.id}`}
                    value={optIdx}
                    checked={selected[q.id] === optIdx}
                    onChange={() => setSelected(prev => ({ ...prev, [q.id]: optIdx }))}
                    disabled={submitted}
                  />{' '}
                  {opt}
                </label>
              </li>
            ))}
          </ul>
          {submitted && (
            <div style={{ color: results[q.id] ? 'green' : 'red', fontWeight: 'bold' }}>
              {results[q.id] ? 'Correct!' : `Incorrect. Correct answer: ${q.options[q.correctOptionIndex] ?? 'N/A'}`}
            </div>
          )}
        </div>
      ))}
      {/* Submit button */}
      {!submitted && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!quiz || Object.keys(selected).length !== (quiz.quizzes?.length ?? 0)}
          style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 'bold' }}
        >
          Submit
        </button>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', minWidth: 320 }}>
            <h3>Confirm Submission</h3>
            <p>Are you sure you want to submit your answers? You will not be able to change them after submission.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '0.5rem 1.2rem' }}>Cancel</button>
              <button
                onClick={async () => {
                  // handleConfirmSubmit inline
                  if (!quiz) return;
                  setSaving(true);
                  setShowConfirm(false);
                  try {
                    const total = quiz.quizzes.length;
                    let correct = 0;
                    const resMap: Record<string, boolean> = {};
                    for (const q of quiz.quizzes) {
                      const sel = selected[q.id];
                      const ok = sel !== undefined && sel === q.correctOptionIndex;
                      if (ok) correct++;
                      resMap[q.id] = ok;
                    }
                    const pct = Math.round((correct / total) * 100);
                    setResults(resMap);
                    setScore(pct);
                    setPassed(pct >= (quiz.passMark ?? 0));
                    // compute letter grade A-F, with special handling for small quizzes so grades feel intuitive
                    const getLetterGrade = (correctCount: number, totalCount: number) => {
                      // explicit mappings for very small quizzes (0..N)
                      const smallMaps: Record<number, string[]> = {
                        1: ['F', 'A'],               // 0 -> F, 1 -> A
                        2: ['F', 'B', 'A'],         // 0 -> F, 1 -> B, 2 -> A
                        3: ['F', 'D', 'B', 'A'],    // 0,1,2,3
                        4: ['F', 'E', 'C', 'B', 'A'] // 0..4
                      };
                      if (totalCount <= 4 && smallMaps[totalCount]) {
                        return smallMaps[totalCount][correctCount] ?? 'F';
                      }
                      // fallback: percent-based thresholds for larger quizzes
                      const percent = (correctCount / totalCount) * 100;
                      if (percent >= 90) return 'A';
                      if (percent >= 80) return 'B';
                      if (percent >= 70) return 'C';
                      if (percent >= 60) return 'D';
                      if (percent >= 50) return 'E';
                      return 'F';
                    };
                    const letter = getLetterGrade(correct, total);
                    setGrade(letter);

                    // fetch or read username (store username locally; server DTO will receive username string in UserId field)
                    let username = localStorage.getItem('username') || localStorage.getItem('userName') || undefined;
                    if (!username) {
                      try {
                        type MeResponse = { id?: string; username?: string; userName?: string; name?: string };
                        const me = await api.get<MeResponse>('/api/lms/users/me');
                        username = String(me?.data?.username ?? me?.data?.userName ?? me?.data?.name ?? me?.data?.id ?? '');
                        if (username) localStorage.setItem('username', username);
                      } catch {
                        // ignore; server validation will report if username is required
                      }
                    }

                     // Build Answers and Results dictionaries using numeric keys
                     const answersDict: Record<number, number | null> = {};
                     const resultsDict: Record<number, boolean> = {};
                     for (const q of quiz.quizzes) {
                       const keyNum = Number(q.id);
                       const sel = selected[q.id];
                       answersDict[keyNum] = sel === undefined ? null : Number(sel);
                       resultsDict[keyNum] = Boolean(resMap[q.id]);
                     }
 
                     // Determine LessonId: prefer quiz.lessonId, otherwise use route id param
                     const lessonId = Number(quiz.lessonId ?? lessonOrQuizId ?? 0);
 
                     // Build DTO exactly matching server DTO (UserId string, LessonId int, Answers/results dictionaries)
                     const dtoPayload = {
                      UserId: String(username ?? ''),
                       LessonId: Number(lessonId || 0),
                       Answers: answersDict,
                       Results: resultsDict,
                       Score: Number(pct),
                       Grade: String(letter),
                       PassMark: Number(quiz.passMark ?? 0),
                       Passed: pct >= (quiz.passMark ?? 0)
                     };
 
                     const payload = dtoPayload; // send unwrapped DTO (controller expects QuizResultDto as body)
                     // eslint-disable-next-line no-console
                     console.debug('[TakeQuiz] final dto payload (unwrapped)', payload);
                     const resp = await api.post('/api/lms/quiz-results', payload);
                      // eslint-disable-next-line no-console
                      console.debug('[TakeQuiz] save success', resp?.status, resp?.data);
                      setServerSaveResponse({ label: 'dto + Answers(dict)', data: resp?.data });
                      setServerSaveError(null);

                 } finally {
                   setSaving(false);
                   setSubmitted(true);
                 }
                }}
                disabled={saving}
                style={{
                  background: '#00bfae',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.5rem 1.2rem',
                  fontWeight: 'bold'
                }}
              >
                {saving ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Results display */}
      {submitted && (
        <div style={{ marginTop: 32, padding: 16, background: '#f7f7f7', borderRadius: 8 }}>
          <h3>Results</h3>
          <div>
            <strong>Score:</strong> {score}%
          </div>
          <div>
            <strong>Status:</strong> {passed ? <span style={{ color: 'green' }}>Passed</span> : <span style={{ color: 'red' }}>Failed</span>}
          </div>
          {serverSaveError && (
            <div style={{ color: 'red', marginTop: 8 }}>
              <strong>Could not save result:</strong> {serverSaveError}
            </div>
          )}
          {serverSaveResponse && !serverSaveError && (
            <div style={{ color: 'green', marginTop: 8 }}>
              <strong>Result saved!</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TakeQuiz;