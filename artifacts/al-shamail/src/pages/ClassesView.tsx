import { useEffect, useState, useMemo } from "react";
import { Users, BookOpen, User as UserIcon, ChevronDown } from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { DashboardLayout, Card } from "@/components/DashboardLayout";

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface TeacherAssignment {
  teacher: Teacher;
  subjects: string[];
}

interface ClassDetail {
  id: number;
  name: string;
  subject?: string | null;
  teacherId?: number | null;
  teacher?: Teacher | null;
  teacherAssignments?: TeacherAssignment[];
  studentCount?: number;
  students: Array<{ id: number; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string }>;
}

import { API_BASE } from "@/lib/api-base";

function getTeacherAssignments(cls: ClassDetail): TeacherAssignment[] {
  if (cls.teacherAssignments && cls.teacherAssignments.length > 0) return cls.teacherAssignments;
  if (cls.teacher) {
    return [{
      teacher: cls.teacher,
      subjects: cls.subject ? [cls.subject] : [],
    }];
  }
  return [];
}

function getTeacherSummary(cls: ClassDetail): string {
  const assignments = getTeacherAssignments(cls);
  if (assignments.length === 0) return "Not assigned";
  if (assignments.length === 1) {
    return `${assignments[0].teacher.firstName} ${assignments[0].teacher.lastName}`;
  }
  return `${assignments[0].teacher.firstName} ${assignments[0].teacher.lastName} + ${assignments.length - 1} more`;
}

function getSubjectSummary(cls: ClassDetail): string {
  const assignments = getTeacherAssignments(cls);
  if (assignments.length === 0) return cls.subject || "No subject";
  const subjects = assignments.flatMap((assignment) => assignment.subjects).filter(Boolean);
  if (subjects.length === 0) return cls.subject || "No subject";
  return subjects.slice(0, 2).join(", ") + (subjects.length > 2 ? ` +${subjects.length - 2} more` : "");
}

function initials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

function studentCount(cls: ClassDetail): number {
  return cls.students?.length ?? cls.studentCount ?? 0;
}

function subjectCount(cls: ClassDetail): number {
  const assignments = getTeacherAssignments(cls);
  if (assignments.length === 0) return cls.subject ? 1 : 0;
  const subjects = assignments.flatMap((assignment) => assignment.subjects).filter(Boolean);
  return subjects.length || (cls.subject ? 1 : 0);
}

function teacherCount(cls: ClassDetail): number {
  return getTeacherAssignments(cls).length;
}

function classesForUser(
  allClasses: ClassDetail[],
  user: { id: number; role?: string; isAdmin?: boolean },
): ClassDetail[] {
  if (user.isAdmin) return allClasses;

  if (user.role === "teacher") {
    return allClasses.filter(
      (c) =>
        c.teacherId === user.id ||
        c.teacherAssignments?.some((a) => a.teacher.id === user.id),
    );
  }

  if (user.role === "student") {
    return allClasses.filter((c) => c.students?.some((s) => s.id === user.id));
  }

  return allClasses;
}

