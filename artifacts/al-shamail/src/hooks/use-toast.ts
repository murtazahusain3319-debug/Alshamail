import { useState, useCallback } from "react";

export type ToastVariant = "default" | "destructive";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

let counter = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(next: Toast[]) {
  memoryState = next;
  for (const l of listeners) l(memoryState);
}

export function toast(t: Omit<Toast, "id">) {
  const id = `t-${++counter}`;
  dispatch([...memoryState, { ...t, id, open: true }]);
  setTimeout(() => {
    dispatch(memoryState.filter((x) => x.id !== id));
  }, 4000);
  return { id };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState);
  const subscribe = useCallback(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);
  // subscribe on first render
  if (!listeners.includes(setToasts)) subscribe();
  const dismiss = useCallback((id?: string) => {
    dispatch(id ? memoryState.filter((t) => t.id !== id) : []);
  }, []);
  return { toasts, toast, dismiss };
}
