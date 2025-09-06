import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, hasPrivilege } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // require specific dashboard privilege; fallback to courses if not available
  if (!hasPrivilege || (!hasPrivilege('ViewDashboard') && !hasPrivilege('ViewAdminMenu'))) {
    return <Navigate to="/courses" replace />;
  }
  return <>{children}</>;
};

export default DashboardRoute;
