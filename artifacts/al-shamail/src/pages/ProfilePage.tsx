import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useUpdateMyProfile,
  useUpdateMyAvatar,
  useGetCurrentUser,
  getGetMyProfileQueryKey,
  getGetCurrentUserQueryKey,
  getListMessageContactsQueryKey,
} from "@workspace/api-client-react";
import {
  Sparkles,
  Trophy,
  Flame,
  Mail,
  Phone,
  GraduationCap,
  Camera,
  Trash2,
} from "lucide-react";
import { B } from "@/lib/brand";
import {
  DashboardLayout,
  Card,
  PrimaryButton,
} from "@/components/DashboardLayout";

export default function ProfilePage() {
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const profileQ = useGetMyProfile();
  const update = useUpdateMyProfile();
  const updateAvatar = useUpdateMyAvatar();
  const profile: any = profileQ.data;
  const role = profile?.role ?? me.data?.user?.role;
  const isAdmin = profile?.isAdmin;
  const isStaff = isAdmin || role === "teacher";
  const isTeacherOnly = role === "teacher" && !isAdmin;

  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshAfterAvatar = async () => {
    await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    await qc.invalidateQueries({ queryKey: getListMessageContactsQueryKey() });
    await qc.invalidateQueries({ queryKey: ["conversation"] });
  };

  const handlePickFile = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) {
      setAvatarError("Please choose a PNG, JPEG, GIF or WebP image.");
      return;
    }
    if (file.size > 700 * 1024) {
      setAvatarError("Image is too large. Please pick one under 700KB.");
      return;
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    try {
      await updateAvatar.mutateAsync({ data: { dataUrl } });
      await refreshAfterAvatar();
    } catch (err: any) {
      setAvatarError(
        err?.response?.data?.error ?? "Could not upload image. Please try again.",
      );
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    try {
      await updateAvatar.mutateAsync({ data: { dataUrl: null } });
      await refreshAfterAvatar();
    } catch {
      setAvatarError("Could not remove the picture. Please try again.");
    }
  };

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phone: profile.phone ?? "",
        city: profile.city ?? "",
        country: profile.country ?? "",
        grade: profile.grade ?? "",
        school: profile.school ?? "",
        parentName: profile.parentName ?? "",
        parentPhone: profile.parentPhone ?? "",
        department: profile.department ?? "",
        qualification: profile.qualification ?? "",
        subjects: profile.subjects ?? "",
      });
    }
  }, [profile?.id]);

  const onChange = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    await update.mutateAsync({ data: form as any });
    await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <DashboardLayout
      title="My profile"
      subtitle="Manage your personal information."
    >
      {!profile ? (
        <div style={{ color: B.muted }}>Loading…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <Card>
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={handlePickFile}
                disabled={updateAvatar.isPending}
                title="Change profile picture"
                style={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  margin: "0 auto",
                  padding: 0,
                  border: `2px solid ${B.gold}`,
                  background: profile.avatarUrl
                    ? B.white
                    : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                  color: B.gold,
                  cursor: updateAvatar.isPending ? "wait" : "pointer",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  (profile.firstName?.[0] ?? "?") +
                  (profile.lastName?.[0] ?? "")
                )}
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: B.gold,
                    color: B.navy,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${B.white}`,
                  }}
                >
                  <Camera size={14} />
                </span>
              </button>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={updateAvatar.isPending}
                  style={{
                    background: "transparent",
                    border: `1px solid ${B.light}`,
                    color: B.navy,
                    padding: "5px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {updateAvatar.isPending ? "Uploading…" : "Change photo"}
                </button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={updateAvatar.isPending}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: B.error,
                      padding: 4,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
              {avatarError && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: B.error,
                    fontWeight: 600,
                  }}
                >
                  {avatarError}
                </div>
              )}
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: B.navy,
                }}
              >
                {profile.firstName} {profile.lastName}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: B.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {isAdmin ? "Administrator" : role}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 8,
                fontSize: 13,
                color: B.text,
              }}
            >
              <Info icon={<Mail size={14} />} value={profile.email} />
              {profile.phone && (
                <Info icon={<Phone size={14} />} value={profile.phone} />
              )}
              {profile.grade && (
                <Info
                  icon={<GraduationCap size={14} />}
                  value={`Grade: ${profile.grade}`}
                />
              )}
            </div>

            {role === "student" && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  background: B.offW,
                  display: "grid",
                  gap: 10,
                }}
              >
                <Stat
                  icon={<Sparkles size={16} color={B.gold} />}
                  label="Total XP"
                  value={profile.xp}
                />
                <Stat
                  icon={<Trophy size={16} color={B.gold} />}
                  label="Level"
                  value={profile.level}
                />
                <Stat
                  icon={<Flame size={16} color={B.error} />}
                  label="Streak"
                  value={`${profile.streak} day${profile.streak === 1 ? "" : "s"}`}
                />
              </div>
            )}
          </Card>

          <Card title="Personal information">
            <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
              <Row>
                <Field
                  label="First name"
                  value={form.firstName ?? ""}
                  onChange={(v) => onChange("firstName", v)}
                />
                <Field
                  label="Last name"
                  value={form.lastName ?? ""}
                  onChange={(v) => onChange("lastName", v)}
                />
              </Row>
              <Row>
                <Field
                  label="Phone"
                  value={form.phone ?? ""}
                  onChange={(v) => onChange("phone", v)}
                />
                <Field
                  label="City"
                  value={form.city ?? ""}
                  onChange={(v) => onChange("city", v)}
                />
              </Row>
              <Row>
                <Field
                  label="Country"
                  value={form.country ?? ""}
                  onChange={(v) => onChange("country", v)}
                />
                <Field
                  label="School"
                  value={form.school ?? ""}
                  onChange={(v) => onChange("school", v)}
                />
              </Row>

              {role === "student" && (
                <>
                  <Row>
                    <Field
                      label="Grade"
                      value={form.grade ?? ""}
                      onChange={(v) => onChange("grade", v)}
                    />
                    <Field
                      label="Parent / guardian name"
                      value={form.parentName ?? ""}
                      onChange={(v) => onChange("parentName", v)}
                    />
                  </Row>
                  <Row>
                    <Field
                      label="Parent / guardian phone"
                      value={form.parentPhone ?? ""}
                      onChange={(v) => onChange("parentPhone", v)}
                    />
                    <span />
                  </Row>
                </>
              )}

              {isStaff && (
                <>
                  <Row>
                    <Field
                      label="Department"
                      value={form.department ?? ""}
                      onChange={(v) => onChange("department", v)}
                    />
                    <Field
                      label="Qualification"
                      value={form.qualification ?? ""}
                      onChange={(v) => onChange("qualification", v)}
                    />
                  </Row>
                  {isTeacherOnly && (
                    <Field
                      label="Subjects taught"
                      value={form.subjects ?? ""}
                      onChange={(v) => onChange("subjects", v)}
                    />
                  )}
                </>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 6,
                }}
              >
                <PrimaryButton type="submit" disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save changes"}
                </PrimaryButton>
                {saved && (
                  <span style={{ color: B.success, fontWeight: 700, fontSize: 13 }}>
                    ✓ Saved
                  </span>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: B.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: B.white,
          border: `1.5px solid ${B.light}`,
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          color: B.text,
        }}
      />
    </label>
  );
}

function Info({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: B.text,
      }}
    >
      <span style={{ color: B.muted, display: "inline-flex" }}>{icon}</span>
      <span style={{ wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: B.muted,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {icon} {label}
      </span>
      <span style={{ fontWeight: 800, color: B.navy, fontSize: 14 }}>
        {value}
      </span>
    </div>
  );
}
