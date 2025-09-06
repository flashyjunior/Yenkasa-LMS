import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Switch from '@mui/material/Switch';
interface Course {
  id: number;
  title: string;
  published: boolean;
}

const EditLesson: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPrivilege } = useAuth();
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passMark, setPassMark] = useState(50); // Default to 50%
  const [duration, setDuration] = useState<number | ''>('');

  const handleTogglePublish = async () => {
    try {
      if (!published) {
        await api.post(`/api/lms/lessons/${id}/publish`);
        setPublished(true);
      } else {
        await api.post(`/api/lms/lessons/${id}/unpublish`);
        setPublished(false);
      }
    } catch {
      setError('Failed to update publish status.');
    }
  };

  useEffect(() => {
    // Fetch lesson
    (async () => {
      try {
        const res = await api.get(`/api/lms/lessons/${id}`);
        type LessonApi = {
          title?: string;
          Title?: string;
          content?: string;
          Content?: string;
          videoUrl?: string;
          VideoUrl?: string;
          courseId?: number | string;
          CourseId?: number | string;
          published?: boolean;
          Published?: boolean;
          passMark?: number | string;
          PassMark?: number | string;
          duration?: number | string;
          Duration?: number | string;
        };
        const l: LessonApi = res.data ?? {};
        // support both camelCase and PascalCase shapes from API
        setTitle(l.title ?? l.Title ?? '');
  // accept both Content and VideoUrl shapes
  setVideoUrl(l.videoUrl ?? l.VideoUrl ?? l.content ?? l.Content ?? '');
        setCourseId(String(l.courseId ?? l.CourseId ?? ''));
        setPublished(Boolean(l.published ?? l.Published ?? false));
        setPassMark(Number(l.passMark ?? l.PassMark ?? 50));
        const durationValue = l.duration ?? l.Duration;
        setDuration(durationValue === undefined || durationValue === null || durationValue === '' ? '' : Number(durationValue));
      } catch (e) {
        setError('Failed to load lesson.');
      } finally {
        setLoading(false);
      }
    })();

    // Fetch courses for dropdown. API may return either an array or a paginated { items, total } shape.
    (async () => {
      try {
        const res = await api.get('/api/lms/admin/courses');
        const d: any = res.data;
        let list: Course[] = [];
        if (Array.isArray(d)) list = d as Course[];
        else if (d && Array.isArray(d.items)) list = d.items as Course[];

        // If editing an existing lesson, ensure its current course is present in the list even if unpublished
        if (courseId && courseId !== '') {
          const exists = list.some(c => String(c.id) === String(courseId));
          if (!exists) {
            try {
              const single = await api.get(`/api/lms/admin/courses/${courseId}`);
              const sc: any = single?.data;
              if (sc && (sc.id !== undefined)) list.unshift({ id: sc.id, title: sc.title || 'Untitled', published: Boolean(sc.published) });
            } catch {
              // ignore
            }
          }
        }

        // Prefer showing published courses first but keep unpublished ones (so admins can keep selection)
        list.sort((a,b) => (b.published === a.published) ? a.title.localeCompare(b.title) : (b.published ? 1 : -1));
        setCourses(list);
      } catch {
        setCourses([]);
      }
    })();
  }, [id]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: any = {
        id: Number(id),
        Title: title,
        VideoUrl: videoUrl,
        Content: videoUrl,
        CourseId: Number(courseId),
        Published: published,
        PassMark: Number(passMark)
      };
      if (duration !== '') payload.Duration = Number(duration);

      await api.put(`/api/lms/lessons/${id}`, payload);
  if (hasPrivilege && hasPrivilege('ViewAdminMenu')) navigate('/admin-lessons');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data || 'Failed to update lesson.');
    }
  };

  if (loading) return <p>Loading...</p>;
  
  return (
    <div className="card" style={{ maxWidth: 500, margin: '2rem auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#00bfae', fontWeight: 'bold', marginBottom: 12, cursor: 'pointer' }}>&larr; Back</button>
      <h2>Edit Lesson</h2>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: 8 }}>Published</span>
        <Switch
          checked={published}
          onChange={handleTogglePublish}
          color="primary"
        />
        <span style={{ marginLeft: 8, color: published ? 'green' : 'gray', fontWeight: 'bold' }}>
          {published ? 'ON' : 'OFF'}
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Video URL / Content</label>
          <input
            type="text"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Course</label>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="">Select a course</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>
            Pass Mark (%)
            <input
              type="number"
              value={passMark}
              min={0}
              max={100}
              onChange={e => setPassMark(Number(e.target.value))}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Duration (minutes)
            <input
              type="number"
              min={0}
              value={duration}
              onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
              placeholder="e.g. 10"
            />
          </label>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ background: '#00bfae', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold' }}>
          Save Changes
        </button>
                <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{ background: '#ff5252', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.5rem', fontWeight: 'bold', marginLeft: 12 }}
                >
                    Delete Lesson
                </button>
                {showDeleteModal && (
                  <Modal
                    title="Delete Lesson"
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={async () => {
                      try {
                        await api.delete(`/api/lms/admin/lessons/${id}`);
                        if (hasPrivilege && hasPrivilege('ViewAdminMenu')) navigate('/admin');
                      } catch {
                        setError('Failed to delete lesson.');
                      }
                    }}
                  >
                    <p>Are you sure you want to delete this lesson? This action cannot be undone.</p>
                  </Modal>
                )}
      </form>
    </div>
  );
};

export default EditLesson;
