import { useEffect, useState } from "react";
import { Award, Sparkles } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { API_BASE } from "@/lib/api-base";
import {
  completeNotification,
  getCurrentNotification,
  getPendingNotificationCount,
  subscribeToNotifications,
  type QueuedNotification,
} from "@/lib/notification-queue";

const CONFETTI_COLORS = ["#D8B24A", "#2B7A58", "#6C63C7", "#E77B52", "#4F9AC5"];
const CONFETTI_PIECES = Array.from({ length: 42 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  delay: `${(index % 11) * 0.14}s`,
  duration: `${3.4 + (index % 5) * 0.28}s`,
  size: 6 + (index % 4) * 2,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  shape: index % 3,
}));

function resolveBadgeImage(url: string | null | undefined): string | null {
  const normalized = url?.trim();
  if (!normalized) return null;
  if (/^(data:|blob:|https?:\/\/)/i.test(normalized)) return normalized;

  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  if (normalized.startsWith("/api/uploads/")) {
    return `${baseUrl}${normalized.replace(/^\/api/, "")}`;
  }
  if (normalized.startsWith("/uploads/")) return `${baseUrl}${normalized}`;
  if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/${normalized}`;
}

export function NotificationCenter() {
  const [notification, setNotification] = useState<QueuedNotification | null>(getCurrentNotification);
  const [exitingId, setExitingId] = useState<number | null>(null);
  const [backdropExitId, setBackdropExitId] = useState<number | null>(null);
  const badgeNotification = notification?.kind === "badge" ? notification : null;
  const badge = badgeNotification?.badge;
  const notificationId = notification?.id;
  const isExiting = badgeNotification !== null && exitingId === notificationId;

  useEffect(() => {
    return subscribeToNotifications(setNotification);
  }, []);

  useEffect(() => {
    if (!notification) return;

    if (notification.kind === "toast") {
      const { toast } = notification;
      const duration = toast.duration ?? 4000;
      const title = toast.title || toast.description || "Notification";
      const options = {
        description: toast.title ? toast.description : undefined,
        duration,
      };
      const sonnerId = toast.variant === "destructive" || toast.type === "error"
        ? sonnerToast.error(title, options)
        : toast.type === "success"
        ? sonnerToast.success(title, options)
        : toast.type === "warning"
        ? sonnerToast.warning(title, options)
        : toast.type === "info"
        ? sonnerToast.info(title, options)
        : sonnerToast(title, options);
      const removeTimer = window.setTimeout(
        () => completeNotification(notification.id),
        duration + 350,
      );
      return () => {
        window.clearTimeout(removeTimer);
        sonnerToast.dismiss(sonnerId);
      };
    }

    setExitingId(null);
    setBackdropExitId(null);
    const exitTimer = window.setTimeout(() => {
      setExitingId(notification.id);
      if (getPendingNotificationCount() === 0) setBackdropExitId(notification.id);
    }, 4100);
    const removeTimer = window.setTimeout(() => completeNotification(notification.id), 4800);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [notificationId]);

  if (!badge || notificationId === undefined) return null;

  const color = badge.color || "#C9A84C";
  const imageUrl = resolveBadgeImage(badge.imageUrl);
  const badgeIcon = badge.icon?.trim();
  const cornerIcon = !badgeIcon || badgeIcon.length > 4
    ? "🏅"
    : /^\d+$/.test(badgeIcon)
    ? null
    : badgeIcon;

  return (
    <div className={`badge-celebration-backdrop${backdropExitId === notificationId ? " badge-celebration-backdrop-exiting" : ""}`}>
      <div className="badge-celebration-confetti" aria-hidden="true">
        {CONFETTI_PIECES.map((piece, index) => (
          <span
            key={index}
            className={`badge-confetti-piece badge-confetti-shape-${piece.shape}`}
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              width: piece.size,
              height: piece.size * (piece.shape === 1 ? 1.7 : 1),
              background: piece.color,
            }}
          />
        ))}
      </div>

      <section
        key={notificationId}
        className={`badge-celebration-card${isExiting ? " badge-celebration-card-exiting" : ""}`}
        role="status"
        aria-live="polite"
        aria-labelledby="badge-celebration-title"
      >
        <div className="badge-celebration-sparkle badge-celebration-sparkle-left">
          <Sparkles size={23} />
        </div>
        <div className="badge-celebration-sparkle badge-celebration-sparkle-right">
          <Sparkles size={18} />
        </div>

        <div
          className="badge-celebration-medal"
          style={{ color, borderColor: `${color}88`, background: `${color}18` }}
        >
          <Award size={42} strokeWidth={1.8} />
          {cornerIcon && <span>{cornerIcon}</span>}
          {imageUrl && <img src={imageUrl} alt="" onError={(event) => (event.currentTarget.style.display = "none")} />}
        </div>
        <div className="badge-celebration-eyebrow">A new achievement!</div>
        <h2 id="badge-celebration-title">Badge Unlocked</h2>
        <div className="badge-celebration-name">{badge.name}</div>
        {badge.description && <p className="badge-celebration-description">{badge.description}</p>}
        <div className="badge-celebration-progress" />
      </section>

      <style>{`
        .badge-celebration-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: grid;
          place-items: center;
          padding: 20px;
          overflow: hidden;
          background: rgba(15, 23, 42, .48);
          -webkit-backdrop-filter: blur(5px);
          backdrop-filter: blur(5px);
          animation: badge-backdrop-in 260ms ease-out both;
        }
        .badge-celebration-backdrop-exiting {
          animation: badge-backdrop-out 700ms ease-in both;
        }
        .badge-celebration-confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .badge-confetti-piece {
          position: absolute;
          top: -18px;
          border-radius: 2px;
          opacity: 0;
          animation-name: badge-confetti-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .badge-confetti-shape-1 { border-radius: 999px; }
        .badge-confetti-shape-2 { border-radius: 1px; }
        .badge-celebration-card {
          position: relative;
          width: min(100%, 430px);
          padding: 34px 30px 28px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.82);
          border-radius: 28px;
          background: linear-gradient(155deg, #fff 0%, #fffdf7 100%);
          box-shadow: 0 28px 90px rgba(8, 15, 38, .36), 0 0 0 7px rgba(255,255,255,.12);
          text-align: center;
          animation: badge-slide-in 560ms cubic-bezier(.16, 1, .3, 1) both;
        }
        .badge-celebration-card-exiting {
          animation: badge-slide-out 480ms cubic-bezier(.4, 0, 1, 1) both;
        }
        .badge-celebration-sparkle {
          position: absolute;
          color: #d3aa3b;
          animation: badge-sparkle 1.8s ease-in-out infinite;
        }
        .badge-celebration-sparkle-left { top: 69px; left: 36px; }
        .badge-celebration-sparkle-right { top: 49px; right: 47px; animation-delay: .4s; }
        .badge-celebration-medal {
          position: relative;
          display: grid;
          width: 112px;
          height: 112px;
          margin: 0 auto 17px;
          place-items: center;
          border: 2px solid;
          border-radius: 50%;
          box-shadow: inset 0 0 0 7px rgba(255,255,255,.72), 0 12px 25px rgba(31, 41, 55, .12);
          animation: badge-medal-bounce 720ms 100ms cubic-bezier(.16, 1, .3, 1) both;
        }
        .badge-celebration-medal > span {
          position: absolute;
          right: 4px;
          bottom: 1px;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 2px solid white;
          border-radius: 50%;
          background: #1b2b5e;
          color: white;
          font-size: 19px;
        }
        .badge-celebration-medal img {
          position: absolute;
          inset: 10px;
          width: calc(100% - 20px);
          height: calc(100% - 20px);
          border-radius: 50%;
          background: #fff;
          object-fit: contain;
        }
        .badge-celebration-eyebrow {
          color: #9a7a22;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .badge-celebration-card h2 {
          margin: 7px 0 4px;
          color: #1b2b5e;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 29px;
          font-weight: 900;
        }
        .badge-celebration-name {
          color: #b28a24;
          font-size: 20px;
          font-weight: 850;
        }
        .badge-celebration-description {
          margin: 10px 0 0;
          color: #647084;
          font-size: 14px;
          line-height: 1.55;
        }
        .badge-celebration-progress {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 4px;
          background: linear-gradient(90deg, #d6b34f, #f1df9b);
          transform-origin: left;
          animation: badge-progress 4.8s linear both;
        }
        @keyframes badge-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes badge-backdrop-out {
          to { opacity: 0; }
        }
        @keyframes badge-slide-in {
          0% { opacity: 0; transform: translateY(-70px) scale(.84) rotate(-3deg); }
          70% { opacity: 1; transform: translateY(8px) scale(1.03) rotate(.5deg); }
          100% { transform: translateY(0) scale(1) rotate(0); }
        }
        @keyframes badge-slide-out {
          to { opacity: 0; transform: translateX(110vw) rotate(10deg) scale(.78); }
        }
        @keyframes badge-medal-bounce {
          0% { opacity: 0; transform: scale(.4) rotate(-18deg); }
          65% { opacity: 1; transform: scale(1.12) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes badge-sparkle {
          0%, 100% { opacity: .5; transform: scale(.82) rotate(-8deg); }
          50% { opacity: 1; transform: scale(1.16) rotate(10deg); }
        }
        @keyframes badge-confetti-fall {
          0% { opacity: 0; transform: translateY(-4vh) rotate(0); }
          10% { opacity: .95; }
          85% { opacity: .9; }
          100% { opacity: 0; transform: translateY(112vh) rotate(720deg); }
        }
        @keyframes badge-progress {
          to { transform: scaleX(0); }
        }
        @media (max-width: 480px) {
          .badge-celebration-card { padding: 31px 22px 24px; border-radius: 24px; }
          .badge-celebration-medal { width: 98px; height: 98px; }
          .badge-celebration-card h2 { font-size: 26px; }
          .badge-celebration-sparkle-left { left: 20px; }
          .badge-celebration-sparkle-right { right: 25px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .badge-celebration-backdrop,
          .badge-celebration-card,
          .badge-celebration-medal,
          .badge-celebration-sparkle,
          .badge-confetti-piece,
          .badge-celebration-progress {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
