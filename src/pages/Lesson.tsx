import React, { useEffect, useState } from 'react';
import './LessonDetail.css';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import QASection from '../components/QASection';

const QAMini: React.FC<{ lessonId?: string | undefined }> = ({ lessonId }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.get(`/api/lms/lessons/${lessonId}/questions`).catch(() => ({ data: [] }));
        if (mounted) setItems(resp?.data ?? []);
      } catch (_) { }
    })();
    return () => { mounted = false; };
  }, [lessonId]);
  return (
    <div>
      {items.length === 0 ? <div className="qa-placeholder">No questions yet.</div> : (
        <ul>
          {items.map((q: any) => <li key={q.id}><strong>{q.title}</strong> — <span className="muted">{q.author}</span></li>)}
        </ul>
      )}
    </div>
  );
};

interface Lesson {
  id?: number | string;
  _id?: number | string;
  title?: string;
  content?: string | null;
  videoUrl?: string | null;
  datePublished?: string;
  [key: string]: any;
}

interface LessonReview {
  id: number;
  userId: string;
  rating: number;
  review: string;
  date: string;
}

const Lesson: React.FC = () => {
  const params = useParams<{ id?: string }>();
  const routeId = params.id;
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionCount, setCompletionCount] = useState<number>(0);
  const [reviews, setReviews] = useState<LessonReview[]>([]);
  const [myRating, setMyRating] = useState<number>(0);
  const [myReview, setMyReview] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  // debug tracking removed per UX cleanup
  const [error, setError] = useState<string | null>(null);

  const tabs = ['Overview','Q&A','Announcements','Reviews','Learning tools'];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  useEffect(() => {
  if (!routeId) {
    setError('Missing lesson id in route');
    setLoading(false);
    return;
  }
  api.get(`/api/lms/lessons/${routeId}`)
    .then(res => {
      const d = res.data ?? {};

      // robust id extraction: check common keys, nested wrappers, or any key that looks like an id
      const extractId = (obj: any, fallback?: string): string | number | undefined => {
        if (!obj || typeof obj !== 'object') return fallback;
        const candidates = ['id', '_id', 'lessonId', 'lessonID', 'uuid', 'uid', 'lesson_id'];
        for (const k of candidates) {
          const v = (obj as any)[k];
          if (v !== undefined && v !== null) return v as string | number;
        }
        // handle common wrapper shapes: { data: {...} } or { result: {...} }
        const wrappers = ['data', 'result', 'payload', 'items'];
        for (const w of wrappers) {
          const child = (obj as any)[w];
          if (child) {
            const found: string | number | undefined = extractId(child, undefined);
            if (found !== undefined) return found;
          }
        }
        // fallback: first scalar-ish value whose key looks like an id
        const idLike = Object.keys(obj).find(k => /id$/i.test(k) || /^id$/i.test(k));
        if (idLike) {
          const val = (obj as any)[idLike];
          if (val !== undefined && val !== null) return val as string | number;
        }
        return fallback;
      };

      const normalized = {
        ...d,
        id: extractId(d, routeId ?? undefined),
      };
      // eslint-disable-next-line no-console
      console.debug('[Lesson] loaded', { raw: d, normalized });
      setLesson(normalized as Lesson);
      setLoading(false);

      // check progress list to see if this lesson was already completed (best-effort)
      (async () => {
        try {
          const progRes = await (api.get('/api/lms/progress') as Promise<any>).catch(() => ({ data: [] }));
          const rawData: any = progRes?.data;
          const progressList: any[] = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.items) ? rawData.items : []);
          const match = (progressList || []).find((p: any) => {
            const pp: any = p || {};
            const pid = pp.lessonId ?? pp.LessonId ?? pp.lesson?.id ?? pp.id ?? pp.Id;
            if (pid !== undefined && pid !== null) {
              return String(pid) === String(normalized.id) || String(pid) === String(routeId);
            }
            return false;
          });
          if (match) setCompleted(true);
        } catch (_e) {
          // ignore; non-critical
        }
      })();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[Lesson] load failed', err?.response?.data ?? err?.message);
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load lesson');
      setLoading(false);
    });
  // TODO: Implement completion-count and reviews endpoints in backend if needed
  // axios.get(`/api/lms/lessons/${id}/completion-count`).then(res => setCompletionCount((res.data as { count: number }).count));
  // axios.get(`/api/lms/lessons/${id}/reviews`).then(res => setReviews(res.data as LessonReview[]));
  }, [routeId]);

  // Helper to check if the videoUrl is a YouTube link
  function isYouTube(url: string | undefined): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // normalize video vars so JSX doesn't try to render undefined src
  const videoUrl = lesson?.videoUrl ?? '';
  const hasVideo = Boolean(videoUrl);
  const videoIsYouTube = isYouTube(videoUrl);

  const completeLesson = async (lessonId?: number | string) => {
    if (!lessonId) {
      setCompleteError('Missing lesson id');
      return;
    }
    setCompleting(true);
    setCompleteError(null);
    // Preferred API: PUT /api/lms/progress/{lessonId} with a boolean body (backend defines this)
    const candidates: Array<{ method: 'put' | 'post'; url: string; data?: any }> = [
      { method: 'put', url: `/api/lms/progress/${lessonId}`, data: true },
      // some servers expect an object body
      { method: 'put', url: `/api/lms/progress/${lessonId}`, data: { completed: true } },
      // fallback: some variants use a POST to create progress
      { method: 'post', url: `/api/lms/progress`, data: { lessonId, completed: true } },
      // legacy endpoints (try them last)
      { method: 'post', url: `/api/lms/lessons/${lessonId}/complete`, data: {} },
      { method: 'post', url: `/api/lms/progress/lessons/${lessonId}/complete`, data: {} }
    ];

    let lastErr: any = null;
  for (const c of candidates) {
      try {
  // eslint-disable-next-line no-console
  console.debug('[Lesson] attempting complete', c);
        const resp = c.method === 'put' ? await api.put(c.url, c.data) : await api.post(c.url, c.data ?? {});
  // eslint-disable-next-line no-console
  console.debug('[Lesson] complete success', { url: c.url, status: resp?.status, data: resp?.data });
        setCompleted(true);
        setCompleting(false);
        return;
      } catch (err: any) {
        lastErr = err;
        // capture useful details
  const info = {
          url: c.url,
          method: c.method,
          message: err?.message,
          status: err?.response?.status,
          responseData: err?.response?.data,
          headers: err?.response?.headers,
        };
        // eslint-disable-next-line no-console
        console.warn('[Lesson] complete attempt failed', info);

        // if auth/validation error, surface immediately
        const status = err?.response?.status;
        if (status && status < 500 && status !== 404) {
          setCompleteError(err?.response?.data?.message ?? err?.message ?? `Request failed (${status})`);
          setCompleting(false);
          return;
        }
        // otherwise try next candidate
      }
    }

  // none succeeded
    setCompleteError(
      lastErr?.response?.data?.message ??
      lastErr?.message ??
      'Failed to complete lesson (no matching endpoint or server error).'
    );
    setCompleting(false);
  };

  return (
    <div className="card lesson">
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      {loading ? <p>Loading...</p> : lesson ? (
        <>
          <h2>{lesson.title || 'Untitled lesson'}</h2>
          <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
            {lesson.datePublished && <span>Published: {new Date(lesson.datePublished).toLocaleDateString()} | </span>}
            <span>{completionCount} completed</span>
          </div>
          {hasVideo ? (
  videoIsYouTube ? (
    <iframe
      width="640"
      height="360"
      src={videoUrl.replace('watch?v=', 'embed/')}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ background: '#000' }}
    />
  ) : (
    <video width="640" height="360" controls>
      <source src={videoUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  )
) : (
  lesson?.content ? (
    <div dangerouslySetInnerHTML={{ __html: lesson.content || '' }} />
  ) : (
    <div style={{ color: '#666' }}>No media available for this lesson.</div>
  )
)}
          <div style={{ marginTop: 16 }}>
            {/* <Link to={`/edit-lesson/${lesson?.id}`} style={{ color: '#00bfae', fontWeight: 'bold' }}>Edit Lesson</Link> */}
          </div>
          {/* Tabbed section under media */}
          <div className="lesson-tabs" style={{ marginTop: 18 }}>
            <nav className="tabs-header" role="tablist" aria-label="Lesson sections">
              {tabs.map((t, idx) => {
                const panelId = `tab-panel-${idx}`;
                const tabId = `tab-${idx}`;
                return (
                  <div
                    key={t}
                    id={tabId}
                    role="tab"
                    tabIndex={0}
                    aria-selected={activeTab === t}
                    aria-controls={panelId}
                    className={`tab-btn ${activeTab === t ? 'active' : ''}`}
                    onClick={() => setActiveTab(t)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(t); } }}
                  >
                    {t}
                  </div>
                );
              })}
            </nav>
            <div className="tabs-panel">
              {activeTab === 'Overview' && (
                <div id="tab-panel-0" className="tab-pane overview" role="tabpanel" aria-labelledby="tab-0">
                  <h3>Overview</h3>
                  <p className="muted">{lesson?.summary || lesson?.excerpt || lesson?.description || 'No overview.'}</p>
                  {lesson?.content && <div dangerouslySetInnerHTML={{ __html: lesson.content }} />}
                </div>
              )}
              {activeTab === 'Q&A' && (
                <div id="tab-panel-1" className="tab-pane qa" role="tabpanel" aria-labelledby="tab-1">
                  <h3>Q&amp;A</h3>
                  <p className="muted">Questions and answers for this lesson.</p>
                  {/* <QASection lesson={lesson} lessonId={routeId} /> */}
                </div>
              )}
              {activeTab === 'Announcements' && (
                <div id="tab-panel-2" className="tab-pane announcements" role="tabpanel" aria-labelledby="tab-2">
                  <h3>Announcements</h3>
                  <p className="muted">Course announcements from the instructor appear here.</p>
                  <div className="announcements-placeholder">No announcements.</div>
                </div>
              )}
              {activeTab === 'Reviews' && (
                <div id="tab-panel-3" className="tab-pane reviews" role="tabpanel" aria-labelledby="tab-3">
                  <h3>Reviews</h3>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 8 }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} style={{ cursor: 'pointer', color: myRating >= star ? '#ffc107' : '#ccc', fontSize: 24 }} onClick={() => setMyRating(star)}>&#9733;</span>
                      ))}
                    </div>
                    <textarea value={myReview} onChange={e => setMyReview(e.target.value)} placeholder="Write a review..." style={{ width: '100%', minHeight: 60, marginBottom: 8 }} />
                    <div>
                      <button
                        onClick={async () => {
                          setSubmittingReview(true);
                          // TODO: send review to backend when endpoint exists
                          setMyRating(0); setMyReview('');
                          setSubmittingReview(false);
                        }}
                        disabled={submittingReview || myRating === 0}
                        style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 'bold' }}
                      >Submit</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    {reviews.length === 0 && <p>No reviews yet.</p>}
                    {reviews.map(r => (
                      <div key={r.id} style={{ borderBottom: '1px solid #eee', marginBottom: 12, paddingBottom: 8 }}>
                        <div style={{ color: '#ffc107', fontSize: 18 }}>
                          {[1,2,3,4,5].map(star => <span key={star}>{r.rating >= star ? '★' : '☆'}</span>)}
                        </div>
                        <div style={{ fontSize: 13, color: '#888' }}>{new Date(r.date).toLocaleDateString()}</div>
                        <div>{r.review}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'Learning tools' && (
                <div id="tab-panel-4" className="tab-pane tools" role="tabpanel" aria-labelledby="tab-4">
                  <h3>Learning tools</h3>
                  <p className="muted">Resources and tools to help you learn this lesson.</p>
                  <ul>
                    <li>Downloadable materials</li>
                    <li>Transcripts</li>
                    <li>Practice exercises</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          {isAuthenticated && (
            <>
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => completeLesson(lesson?.id ?? routeId)}
                  disabled={completing || completed}
                  style={{ background: completed ? '#4caf50' : '#00bfae', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 4 }}
                >
                  {completing ? 'Completing…' : (completed ? 'Completed' : 'Mark as Complete')}
                </button>
                {completeError && <div style={{ color: 'red', marginTop: 8 }}>{completeError}</div>}
                {/* debug info removed per request */}
              </div>
              {completed && (
                <div style={{ marginTop: 16 }}>
                  <Link to={`/take-quiz/${lesson?.id ?? routeId}`} style={{ color: '#007bff', fontWeight: 'bold' }}>
                    Take Quiz
                  </Link>
                </div>
              )}
              {/* Review/rating UI */}
              <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <h3>Rate & Review this Lesson</h3>
                <div style={{ marginBottom: 8 }}>
                  {[1,2,3,4,5].map(star => (
                    <span key={star} style={{ cursor: 'pointer', color: myRating >= star ? '#ffc107' : '#ccc', fontSize: 24 }}
                      onClick={() => setMyRating(star)}>&#9733;</span>
                  ))}
                </div>
                <textarea
                  value={myReview}
                  onChange={e => setMyReview(e.target.value)}
                  placeholder="Write a review..."
                  style={{ width: '100%', minHeight: 60, marginBottom: 8 }}
                />
                <button
                  onClick={async () => {
                    setSubmittingReview(true);
                    // TODO: Implement review endpoint in backend if needed
                    // await axios.post(`/api/lms/lessons/${lesson.id}/review`, { rating: myRating, review: myReview });
                    setMyRating(0); setMyReview('');
                    // const res = await axios.get(`/api/lms/lessons/${lesson.id}/reviews`);
                    // setReviews(res.data as LessonReview[]);
                    setSubmittingReview(false);
                  }}
                  disabled={submittingReview || myRating === 0}
                  style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 'bold' }}
                >Submit</button>
              </div>
            </>
          )}
          {/* Show reviews */}
          <div style={{ marginTop: 32 }}>
            <h3>Reviews</h3>
            {reviews.length === 0 && <p>No reviews yet.</p>}
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid #eee', marginBottom: 12, paddingBottom: 8 }}>
                <div style={{ color: '#ffc107', fontSize: 18 }}>
                  {[1,2,3,4,5].map(star => <span key={star}>{r.rating >= star ? '★' : '☆'}</span>)}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>{new Date(r.date).toLocaleDateString()}</div>
                <div>{r.review}</div>
              </div>
            ))}
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
      ) : <p>Lesson not found.</p>}
    </div>
  );
};

export default Lesson;
