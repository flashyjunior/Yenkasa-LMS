import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { DashboardIcon, CoursesIcon, LessonsIcon, QuizzesIcon, ProfileIcon, AdminIcon, HistoryIcon, CompletedIcon, LogoutIcon, CreateIcon } from './icons';
import { FaChartBar, FaHistory, FaBolt, FaBookOpen, FaUser } from './icons';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  useEffect(() => {
    // Only fetch for admin sidebar
    fetch('/api/lms/admin/courses', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => setCourses(data));
  }, []);
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">LMS</div>
      <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? '→' : '←'}
      </button>
      <nav>
        <ul className="sidebar-section">
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}><DashboardIcon /> Dashboard</NavLink></li>
        </ul>
        <div className="sidebar-section-label">Learning</div>
        <ul className="sidebar-section">
          <li><NavLink to="/courses" className={({ isActive }) => isActive ? 'active' : ''}><CoursesIcon /> Courses</NavLink></li>
          <li><NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}><ProfileIcon /> Profile</NavLink></li>
          <li><NavLink to="/completed-lessons" className={({ isActive }) => isActive ? 'active' : ''}><CompletedIcon /> Completed Lessons</NavLink></li>
          <li><NavLink to="/quiz-history" className={({ isActive }) => isActive ? 'active' : ''}><HistoryIcon /> Quiz History</NavLink></li>
        </ul>
        <div className="sidebar-section-label">Admin</div>
        <ul className="sidebar-section">
          <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}><AdminIcon /> Admin Dashboard</NavLink></li>
          <li><NavLink to="/admin-courses" className={({ isActive }) => isActive ? 'active' : ''}><CoursesIcon /> Courses</NavLink></li>
          <li><NavLink to="/user-management" className={({ isActive }) => isActive ? 'active' : ''}><FaUser /> User Management</NavLink></li>
          <li><NavLink to="/admin-lessons" className={({ isActive }) => isActive ? 'active' : ''}><LessonsIcon /> Lessons</NavLink></li>
          <li><NavLink to="/admin-quizzes" className={({ isActive }) => isActive ? 'active' : ''}><QuizzesIcon /> Quizzes</NavLink></li>
        </ul>
        <ul className="sidebar-section">
          <li><NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}><ProfileIcon /> Login</NavLink></li>
          <li><NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}><ProfileIcon /> Register</NavLink></li>
        </ul>
        <div className="sidebar-section-label">Shortcuts</div>
        <ul className="sidebar-section">
          <li><NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><FaBolt /> <span>Dashboard</span></NavLink></li>
          <li><NavLink to="/courses" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><FaBookOpen /> <span>Courses</span></NavLink></li>
          <li><NavLink to="/profile" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><FaUser /> <span>Profile</span></NavLink></li>
          <li><NavLink to="/quiz-history" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><FaHistory /> <span>Recent Activity</span></NavLink></li>
          <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><FaChartBar /> <span>Analytics</span></NavLink></li>
        </ul>
        {localStorage.getItem('token') && (
          <div style={{ position: 'absolute', bottom: 24, width: '100%' }}>
            <ul className="sidebar-section">
              <li><NavLink to="/logout" className={({ isActive }) => isActive ? 'active sidebar-link' : 'sidebar-link'}><LogoutIcon /> Logout</NavLink></li>
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