async function fetchClasses(): Promise<ClassDetail[]> {
  const res = await fetch(`${API_BASE}/classes`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch classes");
  const data = await res.json();
  return data.items ?? [];
}

export default function ClassesAndClassmates() {
  const meQ = useGetCurrentUser();
  const user = meQ.data?.user;
  const role = user?.role;

  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadClasses = async () => {
      try {
        setLoading(true);
        setError(null);
        const allClasses = await fetchClasses();
        if (cancelled) return;
        setClasses(classesForUser(allClasses, user));
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("We could not load your classes. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadClasses();
    return () => { cancelled = true; };
  }, [user?.id, user?.role, user?.isAdmin]);

  const title = "Classes";
  const subtitle = "View classes, teachers, and students.";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (!term) return true;
      const assignmentNames = getTeacherAssignments(c)
        .map((assignment) => `${assignment.teacher.firstName} ${assignment.teacher.lastName}`)
        .join(" ");
      const hay = [c.name, c.subject, assignmentNames]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [classes, search]);

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <Card>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes..."
            style={{
              flex: 1,
              minWidth: 200,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${B.light}`,
              background: B.offW,
              fontSize: 13,
            }}
          />
        </div>

        {loading ? (
          <div style={{ color: B.muted, padding: "24px 0", textAlign: "center" }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ color: "#dc2626", padding: "24px 0", textAlign: "center" }}>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: B.muted, padding: "24px 0", textAlign: "center" }}>
            {search ? "No classes match your search." : (role === "teacher"
              ? "You are not teaching any classes yet."
              : "You are not enrolled in any classes yet.")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((cls) => {
              const count = studentCount(cls);
              const isExpanded = expandedClassId === cls.id;

              return (
                <div key={cls.id}>
                  <div
                    onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                    style={{
                      padding: 14,
                      background: B.white,
                      border: `1.5px solid ${B.light}`,
                      borderRadius: 14,
                      cursor: "pointer",
                      transition: "all .2s",
                      boxShadow: isExpanded ? "0 24px 48px rgba(27,43,94,0.08)" : undefined,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                      outline: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: B.navy, marginBottom: 6 }}>{cls.name}</div>
                      <div style={{ fontSize: 12, color: B.muted, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: B.navy }}>
                          <BookOpen size={12} style={{ display: "inline", marginRight: 6 }} />
                          {subjectCount(cls)} {subjectCount(cls) === 1 ? "subject" : "subjects"}
                        </span>
                        <span style={{ fontWeight: 700, color: B.navy }}>
                          <UserIcon size={12} style={{ display: "inline", marginRight: 6 }} /> {teacherCount(cls)} {teacherCount(cls) === 1 ? "teacher" : "teachers"}
                        </span>
                        <span style={{ fontWeight: 700, color: B.navy }}>
                          <Users size={12} style={{ display: "inline", marginRight: 6 }} /> {count} {count === 1 ? "student" : "students"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: B.offW,
                        display: "grid",
                        placeItems: "center",
                        color: B.navy,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .2s ease",
                      }}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${B.light}`, background: B.white, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: B.muted, textTransform: "uppercase" }}>Teachers</div>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {getTeacherAssignments(cls).length === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: B.muted }}>No teacher assigned yet.</div>
                        ) : (
                          getTeacherAssignments(cls).map((a) => (
                            <div key={a.teacher.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, background: B.white, border: `1.5px solid ${B.light}` }}>
                              <div style={{ width: 44, height: 44, borderRadius: 14, background: a.teacher.avatarUrl ? "transparent" : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`, display: "flex", alignItems: "center", justifyContent: "center", color: B.goldL, fontWeight: 900, fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                                {a.teacher.avatarUrl ? (
                                  <img src={a.teacher.avatarUrl} alt={`${a.teacher.firstName} ${a.teacher.lastName}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  initials(a.teacher.firstName, a.teacher.lastName)
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800 }}>{a.teacher.firstName} {a.teacher.lastName}</div>
                                <div style={{ fontSize: 12, color: B.muted }}>{a.teacher.email}</div>
                                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {a.subjects.map((s, i) => (
                                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${B.navy}0F`, color: B.navy, border: `1px solid ${B.navy}26` }}>
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: B.muted, textTransform: "uppercase", marginBottom: 8 }}>Students</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {cls.students.map((s) => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, background: B.white, border: `1.5px solid ${B.light}` }}>
                              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.avatarUrl ? "transparent" : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`, display: "flex", alignItems: "center", justifyContent: "center", color: B.goldL, fontWeight: 900, fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                                {s.avatarUrl ? (
                                  <img src={s.avatarUrl} alt={`${s.firstName} ${s.lastName}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  initials(s.firstName, s.lastName)
                                )}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div>{s.firstName} {s.lastName}</div>
                                <div style={{ color: B.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
