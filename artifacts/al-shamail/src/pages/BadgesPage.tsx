import { useState } from "react";
import { Trophy, Plus, CheckCircle2, Award, Image as ImageIcon, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBadges,
  useGetMyGamification,
  useGetCurrentUser,
  useCreateBadge,
  useListUsers,
  useAwardBadgeToUser,
  getListBadgesQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { B, formatDate } from "@/lib/brand";
import { DashboardLayout, Card, Pill, PrimaryButton, GoldButton } from "@/components/DashboardLayout";
import { API_BASE } from "@/lib/api-base";

const BADGE_COLORS = ["#C9A84C", "#1F3A5F", "#7C3AED", "#16A34A", "#DC2626", "#0EA5E9"];
const BADGE_CRITERIA = ["manual", "xp", "lessons", "streak"] as const;

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const normalized = String(url).trim();
  if (!normalized) return null;
  if (normalized.startsWith("data:") || normalized.startsWith("blob:") || /^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith("/api/uploads/")) {
    const baseUrl = API_BASE.replace(/\/api\/?$/, "");
    const cleanPath = normalized.replace(/^\/api/, "");
    return `${baseUrl}${cleanPath}`;
  }
  if (normalized.startsWith("/uploads/")) {
    const baseUrl = API_BASE.replace(/\/api\/?$/, "");
    return `${baseUrl}${normalized}`;
  }
  if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/${normalized}`;
}

export default function BadgesPage() {
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const isAdminOrTeacher =
    !!me.data?.user && (me.data.user.isAdmin || me.data.user.role === "teacher");
  const isStudent = !!me.data?.user && !isAdminOrTeacher;

  const badgesQ = useListBadges();
  const badges: any[] = badgesQ.data?.items ?? [];
  const gamif = useGetMyGamification({ query: { enabled: !!me.data?.user } });
  const earned: any[] = (gamif.data as any)?.badges ?? [];
  const earnedMap = new Map<number, any>(earned.map((b: any) => [b.badge.id, b]));

  const createBadge = useCreateBadge();
  const awardBadge = useAwardBadgeToUser();
  const usersQ = useListUsers({ role: "student" });
  const students = usersQ.data?.items ?? [];

  const [showCreate, setShowCreate] = useState<"badge" | null>(null);
  const [showAssign, setShowAssign] = useState<number | null>(null);
  const [bForm, setBForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    color: BADGE_COLORS[0],
    criteria: "manual" as (typeof BADGE_CRITERIA)[number],
    xpThreshold: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const submitBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (!bForm.name.trim()) {
      setError("Please enter a badge name.");
      return;
    }
    try {
      await createBadge.mutateAsync({
        data: {
          name: bForm.name.trim(),
          description: bForm.description.trim(),
          icon: "trophy",
          imageUrl: bForm.imageUrl.trim() || null,
          color: bForm.color,
          criteria: bForm.criteria,
          xpThreshold: Number(bForm.xpThreshold) || 0,
        },
      });
      await qc.invalidateQueries({ queryKey: getListBadgesQueryKey() });
      setBForm({
        name: "",
        description: "",
        imageUrl: "",
        color: BADGE_COLORS[0],
        criteria: "manual",
        xpThreshold: 0,
      });
      setShowCreate(null);
      setOkMsg("Badge created!");
      setTimeout(() => setOkMsg(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not create badge.");
    }
  };

  return (
    <DashboardLayout
      title="Badges"
      subtitle={
        isStudent
          ? "Earn badges by completing lessons, quizzes and keeping streaks."
          : "All available badges in the academy."
      }
    >
      {isAdminOrTeacher && (
        <div style={{ marginBottom: 18 }}>
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 800,
                    color: B.navy,
                    fontSize: 16,
                  }}
                >
                  Create badges
                </div>
                <div style={{ color: B.muted, fontSize: 13, marginTop: 2 }}>
                  Create new badges that students can earn for progress, effort, and milestones.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GoldButton
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowCreate(showCreate === "badge" ? null : "badge");
                  }}
                >
                  <Plus size={14} style={{ marginRight: 4 }} />
                  New badge
                </GoldButton>
                <GoldButton
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowAssign(showAssign === -1 ? null : -1);
                  }}
                >
                  <Award size={14} style={{ marginRight: 4 }} />
                  Assign badge
                </GoldButton>
              </div>
            </div>

            {okMsg && (
              <div
                style={{
                  marginTop: 12,
                  color: B.success,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ✓ {okMsg}
              </div>
            )}
            {error && showCreate && (
              <div
                style={{
                  marginTop: 12,
                  color: B.error,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {showAssign === -1 && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  background: B.offW,
                  borderRadius: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>Assign Badge to Student</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: B.muted }}>Select Student</label>
                  <select
                    onChange={(e) => setShowAssign(parseInt(e.target.value, 10))}
                    style={inputStyle}
                  >
                    <option value="">Choose a student...</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
                {showAssign !== null && showAssign !== -1 && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: B.muted }}>Select Badge</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                      {badges.map((b: any) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={async () => {
                            try {
                              await awardBadge.mutateAsync({ userId: showAssign, data: { badgeId: b.id } });
                              await qc.invalidateQueries({ queryKey: getListBadgesQueryKey() });
                              await qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                              setOkMsg(`Badge "${b.name}" assigned successfully!`);
                              setShowAssign(null);
                              setTimeout(() => setOkMsg(null), 2500);
                            } catch (err: any) {
                              setError(err?.response?.data?.error ?? "Failed to assign badge.");
                            }
                          }}
                          disabled={awardBadge.isPending}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: `1.5px solid ${B.light}`,
                            background: B.white,
                            cursor: awardBadge.isPending ? "wait" : "pointer",
                            textAlign: "center",
                          }}
                        >
                          {b.imageUrl ? (
                            <img src={resolveImageUrl(b.imageUrl) || b.imageUrl} alt={b.name} style={{ width: 32, height: 32, objectFit: "contain", margin: "0 auto 4px" }} />
                          ) : (
                            <div style={{ fontSize: 24, marginBottom: 4 }}>🏆</div>
                          )}
                          <div style={{ fontSize: 12, fontWeight: 700, color: B.navy }}>{b.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowAssign(null)}
                  style={cancelBtn}
                >
                  Cancel
                </button>
              </div>
            )}

            {showCreate === "badge" && (
              <form
                onSubmit={submitBadge}
                style={{
                  marginTop: 14,
                  padding: 14,
                  background: B.offW,
                  borderRadius: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <Row>
                  <FormField label="Badge name">
                    <input
                      value={bForm.name}
                      onChange={(e) => setBForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Quran Champion"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Criteria">
                    <select
                      value={bForm.criteria}
                      onChange={(e) =>
                        setBForm((f) => ({
                          ...f,
                          criteria: e.target.value as (typeof BADGE_CRITERIA)[number],
                        }))
                      }
                      style={inputStyle}
                    >
                      {BADGE_CRITERIA.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </Row>
                <FormField label="Description">
                  <input
                    value={bForm.description}
                    onChange={(e) =>
                      setBForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="What does this badge represent?"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Badge Image URL (optional)">
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                      <input
                        value={bForm.imageUrl}
                        onChange={(e) =>
                          setBForm((f) => ({ ...f, imageUrl: e.target.value }))
                        }
                        placeholder="https://example.com/badge-image.png"
                        style={inputStyle}
                      />
                      <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
                        Import
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/")) {
                            setError("Please select an image file.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setBForm((f) => ({ ...f, imageUrl: String(reader.result ?? "") }));
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                    </div>
                    {bForm.imageUrl && (
                      <div style={{ display: "flex", justifyContent: "center", padding: 8, background: B.offW, borderRadius: 8 }}>
                        <img
                          src={resolveImageUrl(bForm.imageUrl) || bForm.imageUrl}
                          alt="Badge preview"
                          style={{ width: 80, height: 80, objectFit: "contain" }}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    )}
                  </div>
                </FormField>
                <Row>
                  <FormField label="Colour">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {BADGE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBForm((f) => ({ ...f, color: c }))}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: c,
                            border:
                              bForm.color === c ? `3px solid ${B.navy}` : "2px solid transparent",
                            cursor: "pointer",
                          }}
                          aria-label={`Pick ${c}`}
                        />
                      ))}
                    </div>
                  </FormField>
                  <FormField label="XP threshold (optional)">
                    <input
                      type="number"
                      min={0}
                      value={bForm.xpThreshold}
                      onChange={(e) =>
                        setBForm((f) => ({
                          ...f,
                          xpThreshold: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      style={inputStyle}
                    />
                  </FormField>
                </Row>
                <div style={{ display: "flex", gap: 8 }}>
                  <PrimaryButton type="submit" disabled={createBadge.isPending}>
                    {createBadge.isPending ? "Creating…" : "Create badge"}
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={() => setShowCreate(null)}
                    style={cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {isStudent && earned.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <Card title={`Your badges (${earned.length})`}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {earned.map((u: any) => (
                <div
                  key={u.id}
                  style={{
                    background: `linear-gradient(135deg, ${u.badge.color}11 0%, ${u.badge.color}33 100%)`,
                    border: `1.5px solid ${u.badge.color}55`,
                    borderRadius: 14,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  {u.badge.imageUrl ? (
                    <img
                      src={resolveImageUrl(u.badge.imageUrl) || u.badge.imageUrl}
                      alt={u.badge.name}
                      style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 6px" }}
                    />
                  ) : (
                    <Trophy
                      size={28}
                      color={u.badge.color}
                      style={{ margin: "0 auto 6px" }}
                    />
                  )}
                  <div style={{ fontWeight: 800, color: B.navy, fontSize: 14 }}>
                    {u.badge.name}
                  </div>
                  <div style={{ fontSize: 12, color: B.muted, marginTop: 4 }}>
                    {u.badge.description}
                  </div>
                  <div style={{ fontSize: 11, color: B.muted, marginTop: 8, fontWeight: 700 }}>
                    Earned {formatDate(u.earnedAt)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card title="All badges">
        {badgesQ.isLoading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : badges.length === 0 ? (
          <div style={{ color: B.muted }}>No badges defined yet.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {badges.map((b: any) => {
              const owned = earnedMap.has(b.id);
              return (
                <div
                  key={b.id}
                  style={{
                    background: owned
                      ? `linear-gradient(135deg, ${b.color}11 0%, ${b.color}33 100%)`
                      : B.offW,
                    border: `1.5px solid ${owned ? b.color : B.light}`,
                    borderRadius: 14,
                    padding: 16,
                    opacity: isStudent && !owned ? 0.7 : 1,
                    position: "relative",
                  }}
                >
                  {owned && (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: B.success,
                        color: B.white,
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </span>
                  )}
                  {b.imageUrl ? (
                    <img
                      src={resolveImageUrl(b.imageUrl) || b.imageUrl}
                      alt={b.name}
                      style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 8 }}
                    />
                  ) : (
                    <Award
                      size={32}
                      color={owned ? b.color : B.muted}
                      style={{ marginBottom: 8 }}
                    />
                  )}
                  <div
                    style={{
                      fontWeight: 800,
                      color: B.navy,
                      fontSize: 15,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {b.name}
                  </div>
                  <div style={{ fontSize: 12, color: B.muted, marginTop: 4 }}>
                    {b.description}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Pill color={b.color}>{b.criteria}</Pill>
                    {b.xpThreshold > 0 && (
                      <Pill color={B.gold}>{b.xpThreshold} XP</Pill>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: B.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: B.white,
  border: `1.5px solid ${B.light}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  color: B.text,
  width: "100%",
};

const cancelBtn: React.CSSProperties = {
  background: "transparent",
  color: B.muted,
  border: `1px solid ${B.light}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
