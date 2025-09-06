import React, { useEffect, useState } from 'react';
import api from '../api';

const AnnouncementCrawler: React.FC = () => {
  const [cfg, setCfg] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('/api/lms/admin/announcements').catch(() => ({ data: null }));
        if (!mounted) return;
        setCfg(res.data || null);
      } catch { }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (!cfg || !cfg.enabled || !cfg.text) return null;
  // simple marquee-like effect using CSS animation; keep markup simple
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', background: cfg.backgroundColor || '#111827', color: cfg.textColor || '#fff', padding: '6px 12px' }}>
      <div style={{ display: 'inline-block', paddingLeft: '100%', animation: `marquee ${Math.max(20, Number(cfg.speed) || 60)}s linear infinite` }}>{cfg.text}</div>
      <style>{`@keyframes marquee { from { transform: translateX(0%); } to { transform: translateX(-100%); } }`}</style>
    </div>
  );
};

export default AnnouncementCrawler;
