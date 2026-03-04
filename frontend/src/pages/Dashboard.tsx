import { useState, useEffect } from "react";
import { api, type DashboardStats, type TrendDay } from "../lib/api";
import { Flame, Target, Calendar, TrendingUp, Heart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function getFeelingLabel(value: number): string {
  if (value <= 15) return "Drained";
  if (value <= 35) return "Low";
  if (value <= 55) return "Okay";
  if (value <= 75) return "Good";
  if (value <= 90) return "Great";
  return "Energized";
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
    .map((t) => ({
      date: formatShort(t.date),
      feeling: t.feeling,
    }));

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

      <div className="stats-grid">
        <StatCard
          icon={<Flame size={20} />}
          label="Current Streak"
          value={`${stats.current_streak} day${stats.current_streak !== 1 ? "s" : ""}`}
          accent="var(--morning)"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Follow-through"
          value={`${stats.completion_rate}%`}
          accent="var(--success)"
        />
        <StatCard
          icon={<Heart size={20} />}
          label="Avg Feeling"
          value={stats.avg_feeling > 0 ? getFeelingLabel(stats.avg_feeling) : "—"}
          accent="var(--accent)"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Total Days"
          value={`${stats.total_days}`}
          accent="var(--evening)"
        />
      </div>

      {feelingData.length > 2 && (
        <div className="chart-card">
          <div className="chart-header">
            <Heart size={16} />
            <h3>Feeling over time</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={feelingData}>
              <defs>
                <linearGradient id="feelingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5b9cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5b9cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
              <XAxis dataKey="date" tick={{ fill: "#5a5a66", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#5a5a66", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#141416", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: "#8a8a96" }}
                formatter={(value: number) => [`${value}/100 — ${getFeelingLabel(value)}`, "Feeling"]}
              />
              <Area type="monotone" dataKey="feeling" stroke="#5b9cf6" fill="url(#feelingGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {completionData.length > 2 && (
        <div className="chart-card">
          <div className="chart-header">
            <TrendingUp size={16} />
            <h3>Daily completion (last 30 days)</h3>
          </div>
          <div className="heatmap">
            {completionData.map((d, i) => (
              <div
                key={i}
                className={`heatmap-cell ${d.completed === 1 ? "full" : d.completed === 0.5 ? "half" : "empty"}`}
                title={`${d.date}: ${d.completed === 1 ? "Both check-ins" : d.completed === 0.5 ? "One check-in" : "No check-ins"}`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span className="legend-item"><span className="heatmap-cell empty" /> None</span>
            <span className="legend-item"><span className="heatmap-cell half" /> Partial</span>
            <span className="legend-item"><span className="heatmap-cell full" /> Complete</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color: accent, background: `${accent}18` }}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function formatShort(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
