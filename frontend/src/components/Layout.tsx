import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, LogIn, Sun, BarChart3, Clock, Share2, ArrowRight } from "lucide-react";
import AuthModal from "./AuthModal";

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };
  const openRegister = () => { setAuthMode("register"); setAuthOpen(true); };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <span className="logo-dot">.</span>
          <h1 className="logo">standup</h1>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Sun size={18} />
            <span>Today</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Clock size={18} />
            <span>History</span>
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/weekly" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <Share2 size={18} />
            <span>Weekly</span>
          </NavLink>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button onClick={openLogin} className="sidebar-signin-btn">
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </nav>

      <main className="main-content">
        {user ? (
          <Outlet />
        ) : (
          <div className="welcome-hero">
            <h1 className="welcome-title">
              Know what you shipped.<br />
              <span className="hero-gradient">Not just what kept you busy.</span>
            </h1>
            <p className="welcome-subtitle">
              Two check-ins a day. Thirty seconds each.<br />
              Your morning plan versus your evening reality.
            </p>
            <div className="welcome-ctas">
              <button onClick={openRegister} className="btn-primary btn-lg">
                Get started <ArrowRight size={18} />
              </button>
              <button onClick={openLogin} className="btn-ghost">
                Sign in
              </button>
            </div>
          </div>
        )}
      </main>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
