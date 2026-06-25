import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useGetCurrentUser,
  useListCourses,
  useListGradeSubjects,
  useListGrades,
  useCreateGradeSubject,
  useDeleteGradeSubject,
  useCreateGradeEntry,
  useUpdateGradeEntry,
  useDeleteGradeEntry,
} from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { toast } from "@/hooks/use-toast";
import { DashboardLayout, Card, GoldButton, inputStyle } from "@/components/DashboardLayout";
import {
  GraduationCap, Plus, ChevronDown, ChevronUp, Pencil, Trash2,
} from "lucide-react";

import { API_BASE } from "@/lib/api-base";

interface SchoolClass {
  id: number;
  name: string;
  subject?: string | null;
  teacherId?: number | null;
  teacherAssignments?: Array<{ teacher: { id: number }; subjects: string[] }>;
  students?: Array<{ id: number; firstName: string; lastName: string; email: string; avatarUrl?: string }>;
}

interface GradeSubject {
  id: number;
  classId: number;
  subjectId: string;
  subjectName: string;
}

interface GradeEntry {
  id: number;
  classId: number;
  subjectId: string;
  subjectName: string;
  studentId: number;
  student?: { id: number; firstName: string; lastName: string; email: string; avatarUrl?: string } | null;
  title: string;
  score: number;
  maxScore: number;
  notes?: string | null;
}

const COURSE_OPTIONS = [
  { id: "english", name: "English" },
  { id: "math", name: "Math" },
  { id: "science", name: "Science" },
  { id: "history", name: "History" },
];

async function fetchClasses(): Promise<SchoolClass[]> {
  const res = await fetch(`${API_BASE}/classes`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch classes");
  const data = await res.json();
  return data.items ?? [];
}

function findCourseName(courseId: string, options: { id: string; name: string }[]) {
  return options.find((c) => c.id === courseId)?.name ?? courseId;
}

function scoreColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 90) return B.success;
  if (pct >= 70) return B.navy;
  if (pct >= 50) return B.warning;
  return B.error;
}

