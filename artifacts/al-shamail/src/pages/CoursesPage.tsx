import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Search, Plus, BookOpen, Sparkles, Users, CheckCircle2,
  Image as ImageIcon, X, ChevronDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCourses, useCreateCourse, useEnrollInCourse,
  useGetCurrentUser, useListMyEnrollments, useListUsers,
  getListCoursesQueryKey, getListMyEnrollmentsQueryKey, getGetCourseQueryKey,
} from "@workspace/api-client-react";
import { getGetCourseMembersQueryKey } from "@/lib/mock-api";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, Pill, PrimaryButton, GoldButton, inputStyle } from "@/components/DashboardLayout";
import { API_BASE } from "@/lib/api-base";

/* ── Curated emoji thumbnails ── */
const EMOJI_PRESETS = [
  "🌙","📖","☪️","✏️","📜","🎓","🕌","📚","🧠","⭐","🌟","📝","🔬","🎨","🎭","🌍","🕋","🤲","📿","💎",
];

/* ── Colour palette for covers ── */
const COVER_COLORS = [
  { label: "Navy",   value: "#1B2B5E" },
  { label: "Gold",   value: "#C9A84C" },
  { label: "Forest", value: "#166534" },
  { label: "Rose",   value: "#be185d" },
  { label: "Indigo", value: "#4338ca" },
  { label: "Teal",   value: "#0f766e" },
  { label: "Amber",  value: "#b45309" },
  { label: "Slate",  value: "#334155" },
];

