import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@components/Layout';
import { ProtectedRoute, PublicRoute } from '@components/Auth';
import { Dashboard } from '@pages/Dashboard';
import { Budget } from '@pages/Budget';
import { Transactions } from '@pages/Transactions';
import { Goals } from '@pages/Goals';
import { Reports } from '@pages/Reports';
import { Settings } from '@pages/Settings';
import { AICoach } from '@pages/AICoach';
import { Login, Signup } from '@pages/Auth';
import { useUserStore } from '@stores';

function App() {
  const checkAuth = useUserStore((state) => state.checkAuth);

  // Check authentication on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="budget" element={<Budget />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="ai-coach" element={<AICoach />} />
      </Route>
    </Routes>
  );
}

export default App;
