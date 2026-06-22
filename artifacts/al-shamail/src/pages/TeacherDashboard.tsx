import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Users, CalendarDays, CheckCircle2, Upload,
  X, ChevronRight, Sparkles, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import {
  useGetTeacherDashboard, useCreateCourse,
  getListCoursesQueryKey, getGetTeacherDashboardQueryKey,
} from "@workspace/api-client-react";
import { B, formatTime, relativeDay } from "@/lib/brand";
import {
  DashboardLayout, StatCard, Card, Pill, GoldButton, inputStyle,
} from "@/components/DashboardLayout";
import { SkeletonGrid } from "@/lib/smooth";

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

const EMOJI_PRESETS = ["📘","🔢","📝","🔬","🌍","📜","🎓","🧠","⭐","🎨","🕌","📚","✏️","📖","💡"];
const COVER_COLORS  = [B.navy, B.gold, "#166534", "#be185d", "#4338ca", "#0f766e", "#b45309", "#334155"];

/* ─── New Course Modal ─────────────────────────── */
function NewCourseModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (form: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "", subject: "", level: "Year 5",
    description: "", coverEmoji: "📘", coverColor: B.navy as string,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subject || !form.description) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: B.white, borderRadius: 22, width: "100%", maxWidth: 540,
        boxShadow: "0 24px 64px rgba(27,43,94,.2)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          background: `linear-gradient(135deg, ${B.navyD}, ${B.navy})`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 800, color: B.goldL,
              textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4,
            }}>Teacher Portal</div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900, fontSize: 20, color: B.white, margin: 0,
            }}>Create New Course</h2>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.1)", border: "none", borderRadius: 9,
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: B.white,
          }}><X size={15}/></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
                Course Title *
              </label>
              <input placeholder="e.g. Mathematics Year 5" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                style={inputStyle} required/>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
                Subject *
              </label>
              <input placeholder="e.g. Mathematics" value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                style={inputStyle} required/>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
              Level / Year Group
            </label>
            <input placeholder="e.g. Year 5, Grade 6" value={form.level}
              onChange={e => setForm({ ...form, level: e.target.value })}
              style={inputStyle}/>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 5 }}>
              Description *
            </label>
            <textarea placeholder="What will students learn in this course?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} required/>
          </div>

          {/* Emoji + Color pickers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 8 }}>
                Cover Emoji
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EMOJI_PRESETS.slice(0, 8).map(em => (
                  <button key={em} type="button"
                    onClick={() => setForm({ ...form, coverEmoji: em })}
                    style={{
                      width: 36, height: 36, borderRadius: 9, fontSize: 18, border: "none",
                      background: form.coverEmoji === em ? `${B.gold}22` : B.offW,
                      cursor: "pointer",
                      outline: form.coverEmoji === em ? `2px solid ${B.gold}` : "none",
                    }}>{em}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 8 }}>
                Cover Colour
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COVER_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm({ ...form, coverColor: c })}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: "none",
                      background: c, cursor: "pointer",
                      outline: form.coverColor === c ? `3px solid ${B.gold}` : "2px solid transparent",
                      outlineOffset: 1,
                    }}/>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: 14,
            borderRadius: 14, background: B.offW, border: `1px solid ${B.light}`,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13,
              background: form.coverColor, fontSize: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{form.coverEmoji}</div>
            <div>
              <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>
                {form.title || "Course title"}
              </div>
              <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                {form.subject || "Subject"} · {form.level}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "11px 0", borderRadius: 11, background: B.offW,
              border: `1.5px solid ${B.light}`, color: B.muted, fontWeight: 700,
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <GoldButton type="submit" disabled={saving} style={{ flex: 2, justifyContent: "center" }}>
              {saving ? "Creating…" : "Create Course"}
            </GoldButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Quick Import Banner ──────────────────────── */
function QuickImportBanner() {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      border: `2px dashed ${dragging ? B.gold : B.light}`,
      borderRadius: 16, padding: "20px 24px",
      background: dragging ? `${B.gold}06` : B.offW,
      display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
      transition: "all .15s", marginBottom: 20,
    }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); /* handle files */ }}
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept=".pdf,.mp4,.mov,.txt,.md" multiple style={{ display: "none" }}/>
      <div style={{
        width: 48, height: 48, borderRadius: 13, flexShrink: 0,
        background: `${B.gold}18`, border: `1px solid ${B.gold}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: B.goldD,
      }}>
        <Upload size={22}/>
      </div>
      <div>
        <div style={{ fontWeight: 800, color: B.navy, fontSize: 14, marginBottom: 3 }}>
          Drop files to add lessons instantly
        </div>
        <div style={{ fontSize: 12, color: B.muted }}>
          Supports PDF, MP4, MOV, TXT, Markdown · Files are auto-added to your selected course
        </div>
      </div>
      <div style={{
        marginLeft: "auto", flexShrink: 0,
        display: "flex", gap: 8,
      }}>
        {[["📄", "PDF"], ["🎬", "Video"], ["📝", "Text"]].map(([icon, label]) => (
          <div key={label} style={{
            padding: "6px 10px", borderRadius: 8,
            background: B.white, border: `1px solid ${B.light}`,
            fontSize: 11, fontWeight: 700, color: B.muted,
            display: "flex", alignItems: "center", gap: 4,
          }}>{icon} {label}</div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────── */
export default function TeacherDashboard() {
  const qc = useQueryClient();
  const dash = useGetTeacherDashboard();
  const createCourse = useCreateCourse();
  const [showNew, setShowNew] = useState(false);
  const data = dash.data;
  const isLoading = dash.isLoading;
  const isError = dash.isError;

  const onCreate = async (form: any) => {
    await createCourse.mutateAsync({ data: { ...form, published: true } });
    await qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
    await qc.invalidateQueries({ queryKey: getGetTeacherDashboardQueryKey() });
  };

  return (
    <DashboardLayout
      title="Teacher Dashboard"
      subtitle="Manage your courses, lessons, and students."
    >
      <style>{`
        @media (max-width: 980px) {
          .teacher-hero,
          .teacher-grid-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {showNew && (
        <NewCourseModal onClose={() => setShowNew(false)} onCreate={onCreate}/>
      )}

      {isLoading ? (
        <div style={{ display: "grid", gap: 18 }}>
          <SkeletonGrid count={5} />
        </div>
      ) : isError || !data ? (
        <Card>
          <div style={{ padding: 8 }}>
            <div style={{ fontWeight: 800, color: B.navy, fontSize: 16, marginBottom: 6 }}>
              We could not load your teacher dashboard
            </div>
            <div style={{ color: B.muted, fontSize: 14 }}>
              Please refresh the page or try again shortly.
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="teacher-hero" style={{
            display: "grid",
            gridTemplateColumns: "1.5fr .95fr",
            gap: 18,
            marginBottom: 22,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${B.navyD} 0%, ${B.navy} 55%, ${B.navyL} 100%)`,
              borderRadius: 28,
              padding: "30px 32px",
              color: B.white,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(15,26,60,.18)",
            }}>
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(circle at top right, rgba(201,168,76,.14), transparent 26%)`,
                pointerEvents: "none",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(201,168,76,.18)", border: "1px solid rgba(201,168,76,.3)",
                  borderRadius: 999, padding: "5px 12px",
                  fontSize: 11, fontWeight: 800, color: B.goldL,
                  textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 16,
                }}>
                  <Sparkles size={12}/> Teaching overview
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 36, lineHeight: 1.08 }}>
                  Lead every class with clarity and momentum
                </div>
                <div style={{ color: "rgba(255,255,255,.72)", fontSize: 15, marginTop: 10, lineHeight: 1.65, maxWidth: 560 }}>
                  Your dashboard keeps course delivery, student progress, and upcoming teaching activity in one polished workspace.
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                  <GoldButton onClick={() => setShowNew(true)}>
                    Create Course <ArrowRight size={14}/>
                  </GoldButton>
                  <Link href="/courses" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "11px 16px", borderRadius: 12,
                      background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)",
                      color: B.white, fontWeight: 700, fontSize: 13,
                    }}>
                      Open course library <ChevronRight size={14}/>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div style={{
              display: "grid",
              gap: 14,
            }}>
              {[
                { label: "Courses in delivery", value: data.myCourseCount, accent: B.navy },
                { label: "Students reached", value: data.myStudentCount, accent: B.goldD },
                { label: "Upcoming classes", value: data.upcomingClassCount, accent: B.navyL },
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

          <QuickImportBanner/>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14, marginBottom: 22,
          }}>
            <StatCard icon={<BookOpen size={20}/>}     label="My Courses"         value={data.myCourseCount}       accent={B.navy}  />
            <StatCard icon={<Users size={20}/>}         label="My Students"        value={data.myStudentCount}       accent={B.gold}  />
            <StatCard icon={<CalendarDays size={20}/>}  label="Upcoming Classes"   value={data.upcomingClassCount}   accent={B.navyL} />
            <StatCard icon={<CheckCircle2 size={20}/>}  label="Lessons Completed"  value={data.completedLessonCount} accent={B.goldD}
              hint="across all courses"/>
          </div>

          <div className="teacher-grid-main" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginBottom: 18 }}>

            <Card title="My Courses" action={
              <Link href="/courses" style={{ fontSize: 12, fontWeight: 700, color: B.navy, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                Manage all <ArrowRight size={12}/>
              </Link>
            }>
              {data.myCourses.length === 0 ? (
                <div style={{ color: B.muted }}>
                  No courses yet.{" "}
                  <button onClick={() => setShowNew(true)} style={{ color: B.navy, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    Create your first →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.myCourses.map((c: {
                    id: number;
                    title: string;
                    subject: string;
                    level: string;
                    coverColor: string;
                    coverEmoji: string;
                    lessonCount: number;
                    enrolledCount: number;
                  }) => (
                    <Link key={c.id} href={`/courses/${c.id}`}
                      style={{
                        display: "grid", gridTemplateColumns: "54px 1fr auto",
                        gap: 14, padding: "12px 14px", borderRadius: 13,
                        border: `1.5px solid ${B.light}`,
                        background: B.offW, textDecoration: "none", color: B.text,
                        alignItems: "center", transition: "all .15s",
                      }}
                    >
                      <div style={{
                        width: 54, height: 54, borderRadius: 12,
                        background: c.coverColor, fontSize: 26,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{c.coverEmoji}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                          {c.subject} · {c.level}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: B.navyL }}>
                            📖 {c.lessonCount} lessons
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: B.muted }}>
                            👥 {c.enrolledCount} students
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} color={B.muted}/>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Upcoming">
              {data.upcomingEvents.length === 0 ? (
                <div style={{ color: B.muted }}>Nothing scheduled.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.upcomingEvents.map((e: {
                    id: number;
                    kind: string;
                    startsAt: string;
                    title: string;
                    location?: string | null;
                  }) => (
                    <div key={e.id} style={{
                      padding: 12, borderRadius: 12,
                      background: B.offW, border: `1px solid ${B.light}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                        <Pill color={kindColor(e.kind)}>{e.kind}</Pill>
                        <div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>
                          {relativeDay(e.startsAt)} · {formatTime(e.startsAt)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: B.navy, fontSize: 13 }}>{e.title}</div>
                      {e.location && <div style={{ fontSize: 11, color: B.muted }}>{e.location}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="teacher-grid-main" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
            <Card title="Student engagement (last 14 days)">
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={fillDays(data.engagementByDay, 14)}
                    margin={{ top: 10, right: 12, bottom: 0, left: -16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={B.light}/>
                    <XAxis dataKey="day"
                      tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: B.muted }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <RTooltip contentStyle={{ background: B.white, border: `1px solid ${B.light}`, borderRadius: 10, fontSize: 12 }}/>
                    <Bar dataKey="count" fill={B.gold} radius={[6, 6, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top Students" action={
              <Link href="/teacher/students" style={{ fontSize: 12, fontWeight: 700, color: B.navy, textDecoration: "none" }}>
                View all →
              </Link>
            }>
              {data.myStudents.length === 0 ? (
                <div style={{ color: B.muted, fontSize: 13 }}>No students yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.myStudents.slice(0, 6).map((s: {
                    id: number;
                    firstName: string;
                    lastName: string;
                    grade?: string | null;
                    level: number;
                    xp: number;
                  }, i: number) => (
                    <div key={s.id} style={{
                      display: "grid", gridTemplateColumns: "28px 1fr auto",
                      gap: 10, alignItems: "center",
                      padding: "9px 12px", borderRadius: 10, background: B.offW,
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", fontSize: 12,
                        background: i === 0 ? B.gold : B.light,
                        color: i === 0 ? B.navy : B.muted,
                        fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: B.navy }}>
                          {s.firstName} {s.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: B.muted }}>
                          {s.grade ?? "—"} · L{s.level}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: B.goldD }}>
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