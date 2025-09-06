import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import QASection from '../components/QASection';

const tabs = ['Overview', 'Q&A', 'Announcements', 'Reviews', 'Learning tools'];

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const resp = await api.get(`/api/lms/courses/${courseId}`);
        setCourse(resp.data);
        const lessonsResp = await api.get(`/api/lms/courses/${courseId}/lessons`);
        setLessons(Array.isArray(lessonsResp.data) ? lessonsResp.data : []);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  // Gather all supplementary materials from lessons
  const allMaterials = lessons.flatMap(l => l.materials || []);

  if (loading) return <div className="main-content"><div className="card">Loading course…</div></div>;
  if (!course) return <div className="main-content"><div className="card">No course data found.</div></div>;

  return (
    <div className="main-content">
      <div className="lesson-detail card">
        <button onClick={() => navigate(-1)} className="back-link">&larr; Back</button>
        <h1 className="lesson-title">{course.title || course.name || 'Untitled course'}</h1>
        <p>{course.description}</p>

        <div className="lesson-tabs">
          <nav className="tabs-header" role="tablist" aria-label="Course sections">
            {tabs.map((tab, idx) => {
              const tabId = `detail-tab-${idx}`;
              const panelId = `detail-panel-${idx}`;
              return (
                <div
                  key={tab}
                  id={tabId}
                  role="tab"
                  tabIndex={0}
                  aria-selected={activeTab === tab}
                  aria-controls={panelId}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(tab); } }}
                >
                  {tab}
                </div>
              );
            })}
          </nav>
          <div className="tabs-panel">
            {activeTab === 'Overview' && (
              <div id="detail-panel-0" role="tabpanel" aria-labelledby="detail-tab-0" className="tab-pane overview">
                <h3>Lessons</h3>
                {lessons.length === 0 ? (
                  <div>No lessons found.</div>
                ) : (
                  lessons.map(lesson => (
                    <LessonDetails key={lesson.id} lesson={lesson} />
                  ))
                )}
              </div>
            )}
            {activeTab === 'Q&A' && (
              <div id="detail-panel-1" role="tabpanel" aria-labelledby="detail-tab-1">
                {/* Pass only courseId to QASection as per new prop signature */}
                <QASection courseId={course ? Number(course.id) : 0} />
              </div>
            )}
            {activeTab === 'Announcements' && (
              <div id="detail-panel-2" role="tabpanel" aria-labelledby="detail-tab-2" className="tab-pane announcements">
                <h3>Announcements</h3>
                <p className="muted">Course announcements from the instructor appear here.</p>
                <div className="announcements-placeholder">No announcements.</div>
              </div>
            )}
            {activeTab === 'Reviews' && (
              <div id="detail-panel-3" role="tabpanel" aria-labelledby="detail-tab-3" className="tab-pane reviews">
                <h3>Reviews</h3>
                <p className="muted">Student reviews and ratings for this course.</p>
                <div className="reviews-list"><p>No reviews yet.</p></div>
              </div>
            )}
            {activeTab === 'Learning tools' && (
              <div id="detail-panel-4" role="tabpanel" aria-labelledby="detail-tab-4" className="tab-pane tools">
                <h3>Learning tools</h3>
                <SupplementaryMaterials materials={allMaterials} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LessonDetails = ({ lesson }: { lesson: any }) => {
  const videoUrl = lesson.videoUrl || lesson.video || '';
  const isYouTube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');
  return (
    <div className="lesson-detail-card" style={{ marginBottom: 24 }}>
      <h4>{lesson.title || lesson.name || 'Untitled lesson'}</h4>
      <div className="lesson-media">
        {videoUrl ? (
          isYouTube(videoUrl) ? (
            <iframe
              width="100%"
              height="320"
              src={videoUrl.replace('watch?v=', 'embed/')}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video width="100%" height={320} controls>
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>
          )
        ) : (
          <div className="lesson-html" dangerouslySetInnerHTML={{ __html: lesson.content || lesson.body || '' }} />
        )}
      </div>
      <div className="lesson-overview">
        <p className="muted">{lesson.summary || lesson.excerpt || lesson.description || 'No overview provided for this lesson.'}</p>
      </div>
      <a href={`/lesson/${lesson.id}`}>View Full Lesson</a>
    </div>
  );
};

const SupplementaryMaterials = ({ materials }: { materials: any[] }) => (
  <div>
    <h4>Supplementary Materials</h4>
    <ul>
      {materials.length === 0 ? (
        <li>No supplementary materials found.</li>
      ) : (
        materials.map((mat, idx) => (
          <li key={idx}><a href={mat.url}>{mat.name}</a></li>
        ))
      )}
    </ul>
  </div>
);

export default CourseDetails;
