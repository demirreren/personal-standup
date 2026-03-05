export function getFeelingLabel(value: number): string {
  if (value <= 2) return "Drained";
  if (value <= 4) return "Low";
  if (value <= 6) return "Okay";
  if (value <= 8) return "Good";
  if (value === 9) return "Great";
  return "Energized";
}

export function getFeelingColor(value: number): string {
  const hue = Math.round(((value - 1) / 9) * 120);
  return `hsl(${hue}, 52%, 52%)`;
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
