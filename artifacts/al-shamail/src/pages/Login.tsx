import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLogin,
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";

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
};

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;

export default function Login() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submitting = login.isPending;

  useEffect(() => {
    if (me.data?.user) {
      navigate("/dashboard");
    }
  }, [me.data?.user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      await login.mutateAsync({ data: { email, password } });
      await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      navigate("/dashboard");
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't sign you in. Please try again.",
        );
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${B.navyD}, ${B.navy} 60%, ${B.navyL})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'DM Sans', sans-serif",
        color: B.text,
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,.7)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 20,
            fontFamily: "inherit",
          }}
        >
          <ChevronLeft size={16} /> Back to Home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: B.white,
            borderRadius: 22,
            padding: "36px 32px",
            boxShadow: "0 24px 60px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <img
              src={LOGO_SRC}
              alt="Al Shamail"
              style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: B.navy,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  lineHeight: 1.1,
                }}
              >
                Welcome Back
              </div>
              <div style={{ fontSize: 12, color: B.muted, marginTop: 3 }}>
                Sign in to continue learning
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: B.error,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: B.navy, marginBottom: 6 }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color={B.muted}
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    borderRadius: 10,
                    border: `1px solid ${B.light}`,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    background: B.offW,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: B.navy, marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color={B.muted}
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "12px 44px 12px 40px",
                    borderRadius: 10,
                    border: `1px solid ${B.light}`,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    background: B.offW,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: B.muted,
                    padding: 4,
                  }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: B.muted, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: B.gold }}
                />
                Remember me
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{ color: B.navy, fontWeight: 700, textDecoration: "none" }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 6,
                padding: "13px 20px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: submitting ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: submitting ? 0.85 : 1,
                boxShadow: "0 6px 20px rgba(201,168,76,.4)",
              }}
            >
              {submitting ? "Signing in..." : "Sign In"} {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: `1px solid ${B.light}`,
              fontSize: 13,
              textAlign: "center",
              color: B.muted,
            }}
          >
            New to Al Shamail?{" "}
            <button
              onClick={() => navigate("/apply")}
              style={{
                background: "transparent",
                border: "none",
                color: B.navy,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                padding: 0,
              }}
            >
              Apply for enrollment
            </button>
          </div>
        </motion.div>

        <div
          style={{
            marginTop: 18,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,.55)",
            fontSize: 12,
          }}
        >
          <Shield size={14} /> Secured by Al Shamail International Academy
        </div>
      </div>
    </div>
  );
}
