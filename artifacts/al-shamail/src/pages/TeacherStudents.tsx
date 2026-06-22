import { useState, useMemo } from "react";
import { Search, Sparkles, Award, Trophy, Flame } from "lucide-react";
import { useListUsers } from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, Pill } from "@/components/DashboardLayout";

export default function TeacherStudents() {
  const usersQ = useListUsers({ role: "student" });
  const items: any[] = usersQ.data?.items ?? [];
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q) return items;
    const t = q.toLowerCase();
    return items.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.grade ?? ""}`
        .toLowerCase()
        .includes(t),
    );
  }, [items, q]);

  return (
    <DashboardLayout
      title="My Students"
      subtitle="Track engagement, XP and progress across the academy."
    >
      <Card>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search
              size={14}
              color={B.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search students..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                background: B.offW,
                border: `1px solid ${B.light}`,
                borderRadius: 10,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                color: B.text,
                boxSizing: "border-box",
              }}
            />
          </div>
          <Pill color={B.navy}>{filtered.length} students</Pill>
        </div>

        {usersQ.isLoading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: B.muted, padding: "30px 0", textAlign: "center" }}>
            No students found.
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${B.light}` }}>
                  <th style={th}>Student</th>
                  <th style={th}>Grade</th>
                  <th style={{ ...th, textAlign: "right" }}>Level</th>
                  <th style={{ ...th, textAlign: "right" }}>XP</th>
                  <th style={{ ...th, textAlign: "right" }}>Streak</th>
                  <th style={{ ...th, textAlign: "right" }}>Courses</th>
                  <th style={{ ...th, textAlign: "right" }}>Lessons</th>
                  <th style={{ ...th, textAlign: "right" }}>Quiz Avg</th>
                  <th style={{ ...th, textAlign: "right" }}>Badges</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${B.light}` }}>
                    <td style={td}>
                      <div style={{ fontWeight: 700, color: B.navy }}>
                        {u.firstName} {u.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                        {u.email}
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ color: B.muted, fontSize: 13 }}>
                        {u.grade ?? "—"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span
                        style={{
                          background: B.navy,
                          color: B.white,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        L{u.level ?? 1}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: B.gold,
                          fontWeight: 800,
                        }}
                      >
                        <Sparkles size={12} /> {u.xp ?? 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: B.navy,
                          fontWeight: 700,
                        }}
                      >
                        <Flame size={12} color={B.gold} /> {u.streak ?? 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: B.text }}>
                      {u.enrollmentCount ?? 0}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: B.text }}>
                      {u.lessonCount ?? 0}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span
                        style={{
                          color:
                            (u.quizAvg ?? 0) >= 80
                              ? B.success
                              : (u.quizAvg ?? 0) >= 60
                                ? B.warning
                                : B.muted,
                          fontWeight: 700,
                        }}
                      >
                        {u.quizAvg != null ? `${u.quizAvg}%` : "—"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: B.navy,
                          fontWeight: 700,
                        }}
                      >
                        <Award size={12} color={B.gold} /> {u.badgeCount ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 18 }}>
        <Card title="Top performers">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {items.slice(0, 6).map((u: any, i: number) => (
              <div
                key={u.id}
                style={{
                  background: i === 0 ? `${B.gold}11` : B.offW,
                  border: `1.5px solid ${i === 0 ? B.gold : B.light}`,
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: i === 0 ? B.gold : B.navy,
                    color: i === 0 ? B.navy : B.white,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {i === 0 ? <Trophy size={18} /> : i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: B.navy,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.firstName} {u.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>
                    Level {u.level ?? 1} · {u.xp ?? 0} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
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
const td: React.CSSProperties = {
  padding: "12px",
  fontSize: 13,
  verticalAlign: "middle",
};
