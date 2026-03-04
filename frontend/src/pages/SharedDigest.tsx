import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api, type WeeklyDigest } from "../lib/api";
import { Heart, TrendingUp, AlertTriangle } from "lucide-react";

export default function SharedDigest() {
  const { token } = useParams<{ token: string }>();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.public
      .weeklyDigest(token)
      .then(({ digest, user }) => {
        setDigest(digest as WeeklyDigest);
        setUserName(user.name);
        setLoading(false);
      })
      .catch(() => {
        setError("Digest not found");
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="shared-page"><div className="page-loading">Loading...</div></div>;
  if (error || !digest) return (
    <div className="shared-page">
      <div className="shared-card">
        <p className="shared-error">This digest link is invalid or has expired.</p>
      </div>
    </div>
  );

  const weekEnd = new Date(digest.week_start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const label = `${formatDate(digest.week_start)} — ${formatDate(weekEnd.toISOString().split("T")[0])}`;

  return (
    <div className="shared-page">
      <div className="shared-card">
        <div className="shared-brand">
          <h1>standup<span className="logo-dot">.</span></h1>
        </div>

        <div className="shared-header">
          <h2>{userName}'s Week</h2>
          <p className="date-label">{label}</p>
        </div>

        {digest.ai_digest && (
          <p className="digest-narrative">{digest.ai_digest}</p>
        )}

        <div className="digest-metrics">
          {digest.avg_energy != null && (
            <div className="metric">
              <Heart size={14} />
              <span>Avg feeling: {digest.avg_energy}/100</span>
            </div>
          )}
          {digest.completion_rate != null && (
            <div className="metric">
              <TrendingUp size={14} />
              <span>Follow-through: {digest.completion_rate}%</span>
            </div>
          )}
        </div>

        {digest.wins && (
          <div className="digest-section">
            <h4>Wins</h4>
            <p>{digest.wins}</p>
          </div>
        )}

        {digest.patterns && (
          <div className="digest-section">
            <h4>Patterns</h4>
            <p>{digest.patterns}</p>
          </div>
        )}

        {digest.blocker_patterns && (
          <div className="digest-section">
            <h4><AlertTriangle size={14} /> Blockers</h4>
            <p>{digest.blocker_patterns}</p>
          </div>
        )}

        <div className="shared-footer">
          <p>Tracked with <a href="/">standup.</a></p>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
