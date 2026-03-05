import { useState, useEffect } from "react";
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

function getFeelingColor(value: number): string {
  if (value <= 35) return "#c87941";   // amber — low mood
  if (value <= 65) return "#a8b4d4";   // soft blue-white — mid mood
  return "#7db87a";                     // soft green — high mood
}

function getAvgFeeling(checkins: Checkin[]): number | null {
  const withFeeling = checkins.filter((c) => c.feeling != null);
  if (withFeeling.length === 0) return null;
  return (
    withFeeling.reduce((sum, c) => sum + (c.feeling ?? 0), 0) /
    withFeeling.length
  );
}

function getMoodSummary(value: number): { label: string; color: string } {
  if (value <= 35) return { label: "Low", color: "#c87941" };
  if (value <= 65) return { label: "Mid", color: "#a8b4d4" };
  return { label: "High", color: "#7db87a" };
}

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
  const [offset, setOffset] = useState(0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - offset * 30);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);

  const monthLabel = endDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    setLoading(true);
    api.checkins
      .list({
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      })
      .then(({ checkins }) => {
        setCheckins(checkins);
        setLoading(false);
      });
  }, [offset]);

  const grouped = checkins.reduce<Record<string, Checkin[]>>((acc, c) => {
    if (!acc[c.date]) acc[c.date] = [];
    acc[c.date].push(c);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];
  const allDays = eachDayOfInterval(startDate, endDate);

  const morningCount = checkins.filter((c) => c.checkin_type === "morning").length;
  const eveningCount = checkins.filter((c) => c.checkin_type === "evening").length;
  const avgFeeling = getAvgFeeling(checkins);
  const loggedDays = Object.keys(grouped).length;

  return (
    <div className="journal-page">
      <div className="journal-atmosphere" aria-hidden="true" />

      <header className="journal-header">
        <div className="journal-header-left">
          <h1 className="journal-page-title">History</h1>
          <h2 className="journal-month-title">{monthLabel}</h2>
          {!loading && (
            <p className="journal-byline">
              {loggedDays} days logged · {morningCount} mornings · {eveningCount} evenings
              {avgFeeling != null && (
                <>
                  {" · avg mood: "}
                  <span style={{ color: getMoodSummary(avgFeeling).color }}>
                    {getMoodSummary(avgFeeling).label}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        <nav className="journal-pagination">
          <button
            className="journal-nav-link"
            onClick={() => setOffset(offset + 1)}
          >
            ← Older
          </button>
          {offset > 0 && (
            <button
              className="journal-nav-link"
              onClick={() => setOffset(offset - 1)}
            >
              Newer →
            </button>
          )}
        </nav>
      </header>

      {loading ? (
        <div className="journal-loading">· · ·</div>
      ) : (
        <div className="journal-scroll">
          {allDays.map((day, index) => {
            const dateStr = day.toISOString().split("T")[0];
            const dayCheckins = grouped[dateStr] ?? [];
            const hasEntries = dayCheckins.length > 0;
            const isToday = dateStr === today;

            const morning = dayCheckins.find((c) => c.checkin_type === "morning");
            const evening = dayCheckins.find((c) => c.checkin_type === "evening");

            const dayNum = day.toLocaleDateString("en-US", { day: "2-digit" });
            const dayName = day.toLocaleDateString("en-US", { weekday: "short" });
            const monthShort = day.toLocaleDateString("en-US", { month: "short" });

            return (
              <article
                key={dateStr}
                className={[
                  "journal-entry",
                  !hasEntries ? "journal-entry--empty" : "",
                  isToday ? "journal-entry--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--entry-index": index } as React.CSSProperties}
              >
                <div className="journal-date-margin">
                  <span className="journal-day-num">{dayNum}</span>
                  <span className="journal-day-meta">
                    {dayName} · {monthShort}
                  </span>
                </div>

                {hasEntries && (
                  <div className="journal-content">
                    <div className="journal-halves">
                      {/* Morning half */}
                      <div
                        className={[
                          "journal-half",
                          !morning ? "journal-half--absent" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="journal-half-header">
                          <Sun size={11} className="journal-half-icon journal-half-icon--sun" />
                          <span className="journal-half-label">morning</span>
                        </div>
                        {morning && (
                          <div className="journal-half-body">
                            {morning.feeling != null && (
                              <span
                                className="journal-mood-word"
                                style={{ color: getFeelingColor(morning.feeling) }}
                              >
                                {getFeelingLabel(morning.feeling)}
                              </span>
                            )}
                            {morning.yesterday && (
                              <p className="journal-prose">{morning.yesterday}</p>
                            )}
                            {morning.today_plan && (
                              <p className="journal-prose">{morning.today_plan}</p>
                            )}
                            {morning.blockers && (
                              <p className="journal-blocker">{morning.blockers}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Evening half */}
                      <div
                        className={[
                          "journal-half",
                          !evening ? "journal-half--absent" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="journal-half-header">
                          <Moon size={11} className="journal-half-icon journal-half-icon--moon" />
                          <span className="journal-half-label">evening</span>
                        </div>
                        {evening && (
                          <div className="journal-half-body">
                            {evening.feeling != null && (
                              <span
                                className="journal-mood-word"
                                style={{ color: getFeelingColor(evening.feeling) }}
                              >
                                {getFeelingLabel(evening.feeling)}
                              </span>
                            )}
                            {evening.what_happened && (
                              <p className="journal-prose">{evening.what_happened}</p>
                            )}
                            {evening.carry_over && (
                              <p className="journal-blocker">{evening.carry_over}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
