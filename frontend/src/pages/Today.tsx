import { useState, useEffect } from "react";
import { api, type Checkin } from "../lib/api";
import { Sun, Moon, Zap, Send, Check } from "lucide-react";

const ENERGY_LABELS = ["", "Drained", "Low", "Okay", "Good", "Fired up"];

export default function Today() {
  const [morning, setMorning] = useState<Checkin | null>(null);
  const [evening, setEvening] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);

  const [morningBody, setMorningBody] = useState("");
  const [morningEnergy, setMorningEnergy] = useState<number | null>(null);
  const [eveningBody, setEveningBody] = useState("");
  const [eveningEnergy, setEveningEnergy] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    api.checkins.today().then(({ morning, evening }) => {
      setMorning(morning);
      setEvening(evening);
      setLoading(false);
    });
  }, []);

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

      if (type === "morning") {
        setMorning(checkin);
        setMorningBody("");
      } else {
        setEvening(checkin);
        setEveningBody("");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="today-page">
      <header className="page-header">
        <h2>{greeting}</h2>
        <p className="date-label">{dateStr}</p>
      </header>

      <div className="checkin-cards">
        {/* Morning check-in */}
        <div className={`checkin-card ${morning ? "completed" : ""}`}>
          <div className="checkin-card-header">
            <Sun size={20} />
            <h3>Morning check-in</h3>
            {morning && <Check size={18} className="check-icon" />}
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
              onSubmit={(e) => {
                e.preventDefault();
                submitCheckin("morning");
              }}
              className="checkin-form"
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
                <button type="submit" disabled={submitting || !morningBody.trim()} className="btn-primary btn-sm">
                  <Send size={14} />
                  <span>Check in</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Evening check-out */}
        <div className={`checkin-card ${evening ? "completed" : ""}`}>
          <div className="checkin-card-header">
            <Moon size={20} />
            <h3>Evening check-out</h3>
            {evening && <Check size={18} className="check-icon" />}
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
              onSubmit={(e) => {
                e.preventDefault();
                submitCheckin("evening");
              }}
              className="checkin-form"
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
                <button type="submit" disabled={submitting || !eveningBody.trim()} className="btn-primary btn-sm">
                  <Send size={14} />
                  <span>Check out</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {morning && evening && (
        <div className="day-complete">
          <Check size={24} />
          <p>You've completed both check-ins today. Nice work.</p>
        </div>
      )}
    </div>
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
