import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const LessonDetail: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId?: string; lessonId?: string }>();
  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) { setError('Missing lesson id'); setLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        const resp = await api.get(`/api/lms/lessons/${lessonId}`);
        if (mounted) setLesson(resp?.data ?? null);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load lesson');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [lessonId]);

  if (loading) return <div>Loading lesson...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!lesson) return <div>No lesson data found.</div>;

  return (
    <div>
      <h1>{lesson.title || lesson.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: lesson.content || lesson.body || '' }} />
    </div>
  );
};

export default LessonDetail;