/* ── Thumbnail component - supports image URL or emoji+color ── */
function CourseThumbnail({
  thumbnailUrl, coverEmoji, coverColor, size = 180,
}: {
  thumbnailUrl?: string; coverEmoji?: string; coverColor?: string;
  size?: number;
}) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        style={{ width: "100%", height: size, objectFit: "cover", display: "block" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: "100%", height: size,
      background: `linear-gradient(135deg, ${coverColor ?? B.navy} 0%, ${coverColor ?? B.navy}cc 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.28, position: "relative", overflow: "hidden",
    }}>
      {/* Decorative pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: .07,
        backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
        backgroundSize: "22px 22px",
      }}/>
      <span style={{ position: "relative", zIndex: 1 }}>{coverEmoji ?? "📘"}</span>
    </div>
  );
}

/* ── New course modal/panel ── */
function NewCoursePanel({
  onSave, onCancel, isLoading,
}: {
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    title: "", subject: "", level: "KG - 1", description: "",
    coverEmoji: "📘", coverColor: B.navy, thumbnailUrl: "", bannerUrl: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const importImageToField = (field: "thumbnailUrl" | "bannerUrl", file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set(field, String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      background: B.white, border: `1.5px solid ${B.gold}55`,
      borderRadius: 18, padding: 24, marginBottom: 20,
      boxShadow: "0 8px 32px rgba(201,168,76,.12)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: B.gold, textTransform: "uppercase", letterSpacing: ".12em" }}>New Course</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, color: B.navy, margin: "4px 0 0" }}>Create a Course</h3>
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}>
          <X size={18}/>
        </button>
      </div>

      {/* Live preview */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Thumbnail Preview</div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1.5px solid ${B.light}`, boxShadow: "0 4px 14px rgba(27,43,94,.1)" }}>
            <CourseThumbnail
              thumbnailUrl={form.thumbnailUrl}
              coverEmoji={form.coverEmoji}
              coverColor={form.coverColor}
              size={140}
            />
            <div style={{ padding: "12px 14px", background: B.white }}>
              <div style={{ fontWeight: 800, color: B.navy, fontSize: 13, marginBottom: 3, fontFamily: "'Playfair Display', serif" }}>
                {form.title || "Course Title"}
              </div>
              <div style={{ fontSize: 11, color: B.muted }}>{form.subject || "Subject"} · {form.level}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Course Title *</label>
              <input placeholder="e.g. Tajweed Fundamentals" value={form.title} onChange={(e) => set("title", e.target.value)} style={inputStyle} required/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Subject *</label>
              <input placeholder="e.g. Islamic Studies" value={form.subject} onChange={(e) => set("subject", e.target.value)} style={inputStyle} required/>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Level</label>
            <select value={form.level} onChange={(e) => set("level", e.target.value)} style={{ ...inputStyle, appearance: "none" as any }}>
              {["KG - 1","KG - 2","KG - 3","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","O-lev 1","O-lev 2","O-lev 3","O-lev 4","A-lev 1","A-lev 2","A-lev 3"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Description *</label>
            <textarea
              placeholder="What will students learn in this course?"
              value={form.description} onChange={(e) => set("description", e.target.value)}
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              required
            />
          </div>

          {/* Thumbnail image URL */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>
              <ImageIcon size={12} style={{ marginRight: 4, verticalAlign: "middle" }}/>
              Thumbnail Image URL <span style={{ color: B.muted, fontWeight: 400 }}>(optional - leave blank to use emoji)</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                placeholder="https://images.unsplash.com/…"
                value={form.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)}
                style={inputStyle}
              />
              <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
                Import
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImageToField("thumbnailUrl", e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>
              Banner Image URL <span style={{ color: B.muted, fontWeight: 400 }}>(optional - used on course page hero)</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                placeholder="https://images.unsplash.com/…"
                value={form.bannerUrl} onChange={(e) => set("bannerUrl", e.target.value)}
                style={inputStyle}
              />
              <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
                Import
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImageToField("bannerUrl", e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Emoji + colour - only shown if no thumbnail URL */}
          {!form.thumbnailUrl && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Cover Emoji</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {EMOJI_PRESETS.slice(0, 10).map((em) => (
                    <button
                      key={em} type="button"
                      onClick={() => set("coverEmoji", em)}
                      style={{
                        width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${form.coverEmoji === em ? B.gold : B.light}`,
                        background: form.coverEmoji === em ? `${B.gold}18` : B.offW,
                        fontSize: 18, cursor: "pointer",
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: B.navy, display: "block", marginBottom: 6 }}>Cover Colour</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.value} type="button"
                      onClick={() => set("coverColor", c.value)}
                      style={{
                        width: 28, height: 28, borderRadius: 7, border: `2.5px solid ${form.coverColor === c.value ? B.gold : "transparent"}`,
                        background: c.value, cursor: "pointer",
                        boxShadow: form.coverColor === c.value ? `0 0 0 2px ${B.gold}55` : "none",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ background: "none", border: `1.5px solid ${B.light}`, borderRadius: 10, padding: "9px 18px", color: B.muted, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Cancel
        </button>
        <GoldButton
          onClick={() => {
            if (!form.title || !form.subject || !form.description) return;
            onSave(form);
          }}
          disabled={isLoading}
        >
          <Plus size={14}/> Create Course
        </GoldButton>
      </div>
    </div>
  );
}

/* ══ ADMIN ENROLL PANEL ── */
function EnrollPanel({ courseId, onClose }: { courseId: number; onClose: () => void }) {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const studentUsersQ = useListUsers({ role: "student" });
  const teacherUsersQ = useListUsers({ role: "teacher" });
  const studentUsers = studentUsersQ.data?.items ?? [];
  const teacherUsers = teacherUsersQ.data?.items ?? [];

  const filterUsers = (users: any[]) => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user: any) => {
      const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      return label.includes(term) || email.includes(term);
    });
  };

  const filteredStudents = useMemo(() => filterUsers(studentUsers), [search, studentUsers]);
  const filteredTeachers = useMemo(() => filterUsers(teacherUsers), [search, teacherUsers]);
  const activeUsers = selectedRole === "student" ? filteredStudents : filteredTeachers;
  const activeUsersQ = selectedRole === "student" ? studentUsersQ : teacherUsersQ;
  const activeRoleLabel = selectedRole === "student" ? "Students" : "Teachers";
  const activeRolePlural = selectedRole === "student" ? "students" : "teachers";
  const qc = useQueryClient();

  const handleEnroll = async () => {
    if (!selectedUser) {
      setMessage("Select a student or teacher from the list.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/enroll-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: selectedUser.email, role: selectedUser.role || "student" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to enroll");
      }
      await qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      await qc.invalidateQueries({ queryKey: getGetCourseMembersQueryKey(courseId) });
      setMessage(`Successfully enrolled ${selectedUser.firstName} ${selectedUser.lastName} as ${selectedUser.role || "student"}`);
      setSelectedUser(null);
      setSearch("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err?.message ?? "Enrollment failed");
    } finally {
      setIsLoading(false);
    }
  };

  const labelFor = (user: any) => `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: B.white,
          borderRadius: 22,
          boxShadow: "0 24px 64px rgba(27,43,94,.2)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${B.light}` }}>
          <div style={{ fontWeight: 800, color: B.navy }}>Enroll Users</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: B.muted, cursor: "pointer", padding: 6, borderRadius: 10 }} title="Close">
            <X size={18}/>
          </button>
        </div>

        <div style={{ background: B.offW, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <button
              type="button"
              onClick={() => setRolePickerOpen((v) => !v)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: `1.5px solid ${B.light}`,
                background: B.white,
                color: B.navy,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{activeRoleLabel}</span>
              <span style={{ fontSize: 12 }}>{rolePickerOpen ? "▲" : "▼"}</span>
            </button>
            {rolePickerOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 8,
                background: B.white,
                border: `1.5px solid ${B.light}`,
                borderRadius: 14,
                overflow: "hidden",
                zIndex: 10,
              }}>
                {(["student", "teacher"] as const).map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => {
                      setSelectedRole(roleKey);
                      setRolePickerOpen(false);
                      setSelectedUser(null);
                      setSearch("");
                      setMessage("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: selectedRole === roleKey ? `${B.gold}12` : "transparent",
                      color: B.navy,
                      cursor: "pointer",
                    }}
                  >
                    {roleKey === "student" ? "Students" : "Teachers"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: B.white,
            border: `1.5px solid ${B.light}`,
            borderRadius: 14,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            padding: "12px 14px",
          }}>
            {selectedUser ? (
              <span style={{ color: "#000", fontWeight: 700, fontSize: 13 }}>{labelFor(selectedUser)}</span>
            ) : (
              <span style={{ color: B.muted, fontSize: 13 }}>No user selected</span>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedUser(null);
              setMessage("");
            }}
            placeholder="Search by name or email"
            disabled={isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading}
            style={{
              ...inputStyle,
              padding: "10px 14px",
              fontSize: 13,
              opacity: isLoading ? 0.6 : 1,
            }}
          />

          <div style={{
            background: B.white,
            border: `1.5px solid ${B.light}`,
            borderRadius: 14,
            maxHeight: 220,
            overflowY: "auto",
            overflowX: "hidden",
            scrollBehavior: "smooth",
          }}>
            {activeUsersQ.isLoading ? (
              <div style={{ padding: 12, color: B.muted, fontSize: 13 }}>Loading {activeRolePlural}...</div>
            ) : activeUsersQ.isError ? (
              <div style={{ padding: 12, color: B.error, fontSize: 13 }}>Unable to load {activeRolePlural} list.</div>
            ) : activeUsers.length === 0 ? (
              <div style={{ padding: 12, color: B.muted, fontSize: 13 }}>No {activeRolePlural} match that search.</div>
            ) : (
              activeUsers.map((user: any) => {
                const label = labelFor(user);
                const selected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      if (selectedUser?.id === user.id) {
                        setSelectedUser(null);
                      } else {
                        setSelectedUser({ ...user, role: selectedRole });
                      }
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: selected ? `${B.gold}12` : "transparent",
                      color: B.navy,
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 12, color: B.muted }}>{user.email}</div>
                    </span>
                    {selected ? <span style={{ color: B.gold, fontWeight: 700 }}>Selected</span> : null}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={handleEnroll}
            disabled={isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading || !selectedUser}
            style={{
              padding: "11px 16px",
              borderRadius: 12,
              background: B.gold,
              color: B.white,
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading ? "wait" : "pointer",
              opacity: isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading ? 0.65 : 1,
            }}
          >
            {isLoading ? "Enrolling…" : "Enroll"}
          </button>

          {message && (
            <div style={{
              padding: "11px 14px",
              borderRadius: 12,
              background: message.toLowerCase().includes("success") ? "#d1fae5" : "#fee2e2",
              color: message.toLowerCase().includes("success") ? "#065f46" : "#991b1b",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ MAIN PAGE ══ */
export default function CoursesPage() {
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const isAdmin = !!user?.isAdmin;
  const isTeacher = !isAdmin && user?.role === "teacher";
  const isStaff = isAdmin || isTeacher;
  const isStudent = !!user && !isStaff;

  const list = useListCourses();
  const items: any[] = list.data?.items ?? [];
  const enrollments = useListMyEnrollments({ query: { enabled: !!user } });
  const enrolledIds = new Set<number>((enrollments.data?.items ?? []).map((e: any) => e.courseId));

  const enroll = useEnrollInCourse();
  const create = useCreateCourse();

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [teacherFilter, setTeacherFilter] = useState("All");
  const [showNew, setShowNew] = useState(false);
  const [showEnrollCourseId, setShowEnrollCourseId] = useState<number | null>(null);

  const allLevels = ["All", ...Array.from(new Set(items.map((c: any) => c.level).filter(Boolean)))];
  const teacherOptions = ["All", ...Array.from(new Set(items
    .map((c: any) => c.teacherName || (c.teacher ? `${c.teacher.firstName ?? ""} ${c.teacher.lastName ?? ""}`.trim() : ""))
    .filter(Boolean)))];

  const visibleItems = useMemo(() => {
    if (isStudent) return items.filter((c: any) => enrolledIds.has(c.id));
    if (isAdmin) return items;
    if (user?.role === "teacher") {
      return items.filter((c: any) => {
        const isOwner = Number(c.teacherId) === Number(user.id);
        const isAssigned = (c.teacherAssignments ?? []).some((assignment: any) => Number(assignment.teacher?.id) === Number(user.id));
        return isOwner || isAssigned;
      });
    }
    return items;
  }, [items, enrolledIds, isStudent, isAdmin, user?.id, user?.role]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleItems.filter((c: any) => {
      if (levelFilter !== "All" && c.level !== levelFilter) return false;
      if (teacherFilter !== "All") {
        const teacherName = c.teacherName || (c.teacher ? `${c.teacher.firstName ?? ""} ${c.teacher.lastName ?? ""}`.trim() : "");
        if (teacherName !== teacherFilter) return false;
      }
      if (!term) return true;
      return [c.title, c.subject, c.description, c.level, c.teacherName].join(" ").toLowerCase().includes(term);
    });
  }, [visibleItems, search, levelFilter, teacherFilter]);

  const onEnroll = async (id: number) => {
    await enroll.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
    await qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
  };

  const onCreate = async (form: any) => {
    const created = await create.mutateAsync({
      data: {
        title: form.title, subject: form.subject, level: form.level,
        description: form.description, coverEmoji: form.coverEmoji,
        coverColor: form.coverColor, published: true,
        ...(user?.id ? { teacherId: user.id } : {}),
        ...(form.thumbnailUrl ? { thumbnailUrl: form.thumbnailUrl } : {}),
        ...(form.bannerUrl ? { bannerUrl: form.bannerUrl } : {}),
      },
    });

    const courseId = created?.id ?? created?.course?.id;
    if (courseId && user?.id && user?.role === "teacher" && user?.email) {
      try {
        await fetch(`${API_BASE}/courses/${courseId}/enroll-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: user.email, role: "teacher" }),
        });
      } catch (err) {
        console.warn("Could not auto-enroll teacher into their new course", err);
      }
    }

    await qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });
    setShowNew(false);
  };

  return (
    <DashboardLayout
      title="Courses"
      subtitle={isStudent ? "Your enrolled courses." : "Manage your course catalogue."}
    >
      {/* Staff panels */}
      {showNew && isStaff && <NewCoursePanel onSave={onCreate} onCancel={() => setShowNew(false)} isLoading={create.isPending}/>}
      {showEnrollCourseId && isAdmin && (
        <div style={{ marginBottom: 12 }}>
          <EnrollPanel courseId={showEnrollCourseId} onClose={() => setShowEnrollCourseId(null)} />
        </div>
      )}

      <Card>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <Search size={15} color={B.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}/>
            <input
              placeholder="Search courses…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          {/* Level filter selector */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              border: `1.5px solid ${B.light}`,
              background: B.white,
              color: B.navy,
              cursor: "pointer",
            }}
          >
            {allLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          {isAdmin && (
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: `1.5px solid ${B.light}`,
                background: B.white,
                color: B.navy,
                cursor: "pointer",
              }}
            >
              {teacherOptions.map((teacher) => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          )}

          {isStaff && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <GoldButton onClick={() => { setShowNew((v) => !v); }}>
                <Plus size={14}/> New Course
              </GoldButton>
            </div>
          )}
        </div>

        {/* Course grid */}
        {list.isLoading ? (
          <div style={{ color: B.muted, padding: "40px 0", textAlign: "center" }}>Loading courses…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: B.muted, textAlign: "center", padding: "48px 0" }}>
            <BookOpen size={40} color={B.light} style={{ margin: "0 auto 12px" }}/>
            <div style={{ fontWeight: 700, color: B.navy, fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 4 }}>No courses found</div>
            <div style={{ fontSize: 13 }}>Try a different search or filter.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
            {filtered.map((c: any) => {
              const enrolled = enrolledIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className="course-hover"
                  style={{
                    background: B.white, border: `1.5px solid ${B.light}`,
                    borderRadius: 18, overflow: "hidden",
                    display: "flex", flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(27,43,94,.05)",
                  }}
                >
                  {/* Thumbnail */}
                  <Link href={`/courses/${c.id}`} style={{ display: "block", textDecoration: "none" }}>
                    <CourseThumbnail
                      thumbnailUrl={c.thumbnailUrl}
                      coverEmoji={c.coverEmoji}
                      coverColor={c.coverColor}
                      size={170}
                    />
                  </Link>

                  <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                      <Link href={`/courses/${c.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 15, color: B.navy, lineHeight: 1.3 }}>
                          {c.title}
                        </div>
                      </Link>
                      <Pill color={B.navyL}>{c.level}</Pill>
                    </div>

                    <div style={{ fontSize: 12, color: B.gold, fontWeight: 700, marginBottom: 8 }}>{c.subject}</div>

                    <p style={{
                      fontSize: 12.5, color: B.muted, margin: "0 0 12px", flex: 1, lineHeight: 1.6,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden",
                    }}>
                      {c.description}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Pill color={B.navy}><BookOpen size={11}/> {c.lessonCount ?? 0} lessons</Pill>
                      <Pill color={B.gold}><Users size={11}/> {c.enrolledCount ?? 0} enrolled</Pill>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Link href={`/courses/${c.id}`} style={{
                        flex: 1, background: B.navy, color: B.white, textDecoration: "none",
                        textAlign: "center", padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      }}>
                        {isStaff ? "Manage" : "View Course"}
                      </Link>

                      {isAdmin && (
                        <button onClick={() => setShowEnrollCourseId(c.id)} style={{
                          background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                          color: B.white, border: "none", padding: "9px 16px", borderRadius: 10,
                          fontSize: 13, fontWeight: 800, cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(201,168,76,.3)",
                        }}>
                          Enroll
                        </button>
                      )}
                      {isStudent && enrolled && (
                        <span style={{
                          background: `${B.success}18`, color: B.success,
                          padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800,
                          display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          <CheckCircle2 size={13}/> Enrolled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
