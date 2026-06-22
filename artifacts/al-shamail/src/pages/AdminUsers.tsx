import { type ReactNode, useMemo, useState } from "react";
import { Search, Mail, Flame, Sparkles, Award, Trash2, X, Phone, Building2, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useAwardXpToUser,
  useAwardBadgeToUser,
  useListBadges,
  useDeleteUser,
  useGetCurrentUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, Pill, GoldButton } from "@/components/DashboardLayout";

type RoleFilter = "all" | "student" | "teacher" | "admin";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const list = useListUsers({});
  const items: any[] = list.data?.items ?? [];
  const badgesQ = useListBadges();
  const badges: any[] = badgesQ.data?.items ?? [];

  const awardXp = useAwardXpToUser();
  const awardBadge = useAwardBadgeToUser();
  const deleteUser = useDeleteUser();
  const meQ = useGetCurrentUser();
  const myId = meQ.data?.user?.id;
  const isAdmin = !!meQ.data?.user?.isAdmin;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((u) => {
      if (roleFilter === "admin" && !u.isAdmin) return false;
      if ((roleFilter === "student" || roleFilter === "teacher") && u.role !== roleFilter)
        return false;
      if (!term) return true;
      const hay = [u.firstName, u.lastName, u.email, u.grade, u.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, search, roleFilter]);

  const onAwardXp = async (userId: number) => {
    const raw = window.prompt("How much XP to award?", "50");
    if (!raw) return;
    const amount = parseInt(raw, 10);
    if (Number.isNaN(amount)) return;
    const reason = window.prompt("Reason?", "Manual award") ?? "Manual award";
    await awardXp.mutateAsync({ userId, data: { amount, reason } });
    await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  const onDelete = async (user: any) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const ok = window.confirm(
      `Delete ${fullName}? This will permanently remove their account, enrollments, lesson progress, badges, achievements, XP and messages. This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteUser.mutateAsync({ userId: user.id });
      await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (err: any) {
      window.alert(err?.response?.data?.error ?? "Could not delete user.");
    }
  };

  const onAwardBadge = async (userId: number) => {
    if (!badges.length) {
      window.alert("No badges available.");
      return;
    }
    const opts = badges
      .map((b, i) => `${i + 1}. ${b.name}`)
      .join("\n");
    const idx = window.prompt(`Pick a badge:\n${opts}`, "1");
    if (!idx) return;
    const i = parseInt(idx, 10) - 1;
    if (Number.isNaN(i) || !badges[i]) return;
    await awardBadge.mutateAsync({ userId, data: { badgeId: badges[i].id } });
    await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  return (
    <DashboardLayout title="Users" subtitle="Manage all approved students, teachers, and admins.">
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={B.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                border: `1.5px solid ${B.light}`,
                borderRadius: 10,
                fontSize: 13,
                background: B.offW,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            style={{
              border: `1.5px solid ${B.light}`,
              borderRadius: 10,
              padding: "10px 14px",
              background: B.white,
              fontSize: 13,
              fontWeight: 600,
              color: B.navy,
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
            }}
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {list.isLoading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: B.muted, textAlign: "center", padding: "24px 0" }}>
            No users match.
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${B.light}` }}>
                  <th style={th}>Name</th>
                  <th style={th}>Role</th>
                  <th style={th}>XP / Level</th>
                  <th style={th}>Streak</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${B.light}` }}>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            fontWeight: 700,
                            color: B.navy,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: 14,
                            textAlign: "left",
                            lineHeight: 1.25,
                          }}
                        >
                          {u.firstName} {u.lastName}
                        </button>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: B.muted,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            lineHeight: 1.3,
                          }}
                        >
                          <Mail size={11} /> {u.email}
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <Pill color={u.isAdmin ? B.gold : u.role === "teacher" ? B.navyL : B.navy}>
                        {u.isAdmin ? "admin" : u.role}
                      </Pill>
                      {u.grade && (
                        <div style={{ fontSize: 11, color: B.muted, marginTop: 4 }}>
                          {u.grade}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 800, color: B.gold }}>
                        {u.xp} <span style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>XP</span>
                      </div>
                      <div style={{ fontSize: 11, color: B.muted }}>Level {u.level}</div>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 700,
                          color: B.navy,
                        }}
                      >
                        <Flame size={13} color={B.gold} /> {u.streak}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        {u.role === "student" && (
                          <>
                            <button
                              onClick={() => onAwardXp(u.id)}
                              style={smallBtn}
                              title="Award XP"
                            >
                              <Sparkles size={12} /> XP
                            </button>
                            <button
                              onClick={() => onAwardBadge(u.id)}
                              style={smallBtn}
                              title="Award badge"
                            >
                              <Award size={12} /> Badge
                            </button>
                          </>
                        )}
                        {isAdmin && u.id !== myId && (
                          <button
                            onClick={() => onDelete(u)}
                            disabled={deleteUser.isPending}
                            style={dangerBtn}
                            title="Delete user"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </DashboardLayout>
  );
}

function UserProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 60, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: B.white,
          borderRadius: 18,
          border: `1px solid ${B.light}`,
          boxShadow: "0 24px 56px rgba(27,43,94,.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${B.navyD}, ${B.navy})`,
            color: B.white,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: B.goldL, fontWeight: 800 }}>
              User Profile
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {user.firstName} {user.lastName}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: B.white, cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 10 }}>
          <InfoRow icon={<Mail size={14} />} label="Email" value={user.email} />
          <InfoRow icon={<Phone size={14} />} label="Phone" value={user.phone ?? "Not set"} />
          <InfoRow icon={<GraduationCap size={14} />} label="Role" value={user.isAdmin ? "admin" : user.role} />
          <InfoRow icon={<GraduationCap size={14} />} label="Grade" value={user.grade ?? "Not set"} />
          <InfoRow icon={<Building2 size={14} />} label="Department" value={user.department ?? "Not set"} />
          <InfoRow icon={<Sparkles size={14} />} label="XP" value={`${user.xp} (Level ${user.level})`} />
          <InfoRow icon={<Flame size={14} />} label="Streak" value={`${user.streak} day(s)`} />
          <InfoRow label="Bio" value={user.bio ?? "No bio available."} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "start" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: B.muted, fontWeight: 700 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13, color: B.navy, fontWeight: 600, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: B.muted,
  fontWeight: 800,
};
const td: React.CSSProperties = { padding: "12px", fontSize: 13, verticalAlign: "top" };
const smallBtn: React.CSSProperties = {
  background: B.navy,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
const dangerBtn: React.CSSProperties = {
  background: "transparent",
  color: B.error,
  border: `1px solid ${B.error}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