function groupGradesByClassAndSubject(
  classes: { id: string; name: string }[],
  subjects: GradeSubject[],
  entries: GradeEntry[],
) {
  const gradeMap = new Map<
    string,
    { gradeName: string; subjects: Map<string, { subjectName: string; subjectRecordId: number; items: GradeEntry[] }> }
  >();

  classes.forEach((cls) => {
    gradeMap.set(cls.id, { gradeName: cls.name, subjects: new Map() });
  });

  subjects.forEach((subject) => {
    const classKey = String(subject.classId);
    if (!gradeMap.has(classKey)) {
      gradeMap.set(classKey, { gradeName: "Unknown class", subjects: new Map() });
    }
    const grade = gradeMap.get(classKey)!;
    if (!grade.subjects.has(subject.subjectId)) {
      grade.subjects.set(subject.subjectId, {
        subjectName: subject.subjectName,
        subjectRecordId: subject.id,
        items: [],
      });
    }
  });

  entries.forEach((entry) => {
    const classKey = String(entry.classId);
    if (!gradeMap.has(classKey)) {
      gradeMap.set(classKey, { gradeName: "Class", subjects: new Map() });
    }
    const grade = gradeMap.get(classKey)!;
    if (!grade.subjects.has(entry.subjectId)) {
      grade.subjects.set(entry.subjectId, {
        subjectName: entry.subjectName,
        subjectRecordId: 0,
        items: [],
      });
    }
    grade.subjects.get(entry.subjectId)!.items.push(entry);
  });

  return Array.from(gradeMap.entries())
    .map(([gradeKey, gradeData]) => ({
      gradeKey,
      gradeName: gradeData.gradeName,
      subjects: Array.from(gradeData.subjects.entries())
        .map(([subjectKey, subjectData]) => ({
          subjectKey,
          subjectName: subjectData.subjectName,
          subjectRecordId: subjectData.subjectRecordId,
          items: subjectData.items.sort((a, b) => a.title.localeCompare(b.title)),
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    }))
    .sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

function GradeEntryForm({
  students,
  initial,
  onSave,
  onCancel,
  saving,
}: {
  students: SchoolClass["students"];
  initial?: Partial<GradeEntry>;
  onSave: (data: { studentId: number; title: string; score: number; maxScore: number; notes: string }) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [studentId, setStudentId] = useState(String(initial?.studentId ?? ""));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [score, setScore] = useState(String(initial?.score ?? ""));
  const [maxScore, setMaxScore] = useState(String(initial?.maxScore ?? 100));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!initial?.studentId && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Student
          </label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{ ...inputStyle, marginTop: 6, width: "100%" }}
          >
            <option value="">Select student…</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Test / Assessment
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mid-term Exam, Quiz 3"
          style={{ ...inputStyle, marginTop: 6, width: "100%" }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Score
          </label>
          <input
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            style={{ ...inputStyle, marginTop: 6, width: "100%" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Out of
          </label>
          <input
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            style={{ ...inputStyle, marginTop: 6, width: "100%" }}
          />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, marginTop: 6, width: "100%", resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 18px", borderRadius: 11, border: `1.5px solid ${B.line}`,
            background: B.white, color: B.navy, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          disabled={saving}
          onClick={() => {
            const parsedScore = parseInt(score, 10);
            const parsedMax = parseInt(maxScore, 10);
            const parsedStudentId = parseInt(studentId, 10);
            if (!title.trim()) return;
            if (!Number.isFinite(parsedScore) || !Number.isFinite(parsedMax)) return;
            if (!initial?.studentId && !Number.isFinite(parsedStudentId)) return;
            onSave({
              studentId: initial?.studentId ?? parsedStudentId,
              title: title.trim(),
              score: parsedScore,
              maxScore: parsedMax,
              notes: notes.trim(),
            });
          }}
          style={{
            padding: "10px 18px", borderRadius: 11, border: "none",
            background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
            color: B.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : initial?.id ? "Update Score" : "Add Score"}
        </button>
      </div>
    </div>
  );
}

export default function GradesPage() {
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const isAdmin = !!user?.isAdmin;
  const isTeacher = !isAdmin && user?.role === "teacher";
  const isStudent = !isAdmin && !isTeacher;
  const userId = user?.id;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createClassId, setCreateClassId] = useState<string | null>(null);
  const [newSubjectId, setNewSubjectId] = useState<string | null>(null);
  const [addScoreContext, setAddScoreContext] = useState<{
    classId: number;
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [editEntry, setEditEntry] = useState<GradeEntry | null>(null);
  const [activeView, setActiveView] = useState<"grades" | "report">("grades");

  const coursesQuery = useListCourses();
  const courseOptions = useMemo(() => {
    const items = coursesQuery.data?.items ?? COURSE_OPTIONS;
    return items.map((course: any) => ({
      id: String(course.id),
      name: course.subject || course.title || course.name || `Course ${course.id}`,
    }));
  }, [coursesQuery.data?.items]);

  const subjectsQuery = useListGradeSubjects();
  const gradesQuery = useListGrades();
  const createSubject = useCreateGradeSubject();
  const deleteSubject = useDeleteGradeSubject();
  const createEntry = useCreateGradeEntry();
  const updateEntry = useUpdateGradeEntry();
  const deleteEntry = useDeleteGradeEntry();

  const subjects: GradeSubject[] = subjectsQuery.data?.items ?? [];
  const entries: GradeEntry[] = gradesQuery.data?.items ?? [];

  useEffect(() => {
    fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const classOptions = useMemo(() => classes.map((cls) => ({ id: String(cls.id), name: cls.name })), [classes]);

  const teacherAssignedSubjectIdsByClass = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!isTeacher || !userId) return map;

    classes.forEach((cls) => {
      const assignments = cls.teacherAssignments?.filter((a) => a.teacher.id === userId);
      if (!assignments?.length) return;

      const matchedIds = new Set<string>();
      assignments.flatMap((a) => a.subjects ?? []).forEach((subject) => {
        const normalized = String(subject ?? "").trim().toLowerCase();
        if (!normalized) return;
        const byId = courseOptions.find((c) => c.id.toLowerCase() === normalized);
        if (byId) matchedIds.add(byId.id);
        const byName = courseOptions.find((c) => c.name.trim().toLowerCase() === normalized);
        if (byName) matchedIds.add(byName.id);
      });

      if (matchedIds.size === 0 && cls.teacherId === userId && cls.subject) {
        const normalized = String(cls.subject).trim().toLowerCase();
        const byId = courseOptions.find((c) => c.id.toLowerCase() === normalized);
        if (byId) matchedIds.add(byId.id);
        const byName = courseOptions.find((c) => c.name.trim().toLowerCase() === normalized);
        if (byName) matchedIds.add(byName.id);
      }

      if (matchedIds.size > 0) map.set(String(cls.id), Array.from(matchedIds));
    });

    return map;
  }, [classes, courseOptions, isTeacher, userId]);

  const getAllowedSubjectIdsForClass = useCallback(
    (classId: string) => {
      if (!isTeacher) return courseOptions.map((c) => c.id);
      return teacherAssignedSubjectIdsByClass.get(classId) ?? [];
    },
    [courseOptions, isTeacher, teacherAssignedSubjectIdsByClass],
  );

  const canManageSubject = useCallback(
    (classId: string, subjectId: string) => {
      if (isAdmin) return true;
      if (!isTeacher) return false;
      return getAllowedSubjectIdsForClass(classId).includes(subjectId);
    },
    [getAllowedSubjectIdsForClass, isAdmin, isTeacher],
  );

  const teacherClassIds = useMemo(() => {
    if (!isTeacher || !userId) return [];
    return classes
      .filter((cls) => cls.teacherId === userId || cls.teacherAssignments?.some((a) => a.teacher.id === userId))
      .map((cls) => String(cls.id));
  }, [classes, isTeacher, userId]);

  const studentClassIds = useMemo(() => {
    if (!isStudent || !userId) return [];
    return classes
      .filter((cls) => cls.students?.some((s) => s.id === userId))
      .map((cls) => String(cls.id));
  }, [classes, isStudent, userId]);

  const availableClassOptions = useMemo(() => {
    if (isAdmin) return classOptions;
    if (isTeacher) return classOptions.filter((cls) => teacherClassIds.includes(cls.id));
    return classOptions.filter((cls) => studentClassIds.includes(cls.id));
  }, [classOptions, isAdmin, isTeacher, teacherClassIds, studentClassIds]);

  const visibleClassIds = useMemo(() => {
    if (isAdmin) return classOptions.map((c) => c.id);
    if (isTeacher) return teacherClassIds;
    return studentClassIds;
  }, [classOptions, isAdmin, isTeacher, studentClassIds, teacherClassIds]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (!visibleClassIds.includes(String(s.classId))) return false;
      if (isAdmin) return true;
      if (isTeacher) return canManageSubject(String(s.classId), s.subjectId);
      return true;
    });
  }, [subjects, visibleClassIds, isAdmin, isTeacher, canManageSubject]);

  const visibleEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!visibleClassIds.includes(String(e.classId))) return false;
      if (isStudent) return e.studentId === userId;
      if (isAdmin) return true;
      if (isTeacher) return canManageSubject(String(e.classId), e.subjectId);
      return false;
    });
  }, [entries, visibleClassIds, isStudent, isAdmin, isTeacher, canManageSubject, userId]);

  const gradeGroups = useMemo(
    () => groupGradesByClassAndSubject(availableClassOptions, filteredSubjects, visibleEntries),
    [availableClassOptions, filteredSubjects, visibleEntries],
  );

  const allowedSubjectOptionsForSelectedClass = useMemo(() => {
    if (!createClassId) return courseOptions;
    if (!isTeacher) return courseOptions;
    const allowed = getAllowedSubjectIdsForClass(createClassId);
    return courseOptions.filter((c) => allowed.includes(c.id));
  }, [createClassId, courseOptions, getAllowedSubjectIdsForClass, isTeacher]);

  const getStudentsForClass = (classId: string) =>
    classes.find((cls) => String(cls.id) === classId)?.students ?? [];

  const canAddSubjectToClass = (classId: string) => {
    if (isAdmin) return true;
    if (!isTeacher) return false;
    return getAllowedSubjectIdsForClass(classId).length > 0;
  };

  const handleCreateSubject = async () => {
    if (!createClassId || !newSubjectId) return;
    const subjectName = findCourseName(newSubjectId, courseOptions);
    try {
      await createSubject.mutateAsync({
        classId: parseInt(createClassId, 10),
        subjectId: newSubjectId,
        subjectName,
      });
      setShowCreate(false);
      setCreateClassId(null);
      setNewSubjectId(null);
      setExpandedGrade(createClassId);
      setExpandedSubject(`${createClassId}:${newSubjectId}`);
      toast({ title: "Subject created", description: `${subjectName} added to class.` });
    } catch (err: any) {
      toast({
        title: "Could not create subject",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddScore = async (data: {
    studentId: number;
    title: string;
    score: number;
    maxScore: number;
    notes: string;
  }) => {
    if (!addScoreContext) return;
    try {
      await createEntry.mutateAsync({
        classId: addScoreContext.classId,
        subjectId: addScoreContext.subjectId,
        subjectName: addScoreContext.subjectName,
        studentId: data.studentId,
        title: data.title,
        score: data.score,
        maxScore: data.maxScore,
        notes: data.notes || undefined,
      });
      setAddScoreContext(null);
      toast({ title: "Score added", description: `${data.title} recorded successfully.` });
    } catch (err: any) {
      toast({
        title: "Could not add score",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateScore = async (data: {
    studentId: number;
    title: string;
    score: number;
    maxScore: number;
    notes: string;
  }) => {
    if (!editEntry) return;
    try {
      await updateEntry.mutateAsync({
        id: editEntry.id,
        data: {
          title: data.title,
          score: data.score,
          maxScore: data.maxScore,
          notes: data.notes || null,
        },
      });
      setEditEntry(null);
      toast({ title: "Score updated" });
    } catch (err: any) {
      toast({
        title: "Could not update score",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loading = subjectsQuery.isLoading || gradesQuery.isLoading;

  return (
    <DashboardLayout
      title="Grades"
      subtitle={
        isStudent
          ? "Your test scores and assessments"
          : isTeacher
          ? "Record and manage student test scores"
          : "Grades - admin view"
      }
      action={
        !isStudent ? (
          <GoldButton onClick={() => {
            setShowCreate(true);
            setCreateClassId(null);
            setNewSubjectId(courseOptions[0]?.id ?? null);
          }}>
            <Plus size={14} /> Pick Class
          </GoldButton>
        ) : undefined
      }
    >
      {showCreate && !createClassId ? (
        <div style={{ marginBottom: 24 }}>
          <Card title="Pick a class">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {availableClassOptions.length > 0 ? (
                availableClassOptions.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setCreateClassId(cls.id);
                      const options = getAllowedSubjectIdsForClass(cls.id);
                      setNewSubjectId(options[0] ?? courseOptions[0]?.id ?? null);
                    }}
                    style={{
                      padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${B.line}`,
                      background: B.white, cursor: "pointer", textAlign: "left",
                      fontSize: 14, fontWeight: 700, color: B.navy, fontFamily: "inherit",
                    }}
                  >
                    {cls.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: "20px 16px", textAlign: "center", color: B.muted, fontSize: 13 }}>
                  {isAdmin ? "No classes created yet. Go to the Classes tab to create one." : "No classes assigned to you."}
                </div>
              )}
              <button
                onClick={() => { setShowCreate(false); setCreateClassId(null); }}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: `1px solid ${B.line}`,
                  background: B.offW, color: B.muted, fontWeight: 600, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit", marginTop: 8,
                }}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      ) : showCreate && createClassId ? (
        <div style={{ marginBottom: 24 }}>
          <Card title="Create Subject">
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Class
                </label>
                <input
                  value={availableClassOptions.find((c) => c.id === createClassId)?.name ?? ""}
                  disabled
                  style={{ ...inputStyle, marginTop: 6, width: "100%", background: B.offW }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Subject
                </label>
                <select
                  value={newSubjectId ?? ""}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  style={{ ...inputStyle, marginTop: 6, width: "100%" }}
                >
                  {allowedSubjectOptionsForSelectedClass.length > 0 ? (
                    allowedSubjectOptionsForSelectedClass.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="">No subjects available</option>
                  )}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowCreate(false); setCreateClassId(null); }}
                  style={{
                    padding: "10px 18px", borderRadius: 11, border: `1.5px solid ${B.line}`,
                    background: B.white, color: B.navy, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubject}
                  disabled={createSubject.isPending || !newSubjectId}
                  style={{
                    padding: "10px 18px", borderRadius: 11, border: "none",
                    background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                    color: B.white, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {createSubject.isPending ? "Creating…" : "Create Subject"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {addScoreContext && (
        <div style={{ marginBottom: 24 }}>
          <Card title={`Add Score · ${addScoreContext.subjectName}`}>
            <GradeEntryForm
              students={getStudentsForClass(String(addScoreContext.classId))}
              onSave={handleAddScore}
              onCancel={() => setAddScoreContext(null)}
              saving={createEntry.isPending}
            />
          </Card>
        </div>
      )}

      {editEntry && (
        <div style={{ marginBottom: 24 }}>
          <Card title="Edit Score">
            <GradeEntryForm
              students={getStudentsForClass(String(editEntry.classId))}
              initial={editEntry}
              onSave={handleUpdateScore}
              onCancel={() => setEditEntry(null)}
              saving={updateEntry.isPending}
            />
          </Card>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveView("grades")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${activeView === "grades" ? B.gold : B.line}`,
            background: activeView === "grades" ? `${B.gold}12` : B.white,
            color: activeView === "grades" ? B.navy : B.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Grades
        </button>
        <button
          type="button"
          onClick={() => setActiveView("report")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${activeView === "report" ? B.gold : B.line}`,
            background: activeView === "report" ? `${B.gold}12` : B.white,
            color: activeView === "report" ? B.navy : B.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Printable report
        </button>
      </div>

      {loading ? (
        <div style={{ color: B.muted, padding: "40px 0", textAlign: "center" }}>Loading grades…</div>
      ) : activeView === "report" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 18px", borderRadius: 16, border: `1px solid ${B.line}`, background: B.white }}>
            <div>
              <div style={{ fontWeight: 800, color: B.navy, fontSize: 15 }}>Printable grade report</div>
              <div style={{ fontSize: 12, color: B.muted, marginTop: 2 }}>Use your browser's print dialog to save this view as PDF.</div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                color: B.white,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Print / Save PDF
            </button>
          </div>
          {gradeGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: B.white, borderRadius: 20, border: `1px solid ${B.line}` }}>
              <GraduationCap size={36} style={{ color: B.muted, opacity: 0.4, marginBottom: 12 }} />
              <div style={{ fontWeight: 700, color: B.navy, fontSize: 15 }}>No grades yet</div>
            </div>
          ) : (
            <div style={{ background: B.white, borderRadius: 16, border: `1px solid ${B.line}`, padding: "32px", maxWidth: 800, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 32, paddingBottom: 20, borderBottom: `2px solid ${B.gold}` }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 28, color: B.navy, marginBottom: 8 }}>Al Shamail School</div>
                <div style={{ fontSize: 14, color: B.muted, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Student Grade Report</div>
                <div style={{ fontSize: 12, color: B.muted, marginTop: 8 }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
              </div>
              
              {gradeGroups.map((grade) => (
                <div key={`${grade.gradeKey}-report`} style={{ marginBottom: 24 }}>
                  <div style={{ 
                    background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`, 
                    color: B.white, 
                    padding: "12px 16px", 
                    borderRadius: 8, 
                    marginBottom: 16,
                    fontWeight: 800, 
                    fontSize: 16 
                  }}>
                    {grade.gradeName}
                  </div>
                  
                  {grade.subjects.map((subject) => (
                    <div key={`${grade.gradeKey}-${subject.subjectKey}`} style={{ marginBottom: 16 }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: B.navy, 
                        fontSize: 14, 
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: `1px solid ${B.light}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>{subject.subjectName}</span>
                        <span style={{ 
                          fontSize: 12, 
                          background: `${B.gold}20`, 
                          color: B.navy, 
                          padding: "4px 10px", 
                          borderRadius: 12, 
                          fontWeight: 700 
                        }}>
                          {subject.items.length} {subject.items.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                      
                      {subject.items.length === 0 ? (
                        <div style={{ color: B.muted, fontSize: 12, fontStyle: "italic", padding: "12px 0" }}>No scores recorded</div>
                      ) : (
                        <div style={{ background: B.offW, borderRadius: 8, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: `${B.navy}08`, borderBottom: `2px solid ${B.light}` }}>
                                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: B.navy, fontSize: 12 }}>Assessment</th>
                                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: B.navy, fontSize: 12 }}>Student</th>
                                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: B.navy, fontSize: 12 }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subject.items.map((entry, idx) => (
                                <tr key={entry.id} style={{ borderBottom: idx < subject.items.length - 1 ? `1px solid ${B.light}` : "none" }}>
                                  <td style={{ padding: "10px 14px", color: B.text }}>{entry.title}</td>
                                  <td style={{ padding: "10px 14px", color: B.text }}>
                                    {entry.student?.firstName ?? "Student"} {entry.student?.lastName ?? ""}
                                  </td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: scoreColor(entry.score, entry.maxScore) }}>
                                    {entry.score}/{entry.maxScore}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: `2px solid ${B.light}`, textAlign: "center", fontSize: 11, color: B.muted }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Official Grade Report</div>
                <div>Generated by Al Shamail School Management System</div>
              </div>
            </div>
          )}
        </div>
      ) : gradeGroups.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: B.white, borderRadius: 20, border: `1px solid ${B.line}`,
        }}>
          <GraduationCap size={36} style={{ color: B.muted, opacity: 0.4, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: B.navy, fontSize: 15 }}>No grades yet</div>
          <div style={{ color: B.muted, fontSize: 13, marginTop: 4 }}>
            {isStudent
              ? "Your scores will appear here once your teacher records them."
              : isAdmin
              ? "Pick a class and create a subject to get started."
              : "Pick a class and create a subject to record scores."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gradeGroups.map((grade) => {
            const gradeOpen = expandedGrade === grade.gradeKey;
            const totalScores = grade.subjects.reduce((sum, s) => sum + s.items.length, 0);

            return (
              <div key={grade.gradeKey} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${B.line}`, background: B.white }}>
                <div
                  onClick={() => setExpandedGrade(gradeOpen ? null : grade.gradeKey)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 14, padding: "16px 18px", cursor: "pointer", userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: `${B.navy}12`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: B.navy, fontWeight: 800, fontSize: 14,
                    }}>
                      {grade.gradeName.match(/\d+/)?.[0] ?? "•"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: B.navy, fontSize: 14 }}>{grade.gradeName}</div>
                      <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                        {totalScores} score{totalScores !== 1 ? "s" : ""} recorded
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {!isStudent && canAddSubjectToClass(grade.gradeKey) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreate(true);
                          setCreateClassId(grade.gradeKey);
                          const options = getAllowedSubjectIdsForClass(grade.gradeKey);
                          setNewSubjectId(options[0] ?? courseOptions[0]?.id ?? null);
                        }}
                        style={{
                          padding: "6px 11px", borderRadius: 8, border: `1px solid ${B.gold}40`,
                          background: `${B.gold}08`, color: B.gold,
                          fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <Plus size={12} /> Add Subject
                      </button>
                    )}
                    {gradeOpen ? <ChevronUp size={18} color={B.muted} /> : <ChevronDown size={18} color={B.muted} />}
                  </div>
                </div>

                {gradeOpen && (
                  <div style={{ borderTop: `1px solid ${B.line}`, padding: "14px 16px", background: B.offW2, display: "flex", flexDirection: "column", gap: 12 }}>
                    {grade.subjects.length === 0 ? (
                      <div style={{ padding: 18, borderRadius: 12, background: B.white, border: `1px solid ${B.line}`, color: B.muted, textAlign: "center" }}>
                        No subjects yet. Click Add Subject to create one.
                      </div>
                    ) : grade.subjects.map((subject) => {
                      const subjectKey = `${grade.gradeKey}:${subject.subjectKey}`;
                      const subjectOpen = expandedSubject === subjectKey;
                      const avgPct = subject.items.length
                        ? Math.round(
                            subject.items.reduce((sum, e) => sum + (e.maxScore > 0 ? (e.score / e.maxScore) * 100 : 0), 0) /
                              subject.items.length,
                          )
                        : null;

                      return (
                        <div key={subjectKey} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${B.line}`, background: B.white }}>
                          <div
                            onClick={() => setExpandedSubject(subjectOpen ? null : subjectKey)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "14px 16px", cursor: "pointer", userSelect: "none",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, color: B.navy, fontSize: 13 }}>{subject.subjectName}</div>
                              <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                                {subject.items.length} test{subject.items.length !== 1 ? "s" : ""}
                                {isStudent && avgPct != null ? ` · ${avgPct}% average` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {!isStudent && canManageSubject(grade.gradeKey, subject.subjectKey) && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddScoreContext({
                                        classId: parseInt(grade.gradeKey, 10),
                                        subjectId: subject.subjectKey,
                                        subjectName: subject.subjectName,
                                      });
                                      setEditEntry(null);
                                    }}
                                    style={{
                                      padding: "5px 10px", borderRadius: 8, border: `1px solid ${B.navy}30`,
                                      background: `${B.navy}08`, color: B.navy,
                                      fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                                      display: "flex", alignItems: "center", gap: 4,
                                    }}
                                  >
                                    <Plus size={11} /> Add Score
                                  </button>
                                  {subject.subjectRecordId > 0 && !isStudent && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm("Remove this subject and all its scores?")) return;
                                        try {
                                          await deleteSubject.mutateAsync({ id: subject.subjectRecordId });
                                          toast({ title: "Subject removed" });
                                        } catch (err: any) {
                                          toast({ title: "Could not remove subject", description: err?.message, variant: "destructive" });
                                        }
                                      }}
                                      style={{
                                        padding: "5px 8px", borderRadius: 8, border: `1px solid ${B.error}30`,
                                        background: `${B.error}08`, color: B.error, cursor: "pointer",
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </>
                              )}
                              {subjectOpen ? <ChevronUp size={16} color={B.muted} /> : <ChevronDown size={16} color={B.muted} />}
                            </div>
                          </div>

                          {subjectOpen && (
                            <div style={{ borderTop: `1px solid ${B.line}`, padding: "12px 14px", display: "grid", gap: 8 }}>
                              {subject.items.length === 0 ? (
                                <div style={{ fontSize: 13, color: B.muted, textAlign: "center", padding: "12px 0" }}>
                                  {isStudent ? "No scores recorded yet." : "No scores yet. Click Add Score to record a test."}
                                </div>
                              ) : (
                                subject.items.map((entry) => {
                                  const pct = entry.maxScore > 0 ? Math.round((entry.score / entry.maxScore) * 100) : 0;
                                  const color = scoreColor(entry.score, entry.maxScore);

                                  return (
                                    <div
                                      key={entry.id}
                                      style={{
                                        display: "flex", alignItems: "center", gap: 12,
                                        padding: "12px 14px", borderRadius: 10,
                                        background: B.offW, border: `1px solid ${B.line}`,
                                      }}
                                    >
                                      <div style={{
                                        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                                        background: `${color}15`, border: `2px solid ${color}40`,
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      }}>
                                        <div style={{ fontWeight: 900, fontSize: 15, color, lineHeight: 1 }}>
                                          {entry.score}
                                        </div>
                                        <div style={{ fontSize: 9, color: B.muted, fontWeight: 700 }}>
                                          /{entry.maxScore}
                                        </div>
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: B.navy }}>{entry.title}</div>
                                        {!isStudent && entry.student && (
                                          <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                                            {entry.student.firstName} {entry.student.lastName}
                                          </div>
                                        )}
                                        {entry.notes && (
                                          <div style={{ fontSize: 11, color: B.muted, marginTop: 4 }}>{entry.notes}</div>
                                        )}
                                      </div>
                                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color }}>{pct}%</div>
                                        {!isStudent && (
                                          <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                                            <button
                                              onClick={() => { setEditEntry(entry); setAddScoreContext(null); }}
                                              style={{
                                                padding: 4, borderRadius: 6, border: `1px solid ${B.line}`,
                                                background: B.white, cursor: "pointer", color: B.navy,
                                              }}
                                            >
                                              <Pencil size={12} />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (!confirm("Delete this score?")) return;
                                                try {
                                                  await deleteEntry.mutateAsync({ id: entry.id });
                                                  toast({ title: "Score deleted" });
                                                } catch (err: any) {
                                                  toast({ title: "Could not delete", description: err?.message, variant: "destructive" });
                                                }
                                              }}
                                              style={{
                                                padding: 4, borderRadius: 6, border: `1px solid ${B.error}30`,
                                                background: B.white, cursor: "pointer", color: B.error,
                                              }}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
