import { Link } from "wouter";
import {
  Trophy, Flame, BookOpen, Sparkles, Award, Target,
  CheckCircle2, ArrowRight, Zap, Star,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useGetStudentDashboard } from "@workspace/api-client-react";
import { B, formatTime, relativeDay } from "@/lib/brand";
import { DashboardLayout, StatCard, Card, Pill } from "@/components/DashboardLayout";import { SkeletonGrid } from "@/lib/smooth";
/* ─── Helpers ─────────────────────────────────── */
function fillDays(data: Array<{ day: string; count: number }>, days: number) {
  const map = new Map(data.map(d => [d.day, d.count]));
  const out: Array<{ day: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: map.get(key) ?? 0 });
  }
  return out;
}

function kindColor(kind: string): string {
  const map: Record<string, string> = {
    class: B.navy, exam: "#dc2626", assembly: B.gold,
    holiday: "#16a34a", meeting: "#7c3aed", club: "#0891b2",
  };
  return map[kind] ?? B.navy;
}

/* ─── XP Ring ─────────────────────────────────── */
function XpRing({ pct, level }: { pct: number; level: number }) {
  const r = 38, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={8}/>
        <circle cx={48} cy={48} r={r} fill="none"
          stroke={`url(#xpRingGrad)`} strokeWidth={8}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
        <defs>
          <linearGradient id="xpRingGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={B.gold}/>
            <stop offset="100%" stopColor={B.goldL}/>
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900, fontSize: 22, color: B.gold, lineHeight: 1,
        }}>{level}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".06em" }}>Level</div>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────── */
