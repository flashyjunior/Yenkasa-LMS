import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isAuthenticated, userName, logout } = useContext(AuthContext);

  if (!isAuthenticated) return null;

  return (
    <header className="app-navbar">
      <div className="brand"><Link to="/">LMS</Link></div>

      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/courses">Courses</Link>
        <Link to="/userprofile">Profile</Link>
      </nav>

      <div className="nav-actions">
        <div className="nav-username">{userName}</div>
        <button className="btn-logout" onClick={() => logout(false)}>Logout</button>
      </div>
    </header>
  );
};

export default Navbar;
