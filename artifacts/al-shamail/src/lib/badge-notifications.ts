import { enqueueBadgeNotification, type EarnedBadge } from "./notification-queue";

export type { EarnedBadge } from "./notification-queue";

export type BadgeAwardNotification = {
  id: number;
  badgeName: string;
  earnedAt: string;
  read: boolean;
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

export function markBadgeAwardNotificationRead(id: number): void {
  const notification = earnedBadgeNotifications.find((item) => item.id === id);
  if (!notification || notification.read) return;

  earnedBadgeNotifications = earnedBadgeNotifications.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
  publishBadgeNotifications();
}

export function notifyBadgeAwards(badges: readonly EarnedBadge[]): void {
  const notifications = badges.map((badge) => ({
    id: enqueueBadgeNotification(badge),
    badgeName: badge.name,
    earnedAt: new Date().toISOString(),
    read: false,
  }));
  if (notifications.length === 0) return;

  earnedBadgeNotifications = [...notifications, ...earnedBadgeNotifications].slice(0, 50);
  publishBadgeNotifications();
}
