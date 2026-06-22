import { useState } from "react";
import { Trophy, Award, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBadges,
  useGetMyGamification,
  useGetCurrentUser,
  useCreateBadge,
  useAwardAchievementToUser,
  useListUsers,
  getListBadgesQueryKey,
} from "@workspace/api-client-react";
import { B, formatDate } from "@/lib/brand";
import { DashboardLayout, Card, Pill, PrimaryButton, GoldButton } from "@/components/DashboardLayout";

const BADGE_COLORS = ["#C9A84C", "#1F3A5F", "#7C3AED", "#16A34A", "#DC2626", "#0EA5E9"];
const BADGE_CRITERIA = ["manual", "xp", "lessons", "streak"] as const;

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
  const awardAchievement = useAwardAchievementToUser();
  const usersQ = useListUsers({}, { query: { enabled: isAdminOrTeacher } });
  const allUsers: any[] = (usersQ.data as any)?.items ?? [];
  const students = allUsers.filter((u) => u.role === "student");

  const [showCreate, setShowCreate] = useState<"badge" | "achievement" | null>(null);
  const [bForm, setBForm] = useState({
    name: "",
    description: "",
    color: BADGE_COLORS[0],
    criteria: "manual" as (typeof BADGE_CRITERIA)[number],
    xpThreshold: 0,
  });
  const [aForm, setAForm] = useState({
    userId: "",
    title: "",
    description: "",
    kind: "milestone",
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
          color: bForm.color,
          criteria: bForm.criteria,
          xpThreshold: Number(bForm.xpThreshold) || 0,
        },
      });
      await qc.invalidateQueries({ queryKey: getListBadgesQueryKey() });
      setBForm({
        name: "",
        description: "",
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

  const submitAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const userId = parseInt(aForm.userId, 10);
    if (!Number.isFinite(userId)) {
      setError("Please pick a student.");
      return;
    }
    if (!aForm.title.trim()) {
      setError("Please enter an achievement title.");
      return;
    }
    try {
      await awardAchievement.mutateAsync({
        userId,
        data: {
          title: aForm.title.trim(),
          description: aForm.description.trim(),
          kind: aForm.kind.trim() || "milestone",
        },
      });
      setAForm({ userId: "", title: "", description: "", kind: "milestone" });
      setShowCreate(null);
      setOkMsg("Achievement awarded!");
      setTimeout(() => setOkMsg(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not award achievement.");
    }
  };

  return (
    <DashboardLayout
      title="Badges & Achievements"
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
                  Recognise students
                </div>
                <div style={{ color: B.muted, fontSize: 13, marginTop: 2 }}>
                  Create new badges that everyone can earn, or award an achievement to a specific
                  student.
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
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowCreate(showCreate === "achievement" ? null : "achievement");
                  }}
                >
                  <Sparkles size={14} style={{ marginRight: 4 }} />
                  New achievement
                </PrimaryButton>
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

            {showCreate === "achievement" && (
              <form
                onSubmit={submitAchievement}
                style={{
                  marginTop: 14,
                  padding: 14,
                  background: B.offW,
                  borderRadius: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <FormField label="Student">
                  <select
                    value={aForm.userId}
                    onChange={(e) => setAForm((f) => ({ ...f, userId: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Pick a student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                        {s.grade ? ` — ${s.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Row>
                  <FormField label="Title">
                    <input
                      value={aForm.title}
                      onChange={(e) => setAForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Top of the class"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Kind">
                    <input
                      value={aForm.kind}
                      onChange={(e) => setAForm((f) => ({ ...f, kind: e.target.value }))}
                      placeholder="milestone"
                      style={inputStyle}
                    />
                  </FormField>
                </Row>
                <FormField label="Description">
                  <input
                    value={aForm.description}
                    onChange={(e) =>
                      setAForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="A short note for the student"
                    style={inputStyle}
                  />
                </FormField>
                <div style={{ display: "flex", gap: 8 }}>
                  <PrimaryButton type="submit" disabled={awardAchievement.isPending}>
                    {awardAchievement.isPending ? "Awarding…" : "Award achievement"}
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
                  <Trophy
                    size={28}
                    color={u.badge.color}
                    style={{ margin: "0 auto 6px" }}
                  />
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
                  <Award
                    size={32}
                    color={owned ? b.color : B.muted}
                    style={{ marginBottom: 8 }}
                  />
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
