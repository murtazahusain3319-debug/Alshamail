import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateApplication } from "@workspace/api-client-react";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  BookOpen,
  ArrowRight,
  Sparkles,
  Shield,
  Star,
} from "lucide-react";

/* ─── BRAND TOKENS (matches Home.tsx) ─────────────────────────────── */
const B = {
  navy: "#1B2B5E",
  navyD: "#0F1A3C",
  navyL: "#243875",
  gold: "#C9A84C",
  goldL: "#E8C96A",
  goldD: "#A8873A",
  white: "#FFFFFF",
  offW: "#F8F6F1",
  text: "#1a1a2e",
  muted: "#64748b",
  light: "#E8EBF4",
  error: "#dc2626",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
};

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;

type FieldProps = {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
};

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 700,
          color: B.navy,
          marginBottom: 7,
          letterSpacing: ".01em",
        }}
      >
        {label}
        {required && <span style={{ color: B.gold, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <p
          style={{
            marginTop: 5,
            fontSize: 12,
            color: B.error,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "12px 16px",
  border: `1.5px solid ${hasError ? B.error : B.light}`,
  borderRadius: 12,
  fontSize: 14,
  color: B.text,
  background: hasError ? B.errorBg : B.white,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .2s, box-shadow .2s",
  boxSizing: "border-box",
});

const iconInputWrap: React.CSSProperties = { position: "relative" };
const iconLeft: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: B.muted,
  pointerEvents: "none",
};

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const s =
    password.length > 10
      ? { label: "Strong", color: "#10b981", w: "100%" }
      : password.length > 7
      ? { label: "Medium", color: "#f59e0b", w: "66%" }
      : { label: "Weak", color: B.error, w: "33%" };
  return (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 4, background: B.light, borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: s.w,
            background: s.color,
            borderRadius: 99,
            transition: "width .3s, background .3s",
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, minWidth: 40 }}>{s.label}</span>
    </div>
  );
}

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  grade: string;
  school: string;
  parentName: string;
  parentPhone: string;
  experience: string;
  department: string;
  subjects: string;
  qualification: string;
  phone: string;
  address: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

