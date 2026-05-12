import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initStore, getSession } from './lib/store';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

// Protected route wrapper (async version)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!user || !user.verified) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin route wrapper (checks role from Firestore)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    getSession().then(user => {
      if (user && user.role === "admin") {
        setOk(true);
      } else {
        setOk(false);
      }
    });
  }, []);

  if (ok === null) return null;

  if (!ok) return <Navigate to="/admin-login" replace />;

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initStore().catch(console.error);
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="/verify" element={<Auth mode="verify" />} />
        <Route path="/forgot" element={<Auth mode="forgot" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}