import { useState, useEffect } from "react";
import { api, type Checkin } from "../lib/api";
import { Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function History() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - offset * 30);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

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

  return (
    <div className="history-page">
      <header className="page-header">
        <h2>History</h2>
        <div className="pagination">
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
      </header>

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : sortedDates.length === 0 ? (
        <div className="empty-state">
          <p>No check-ins yet for this period.</p>
        </div>
      ) : (
        <div className="history-list">
          {sortedDates.map((date) => {
            const dayCheckins = grouped[date];
            const morning = dayCheckins.find((c) => c.checkin_type === "morning");
            const evening = dayCheckins.find((c) => c.checkin_type === "evening");
            const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={date} className="history-day">
                <div className="history-date">{displayDate}</div>
                <div className="history-entries">
                  {morning && (
                    <div className="history-entry">
                      <div className="entry-icon morning">
                        <Sun size={14} />
                      </div>
                      <div className="entry-body">
                        {morning.feeling != null && (
                          <span
                            className="feeling-tag"
                            style={{
                              color: getFeelingColor(morning.feeling),
                              background: `${getFeelingColor(morning.feeling)}15`,
                            }}
                          >
                            {getFeelingLabel(morning.feeling)}
                          </span>
                        )}
                        {morning.yesterday && (
                          <p><span className="history-field-label">Yesterday:</span> {morning.yesterday}</p>
                        )}
                        {morning.today_plan && (
                          <p><span className="history-field-label">Plan:</span> {morning.today_plan}</p>
                        )}
                        {morning.blockers && (
                          <p className="history-blocker"><span className="history-field-label">Blockers:</span> {morning.blockers}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {evening && (
                    <div className="history-entry">
                      <div className="entry-icon evening">
                        <Moon size={14} />
                      </div>
                      <div className="entry-body">
                        {evening.feeling != null && (
                          <span
                            className="feeling-tag"
                            style={{
                              color: getFeelingColor(evening.feeling),
                              background: `${getFeelingColor(evening.feeling)}15`,
                            }}
                          >
                            {getFeelingLabel(evening.feeling)}
                          </span>
                        )}
                        {evening.what_happened && (
                          <p><span className="history-field-label">What happened:</span> {evening.what_happened}</p>
                        )}
                        {evening.carry_over && (
                          <p className="history-blocker"><span className="history-field-label">Carrying over:</span> {evening.carry_over}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
