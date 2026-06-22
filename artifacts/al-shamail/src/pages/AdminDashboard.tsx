import { Link } from "wouter";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Trophy,
  Sparkles,
  Award,
  BookText,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { B, formatDateTime } from "@/lib/brand";
import { DashboardLayout, StatCard, Card, Pill } from "@/components/DashboardLayout";
import { SkeletonGrid } from "@/lib/smooth";

export default function AdminDashboard() {
  const dash = useGetAdminDashboard();
  const data = dash.data;
  const isLoading = dash.isLoading;
  const isError = dash.isError;

  return (
    <DashboardLayout
      title="Admin overview"
      subtitle="The pulse of Al Shamail Academy at a glance."
    >
      <style>{`
        @media (max-width: 980px) {
          .admin-hero,
          .admin-grid-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {isLoading ? (
        <div style={{ display: "grid", gap: 18 }}>
          <SkeletonGrid count={5} />
        </div>
      ) : isError || !data ? (
        <Card>
          <div style={{ padding: 8 }}>
            <div style={{ fontWeight: 800, color: B.navy, fontSize: 16, marginBottom: 6 }}>
              We could not load the admin dashboard
            </div>
            <div style={{ color: B.muted, fontSize: 14 }}>
              Please refresh the page or retry once the connection is stable.
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="admin-hero" style={{
            display: "grid",
            gridTemplateColumns: "1.45fr .95fr",
            gap: 18,
            marginBottom: 24,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${B.navyD} 0%, ${B.navy} 58%, ${B.navyL} 100%)`,
              borderRadius: 28,
              padding: "30px 32px",
              color: B.white,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(15,26,60,.2)",
            }}>
              <div style={{
                position: "absolute",
                top: -80,
                right: -50,
                width: 260,
                height: 260,
                borderRadius: "50%",
                border: "1px solid rgba(201,168,76,.18)",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(201,168,76,.18)",
                  border: "1px solid rgba(201,168,76,.3)",
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: B.goldL,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 16,
                }}>
                  <Sparkles size={12} /> Executive summary
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 36, lineHeight: 1.08 }}>
                  A professional command centre for the academy
                </div>
                <div style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, marginTop: 10, maxWidth: 560 }}>
                  Monitor applications, staffing, course growth, and student achievement from one refined leadership dashboard.
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
                  <Link href="/admin/applications" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "12px 16px", borderRadius: 12,
                      background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                      color: B.white, fontWeight: 800, fontSize: 13,
                      boxShadow: "0 10px 24px rgba(201,168,76,.3)",
                    }}>
                      Review applications <ArrowRight size={14}/>
                    </div>
                  </Link>
                  <Link href="/admin/users" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "12px 16px", borderRadius: 12,
                      background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)",
                      color: B.white, fontWeight: 700, fontSize: 13,
                    }}>
                      Manage users <Users size={14}/>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {[
                { label: "Pending applications", value: data.pendingApplications, accent: B.error },
                { label: "Upcoming events", value: data.upcomingEventCount, accent: B.goldD },
                { label: "XP awarded", value: data.totalXpAwarded.toLocaleString(), accent: B.navyL },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,255,.96))",
                  borderRadius: 22,
                  border: `1px solid ${B.line}`,
                  padding: "18px 20px",
                  boxShadow: "0 12px 26px rgba(27,43,94,.06)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: item.accent, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 30, color: B.navy }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard
              icon={<Users size={20} />}
              label="Students"
              value={data.totalStudents}
              accent={B.navy}
            />
            <StatCard
              icon={<GraduationCap size={20} />}
              label="Teachers"
              value={data.totalTeachers}
              accent={B.gold}
            />
            <StatCard
              icon={<BookOpen size={20} />}
              label="Courses"
              value={data.totalCourses}
              accent={B.navyL}
              hint={`${data.totalLessons} lessons`}
            />
            <StatCard
              icon={<ClipboardList size={20} />}
              label="Pending Applications"
              value={data.pendingApplications}
              accent={B.error}
            />
            <StatCard
              icon={<CalendarDays size={20} />}
              label="Upcoming Events"
              value={data.upcomingEventCount}
              accent={B.goldD}
            />
            <StatCard
              icon={<Sparkles size={20} />}
              label="Total XP Awarded"
              value={data.totalXpAwarded.toLocaleString()}
              accent={B.gold}
            />
            <StatCard
              icon={<Award size={20} />}
              label="Badges Awarded"
              value={data.totalBadgesAwarded}
              accent={B.navyD}
            />
          </div>

          <div className="admin-grid-main"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 18,
              marginBottom: 18,
            }}
          >
            <Card title="New applications (last 14 days)">
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={fillDays(data.applicationsByDay, 14)}
                    margin={{ top: 10, right: 12, bottom: 0, left: -16 }}
                  >
                    <defs>
                      <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={B.navy} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={B.navy} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={B.light} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      tick={{ fontSize: 11, fill: B.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: B.muted }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RTooltip
                      contentStyle={{
                        background: B.white,
                        border: `1px solid ${B.light}`,
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={B.navy}
                      strokeWidth={2.5}
                      fill="url(#appGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Enrollments by subject">
              {data.enrollmentsBySubject.length === 0 ? (
                <div style={{ color: B.muted }}>No enrollments yet.</div>
              ) : (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.enrollmentsBySubject}
                      layout="vertical"
                      margin={{ top: 10, right: 12, bottom: 0, left: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={B.light} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: B.muted }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11, fill: B.muted }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <RTooltip
                        contentStyle={{
                          background: B.white,
                          border: `1px solid ${B.light}`,
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" fill={B.gold} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="admin-grid-main"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 18,
            }}
          >
            <Card
              title="Recent applications"
              action={
                <Link href="/admin/applications" style={navLink}>
                  Manage all <ArrowRight size={12} />
                </Link>
              }
            >
              {data.recentApplications.length === 0 ? (
                <div style={{ color: B.muted }}>No applications yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.recentApplications.map((a: any) => (
                    <div
                      key={a.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: B.offW,
                        border: `1px solid ${B.light}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>
                          {a.firstName} {a.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                          {a.email} · {formatDateTime(a.createdAt)}
                        </div>
                      </div>
                      <Pill color={a.role === "teacher" ? B.gold : B.navy}>
                        {a.role}
                      </Pill>
                      <Pill
                        color={
                          a.status === "approved"
                            ? B.success
                            : a.status === "rejected"
                              ? B.error
                              : B.warning
                        }
                      >
                        {a.status}
                      </Pill>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Top students"
              action={
                <Link href="/leaderboard" style={navLink}>
                  Leaderboard <ArrowRight size={12} />
                </Link>
              }
            >
              {data.topStudents.length === 0 ? (
                <div style={{ color: B.muted, fontSize: 13 }}>No data yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.topStudents.map((s: {
                    userId: number;
                    rank: number;
                    firstName: string;
                    lastName: string;
                    level: number;
                    grade?: string | null;
                    xp: number;
                  }) => (
                    <div
                      key={s.userId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: B.offW,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: s.rank === 1 ? B.gold : B.light,
                          color: s.rank === 1 ? B.navy : B.muted,
                          fontWeight: 800,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {s.rank}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: B.navy }}>
                          {s.firstName} {s.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: B.muted }}>
                          L{s.level} · {s.grade ?? "—"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: B.gold }}>
                        {s.xp} XP
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

const navLink: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: B.navy,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

function fillDays(
  data: Array<{ day: string; count: number }>,
  days: number,
): Array<{ day: string; count: number }> {
  const map = new Map(data.map((d) => [d.day, d.count]));
  const out: Array<{ day: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: map.get(key) ?? 0 });
  }
  return out;
}
