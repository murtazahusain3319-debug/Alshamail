import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  X,
  Users,
  BookOpen,
  Pencil,
  UserPlus,
  GraduationCap,
  ChevronDown,
  AlertTriangle,
  Layers,
  UserX,
} from "lucide-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, StatCard, inputStyle } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

interface TeacherAssignment {
  teacher: Teacher;
  subjects: string[];
}

interface Class {
  id: number;
  name: string;
  subject?: string | null;
  teacherId?: number | null;
  teacher?: { id: number; firstName: string; lastName: string; email: string };
  teacherAssignments?: TeacherAssignment[];
  studentCount: number;
  students?: Student[];
  createdAt: string;
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  grade?: string;
  avatarUrl?: string;
}

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

const API_BASE = "/api";

function getTeacherAssignments(cls: Class): TeacherAssignment[] {
  if (cls.teacherAssignments && cls.teacherAssignments.length > 0) return cls.teacherAssignments;
  if (cls.teacher) {
    return [{
      teacher: { ...cls.teacher, role: "teacher" },
      subjects: cls.subject ? [cls.subject] : [],
    }];
  }
  return [];
}

async function removeTeacherFromClass(classId: number, teacherId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/classes/${classId}/teachers/${teacherId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to remove teacher");
  }
}

function getTeacherSummary(cls: Class): string {
  const assignments = getTeacherAssignments(cls);
  if (assignments.length === 0) return "Not assigned";
  if (assignments.length === 1) {
    return `${assignments[0].teacher.firstName} ${assignments[0].teacher.lastName}`;
  }
  return `${assignments[0].teacher.firstName} ${assignments[0].teacher.lastName} + ${assignments.length - 1} more`;
}

function getSubjectSummary(cls: Class): string {
  const assignments = getTeacherAssignments(cls);
  if (assignments.length === 0) return cls.subject || "No subject";
  const subjects = assignments.flatMap((assignment) => assignment.subjects).filter(Boolean);
  if (subjects.length === 0) return cls.subject || "No subject";
  return subjects.slice(0, 2).join(", ") + (subjects.length > 2 ? ` +${subjects.length - 2} more` : "");
}

function initials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

