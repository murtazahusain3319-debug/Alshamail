import { toast } from "sonner";

type EarnedBadge = { name: string };

export function notifyBadgeAwards(badges: readonly EarnedBadge[]): void {
  badges.forEach((badge, index) => {
    window.setTimeout(() => {
      toast("🏅 Badge Earned!", {
        description: badge.name,
        duration: 6000,
        style: {
          background: "#1b2b5e",
          color: "#fff",
          border: "1.5px solid rgba(218,165,32,.5)",
        },
      });
    }, (index + 1) * 600);
  });
}
