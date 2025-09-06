import React, { useEffect, useState } from 'react';
import api from '../api';

const BadgesPage: React.FC = () => {
  const [badges, setBadges] = useState<any[]>([]);
  useEffect(() => { api.get('/api/lms/admin/badges').then(r => setBadges(Array.isArray(r.data) ? r.data : [])).catch(() => setBadges([])); }, []);
  return (
    <div className="main-content">
      <div style={{ padding: 16 }}>
        <h2>Badges</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {badges.map(b => (
            <div key={b.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
              <div style={{ fontWeight: 700 }}>{b.name}</div>
              <div style={{ color: '#666' }}>{b.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BadgesPage;
