import React, { useEffect, useState, useRef } from 'react';
import './LessonDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import * as signalR from '@microsoft/signalr';
import QASection from '../components/QASection';

const LessonDetail: React.FC = () => {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabs = ['Overview', 'Q&A', 'Announcements', 'Reviews', 'Learning tools'];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  useEffect(() => {
    let mounted = true;
    if (!lessonId) {
      setError('Missing lesson id');
      setLoading(false);
      return;
    }
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

  if (loading) return <div className="main-content"><div className="card">Loading lesson…</div></div>;
  if (error) return <div className="main-content"><div className="card" style={{ color: 'red' }}>{error}</div></div>;
  if (!lesson) return <div className="main-content"><div className="card">No lesson data found.</div></div>;

  const videoUrl = lesson.videoUrl || lesson.VideoUrl || lesson.content || lesson.Content || '';
  const isYouTube = (url: string) => !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));

  return (
    <div className="main-content">
      <div className="lesson-detail card">
        <button onClick={() => navigate(-1)} className="back-link">&larr; Back</button>
        <h1 className="lesson-title">{lesson.title || lesson.name || 'Untitled lesson'}</h1>

        <div className="lesson-media">
          {videoUrl ? (
            isYouTube(videoUrl) ? (
              <iframe
                width="100%"
                height="480"
                src={videoUrl.replace('watch?v=', 'embed/')}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video width="100%" height={480} controls>
                <source src={videoUrl} />
                Your browser does not support the video tag.
              </video>
            )
          ) : (
            <div className="lesson-html" dangerouslySetInnerHTML={{ __html: lesson.content || lesson.body || '' }} />
          )}
        </div>

        <div className="lesson-tabs">
          <nav className="tabs-header" role="tablist" aria-label="Lesson sections">
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
                <h3>Overview</h3>
                <p className="muted">{lesson.summary || lesson.excerpt || lesson.description || 'No overview provided for this lesson.'}</p>
                <div dangerouslySetInnerHTML={{ __html: lesson.content || lesson.body || '' }} />
              </div>
            )}
              {/* {activeTab === 'Q&A' && <div id="detail-panel-1" role="tabpanel" aria-labelledby="detail-tab-1"><QASection lessonId={lessonId} /></div>} */}
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
                <p className="muted">Student reviews and ratings for this lesson.</p>
                <div className="reviews-list"><p>No reviews yet.</p></div>
              </div>
            )}
            {activeTab === 'Learning tools' && (
              <div id="detail-panel-4" role="tabpanel" aria-labelledby="detail-tab-4" className="tab-pane tools">
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
      </div>
    </div>
  );
};

export default LessonDetail;