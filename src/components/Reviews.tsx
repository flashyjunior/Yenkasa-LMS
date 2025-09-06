import React, { useEffect, useState } from 'react';
import api from '../api';

type Review = {
  id: number;
  userName: string;
  fullName?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const Reviews: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Summary state
  const [summary, setSummary] = useState<{
    average: number;
    total: number;
    breakdown: number[];
    percentages: number[];
  } | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/api/lms/courses/${courseId}/reviews`);
        const data = Array.isArray(resp.data) ? resp.data : [];
        setReviews(data);
        setSummary(calculateSummary(data));
        console.log('Review summary:', calculateSummary(data));
      } catch {
        setReviews([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchReviews();
  }, [courseId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!reviewRating || !reviewComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/lms/courses/${courseId}/reviews`, { rating: reviewRating, comment: reviewComment });
      setReviewComment('');
      setReviewRating(5);
      const res = await api.get(`/api/lms/courses/${courseId}/reviews`);
      setReviews(Array.isArray(res.data) ? res.data : []);
      setSummary(calculateSummary(Array.isArray(res.data) ? res.data : []));
      setErrorMsg(null);
    } catch (err: any) {
      if (err?.response?.status === 400 && err?.response?.data?.error) {
        setErrorMsg(err.response.data.error);
      } else {
        setErrorMsg("An error occurred while submitting your review.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  function calculateSummary(reviews: Review[]) {
    const total = reviews.length;
    const breakdown = [0, 0, 0, 0, 0];
    let sum = 0;
    reviews.forEach(r => {
      sum += r.rating;
      breakdown[5 - r.rating]++;
    });
    const average = total ? (sum / total) : 0;
    const percentages = breakdown.map(count => total ? Math.round((count / total) * 100) : 0);
    return { average, total, breakdown, percentages };
  }

  // Star rating input
  const StarInput = () => (
    <div style={{ margin: '8px 0', display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{
            cursor: 'pointer',
            fontSize: 24,
            color: n <= reviewRating ? '#a6781c' : '#ccc',
            marginRight: n < 5 ? 2 : 0,
            transition: 'color 0.2s'
          }}
          onClick={() => setReviewRating(n)}
          aria-label={`${n} Star${n > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
      <span style={{ marginLeft: 8, fontSize: 14 }}>
        {reviewRating > 0 ? `${reviewRating} Star${reviewRating > 1 ? 's' : ''}` : 'Select rating'}
      </span>
    </div>
  );

  // Avatar helper
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length === 1
      ? parts[0][0]
      : parts[0][0] + parts[parts.length - 1][0];
  };

  // Add a helper to format "time ago"
  function timeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

    if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} day${day !== 1 ? 's' : ''} ago`;
    const mon = Math.floor(day / 30);
    if (mon < 12) return `${mon} month${mon !== 1 ? 's' : ''} ago`;
    const yr = Math.floor(mon / 12);
    return `${yr} year${yr !== 1 ? 's' : ''} ago`;
  }

  return (
    <div>
      {/* Summary Section */}
      {summary && summary.total > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ marginBottom: 8 }}>Student feedback</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', color: '#a6781c', textAlign: 'center' }}>
              {summary.average.toFixed(1)}
              <div style={{ fontSize: 24, color: '#a6781c', margin: '8px 0' }}>
                {'★'.repeat(Math.round(summary.average))}
                {'☆'.repeat(5 - Math.round(summary.average))}
              </div>
              <div style={{ fontSize: 16, color: '#a6781c', fontWeight: 600 }}>Course Rating</div>
            </div>
            <div>
              {summary.breakdown.map((count, i) => {
                const starValue = 5 - i;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    {/* Star meter bar - thinner and longer */}
                    <div style={{
                      background: '#e5e5e5',
                      height: 8,
                      width: 480,
                      marginRight: 8,
                      borderRadius: 4,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: '#6b7280',
                        height: 8,
                        width: `${summary.percentages[i] * 4.8}px`,
                        borderRadius: 4,
                        position: 'absolute',
                        left: 0,
                        top: 0
                      }} />
                    </div>
                    {/* Stars and percentage tightly grouped */}
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 20,
                      color: '#a6781c',
                      minWidth: 120,
                      textAlign: 'left'
                    }}>
                      <span>
                        {'★'.repeat(starValue)}
                        {'☆'.repeat(5 - starValue)}
                      </span>
                      <span style={{
                        color: '#6b2aff',
                        fontWeight: 500,
                        fontSize: 16,
                        minWidth: 40,
                        marginLeft: 2 // minimal gap between stars and percentage
                      }}>
                        {summary.percentages[i]}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List - now above the entry box */}
      <h3>Reviews</h3>
      {loading ? (
        <p>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p>No reviews available for this course.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32 }}>
          {reviews.map(r => (
            <li key={r.id} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#ececec',
                color: '#444',
                fontWeight: 700,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                flexShrink: 0
              }}>
                {getInitials(r.fullName || r.userName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.fullName || r.userName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a6781c', fontSize: 18 }}>
                  <span>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <div style={{ margin: '6px 0' }}>{r.comment}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Entry box and button below reviews */}
      <form onSubmit={handleReviewSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <label style={{ marginBottom: 0, fontWeight: 500 }}>Rating:</label>
          <StarInput />
        </div>
        <label style={{ fontWeight: 500, marginBottom: 6, display: 'block' }}>
          Comment:
          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            required
            rows={3}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 16,
              fontFamily: 'inherit',
              resize: 'vertical',
              background: '#fafafa',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#a6781c')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />
        </label>
        <br />
        <button
          type="submit"
          disabled={submitting || !reviewRating || !reviewComment.trim()}
          style={{
            background: submitting ? '#e5e5e5' : '#5146D8',
            color: submitting ? '#888' : '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 28px',
            fontSize: 16,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 12,
            boxShadow: submitting ? 'none' : '0 2px 8px rgba(166,120,28,0.08)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
        {errorMsg && (
          <div style={{ color: '#b71c1c', marginTop: 8, fontWeight: 500 }}>
            {errorMsg}
          </div>
        )}
      </form>
    </div>
  );
};

export default Reviews;