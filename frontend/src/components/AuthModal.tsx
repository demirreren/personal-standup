import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { X, Mail, Lock, User } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({ onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const reset = () => {
    setMode("login");
    setName("");
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message || (mode === "login" ? "Invalid credentials" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onClick={handleClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <X size={16} />
        </button>

        <div className="modal-brand">
          standup<span className="modal-brand-dot">.</span>
        </div>

        <h2 className="modal-title">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="modal-subtitle">
          {mode === "login" ? "Sign in to your standup" : "Start your accountability habit"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-msg">{error}</div>}
          {mode === "register" && (
            <div className="input-wrapper">
              <User size={14} className="input-icon" />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="input-with-icon"
              />
            </div>
          )}
          <div className="input-wrapper">
            <Mail size={14} className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === "login"}
              className="input-with-icon"
            />
          </div>
          <div className="input-wrapper">
            <Lock size={14} className="input-icon" />
            <input
              type="password"
              placeholder={mode === "register" ? "Password (min 6 chars)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 6 : undefined}
              className="input-with-icon"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-modal-submit">
            {loading
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="modal-footer-text">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button className="modal-switch-btn" onClick={switchMode}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
