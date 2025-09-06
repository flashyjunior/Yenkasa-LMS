import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, hasPrivilege } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // require the ViewAdminMenu privilege for admin pages
  if (!hasPrivilege || !hasPrivilege('ViewAdminMenu')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
