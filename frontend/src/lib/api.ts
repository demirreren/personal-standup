const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Timezone": getBrowserTimezone(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.errors?.join(", ") || "Request failed");
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
      request<{ user: User; token: string }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...data, timezone: getBrowserTimezone() }),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: User; token: string }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request<{ user: User }>("/api/v1/auth/me"),
  },
  checkins: {
    today: () => request<{ morning: Checkin | null; evening: Checkin | null }>("/api/v1/checkins/today"),
    list: (params?: { start_date?: string; end_date?: string; date?: string }) => {
      const query = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ checkins: Checkin[] }>(`/api/v1/checkins${query}`);
    },
    create: (data: {
      checkin_type: string;
      feeling?: number;
      yesterday?: string;
      today_plan?: string;
      blockers?: string;
      what_happened?: string;
      carry_over?: string;
      date?: string;
    }) =>
      request<{ checkin: Checkin }>("/api/v1/checkins", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<Checkin, "id" | "checkin_type" | "date" | "created_at">>) =>
      request<{ checkin: Checkin }>(`/api/v1/checkins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  summaries: {
    list: (params?: { start_date?: string; end_date?: string }) => {
      const query = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ daily_summaries: DailySummary[] }>(`/api/v1/daily_summaries${query}`);
    },
    generate: (date?: string) =>
      request<{ daily_summary: DailySummary }>("/api/v1/daily_summaries/generate", {
        method: "POST",
        body: JSON.stringify({ date }),
      }),
    nudge: (checkinId: number) =>
      request<{ nudge: string | null }>("/api/v1/daily_summaries/nudge", {
        method: "POST",
        body: JSON.stringify({ checkin_id: checkinId }),
      }),
  },
  digests: {
    list: () => request<{ weekly_digests: WeeklyDigest[] }>("/api/v1/weekly_digests"),
    generate: (week?: string) =>
      request<{ weekly_digest: WeeklyDigest }>("/api/v1/weekly_digests/generate", {
        method: "POST",
        body: JSON.stringify({ week }),
      }),
  },
  dashboard: {
    stats: () => request<{ stats: DashboardStats }>("/api/v1/dashboard/stats"),
    trends: (days?: number) => request<{ trends: TrendDay[] }>(`/api/v1/dashboard/trends?days=${days || 30}`),
  },
  public: {
    weeklyDigest: (token: string) =>
      request<{ digest: WeeklyDigest; user: { name: string } }>(`/api/v1/public/weekly/${token}`),
  },
};

export interface User {
  id: number;
  email: string;
  name: string;
  timezone: string;
  share_token: string;
  created_at: string;
}

export interface Checkin {
  id: number;
  checkin_type: "morning" | "evening";
  date: string;
  feeling: number | null;
  yesterday: string | null;
  today_plan: string | null;
  blockers: string | null;
  what_happened: string | null;
  carry_over: string | null;
  created_at: string;
}

export interface DailySummary {
  id: number;
  date: string;
  ai_summary: string;
  tasks_planned: number;
  tasks_completed: number;
  carry_overs: string;
  created_at: string;
}

export interface WeeklyDigest {
  id: number;
  week_start: string;
  ai_digest: string;
  wins: string;
  patterns: string;
  blocker_patterns: string;
  avg_energy: number;
  completion_rate: number;
  share_token: string;
  created_at: string;
}

export interface DashboardStats {
  current_streak: number;
  total_days: number;
  avg_feeling: number;
  completion_rate: number;
  total_checkins: number;
  member_since: string;
}

export interface TrendDay {
  date: string;
  has_morning: boolean;
  has_evening: boolean;
  feeling: number | null;
  completed: boolean;
}
