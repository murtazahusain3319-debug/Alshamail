import { useState, useEffect, useCallback } from "react";
import {
  completeNotification,
  enqueueToastNotification,
  getCurrentNotification,
  subscribeToNotifications,
} from "@/lib/notification-queue";

export type ToastVariant = "default" | "destructive";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  type?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
};

export function toast(t: Omit<Toast, "id">) {
  const id = enqueueToastNotification(t);
  return { id: `t-${id}` };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribeToNotifications((notification) => {
    if (!notification || notification.kind !== "toast") {
      setToasts([]);
      return;
    }

    setToasts([{
      ...notification.toast,
      id: `t-${notification.id}`,
      open: true,
      onOpenChange: (open) => {
        if (!open) completeNotification(notification.id);
      },
    }]);
  }), []);

  const dismiss = useCallback((id?: string) => {
    const current = getCurrentNotification();
    if (current?.kind === "toast" && (!id || id === `t-${current.id}`)) {
      completeNotification(current.id);
    }
  }, []);
  return { toasts, toast, dismiss };
}
