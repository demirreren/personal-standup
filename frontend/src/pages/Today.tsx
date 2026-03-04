import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import SplitText from "../components/SplitText";
import { api, type Checkin, type DailySummary } from "../lib/api";
import {
  Sun, Moon, Zap, Send, Check, Sparkles, Loader,
  ArrowRight, RotateCcw, X,
} from "lucide-react";

const ENERGY_LABELS = ["", "Drained", "Low", "Okay", "Good", "Fired up"];

// Spring used for the shared-layout (layoutId) transitions
const LAYOUT_SPRING = { type: "spring" as const, stiffness: 260, damping: 32, mass: 1 };

function getSignedOutGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Ready to plan your day?";
  if (h < 17) return "How's the day going?";
  return "Time to reflect.";
}

function getSignedInGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}`;
}

export default function Today() {
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [morning, setMorning] = useState<Checkin | null>(null);
  const [evening, setEvening] = useState<Checkin | null>(null);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const [morningBody, setMorningBody] = useState("");
  const [morningEnergy, setMorningEnergy] = useState<number | null>(null);
  const [eveningBody, setEveningBody] = useState("");
  const [eveningEnergy, setEveningEnergy] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [morningFlipped, setMorningFlipped] = useState(false);
  const [eveningFlipped, setEveningFlipped] = useState(false);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!user) return;
    setCheckinsLoading(true);
    api.checkins.today().then(({ morning: m, evening: e }) => {
      setMorning(m);
      setEvening(e);
      if (m) setMorningFlipped(true);
      if (e) setEveningFlipped(true);
      setCheckinsLoading(false);
    });
  }, [user?.id]);

  const submitCheckin = async (type: "morning" | "evening") => {
    setSubmitting(true);
    try {
      const body = type === "morning" ? morningBody : eveningBody;
      const energy = type === "morning" ? morningEnergy : eveningEnergy;
      const { checkin } = await api.checkins.create({
        checkin_type: type,
        body,
        ...(energy ? { energy } : {}),
      });
      if (type === "morning") { setMorning(checkin); setMorningBody(""); }
      else { setEvening(checkin); setEveningBody(""); }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };

  if (authLoading) return <div className="page-loading">Loading...</div>;

  return (
    <>
      {/*
        initial={false} → skip entry animations when the page first loads
        (prevents the layout animation from playing if the user is already signed in).
        When the user explicitly signs in during a session, the animations DO play.
      */}
      <AnimatePresence initial={false}>

        {/* ================================================================
            SIGNED-OUT STATE
            The layoutId elements (greeting, both cards) are "registered" here
            at their peek positions. When the signed-in tree renders with the
            same layoutId values, Framer Motion flies them to the new positions.
        ================================================================ */}
        {!user && (
          <motion.div
            key="signed-out"
            className="welcome-screen"
            exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeIn" } }}
          >
            {/* Center text block — the greeting layoutId sits here */}
            <div className="welcome-text-overlay">

              {/* SHARED: greeting block — will fly to the top of the signed-in page */}
              <motion.div
                layoutId="today-greeting"
                layout
                transition={LAYOUT_SPRING}
                style={{ textAlign: "center" }}
              >
                <SplitText
                  text={getSignedOutGreeting()}
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
              </motion.div>

              {/* NON-SHARED: hint + button — these fade out */}
              <motion.p
                className="welcome-hint"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              >
                sign in to start your standup
              </motion.p>
              <motion.button
                className="btn-get-started"
                onClick={openLogin}
                exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } }}
              >
                Get started
                <ArrowRight size={16} className="btn-get-started-arrow" />
              </motion.button>
            </div>

            {/* SHARED: morning peek card — will fly to the flip card position */}
            <div className="welcome-card-peek welcome-card-peek--left">
              <PeekTiltWrapper>
                <motion.div
                  layoutId="card-morning"
                  layout
                  transition={LAYOUT_SPRING}
                  initial={{ opacity: 0, y: 120, rotate: -6 }}
                  animate={{ opacity: 1, y: 0, rotate: -6 }}
                  className="peek-card"
                  style={{
                    filter: "drop-shadow(0 0 48px rgba(245, 158, 11, 0.22)) drop-shadow(0 20px 40px rgba(0,0,0,0.6))",
                  }}
                >
                  <div className="peek-card-body morning">
                    <div className="peek-card-overlay">
                      <span className="peek-card-label morning-label">☀️ Morning Check-in</span>
                    </div>
                  </div>
                </motion.div>
              </PeekTiltWrapper>
            </div>

            {/* SHARED: evening peek card */}
            <div className="welcome-card-peek welcome-card-peek--right">
              <PeekTiltWrapper>
                <motion.div
                  layoutId="card-evening"
                  layout
                  transition={LAYOUT_SPRING}
                  initial={{ opacity: 0, y: 120, rotate: 6 }}
                  animate={{ opacity: 1, y: 0, rotate: 6 }}
                  className="peek-card"
                  style={{
                    filter: "drop-shadow(0 0 48px rgba(139, 92, 246, 0.22)) drop-shadow(0 20px 40px rgba(0,0,0,0.6))",
                  }}
                >
                  <div className="peek-card-body evening">
                    <div className="peek-card-overlay">
                      <span className="peek-card-label evening-label">🌙 Evening Check-out</span>
                    </div>
                  </div>
                </motion.div>
              </PeekTiltWrapper>
            </div>
          </motion.div>
        )}

        {/* ================================================================
            SIGNED-IN STATE
            The same layoutId elements appear here — Framer Motion animates
            them from their signed-out screen positions to these new positions.
        ================================================================ */}
        {user && (
          <motion.div
            key="signed-in"
            className="today-page-main"
          >
            {/* SHARED: greeting — animates from screen center to top of page */}
            <motion.header
              layoutId="today-greeting"
              layout
              transition={LAYOUT_SPRING}
              className="today-greeting-header"
            >
              {/*
                Key on user.id so SplitText re-mounts and plays its char animation
                while the container is flying from center → top-left simultaneously.
              */}
              <SplitText
                key={`greeting-${user.id}`}
                text={getSignedInGreeting(user.name)}
                tag="h2"
                className="today-greeting-text"
                delay={18}
                duration={0.85}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 22 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0}
                rootMargin="0px"
                textAlign="left"
              />
              <motion.p
                className="date-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
              >
                {dateStr}
              </motion.p>
            </motion.header>

            {checkinsLoading ? (
              <div className="page-loading">Loading...</div>
            ) : (
              <>
                <div className="standup-flip-cards">

                  {/* SHARED: morning card — animates from peek position to here */}
                  <motion.div
                    layoutId="card-morning"
                    layout
                    transition={LAYOUT_SPRING}
                    animate={{ rotate: 0 }}
                    className={`standup-flip-card${morningFlipped ? " flipped" : ""}${morning ? " completed" : ""}`}
                    onClick={() => !morningFlipped && setMorningFlipped(true)}
                  >
                    {/*
                      The inner content fades in slightly delayed so the
                      size-change from 320px² (peek) to full flip-card size
                      is masked while the card is mid-flight.
                    */}
                    <motion.div
                      className="standup-flip-card-inner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.22, duration: 0.3 }}
                    >
                      <div className="standup-flip-card-front morning">
                        <div className="flip-card-overlay morning-overlay">
                          <div className="flip-card-top-row">
                            {morning ? (
                              <div className="flip-completed-badge"><Check size={12} /> Done</div>
                            ) : (
                              <div className="flip-icon-btn"><RotateCcw size={15} /></div>
                            )}
                          </div>
                          <div className="flip-card-front-bottom">
                            <div className="flip-card-title-row">
                              <Sun size={22} className="flip-card-icon-morning" />
                              <h3>Morning Check-in</h3>
                            </div>
                            {!morning && <p className="flip-card-open-hint">Click to open</p>}
                          </div>
                        </div>
                      </div>

                      <div
                        className="standup-flip-card-back"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flip-back-header">
                          <Sun size={18} className="flip-card-icon-morning" />
                          <h3>Morning Check-in</h3>
                          {morning ? (
                            <Check size={16} className="check-icon" />
                          ) : (
                            <button
                              className="flip-back-close"
                              onClick={() => setMorningFlipped(false)}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {morning ? (
                          <div className="checkin-content">
                            <p>{morning.body}</p>
                            {morning.energy && (
                              <div className="energy-display">
                                <Zap size={14} />
                                <span>{ENERGY_LABELS[morning.energy]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <form
                            className="checkin-form"
                            onSubmit={(e) => { e.preventDefault(); submitCheckin("morning"); }}
                          >
                            <textarea
                              placeholder="What are you working on today? Any blockers?"
                              value={morningBody}
                              onChange={(e) => setMorningBody(e.target.value)}
                              required
                              rows={4}
                            />
                            <div className="checkin-form-footer">
                              <EnergyPicker value={morningEnergy} onChange={setMorningEnergy} />
                              <button
                                type="submit"
                                disabled={submitting || !morningBody.trim()}
                                className="btn-primary btn-sm"
                              >
                                <Send size={14} /><span>Check in</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* SHARED: evening card — animates from peek position to here */}
                  <motion.div
                    layoutId="card-evening"
                    layout
                    transition={LAYOUT_SPRING}
                    animate={{ rotate: 0 }}
                    className={`standup-flip-card${eveningFlipped ? " flipped" : ""}${evening ? " completed" : ""}`}
                    onClick={() => !eveningFlipped && setEveningFlipped(true)}
                  >
                    <motion.div
                      className="standup-flip-card-inner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.32, duration: 0.3 }}
                    >
                      <div className="standup-flip-card-front evening">
                        <div className="flip-card-overlay evening-overlay">
                          <div className="flip-card-top-row">
                            {evening ? (
                              <div className="flip-completed-badge"><Check size={12} /> Done</div>
                            ) : (
                              <div className="flip-icon-btn"><RotateCcw size={15} /></div>
                            )}
                          </div>
                          <div className="flip-card-front-bottom">
                            <div className="flip-card-title-row">
                              <Moon size={22} className="flip-card-icon-evening" />
                              <h3>Evening Check-out</h3>
                            </div>
                            {!evening && <p className="flip-card-open-hint">Click to open</p>}
                          </div>
                        </div>
                      </div>

                      <div
                        className="standup-flip-card-back"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flip-back-header">
                          <Moon size={18} className="flip-card-icon-evening" />
                          <h3>Evening Check-out</h3>
                          {evening ? (
                            <Check size={16} className="check-icon" />
                          ) : (
                            <button
                              className="flip-back-close"
                              onClick={() => setEveningFlipped(false)}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {evening ? (
                          <div className="checkin-content">
                            <p>{evening.body}</p>
                            {evening.energy && (
                              <div className="energy-display">
                                <Zap size={14} />
                                <span>{ENERGY_LABELS[evening.energy]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <form
                            className="checkin-form"
                            onSubmit={(e) => { e.preventDefault(); submitCheckin("evening"); }}
                          >
                            <textarea
                              placeholder="What did you actually finish? What's carrying over?"
                              value={eveningBody}
                              onChange={(e) => setEveningBody(e.target.value)}
                              required
                              rows={4}
                            />
                            <div className="checkin-form-footer">
                              <EnergyPicker value={eveningEnergy} onChange={setEveningEnergy} />
                              <button
                                type="submit"
                                disabled={submitting || !eveningBody.trim()}
                                className="btn-primary btn-sm"
                              >
                                <Send size={14} /><span>Check out</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {morning && evening && (
                  <motion.div
                    className="day-complete"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Check size={24} />
                    <p>You've completed both check-ins today. Nice work.</p>
                  </motion.div>
                )}

                {(morning || evening) && (
                  <motion.div
                    className="summary-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    {summary ? (
                      <div className="summary-card">
                        <div className="summary-header">
                          <Sparkles size={18} />
                          <h3>AI Daily Summary</h3>
                        </div>
                        <p className="summary-text">{summary.ai_summary}</p>
                        {summary.carry_overs && (
                          <p className="carry-overs">Carrying over: {summary.carry_overs}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        className="btn-ghost generate-btn"
                        onClick={async () => {
                          setGeneratingSummary(true);
                          try {
                            const { daily_summary } = await api.summaries.generate();
                            setSummary(daily_summary);
                          } catch (err: unknown) {
                            alert((err as Error).message);
                          } finally {
                            setGeneratingSummary(false);
                          }
                        }}
                        disabled={generatingSummary}
                      >
                        {generatingSummary ? <Loader size={14} className="spin" /> : <Sparkles size={14} />}
                        {generatingSummary ? "Generating..." : "Generate AI summary"}
                      </button>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </>
  );
}

/**
 * Wraps peek cards with a 3D mouse-tracking tilt effect.
 * Lives OUTSIDE the layoutId element so there's no transform conflict
 * when the shared layout animation fires on sign-in.
 */
function PeekTiltWrapper({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 120, damping: 28, mass: 1.5 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 120, damping: 28, mass: 1.5 });
  const scale   = useSpring(1,                 { stiffness: 120, damping: 28, mass: 1.5 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect    = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left  - rect.width  / 2;
    const offsetY = e.clientY - rect.top   - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -10);
    rotateY.set((offsetX / (rect.width  / 2)) *  10);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseEnter={() => scale.set(1.06)}
      onMouseLeave={() => { rotateX.set(0); rotateY.set(0); scale.set(1); }}
    >
      {children}
    </motion.div>
  );
}

function EnergyPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="energy-picker">
      <Zap size={14} />
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          className={`energy-btn ${value === level ? "active" : ""}`}
          onClick={() => onChange(value === level ? null : level)}
          title={ENERGY_LABELS[level]}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
