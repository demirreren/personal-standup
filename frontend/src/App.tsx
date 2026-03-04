import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Today from "./pages/Today";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Weekly from "./pages/Weekly";
import SharedDigest from "./pages/SharedDigest";
import BlobCursor from "./components/BlobCursor";

export default function App() {
  return (
    <BrowserRouter>
      <BlobCursor />
      <AuthProvider>
        <Routes>
          <Route path="/shared/:token" element={<SharedDigest />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Today />} />
            <Route path="/history" element={<History />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/weekly" element={<Weekly />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
