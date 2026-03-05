import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import ShinyText from "../components/ShinyText";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import SplitText from "../components/SplitText";
import { api, type Checkin } from "../lib/api";
import { ArrowRight, Check, Send } from "lucide-react";
import TiltedCard from "../components/TiltedCard";

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

function getGreetingParts(name: string): { prefix: string; name: string } {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return { prefix, name };
}

function getGreetingColor(): string {
  const h = new Date().getHours();
  if (h < 6)  return "#818cf8"; // deep night → indigo
  if (h < 9)  return "#fbbf24"; // early morning → gold
  if (h < 12) return "#f59e0b"; // morning → amber
  if (h < 15) return "#60a5fa"; // early afternoon → sky
  if (h < 18) return "#38bdf8"; // late afternoon → light blue
  if (h < 20) return "#fb923c"; // dusk → orange
  if (h < 22) return "#a78bfa"; // evening → violet
  return "#818cf8";             // night → indigo
}

const MORNING_PROMPTS = [
  "What's your focus for today?",
  "What energy are you bringing?",
  "What's your one must-win today?",
  "What would make today great?",
  "What intention do you set today?",
  "What's fresh on your mind?",
  "What are you looking forward to?",
];

function getMorningPrompt(): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return MORNING_PROMPTS[dayIndex % MORNING_PROMPTS.length];
}

const EVENING_PROMPTS = [
  "What surprised you today?",
  "What are you proud of?",
  "What drained your energy?",
  "What would you do differently?",
  "What made you smile today?",
  "What did you learn today?",
  "What's still on your mind?",
];

