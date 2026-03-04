import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Today from "./pages/Today";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Weekly from "./pages/Weekly";
import SharedDigest from "./pages/SharedDigest";
import BlobCursor from "./components/BlobCursor";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/landing" />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (user) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <BlobCursor />
      <AuthProvider>
        <Routes>
          <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/shared/:token" element={<SharedDigest />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Today />} />
            <Route path="/history" element={<History />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/weekly" element={<Weekly />} />
          </Route>
          <Route path="*" element={<Navigate to="/landing" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
