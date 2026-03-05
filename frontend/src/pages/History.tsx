import { useState, useEffect, useRef } from "react";
import { api, type Checkin } from "../lib/api";
import { ChevronLeft, ChevronRight, Sun, Moon, AlertTriangle } from "lucide-react";
import { ParticleCard, GlobalSpotlight } from "../components/MagicBento";
import ScrambledText from "../components/ScrambledText";

function getFeelingLabel(value: number): string {
  if (value <= 15) return "Drained";
  if (value <= 35) return "Low";
  if (value <= 55) return "Okay";
  if (value <= 75) return "Good";
  if (value <= 90) return "Great";
  return "Energized";
}

function getFeelingColor(value: number): string {
  const hue = Math.round((value / 100) * 120);
  return `hsl(${hue}, 48%, 58%)`;
}

function getAvgFeeling(checkins: Checkin[]): number | null {
  const withFeeling = checkins.filter((c) => c.feeling != null);
  if (withFeeling.length === 0) return null;
  return withFeeling.reduce((sum, c) => sum + (c.feeling ?? 0), 0) / withFeeling.length;
}

export default function History() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const bentoRef = useRef<HTMLDivElement>(null);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - offset * 30);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const monthLabel = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const morningCount = checkins.filter((c) => c.checkin_type === "morning").length;
  const eveningCount = checkins.filter((c) => c.checkin_type === "evening").length;
  const avgFeeling = getAvgFeeling(checkins);
  const totalDays = sortedDates.length;

  return (
    <div className="history-page">
      <header className="page-header history-page-header">
        <div className="history-header-top">
          <div>
            <h2>History</h2>
            <p className="date-label">{monthLabel}</p>
          </div>
          <div className="history-pagination">
            <button onClick={() => setOffset(offset + 1)} className="btn-ghost">
              <ChevronLeft size={16} />
              Older
            </button>
            {offset > 0 && (
              <button onClick={() => setOffset(offset - 1)} className="btn-ghost">
                Newer
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {!loading && totalDays > 0 && (
          <div className="history-snapshot">
            <div className="history-snap-item">
              <span className="history-snap-num">{totalDays}</span>
              <span className="history-snap-label">days logged</span>
            </div>
            <div className="history-snap-divider" />
            <div className="history-snap-item">
              <span className="history-snap-num" style={{ color: "rgba(245, 158, 11, 0.85)" }}>
                {morningCount}
              </span>
              <span className="history-snap-label">mornings</span>
            </div>
            <div className="history-snap-divider" />
            <div className="history-snap-item">
              <span className="history-snap-num" style={{ color: "rgba(139, 92, 246, 0.85)" }}>
                {eveningCount}
              </span>
              <span className="history-snap-label">evenings</span>
            </div>
            {avgFeeling != null && (
              <>
                <div className="history-snap-divider" />
                <div className="history-snap-item">
                  <span
                    className="history-snap-num"
                    style={{ color: getFeelingColor(avgFeeling) }}
                  >
                    {getFeelingLabel(avgFeeling)}
                  </span>
                  <span className="history-snap-label">avg mood</span>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : sortedDates.length === 0 ? (
        <ScrambledText
          className="page-empty-scramble"
          radius={120}
          duration={1.2}
          speed={0.5}
          scrambleChars=".:"
        >
          No check-ins yet for this period.
        </ScrambledText>
      ) : (
        <div ref={bentoRef} className="history-bento-section">
          <GlobalSpotlight containerRef={bentoRef} spotlightRadius={480} />

          <div className="history-timeline-rail" />

          <div className="history-cards-stack">
            {sortedDates.map((date, index) => {
              const dayCheckins = grouped[date];
              const morning = dayCheckins.find((c) => c.checkin_type === "morning");
              const evening = dayCheckins.find((c) => c.checkin_type === "evening");

              const parsed = new Date(date + "T12:00:00");
              const weekday = parsed.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = parsed.getDate().toString().padStart(2, "0");
              const monthShort = parsed.toLocaleDateString("en-US", { month: "short" });

              const avgDay = getAvgFeeling(dayCheckins);
              const dayColor = avgDay != null ? getFeelingColor(avgDay) : "rgba(255,255,255,0.18)";
              const dayHue = avgDay != null ? Math.round((avgDay / 100) * 120) : 0;

              return (
                <div key={date} className="history-card-row" style={{ "--card-delay": `${index * 0.055}s` } as React.CSSProperties}>
                  {/* Timeline dot */}
                  <div
                    className="history-tl-dot"
                    style={{
                      background: dayColor,
                      boxShadow: `0 0 8px ${dayColor}, 0 0 16px ${dayColor}40`,
                    }}
                  />

                  <ParticleCard
                    className="history-day mb-card"
                    particleCount={8}
                    clickEffect
                    style={{
                      "--day-color": dayColor,
                      "--day-hue": dayHue,
                    } as React.CSSProperties}
                  >
                    {/* Left: date column */}
                    <div className="history-date-col">
                      <span className="history-day-num" style={{ color: dayColor }}>
                        {dayNum}
                      </span>
                      <span className="history-weekday">{weekday}</span>
                      <span className="history-month">{monthShort}</span>
                      {avgDay != null && (
                        <div className="history-mood-pip" title={getFeelingLabel(avgDay)}>
                          <div
                            className="history-mood-pip-fill"
                            style={{
                              height: `${avgDay}%`,
                              background: `linear-gradient(to top, ${dayColor}99, ${dayColor})`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: morning / evening columns */}
                    <div className="history-cols">
                      <section className={`history-col morning-col ${!morning ? "empty" : ""}`}>
                        <div className="history-col-header">
                          <Sun size={10} className="history-col-icon morning-icon" />
                          <span className="history-col-label">Morning</span>
                          {morning?.feeling != null && (
                            <span
                              className="history-feeling-inline"
                              style={{ color: getFeelingColor(morning.feeling) }}
                            >
                              {getFeelingLabel(morning.feeling)}
                            </span>
                          )}
                        </div>
                        {morning ? (
                          <div className="history-col-body">
                            {morning.yesterday && (
                              <div className="history-field">
                                <span className="history-field-label">Yesterday</span>
                                <p>{morning.yesterday}</p>
                              </div>
                            )}
                            {morning.today_plan && (
                              <div className="history-field">
                                <span className="history-field-label">Plan</span>
                                <p>{morning.today_plan}</p>
                              </div>
                            )}
                            {morning.blockers && (
                              <div className="history-field history-field--blocker">
                                <div className="history-field-label-row">
                                  <AlertTriangle size={9} />
                                  <span className="history-field-label">Blockers</span>
                                </div>
                                <p>{morning.blockers}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="history-col-empty">—</p>
                        )}
                      </section>

                      <section className={`history-col evening-col ${!evening ? "empty" : ""}`}>
                        <div className="history-col-header">
                          <Moon size={10} className="history-col-icon evening-icon" />
                          <span className="history-col-label">Evening</span>
                          {evening?.feeling != null && (
                            <span
                              className="history-feeling-inline"
                              style={{ color: getFeelingColor(evening.feeling) }}
                            >
                              {getFeelingLabel(evening.feeling)}
                            </span>
                          )}
                        </div>
                        {evening ? (
                          <div className="history-col-body">
                            {evening.what_happened && (
                              <div className="history-field">
                                <span className="history-field-label">What happened</span>
                                <p>{evening.what_happened}</p>
                              </div>
                            )}
                            {evening.carry_over && (
                              <div className="history-field history-field--blocker">
                                <div className="history-field-label-row">
                                  <AlertTriangle size={9} />
                                  <span className="history-field-label">Carrying over</span>
                                </div>
                                <p>{evening.carry_over}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="history-col-empty">—</p>
                        )}
                      </section>
                    </div>
                  </ParticleCard>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