function getEveningPrompt(): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return EVENING_PROMPTS[dayIndex % EVENING_PROMPTS.length];
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
              <h2 className="today-greeting-text">
                <SplitText
                  text={`${getGreetingParts(user.name).prefix},`}
                  tag="span"
                  className="greeting-prefix"
                  textAlign="center"
                  splitType="chars"
                  delay={32}
                  duration={0.72}
                  ease="power3.out"
                  from={{ opacity: 0, y: 22 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0}
                  rootMargin="0px"
                />{' '}
                <SplitText
                  text={getGreetingParts(user.name).name}
                  tag="span"
                  className="greeting-name"
                  textAlign="center"
                  splitType="chars"
                  delay={32}
                  duration={0.78}
                  ease="power3.out"
                  from={{ opacity: 0, y: 22 }}
                  to={{ opacity: 1, y: 0, delay: 0.22 }}
                  threshold={0}
                  rootMargin="0px"
                  style={{ color: getGreetingColor() }}
                />
              </h2>
              <motion.p
                className="date-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85, duration: 0.5 }}
              >
                {dateStr}
              </motion.p>
            </motion.header>

            <>
              <DayArc />
              <div className="standup-stage">
              <div className="standup-flip-cards">
                {/* ---- MORNING CARD ---- */}
                <div className="standup-card-col">
                <div className={`card-hover-lift${morningFlipped ? " is-flipped" : ""}`}>
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
                      <TiltedCard
                        imageSrc="/morning.jpg"
                        altText="Morning Standup"
                        containerHeight="100%"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        rotateAmplitude={8}
                        scaleOnHover={1.03}
                        showMobileWarning={false}
                        showTooltip={false}
                        displayOverlayContent
                        overlayContent={
                          <div className="flip-card-overlay morning-overlay">
                            <div className="flip-card-top-row">
                              {morning && <div className="flip-completed-badge">Completed</div>}
                            </div>
                            <div className="flip-card-front-bottom">
                              <div className="flip-card-title-row">
                                <h3>Morning Standup</h3>
                              </div>
                              {!morning && (
                                <>
                                  <p className="flip-card-open-hint">Open →</p>
                                  <p className="flip-card-prompt">"{getMorningPrompt()}"</p>
                                </>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>

                    <div
                      className="standup-flip-card-back"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="atelier-float-header">
                        <div className="atelier-title-block">
                          <h3 className="atelier-title">Morning Standup</h3>
                          <p className="atelier-timestamp">
                            {`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} · ${now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}).toLowerCase()}`}
                          </p>
                        </div>
                        {morning ? (
                          <span className="check-state-text">
                            <Check size={12} strokeWidth={2.5} />
                            {morning.created_at ? formatTime(morning.created_at) : "Done"}
                          </span>
                        ) : (
                          <button
                            className="atelier-close"
                            onClick={() => setMorningFlipped(false)}
                            aria-label="Close"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {morning ? (
                        <div className="checkin-content structured-content banded-fields">
                          {morning.feeling != null && (
                            <FeelingDisplay value={morning.feeling} />
                          )}
                          {morning.yesterday && (
                            <div className="standup-field sf-yesterday">
                              <span className="standup-field-label">Yesterday</span>
                              <p>{morning.yesterday}</p>
                            </div>
                          )}
                          <div className="standup-field sf-today">
                            <span className="standup-field-label">Today's plan</span>
                            <p>{morning.today_plan}</p>
                          </div>
                          {morning.blockers && (
                            <div className="standup-field sf-blockers">
                              <span className="standup-field-label">Blockers</span>
                              <p>{morning.blockers}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <form
                          className="checkin-form standup-form atelier-form"
                          onSubmit={(e) => { e.preventDefault(); submitMorning(); }}
                        >
                          <MoodGlyphs value={mFeeling} onChange={setMFeeling} />
                          <div className="atelier-field" style={{ animationDelay: "185ms" }}>
                            <input
                              type="text"
                              className="standup-input"
                              placeholder="what did you get done yesterday?"
                              value={mYesterday}
                              onChange={(e) => setMYesterday(e.target.value)}
                            />
                          </div>
                          <div className="atelier-field" style={{ animationDelay: "235ms" }}>
                            <input
                              type="text"
                              className="standup-input"
                              placeholder="what's the focus today?"
                              value={mTodayPlan}
                              onChange={(e) => setMTodayPlan(e.target.value)}
                              required
                            />
                          </div>
                          <div className="atelier-field" style={{ animationDelay: "285ms" }}>
                            <input
                              type="text"
                              className="standup-input"
                              placeholder="anything in the way?"
                              value={mBlockers}
                              onChange={(e) => setMBlockers(e.target.value)}
                            />
                          </div>
                          <div className="checkin-form-footer">
                            <button
                              type="submit"
                              disabled={submitting || !mTodayPlan.trim()}
                              className="btn-checkin"
                            >
                              Check In
                              <Send size={11} strokeWidth={1.8} />
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>
                </div>{/* end card-hover-lift morning */}
                </div>{/* end standup-card-col morning */}

                {/* ---- EVENING CARD ---- */}
                <div className="standup-card-col">
                <div className={`card-hover-lift${eveningFlipped ? " is-flipped" : ""}`}>
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
                      <TiltedCard
                        imageSrc="/evening.jpg"
                        altText="Evening Reflection"
                        containerHeight="100%"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        rotateAmplitude={8}
                        scaleOnHover={1.03}
                        showMobileWarning={false}
                        showTooltip={false}
                        displayOverlayContent
                        overlayContent={
                          <div className="flip-card-overlay evening-overlay">
                            <div className="flip-card-top-row">
                              {evening && <div className="flip-completed-badge">Completed</div>}
                            </div>
                            <div className="flip-card-front-bottom">
                              <div className="flip-card-title-row">
                                <h3>Evening Reflection</h3>
                              </div>
                              {!evening && (
                                <>
                                  <p className="flip-card-open-hint">Open →</p>
                                  <p className="flip-card-prompt">"{getEveningPrompt()}"</p>
                                </>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>

                    <div
                      className="standup-flip-card-back"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="atelier-float-header">
                        <div className="atelier-title-block">
                          <h3 className="atelier-title">Evening Reflection</h3>
                          <p className="atelier-timestamp">
                            {`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} · ${now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}).toLowerCase()}`}
                          </p>
                        </div>
                        {evening ? (
                          <span className="check-state-text">
                            <Check size={12} strokeWidth={2.5} />
                            {evening.created_at ? formatTime(evening.created_at) : "Done"}
                          </span>
                        ) : (
                          <button
                            className="atelier-close"
                            onClick={() => setEveningFlipped(false)}
                            aria-label="Close"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {evening ? (
                        <div className="checkin-content structured-content banded-fields">
                          {evening.feeling != null && (
                            <FeelingDisplay value={evening.feeling} />
                          )}
                          <div className="standup-field sf-happened">
                            <span className="standup-field-label">What happened</span>
                            <p>{evening.what_happened}</p>
                          </div>
                          {evening.carry_over && (
                            <div className="standup-field sf-carryover">
                              <span className="standup-field-label">Carrying over</span>
                              <p>{evening.carry_over}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <form
                          className="checkin-form standup-form atelier-form"
                          onSubmit={(e) => { e.preventDefault(); submitEvening(); }}
                        >
                          <MoodGlyphs value={eFeeling} onChange={setEFeeling} />
                          <div className="atelier-field" style={{ animationDelay: "185ms" }}>
                            <input
                              type="text"
                              className="standup-input"
                              placeholder="how did today actually go?"
                              value={eWhatHappened}
                              onChange={(e) => setEWhatHappened(e.target.value)}
                              required
                            />
                          </div>
                          <div className="atelier-field" style={{ animationDelay: "245ms" }}>
                            <input
                              type="text"
                              className="standup-input"
                              placeholder="anything following you into tomorrow?"
                              value={eCarryOver}
                              onChange={(e) => setECarryOver(e.target.value)}
                            />
                          </div>
                          <div className="checkin-form-footer">
                            <button
                              type="submit"
                              disabled={submitting || !eWhatHappened.trim()}
                              className="btn-checkin"
                            >
                              Check Out
                              <Send size={11} strokeWidth={1.8} />
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>
                </div>{/* end card-hover-lift evening */}
                </div>{/* end standup-card-col evening */}
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


function FeelingDisplay({ value }: { value: number }) {
  const color = getFeelingColor(value);
  return (
    <div className="feeling-display">
      <div className="feeling-display-row">
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
      <div className="feeling-display-bar-track">
        <div
          className="feeling-display-bar-fill"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
    </div>
  );
}


function SunriseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="2" y1="10.5" x2="14" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 10.5A3 3 0 0 1 11 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <line x1="8" y1="4" x2="8" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4.5" y1="5.8" x2="5.5" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="5.8" x2="10.5" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="1.5" x2="8" y2="3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="12.8" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="1.5" y1="8" x2="3.2" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.8" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3.5" y1="3.5" x2="4.7" y2="4.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.3" y1="11.3" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.5" y1="3.5" x2="11.3" y2="4.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4.7" y1="11.3" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.5 9.5a6 6 0 01-8-8 6 6 0 108 8z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DayArc() {
  const DAY_START = 6;
  const DAY_END   = 23;
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const progress = Math.max(0, Math.min(1, (currentHour - DAY_START) / (DAY_END - DAY_START)));

  return (
    <div className="day-arc">
      <div className="day-arc-row">
        <span className="arc-icon arc-icon--sunrise"><SunriseIcon size={18} /></span>
        <div className="day-arc-track">
          <div className="day-arc-fill" style={{ width: `${progress * 100}%` }} />
          <div className="day-arc-now" style={{ left: `${progress * 100}%` }} />
        </div>
        <span className="arc-icon arc-icon--moon"><MoonIcon size={18} /></span>
      </div>
    </div>
  );
}

// ── Mood glyph data: 7-point emotional spectrum ──────────────────────────────
const MOOD_GLYPHS: Array<{ value: number; label: string; glyph: React.ReactNode }> = [
  {
    value: 1, label: "Drained",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M4 9.5C4 7 5.8 5.5 9 5.5s5 1.5 5 4H4z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="6.2" y1="11" x2="5.5" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="9" y1="11.5" x2="8.5" y2="14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="11.8" y1="11" x2="11.2" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: 2, label: "Low",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M13 3.5A5.5 5.5 0 1 0 13 14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: 4, label: "Meh",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M2 7.5C4.5 5.8 6.5 9.5 9 7.5 11.5 5.5 13.5 9.5 16 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="3" y1="11.5" x2="15" y2="11.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeOpacity="0.35"/>
      </svg>
    ),
  },
  {
    value: 5, label: "Okay",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: 7, label: "Good",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <line x1="9" y1="15" x2="9" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <path d="M9 11C9 11 6 9 5 6.5 7.5 5.5 9 8 9 11z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 13C9 13 12 11 13 8.5 10.5 7.5 9 10 9 13z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: 9, label: "Great",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.1"/>
        <line x1="9" y1="2" x2="9" y2="4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="9" y1="14" x2="9" y2="16" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="2" y1="9" x2="4" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="14" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="4.1" y1="4.1" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="12.5" y1="12.5" x2="13.9" y2="13.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="13.9" y1="4.1" x2="12.5" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        <line x1="5.5" y1="12.5" x2="4.1" y2="13.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: 10, label: "Energized",
    glyph: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <path d="M9 15.5C6.5 15.5 4 13.5 4 10.5 4 8 5.5 6.5 6.5 5 6.5 7 7.5 8 9 8 9 6 10.5 3.5 11.5 2.5 11.5 5 13.5 7.5 13.5 10.5 13.5 13.5 11.5 15.5 9 15.5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function MoodGlyphs({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {

  return (
    <div className="mood-glyphs-wrap">
      {/* Icons sit above the rail */}
      <div className="mood-glyphs-row">
        {MOOD_GLYPHS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={`mood-glyph-btn${value === g.value ? " selected" : ""}`}
            onClick={() => onChange(g.value)}
            aria-label={g.label}
          >
            {value === g.value && (
              <span className="mood-glyph-active-label">{g.label}</span>
            )}
            {g.glyph}
          </button>
        ))}
      </div>
      {/* Arrow rail — renders after icons in flow */}
      <div className="mood-glyphs-rail" aria-hidden="true" />
    </div>
  );
}
