import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { X, Mail, Lock, User } from "lucide-react";
import PixelSnow from "./PixelSnow";

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "login" | "register";
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" }
  })
};

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

  const fieldOffset = mode === "register" ? 0 : 0;

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onClick={handleClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* PixelSnow lives inside the card, clipped by overflow: hidden */}
        <div className="modal-snow-bg">
          <PixelSnow
            color="#7aa8f0"
            flakeSize={0.009}
            minFlakeSize={1.1}
            pixelResolution={160}
            speed={0.7}
            density={0.18}
            direction={118}
            brightness={0.75}
            depthFade={12}
            farPlane={20}
            gamma={0.4545}
            variant="square"
          />
        </div>

        <div className="modal-content-inner">
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
          {error && (
            <motion.div
              className="error-msg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}

          {mode === "register" && (
            <motion.div
              className="input-wrapper"
              custom={fieldOffset}
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              key="name-field"
            >
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
            </motion.div>
          )}

          <motion.div
            className="input-wrapper"
            custom={mode === "register" ? 1 : 0}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            key={`email-${mode}`}
          >
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
          </motion.div>

          <motion.div
            className="input-wrapper"
            custom={mode === "register" ? 2 : 1}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            key={`password-${mode}`}
          >
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
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            className="btn-modal-submit"
            custom={mode === "register" ? 3 : 2}
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            whileTap={!loading ? { scale: 0.98 } : undefined}
          >
            {loading
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Sign in" : "Create account"}
          </motion.button>
        </form>

        <p className="modal-footer-text">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button className="modal-switch-btn" onClick={switchMode}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
