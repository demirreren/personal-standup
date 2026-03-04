import { useState, useEffect } from "react";
import { api, type DashboardStats, type TrendDay } from "../lib/api";
import { Flame, Calendar, TrendingUp, Heart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboard.stats(), api.dashboard.trends(30)]).then(
      ([statsRes, trendsRes]) => {
        setStats(statsRes.stats);
        setTrends(trendsRes.trends);
        setLoading(false);
      }
    );
  }, []);

  if (loading || !stats) return <div className="page-loading">Loading...</div>;

  const feelingData = trends
    .filter((t) => t.feeling != null)
    .map((t) => ({ date: formatShort(t.date), feeling: t.feeling }));

  const completionData = trends.map((t) => ({
    date: formatShort(t.date),
    completed: t.completed ? 1 : t.has_morning || t.has_evening ? 0.5 : 0,
  }));

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h2>Dashboard</h2>
        <p className="date-label">Your accountability at a glance</p>
      </header>

      <div className="stats-bento">
        <StreakCard streak={stats.current_streak} />
        <RingCard value={stats.completion_rate} />
        <MoodCard value={stats.avg_feeling} />
        <CountCard value={stats.total_days} />
      </div>

      {feelingData.length > 2 && (
        <div className="chart-card">
          <div className="chart-header">
            <Heart size={14} />
            <h3>Feeling over time</h3>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={feelingData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="feelingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#5b9cf6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#5b9cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#44445a", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} tick={{ fill: "#44445a", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,13,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
                labelStyle={{ color: "#66667a", marginBottom: 4 }}
                itemStyle={{ color: "#5b9cf6" }}
                formatter={(v: number) => [`${v}/10 — ${getFeelingLabel(v)}`, ""]}
              />
              <Area
                type="monotone"
                dataKey="feeling"
                stroke="#5b9cf6"
                fill="url(#feelingGrad)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: "#5b9cf6", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {completionData.length > 2 && (
        <div className="chart-card">
          <div className="chart-header">
            <TrendingUp size={14} />
            <h3>Daily completion</h3>
          </div>
          <div className="heatmap">
            {completionData.map((d, i) => (
              <div
                key={i}
                className={`heatmap-cell ${
                  d.completed === 1 ? "full" : d.completed === 0.5 ? "half" : "empty"
                }`}
                title={`${d.date}: ${
                  d.completed === 1
                    ? "Both check-ins"
                    : d.completed === 0.5
                    ? "One check-in"
                    : "No check-ins"
                }`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span className="legend-item"><span className="heatmap-cell empty" /> None</span>
            <span className="legend-item"><span className="heatmap-cell half" />  Partial</span>
            <span className="legend-item"><span className="heatmap-cell full" />  Complete</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Streak ─────────────────────────────────────── */
function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="stat-card stat-streak">
      <span className="stat-eyebrow">Current Streak</span>
      <div className="streak-body">
        <Flame size={38} className="streak-flame" />
        <div className="streak-numeral">
          <span className="streak-num">{streak}</span>
          <span className="streak-unit">day{streak !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <p className="streak-note">
        {streak > 0 ? "keep the momentum going" : "start your first check-in"}
      </p>
    </div>
  );
}

/* ── Follow-through ring ─────────────────────────── */
function RingCard({ value }: { value: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <div className="stat-card stat-ring">
      <span className="stat-eyebrow">Follow-through</span>
      <div className="ring-wrap">
        <svg viewBox="0 0 100 100" className="ring-svg">
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ filter: "drop-shadow(0 0 5px rgba(16,185,129,0.6))" }}
          />
        </svg>
        <div className="ring-center">
          <span className="ring-value">
            {value}<span className="ring-pct">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Avg Feeling mood bar ───────────────────────── */
function MoodCard({ value }: { value: number }) {
  const label = getFeelingLabel(value);
  const color = getFeelingColor(value);
  return (
    <div className="stat-card stat-mood">
      <span className="stat-eyebrow">Avg Feeling</span>
      <div className="mood-word" style={{ color }}>{label}</div>
      <div className="mood-spectrum">
        <div className="mood-spectrum-track" />
        <div
          className="mood-spectrum-dot"
          style={{
            left: `${((value - 1) / 9) * 100}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
      <div className="mood-spectrum-labels">
        <span>Drained</span>
        <span>Energized</span>
      </div>
    </div>
  );
}

/* ── Total Days ─────────────────────────────────── */
function CountCard({ value }: { value: number }) {
  return (
    <div className="stat-card stat-count">
      <span className="stat-eyebrow">Days Logged</span>
      <div className="count-body">
        <Calendar size={22} className="count-icon" />
        <span className="count-num">{value}</span>
      </div>
      <p className="count-note">total check-in days</p>
    </div>
  );
}

function formatShort(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
