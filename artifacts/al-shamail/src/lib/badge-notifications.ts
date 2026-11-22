import { enqueueBadgeNotification, type EarnedBadge } from "./notification-queue";

export type { EarnedBadge } from "./notification-queue";

export type BadgeAwardNotification = {
  id: number;
  badgeName: string;
  earnedAt: string;
};

let earnedBadgeNotifications: BadgeAwardNotification[] = [];
const listeners = new Set<() => void>();

function publishBadgeNotifications(): void {
  listeners.forEach((listener) => listener());
}

export function getBadgeAwardNotifications(): readonly BadgeAwardNotification[] {
  return earnedBadgeNotifications;
}

export function subscribeToBadgeAwardNotifications(listener: () => void): () => void {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export function dismissBadgeAwardNotification(id: number): void {
  const nextNotifications = earnedBadgeNotifications.filter((item) => item.id !== id);
  if (nextNotifications.length === earnedBadgeNotifications.length) return;

  earnedBadgeNotifications = nextNotifications;
  publishBadgeNotifications();
}

export function clearBadgeAwardNotifications(): void {
  if (earnedBadgeNotifications.length === 0) return;

  earnedBadgeNotifications = [];
  publishBadgeNotifications();
}

export function notifyBadgeAwards(badges: readonly EarnedBadge[]): void {
  const notifications = badges.map((badge) => ({
    id: enqueueBadgeNotification(badge),
    badgeName: badge.name,
    earnedAt: new Date().toISOString(),
  }));
  if (notifications.length === 0) return;

  earnedBadgeNotifications = [...notifications, ...earnedBadgeNotifications].slice(0, 50);
  publishBadgeNotifications();
}
