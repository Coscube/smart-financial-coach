import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@stores';

export function ProtectedRoute({ children }) {
  const user = useUserStore((state) => state.user);
  const location = useLocation();

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const user = useUserStore((state) => state.user);
  const location = useLocation();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
