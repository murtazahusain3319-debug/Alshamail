import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useGetCurrentUser, useListCourses } from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { toast } from "@/hooks/use-toast";
import { DashboardLayout, Card, PrimaryButton, GoldButton, Pill } from "@/components/DashboardLayout";
import {
  ClipboardList, Plus, Upload, X, CheckCircle, Clock,
  AlertTriangle, Eye, Send, ChevronDown, ChevronUp,
  Pencil, Trash2, Image as ImageIcon, MessageSquare,
} from "lucide-react";

import { API_BASE } from "@/lib/api-base";

type AssignmentType = "homework" | "test" | "project";
type SubmissionStatus = "pending" | "submitted" | "graded" | "returned";

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  imageDataUrl: string;
  submittedAt: string;
  status: SubmissionStatus;
  grade?: string;
  feedback?: string;
  gradedAt?: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: AssignmentType;
  dueDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  courseId: string;
  courseName: string;
  classId?: string;
  className?: string;
  grade?: string;
  assignedTo: string[];
  submissions: Submission[];
}

interface SchoolClass {
  id: number;
  name: string;
  subject?: string | null;
  teacherId?: number | null;
  teacherAssignments?: Array<{ teacher: { id: number; firstName: string; lastName: string; email: string; avatarUrl?: string }; subjects: string[] }>;
  students?: Array<{ id: number; firstName: string; lastName: string; email: string; avatarUrl?: string }>;
}

interface SubjectCategory {
  classId: string;
  subjectId: string;
  subjectName: string;
}

const STORAGE_KEY = "al_shamail_assignments_v1";
const SUBJECT_STORAGE_KEY = "al_shamail_subjects_v1";

const COURSE_OPTIONS = [
  { id: "english", name: "English" },
  { id: "math", name: "Math" },
  { id: "science", name: "Science" },
  { id: "history", name: "History" },
];

function getCourseName(courseId: string) {
  return COURSE_OPTIONS.find((course) => course.id === courseId)?.name ?? "General";
}

function findCourseName(courseId: string, options: { id: string; name: string }[]) {
  return options.find((course) => course.id === courseId)?.name ?? getCourseName(courseId);
}

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return (JSON.parse(raw) as Assignment[]).map((assignment) => ({
        ...assignment,
        courseId: assignment.courseId ?? "english",
        courseName: assignment.courseName ?? getCourseName(assignment.courseId ?? "english"),
        classId: assignment.classId ?? undefined,
        className: assignment.className ?? undefined,
      }));
    }
  } catch {}
  return [
    {
      id: "asgn-1",
      title: "Chapter 5 ΓÇô Algebra Review",
      description: "Complete exercises 1ΓÇô20 on page 112. Show all working.",
      type: "homework",
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      createdBy: "teacher-demo",
      createdByName: "Mr. Al-Rashid",
      createdAt: new Date().toISOString(),
      courseId: "math",
      courseName: "Math",
      assignedTo: [],
      submissions: [],
    },
    {
      id: "asgn-2",
      title: "Mid-term Science Test",
      description: "Covers chapters 3ΓÇô7. Estimated 45 minutes. Submit your answer sheet as a clear photo.",
      type: "test",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdBy: "teacher-demo",
      createdByName: "Ms. Khalil",
      createdAt: new Date().toISOString(),
      courseId: "science",
      courseName: "Science",
      assignedTo: [],
      submissions: [],
    },
  ];
}

function saveAssignments(list: Assignment[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function loadSubjectCategories(): SubjectCategory[] {
  try {
    const raw = localStorage.getItem(SUBJECT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as SubjectCategory[];
    }
  } catch {}
  return [];
}

function saveSubjectCategories(categories: SubjectCategory[]) {
  try { localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(categories)); } catch {}
}

const NOTIFICATIONS_KEY = "al_shamail_assignment_notifications_v1";

function loadSubmissionNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

function saveSubmissionNotifications(list: string[]) {
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list)); } catch {}
}

function pushSubmissionNotification(notification: string) {
  const current = loadSubmissionNotifications();
  const next = [notification, ...current].slice(0, 10);
  saveSubmissionNotifications(next);
  return next;
}

function clearSubmissionNotifications() {
  saveSubmissionNotifications([]);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function duePill(iso: string, status?: SubmissionStatus) {
  if (status === "returned" || status === "graded")
    return { label: "Graded", color: B.success };
  if (status === "submitted")
    return { label: "Submitted", color: B.navy };
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: "Overdue", color: B.error };
  if (days === 0) return { label: "Due today", color: B.warning };
  if (days <= 3) return { label: `Due in ${days}d`, color: B.warning };
  return { label: `Due ${new Date(iso).toLocaleDateString()}`, color: B.muted };
}

function typeBadge(t: AssignmentType) {
  const map: Record<AssignmentType, { label: string; color: string }> = {
    homework: { label: "Homework", color: B.navy },
    test:     { label: "Test",     color: "#7c3aed" },
    project:  { label: "Classwork", color: "#0369a1" },
  };
  return map[t];
}

function assignmentTypeLabel(t: AssignmentType) {
  return t === "project" ? "Classwork" : t === "homework" ? "Homework" : "Test";
}

function groupAssignmentsByClass(assignments: Assignment[], classes: SchoolClass[]) {
  const groups = new Map<string, { classId: string; className: string; items: Assignment[] }>();

  classes.forEach((cls) => {
    groups.set(String(cls.id), { classId: String(cls.id), className: cls.name, items: [] });
  });

  assignments.forEach((assignment) => {
    const classId = assignment.classId ?? "unassigned";
    const group = groups.get(classId) ?? { classId, className: assignment.className ?? "Unassigned class", items: [] };
    group.items.push(assignment);
    groups.set(classId, group);
  });

  return Array.from(groups.values()).sort((a, b) => a.className.localeCompare(b.className));
}

