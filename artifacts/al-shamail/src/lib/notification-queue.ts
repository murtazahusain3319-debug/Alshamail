import type { ReactNode } from "react";

export type EarnedBadge = {
  id?: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  color?: string | null;
};

export type ToastNotification = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  type?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
  action?: ReactNode;
};

export type QueuedNotification =
  | { id: number; kind: "badge"; badge: EarnedBadge }
  | { id: number; kind: "toast"; toast: ToastNotification };

type NotificationListener = (notification: QueuedNotification | null) => void;

let activeNotification: QueuedNotification | null = null;
let nextNotificationId = 0;
let flushScheduled = false;
const pendingNotifications: QueuedNotification[] = [];
const listeners = new Set<NotificationListener>();

function publish(): void {
  for (const listener of listeners) listener(activeNotification);
}

function scheduleNext(): void {
  if (activeNotification || flushScheduled || pendingNotifications.length === 0) return;

  flushScheduled = true;
  Promise.resolve().then(() => {
    flushScheduled = false;
    if (activeNotification || pendingNotifications.length === 0) return;

    // Let same-turn badge awards take priority over regular toasts.
    const badgeIndex = pendingNotifications.findIndex((notification) => notification.kind === "badge");
    const nextIndex = badgeIndex >= 0 ? badgeIndex : 0;
    activeNotification = pendingNotifications.splice(nextIndex, 1)[0];
    publish();
  });
}

export function enqueueBadgeNotification(badge: EarnedBadge): number {
  const id = ++nextNotificationId;
  pendingNotifications.push({ id, kind: "badge", badge });
  scheduleNext();
  return id;
}

export function enqueueToastNotification(toast: ToastNotification): number {
  const id = ++nextNotificationId;
  pendingNotifications.push({ id, kind: "toast", toast });
  scheduleNext();
  return id;
}

export function getCurrentNotification(): QueuedNotification | null {
  return activeNotification;
}

export function getPendingNotificationCount(): number {
  return pendingNotifications.length;
}

export function subscribeToNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  listener(activeNotification);
  return () => {
    listeners.delete(listener);
  };
}

export function completeNotification(id: number): void {
  if (activeNotification?.id !== id) return;
  activeNotification = null;
  publish();
  scheduleNext();
}
