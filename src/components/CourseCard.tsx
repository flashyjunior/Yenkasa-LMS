import React, { useState } from 'react';
import api from '../api';

type Props = {
  course: any;
  onSubscribed?: () => void;
};

const CourseCard: React.FC<Props> = ({ course, onSubscribed }) => {
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean>(course.isSubscribed ?? false);

  const subscribe = async () => {
    setLoading(true);
    try {
      // backend now uses JWT / User.Identity for user; no body required
      await api.post(`/api/lms/courses/${course.id}/subscribe`);
      setSubscribed(true);
      onSubscribed?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Subscribe failed', err);
      alert('Failed to subscribe.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      await api.delete(`/api/lms/courses/${course.id}/subscribe`);
      setSubscribed(false);
      onSubscribed?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unsubscribe failed', err);
      alert('Failed to unsubscribe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
      <h4>{course.title}</h4>
      <p>{course.description}</p>
      {subscribed ? (
        <button onClick={unsubscribe} disabled={loading}>Unsubscribe</button>
      ) : (
        <button onClick={subscribe} disabled={loading}>Subscribe</button>
      )}
    </div>
  );
};

export default CourseCard;