function groupAssignmentsByGradeAndSubject(
  assignments: Assignment[],
  classes: { id: string; name: string }[],
  categories: SubjectCategory[],
) {
  const gradeMap = new Map<string, { gradeName: string; subjects: Map<string, { subjectName: string; items: Assignment[] }> }>();

  classes.forEach((cls) => {
    gradeMap.set(cls.id, { gradeName: cls.name, subjects: new Map() });
  });

  categories.forEach((category) => {
    if (!gradeMap.has(category.classId)) {
      gradeMap.set(category.classId, { gradeName: "Unknown class", subjects: new Map() });
    }
    const grade = gradeMap.get(category.classId)!;
    if (!grade.subjects.has(category.subjectId)) {
      grade.subjects.set(category.subjectId, { subjectName: category.subjectName, items: [] });
    }
  });

  assignments.forEach((assignment) => {
    const gradeKey = assignment.classId ?? "unassigned";
    const gradeName = assignment.className ?? "Unassigned";
    const subjectKey = assignment.courseId ?? "general";
    const subjectName = assignment.courseName ?? "General";

    if (!gradeMap.has(gradeKey)) {
      gradeMap.set(gradeKey, { gradeName, subjects: new Map() });
    }

    const grade = gradeMap.get(gradeKey)!;
    if (!grade.subjects.has(subjectKey)) {
      grade.subjects.set(subjectKey, { subjectName, items: [] });
    }

    grade.subjects.get(subjectKey)!.items.push(assignment);
  });

  return Array.from(gradeMap.entries()).map(([gradeKey, gradeData]) => ({
    gradeKey,
    gradeName: gradeData.gradeName,
    subjects: Array.from(gradeData.subjects.entries()).map(([subjectKey, subjectData]) => ({
      subjectKey,
      subjectName: subjectData.subjectName,
      items: subjectData.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    })).sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
  })).sort((a, b) => a.gradeName.localeCompare(b.gradeName));
}

