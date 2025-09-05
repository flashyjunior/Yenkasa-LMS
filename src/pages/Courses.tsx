import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Courses.css';


interface Course {
  id: number;
  title: string;
  description: string;
  rating?: number;
  reviews?: { user: string; comment: string }[];
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  axios.get('/api/lms/courses')
      .then(res => {
        // Only show published courses
        const all = res.data as Course[];
        setCourses(all.filter(c => (c as any).published));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);


  // Helper to render stars
  const renderStars = (rating: number = 0) => {
    return (
      <span style={{ color: '#FFD700', fontSize: '1.2rem' }}>
        {'★'.repeat(Math.round(rating))}
        {'☆'.repeat(5 - Math.round(rating))}
      </span>
    );
  };

  // Mock reviews if not present
  const getMockReviews = (course: Course) =>
    course.reviews || [
      { user: 'Jane Doe', comment: 'Great course!' },
      { user: 'John Smith', comment: 'Very helpful and well explained.' }
    ];

  return (
    <div className="courses-list-enhanced">
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        <h2>Courses</h2>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="courses-grid">
          {courses.map(course => (
            <div className="course-card" key={course.id}>
              <div className="course-card-header">
                <h3>{course.title}</h3>
                <div>{renderStars(course.rating || 4)}</div>
              </div>
              <p className="course-desc">{course.description}</p>
              <Link className="details-btn" to={`/courses/${course.id}`}>View Details</Link>
              <div className="course-reviews">
                <strong>User Reviews:</strong>
                <ul>
                  {getMockReviews(course).map((review, idx) => (
                    <li key={idx}>
                      <span style={{ fontWeight: 'bold' }}>{review.user}:</span> {review.comment}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
