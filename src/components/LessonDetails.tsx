import React from 'react';

interface LessonDetailsProps {
  lesson: {
    id: number;
    title: string;
    description?: string;
    content?: string; // This may be a video URL or text
    duration?: number;
    [key: string]: any;
  };
  courseId: number;
  autoPlay?: boolean;
  style?: React.CSSProperties;
}

const LessonDetails: React.FC<LessonDetailsProps> = ({ lesson, autoPlay = true, style }) => {
  if (!lesson) return null;

  // Use content as video URL if it looks like a URL
  const videoUrl =
    typeof lesson.content === 'string' &&
    (lesson.content.startsWith('http://') || lesson.content.startsWith('https://'))
      ? lesson.content
      : '';

  const isYouTube = (url: string) =>
    !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));

  return (
    <div style={{ ...style }}>
      <h2 style={{ marginBottom: 8 }}>{lesson.title}</h2>
      {lesson.description && (
        <div style={{ marginBottom: 16, color: '#444' }}>{lesson.description}</div>
      )}
      {videoUrl ? (
        <div style={{ marginBottom: 16 }}>
          {isYouTube(videoUrl) ? (
            <iframe
              width="100%"
              height="420"
              src={
                videoUrl.includes('embed')
                  ? videoUrl
                  : videoUrl.replace('watch?v=', 'embed/')
              }
              title="Lesson Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: 8, background: '#000' }}
            />
          ) : (
            <video
              width="100%"
              height={420}
              controls
              autoPlay={autoPlay}
              style={{ borderRadius: 8, background: '#000' }}
            >
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ) : (
        <div style={{ color: '#888', marginBottom: 16 }}>
          {lesson.content && typeof lesson.content === 'string'
            ? lesson.content
            : 'No video available for this lesson.'}
        </div>
      )}
      <div style={{ fontSize: 13, color: '#888' }}>
        Duration: {lesson.duration ? `${lesson.duration} min` : '—'}
      </div>
    </div>
  );
};

export default LessonDetails;