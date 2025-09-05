import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import api from '../api';

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
  const [lastAttemptInfo, setLastAttemptInfo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!routeId) {
    setError('Missing lesson id in route');
    setLoading(false);
    return;
  }
  axios.get(`/api/lms/lessons/${routeId}`)
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

    const candidates: Array<{ method: 'post' | 'put'; url: string; data?: any }> = [
      { method: 'post', url: `/api/lms/lessons/${lessonId}/complete`, data: {} },
      { method: 'post', url: `/api/lms/lessons/complete/${lessonId}`, data: {} },
      { method: 'post', url: `/api/lms/progress/lessons/${lessonId}/complete`, data: {} },
      { method: 'post', url: `/api/lms/progress/${lessonId}/complete`, data: {} },
      // fallback: generic progress create endpoint (common shape)
      { method: 'post', url: `/api/lms/progress`, data: { lessonId } },
    ];

    let lastErr: any = null;
    for (const c of candidates) {
      try {
        // eslint-disable-next-line no-console
        console.debug('[Lesson] attempting complete', c);
        const resp = await api.post(c.url, c.data ?? {});
        // eslint-disable-next-line no-console
        console.debug('[Lesson] complete success', { url: c.url, status: resp?.status, data: resp?.data });
        setLastAttemptInfo({ url: c.url, status: resp?.status, data: resp?.data });
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
      {loading ? <p>Loading...</p> : lesson ? (
        <>
          <h2>{lesson.title}</h2>
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
                {lastAttemptInfo && (
                  <pre style={{ marginTop: 8, fontSize: 12, color: '#444', background: '#fafafa', padding: 8 }}>
                    {JSON.stringify(lastAttemptInfo, null, 2)}
                  </pre>
                )}
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
