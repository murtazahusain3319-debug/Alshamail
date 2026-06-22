import { useEffect, useState } from "react";
import { Users, BookOpen, User as UserIcon } from "lucide-react";
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

const API_BASE = "/api";

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

function studentCount(cls: ClassDetail): number {
  return cls.students?.length ?? cls.studentCount ?? 0;
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

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <Card>
        {loading ? (
          <div style={{ color: B.muted, padding: "24px 0", textAlign: "center" }}>
            Loading…
          </div>
        ) : error ? (
          <div style={{ color: "#dc2626", padding: "24px 0", textAlign: "center" }}>
            {error}
          </div>
        ) : classes.length === 0 ? (
          <div style={{ color: B.muted, padding: "24px 0", textAlign: "center" }}>
            {role === "teacher"
              ? "You are not teaching any classes yet."
              : "You are not enrolled in any classes yet."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {classes.map((cls) => {
              const count = studentCount(cls);
              const teacherAssignments = getTeacherAssignments(cls);

              return (
                <div
                  key={cls.id}
                  style={{
                    background: B.white,
                    border: `1.5px solid ${B.light}`,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() =>
                      setExpandedClassId(expandedClassId === cls.id ? null : cls.id)
                    }
                    style={{
                      width: "100%",
                      padding: 16,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: B.navy,
                          marginBottom: 6,
                        }}
                      >
                        {cls.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          alignItems: "center",
                          flexWrap: "wrap",
                          fontSize: 13,
                          color: B.muted,
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <BookOpen size={13} /> {cls.subject || "No subject"}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <UserIcon size={13} /> {getTeacherSummary(cls)}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 600,
                            color: B.navy,
                          }}
                        >
                          <Users size={13} /> {count}{" "}
                          {count === 1 ? "student" : "students"}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: B.offW,
                        color: B.navy,
                        transform:
                          expandedClassId === cls.id ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .2s ease",
                      }}
                    >
                      ▼
                    </div>
                  </button>

                  {expandedClassId === cls.id && (
                    <>
                      <div style={{ borderTop: `1px solid ${B.light}` }} />
                      <div style={{ padding: 16, display: "grid", gap: 16 }}>
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: B.muted,
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                              marginBottom: 10,
                            }}
                          >
                            📚 {teacherAssignments.length === 1 ? "Teacher" : "Teachers"}
                          </div>
                          {teacherAssignments.length === 0 ? (
                            <div style={{ fontSize: 13, color: B.muted }}>No teacher assigned</div>
                          ) : (
                            <div style={{ display: "grid", gap: 8 }}>
                              {teacherAssignments.map((assignment) => (
                                <div
                                  key={assignment.teacher.id}
                                  style={{
                                    background: `linear-gradient(135deg, ${B.navy}08, ${B.navy}04)`,
                                    border: `1px solid ${B.light}`,
                                    borderRadius: 10,
                                    padding: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: 10,
                                      background: assignment.teacher.avatarUrl
                                        ? "transparent"
                                        : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                                      color: B.goldL,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 900,
                                      fontSize: 16,
                                      flexShrink: 0,
                                      overflow: "hidden",
                                    }}
                                  >
                                    {assignment.teacher.avatarUrl ? (
                                      <img
                                        src={assignment.teacher.avatarUrl}
                                        alt={`${assignment.teacher.firstName} ${assignment.teacher.lastName}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      />
                                    ) : (
                                      (assignment.teacher.firstName[0] || "?").toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: B.navy }}>
                                      {assignment.teacher.firstName} {assignment.teacher.lastName}
                                    </div>
                                    {assignment.subjects.length > 0 && (
                                      <div style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>
                                        {assignment.subjects.join(", ")}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: B.muted, marginTop: 4 }}>
                                      {assignment.teacher.email}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: B.muted,
                              textTransform: "uppercase",
                              letterSpacing: ".08em",
                              marginBottom: 10,
                            }}
                          >
                            👥 Students ({count})
                          </div>
                          {count === 0 ? (
                            <div style={{ fontSize: 13, color: B.muted }}>No students enrolled</div>
                          ) : (
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                maxHeight: 400,
                                overflowY: "auto",
                              }}
                            >
                              {cls.students.map((student) => (
                                <div
                                  key={student.id}
                                  style={{
                                    background: B.offW,
                                    border: `1px solid ${B.light}`,
                                    borderRadius: 8,
                                    padding: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: "50%",
                                      background: student.avatarUrl
                                        ? "transparent"
                                        : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                                      color: B.goldL,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 900,
                                      fontSize: 14,
                                      flexShrink: 0,
                                      overflow: "hidden",
                                    }}
                                  >
                                    {student.avatarUrl ? (
                                      <img
                                        src={student.avatarUrl}
                                        alt={`${student.firstName} ${student.lastName}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      />
                                    ) : (
                                      (student.firstName[0] || "?").toUpperCase()
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: 12,
                                        color: B.navy,
                                      }}
                                    >
                                      {student.firstName} {student.lastName}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: B.muted,
                                      }}
                                    >
                                      {student.email}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
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
