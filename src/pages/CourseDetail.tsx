import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import './CourseDetail.css';
import QASection from '../components/QASection'; // Import your tab components
import Announcements from '../components/Announcements';
import Reviews from '../components/Reviews';
import LearningTools from '../components/LearningTools'; // Create this component for materials

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'qa', label: 'Q&A' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'tools', label: 'Learning Tools' },
];

const CourseDetail: React.FC = () => {
  // support routes that use either :courseId or :id
  const params = useParams<{ courseId?: string; id?: string }>();
  const idParam = params.courseId ?? params.id;
  const idNum = idParam ? Number(idParam) : 0;

  const [course, setCourse] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const navigate = useNavigate();
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  const fetchLessons = async () => {
    try {
      // debug: show that we're attempting to load lessons
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] fetching lessons for course', idNum);
      const lessonsResp = await api.get(`/api/lms/courses/${idNum}/lessons`);
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] lessons response', lessonsResp?.status, lessonsResp?.data);
      const lessons = lessonsResp?.data ?? [];
      setCourse((prev: Record<string, any> | null) => ({ ...(prev ?? {}), lessons }));
    } catch (le: any) {
      // eslint-disable-next-line no-console
      console.warn('[CourseDetail] failed to fetch lessons', le?.response?.status, le?.response?.data ?? le?.message);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/api/lms/courses/${idNum}/materials`);
  const data = res?.data;
  setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      setMaterials([]);
    }
  };

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      // debug: log the overall fetch start
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] fetching course and subscriptions', idNum);
      const [courseResp, myCoursesResp] = await Promise.all([
        api.get(`/api/lms/courses/${idNum}`),
        api.get('/api/lms/my-courses')
      ]);
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] courseResp', courseResp?.status, courseResp?.data);
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] myCoursesResp', myCoursesResp?.status, myCoursesResp?.data);

      const fetchedCourse = courseResp?.data ?? null;
      setCourse(fetchedCourse);

      const my = myCoursesResp?.data ?? [];
      const isSub = Array.isArray(my) && my.some((c: any) => Number(c.id) === idNum);
      // eslint-disable-next-line no-console
      console.debug('[CourseDetail] isSub?', isSub);
      setSubscribed(isSub);

      if (isSub) {
        await fetchLessons();
        await fetchMaterials();
      } else {
        setCourse((prev: Record<string, any> | null) => ({ ...(prev ?? {}), lessons: [] }));
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[CourseDetail] fetch failed', err?.response?.data ?? err?.message);
      setError(err?.response?.data ?? err?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // if route param is missing or invalid, show not found (clear loading)
    if (!idParam || !idNum) {
      setLoading(false);
      setError('Course not found.');
      return;
    }
    fetch();
  }, [idParam, idNum]);

  // observe a sentinel to detect when the CTA becomes sticky and toggle shadow class
  useEffect(() => {
    const topOffset = 92; // matches CSS .course-cta top
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          // when sentinel is not intersecting the viewport (pushed above), CTA is stuck
          setIsStuck(!e.isIntersecting);
        });
      },
      { root: null, threshold: 0, rootMargin: `-${topOffset}px 0px 0px 0px` }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      await api.post(`/api/lms/courses/${idNum}/subscribe`);
      // refresh course + lessons after subscribing
      await fetch();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Subscribe failed', err);
      setError(err?.response?.data ?? 'Subscribe failed');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/lms/courses/${idNum}/subscribe`);
      // clear lessons after unsubscribing
      setSubscribed(false);
      setCourse((prev: Record<string, any> | null) => ({ ...(prev ?? {}), lessons: [] }));
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Unsubscribe failed', err);
      setError(err?.response?.data ?? 'Unsubscribe failed');
    } finally {
      setBusy(false);
    }
  };

  // ensure lessons load whenever subscribed flips to true
  useEffect(() => {
    if (subscribed) fetchLessons();
  }, [subscribed]);

  // When a lesson is clicked, set selectedLesson
  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson);
    setActiveTab('overview'); // Optionally switch to overview or another tab
  };

  if (loading) return (
    <div className="main-content">
      <div style={{ padding: 24 }}>Loading course...</div>
    </div>
  );
  if (error) return (
    <div className="main-content">
      <div style={{ padding: 24, color: 'red' }}>{error}</div>
    </div>
  );

  if (!course) return null;

  // additional metadata: studentsEnrolled, lastUpdated, language, instructorAvatar (may be undefined)
  const { title, description, lessons, thumbnailUrl, createdBy, rating, studentsEnrolled, lastUpdated, language, instructorAvatar, totalHours, lectureCount, price } = course as any;

  const formatMonthYear = (iso?: string | number) => {
    if (!iso) return '';
    const d = new Date(iso);
    try {
      return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    } catch (e) {
      return d.toLocaleDateString();
    }
  };

  // avatar fallback: use server-provided avatar if present, otherwise generate via ui-avatars with instructor name
  const avatarUrl = instructorAvatar || (createdBy ? `https://ui-avatars.com/api/?name=${encodeURIComponent(createdBy)}&background=0D8ABC&color=fff&size=128` : undefined);

  return (
    <div className="main-content">
      <div
        className="course-detail-container"
        style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start', // <-- force left alignment
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#00bfae',
            fontWeight: 'bold',
            marginBottom: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          &larr; Back
        </button>

        {/* Course Title & Meta */}
        <div className="course-hero" style={{ marginBottom: 18, textAlign: 'left' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{title}</h1>
          <div
            className="course-meta-row"
            style={{
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              marginTop: 8,
              textAlign: 'left',
            }}
          >
            {rating != null && (
              <div style={{ color: '#FFD700', fontSize: 18 }}>
                {'★'.repeat(Math.round(rating))}
                {'☆'.repeat(5 - Math.round(rating))}
              </div>
            )}
            {createdBy && <div>Facilitator: {createdBy}</div>}
            {studentsEnrolled != null ? (
              <div>{Number(studentsEnrolled).toLocaleString()} learners</div>
            ) : (
              <div style={{ color: '#9ca3af' }} title="This data isn't available yet">
                Learners: —
              </div>
            )}
            {lastUpdated ? (
              <div>Updated: {formatMonthYear(lastUpdated)}</div>
            ) : (
              <div style={{ color: '#9ca3af' }} title="This data isn't available yet">
                Updated: —
              </div>
            )}
          </div>
        </div>

        {/* Centered Instructor Card only */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div
            className="course-header-meta"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderRadius: 12,
              background: '#fff',
              padding: 16,
            }}
          >
            <img
              src={thumbnailUrl || '/images/default-course-thumbnail.svg'}
              alt={title}
              style={{
                width: 220,
                height: 'auto',
                borderRadius: 8,
                objectFit: 'cover',
                marginBottom: 12,
                maxWidth: 320,
              }}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div
                className="instructor-avatar"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  background: '#ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#333',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={createdBy || 'Instructor'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : createdBy ? (
                  createdBy.charAt(0).toUpperCase()
                ) : (
                  '?'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  <Link to={`/users/${createdBy}`} style={{ color: '#111827', textDecoration: 'none' }}>
                    {createdBy || 'Instructor'}
                  </Link>
                </div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  {studentsEnrolled != null ? `${studentsEnrolled} students` : ''}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12, width: '100%' }}>
              {!subscribed ? (
                <button
                  onClick={subscribe}
                  disabled={busy}
                  style={{
                    width: '100%',
                    background: '#ff6a00',
                    color: '#fff',
                    border: 'none',
                    padding: '0.7rem 1rem',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {busy ? 'Subscribing...' : price ? `Enroll • ${price}` : 'Enroll now'}
                </button>
              ) : (
                <button
                  onClick={unsubscribe}
                  disabled={busy}
                  style={{
                    width: '100%',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '0.7rem 1rem',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {busy ? 'Unsubscribing...' : 'Unenroll'}
                </button>
              )}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
              {lastUpdated ? (
                <div>Last updated: {formatMonthYear(lastUpdated)}</div>
              ) : (
                <div style={{ color: '#9ca3af' }} title="This data isn't available yet">
                  Last updated: —
                </div>
              )}
              {language && <div>Language: {language}</div>}
              {totalHours != null && <div>Total hours: {totalHours}</div>}
              {lectureCount != null && <div>Lectures: {lectureCount}</div>}
              {rating != null && <div style={{ marginTop: 6 }}>Rating: {rating.toFixed(1)} / 5</div>}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div
          className="course-tabs"
          style={{
            maxWidth: 980,
            margin: '0 auto',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ marginRight: 16, textAlign: 'left' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabs Content */}
        <div
          className="tab-content"
          style={{
            maxWidth: 980,
            margin: '0 auto',
            textAlign: 'left',
            width: '100%',
          }}
        >
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ textAlign: 'left' }}>Course Overview</h2>
              <div
                className="course-description-html"
                style={{ textAlign: 'left' }}
                dangerouslySetInnerHTML={{
                  __html: course?.description || '',
                }}
              />
              {/* Lessons List */}
              {subscribed && (
                <div className="lessons-section" style={{ textAlign: 'left' }}>
                  <h3>Lessons</h3>
                  <ul className="lessons-list">
                    {Array.isArray(lessons) && lessons.length > 0 ? (
                      lessons.map((lesson: any) => (
                        <li key={lesson.id}>
                          <button
                            className={`lesson-btn${selectedLesson?.id === lesson.id ? ' selected' : ''}`}
                            onClick={() => handleLessonClick(lesson)}
                          >
                            {lesson.title}
                          </button>
                          {lesson.duration != null && (
                            <span className="lesson-meta">• {lesson.duration} min</span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li>No lessons found for this course.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'qa' && <QASection courseId={idNum} />}

          {activeTab === 'announcements' && <Announcements courseId={idNum} />}

          {activeTab === 'reviews' && <Reviews courseId={idNum} />}

          {activeTab === 'tools' && <LearningTools materials={materials} courseId={idNum} />}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;