export default function StudentDashboard() {
  const dash = useGetStudentDashboard();
  const data = dash.data;
  const isLoading = dash.isLoading;
  const isError = dash.isError;

  return (
    <DashboardLayout
      title="My Dashboard"
      subtitle="Your learning journey at a glance."
    >
      <style>{`
        @media (max-width: 980px) {
          .student-hero,
          .student-grid-2,
          .student-grid-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {isLoading ? (
        <div style={{ display: "grid", gap: 18 }}>
          <SkeletonGrid count={4} />
        </div>
      ) : isError || !data ? (
        <Card>
          <div style={{ padding: 8 }}>
            <div style={{ fontWeight: 800, color: B.navy, fontSize: 16, marginBottom: 6 }}>
              We could not load your dashboard
            </div>
            <div style={{ color: B.muted, fontSize: 14 }}>
              Please refresh the page or try again in a moment.
            </div>
          </div>
        </Card>
      ) : (() => {
        const span = data.nextLevelXp - data.currentLevelXp;
        const into = data.stats.xp - data.currentLevelXp;
        const pct = span > 0 ? Math.min(100, Math.max(0, Math.round((into / span) * 100))) : 0;

        return (
          <>
            <div className="student-hero" style={{
              background: `linear-gradient(135deg, ${B.navyD} 0%, ${B.navy} 55%, ${B.navyL} 100%)`,
              borderRadius: 28, padding: "30px 32px",
              color: B.white, marginBottom: 22, position: "relative", overflow: "hidden",
              display: "grid", gridTemplateColumns: "1.5fr .9fr", gap: 22,
              boxShadow: "0 24px 60px rgba(15,26,60,.2)",
              border: "1px solid rgba(255,255,255,.08)",
            }}>
              {/* Decorative circles */}
              <div style={{
                position: "absolute", right: -60, top: -60, width: 260, height: 260,
                borderRadius: "50%", border: "1px solid rgba(201,168,76,.15)",
              }}/>
              <div style={{
                position: "absolute", right: -20, top: -20, width: 180, height: 180,
                borderRadius: "50%", background: `radial-gradient(${B.gold}44, transparent 70%)`,
              }}/>

              <div style={{ position: "relative", zIndex: 1 }}>
                <div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(201,168,76,.2)", border: "1px solid rgba(201,168,76,.35)",
                    borderRadius: 99, padding: "4px 12px",
                    fontSize: 11, fontWeight: 800, color: B.goldL,
                    textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14,
                  }}>
                    <Sparkles size={12}/> Your progress
                  </div>

                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900, fontSize: 36, lineHeight: 1.08,
                  }}>
                    {data.stats.xp.toLocaleString()} <span style={{ fontSize: 18, color: B.goldL }}>XP</span>
                  </div>

                  <div style={{ color: "rgba(255,255,255,.72)", fontSize: 15, marginTop: 8, fontWeight: 500, maxWidth: 540, lineHeight: 1.65 }}>
                    You are building strong momentum. Keep your streak alive and complete your current lessons.
                  </div>

                  {/* XP bar */}
                  <div style={{ marginTop: 18, maxWidth: 420 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>
                        Level {data.stats.level}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: B.goldL }}>
                        {Math.max(0, data.nextLevelXp - data.stats.xp)} XP to Level {data.stats.level + 1}
                      </span>
                    </div>
                    <div style={{
                      height: 10, background: "rgba(255,255,255,.12)",
                      borderRadius: 99, overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})`,
                        borderRadius: 99, transition: "width .8s ease",
                      }}/>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
                    <Link href="/courses" style={{ textDecoration: "none" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 16px", borderRadius: 12,
                        background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                        color: B.white, fontWeight: 800, fontSize: 13,
                        boxShadow: "0 10px 24px rgba(201,168,76,.3)",
                      }}>
                        Continue learning <ArrowRight size={14}/>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14, alignContent: "start" }}>
                <div style={{
                  display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between",
                  padding: "18px 18px 16px", borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.06))",
                  border: "1px solid rgba(255,255,255,.12)",
                }}>
                  <XpRing pct={pct} level={data.stats.level} />
                  <div style={{
                    background: "rgba(201,168,76,.15)",
                    border: "1.5px solid rgba(201,168,76,.4)",
                    borderRadius: 16, padding: "16px 18px", textAlign: "center",
                  }}>
                    <Flame size={24} color={B.goldL} style={{ margin: "0 auto 4px" }}/>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 900, fontSize: 26, color: B.white,
                    }}>{data.stats.streak}</div>
                    <div style={{
                      fontSize: 9, fontWeight: 800, color: B.goldL,
                      textTransform: "uppercase", letterSpacing: ".12em",
                    }}>Day Streak</div>
                  </div>
                </div>
                <div className="student-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { icon: <Star size={16} />, label: "Average score", value: data.completedQuizCount > 0 ? `${data.avgQuizScore}%` : "No quizzes yet" },
                    { icon: <Zap size={16} />, label: "Badges unlocked", value: `${data.recentBadges.length} recent` },
                  ].map((item) => (
                    <div key={item.label} style={{
                      padding: "14px 15px",
                      borderRadius: 18,
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.12)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: B.goldL, marginBottom: 8 }}>
                        {item.icon}
                        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                          {item.label}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: B.white }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 14, marginBottom: 22,
            }}>
              <StatCard icon={<BookOpen size={20}/>}     label="Courses Enrolled" value={data.enrolledCount}          accent={B.navy}  />
              <StatCard icon={<CheckCircle2 size={20}/>} label="Lessons Complete"  value={data.completedLessonCount}   accent={B.gold}  />
              <StatCard icon={<Target size={20}/>}       label="Quizzes Taken"     value={data.completedQuizCount}     accent={B.navyL}
                hint={data.completedQuizCount > 0 ? `Avg ${data.avgQuizScore}%` : undefined}/>
              <StatCard icon={<Award size={20}/>}        label="Badges Earned"     value={data.recentBadges.length}    accent={B.goldD} />
            </div>

            <div className="student-grid-main" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>

              {/* Courses */}
              <Card title="My Courses" action={
                <Link href="/courses" style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 12, fontWeight: 700, color: B.navy, textDecoration: "none",
                }}>Browse all <ArrowRight size={12}/></Link>
              }>
                {data.enrollments.length === 0 ? (
                  <div style={{ color: B.muted, padding: "8px 0" }}>
                    Not enrolled yet.{" "}
                    <Link href="/courses" style={{ color: B.navy, fontWeight: 700 }}>Browse courses →</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.enrollments.map((e: any) => (
                      <Link key={e.id} href={`/courses/${e.courseId}`}
                        style={{
                          display: "grid", gridTemplateColumns: "54px 1fr auto",
                          gap: 14, alignItems: "center",
                          padding: 14, borderRadius: 14,
                          border: `1.5px solid ${B.light}`,
                          textDecoration: "none", color: B.text,
                          background: B.offW, transition: "all .15s",
                        }}
                      >
                        <div style={{
                          width: 54, height: 54, borderRadius: 12,
                          background: e.course.coverColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 28,
                        }}>
                          {e.course.coverEmoji}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>
                            {e.course.title}
                          </div>
                          <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                            {e.course.subject} · {e.course.level} · {e.completedLessonCount}/{e.totalLessonCount} lessons
                          </div>
                          <div style={{
                            marginTop: 8, background: B.light,
                            borderRadius: 99, height: 6, overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${e.progress}%`, height: "100%",
                              background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})`,
                            }}/>
                          </div>
                        </div>
                        <div style={{
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 900, fontSize: 20, color: B.navy,
                        }}>{e.progress}%</div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Upcoming */}
              <Card title="Upcoming">
                {data.upcomingEvents.length === 0 ? (
                  <div style={{ color: B.muted }}>Nothing scheduled.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.upcomingEvents.map((e: any) => (
                      <div key={e.id} style={{
                        padding: 14, borderRadius: 13,
                        background: B.offW, border: `1px solid ${B.light}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                          <Pill color={kindColor(e.kind)}>{e.kind}</Pill>
                          <div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>
                            {relativeDay(e.startsAt)} · {formatTime(e.startsAt)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: B.navy, fontSize: 13 }}>{e.title}</div>
                        {e.location && <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>{e.location}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div style={{ marginBottom: 18 }}>
              <Card title="XP earned (last 14 days)">
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <AreaChart
                      data={fillDays(data.xpByDay, 14)}
                      margin={{ top: 10, right: 12, bottom: 0, left: -16 }}
                    >
                      <defs>
                        <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={B.gold} stopOpacity={0.55}/>
                          <stop offset="100%" stopColor={B.gold} stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={B.light}/>
                      <XAxis dataKey="day"
                        tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <RTooltip contentStyle={{ background: B.white, border: `1px solid ${B.light}`, borderRadius: 10, fontSize: 12 }}/>
                      <Area type="monotone" dataKey="count" stroke={B.gold} strokeWidth={2.5} fill="url(#xpGrad)" name="XP"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ── Recent badges ── */}
            {data.recentBadges.length > 0 && (
              <Card title="Recent Achievements" action={
                <Link href="/badges" style={{ fontSize: 12, fontWeight: 700, color: B.navy, textDecoration: "none" }}>
                  View all →
                </Link>
              }>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}>
                  {data.recentBadges.map((b: any) => (
                    <div key={b.id} style={{
                      background: `linear-gradient(135deg, ${b.badge.color}0e 0%, ${b.badge.color}28 100%)`,
                      border: `1.5px solid ${b.badge.color}44`,
                      borderRadius: 14, padding: "16px 14px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>
                        {b.badge.icon ?? <Trophy size={24} color={b.badge.color}/>}
                      </div>
                      <div style={{ fontWeight: 800, color: B.navy, fontSize: 13, marginBottom: 4 }}>
                        {b.badge.name}
                      </div>
                      <div style={{ fontSize: 11, color: B.muted, lineHeight: 1.4 }}>
                        {b.badge.description}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        );
      })()}
    </DashboardLayout>
  );
}