import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import AnnouncementCrawler from './AnnouncementCrawler';
import './Navbar.css';
import { ChatIcon, BellIcon } from './icons';

const Navbar: React.FC = () => {
  const { isAuthenticated, userName, logout, hasPrivilege } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useUI();

  if (!isAuthenticated) return null;

  return (
    <header className="app-navbar">
      <nav className="nav-links">
        {/* Nav intentionally slimmed down; main navigation lives in the sidebar */}
      </nav>

      <div style={{ flex: 1 }}>
        <AnnouncementCrawler />
      </div>
      <div className="nav-actions">
        <div className="nav-icons">
          <div title="Chat" className="nav-icon"><ChatIcon size={18} /></div>
        </div>
        <div className="nav-username" style={{ marginLeft: 12, fontSize: 13 }}>{userName}</div>
      </div>
    </header>
  );
};

export default Navbar;
