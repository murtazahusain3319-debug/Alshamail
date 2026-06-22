import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import {
  useListApplications,
  useApproveApplication,
  getListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { B, formatDateTime } from "@/lib/brand";
import { DashboardLayout, Card, Pill } from "@/components/DashboardLayout";

type RoleFilter = "all" | "student" | "teacher";
type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminApplications() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [busy, setBusy] = useState<number | null>(null);

  const list = useListApplications();
  const approve = useApproveApplication();
  const items: any[] = list.data?.items ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!term) return true;
      const hay = [a.firstName, a.lastName, a.email, a.phone, a.school, a.department, a.subjects]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, search, roleFilter, statusFilter]);

  const decide = async (id: number, decision: "approve" | "reject") => {
    setBusy(id);
    try {
      await approve.mutateAsync({
        id,
        status: decision === "approve" ? "approved" : "rejected",
      });
      await qc.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
    } catch (err: any) {
      window.alert(err?.message ?? `Couldn't ${decision} this application.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout
      title="Applications"
      subtitle="Review and approve students & teachers."
    >
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 12,
            marginBottom: 16,
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
              placeholder="Search name, email, school…"
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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            style={selStyle}
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={selStyle}
          >
            <option value="all">Any status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {list.isLoading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: B.muted,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            No applications match your filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((a) => (
              <ApplicationCard
                key={a.id}
                app={a}
                busy={busy === a.id}
                onApprove={() => decide(a.id, "approve")}
                onReject={() => decide(a.id, "reject")}
              />
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

const selStyle: React.CSSProperties = {
  border: `1.5px solid ${B.light}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: B.white,
  fontSize: 13,
  fontWeight: 600,
  color: B.navy,
  fontFamily: "inherit",
  cursor: "pointer",
  outline: "none",
};

function ApplicationCard({
  app,
  busy,
  onApprove,
  onReject,
}: {
  app: any;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isStudent = app.role === "student";

  return (
    <div
      style={{
        background: B.white,
        border: `1.5px solid ${B.light}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "44px 1fr auto",
          gap: 14,
          alignItems: "center",
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
            fontWeight: 800,
            fontSize: 16,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {(app.firstName?.[0] ?? "?").toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800, color: B.navy, fontSize: 15 }}>
              {app.firstName} {app.lastName}
            </span>
            <Pill color={isStudent ? B.navy : B.gold}>
              {isStudent ? <GraduationCap size={11} /> : <BookOpen size={11} />} {app.role}
            </Pill>
            <Pill
              color={
                app.status === "approved"
                  ? B.success
                  : app.status === "rejected"
                    ? B.error
                    : B.warning
              }
            >
              {app.status}
            </Pill>
          </div>
          <div
            style={{
              fontSize: 12,
              color: B.muted,
              marginTop: 4,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Mail size={11} /> {app.email}
            </span>
            {app.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} /> {app.phone}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={11} /> {formatDateTime(app.createdAt)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {app.status === "pending" ? (
            <>
              <button
                onClick={onApprove}
                disabled={busy}
                style={btnStyle(B.success)}
              >
                {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button
                onClick={onReject}
                disabled={busy}
                style={btnStyle(B.error)}
              >
                <XCircle size={14} /> Reject
              </button>
            </>
          ) : null}
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              background: "transparent",
              border: `1px solid ${B.light}`,
              color: B.muted,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {open ? "Hide" : "Details"}
          </button>
        </div>
      </div>
      {open && (
        <div
          style={{
            borderTop: `1px solid ${B.light}`,
            padding: 16,
            background: B.offW,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Detail icon={<MapPin size={11} />} label="City" value={app.city} />
          {isStudent ? (
            <>
              <Detail label="Grade" value={app.grade} />
              <Detail label="School" value={app.school} />
              <Detail label="Parent / Guardian" value={app.parentName} />
              <Detail label="Parent phone" value={app.parentPhone} />
            </>
          ) : (
            <>
              <Detail label="Department" value={app.department} />
              <Detail label="Qualification" value={app.qualification} />
              <Detail label="Experience" value={app.experience} />
              <Detail label="Subjects" value={app.subjects} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({
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
          gap: 4,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {value && value.trim() ? value : <span style={{ color: B.muted, fontWeight: 400 }}>—</span>}
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}
