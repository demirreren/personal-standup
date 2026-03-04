import { useState, useEffect } from "react";
import { api, type WeeklyDigest } from "../lib/api";
import { Sparkles, Loader, Copy, Check, TrendingUp, AlertTriangle, Heart } from "lucide-react";

export default function Weekly() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.digests.list().then(({ weekly_digests }) => {
      setDigests(weekly_digests);
      setLoading(false);
    });
  }, []);

  const generateDigest = async () => {
    setGenerating(true);
    try {
      const { weekly_digest } = await api.digests.generate();
      setDigests((prev) => {
        const filtered = prev.filter((d) => d.week_start !== weekly_digest.week_start);
        return [weekly_digest, ...filtered];
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="weekly-page">
      <header className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>Weekly Digests</h2>
            <p className="date-label">AI-generated summaries of your week</p>
          </div>
          <button onClick={generateDigest} disabled={generating} className="btn-primary btn-sm">
            {generating ? <Loader size={14} className="spin" /> : <Sparkles size={14} />}
            {generating ? "Generating..." : "Generate this week"}
          </button>
        </div>
      </header>

      {digests.length === 0 ? (
        <div className="empty-state">
          <p>No weekly digests yet. Complete some daily check-ins, then generate your first digest.</p>
        </div>
      ) : (
        <div className="digest-list">
          {digests.map((digest) => {
            const weekEnd = new Date(digest.week_start);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const label = `${formatDate(digest.week_start)} — ${formatDate(weekEnd.toISOString().split("T")[0])}`;

            return (
              <div key={digest.id} className="digest-card">
                <div className="digest-header">
                  <h3>{label}</h3>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => copyShareLink(digest.share_token)}
                  >
                    {copied === digest.share_token ? <Check size={14} /> : <Copy size={14} />}
                    {copied === digest.share_token ? "Copied!" : "Share"}
                  </button>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
