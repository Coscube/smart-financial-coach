import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@stores';

export function ProtectedRoute({ children }) {
  // Auth disabled for development: always allow
  return children;
}

export function PublicRoute({ children }) {
  // Auth disabled for development: always allow
  return children;
}
