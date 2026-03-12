import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, role, status, loading, isAdmin, isActive } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Direct block for students in this app
  if (role === 'student' && location.pathname !== '/awaiting-approval') {
    return <Navigate to="/login" replace />;
  }

  // 2. Strict active check for staff (moderators/admins)
  // If not active and not already on the awaiting approval page, redirect there
  if (!isActive && location.pathname !== '/awaiting-approval') {
    return <Navigate to="/awaiting-approval" replace />;
  }

  // 3. If already active, don't let them stay on the awaiting approval page
  if (isActive && location.pathname === '/awaiting-approval') {
    return <Navigate to="/" replace />;
  }

  // 4. Admin only check
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
