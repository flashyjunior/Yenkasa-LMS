import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

interface Course {
  id: number;
  title: string;
  description: string;
}
interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
}

const CourseDetails: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>(); // ensure name matches route
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) {
      // optional: navigate back or show message
      // navigate('/courses');
      return;
    }

    (async () => {
      try {
        const resp = await api.get(`/api/lms/courses/${courseId}`);
        setCourse(resp.data);
      } catch (e) {
        console.error('Failed to load course', e);
      }
    })();
  }, [courseId]);

  return (
    <div className="card course-details">
      {loading ? <p>Loading...</p> : course ? (
        <>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <h3>Lessons</h3>
          <ul>
            {lessons.length === 0 ? <li>No lessons found.</li> : lessons.map(lesson => (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong>
                <br />
                <a href={`/lesson/${lesson.id}`}>View Lesson</a>
              </li>
            ))}
          </ul>
        </>
      ) : <p>Course not found.</p>}
    </div>
  );
};

export default CourseDetails;
