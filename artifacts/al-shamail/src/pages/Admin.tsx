import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  GraduationCap,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  LogOut,
} from "lucide-react";
import {
  useListApplications,
  useGetCurrentUser,
  useLogout,
  getGetCurrentUserQueryKey,
  type Application,
} from "@workspace/api-client-react";

const B = {
  navy: "#1B2B5E",
  navyD: "#0F1A3C",
  navyL: "#243875",
  gold: "#C9A84C",
  goldL: "#E8C96A",
  white: "#FFFFFF",
  offW: "#F8F6F1",
  text: "#1a1a2e",
  muted: "#64748b",
  light: "#E8EBF4",
  error: "#dc2626",
};

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;

type RoleFilter = "all" | "student" | "teacher";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: B.white,
        border: `1.5px solid ${B.light}`,
        borderRadius: 18,
        padding: "22px 26px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${accent}22`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: B.muted,
            textTransform: "uppercase",
            letterSpacing: ".12em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: B.navy,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.1,
            marginTop: 4,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isStudent = role === "student";
  const color = isStudent ? B.navy : B.gold;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".08em",
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {isStudent ? <GraduationCap size={11} /> : <BookOpen size={11} />}
      {role}
    </span>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  const [open, setOpen] = useState(false);
  const fullName = `${app.firstName} ${app.lastName}`.trim();

  return (
    <div
      style={{
        background: B.white,
        border: `1.5px solid ${B.light}`,
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
        transition: "border-color .2s, box-shadow .2s",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "18px 22px",
          background: "none",
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 18,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
            color: B.goldL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 16,
            flexShrink: 0,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {(app.firstName[0] || "?").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: B.navy,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {fullName || "Unnamed"}
            </span>
            <RoleBadge role={app.role} />
          </div>
          <div
            style={{
              fontSize: 13,
              color: B.muted,
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Mail size={12} /> {app.email}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={12} /> {formatDate(app.createdAt)}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: B.gold,
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          {open ? "Hide" : "View"}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "0 22px 22px",
            borderTop: `1px solid ${B.light}`,
            paddingTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <DetailItem icon={<Phone size={13} />} label="Phone" value={app.phone} />
          <DetailItem icon={<MapPin size={13} />} label="City" value={app.city} />
          {app.role === "student" && (
            <>
              <DetailItem label="Grade" value={app.grade} />
              <DetailItem label="School" value={app.school} />
              <DetailItem label="Parent / Guardian" value={app.parentName} />
              <DetailItem label="Parent phone" value={app.parentPhone} />
            </>
          )}
          {app.role === "teacher" && (
            <>
              <DetailItem label="Experience" value={app.experience} />
              <DetailItem label="Department" value={app.department} />
              <DetailItem label="Qualification" value={app.qualification} />
              <DetailItem label="Subjects" value={app.subjects} />
            </>
          )}
          <DetailItem label="Status" value={app.status} />
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: B.muted,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 14, color: B.text, fontWeight: 600 }}>
        {value && value.trim() ? value : <span style={{ color: B.muted, fontWeight: 400 }}>—</span>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const me = useGetCurrentUser();
  const logout = useLogout();
  const isAuthed = !!me.data?.user;
  const isAdmin = !!me.data?.user?.isAdmin;

  useEffect(() => {
    if (me.isLoading) return;
    if (!isAuthed) {
      navigate("/login");
    }
  }, [me.isLoading, isAuthed, navigate]);

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      qc.clear();
      navigate("/");
    }
  };

  const query = useListApplications({
    query: { enabled: isAuthed && isAdmin },
  });

  const applications: Application[] = query.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (roleFilter !== "all" && app.role !== roleFilter) return false;
      if (!term) return true;
      const haystack = [
        app.firstName,
        app.lastName,
        app.email,
        app.phone,
        app.school,
        app.department,
        app.subjects,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [applications, search, roleFilter]);

  const studentCount = applications.filter((a) => a.role === "student").length;
  const teacherCount = applications.filter((a) => a.role === "teacher").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        background: B.offW,
        color: B.text,
      }}
    >
      <header
        style={{
          background: `linear-gradient(160deg, ${B.navyD} 0%, ${B.navy} 60%, ${B.navyL} 100%)`,
          padding: "32px 40px 80px",
          color: B.white,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage: `radial-gradient(circle, ${B.gold} 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <button
              onClick={() => navigate("/")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1.5px solid rgba(255,255,255,.2)",
                background: "rgba(255,255,255,.06)",
                color: B.white,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <ChevronLeft size={15} /> Back to Site
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              {me.data?.user && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>
                  Signed in as{" "}
                  <strong style={{ color: B.goldL }}>{me.data.user.email}</strong>
                </span>
              )}
              <button
                onClick={handleLogout}
                disabled={logout.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${B.goldL}55`,
                  background: `${B.goldL}18`,
                  color: B.goldL,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: logout.isPending ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: logout.isPending ? 0.7 : 1,
                }}
              >
                <LogOut size={14} /> {logout.isPending ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 12 }}>
            <img
              src={LOGO_SRC}
              alt="Al Shamail International Academy"
              style={{ height: 110, width: "auto", objectFit: "contain", flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: B.goldL,
                  textTransform: "uppercase",
                  letterSpacing: ".18em",
                }}
              >
                Admin Console
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  fontFamily: "'Playfair Display', serif",
                  marginTop: 4,
                }}
              >
                Applications Inbox
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", maxWidth: 620 }}>
            Review every student and teacher who has applied to join the academy.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "-56px auto 0", padding: "0 40px 80px", position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <StatCard
            icon={<Users size={22} />}
            label="Total Applications"
            value={applications.length}
            accent={B.gold}
          />
          <StatCard
            icon={<GraduationCap size={22} />}
            label="Students"
            value={studentCount}
            accent={B.navy}
          />
          <StatCard
            icon={<BookOpen size={22} />}
            label="Teachers"
            value={teacherCount}
            accent="#10b981"
          />
        </div>

        <div
          style={{
            background: B.white,
            border: `1.5px solid ${B.light}`,
            borderRadius: 18,
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 280px", minWidth: 240 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: B.muted,
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, school, subject…"
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
                borderRadius: 12,
                border: `1.5px solid ${B.light}`,
                fontSize: 14,
                fontFamily: "inherit",
                color: B.text,
                background: B.offW,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "student", "teacher"] as const).map((role) => {
              const active = roleFilter === role;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `1.5px solid ${active ? B.gold : B.light}`,
                    background: active ? `${B.gold}18` : B.white,
                    color: active ? B.gold : B.navy,
                    fontWeight: 800,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${B.light}`,
              background: B.white,
              color: B.navy,
              fontWeight: 700,
              fontSize: 13,
              cursor: query.isFetching ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: query.isFetching ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: query.isFetching ? "als-spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>

        <style>{`@keyframes als-spin { to { transform: rotate(360deg); } }`}</style>

        {query.isLoading ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              background: B.white,
              borderRadius: 18,
              border: `1.5px solid ${B.light}`,
              color: B.muted,
              fontSize: 14,
            }}
          >
            Loading applications…
          </div>
        ) : query.isError ? (
          <div
            style={{
              padding: 28,
              borderRadius: 18,
              background: "#fef2f2",
              border: "1.5px solid #fecaca",
              color: B.error,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} />
            Couldn't load applications.{" "}
            {query.error instanceof Error ? query.error.message : "Please try again."}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              background: B.white,
              borderRadius: 18,
              border: `1.5px dashed ${B.light}`,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: B.navy,
                fontFamily: "'Playfair Display', serif",
                marginBottom: 8,
              }}
            >
              No applications {search || roleFilter !== "all" ? "match your filters" : "yet"}
            </div>
            <p style={{ fontSize: 13, color: B.muted }}>
              {search || roleFilter !== "all"
                ? "Try clearing the search or switching the role filter."
                : "Once visitors submit the apply form, they'll show up here."}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filtered.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
