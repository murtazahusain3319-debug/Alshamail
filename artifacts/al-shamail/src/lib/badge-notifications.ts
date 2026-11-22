import { enqueueBadgeNotification, type EarnedBadge } from "./notification-queue";

export type { EarnedBadge } from "./notification-queue";

export function notifyBadgeAwards(badges: readonly EarnedBadge[]): void {
  badges.forEach(enqueueBadgeNotification);
}
