import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Trophy, Sparkles, Filter } from "lucide-react";
import {
  useGetLeaderboard,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, inputStyle } from "@/components/DashboardLayout";

type ClassOption = {
  id: number;
  name: string;
  teacherId?: number | null;
  teacherAssignments?: Array<{ teacher: { id: number } }>;
};

import { API_BASE } from "@/lib/api-base";

async function fetchClasses(): Promise<ClassOption[]> {
  const res = await fetch(`${API_BASE}/classes`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch classes");
  const data = await res.json();
  return data.items ?? [];
}

function classesForUser(classes: ClassOption[], user: any): ClassOption[] {
  if (user?.isAdmin) return classes;
  if (user?.role !== "teacher") return [];
  return classes.filter(
    (cls) =>
      cls.teacherId === user.id ||
      cls.teacherAssignments?.some((assignment) => assignment.teacher.id === user.id),
  );
}

export default function LeaderboardPage() {
  const [, navigate] = useLocation();
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const myId = user?.id;

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  useEffect(() => {
    if (me.isLoading) return;
    if (!user) return;
    if (!user.isAdmin && user.role !== "teacher") {
      navigate("/student");
    }
  }, [me.isLoading, user, navigate]);

  useEffect(() => {
    if (!user || (!user.isAdmin && user.role !== "teacher")) return;

    let cancelled = false;
    setClassesLoading(true);
    fetchClasses()
      .then((items) => {
        if (cancelled) return;
        const available = classesForUser(items, user);
        setClasses(available);
        setSelectedClassId((current) => {
          if (current && available.some((cls) => cls.id === current)) return current;
          return available[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const lb = useGetLeaderboard(selectedClassId ?? undefined, {
    query: { enabled: !!selectedClassId },
  });
  const items: any[] = (lb.data as any)?.items ?? [];

  const top3 = items.slice(0, 3);
  const canView = !!user && (user.isAdmin || user.role === "teacher");

  return (
    <DashboardLayout
      title="Leaderboard"
      subtitle={
        selectedClass
          ? `Student rankings for ${selectedClass.name}.`
          : "Compare performance by class."
      }
      action={
        canView ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 12,
              border: `1.5px solid ${B.light}`,
              background: B.white,
            }}
          >
            <Filter size={14} color={B.navy} />
            <select
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              style={{
                ...inputStyle,
                width: "auto",
                minWidth: 180,
                border: "none",
                background: "transparent",
                padding: 0,
              }}
              disabled={classesLoading || classes.length === 0}
            >
              {classes.length === 0 ? (
                <option value="">No classes available</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))
              )}
            </select>
          </div>
        ) : undefined
      }
    >
      {classesLoading ? (
        <Card>
          <div style={{ color: B.muted }}>Loading classes…</div>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <div style={{ color: B.muted }}>
            {user?.isAdmin
              ? "Create a class and enroll students to view a leaderboard."
              : "You are not assigned to any classes yet."}
          </div>
        </Card>
      ) : (
        <>
          {top3.length >= 3 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.15fr 1fr",
                gap: 14,
                alignItems: "end",
                marginBottom: 22,
              }}
            >
              <PodiumCard entry={top3[1]} place={2} myId={myId} />
              <PodiumCard entry={top3[0]} place={1} myId={myId} />
              <PodiumCard entry={top3[2]} place={3} myId={myId} />
            </div>
          )}

          <Card title={selectedClass ? `${selectedClass.name} - Top students` : "Top students"}>
            {lb.isLoading ? (
              <div style={{ color: B.muted }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ color: B.muted }}>
                No enrolled students in this class yet.
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${B.light}` }}>
                      <th style={th}>#</th>
                      <th style={th}>Student</th>
                      <th style={{ ...th, textAlign: "right" }}>Level</th>
                      <th style={{ ...th, textAlign: "right" }}>XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u: any) => {
                      const isMe = u.userId === myId;
                      return (
                        <tr
                          key={u.userId}
                          style={{
                            borderBottom: `1px solid ${B.light}`,
                            background: isMe ? `${B.gold}11` : "transparent",
                          }}
                        >
                          <td style={td}>
                            <span
                              style={{
                                display: "inline-block",
                                width: 28,
                                textAlign: "center",
                                fontWeight: 800,
                                color: u.rank <= 3 ? B.gold : B.muted,
                              }}
                            >
                              {u.rank}
                            </span>
                          </td>
                          <td style={td}>
                            <div style={{ fontWeight: 700, color: B.navy }}>
                              {u.firstName} {u.lastName}
                              {isMe && (
                                <span style={{ color: B.gold, fontSize: 11, marginLeft: 6 }}>
                                  YOU
                                </span>
                              )}
                            </div>
                            {u.grade && (
                              <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                                {u.grade}
                              </div>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: B.navy }}>
                            {u.level}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 800, color: B.gold }}>
                            {u.xp}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

function PodiumCard({ entry, place, myId }: { entry: any; place: number; myId?: number }) {
  if (!entry) return <div />;
  const isMe = entry.userId === myId;
  const palette = place === 1
    ? { bg: B.gold, fg: B.navy, h: 220 }
    : place === 2
      ? { bg: B.navyL, fg: B.white, h: 180 }
      : { bg: B.goldD, fg: B.white, h: 150 };
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${palette.bg} 0%, ${B.navy} 140%)`,
        color: palette.fg,
        height: palette.h,
        borderRadius: 20,
        padding: "20px 18px",
        textAlign: "center",
        position: "relative",
        boxShadow: isMe ? `0 0 0 3px ${B.gold}` : "none",
      }}
    >
      <Trophy size={place === 1 ? 36 : 28} color={place === 1 ? B.navy : B.goldL} style={{ margin: "0 auto" }} />
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: place === 1 ? 28 : 22,
          fontWeight: 800,
          marginTop: 8,
        }}
      >
        #{place}
      </div>
      <div style={{ fontWeight: 800, marginTop: 6, fontSize: 14 }}>
        {entry.firstName} {entry.lastName[0]}.
      </div>
      <div
        style={{
          marginTop: 6,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(0,0,0,.18)",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <Sparkles size={12} /> {entry.xp} XP
      </div>
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
const td: React.CSSProperties = { padding: "12px", fontSize: 13, verticalAlign: "middle" };