async function fetchClasses(): Promise<SchoolClass[]> {
  const res = await fetch(`${API_BASE}/classes`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch classes");
  const data = await res.json();
  return data.items ?? [];
}

function ImageUploader({
  onImage,
  existing,
}: {
  onImage: (dataUrl: string) => void;
  existing?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(existing);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      onImage(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        style={{
          border: `2px dashed ${dragging ? B.gold : B.line}`,
          borderRadius: 14,
          padding: preview ? 0 : "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? `${B.gold}10` : B.offW,
          transition: "all .15s",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="submission"
            style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }}
          />
        ) : (
          <>
            <Upload size={28} style={{ color: B.muted, marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>
              Drop your image here or click to browse
            </div>
            <div style={{ fontSize: 12, color: B.muted, marginTop: 4 }}>
              JPG, PNG, WEBP ΓÇö max 5 MB
            </div>
          </>
        )}
        {preview && (
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(undefined); onImage(""); }}
            style={{
              position: "absolute", top: 8, right: 8,
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

function AssignmentForm({
  initial,
  courseOptions,
  classOptions,
  getSubjectOptionsForClass,
  fixedCourseId,
  fixedClassId,
  onSave,
  onCancel,
}: {
  initial?: Partial<Assignment>;
  courseOptions: { id: string; name: string }[];
  classOptions: { id: string; name: string }[];
  getSubjectOptionsForClass?: (classId: string) => { id: string; name: string }[];
  fixedCourseId?: string | null;
  fixedClassId?: string | null;
  onSave: (data: Omit<Assignment, "id" | "createdAt" | "createdBy" | "createdByName" | "submissions">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [type, setType] = useState<AssignmentType>(initial?.type ?? "homework");
  const [courseId, setCourseId] = useState(
    initial?.courseId ?? fixedCourseId ?? courseOptions[0]?.id ?? COURSE_OPTIONS[0].id,
  );
  const [classId, setClassId] = useState(
    initial?.classId ?? fixedClassId ?? classOptions[0]?.id ?? "",
  );
  useEffect(() => {
    if (!initial) {
      if (fixedCourseId) {
        setCourseId(fixedCourseId);
      } else if (courseOptions.length > 0) {
        setCourseId(courseOptions[0].id);
      }
      if (fixedClassId) {
        setClassId(fixedClassId);
      } else if (classOptions.length > 0) {
        setClassId(classOptions[0].id);
      }
    }
  }, [courseOptions, classOptions, initial, fixedCourseId, fixedClassId]);

  useEffect(() => {
    if (fixedCourseId || !getSubjectOptionsForClass) return;
    const available = getSubjectOptionsForClass(classId);
    if (available.length > 0 && !available.some((course) => course.id === courseId)) {
      setCourseId(available[0].id);
    }
  }, [classId, fixedCourseId, getSubjectOptionsForClass, courseId]);

  const [due, setDue] = useState(
    initial?.dueDate
      ? initial?.dueDate.slice(0, 10)
      : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );

  const inp: React.CSSProperties = {
    width: "100%", background: B.offW, border: `1.5px solid ${B.line}`,
    borderRadius: 10, padding: "10px 12px", fontSize: 13,
    fontFamily: "inherit", color: B.text, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Title *
        </label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 5 Homework" style={{ ...inp, marginTop: 6 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value as AssignmentType)}
            style={{ ...inp, marginTop: 6, cursor: "pointer" }}>
            <option value="homework">Homework</option>
            <option value="test">Test</option>
            <option value="project">Classwork</option>
          </select>
        </div>
        {!fixedCourseId && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Subject
            </label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              style={{ ...inp, marginTop: 6, cursor: "pointer" }}>
              {(getSubjectOptionsForClass ? getSubjectOptionsForClass(classId) : courseOptions).length > 0 ? (
                (getSubjectOptionsForClass ? getSubjectOptionsForClass(classId) : courseOptions).map((course) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))
              ) : (
                <option value="">No courses available</option>
              )}
            </select>
          </div>
        )}
      </div>

      {!fixedClassId && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Class
          </label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}
            style={{ ...inp, marginTop: 6, cursor: classOptions.length > 0 ? "pointer" : "not-allowed" }}>
            {classOptions.length > 0 ? (
              classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))
            ) : (
              <option value="">No classes available</option>
            )}
          </select>
        </div>
      )}
      {fixedClassId && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Class
          </label>
          <div style={{ ...inp, marginTop: 6, color: B.text, background: B.offW }}>
            {classOptions.find((cls) => cls.id === fixedClassId)?.name ?? "Selected class"}
          </div>
        </div>
      )}
      {fixedCourseId && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
            Subject
          </label>
          <div style={{ ...inp, marginTop: 6, color: B.text, background: B.offW }}>
            {courseOptions.find((course) => course.id === fixedCourseId)?.name ?? "Selected subject"}
          </div>
        </div>
      )}

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Instructions
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          placeholder="Describe what students need to doΓÇª"
          style={{ ...inp, marginTop: 6, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onCancel} style={{
          padding: "10px 16px", border: `1px solid ${B.line}`, borderRadius: 10,
          background: B.offW, color: B.muted, fontWeight: 600, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
        <GoldButton
          onClick={() => {
            if (!title.trim() || !classId) return;
            onSave({
            title: title.trim(),
            description: desc.trim(),
            type,
            dueDate: new Date(due).toISOString(),
            courseId,
            courseName: findCourseName(courseId, courseOptions),
            classId,
            className: findCourseName(classId, classOptions),
            assignedTo: [],
          });
          }}
        >
          <CheckCircle size={14} /> Save Assignment
        </GoldButton>
      </div>
    </div>
  );
}

function SubmissionViewer({
  submission,
  onSave,
  onReturn,
  onDelete,
  onClose,
  editable,
}: {
  submission: Submission;
  onSave: (id: string, grade: string, feedback: string, imageDataUrl: string) => void;
  onReturn: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  editable?: boolean;
}) {
  const [grade, setGrade] = useState(submission.grade ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [imagePreview, setImagePreview] = useState(submission.imageDataUrl);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const isReturned = submission.status === "returned" || submission.status === "graded";

  const inp: React.CSSProperties = {
    width: "100%", background: B.offW, border: `1.5px solid ${B.line}`,
    borderRadius: 10, padding: "10px 12px", fontSize: 13,
    fontFamily: "inherit", color: B.text, outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,.5)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: B.white, borderRadius: 20, maxWidth: 680,
        width: "100%", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(0,0,0,.3)",
      }}>
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${B.line}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: B.white, zIndex: 1,
        }}>
          <div>
            <div style={{ fontWeight: 800, color: B.navy, fontSize: 16 }}>
              {submission.studentName}'s Submission
            </div>
            <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
              Submitted {new Date(submission.submittedAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: `1px solid ${B.line}`,
            background: B.offW, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: B.muted,
          }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{
            border: `1px solid ${B.line}`, borderRadius: 14, overflow: "hidden",
            background: B.offW,
          }}>
            <img
              src={imagePreview}
              alt="student submission"
              style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 380 }}
            />
          </div>

          {editable && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsEditingImage((current) => !current)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 16px", borderRadius: 12, border: `1px solid ${B.line}`,
                  background: B.offW, color: B.muted, fontWeight: 700, cursor: "pointer",
                }}
              >
                {isEditingImage ? "Cancel image edit" : "Edit image"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(submission.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 16px", borderRadius: 12, border: `1px solid #fecaca`,
                  background: "#fef2f2", color: B.error, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Trash2 size={16} /> Delete submission
              </button>
            </div>
          )}

          {isEditingImage && (
            <div>
              <ImageUploader existing={imagePreview} onImage={setImagePreview} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Grade
                </label>
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 85/100"
                  disabled={isReturned}
                  style={{ ...inp, marginTop: 6, opacity: isReturned ? .7 : 1 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Write feedback for the studentΓÇª"
                  disabled={isReturned}
                  style={{ ...inp, marginTop: 6, resize: "vertical", opacity: isReturned ? .7 : 1 }}
                />
              </div>
            </div>

            {!isReturned && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <GoldButton onClick={() => onSave(submission.id, grade, feedback, imagePreview)}>
                  <Send size={13} /> Save and return
                </GoldButton>
                <button
                  type="button"
                  onClick={() => onReturn(submission.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "11px 16px", borderRadius: 12, border: `1px solid ${B.line}`,
                    background: B.offW, color: B.muted, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  <AlertTriangle size={13} /> Return without editing
                </button>
              </div>
            )}

            {isReturned && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10,
                background: `${B.success}12`, border: `1px solid ${B.success}44`,
                color: B.success, fontWeight: 700, fontSize: 13,
              }}>
                <CheckCircle size={15} />
                Returned on {new Date(submission.gradedAt!).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentFeedbackModal({
  submission,
  assignmentTitle,
  onClose,
}: {
  submission: Submission;
  assignmentTitle: string;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,.5)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: B.white, borderRadius: 20, maxWidth: 560,
        width: "100%", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(0,0,0,.3)",
      }}>
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${B.line}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: B.white, zIndex: 1,
        }}>
          <div style={{ fontWeight: 800, color: B.navy, fontSize: 16 }}>{assignmentTitle}</div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: `1px solid ${B.line}`,
            background: B.offW, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: B.muted,
          }}><X size={15} /></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            border: `1px solid ${B.line}`, borderRadius: 14, overflow: "hidden",
          }}>
            <img src={submission.imageDataUrl} alt="your submission"
              style={{ width: "100%", objectFit: "contain", maxHeight: 280, display: "block" }} />
          </div>
          {submission.grade && (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: `${B.gold}14`, border: `1px solid ${B.gold}44`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: B.goldD, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>
                Grade
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: B.navy }}>{submission.grade}</div>
            </div>
          )}
          {submission.feedback && (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: B.offW, border: `1px solid ${B.line}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: B.muted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
                Teacher's Feedback
              </div>
              <div style={{ fontSize: 14, color: B.text, lineHeight: 1.6 }}>{submission.feedback}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const isAdmin = !!user?.isAdmin;
  const isTeacher = !isAdmin && user?.role === "teacher";
  const isStudent = !isAdmin && !isTeacher;

  const [assignments, setAssignments] = useState<Assignment[]>(loadAssignments);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  useEffect(() => { saveAssignments(assignments); }, [assignments]);

  const [showCreate, setShowCreate] = useState(false);
  const [createClassId, setCreateClassId] = useState<string | null>(null);
  const [createSubjectId, setCreateSubjectId] = useState<string | null>(null);
  const [newSubjectId, setNewSubjectId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadImageFor, setUploadImageFor] = useState<string | null>(null);
  const [uploadImage, setUploadImage] = useState<string>("");
  const [viewSubmission, setViewSubmission] = useState<{ sub: Submission; asgn: Assignment } | null>(null);
  const [viewFeedback, setViewFeedback] = useState<{ sub: Submission; title: string } | null>(null);
  const [filterType, setFilterType] = useState<"all" | AssignmentType>("all");
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>(loadSubjectCategories);
  useEffect(() => { saveSubjectCategories(subjectCategories); }, [subjectCategories]);

  const coursesQuery = useListCourses();
  const courseOptions = useMemo(() => {
    const items = coursesQuery.data?.items ?? COURSE_OPTIONS;
    return items.map((course: any) => ({
      id: String(course.id),
      name: course.subject || course.title || course.name || `Course ${course.id}`,
    }));
  }, [coursesQuery.data?.items]);

  useEffect(() => {
    fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const classOptions = useMemo(() => classes.map((cls) => ({ id: String(cls.id), name: cls.name })), [classes]);

  const userId = (user as any)?.id ?? "current-user";
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Student";

  const teacherAssignedSubjectIdsByClass = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!isTeacher) return map;

    classes.forEach((cls) => {
      const assignments = cls.teacherAssignments?.filter((assignment) => assignment.teacher.id === Number(userId));
      if (!assignments || assignments.length === 0) return;

      const matchedIds = new Set<string>();
      assignments.flatMap((assignment) => assignment.subjects ?? []).forEach((subject) => {
        const normalized = String(subject ?? "").trim().toLowerCase();
        if (!normalized) return;

        const matchById = courseOptions.find((course) => String(course.id).toLowerCase() === normalized);
        if (matchById) matchedIds.add(matchById.id);
        const matchByName = courseOptions.find((course) => String(course.name).trim().toLowerCase() === normalized);
        if (matchByName) matchedIds.add(matchByName.id);
      });

      if (matchedIds.size === 0 && cls.teacherId === Number(userId) && cls.subject) {
        const normalized = String(cls.subject).trim().toLowerCase();
        const matchById = courseOptions.find((course) => String(course.id).toLowerCase() === normalized);
        if (matchById) matchedIds.add(matchById.id);
        const matchByName = courseOptions.find((course) => String(course.name).trim().toLowerCase() === normalized);
        if (matchByName) matchedIds.add(matchByName.id);
      }

      if (matchedIds.size > 0) {
        map.set(String(cls.id), Array.from(matchedIds));
      }
    });

    return map;
  }, [classes, courseOptions, isTeacher, userId]);

  const getAllowedSubjectIdsForClass = useCallback(
    (classId: string) => {
      if (!isTeacher) return courseOptions.map((course) => course.id);
      return teacherAssignedSubjectIdsByClass.get(classId) ?? [];
    },
    [courseOptions, isTeacher, teacherAssignedSubjectIdsByClass],
  );

  const canManageSubject = useCallback(
    (classId: string, subjectId: string) => {
      if (!isTeacher) return true;
      return getAllowedSubjectIdsForClass(classId).includes(subjectId);
    },
    [getAllowedSubjectIdsForClass, isTeacher],
  );

  const getSubjectOptionsForClass = useCallback(
    (classId: string) => {
      const allowedIds = getAllowedSubjectIdsForClass(classId);
      return allowedIds.length > 0
        ? courseOptions.filter((course) => allowedIds.includes(course.id))
        : [];
    },
    [courseOptions, getAllowedSubjectIdsForClass],
  );

  const canAddSubjectToClass = useCallback(
    (classId: string) => {
      if (isAdmin) return true;
      if (!isTeacher) return false;
      return getSubjectOptionsForClass(classId).length > 0;
    },
    [getSubjectOptionsForClass, isAdmin, isTeacher],
  );

  const teacherClassIds = useMemo(() => {
    if (!isTeacher) return [];
    return classes
      .filter((cls) => cls.teacherId === userId || cls.teacherAssignments?.some((assignment) => assignment.teacher.id === Number(userId)))
      .map((cls) => String(cls.id));
  }, [classes, isTeacher, userId]);

  const studentClassIds = useMemo(() => {
    if (!isStudent) return [];
    return classes
      .filter((cls) => cls.students?.some((student) => String(student.id) === String(userId)))
      .map((cls) => String(cls.id));
  }, [classes, isStudent, userId]);

  const visibleClassIds = useMemo(() => {
    if (isAdmin) return classOptions.map((cls) => cls.id);
    if (isTeacher) return teacherClassIds;
    return studentClassIds;
  }, [classOptions, isAdmin, isTeacher, studentClassIds, teacherClassIds]);

  const availableClassOptions = useMemo(() => {
    if (isAdmin) return classOptions;
    if (isTeacher) return classOptions.filter((cls) => teacherClassIds.includes(cls.id));
    return [];
  }, [classOptions, isAdmin, isTeacher, teacherClassIds]);

  const hasClasses = classOptions.length > 0;

  const createAssignmentInitial = useMemo(() => {
    if (!createClassId) return undefined;
    return {
      classId: createClassId,
      className: availableClassOptions.find((cls) => cls.id === createClassId)?.name,
      courseId: createSubjectId ?? courseOptions[0]?.id ?? COURSE_OPTIONS[0].id,
      courseName: createSubjectId ? findCourseName(createSubjectId, courseOptions) : undefined,
    } as Partial<Assignment>;
  }, [availableClassOptions, createClassId, createSubjectId, courseOptions]);

  const allowedSubjectOptionsForSelectedClass = useMemo(() => {
    if (!createClassId) return courseOptions;
    if (!isTeacher) return courseOptions;
    return getSubjectOptionsForClass(createClassId);
  }, [createClassId, courseOptions, getSubjectOptionsForClass]);

  useEffect(() => {
    if (!createClassId) return;
    const options = getSubjectOptionsForClass(createClassId);
    setNewSubjectId(options[0]?.id ?? null);
  }, [createClassId, getSubjectOptionsForClass]);

  const [pendingNotifications, setPendingNotifications] = useState<string[]>(() =>
    (isTeacher || isAdmin) ? loadSubmissionNotifications() : [],
  );

  useEffect(() => {
    if ((isTeacher || isAdmin) && pendingNotifications.length > 0) {
      pendingNotifications.forEach((notification) => {
        toast({ title: "New student submission", description: notification });
      });
      clearSubmissionNotifications();
      setPendingNotifications([]);
    }
  }, [isTeacher, isAdmin, pendingNotifications]);

  const createAssignment = useCallback(
    (data: Omit<Assignment, "id" | "createdAt" | "createdBy" | "createdByName" | "submissions">) => {
      const newA: Assignment = {
        ...data,
        id: uid(),
        createdAt: new Date().toISOString(),
        createdBy: userId,
        createdByName: fullName,
        submissions: [],
      };
      setAssignments((prev) => [newA, ...prev]);
      setShowCreate(false);
      setCreateClassId(null);
      setCreateSubjectId(null);
    },
    [userId, fullName],
  );

  const updateAssignment = useCallback(
    (id: string, data: Omit<Assignment, "id" | "createdAt" | "createdBy" | "createdByName" | "submissions">) => {
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      setEditId(null);
    },
    [],
  );

  const deleteAssignment = useCallback((id: string) => {
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const deleteAssignmentsByCourse = useCallback((courseId: string) => {
    if (!confirm("Delete all assignments for this subject? This cannot be undone.")) return;
    setAssignments((prev) => prev.filter((a) => a.courseId !== courseId));
  }, []);

  const deleteAssignmentsByCourseAndType = useCallback((courseId: string, type: AssignmentType) => {
    if (!confirm(`Delete all ${assignmentTypeLabel(type)} for this subject? This cannot be undone.`)) return;
    setAssignments((prev) => prev.filter((a) => !(a.courseId === courseId && a.type === type)));
  }, []);

  const deleteAssignmentsByClass = useCallback((classId: string) => {
    if (!confirm("Delete all assignments for this class? This cannot be undone.")) return;
    setAssignments((prev) => prev.filter((a) => a.classId !== classId));
  }, []);

  const deleteSubject = useCallback((classId: string, subjectId: string) => {
    if (!confirm("Remove this subject and delete all assignments for it? This cannot be undone.")) return;
    setSubjectCategories((prev) => prev.filter((cat) => !(cat.classId === classId && cat.subjectId === subjectId)));
    setAssignments((prev) => prev.filter((a) => !(a.classId === classId && a.courseId === subjectId)));
    setExpandedSubject((current) => current === `${classId}:${subjectId}` ? null : current);
  }, []);

  const submitWork = useCallback(
    (assignmentId: string) => {
      if (!uploadImage) return;
      const sub: Submission = {
        id: uid(),
        studentId: userId,
        studentName: fullName,
        imageDataUrl: uploadImage,
        submittedAt: new Date().toISOString(),
        status: "submitted",
      };
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== assignmentId) return a;
        const filtered = a.submissions.filter((s) => s.studentId !== userId);
        return { ...a, submissions: [...filtered, sub] };
      }));
      const assignment = assignments.find((a) => a.id === assignmentId);
      const assignmentLabel = assignment ? assignmentTypeLabel(assignment.type) : "assignment";
      const notificationText = `${fullName} submitted ${assignmentLabel} for ${assignment?.title ?? "an assignment"}`;
      pushSubmissionNotification(notificationText);
      setUploadImageFor(null);
      setUploadImage("");
      toast({
        title: "Submission sent",
        description: assignment
          ? `Successfully submitted ${assignmentLabel} ≡ƒæì`
          : "Submission sent ≡ƒæì",
      });
    },
    [userId, fullName, uploadImage, assignments],
  );

  const saveSubmission = useCallback(
    (assignmentId: string, submissionId: string, grade: string, feedback: string, imageDataUrl: string) => {
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          submissions: a.submissions.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  grade,
                  feedback,
                  imageDataUrl,
                  status: "returned",
                  gradedAt: new Date().toISOString(),
                }
              : s,
          ),
        };
      }));
      setViewSubmission(null);
    },
    [],
  );

  const deleteSubmission = useCallback(
    (assignmentId: string, submissionId: string) => {
      if (!confirm("Delete this submission? This cannot be undone.")) return;
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== assignmentId) return a;
        return { ...a, submissions: a.submissions.filter((s) => s.id !== submissionId) };
      }));
      setViewSubmission(null);
    },
    [],
  );

  const returnSubmission = useCallback(
    (assignmentId: string, submissionId: string) => {
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          submissions: a.submissions.map((s) =>
            s.id === submissionId
              ? { ...s, status: "returned", gradedAt: new Date().toISOString() }
              : s,
          ),
        };
      }));
      setViewSubmission(null);
    },
    [],
  );

  const gradeSubmission = useCallback(
    (assignmentId: string, submissionId: string, grade: string, feedback: string) => {
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          submissions: a.submissions.map((s) =>
            s.id === submissionId
              ? { ...s, grade, feedback, status: "returned", gradedAt: new Date().toISOString() }
              : s,
          ),
        };
      }));
      setViewSubmission(null);
    },
    [],
  );

  const visibleAssignments = assignments.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (!a.classId) return false;
    if (isAdmin) return true;
    if (isTeacher) {
      if (!teacherClassIds.includes(a.classId)) return false;
      const allowedSubjects = teacherAssignedSubjectIdsByClass.get(a.classId);
      if (!allowedSubjects || allowedSubjects.length === 0) return false;
      return allowedSubjects.includes(a.courseId);
    }
    if (isStudent) return studentClassIds.includes(a.classId);
    return false;
  });

  const groupedAssignments = groupAssignmentsByClass(visibleAssignments, classes);
  const filteredSubjectCategories = useMemo(() => {
    if (isAdmin) return subjectCategories;
    return subjectCategories.filter((category) => {
      if (!visibleClassIds.includes(category.classId)) return false;
      if (!isTeacher) return true;
      return canManageSubject(category.classId, category.subjectId);
    });
  }, [isAdmin, isTeacher, subjectCategories, visibleAssignments, canManageSubject]);

  const gradeGroups = useMemo(
    () => groupAssignmentsByGradeAndSubject(visibleAssignments, availableClassOptions, filteredSubjectCategories),
    [visibleAssignments, availableClassOptions, filteredSubjectCategories],
  );
  const hasClassGroups = isAdmin ? classes.length > 0 : isTeacher ? teacherClassIds.length > 0 : studentClassIds.length > 0;
  const canCreateAssignment = isAdmin || availableClassOptions.length > 0;

  return (
    <DashboardLayout
      title="Assignments"
      subtitle={
        isStudent
          ? "Your homework, tests, and classwork"
          : isTeacher
          ? "Manage assignments and review submissions"
          : "Assignments ΓÇö admin view"
      }
      action={
        !isStudent ? (
          <GoldButton onClick={() => {
            setShowCreate(true);
            setEditId(null);
            setCreateClassId(null);
            setCreateSubjectId(null);
            setNewSubjectId(courseOptions[0]?.id ?? null);
          }}>
            <Plus size={14} /> Pick Class
          </GoldButton>
        ) : undefined
      }
    >
      {showCreate && !editId && !createClassId && !createSubjectId ? (
        <div style={{ marginBottom: 24 }}>
          <Card title="Pick a class">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {availableClassOptions.length > 0 ? (
                <>
                  {availableClassOptions.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setCreateClassId(cls.id);
                        setCreateSubjectId(null);
                        setNewSubjectId(courseOptions[0]?.id ?? null);
                        toast({ title: "Class selected", description: `Creating subject for ${cls.name}` });
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: `1.5px solid ${B.line}`,
                        background: B.white,
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 14,
                        fontWeight: 700,
                        color: B.navy,
                        transition: "all .15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.background = B.offW;
                        (e.target as HTMLButtonElement).style.borderColor = B.navy;
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = B.white;
                        (e.target as HTMLButtonElement).style.borderColor = B.line;
                      }}
                    >
                      {cls.name}
                    </button>
                  ))}
                </>
              ) : (
                <div style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  color: B.muted,
                  fontSize: 13,
                }}>
                  {isAdmin ? "No classes created yet. Go to the Classes tab to create one." : "No classes assigned to you."}
                </div>
              )}
              <button
                onClick={() => { setShowCreate(false); setEditId(null); setCreateClassId(null); setCreateSubjectId(null); setNewSubjectId(null); }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${B.line}`,
                  background: B.offW,
                  color: B.muted,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginTop: 8,
                }}
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      ) : showCreate && createClassId && !createSubjectId ? (
        <div style={{ marginBottom: 24 }}>
          <Card title="Create Subject">
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Class
                </label>
                <input
                  value={availableClassOptions.find((cls) => cls.id === createClassId)?.name ?? ""}
                  disabled
                  style={{
                    width: "100%",
                    marginTop: 6,
                    background: B.offW,
                    border: `1.5px solid ${B.line}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: B.text,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Subject
                </label>
                <select
                  value={newSubjectId ?? ""}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    background: B.offW,
                    border: `1.5px solid ${B.line}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: B.text,
                    cursor: "pointer",
                  }}
                >
                  {allowedSubjectOptionsForSelectedClass.length > 0 ? (
                    allowedSubjectOptionsForSelectedClass.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))
                  ) : (
                    <option value="">No subjects available</option>
                  )}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowCreate(false); setEditId(null); setCreateClassId(null); setCreateSubjectId(null); setNewSubjectId(null); }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 11,
                    border: `1.5px solid ${B.line}`,
                    background: B.white,
                    color: B.navy,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!createClassId || !newSubjectId) return;
                    const subjectName = findCourseName(newSubjectId, courseOptions);
                    if (subjectCategories.some((cat) => cat.classId === createClassId && cat.subjectId === newSubjectId)) {
                      toast({ title: "Subject already exists", description: `${subjectName} is already added to this class.`, variant: "destructive" });
                      return;
                    }
                    setSubjectCategories((prev) => [
                      ...prev,
                      { classId: createClassId, subjectId: newSubjectId, subjectName },
                    ]);
                    setShowCreate(false);
                    setCreateClassId(null);
                    setNewSubjectId(null);
                    setExpandedGrade(createClassId);
                    setExpandedSubject(`${createClassId}:${newSubjectId}`);
                    toast({ title: "Subject created", description: `${subjectName} added to class.` });
                  }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 11,
                    border: "none",
                    background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                    color: B.white,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  disabled={isTeacher && allowedSubjectOptionsForSelectedClass.length === 0}
                >
                  Create Subject
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : (showCreate || editId) && createClassId ? (
        <div style={{ marginBottom: 24 }}>
          <Card title={editId ? "Edit Assignment" : createSubjectId ? `Create Assignment ┬╖ ${findCourseName(createSubjectId, courseOptions)}` : "Create Assignment"}>
            <AssignmentForm
              initial={editId ? assignments.find((a) => a.id === editId) : createAssignmentInitial}
              courseOptions={courseOptions}
              classOptions={availableClassOptions}
              getSubjectOptionsForClass={getSubjectOptionsForClass}
              fixedCourseId={!editId ? createSubjectId ?? undefined : undefined}
              fixedClassId={!editId ? createClassId ?? undefined : undefined}
              onSave={(data) => editId ? updateAssignment(editId, data) : createAssignment(data)}
              onCancel={() => { setShowCreate(false); setEditId(null); setCreateClassId(null); setCreateSubjectId(null); }}
            />
          </Card>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "homework", "test", "project"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: "7px 16px", borderRadius: 99,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              background: filterType === t
                ? `linear-gradient(135deg, ${B.navy}, ${B.navyL})`
                : B.offW,
              color: filterType === t ? B.white : B.muted,
              border: `1px solid ${filterType === t ? "transparent" : B.line}`,
              transition: "all .15s",
            }}
          >
            {t === "all"
              ? "All"
              : t === "homework"
              ? "Homework"
              : t === "test"
              ? "Test"
              : "Classwork"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: B.muted, alignSelf: "center" }}>
          {visibleAssignments.length} assignment{visibleAssignments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {gradeGroups.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: B.white, borderRadius: 20, border: `1px solid ${B.line}`,
        }}>
          <ClipboardList size={36} style={{ color: B.muted, opacity: .4, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: B.navy, fontSize: 15 }}>No classes yet</div>
          <div style={{ color: B.muted, fontSize: 13, marginTop: 4 }}>
            {isStudent ? "Check back soon." : isAdmin ? "Create a class first." : "No classes assigned to you."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gradeGroups.map((grade) => {
            const gradeOpen = expandedGrade === grade.gradeKey;
            const totalInGrade = grade.subjects.reduce((sum, s) => sum + s.items.length, 0);

            return (
              <div key={grade.gradeKey} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${B.line}`, background: B.white }}>
                <div
                  onClick={() => setExpandedGrade(gradeOpen ? null : grade.gradeKey)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "16px 18px",
                    background: B.white,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${B.navy}12`, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      color: B.navy, flexShrink: 0, fontWeight: 800, fontSize: 14,
                    }}>
                      {grade.gradeName.match(/\d+/) ? grade.gradeName.match(/\d+/)![0] : ""}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: B.navy, fontSize: 14 }}>{grade.gradeName}</div>
                      <div style={{ fontSize: 11, color: B.muted, marginTop: 2 }}>
                        {totalInGrade} {totalInGrade === 1 ? "assignment" : "assignments"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {!isStudent && canAddSubjectToClass(grade.gradeKey) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreate(true);
                          setEditId(null);
                          setCreateClassId(grade.gradeKey);
                          setCreateSubjectId(null);
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
                    <div style={{ color: B.muted }}>
                      {gradeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {gradeOpen && (
                  <div style={{ borderTop: `1px solid ${B.line}`, padding: "14px 16px", background: B.offW2, display: "flex", flexDirection: "column", gap: 12 }}>
                    {grade.subjects.length === 0 ? (
                      <div style={{
                        padding: "18px", borderRadius: 12, background: B.white,
                        border: `1px solid ${B.line}`, color: B.muted, textAlign: "center",
                      }}>
                        No subjects yet. Click Add Subject to create one.
                      </div>
                    ) : grade.subjects.map((subject) => {
                      const subjectOpen = expandedSubject === `${grade.gradeKey}:${subject.subjectKey}`;
                      const subjectKey = `${grade.gradeKey}:${subject.subjectKey}`;

                      return (
                        <div key={subjectKey} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${B.line}`, background: B.white }}>
                          <div
                            onClick={() => setExpandedSubject(subjectOpen ? null : subjectKey)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "14px 16px",
                              background: B.white,
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${B.gold}12`, display: "flex",
                                alignItems: "center", justifyContent: "center",
                                color: B.gold, flexShrink: 0, fontWeight: 700, fontSize: 12,
                              }}>
                                ≡ƒôÜ
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: B.navy, fontSize: 13 }}>{subject.subjectName}</div>
                                <div style={{ fontSize: 10, color: B.muted, marginTop: 1 }}>
                                  {subject.items.length} {subject.items.length === 1 ? "assignment" : "assignments"}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {!isStudent && subjectOpen && canManageSubject(grade.gradeKey, subject.subjectKey) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSubject(grade.gradeKey, subject.subjectKey);
                                  }}
                                  style={{
                                    padding: "6px 11px", borderRadius: 8, border: `1px solid #fecaca`,
                                    background: "#fef2f2", color: B.error,
                                    fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                                    display: "flex", alignItems: "center", gap: 4,
                                  }}
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              )}
                                {!isStudent && subjectOpen && canManageSubject(grade.gradeKey, subject.subjectKey) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowCreate(true); setEditId(null); setCreateClassId(grade.gradeKey); setCreateSubjectId(subject.subjectKey); }}
                                  style={{
                                    padding: "6px 11px", borderRadius: 8, border: `1px solid ${B.gold}40`,
                                    background: `${B.gold}08`, color: B.gold,
                                    fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                                    display: "flex", alignItems: "center", gap: 4,
                                  }}
                                >
                                  <Plus size={12} /> Add
                                </button>
                              )}
                              <div style={{ color: B.muted }}>
                                {subjectOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </div>

                          {subjectOpen && (
                            <div style={{ borderTop: `1px solid ${B.line}`, padding: "12px 14px", background: B.offW2, display: "flex", flexDirection: "column", gap: 10 }}>
                              {subject.items.length === 0 ? (
                                <div style={{
                                  padding: "18px", borderRadius: 10,
                                  background: B.white, border: `1px solid ${B.line}`,
                                  color: B.muted, fontSize: 12, textAlign: "center"
                                }}>
                                  No assignments yet. {!isStudent && "Click 'Add' to create one."}
                                </div>
                              ) : subject.items.map((a: Assignment) => {
                                const mySubmission = isStudent
                                  ? a.submissions.find((s) => s.studentId === userId)
                                  : undefined;
                                const dp = duePill(a.dueDate, mySubmission?.status);
                                const tb = typeBadge(a.type);
                                const isExpanded = expandedId === a.id;
                                const submissionCount = a.submissions.length;
                                const pendingCount = a.submissions.filter((s) => s.status === "submitted").length;

                                return (
                                  <div
                                    key={a.id}
                                    style={{
                                      background: B.white, borderRadius: 12,
                                      border: `1px solid ${B.line}`,
                                      overflow: "hidden",
                                      transition: "box-shadow .2s",
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding: "14px 16px",
                                        display: "flex", alignItems: "flex-start", gap: 12,
                                        cursor: "pointer",
                                      }}
                                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                                    >
                                      <div style={{
                                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                        background: `${tb.color}14`,
                                        border: `1px solid ${tb.color}28`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: tb.color,
                                      }}>
                                        <ClipboardList size={16} />
                                      </div>

                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                          <span style={{ fontWeight: 800, fontSize: 14, color: B.navy }}>{a.title}</span>
                                          <Pill color={tb.color}>{tb.label}</Pill>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: "2px 8px",
                                            borderRadius: 99, background: `${dp.color}14`,
                                            border: `1px solid ${dp.color}44`, color: dp.color,
                                          }}>
                                            {dp.label}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: B.muted, marginTop: 3 }}>
                                          {a.description.slice(0, 80)}{a.description.length > 80 ? "ΓÇª" : ""}
                                        </div>
                                        {!isStudent && (
                                          <div style={{ fontSize: 10, color: B.muted, marginTop: 4 }}>
                                            <span style={{ fontWeight: 700, color: B.navy }}>{submissionCount}</span> submission{submissionCount !== 1 ? "s" : ""}
                                            {pendingCount > 0 && <span style={{ marginLeft: 5, color: B.warning, fontWeight: 700 }}>┬╖ {pendingCount} pending</span>}
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        {isStudent && mySubmission?.status === "returned" && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewFeedback({ sub: mySubmission, title: a.title });
                                            }}
                                            style={{
                                              padding: "5px 10px", borderRadius: 7,
                                              background: `${B.success}14`, color: B.success,
                                              fontWeight: 700, fontSize: 11, cursor: "pointer",
                                              display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
                                              border: `1px solid ${B.success}44`,
                                            }}
                                          >
                                            <MessageSquare size={11} /> Feedback
                                          </button>
                                        )}

                                        {(isAdmin || isTeacher) && (
                                          <>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setEditId(a.id); setShowCreate(false); }}
                                              style={{
                                                width: 28, height: 28, borderRadius: 7, border: `1px solid ${B.line}`,
                                                background: B.offW, cursor: "pointer", display: "flex",
                                                alignItems: "center", justifyContent: "center", color: B.muted, flexShrink: 0,
                                              }}
                                            ><Pencil size={12} /></button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); deleteAssignment(a.id); }}
                                              style={{
                                                width: 28, height: 28, borderRadius: 7, border: `1px solid #fecaca`,
                                                background: "#fef2f2", cursor: "pointer", display: "flex",
                                                alignItems: "center", justifyContent: "center", color: B.error, flexShrink: 0,
                                              }}
                                            ><Trash2 size={12} /></button>
                                          </>
                                        )}

                                        <div style={{ color: B.muted }}>
                                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div style={{
                                        borderTop: `1px solid ${B.line}`,
                                        padding: "16px",
                                        background: B.offW2,
                                      }}>
                                        <div style={{
                                          fontSize: 12, color: B.text, lineHeight: 1.6,
                                          marginBottom: 14, padding: "12px 14px",
                                          background: B.white, borderRadius: 10, border: `1px solid ${B.line}`,
                                        }}>
                                          {a.description || "No instructions provided."}
                                        </div>

                                        <div style={{ fontSize: 10, color: B.muted, marginBottom: 14 }}>
                                          By <strong>{a.createdByName}</strong> ┬╖ Due {new Date(a.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                        </div>

                                        {isStudent && (
                                          <div>
                                            {!mySubmission ? (
                                              <>
                                                {uploadImageFor === a.id ? (
                                                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                    <ImageUploader onImage={setUploadImage} />
                                                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                                      <button
                                                        onClick={() => { setUploadImageFor(null); setUploadImage(""); }}
                                                        style={{
                                                          padding: "8px 12px", border: `1px solid ${B.line}`,
                                                          borderRadius: 8, background: B.offW, color: B.muted,
                                                          fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                                                        }}
                                                      >Cancel</button>
                                                      <PrimaryButton onClick={() => submitWork(a.id)} disabled={!uploadImage}>
                                                        <Send size={12} /> Submit
                                                      </PrimaryButton>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <GoldButton onClick={() => setUploadImageFor(a.id)} style={{ fontSize: 12 }}>
                                                    <Upload size={12} /> Upload & Submit
                                                  </GoldButton>
                                                )}
                                              </>
                                            ) : (
                                              <div style={{
                                                display: "flex", alignItems: "center", gap: 10,
                                                padding: "10px 12px", borderRadius: 10,
                                                background: mySubmission.status === "returned" ? `${B.success}10` : `${B.navy}10`,
                                                border: `1px solid ${mySubmission.status === "returned" ? B.success + "44" : B.navy + "44"}`,
                                              }}>
                                                {mySubmission.status === "returned"
                                                  ? <CheckCircle size={13} style={{ color: B.success, flexShrink: 0 }} />
                                                  : <Clock size={13} style={{ color: B.navy, flexShrink: 0 }} />}
                                                <span style={{ fontWeight: 700, fontSize: 11, color: mySubmission.status === "returned" ? B.success : B.navy }}>
                                                  {mySubmission.status === "returned" ? "Graded" : "Submitted"}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {(isTeacher || isAdmin) && (
                                          <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: B.navy, marginBottom: 8 }}>
                                              Submissions ({a.submissions.length})
                                            </div>
                                            {a.submissions.length === 0 ? (
                                              <div style={{
                                                fontSize: 12, color: B.muted, padding: "12px",
                                                textAlign: "center", background: B.white,
                                                borderRadius: 8, border: `1px solid ${B.line}`,
                                              }}>
                                                No submissions yet
                                              </div>
                                            ) : (
                                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                {a.submissions.map((sub) => (
                                                  <div
                                                    key={sub.id}
                                                    style={{
                                                      display: "flex", alignItems: "center", gap: 10,
                                                      padding: "10px 12px", background: B.white,
                                                      borderRadius: 10, border: `1px solid ${B.line}`,
                                                    }}>
                                                    <div style={{
                                                      width: 40, height: 40, borderRadius: 8, overflow: "hidden",
                                                      border: `1px solid ${B.line}`, flexShrink: 0,
                                                    }}>
                                                      <img src={sub.imageDataUrl} alt=""
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                      <div style={{ fontWeight: 700, fontSize: 12, color: B.navy }}>
                                                        {sub.studentName}
                                                      </div>
                                                      <div style={{ fontSize: 10, color: B.muted }}>
                                                        {new Date(sub.submittedAt).toLocaleString()}
                                                      </div>
                                                    </div>

                                                    {sub.status === "returned" ? (
                                                      <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: "2px 8px",
                                                        borderRadius: 99, background: `${B.success}14`,
                                                        border: `1px solid ${B.success}44`, color: B.success,
                                                      }}>
                                                        Graded
                                                      </span>
                                                    ) : (
                                                      <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: "2px 8px",
                                                        borderRadius: 99, background: `${B.warning}14`,
                                                        border: `1px solid ${B.warning}44`, color: B.warning,
                                                      }}>
                                                        Pending
                                                      </span>
                                                    )}

                                                    <button
                                                      onClick={() => setViewSubmission({ sub, asgn: a })}
                                                      style={{
                                                        padding: "6px 10px", border: "none", borderRadius: 7,
                                                        background: B.navy, color: B.white, fontWeight: 700, fontSize: 11,
                                                        cursor: "pointer", display: "flex", alignItems: "center",
                                                        gap: 4, fontFamily: "inherit", flexShrink: 0,
                                                      }}>
                                                      <Eye size={11} /> Review
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
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
              </div>
            );
          })}
        </div>
      )}


      {viewSubmission && (
        <SubmissionViewer
          submission={viewSubmission.sub}
          onSave={(submissionId, grade, feedback, imageDataUrl) =>
            saveSubmission(viewSubmission.asgn.id, submissionId, grade, feedback, imageDataUrl)
          }
          onReturn={(submissionId) => returnSubmission(viewSubmission.asgn.id, submissionId)}
          onDelete={(submissionId) => deleteSubmission(viewSubmission.asgn.id, submissionId)}
          onClose={() => setViewSubmission(null)}
          editable={isTeacher || isAdmin}
        />
      )}
      {viewFeedback && (
        <StudentFeedbackModal
          submission={viewFeedback.sub}
          assignmentTitle={viewFeedback.title}
          onClose={() => setViewFeedback(null)}
        />
      )}
    </DashboardLayout>
  );
}
