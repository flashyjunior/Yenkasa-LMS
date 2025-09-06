import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { DashboardIcon, CoursesIcon, LessonsIcon, QuizzesIcon, ProfileIcon, AdminIcon, HistoryIcon, CompletedIcon, LogoutIcon, CreateIcon, ChatIcon, BellIcon, RolesIcon } from './icons';
import { useUI } from '../contexts/UIContext';

// Security dropdown for user/role management
const SecurityDropdown: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <div className="sidebar-section-label security-label" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>🔒 Security</span>
  <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <ul className="sidebar-section">
          <li><NavLink to="/user-management" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">👤 User Management</span></NavLink></li>
          <li><NavLink to="/admin-role-privileges" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">🛡️ Role Privileges</span></NavLink></li>
        </ul>
      )}
    </>
  );
};

// Logout header that mirrors Security header layout so icons align
const LogoutHeader: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  return (
    <div className="sidebar-section" style={{ marginTop: 6 }}>
      <div className="sidebar-section-label" onClick={onLogout} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><LogoutIcon /> Logout</span>
        {/* no arrow for logout */}
      </div>
    </div>
  );
};

// Small inline dropdown component for the Courses section
const CoursesDropdown: React.FC = () => {
  // collapsed by default; user toggles to open
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <div className="sidebar-section-label courses-label" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><CoursesIcon /> Courses</span>
  <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <ul className="sidebar-section">
          <li><NavLink to="/courses" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><CoursesIcon /> Featured Courses</span></NavLink></li>
          <li><NavLink to="/completed-lessons" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><CompletedIcon /> Completed Lessons</span></NavLink></li>
          <li><NavLink to="/quiz-history" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><HistoryIcon /> Quiz History</span></NavLink></li>
          <li><NavLink to="/certificates" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><CompletedIcon /> Certificates</span></NavLink></li>
          <li><NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><ProfileIcon /> Profile</span></NavLink></li>
        </ul>
      )}
    </>
  );
};

// Admin dropdown for admin-related course management (collapsed by default)
const AdminDropdown: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <div className="sidebar-section-label admin-label" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><AdminIcon /> Admin Courses</span>
  <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <ul className="sidebar-section">
          <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><AdminIcon /> Admin Dashboard</span></NavLink></li>
          <li><NavLink to="/admin-courses" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><CoursesIcon /> Featured Courses</span></NavLink></li>
              <li><NavLink to="/admin-reports" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">🚩 Reports</span></NavLink></li>
          <li><NavLink to="/admin-lessons" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><LessonsIcon /> Lessons</span></NavLink></li>
          <li><NavLink to="/admin-quizzes" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item"><QuizzesIcon /> Quizzes</span></NavLink></li>
        </ul>
      )}
    </>
  );
};

// Configuration dropdown (collapsed by default)
const ConfigurationDropdown: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <div className="sidebar-section-label config-label" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>⚙️ Configuration</span>
  <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <ul className="sidebar-section">
          <li><NavLink to="/admin-assets" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">⚙️ Certificate Assets</span></NavLink></li>
          <li><NavLink to="/admin-announcements" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">📣 Announcements</span></NavLink></li>
          <li><NavLink to="/badges" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">🏅 Badges</span></NavLink></li>
          <li><NavLink to="/admin-configuration/smtp" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">✉️ SMTP Settings</span></NavLink></li>
          <li><NavLink to="/admin-configuration/email-templates" className={({ isActive }) => isActive ? 'active' : ''}><span className="sidebar-submenu-item">📧 Email Templates</span></NavLink></li>
        </ul>
      )}
    </>
  );
};

const Sidebar: React.FC = () => {
  const { sidebarCollapsed: collapsed } = useUI();
  const [courses, setCourses] = useState<any[]>([]);
  const { isAuthenticated, hasPrivilege, fullName, profileImageUrl, userName, logout } = useAuth();
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const VIEW_ADMIN_PRIV = 'ViewAdminMenu';
  useEffect(() => {
    // fetch admin courses only when user has admin menu privilege
    if (!hasPrivilege(VIEW_ADMIN_PRIV)) return;
    api.get('/api/lms/admin/courses').then(res => setCourses(res.data as any[])).catch(() => setCourses([]));
  // fetch current user's roles to show under name
  api.get('/api/lms/users/me').then(r => { const d = r?.data as any; if (d?.roles) setRoleNames(d.roles); }).catch(() => {});
  }, [hasPrivilege]);
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: '#e5e7eb', overflow: 'hidden' }}>
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#e5e7eb' }} />
            )}
          </div>
          <div className="sidebar-user-name">{fullName || userName || 'Guest'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div title="Chat" className="nav-icon"><ChatIcon size={18} /></div>
          </div>
        </div>
      </div>
  {/* toggle moved to Navbar */}
      <nav>
        <ul className="sidebar-section">
          { (hasPrivilege && (hasPrivilege('ViewDashboard') || hasPrivilege('ViewAdminMenu'))) ? (
            <li>
              <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center' }}>
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><DashboardIcon /> Dashboard</span>
                </NavLink>
                <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }} />
              </div>
            </li>
          ) : (
            <li>
              <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center' }}>
                <NavLink to="/courses" end className={({ isActive }) => isActive ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <span className="sidebar-header-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}><CoursesIcon /> Courses</span>
                </NavLink>
                <span style={{ width: 72, textAlign: 'right', opacity: 0.7 }} />
              </div>
            </li>
          ) }
          {/* top logout removed - keep single logout later under security */}
        </ul>
  {/* Courses dropdown */}
  {/* Toggle the courses section to show Featured Courses, Completed Lessons, Quiz History, Certificates */}
  {/** small local state for collapsing */}
  {/* ...existing code... */}
        
  {/* Courses dropdown header and items */}
  <CoursesDropdown />
          {hasPrivilege(VIEW_ADMIN_PRIV) && (
          <>
            <AdminDropdown />
            {hasPrivilege && (hasPrivilege('ManageCertificateAssets') || hasPrivilege('ManageAnnouncements') || hasPrivilege('ManageBadges') || hasPrivilege('ManageSmtp') || hasPrivilege('ManageEmailTemplates')) ? <ConfigurationDropdown /> : null}
            {hasPrivilege && (hasPrivilege('ManageUsers') || hasPrivilege('ManageRolePrivileges')) ? <SecurityDropdown /> : null}
          </>
        )}
        {isAuthenticated && (
          <LogoutHeader onLogout={() => logout()} />
        )}
        {!isAuthenticated ? (
          <ul className="sidebar-section">
            <li><NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}><ProfileIcon /> Login</NavLink></li>
            <li><NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}><ProfileIcon /> Register</NavLink></li>
          </ul>
        ) : null}
  {/* Shortcuts removed per UX update; use main navigation above. */}
  {/* cleaned up footer actions - logout handled in profile or elsewhere */}
      </nav>
    </aside>
  );
};

export default Sidebar;