async function fetchClasses(): Promise<Class[]> {
  const res = await fetch(`${API_BASE}/classes`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch classes");
  const data = await res.json();
  return data.items ?? [];
}

async function fetchStudents(): Promise<Student[]> {
  const res = await fetch(`${API_BASE}/users?role=student`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch students");
  const data = await res.json();
  return data.items ?? [];
}

async function fetchTeachers(): Promise<Teacher[]> {
  const res = await fetch(`${API_BASE}/users?role=teacher`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch teachers");
  const data = await res.json();
  return data.items ?? [];
}

async function fetchTeacherCourses(teacherId: number): Promise<string[]> {
  const res = await fetch(`${API_BASE}/courses?teacherId=${teacherId}`, { credentials: "include" });
  if (!res.ok) {
    console.error("Failed to fetch courses for teacher", teacherId);
    return [];
  }
  const data = await res.json();
  const courses = data.items ?? [];
  console.log("Courses for teacher", teacherId, courses);
  const subjects = new Set<string>();
  courses.forEach((c: any) => {
    if (c.subject) {
      subjects.add(c.subject);
    }
  });
  const subjectsArray = Array.from(subjects).sort();
  console.log("Extracted subjects:", subjectsArray);

  // If no courses found for this teacher, also fetch all courses and log them for diagnosis
  if (subjectsArray.length === 0) {
    try {
      const allRes = await fetch(`${API_BASE}/courses`, { credentials: "include" });
      if (allRes.ok) {
        const allData = await allRes.json();
        const allCourses = allData.items ?? [];
        console.warn(`No courses for teacher ${teacherId}. All courses:`, allCourses);
      }
    } catch (err) {
      console.error("Failed to fetch all courses for diagnostic", err);
    }
  }

  return subjectsArray;
}

function getAssignedSubjectsForTeacher(cls: Class | null | undefined, teacherId: number): string[] {
  if (!cls) return [];
  const assignment = getTeacherAssignments(cls).find((entry) => entry.teacher.id === teacherId);
  return assignment?.subjects ?? [];
}

async function assignTeacherToClass(classId: number, teacherId: number, subjects: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/classes/${classId}/teachers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherId, subjects }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to assign teacher");
  }
}

async function updateTeacherSubjects(
  classId: number,
  teacherId: number,
  subjects: string[],
): Promise<{ removed?: boolean }> {
  const res = await fetch(`${API_BASE}/classes/${classId}/teachers/${teacherId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjects }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update teacher subjects");
  }
  return res.json();
}

async function createClass(name: string): Promise<Class> {
  const res = await fetch(`${API_BASE}/classes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to create class");
  }
  return res.json();
}

async function updateClass(
  classId: number,
  name?: string,
  subject?: string,
  teacherId?: number,
): Promise<Class> {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(name && { name }),
      ...(subject && { subject }),
      ...(typeof teacherId === "number" ? { teacherId } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to update class");
  }
  return res.json();
}

async function deleteClass(classId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete class");
}

async function enrollStudent(classId: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/classes/${classId}/enroll`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to enroll student");
  }
}

async function removeStudent(classId: number, userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/classes/${classId}/enroll/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to remove student");
}

/* ─── Small shared UI bits ─────────────────────────── */

function Tag({
  icon,
  children,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "navy" | "gold" | "warning";
}) {
  const palette = {
    neutral: { bg: B.offW, fg: B.muted, border: B.light },
    navy: { bg: `${B.navy}0F`, fg: B.navy, border: `${B.navy}26` },
    gold: { bg: `${B.gold}1A`, fg: B.goldD, border: `${B.gold}40` },
    warning: { bg: "#FEF3E2", fg: B.warning, border: "#FBDFB1" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        lineHeight: 1.3,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function IconActionButton({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: "default" | "danger";
}) {
  const [hover, setHover] = useState(false);
  const dangerColors = { fg: B.error, bg: "#FEF2F2", border: "#FBD2D2", hoverBg: "#FCE4E4" };
  const defaultColors = { fg: B.navy, bg: B.white, border: B.light, hoverBg: B.offW };
  const c = tone === "danger" ? dangerColors : defaultColors;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 10,
        background: hover ? c.hoverBg : c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        cursor: "pointer",
        transition: "all .15s",
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}

function ModalShell({
  icon,
  eyebrow,
  title,
  onClose,
  children,
  footer,
  maxWidth = 520,
}: {
  icon?: React.ReactNode;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 60, 0.55)",
        backdropFilter: "blur(2px)",
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
          maxWidth,
          background: B.white,
          borderRadius: 20,
          border: `1px solid ${B.light}`,
          boxShadow: "0 28px 64px rgba(15,26,60,.28)",
          overflow: "hidden",
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${B.navyD}, ${B.navy})`,
            color: B.white,
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {icon && (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "rgba(255,255,255,.1)",
                  border: `1px solid ${B.gold}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: B.goldL,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: B.goldL,
                  fontWeight: 800,
                }}
              >
                {eyebrow}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "none",
              borderRadius: 9,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: B.white,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22, overflow: "auto", flex: 1 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: "16px 22px",
              borderTop: `1px solid ${B.light}`,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexShrink: 0,
              background: B.offW,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        borderRadius: 11,
        border: `1.5px solid ${B.light}`,
        background: B.white,
        color: B.navy,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SolidButton({
  children,
  onClick,
  disabled,
  tone = "gold",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "gold" | "danger" | "navy";
}) {
  const bg =
    tone === "danger"
      ? B.error
      : tone === "navy"
      ? `linear-gradient(135deg, ${B.navy}, ${B.navyL})`
      : `linear-gradient(135deg, ${B.gold}, ${B.goldD})`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        borderRadius: 11,
        border: "none",
        background: bg,
        color: B.white,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "wait" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

/* ─── End UI bits ───────────────────────── */

export default function AdminClasses() {
  const meQ = useGetCurrentUser();
  const isAdmin = !!meQ.data?.user?.isAdmin;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class & { students?: Student[] } | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [classPendingDelete, setClassPendingDelete] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editName, setEditName] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState<number | null>(null);
  const [assignSubjects, setAssignSubjects] = useState<Record<string, boolean>>({});
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [enrollSelected, setEnrollSelected] = useState<Record<number, boolean>>({});
  const [assigning, setAssigning] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [editTeacherAssignment, setEditTeacherAssignment] = useState<{
    classId: number;
    teacher: Teacher;
    subjects: string[];
  } | null>(null);
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<Record<string, boolean>>({});
  const [savingTeacherSubjects, setSavingTeacherSubjects] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<Class[]> => {
    try {
      setLoading(true);
      const [classesData, teachersData, studentsData] = await Promise.all([
        fetchClasses(),
        fetchTeachers(),
        fetchStudents(),
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
      setStudents(studentsData);
      return classesData;
    } catch (err) {
      console.error(err);
      alert("Failed to load data");
      return [];
    } finally {
      setLoading(false);
    }
  };

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

  const onSelectClass = (cls: Class) => {
    setSelectedClass(cls);
  };

  const onDelete = async (cls: Class) => {
    if (!window.confirm(`Delete class "${cls.name}"? This action cannot be undone.`)) return;
    try {
      await deleteClass(cls.id);
      setClasses((prev) => prev.filter((c) => c.id !== cls.id));
      setSelectedClass(null);
    } catch (err) {
      alert(String(err));
    }
  };

  const onRemoveStudent = async (classId: number, studentId: number) => {
    try {
      await removeStudent(classId, studentId);
      const classesData = await loadData();
      if (selectedClass?.id === classId) {
        setSelectedClass(classesData.find((c) => c.id === classId) ?? null);
      }
    } catch (err) {
      toast({ title: "Couldn't remove student", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  };

  const activeClass = useMemo(
    () => classes.find((cls) => cls.id === (expandedClassId ?? selectedClass?.id)) ?? selectedClass,
    [classes, expandedClassId, selectedClass],
  );

  const assignedSubjectsForSelectedTeacher = useMemo(() => {
    if (!assignTeacherId) return new Set<string>();
    return new Set(
      getAssignedSubjectsForTeacher(activeClass, assignTeacherId).map((subject) =>
        subject.trim().toLowerCase(),
      ),
    );
  }, [activeClass, assignTeacherId]);

  const onRemoveTeacher = async (classId: number, teacherId: number, teacherName: string) => {
    try {
      await removeTeacherFromClass(classId, teacherId);
      const classesData = await loadData();
      if (selectedClass?.id === classId) {
        setSelectedClass(classesData.find((c) => c.id === classId) ?? null);
      }
      toast({ title: "Teacher removed", description: `${teacherName} removed from class.` });
    } catch (err) {
      toast({ title: "Couldn't remove teacher", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  };

  const openEditTeacherSubjects = (cls: Class, assignment: TeacherAssignment) => {
    const subjects = assignment.subjects.filter(Boolean);
    setEditTeacherAssignment({
      classId: cls.id,
      teacher: assignment.teacher,
      subjects,
    });
    setEditTeacherSubjects(Object.fromEntries(subjects.map((subject) => [subject, true])));
  };

  const closeEditTeacherSubjects = () => {
    setEditTeacherAssignment(null);
    setEditTeacherSubjects({});
  };

  const onSaveTeacherSubjects = async () => {
    if (!editTeacherAssignment) return;

    const remainingSubjects = editTeacherAssignment.subjects.filter((subject) => editTeacherSubjects[subject]);
    const removedCount = editTeacherAssignment.subjects.length - remainingSubjects.length;

    if (removedCount === 0) {
      closeEditTeacherSubjects();
      return;
    }

    const teacherName = `${editTeacherAssignment.teacher.firstName} ${editTeacherAssignment.teacher.lastName}`;
    if (
      remainingSubjects.length === 0 &&
      !window.confirm(`Remove all subjects from ${teacherName}? They will be removed from this class.`)
    ) {
      return;
    }

    try {
      setSavingTeacherSubjects(true);
      const result = await updateTeacherSubjects(
        editTeacherAssignment.classId,
        editTeacherAssignment.teacher.id,
        remainingSubjects,
      );
      closeEditTeacherSubjects();
      const classesData = await loadData();
      if (selectedClass?.id === editTeacherAssignment.classId) {
        setSelectedClass(classesData.find((c) => c.id === editTeacherAssignment.classId) ?? null);
      }
      toast({
        title: result.removed ? "Teacher removed" : "Subjects updated",
        description: result.removed
          ? `${teacherName} was removed from the class.`
          : `Removed ${removedCount} subject${removedCount === 1 ? "" : "s"} from ${teacherName}.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't update subjects",
        description: String(err instanceof Error ? err.message : err),
        variant: "destructive",
      });
    } finally {
      setSavingTeacherSubjects(false);
    }
  };

  return (
    <DashboardLayout title="Classes" subtitle="Manage classes, assign teachers, and enroll students.">
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            marginBottom: 16,
            alignItems: "center",
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
              placeholder="Search classes…"
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
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
              border: "none",
              color: B.white,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Plus size={14} /> New Class
          </button>
        </div>

        {loading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: B.muted, textAlign: "center", padding: "24px 0" }}>
            No classes yet. {isAdmin && "Create one to get started!"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((cls) => {
              const isExpanded = expandedClassId === cls.id;
              return (
                <div key={cls.id}>
                  <div
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedClassId(null);
                        setSelectedClass(null);
                      } else {
                        setExpandedClassId(cls.id);
                        onSelectClass(cls);
                      }
                    }}
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
                        <span>
                          <BookOpen size={12} style={{ display: "inline", marginRight: 6 }} />
                          {getSubjectSummary(cls)}
                        </span>
                        <span>
                          <Users size={12} style={{ display: "inline", marginRight: 6 }} /> {getTeacherSummary(cls)}
                        </span>
                        <span style={{ fontWeight: 700, color: B.navy }}>
                          <Users size={12} style={{ display: "inline", marginRight: 6 }} /> {cls.studentCount}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      <div style={{ display: "flex", gap: 8 }}>
                        <IconActionButton icon={<Pencil size={14} />} label="Edit class name" onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }} />
                        <IconActionButton icon={<GraduationCap size={14} />} label="Assign teachers" onClick={(e) => { e.stopPropagation(); setShowAssignTeacherModal(true); }} />
                        <IconActionButton icon={<UserPlus size={14} />} label="Assign students" onClick={(e) => { e.stopPropagation(); setShowEnrollModal(true); }} />
                        <IconActionButton icon={<Trash2 size={14} />} label="Delete class" tone="danger" onClick={(e) => { e.stopPropagation(); setClassPendingDelete(cls); }} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${B.light}`, background: B.white, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: B.muted, textTransform: "uppercase" }}>Teachers</div>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {getTeacherAssignments(cls).length === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: B.muted }}><AlertTriangle size={14} /> No teacher assigned yet.</div>
                        ) : (
                          getTeacherAssignments(cls).map((a) => (
                            <div key={a.teacher.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 14, background: B.white, border: `1.5px solid ${B.light}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                                    {a.subjects.map((s, i) => <Tag key={i} tone="navy">{s}</Tag>)}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                {isAdmin && a.subjects.length > 0 && (
                                  <IconActionButton
                                    icon={<Pencil size={14} />}
                                    label={`Edit subjects for ${a.teacher.firstName}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditTeacherSubjects(cls, a);
                                    }}
                                  />
                                )}
                                <IconActionButton icon={<UserX size={14} />} label={`Remove ${a.teacher.firstName}`} tone="danger" onClick={async (e) => { e.stopPropagation(); if (!confirm(`Remove ${a.teacher.firstName} ${a.teacher.lastName} from this class?`)) return; await onRemoveTeacher(cls.id, a.teacher.id, `${a.teacher.firstName} ${a.teacher.lastName}`); }} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {selectedClass?.students && selectedClass.id === cls.id && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: B.muted, textTransform: "uppercase", marginBottom: 8 }}>Students</div>
                          <div style={{ display: "grid", gap: 8 }}>
                            {selectedClass.students.map((s) => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 14, background: B.white, border: `1.5px solid ${B.light}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
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
                                <div style={{ display: "flex", gap: 8 }}>
                                  <IconActionButton icon={<UserX size={14} />} label="Remove student" tone="danger" onClick={async () => { if (!confirm(`Remove ${s.firstName} ${s.lastName}?`)) return; await onRemoveStudent(cls.id, s.id); }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell eyebrow="Create" title="New class" onClose={() => setShowCreateModal(false)}>
          <div style={{ display: "grid", gap: 12 }}>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Class name" style={inputStyle} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={() => setShowCreateModal(false)}>Cancel</SecondaryButton>
              <SolidButton onClick={async () => {
                try {
                  const c = await createClass(createName.trim());
                  setShowCreateModal(false);
                  setCreateName("");
                  await loadData();
                  toast({ title: "Class created", description: c.name });
                } catch (err) {
                  toast({ title: "Failed to create class", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
                }
              }}>Create</SolidButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ModalShell eyebrow="Edit" title="Edit class" onClose={() => setShowEditModal(false)}>
          <div style={{ display: "grid", gap: 12 }}>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Class name" style={inputStyle} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={() => setShowEditModal(false)}>Cancel</SecondaryButton>
              <SolidButton onClick={async () => {
                try {
                  const id = expandedClassId ?? selectedClass?.id;
                  if (!id) throw new Error("No class selected");
                  const updated = await updateClass(id, editName.trim());
                  setShowEditModal(false);
                  setEditName("");
                  await loadData();
                  if (selectedClass?.id === id) setSelectedClass(updated);
                  toast({ title: "Class updated", description: updated.name });
                } catch (err) {
                  toast({ title: "Failed to update class", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
                }
              }}>Save</SolidButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacherModal && (
        <ModalShell eyebrow="Assign" title="Assign teachers" onClose={() => { setShowAssignTeacherModal(false); setAssignTeacherId(null); setAssignSubjects({}); setAvailableSubjects([]); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <select 
              value={assignTeacherId ?? ""} 
              onChange={async (e) => {
                const teacherId = e.target.value ? Number(e.target.value) : null;
                setAssignTeacherId(teacherId);
                setAssignSubjects({});
                if (teacherId) {
                  let subjects = await fetchTeacherCourses(teacherId);
                  // Only allow assignment if teacher has actual courses
                  if (subjects.length === 0) {
                    const selectedTeacher = teachers.find(t => t.id === teacherId);
                    toast({ title: "Cannot assign teacher", description: `${selectedTeacher?.firstName} ${selectedTeacher?.lastName} has no courses yet. Please create courses first.`, variant: "destructive" });
                    setAssignTeacherId(null);
                    setAvailableSubjects([]);
                    return;
                  }
                  setAvailableSubjects(subjects);
                } else {
                  setAvailableSubjects([]);
                }
              }} 
              style={inputStyle}
            >
              <option value="">Select a teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} — {t.email}</option>)}
            </select>
            {availableSubjects.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: B.muted, textTransform: "uppercase", marginBottom: 8 }}>Select subjects to teach</div>
                <div style={{ fontSize: 11, color: B.muted, marginBottom: 8 }}>
                  {assignTeacherId ? "Choose which subjects from available courses this teacher will teach in this class." : ""}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {availableSubjects.map((subject) => {
                    const alreadyAssigned = assignedSubjectsForSelectedTeacher.has(subject.trim().toLowerCase());
                    return (
                    <label key={subject} style={{ display: "flex", alignItems: "center", gap: 8, cursor: alreadyAssigned ? "not-allowed" : "pointer", opacity: alreadyAssigned ? 0.6 : 1 }}>
                      <input 
                        type="checkbox" 
                        checked={alreadyAssigned || !!assignSubjects[subject]} 
                        disabled={alreadyAssigned}
                        onChange={(e) => setAssignSubjects(prev => ({ ...prev, [subject]: e.target.checked }))} 
                      />
                      <span>{subject}{alreadyAssigned ? " (already assigned)" : ""}</span>
                    </label>
                    );
                  })}
                </div>
              </div>
            )}
            {availableSubjects.length === 0 && assignTeacherId && (
              <div style={{ color: B.muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                No subjects available in the system. Create courses first.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={() => { setShowAssignTeacherModal(false); setAssignTeacherId(null); setAssignSubjects({}); setAvailableSubjects([]); }}>Cancel</SecondaryButton>
              <SolidButton onClick={async () => {
                try {
                  if (!assignTeacherId) throw new Error("Pick a teacher");
                  const selectedSubjects = Object.entries(assignSubjects)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .filter((subject) => !assignedSubjectsForSelectedTeacher.has(subject.trim().toLowerCase()));
                  if (selectedSubjects.length === 0) throw new Error("Pick at least one new subject");
                  const classId = expandedClassId ?? selectedClass?.id;
                  if (!classId) throw new Error("No class selected");
                  setAssigning(true);
                  await assignTeacherToClass(classId, assignTeacherId, selectedSubjects);
                  setShowAssignTeacherModal(false);
                  setAssignTeacherId(null);
                  setAssignSubjects({});
                  setAvailableSubjects([]);
                  const classesData = await loadData();
                  setSelectedClass(classesData.find((c) => c.id === classId) ?? null);
                  toast({ title: assignedSubjectsForSelectedTeacher.size > 0 ? "Subjects updated" : "Teacher assigned" });
                } catch (err) {
                  toast({ title: "Failed to assign teacher", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
                } finally { setAssigning(false); }
              }}>{assigning ? "Assigning…" : "Assign"}</SolidButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit Teacher Subjects Modal */}
      {editTeacherAssignment && (
        <ModalShell
          eyebrow="Edit"
          title={`Subjects for ${editTeacherAssignment.teacher.firstName} ${editTeacherAssignment.teacher.lastName}`}
          onClose={closeEditTeacherSubjects}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, color: B.muted }}>
              Uncheck subjects to remove them from this teacher in the class.
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {editTeacherAssignment.subjects.map((subject) => (
                <label
                  key={subject}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={!!editTeacherSubjects[subject]}
                    onChange={(e) =>
                      setEditTeacherSubjects((prev) => ({ ...prev, [subject]: e.target.checked }))
                    }
                  />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={closeEditTeacherSubjects}>Cancel</SecondaryButton>
              <SolidButton disabled={savingTeacherSubjects} onClick={onSaveTeacherSubjects}>
                {savingTeacherSubjects ? "Saving…" : "Save changes"}
              </SolidButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <ModalShell eyebrow="Enroll" title="Assign students" onClose={() => { setShowEnrollModal(false); setEnrollSearch(""); }}>
          <div style={{ display: "grid", gap: 12 }}>
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
                placeholder="Search students…"
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
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
            <div style={{ maxHeight: 280, overflow: "auto", display: "grid", gap: 8 }}>
              {students.filter((s) => {
                const term = enrollSearch.trim().toLowerCase();
                if (!term) return true;
                return `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(term);
              }).map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!enrollSelected[s.id]} onChange={(e) => setEnrollSelected(prev => ({ ...prev, [s.id]: e.target.checked }))} />
                  <div>{s.firstName} {s.lastName} <span style={{ color: B.muted }}>{s.email}</span></div>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={() => setShowEnrollModal(false)}>Cancel</SecondaryButton>
              <SolidButton onClick={async () => {
                try {
                  const ids = Object.entries(enrollSelected).filter(([, v]) => v).map(([k]) => Number(k));
                  if (ids.length === 0) throw new Error("Pick at least one student");
                  const classId = expandedClassId ?? selectedClass?.id;
                  if (!classId) throw new Error("No class selected");
                  setEnrolling(true);
                  for (const id of ids) await enrollStudent(classId, id);
                  setShowEnrollModal(false);
                  setEnrollSelected({});
                  setEnrollSearch("");
                  const classesData = await loadData();
                  setSelectedClass(classesData.find((c) => c.id === classId) ?? null);
                  toast({ title: "Students assigned" });
                } catch (err) {
                  toast({ title: "Failed to enroll students", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
                } finally { setEnrolling(false); }
              }}>{enrolling ? "Enrolling…" : "Assign"}</SolidButton>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Delete Confirm */}
      {classPendingDelete && (
        <ModalShell eyebrow="Delete" title="Delete class" onClose={() => setClassPendingDelete(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>Are you sure you want to delete <strong>{classPendingDelete.name}</strong>? This cannot be undone.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <SecondaryButton onClick={() => setClassPendingDelete(null)}>Cancel</SecondaryButton>
              <SolidButton onClick={async () => {
                try {
                  setDeleting(true);
                  await deleteClass(classPendingDelete.id);
                  setClassPendingDelete(null);
                  await loadData();
                  toast({ title: "Class deleted" });
                } catch (err) {
                  toast({ title: "Failed to delete", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
                } finally { setDeleting(false); }
              }}>Delete</SolidButton>
            </div>
          </div>
        </ModalShell>
      )}
    </DashboardLayout>
  );
}
