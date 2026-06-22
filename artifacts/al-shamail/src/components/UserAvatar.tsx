import { B } from "@/lib/brand";

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 36,
  active = false,
  square = false,
}: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  size?: number;
  active?: boolean;
  square?: boolean;
}) {
  const initials = `${firstName?.[0] ?? "?"}${lastName?.[0] ?? ""}`;
  const radius = square ? Math.max(8, Math.round(size * 0.28)) : "50%";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: avatarUrl ? "transparent" : active ? B.gold : B.navy,
        color: active ? B.navy : B.gold,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size <= 32 ? 11 : 13,
        fontFamily: "'Playfair Display', serif",
        overflow: "hidden",
        flexShrink: 0,
        border: avatarUrl ? `1.5px solid ${active ? B.gold : B.light}` : "none",
      }}
    >
      {avatarUrl ? (
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt={`${firstName ?? ""} ${lastName ?? ""}`.trim() || "User"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export function buildContactsById(
  contacts: Array<{
    id: number;
    avatarUrl?: string | null;
    firstName?: string;
    lastName?: string;
  }>,
) {
  const map = new Map<number, { avatarUrl?: string | null; firstName?: string; lastName?: string }>();
  for (const contact of contacts) {
    map.set(contact.id, contact);
  }
  return map;
}

export function resolveContactAvatar(
  contactsById: Map<number, { avatarUrl?: string | null }>,
  userId?: number | null,
  fallback?: string | null,
): string | null {
  if (!userId) return fallback ?? null;
  return contactsById.get(userId)?.avatarUrl ?? fallback ?? null;
}
