import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@stores';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login while saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  if (isAuthenticated) {
    // Redirect to the page they came from, or home
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children;
}
