import { useState, useEffect } from "react";
import { api, type WeeklyDigest } from "../lib/api";
import BounceCards, { type BounceCardData } from "../components/BounceCards";
import ScrambledText from "../components/ScrambledText";

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00");
  const end = new Date(weekStart + "T12:00:00");
  end.setDate(end.getDate() + 6);

  const startFmt = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const endFmt = end.toLocaleDateString("en-US", {
    month: start.getMonth() === end.getMonth() ? undefined : "long",
    day: "numeric",
  });

  return `${startFmt}–${endFmt}`;
}

/**
 * Parse Ruby-style hash/array strings from the backend into readable text.
 * Handles: {"key"=>"value"} and ["item1", "item2"] formats.
 */
function parseDigestField(str: string | null | undefined): string {
  if (!str) return "";
  const trimmed = str.trim();

  // Ruby array: ["item1", "item2"] — valid JSON, join with newlines
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join("\n");
    } catch {
      const matches = trimmed.match(/"([^"\\]*)"/g);
      if (matches) return matches.map((m) => m.slice(1, -1)).join("\n");
    }
  }

  // Ruby hash: {"key"=>"value"} — convert => to : then JSON.parse
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const jsonStr = trimmed.replace(/=>/g, ":");
      const parsed = JSON.parse(jsonStr);
      return Object.values(parsed as Record<string, string>).join("\n\n");
    } catch {
      const matches = trimmed.match(/=>"([^"]+)"/g);
      if (matches) return matches.map((m) => m.replace(/^=>"/, "").replace(/"$/, "")).join("\n\n");
    }
  }

  return trimmed;
}

function buildCards(digest: WeeklyDigest): BounceCardData[] {
  return [
    {
      label: "Wins",
      icon: "🏆",
      accent: "rgba(134, 239, 172, 0.85)",
      content: parseDigestField(digest.wins) || "No wins recorded yet.",
    },
    {
      label: "Patterns",
      icon: "📈",
      accent: "rgba(147, 197, 253, 0.85)",
      content: parseDigestField(digest.patterns) || "No patterns identified yet.",
    },
    {
      label: "Blockers",
      icon: "🚧",
      accent: "rgba(252, 165, 165, 0.85)",
      content: parseDigestField(digest.blocker_patterns) || "No blockers recorded yet.",
    },
  ];
}

export default function Weekly() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.digests.list().then(({ weekly_digests }) => {
      setDigests(weekly_digests);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const latest = digests[0] ?? null;
  const weekLabel = latest ? `Summary of ${formatWeekRange(latest.week_start)}` : "Weekly Digest";

  return (
    <div className="weekly-page">
      <header className="page-header">
        <h2>Weekly Digest</h2>
        <p className="date-label">{weekLabel}</p>
      </header>

      {!latest ? (
        <ScrambledText
          className="page-empty-scramble"
          radius={120}
          duration={1.2}
          speed={0.5}
          scrambleChars=".:"
        >
          No weekly digest yet. Complete some daily check-ins first.
        </ScrambledText>
      ) : (
        <div className="weekly-bounce-wrapper">
          <BounceCards
            cards={buildCards(latest)}
            containerWidth={780}
            containerHeight={460}
            animationDelay={0.3}
            animationStagger={0.1}
            transformStyles={[
              "rotate(7deg) translate(-215px)",
              "rotate(-2deg)",
              "rotate(-7deg) translate(215px)",
            ]}
            enableHover={true}
          />
        </div>
      )}
    </div>
  );
}
