import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, LogIn, Sun, BarChart3, Clock, Share2, ArrowRight } from "lucide-react";
import AuthModal from "./AuthModal";
import SplitText from "./SplitText";
import LockedOverlay from "./LockedOverlay";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Ready to plan your day?";
  if (hour < 17) return "How's the day going?";
  return "Time to reflect.";
}

const LOCKED_PAGES = {
  "/history": "history",
  "/dashboard": "dashboard",
  "/weekly": "weekly",
} as const;

type LockedPageKey = keyof typeof LOCKED_PAGES;

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo-mark">
            <svg className="logo-icon-svg" width="30" height="30" viewBox="0 0 30 30" fill="none">
              {/* Ball — fades on hover, replaced by the period in text */}
              <circle className="logo-ball" cx="10" cy="26.5" r="3.5" fill="var(--primary)" />
              {/* Figure — fades on hover */}
              <g className="logo-figure-group" stroke="var(--primary)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Head */}
                <circle cx="19" cy="4.5" r="3.5" fill="var(--primary)" stroke="none" />
                {/* Torso */}
                <path d="M 19 8 L 17 21" />
                {/* Front arm — bent at elbow, forearm up */}
                <path d="M 19 12 L 14 14 L 13 9" />
                {/* Back arm — swinging behind */}
                <path d="M 19 12 L 23 18" />
                {/* Front leg — high knee raise */}
                <path d="M 17 21 L 10 17 L 10 23" />
                {/* Back leg — trailing */}
                <path d="M 17 21 L 21 28" />
              </g>
            </svg>
          </div>
          <h1 className="logo">standup<span className="logo-dot" /></h1>
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
        ) : LOCKED_PAGES[location.pathname as LockedPageKey] ? (
          <LockedOverlay
            page={LOCKED_PAGES[location.pathname as LockedPageKey]}
            onSignIn={openLogin}
          />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-text-overlay">
              <SplitText
                text={getGreeting()}
                tag="h1"
                className="welcome-greeting"
                delay={40}
                duration={1.25}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="0px"
                textAlign="center"
              />
              <p className="welcome-hint">sign in to start your standup</p>
              <button className="btn-get-started" onClick={openLogin}>
                Get started
                <ArrowRight size={16} className="btn-get-started-arrow" />
              </button>
            </div>
          </div>
        )}
      </main>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
}
