import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  CalendarDays,
  MapPin,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import {
  useListScheduleEvents,
  useCreateScheduleEvent,
  useDeleteScheduleEvent,
  useGetCurrentUser,
  getListScheduleEventsQueryKey,
} from "@workspace/api-client-react";
import { B, formatDate, formatTime, relativeDay } from "@/lib/brand";
import {
  DashboardLayout,
  Card,
  Pill,
  PrimaryButton,
  GoldButton,
} from "@/components/DashboardLayout";

export default function SchedulePage() {
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const isStaff = !!me.data?.user?.isAdmin || me.data?.user?.role === "teacher";
  const list = useListScheduleEvents({});
  const items: any[] = list.data?.items ?? [];
  const create = useCreateScheduleEvent();
  const del = useDeleteScheduleEvent();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: defaultStart(),
    endsAt: defaultEnd(),
    kind: "class",
    location: "",
    meetingUrl: "",
    audience: "all",
    gradeFilter: "",
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of items) {
      const key = e.startsAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startsAt || !form.endsAt) return;
    await create.mutateAsync({
      data: {
        title: form.title,
        description: form.description,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        kind: form.kind as any,
        location: form.location || undefined,
        meetingUrl: form.meetingUrl || undefined,
        audience: form.audience as any,
        gradeFilter: form.audience === "grade" ? form.gradeFilter : undefined,
      },
    });
    await qc.invalidateQueries({ queryKey: getListScheduleEventsQueryKey() });
    setShowNew(false);
    setForm({
      title: "",
      description: "",
      startsAt: defaultStart(),
      endsAt: defaultEnd(),
      kind: "class",
      location: "",
      meetingUrl: "",
      audience: "all",
      gradeFilter: "",
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete this event?")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListScheduleEventsQueryKey() });
  };

  return (
    <DashboardLayout
      title="Schedule"
      subtitle={
        isStaff
          ? "Manage classes, exams, assemblies and meetings."
          : "Your upcoming classes and events."
      }
    >
      <Card
        title="Events"
        action={
          isStaff && (
            <GoldButton onClick={() => setShowNew((v) => !v)}>
              <Plus size={14} /> New event
            </GoldButton>
          )
        }
      >
        {showNew && isStaff && (
          <form
            onSubmit={onCreate}
            style={{
              background: B.offW,
              border: `1.5px dashed ${B.gold}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inp}
              required
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inp, minHeight: 60, resize: "vertical" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={lbl}>Starts</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  style={inp}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={lbl}>Ends</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  style={inp}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={lbl}>Type</span>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  style={inp}
                >
                  <option value="class">Class</option>
                  <option value="exam">Exam</option>
                  <option value="assembly">Assembly</option>
                  <option value="holiday">Holiday</option>
                  <option value="meeting">Meeting</option>
                  <option value="club">Club</option>
                </select>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                style={inp}
              />
              <input
                placeholder="Meeting URL (optional)"
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                style={inp}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={lbl}>Audience</span>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  style={inp}
                >
                  <option value="all">Everyone</option>
                  <option value="students">Students only</option>
                  <option value="teachers">Teachers / staff</option>
                  <option value="grade">Specific grade</option>
                </select>
              </label>
              {form.audience === "grade" && (
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={lbl}>Grade</span>
                  <input
                    placeholder="e.g. Grade 6"
                    value={form.gradeFilter}
                    onChange={(e) => setForm({ ...form, gradeFilter: e.target.value })}
                    style={inp}
                  />
                </label>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <PrimaryButton type="submit" disabled={create.isPending}>
                Create event
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                style={cancelBtn}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {list.isLoading ? (
          <div style={{ color: B.muted }}>Loading…</div>
        ) : items.length === 0 ? (
          <div
            style={{
              color: B.muted,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            <CalendarDays size={36} color={B.light} style={{ margin: "0 auto 10px" }} />
            No events scheduled yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {grouped.map(([day, evts]) => (
              <div key={day}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    color: B.navy,
                    fontSize: 15,
                  }}
                >
                  {relativeDay(day)} ·{" "}
                  <span style={{ color: B.muted, fontSize: 12, fontWeight: 600 }}>
                    {formatDate(day)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evts.map((e: any) => (
                    <div
                      key={e.id}
                      style={{
                        background: B.offW,
                        border: `1.5px solid ${B.light}`,
                        borderLeft: `4px solid ${kindColor(e.kind)}`,
                        borderRadius: 12,
                        padding: 14,
                        display: "grid",
                        gridTemplateColumns: "100px 1fr auto",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 800,
                          color: B.navy,
                          fontSize: 18,
                        }}
                      >
                        {formatTime(e.startsAt)}
                        <div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>
                          → {formatTime(e.endsAt)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: B.navy }}>{e.title}</span>
                          <Pill color={kindColor(e.kind)}>{e.kind}</Pill>
                          {e.audience !== "all" && (
                            <Pill color={B.muted}>{e.audience}{e.gradeFilter ? `: ${e.gradeFilter}` : ""}</Pill>
                          )}
                        </div>
                        {e.description && (
                          <div style={{ fontSize: 13, color: B.muted, marginTop: 4 }}>
                            {e.description}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 14,
                            marginTop: 6,
                            fontSize: 12,
                            color: B.muted,
                            flexWrap: "wrap",
                          }}
                        >
                          {e.location && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <MapPin size={11} /> {e.location}
                            </span>
                          )}
                          {e.meetingUrl && (
                            <a
                              href={e.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: B.navy,
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <LinkIcon size={11} /> Join online
                            </a>
                          )}
                          {e.teacherName && <span>{e.teacherName}</span>}
                        </div>
                      </div>
                      {isStaff && (
                        <button
                          onClick={() => onDelete(e.id)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${B.light}`,
                            color: B.error,
                            padding: 8,
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

function kindColor(kind: string): string {
  const map: Record<string, string> = {
    class: "#1B2B5E",
    exam: "#dc2626",
    assembly: "#C9A84C",
    holiday: "#16a34a",
    meeting: "#7c3aed",
    club: "#0891b2",
  };
  return map[kind] ?? "#1B2B5E";
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

function defaultEnd(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalInput(d);
}

function toLocalInput(d: Date): string {
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60_000);
  return local.toISOString().slice(0, 16);
}

const inp: React.CSSProperties = {
  background: B.white,
  border: `1.5px solid ${B.light}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  color: B.text,
};
const lbl: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: B.muted,
  textTransform: "uppercase",
  letterSpacing: ".1em",
};
const cancelBtn: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${B.light}`,
  color: B.muted,
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};
