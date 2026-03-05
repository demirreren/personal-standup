import { useState, useEffect, useRef } from "react";
import { api, type Checkin } from "../lib/api";
import { Sun, Moon } from "lucide-react";

function getFeelingLabel(value: number): string {
  if (value <= 15) return "Drained";
  if (value <= 35) return "Low";
  if (value <= 55) return "Okay";
  if (value <= 75) return "Good";
  if (value <= 90) return "Great";
  return "Energized";
}


function getAvgFeeling(checkins: Checkin[]): number | null {
  const withFeeling = checkins.filter((c) => c.feeling != null);
  if (withFeeling.length === 0) return null;
  return withFeeling.reduce((sum, c) => sum + (c.feeling ?? 0), 0) / withFeeling.length;
}

function getMoodSummary(value: number): { label: string } {
  if (value <= 35) return { label: "Low" };
  if (value <= 65) return { label: "Mid" };
  return { label: "High" };
}

// Returns days newest-first so today is leftmost and history scrolls right
function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(end);
  cur.setHours(12, 0, 0, 0);
  const startNoon = new Date(start);
  startNoon.setHours(12, 0, 0, 0);
  while (cur >= startNoon) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

export default function History() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLabel, setMonthLabel] = useState("");
  const [monthVisible, setMonthVisible] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const monthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMonthRef = useRef("");

  const todayDate = new Date();
  const endDate = new Date(todayDate);
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - 89);

  const todayStr = todayDate.toISOString().split("T")[0];

  useEffect(() => {
    api.checkins
      .list({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      })
      .then(({ checkins }) => {
        setCheckins(checkins);
        setLoading(false);
      });
  }, []);

  // Today is leftmost — no scroll needed, starts at position 0

  const allDays = eachDayOfInterval(startDate, endDate);

  const grouped = checkins.reduce<Record<string, Checkin[]>>((acc, c) => {
    if (!acc[c.date]) acc[c.date] = [];
    acc[c.date].push(c);
    return acc;
  }, {});

  const morningCount = checkins.filter((c) => c.checkin_type === "morning").length;
  const eveningCount = checkins.filter((c) => c.checkin_type === "evening").length;
  const loggedDays = Object.keys(grouped).length;
  const avgFeeling = getAvgFeeling(checkins);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    const el = document.elementFromPoint(centerX, centerY);
    const card = el?.closest("[data-month]") as HTMLElement | null;
    const month = card?.dataset?.month ?? "";

    if (month && month !== prevMonthRef.current) {
      prevMonthRef.current = month;
      setMonthLabel(month);
      setMonthVisible(true);
      if (monthTimerRef.current) clearTimeout(monthTimerRef.current);
      monthTimerRef.current = setTimeout(() => setMonthVisible(false), 1800);
    }
  };

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 292, behavior: "smooth" });
  };

  return (
    <div className="history-page">
      <div className="history-atmosphere" aria-hidden="true" />

      <header className="history-header">
        <h1 className="history-title">History</h1>
        {!loading && (
          <p className="history-stats">
            {loggedDays} days logged · {morningCount} mornings · {eveningCount} evenings
              {avgFeeling != null && (
              <>
                {" · avg mood: "}
                <span style={{ color: "var(--gold)" }}>
                  {getMoodSummary(avgFeeling).label}
                </span>
              </>
            )}
          </p>
        )}
      </header>

      {loading ? (
        <div className="history-loading">· · ·</div>
      ) : (
        <div className="history-scroll-area">
          <button
            className="history-arrow history-arrow--left"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
          >
            ←
          </button>

          <div
            className="history-scroll"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            {allDays.map((day) => {
              const dateStr = day.toISOString().split("T")[0];
              const dayCheckins = grouped[dateStr] ?? [];
              const isToday = dateStr === todayStr;

              const morning = dayCheckins.find((c) => c.checkin_type === "morning");
              const evening = dayCheckins.find((c) => c.checkin_type === "evening");

              const monthStr = day.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              });
              const dayNum = day.toLocaleDateString("en-US", { day: "numeric" });
              const dayName = day.toLocaleDateString("en-US", { weekday: "short" });
              const monthShort = day.toLocaleDateString("en-US", { month: "short" });

              return (
                <article
                  key={dateStr}
                  className={[
                    "history-card",
                    isToday ? "history-card--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-month={monthStr}
                >
                  <div className="history-card-date">
                    <span className="history-card-daynum">{dayNum}</span>
                    <span className="history-card-daymeta">
                      {dayName} · {monthShort}
                    </span>
                  </div>

                  <div className="history-card-divider" />

                  <div className="history-card-sections">
                    {/* Morning */}
                    <div
                      className={[
                        "history-section",
                        !morning ? "history-section--absent" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="history-section-header">
                        <Sun size={10} className="history-section-icon history-section-icon--sun" />
                        <span className="history-section-label">MORNING</span>
                      </div>
                      {morning && (
                        <div className="history-section-body">
                          {morning.feeling != null && (
                            <span className="history-mood-word">
                              {getFeelingLabel(morning.feeling)}
                            </span>
                          )}
                          {morning.yesterday && (
                            <p className="history-prose">{morning.yesterday}</p>
                          )}
                          {morning.today_plan && (
                            <p className="history-prose">{morning.today_plan}</p>
                          )}
                          {morning.blockers && (
                            <p className="history-blocker">{morning.blockers}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Divider between sections */}
                    <div className="history-section-divider" />

                    {/* Evening */}
                    <div
                      className={[
                        "history-section",
                        !evening ? "history-section--absent" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="history-section-header">
                        <Moon size={10} className="history-section-icon history-section-icon--moon" />
                        <span className="history-section-label">EVENING</span>
                      </div>
                      {evening && (
                        <div className="history-section-body">
                          {evening.feeling != null && (
                            <span className="history-mood-word">
                              {getFeelingLabel(evening.feeling)}
                            </span>
                          )}
                          {evening.what_happened && (
                            <p className="history-prose">{evening.what_happened}</p>
                          )}
                          {evening.carry_over && (
                            <p className="history-blocker">{evening.carry_over}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            className="history-arrow history-arrow--right"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
          >
            →
          </button>

          {/* Floating month chapter marker */}
          <div
            className={[
              "history-month-overlay",
              monthVisible ? "history-month-overlay--visible" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {monthLabel}
          </div>

          {/* Right-edge fade gradient */}
          <div className="history-scroll-fade-right" aria-hidden="true" />
          <div className="history-scroll-fade-left" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
