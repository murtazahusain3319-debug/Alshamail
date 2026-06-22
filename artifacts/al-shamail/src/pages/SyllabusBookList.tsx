import { useLocation } from "wouter";
import { motion } from "framer-motion";

const B = {
  navy: "#1B2B5E",
  navyD: "#0F1A3C",
  navyL: "#243875",
  gold: "#C9A84C",
  goldD: "#A8873A",
  goldL: "#E8C96A",
  white: "#FFFFFF",
  offW: "#F8F6F1",
  text: "#1a1a2e",
  muted: "#64748b",
  light: "#E8EBF4",
};

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpeg`;

export default function SyllabusBookList() {
  const [, navigate] = useLocation();

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: B.offW, color: B.text, minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#ffffff",
          borderBottom: `1px solid ${B.light}`,
          boxShadow: "0 2px 8px rgba(27,43,94,.04)",
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${B.navy}, ${B.gold}, ${B.goldL}, ${B.gold}, ${B.navy})` }} />
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => navigate("/")}>
            <img
              src={LOGO_SRC}
              alt="Al Shamail Logo"
              style={{ height: 56, width: 56, objectFit: "contain", flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div style={{ width: 1, height: 40, background: B.light }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: B.navy, fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.1 }}>Al Shamail</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: B.gold, textTransform: "uppercase", letterSpacing: ".18em", marginTop: 3 }}>International Academy</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/login")}
              style={{
                padding: "9px 22px",
                borderRadius: 10,
                border: `2px solid ${B.navy}`,
                background: "transparent",
                color: B.navy,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Sign In
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: `0 8px 24px rgba(201,168,76,.5)` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/apply")}
              style={{
                padding: "9px 22px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: `0 4px 16px rgba(201,168,76,.35)`,
              }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 28px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: B.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 12 }}>Syllabus</div>
          <h1 style={{ fontSize: "clamp(30px, 4.2vw, 46px)", fontWeight: 900, color: B.navy, fontFamily: "'Playfair Display', serif", margin: 0 }}>Book List</h1>
          <p style={{ fontSize: 15, color: B.muted, maxWidth: 620, margin: "14px auto 0", lineHeight: 1.7 }}>
            Required books and materials for the academic year. Digital copies are available in the student portal where applicable.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { n: "01", title: "Primary Mathematics — Book 1A & 1B", detail: "Oxford University Press · Ages 5–7" },
            { n: "02", title: "Key Stage 2 Maths Practice", detail: "Collins · Ages 7–11" },
            { n: "03", title: "Discover Science — Junior Level", detail: "Hodder Education · Ages 6–9" },
            { n: "04", title: "Jolly Phonics — Workbook Set", detail: "Jolly Learning · Ages 4–7" },
          ].map((b) => (
            <div key={b.n} style={{ display: "flex", gap: 16, padding: "16px 18px", background: B.white, border: `1px solid ${B.light}`, borderRadius: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: B.navy, color: B.goldL, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {b.n}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: B.navy }}>{b.title}</div>
                <div style={{ fontSize: 13, color: B.muted, marginTop: 4 }}>{b.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/syllabus/semesters")}
            style={{
              border: "none",
              borderRadius: 12,
              padding: "12px 18px",
              background: B.navy,
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            View Semesters →
          </button>
        </div>
      </main>
    </div>
  );
}

