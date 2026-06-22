export const B = {
  navy: "#1B2B5E",
  navyD: "#0F1A3C",
  navyL: "#243875",
  gold: "#C9A84C",
  goldL: "#E8C96A",
  goldD: "#A8873A",
  white: "#FFFFFF",
  offW: "#F8F6F1",
  offW2: "#FCFBF8",
  text: "#1a1a2e",
  muted: "#64748b",
  light: "#E8EBF4",
  line: "#D8DEEA",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F6FB",
  error: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
} as const;

export const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;
export const BRAND_NAME = "Al Shamail";
export const BRAND_WORDMARK = "International Academy";
export const BRAND_TAGLINE = "Online";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
