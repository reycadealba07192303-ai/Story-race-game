import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleHomePath, type AuthUser } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: AuthUser['role'][];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', color: '#666' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return <>{children}</>;
}
