import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const InstructorProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // try backend endpoint, fallback to simple mock
        const res = await api.get(`/api/users/${username}`).catch(() => ({ data: { userName: username, fullName: username } }));
        if (!mounted) return;
        setProfile(res.data);
      } catch {
        if (!mounted) return;
        setProfile({ userName: username, fullName: username });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [username]);

  if (loading) return <div style={{ padding: 24 }}>Loading instructor...</div>;
  if (!profile) return <div style={{ padding: 24 }}>Instructor not found.</div>;

  return (
    <div style={{ padding: 24 }}>
      <Link to="/courses" style={{ color: '#00bfae', textDecoration: 'none' }}>&larr; Back to courses</Link>
      <h1 style={{ marginTop: 12 }}>{profile.fullName || profile.userName}</h1>
      <p style={{ color: '#6b7280' }}>Instructor profile stub — extend with bio, courses and contact info.</p>
      <div style={{ marginTop: 24 }}>
        <h3>Courses by {profile.fullName || profile.userName}</h3>
        <p>Listing courses is out of scope for this stub; navigate to the Courses page to see their courses.</p>
      </div>
    </div>
  );
};

export default InstructorProfile;
