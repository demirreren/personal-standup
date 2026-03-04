import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Today from "./pages/Today";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Weekly from "./pages/Weekly";
import SharedDigest from "./pages/SharedDigest";
import BlobCursor from "./components/BlobCursor";
import DarkVeil from "./components/DarkVeil";

export default function App() {
  return (
    <BrowserRouter>
      <div className="darkveil-bg">
        <DarkVeil speed={0.4} hueShift={0} warpAmount={0.4} noiseIntensity={0.015} />
      </div>
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