export default function Apply() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userType, setUserType] = useState<"student" | "teacher" | "">("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    grade: "",
    school: "",
    parentName: "",
    parentPhone: "",
    experience: "",
    department: "",
    subjects: "",
    qualification: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const createApplication = useCreateApplication();
  const loading = createApplication.isPending;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = B.gold;
    e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,.15)`;
  };
  const blurStyle = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
    hasError: boolean,
  ) => {
    e.target.style.borderColor = hasError ? B.error : B.light;
    e.target.style.boxShadow = "none";
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email address";
    if (formData.password.length < 6) errors.password = "Minimum 6 characters required";
    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (userType === "student" && !formData.grade) errors.grade = "Grade level is required";
    if (userType === "teacher" && !formData.experience)
      errors.experience = "Experience level is required";
    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !userType) return;
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    setFieldErrors({});

    const trimmedName = formData.name.trim().replace(/\s+/g, " ");
    const nameParts = trimmedName.split(" ");
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : trimmedName;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const city = formData.address.trim() || undefined;

    try {
      await createApplication.mutateAsync({
        data: {
          role: userType,
          firstName,
          lastName,
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          city,
          grade: userType === "student" ? formData.grade || undefined : undefined,
          school: userType === "student" ? formData.school || undefined : undefined,
          parentName:
            userType === "student" ? formData.parentName || undefined : undefined,
          parentPhone:
            userType === "student" ? formData.parentPhone || undefined : undefined,
          experience: userType === "teacher" ? formData.experience || undefined : undefined,
          department: userType === "teacher" ? formData.department || undefined : undefined,
          qualification:
            userType === "teacher" ? formData.qualification || undefined : undefined,
          subjects: userType === "teacher" ? formData.subjects || undefined : undefined,
        },
      });
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sorry, we couldn't submit your application. Please try again.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const inp = (name: keyof FormData, extraStyle: React.CSSProperties = {}) => ({
    name,
    value: formData[name],
    onChange: handleChange,
    onFocus: focusStyle,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
      blurStyle(e, !!fieldErrors[name]),
    style: { ...inputStyle(!!fieldErrors[name]), ...extraStyle },
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        background: B.offW,
        color: B.text,
        overflowX: "hidden",
      }}
    >
      <style>{`
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; cursor: pointer; }
        @keyframes als-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .als-apply-left { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── LEFT PANEL ── */}
        <div
          className="als-apply-left"
          style={{
            width: 420,
            flexShrink: 0,
            background: `linear-gradient(160deg, ${B.navyD} 0%, ${B.navy} 55%, ${B.navyL} 100%)`,
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 44px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: `1px solid rgba(201,168,76,.15)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -60,
              width: 240,
              height: 240,
              borderRadius: "50%",
              border: `1px solid rgba(201,168,76,.1)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.04,
              backgroundImage: `radial-gradient(circle, ${B.gold} 1px, transparent 1px)`,
              backgroundSize: "36px 36px",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 52 }}>
              <img
                src={LOGO_SRC}
                alt="Al Shamail"
                style={{ height: 60, width: 60, objectFit: "contain", flexShrink: 0 }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: B.white,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    lineHeight: 1.1,
                  }}
                >
                  Al Shamail
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: B.goldL,
                    textTransform: "uppercase",
                    letterSpacing: ".18em",
                    marginTop: 3,
                  }}
                >
                  International Academy
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: "rgba(255,255,255,.4)",
                    textTransform: "uppercase",
                    letterSpacing: ".2em",
                    marginTop: 2,
                  }}
                >
                  Online
                </div>
              </div>
            </div>

            <h2
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: B.white,
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.25,
                marginBottom: 16,
              }}
            >
              Begin Your<br />
              <span style={{ color: B.goldL }}>Learning Journey</span>
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.75 }}>
              Join thousands of students and educators in a world-class learning environment.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[
              { icon: <BookOpen size={15} />, text: "200+ structured courses" },
              { icon: <Star size={15} />, text: "Certified expert teachers" },
              { icon: <Sparkles size={15} />, text: "Gamified XP & achievements" },
              { icon: <Shield size={15} />, text: "Safe, supportive environment" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: `rgba(201,168,76,.18)`,
                    border: `1px solid rgba(201,168,76,.35)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: B.goldL,
                  }}
                >
                  {item.icon}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", fontWeight: 600 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: 40,
                height: 2,
                background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})`,
                borderRadius: 99,
                marginBottom: 14,
              }}
            />
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.4)",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              "The best gift a parent can give their child is a great education."
            </p>
          </div>
        </div>

        {/* ── RIGHT: FORM AREA ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 28px",
            minHeight: "100vh",
          }}
        >
          {/* Back button */}
          <div style={{ width: "100%", maxWidth: 580, marginBottom: 28 }}>
            <button
              onClick={() =>
                step === 2 ? setStep(1) : step === 3 ? navigate("/") : navigate("/")
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: `1.5px solid ${B.light}`,
                background: B.white,
                color: B.navy,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = B.gold;
                (e.currentTarget as HTMLButtonElement).style.color = B.gold;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = B.light;
                (e.currentTarget as HTMLButtonElement).style.color = B.navy;
              }}
            >
              <ChevronLeft size={16} />
              {step === 2 ? "Back to Role Selection" : "Back to Home"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ══ STEP 1: ROLE SELECTION ══ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                style={{ width: "100%", maxWidth: 580 }}
              >
                <div style={{ marginBottom: 40 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: B.gold,
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                      marginBottom: 10,
                    }}
                  >
                    Get Started
                  </div>
                  <h1
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: B.navy,
                      fontFamily: "'Playfair Display', serif",
                      lineHeight: 1.2,
                      marginBottom: 10,
                    }}
                  >
                    Create Your Account
                  </h1>
                  <p style={{ fontSize: 14, color: B.muted, lineHeight: 1.6 }}>
                    Select your role to continue. You can always change your details later.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    {
                      type: "student" as const,
                      emoji: "🎓",
                      title: "I'm a Student",
                      desc: "Access courses, earn XP, and track your progress.",
                      badge: "Most Popular",
                    },
                    {
                      type: "teacher" as const,
                      emoji: "📖",
                      title: "I'm a Teacher",
                      desc: "Share knowledge and inspire students worldwide.",
                      badge: "Join 300+ Educators",
                    },
                  ].map((role) => (
                    <motion.button
                      key={role.type}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setUserType(role.type);
                        setStep(2);
                      }}
                      style={{
                        background: B.white,
                        border: `2px solid ${B.light}`,
                        borderRadius: 20,
                        padding: "28px 24px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all .25s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = B.gold;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 12px 40px rgba(201,168,76,.18)`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = B.light;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})`,
                        }}
                      />

                      <div style={{ fontSize: 40, marginBottom: 16 }}>{role.emoji}</div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: B.gold,
                          textTransform: "uppercase",
                          letterSpacing: ".1em",
                          marginBottom: 8,
                        }}
                      >
                        {role.badge}
                      </div>
                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 900,
                          color: B.navy,
                          fontFamily: "'Playfair Display', serif",
                          marginBottom: 8,
                        }}
                      >
                        {role.title}
                      </h3>
                      <p style={{ fontSize: 13, color: B.muted, lineHeight: 1.6, marginBottom: 20 }}>
                        {role.desc}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 800,
                          color: B.navy,
                        }}
                      >
                        Continue <ArrowRight size={14} />
                      </div>
                    </motion.button>
                  ))}
                </div>

                <p style={{ textAlign: "center", fontSize: 13, color: B.muted, marginTop: 28 }}>
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      color: B.gold,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}

            {/* ══ STEP 2: REGISTRATION FORM ══ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                style={{ width: "100%", maxWidth: 580 }}
              >
                <div style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: B.gold,
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                      marginBottom: 10,
                    }}
                  >
                    {userType === "student" ? "Student Registration" : "Teacher Registration"}
                  </div>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: B.navy,
                      fontFamily: "'Playfair Display', serif",
                      lineHeight: 1.2,
                      marginBottom: 8,
                    }}
                  >
                    {userType === "student"
                      ? "Create Your Student Account"
                      : "Join Our Teaching Team"}
                  </h1>
                  <p style={{ fontSize: 13, color: B.muted }}>
                    Fill in your details below. Fields marked{" "}
                    <span style={{ color: B.gold }}>*</span> are required.
                  </p>
                </div>

                {error && (
                  <div
                    style={{
                      background: B.errorBg,
                      border: `1px solid ${B.errorBorder}`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 24,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: B.error,
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                  </div>
                )}

                <form onSubmit={handleRegister}>
                  {/* Section: Account Details */}
                  <div style={{ marginBottom: 28 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: B.navy,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        paddingBottom: 10,
                        marginBottom: 18,
                        borderBottom: `1.5px solid ${B.light}`,
                      }}
                    >
                      Account Details
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <Field label="Full Name" required error={fieldErrors.name}>
                        <div style={iconInputWrap}>
                          <User size={16} style={iconLeft} />
                          <input
                            type="text"
                            placeholder="Enter your full name"
                            {...inp("name", { paddingLeft: 40 })}
                          />
                        </div>
                      </Field>

                      <Field label="Email Address" required error={fieldErrors.email}>
                        <div style={iconInputWrap}>
                          <Mail size={16} style={iconLeft} />
                          <input
                            type="email"
                            placeholder="your@email.com"
                            {...inp("email", { paddingLeft: 40 })}
                          />
                        </div>
                      </Field>

                      <Field label="Password" required error={fieldErrors.password}>
                        <div style={iconInputWrap}>
                          <Lock size={16} style={iconLeft} />
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimum 6 characters"
                            {...inp("password", { paddingLeft: 40, paddingRight: 44 })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: "absolute",
                              right: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              color: B.muted,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <StrengthBar password={formData.password} />
                      </Field>

                      <Field
                        label="Confirm Password"
                        required
                        error={fieldErrors.confirmPassword}
                      >
                        <div style={iconInputWrap}>
                          <Lock size={16} style={iconLeft} />
                          <input
                            type="password"
                            placeholder="Re-enter your password"
                            {...inp("confirmPassword", { paddingLeft: 40 })}
                          />
                          {formData.confirmPassword &&
                            formData.password === formData.confirmPassword && (
                              <CheckCircle2
                                size={16}
                                style={{
                                  ...iconLeft,
                                  left: "auto",
                                  right: 14,
                                  color: "#10b981",
                                }}
                              />
                            )}
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Section: Role-specific */}
                  <div style={{ marginBottom: 28 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: B.navy,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        paddingBottom: 10,
                        marginBottom: 18,
                        borderBottom: `1.5px solid ${B.light}`,
                      }}
                    >
                      {userType === "student" ? "Student Information" : "Professional Details"}
                    </div>

                    {userType === "student" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <Field label="Grade Level" required error={fieldErrors.grade}>
                            <select
                              {...inp("grade")}
                              style={inputStyle(!!fieldErrors.grade)}
                            >
                              <option value="">Select grade</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  Grade {i + 1}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="School Name">
                            <input type="text" placeholder="Your school" {...inp("school")} />
                          </Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <Field label="Parent / Guardian Name">
                            <input
                              type="text"
                              placeholder="Guardian's name"
                              {...inp("parentName")}
                            />
                          </Field>
                          <Field label="Parent Phone">
                            <div style={iconInputWrap}>
                              <Phone size={16} style={iconLeft} />
                              <input
                                type="tel"
                                placeholder="+44 7XXX XXX XXX"
                                {...inp("parentPhone", { paddingLeft: 40 })}
                              />
                            </div>
                          </Field>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <Field
                            label="Experience Level"
                            required
                            error={fieldErrors.experience}
                          >
                            <select
                              {...inp("experience")}
                              style={inputStyle(!!fieldErrors.experience)}
                            >
                              <option value="">Select experience</option>
                              {["1–3 years", "3–5 years", "5–10 years", "10+ years"].map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Department">
                            <input
                              type="text"
                              placeholder="e.g. Mathematics"
                              {...inp("department")}
                            />
                          </Field>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <Field label="Qualification">
                            <input
                              type="text"
                              placeholder="Highest qualification"
                              {...inp("qualification")}
                            />
                          </Field>
                          <Field label="Subjects">
                            <input
                              type="text"
                              placeholder="e.g. English, Science"
                              {...inp("subjects")}
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: Contact */}
                  <div style={{ marginBottom: 32 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: B.navy,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        paddingBottom: 10,
                        marginBottom: 18,
                        borderBottom: `1.5px solid ${B.light}`,
                      }}
                    >
                      Contact Information
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <Field label="Phone Number">
                        <div style={iconInputWrap}>
                          <Phone size={16} style={iconLeft} />
                          <input
                            type="tel"
                            placeholder="+44 7XXX XXX XXX"
                            {...inp("phone", { paddingLeft: 40 })}
                          />
                        </div>
                      </Field>
                      <Field label="Address">
                        <div style={iconInputWrap}>
                          <MapPin size={16} style={iconLeft} />
                          <input
                            type="text"
                            placeholder="City, Country"
                            {...inp("address", { paddingLeft: 40 })}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "15px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: loading
                        ? B.muted
                        : `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      transition: "all .2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: loading ? "none" : `0 6px 20px rgba(201,168,76,.4)`,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 10px 28px rgba(201,168,76,.5)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "none";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = loading
                        ? "none"
                        : `0 6px 20px rgba(201,168,76,.4)`;
                    }}
                  >
                    {loading ? (
                      <>
                        <svg
                          style={{ animation: "als-spin 1s linear infinite", width: 18, height: 18 }}
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="rgba(255,255,255,.3)"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            fill="rgba(255,255,255,.9)"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Creating Account…
                      </>
                    ) : (
                      <>
                        Create {userType === "student" ? "Student" : "Teacher"} Account
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: B.muted,
                      marginTop: 16,
                    }}
                  >
                    By registering you agree to our{" "}
                    <span style={{ color: B.gold, fontWeight: 700, cursor: "pointer" }}>
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span style={{ color: B.gold, fontWeight: 700, cursor: "pointer" }}>
                      Privacy Policy
                    </span>
                  </p>
                </form>

                <p style={{ textAlign: "center", fontSize: 13, color: B.muted, marginTop: 20 }}>
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      color: B.gold,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}

            {/* ══ STEP 3: SUCCESS ══ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                style={{
                  width: "100%",
                  maxWidth: 540,
                  textAlign: "center",
                  padding: "60px 32px",
                  background: B.white,
                  border: `1px solid ${B.light}`,
                  borderRadius: 24,
                  boxShadow: "0 12px 48px rgba(27,43,94,.08)",
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    margin: "0 auto 28px",
                    background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: B.white,
                    boxShadow: `0 12px 32px rgba(201,168,76,.4)`,
                  }}
                >
                  <CheckCircle2 size={48} />
                </motion.div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: B.gold,
                    textTransform: "uppercase",
                    letterSpacing: ".14em",
                    marginBottom: 12,
                  }}
                >
                  Application Received
                </div>
                <h2
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    color: B.navy,
                    fontFamily: "'Playfair Display', serif",
                    lineHeight: 1.2,
                    marginBottom: 14,
                  }}
                >
                  Welcome to Al Shamail{formData.name ? `, ${formData.name.split(" ")[0]}` : ""}!
                </h2>
                <p style={{ fontSize: 15, color: B.muted, lineHeight: 1.7, marginBottom: 32 }}>
                  Thank you for applying. We've recorded your details and our admissions team will
                  be in touch within 24 hours to confirm your{" "}
                  {userType === "student" ? "student" : "teaching"} place and next steps.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    border: "none",
                    background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: `0 6px 20px rgba(201,168,76,.4)`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Back to Home <ArrowRight size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
