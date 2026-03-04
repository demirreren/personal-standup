import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import SplitText from "../components/SplitText";
import { api, type Checkin, type DailySummary } from "../lib/api";
import {
  Sun, Moon, Send, Check, Sparkles, Loader,
  ArrowRight, RotateCcw, X,
} from "lucide-react";
import MetaBalls from "../components/MetaBalls";

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 75, damping: 18, mass: 1.1 };

function getFeelingLabel(value: number): string {
  if (value <= 15) return "Drained";
  if (value <= 35) return "Low";
  if (value <= 55) return "Okay";
  if (value <= 75) return "Good";
  if (value <= 90) return "Great";
  return "Energized";
}

function getFeelingColor(value: number): string {
  if (value <= 25) return "#ef4444";
  if (value <= 50) return "#f59e0b";
  if (value <= 75) return "#5b9cf6";
  return "#10b981";
}

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

  // Morning form state
  const [mFeeling, setMFeeling] = useState(50);
  const [mYesterday, setMYesterday] = useState("");
  const [mTodayPlan, setMTodayPlan] = useState("");
  const [mBlockers, setMBlockers] = useState("");

  // Evening form state
  const [eFeeling, setEFeeling] = useState(50);
  const [eWhatHappened, setEWhatHappened] = useState("");
  const [eCarryOver, setECarryOver] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [morningFlipped, setMorningFlipped] = useState(false);
  const [eveningFlipped, setEveningFlipped] = useState(false);

  // AI nudge state
  const [nudge, setNudge] = useState<string | null>(null);

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

  const submitMorning = async () => {
    setSubmitting(true);
    try {
      const { checkin } = await api.checkins.create({
        checkin_type: "morning",
        feeling: mFeeling,
        yesterday: mYesterday || undefined,
        today_plan: mTodayPlan,
        blockers: mBlockers || undefined,
      });
      setMorning(checkin);
      setMYesterday("");
      setMTodayPlan("");
      setMBlockers("");

      fetchNudge(checkin.id);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitEvening = async () => {
    setSubmitting(true);
    try {
      const { checkin } = await api.checkins.create({
        checkin_type: "evening",
        feeling: eFeeling,
        what_happened: eWhatHappened,
        carry_over: eCarryOver || undefined,
      });
      setEvening(checkin);
      setEWhatHappened("");
      setECarryOver("");

      fetchNudge(checkin.id);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchNudge = async (checkinId: number) => {
    try {
      const { nudge: nudgeText } = await api.summaries.nudge(checkinId);
      if (nudgeText) {
        setNudge(nudgeText);
      }
    } catch {
      // nudge is best-effort
    }
  };

  const openLogin = () => { setAuthMode("login"); setAuthOpen(true); };

  if (authLoading) return <div className="page-loading">Loading...</div>;

  return (
    <>
      <AnimatePresence initial={false}>
        {!user && (
          <motion.div
            key="signed-out"
            className="welcome-screen"
            exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
          >
            <div className="welcome-text-overlay">
              <motion.div
                layoutId="today-greeting"
                layout="position"
                transition={LAYOUT_SPRING}
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

              <motion.p
                className="welcome-hint"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
              >
                sign in to start your standup
              </motion.p>
              <motion.button
                className="btn-get-started"
                onClick={openLogin}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.25 } }}
              >
                Get started
                <ArrowRight size={16} className="btn-get-started-arrow" />
              </motion.button>
            </div>

            <div className="welcome-card-peek welcome-card-peek--left">
              <PeekTiltWrapper>
                <div className="peek-card-glow morning-glow">
                  <motion.div
                    layoutId="card-morning"
                    layout="position"
                    transition={LAYOUT_SPRING}
                    initial={{ opacity: 0, y: 120, rotate: -6 }}
                    animate={{ opacity: 1, y: 0, rotate: -6 }}
                    className="peek-card"
                  >
                    <div className="peek-card-body morning">
                      <div className="peek-card-overlay">
                        <span className="peek-card-label morning-label">☀️ Morning Standup</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </PeekTiltWrapper>
            </div>

            <div className="welcome-card-peek welcome-card-peek--right">
              <PeekTiltWrapper>
                <div className="peek-card-glow evening-glow">
                  <motion.div
                    layoutId="card-evening"
                    layout="position"
                    transition={LAYOUT_SPRING}
                    initial={{ opacity: 0, y: 120, rotate: 6 }}
                    animate={{ opacity: 1, y: 0, rotate: 6 }}
                    className="peek-card"
                  >
                    <div className="peek-card-body evening">
                      <div className="peek-card-overlay">
                        <span className="peek-card-label evening-label">🌙 Evening Reflection</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </PeekTiltWrapper>
            </div>
          </motion.div>
        )}

        {user && (
          <motion.div
            key="signed-in"
            className="today-page-main"
            exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeIn" } }}
          >
            <motion.header
              layoutId="today-greeting"
              layout="position"
              transition={LAYOUT_SPRING}
              className="today-greeting-header"
            >
              <motion.h2
                key={`greeting-${user.id}`}
                className="today-greeting-text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                {getSignedInGreeting(user.name)}
              </motion.h2>
              <motion.p
                className="date-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                {dateStr}
              </motion.p>
            </motion.header>

            <>
              <div className="standup-stage">
              <div className="standup-flip-cards">
                {/* ---- MORNING CARD ---- */}
                <motion.div
                  layoutId="card-morning"
                  layout="position"
                  animate={{ rotate: 0 }}
                  transition={LAYOUT_SPRING}
                  className={`standup-flip-card morning-card${morningFlipped ? " flipped" : ""}${morning ? " completed" : ""}`}
                  onClick={() => !morningFlipped && setMorningFlipped(true)}
                >
                  <div className="standup-flip-card-inner">
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
                            <h3>Morning Standup</h3>
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
                        <h3>Morning Standup</h3>
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
                        <div className="checkin-content structured-content">
                          {morning.feeling != null && (
                            <FeelingDisplay value={morning.feeling} />
                          )}
                          {morning.yesterday && (
                            <div className="standup-field">
                              <span className="standup-field-label">Yesterday</span>
                              <p>{morning.yesterday}</p>
                            </div>
                          )}
                          <div className="standup-field">
                            <span className="standup-field-label">Today's plan</span>
                            <p>{morning.today_plan}</p>
                          </div>
                          {morning.blockers && (
                            <div className="standup-field blocker-field">
                              <span className="standup-field-label">Blockers</span>
                              <p>{morning.blockers}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <form
                          className="checkin-form standup-form"
                          onSubmit={(e) => { e.preventDefault(); submitMorning(); }}
                        >
                          <FeelingSlider value={mFeeling} onChange={setMFeeling} />
                          <input
                            type="text"
                            className="standup-input"
                            placeholder="What did you get done yesterday?"
                            value={mYesterday}
                            onChange={(e) => setMYesterday(e.target.value)}
                          />
                          <input
                            type="text"
                            className="standup-input"
                            placeholder="What's the plan for today?"
                            value={mTodayPlan}
                            onChange={(e) => setMTodayPlan(e.target.value)}
                            required
                          />
                          <input
                            type="text"
                            className="standup-input"
                            placeholder="Any blockers? (optional)"
                            value={mBlockers}
                            onChange={(e) => setMBlockers(e.target.value)}
                          />
                          <div className="checkin-form-footer">
                            <div />
                            <button
                              type="submit"
                              disabled={submitting || !mTodayPlan.trim()}
                              className="btn-primary btn-sm"
                            >
                              <Send size={14} /><span>Check in</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* ---- METABALLS CONNECTOR ---- */}
                <div className="cards-connector" aria-hidden="true">
                  <MetaBalls
                    color="#5b9cf6"
                    cursorBallColor="#7eb8ff"
                    cursorBallSize={2}
                    ballCount={15}
                    animationSize={30}
                    enableMouseInteraction
                    enableTransparency={true}
                    hoverSmoothness={0.15}
                    clumpFactor={1}
                    speed={0.3}
                  />
                </div>

                {/* ---- EVENING CARD ---- */}
                <motion.div
                  layoutId="card-evening"
                  layout="position"
                  animate={{ rotate: 0 }}
                  transition={LAYOUT_SPRING}
                  className={`standup-flip-card evening-card${eveningFlipped ? " flipped" : ""}${evening ? " completed" : ""}`}
                  onClick={() => !eveningFlipped && setEveningFlipped(true)}
                >
                  <div className="standup-flip-card-inner">
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
                            <h3>Evening Reflection</h3>
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
                        <h3>Evening Reflection</h3>
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
                        <div className="checkin-content structured-content">
                          {evening.feeling != null && (
                            <FeelingDisplay value={evening.feeling} />
                          )}
                          <div className="standup-field">
                            <span className="standup-field-label">What happened</span>
                            <p>{evening.what_happened}</p>
                          </div>
                          {evening.carry_over && (
                            <div className="standup-field blocker-field">
                              <span className="standup-field-label">Carrying over</span>
                              <p>{evening.carry_over}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <form
                          className="checkin-form standup-form"
                          onSubmit={(e) => { e.preventDefault(); submitEvening(); }}
                        >
                          <FeelingSlider value={eFeeling} onChange={setEFeeling} />
                          <input
                            type="text"
                            className="standup-input"
                            placeholder="What actually happened today?"
                            value={eWhatHappened}
                            onChange={(e) => setEWhatHappened(e.target.value)}
                            required
                          />
                          <input
                            type="text"
                            className="standup-input"
                            placeholder="Anything carrying over? (optional)"
                            value={eCarryOver}
                            onChange={(e) => setECarryOver(e.target.value)}
                          />
                          <div className="checkin-form-footer">
                            <div />
                            <button
                              type="submit"
                              disabled={submitting || !eWhatHappened.trim()}
                              className="btn-primary btn-sm"
                            >
                              <Send size={14} /><span>Check out</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
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

              <AnimatePresence>
                {nudge && (
                  <motion.div
                    className="ai-nudge"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <Sparkles size={14} className="nudge-icon" />
                    <p>{nudge}</p>
                    <button className="nudge-dismiss" onClick={() => setNudge(null)}>
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {(morning || evening) && !nudge && (
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
                        <h3>AI Insight</h3>
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
                          if (daily_summary.ai_summary) {
                            setNudge(daily_summary.ai_summary);
                          }
                        } catch (err: unknown) {
                          alert((err as Error).message);
                        } finally {
                          setGeneratingSummary(false);
                        }
                      }}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? <Loader size={14} className="spin" /> : <Sparkles size={14} />}
                      {generatingSummary ? "Generating..." : "Generate AI insight"}
                    </button>
                  )}
                </motion.div>
              )}
            </>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authOpen && (
          <AuthModal
            key="today-auth-modal"
            onClose={() => setAuthOpen(false)}
            initialMode={authMode}
          />
        )}
      </AnimatePresence>
    </>
  );
}

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

function FeelingSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="feeling-slider">
      <div className="feeling-slider-header">
        <span className="feeling-label">How are you feeling?</span>
        <span
          className="feeling-value"
          style={{ color: getFeelingColor(value) }}
        >
          {getFeelingLabel(value)}
        </span>
      </div>
      <div className="feeling-track-wrapper">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="feeling-range"
          style={{
            background: `linear-gradient(to right, ${getFeelingColor(value)} ${value}%, rgba(255,255,255,0.08) ${value}%)`,
          }}
        />
        <div className="feeling-track-labels">
          <span>Drained</span>
          <span>Energized</span>
        </div>
      </div>
    </div>
  );
}

function FeelingDisplay({ value }: { value: number }) {
  return (
    <div className="feeling-display">
      <div
        className="feeling-dot"
        style={{ background: getFeelingColor(value) }}
      />
      <span style={{ color: getFeelingColor(value) }}>
        {getFeelingLabel(value)}
      </span>
      <span className="feeling-display-value">{value}/100</span>
    </div>
  );
}
