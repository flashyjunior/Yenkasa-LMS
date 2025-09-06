import React from 'react';
import { Link } from 'react-router-dom';

type InstructorCardProps = {
  name?: string;
  avatarUrl?: string;
  studentsEnrolled?: number;
  lastUpdated?: string | number;
  language?: string;
  totalHours?: number;
  lectureCount?: number;
  rating?: number;
};

const formatMonthYear = (iso?: string | number) => {
  if (!iso) return '';
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  } catch (e) {
    return d.toLocaleDateString();
  }
};

const InstructorCard: React.FC<InstructorCardProps> = ({
  name,
  avatarUrl,
  studentsEnrolled,
  lastUpdated,
  language,
  totalHours,
  lectureCount,
  rating,
}) => (
  <div className="instructor-card" style={{ width: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 20, marginBottom: 16 }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
      <div className="instructor-avatar" style={{ width: 64, height: 64, borderRadius: 9999, overflow: 'hidden', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#333' }}>
        {avatarUrl ? <img src={avatarUrl} alt={name || 'Instructor'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name ? name.charAt(0).toUpperCase() : '?')}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15 }}>
          <Link to={name ? `/users/${name}` : '#'} style={{ color: '#111827', textDecoration: 'none' }}>{name || 'Instructor'}</Link>
        </div>
        <div style={{ color: '#6b7280', fontSize: 13 }}>{studentsEnrolled != null ? `${studentsEnrolled} students` : ''}</div>
      </div>
    </div>
    <div style={{ color: '#6b7280', fontSize: 13 }}>
      {lastUpdated ? <div>Last updated: {formatMonthYear(lastUpdated)}</div> : <div style={{ color: '#9ca3af' }} title="This data isn't available yet">Last updated: —</div>}
      {language && <div>Language: {language}</div>}
      {totalHours != null && <div>Total hours: {totalHours}</div>}
      {lectureCount != null && <div>Lectures: {lectureCount}</div>}
      {rating != null && <div style={{ marginTop: 6 }}>Rating: {rating.toFixed(1)} / 5</div>}
    </div>
  </div>
);

export default InstructorCard;