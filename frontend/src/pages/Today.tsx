import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import ShinyText from "../components/ShinyText";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import SplitText from "../components/SplitText";
import { api, type Checkin } from "../lib/api";
import { ArrowRight, Send, Check } from "lucide-react";

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 75, damping: 18, mass: 1.1 };

function getFeelingLabel(value: number): string {
  if (value <= 2) return "Drained";
  if (value <= 4) return "Low";
  if (value <= 6) return "Okay";
  if (value <= 8) return "Good";
  if (value === 9) return "Great";
  return "Energized";
}

function getFeelingColor(value: number): string {
  const hue = Math.round(((value - 1) / 9) * 120);
  return `hsl(${hue}, 52%, 52%)`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

  // Morning form state
  const [mFeeling, setMFeeling] = useState(5);
  const [mYesterday, setMYesterday] = useState("");
  const [mTodayPlan, setMTodayPlan] = useState("");
  const [mBlockers, setMBlockers] = useState("");

  // Evening form state
  const [eFeeling, setEFeeling] = useState(5);
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
    api.checkins.today().then(({ morning: m, evening: e }) => {
      setMorning(m);
      setEvening(e);
      if (m) setMorningFlipped(true);
      if (e) setEveningFlipped(true);
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
                        <span className="peek-card-label morning-label">Morning Standup</span>
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
                        <span className="peek-card-label evening-label">Evening Reflection</span>
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
              <DayProgress morning={!!morning} evening={!!evening} />
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
                          {morning && (
                            <div className="flip-completed-badge">Completed</div>
                          )}
                        </div>
                        <div className="flip-card-front-bottom">
                          <div className="flip-card-title-row">
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
                        <h3>Morning Standup</h3>
                        {morning ? (
                          <span className="check-state-text">
                            <Check size={12} strokeWidth={2.5} />
                            {morning.created_at ? formatTime(morning.created_at) : "Done"}
                          </span>
                        ) : (
                          <button
                            className="flip-back-close"
                            onClick={() => setMorningFlipped(false)}
                          >
                            Close
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
                              className="btn-checkin"
                            >
                              <Send size={13} strokeWidth={2} />
                              Check in
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>

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
                          {evening && (
                            <div className="flip-completed-badge">Completed</div>
                          )}
                        </div>
                        <div className="flip-card-front-bottom">
                          <div className="flip-card-title-row">
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
                        <h3>Evening Reflection</h3>
                        {evening ? (
                          <span className="check-state-text">
                            <Check size={12} strokeWidth={2.5} />
                            {evening.created_at ? formatTime(evening.created_at) : "Done"}
                          </span>
                        ) : (
                          <button
                            className="flip-back-close"
                            onClick={() => setEveningFlipped(false)}
                          >
                            Close
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
                              className="btn-checkin"
                            >
                              <Send size={13} strokeWidth={2} />
                              Check out
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
                    <p>{nudge}</p>
                    <button className="nudge-dismiss" onClick={() => setNudge(null)}>
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

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
  const color = getFeelingColor(value);
  return (
    <div className="feeling-picker">
      <div className="feeling-picker-header">
        <span className="feeling-label">How are you feeling?</span>
        <span className="feeling-value" style={{ color }}>
          {getFeelingLabel(value)}
        </span>
      </div>
      <div className="feeling-picker-buttons">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const btnColor = getFeelingColor(n);
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              className={`feeling-btn${selected ? " feeling-btn--selected" : ""}`}
              style={selected ? { background: btnColor, borderColor: btnColor, color: "#fff" } : {}}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="feeling-picker-labels">
        <span>Drained</span>
        <span>Energized</span>
      </div>
    </div>
  );
}

function FeelingDisplay({ value }: { value: number }) {
  const color = getFeelingColor(value);
  return (
    <div className="feeling-display">
      <ShinyText
        text={getFeelingLabel(value)}
        color={color}
        shineColor="#ffffff"
        speed={2.5}
        spread={100}
        direction="left"
      />
      <span className="feeling-display-value">{value}/10</span>
    </div>
  );
}

function DayProgress({ morning, evening }: { morning: boolean; evening: boolean }) {
  const count = (morning ? 1 : 0) + (evening ? 1 : 0);
  return (
    <div className="day-progress">
      <div className={`day-progress-pip ${morning ? "done" : ""}`} />
      <div className={`day-progress-pip ${evening ? "done" : ""}`} />
      <span className="day-progress-label">
        {count === 0 ? "No check-ins yet" : count === 1 ? "1 of 2 done" : "Both done"}
      </span>
    </div>
  );
}
