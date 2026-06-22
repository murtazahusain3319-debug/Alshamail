import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Users,
  Star,
  Zap,
  GraduationCap,
  BookOpen,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import { createLucideIcon } from "lucide-react";

// ─── Custom Icons ────────────────────────────────────────────────────────────
const CircleCheckBig = createLucideIcon("circle-check-big", [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }],
]);
const Globe = createLucideIcon("globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  [
    "path",
    {
      d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
      key: "13o1zl",
    },
  ],
  ["path", { d: "M2 12h20", key: "9i4pu4" }],
]);

const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const t = {
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
};

// Lighter scrim so photos read through; typography uses shadows for contrast.
const heroSlideOverlay =
  "linear-gradient(105deg, rgba(10,22,56,0.44) 0%, rgba(10,22,56,0.28) 48%, rgba(10,22,56,0.09) 100%)";

const heroBrandOverlay =
  "linear-gradient(90deg, rgba(10,22,56,0.2) 0%, rgba(10,22,56,0.07) 30%, rgba(10,22,56,0.02) 50%, rgba(10,22,56,0.03) 72%, rgba(10,22,56,0.2) 100%)";

const heroBrandGlow =
  "radial-gradient(ellipse 55% 45% at 82% 78%, rgba(232,201,106,0.06) 0%, transparent 50%)";

// Masked boost on the physical globe only (center of hero-10.png).
const heroBrandGlobeMask =
  "radial-gradient(ellipse 24% 30% at 50% 46%, #000 0%, #000 42%, transparent 74%)";
const heroBrandGlobeFilter = "saturate(1.14) brightness(1.16) contrast(1.02)";
const heroBrandGlobeLift =
  "radial-gradient(ellipse 26% 32% at 50% 46%, rgba(255,252,245,0.28) 0%, rgba(200,225,245,0.1) 48%, transparent 72%)";

// Slide 0 = brand (inline layout). Then hero-4 / hero-1 / hero-5 story slides.
const slides = [
  {
    kind: "brand" as const,
    id: 0,
  },
  {
    kind: "story" as const,
    id: 1,
    image: publicUrl("hero-4.jpeg"),
    overlay: heroSlideOverlay,
    heading: "Learn.\nGrow.\nExcel.",
    sub: "Give your child a world-class education from home. Expert teachers, a structured curriculum, and a fun, engaging platform designed for young learners to thrive.",
    cta: "Start Your Journey",
    accent: t.gold,
  },
  {
    kind: "story" as const,
    id: 2,
    image: publicUrl("hero-1.jpeg"),
    overlay: heroSlideOverlay,
    heading: "Taught by\nthe Very Best",
    sub: "Our passionate, qualified educators bring every subject to life — making learning engaging, meaningful, and tailored to each child's unique needs and learning style.",
    cta: "Meet Our Teachers",
    accent: t.goldL,
  },
  {
    kind: "story" as const,
    id: 3,
    image: publicUrl("hero-5.jpeg"),
    overlay: heroSlideOverlay,
    heading: "Study Anytime,\nAnywhere",
    sub: "Our platform adapts to your child's schedule and pace. Access lessons, videos, and quizzes on any device — with progress tracking and rewards to keep them motivated.",
    cta: "Get Started Free",
    accent: t.gold,
  },
];

const features = [
  {
    icon: <BookOpen size={28} />,
    title: "Structured Curriculum",
    desc: "Carefully designed learning paths covering Maths, English, Science and more — from beginner to advanced levels.",
  },
  {
    icon: <GraduationCap size={28} />,
    title: "Qualified Teachers",
    desc: "Learn from experienced, DBS-checked educators who are passionate about making every child succeed.",
  },
  {
    icon: <Globe size={28} />,
    title: "Global Community",
    desc: "Join thousands of students from around the world in a safe, supportive, and encouraging learning environment.",
  },
  {
    icon: <Zap size={28} />,
    title: "Gamified Learning",
    desc: "Children earn XP, unlock badges, and maintain streaks — turning every lesson into something they look forward to.",
  },
  {
    icon: <Clock size={28} />,
    title: "Learn at Your Own Pace",
    desc: "Flexible live and recorded sessions mean your child can learn at the times and pace that work best for your family.",
  },
  {
    icon: <Award size={28} />,
    title: "Certificates & Progress Reports",
    desc: "Track your child's growth with detailed reports and award certificates that celebrate every milestone.",
  },
];

const testimonials = [
  {
    name: "Shazia Kashif",
    role: "Parent",
    text: "My son went from struggling with Maths to absolutely loving it. The teachers at Al Shamail are patient, encouraging, and truly gifted at making things click for children.",
    rating: 5,
  },
  {
    name: "Abdul Rehman",
    role: "Student",
    text: "I never liked reading until I joined the English programme here. Now I read every day! The XP and badges make me want to keep going and beat my own score.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    role: "Parent",
    text: "The flexibility is incredible. My daughter attends sessions around our schedule and the detailed progress reports mean I always know exactly how she is getting on.",
    rating: 5,
  },
];

function StarRating({ n = 5 }: { n?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} size={14} fill={t.gold} color={t.gold} />
      ))}
    </div>
  );
}

// ─── Activities Gallery ───────────────────────────────────────────────────────
const activityImages: string[] = Array.from({ length: 12 }, (_, i) => publicUrl(`home-${i + 1}.jpeg`));

const PLACEHOLDER_COUNT = 15;

function ActivitiesGallery() {
  const images = activityImages.length > 0 ? activityImages : Array.from({ length: PLACEHOLDER_COUNT }, () => null as string | null);
  const total = images.length;

  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(
    (next: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % total), 4000);
      setCurrent(next);
    },
    [total]
  );

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % total), 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total]);

  const prev = () => resetTimer((current - 1 + total) % total);
  const next = () => resetTimer((current + 1) % total);
  const goTo = (i: number) => resetTimer(i);

  return (
    <section style={{ padding: "96px 28px", background: "#fff" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10 }}>
            Kids Activities
          </div>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 900,
              color: t.navy,
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1.15,
            }}
          >
            Holding Regular Activities for Kids
          </h2>
          <div
            style={{
              width: 52,
              height: 3,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${t.gold}, ${t.goldL})`,
              marginTop: 14,
              marginLeft: "auto",
              marginRight: "auto",
              marginBottom: 20,
            }}
          />
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.75, maxWidth: 560, margin: "0 auto" }}>
            Beyond the classroom, we run regular enrichment activities — from storytelling and art workshops to science experiments and seasonal celebrations — keeping children inspired, social, and excited to learn.
          </p>
        </div>

        <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(27,43,94,.14)" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              minHeight: "clamp(280px, 42vw, 520px)",
              aspectRatio: "4/3",
              maxHeight: 560,
              background: `linear-gradient(180deg, ${t.light} 0%, #eef1f7 100%)`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "clamp(12px, 2vw, 20px)",
                  boxSizing: "border-box",
                }}
              >
                {images[current] ? (
                  <img
                    src={images[current]!}
                    alt={`Activity ${current + 1}`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      objectPosition: "center center",
                      display: "block",
                      borderRadius: 8,
                      boxShadow: "0 8px 28px rgba(27,43,94,.12)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#000",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".06em" }}>
                      Photo {current + 1} of {total}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {(["prev", "next"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
                onClick={dir === "prev" ? prev : next}
                style={{
                  position: "absolute",
                  top: "50%",
                  [dir === "prev" ? "left" : "right"]: 20,
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,.35)",
                  background: "rgba(0,0,0,.38)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .2s, border-color .2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,.55)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = t.gold;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,.38)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.35)";
                }}
              >
                {dir === "prev" ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
              </button>
            ))}

            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                zIndex: 10,
                background: "rgba(0,0,0,.5)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {current + 1} / {total}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              padding: "18px 24px",
              background: t.navy,
              flexWrap: "wrap",
            }}
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: "none",
                  background: i === current ? t.gold : "rgba(255,255,255,.25)",
                  cursor: "pointer",
                  padding: 0,
                  transition: "all .3s",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [navOpen, setNavOpen] = useState<null | "syllabus" | "enrollment">(null);

  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [, navigate] = useLocation();

  const goApply = () => navigate("/apply");
  const goLogin = () => navigate("/login");
  const goTo = useCallback(
    (path: string) => {
      setNavOpen(null);
      navigate(path);
    },
    [navigate]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), 8000);
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [startAutoplay]);

  const goSlide = (i: number) => {
    setSlideIdx(i);
    startAutoplay();
  };
  const prevSlide = () => goSlide((slideIdx - 1 + slides.length) % slides.length);
  const nextSlide = () => goSlide((slideIdx + 1) % slides.length);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % testimonials.length), 4500);
    return () => clearInterval(id);
  }, []);

  const slide = slides[slideIdx];
  const isBrandSlide = slide.kind === "brand";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: t.offW, color: t.text, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');

        .nav-link { font-size:14px; font-weight:600; color:rgba(255,255,255,.8); text-decoration:none; transition:color .2s; cursor:pointer; }
        .nav-link:hover { color:${t.goldL}; }

        .als-btn-gold { display:inline-flex; align-items:center; gap:8px; padding:12px 28px; border-radius:10px; border:none; background:linear-gradient(135deg,${t.gold},${t.goldD}); color:#fff; font-weight:800; font-size:14px; cursor:pointer; font-family:inherit; transition:all .2s; box-shadow:0 4px 18px rgba(201,168,76,.4); }
        .als-btn-gold:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(201,168,76,.5); }

        .als-btn-outline { display:inline-flex; align-items:center; gap:8px; padding:12px 28px; border-radius:10px; border:2px solid rgba(255,255,255,.5); background:transparent; color:#fff; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; transition:all .2s; }
        .als-btn-outline:hover { background:rgba(255,255,255,.1); border-color:${t.goldL}; color:${t.goldL}; }

        .als-btn-navy { display:inline-flex; align-items:center; gap:8px; padding:13px 30px; border-radius:10px; border:none; background:${t.navy}; color:#fff; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; transition:all .2s; }
        .als-btn-navy:hover { background:${t.navyL}; transform:translateY(-1px); }

        .als-feature-card { background:#fff; border:1px solid ${t.light}; border-radius:20px; padding:32px 28px; transition:all .25s; cursor:default; }
        .als-feature-card:hover { transform:translateY(-6px); box-shadow:0 16px 48px rgba(27,43,94,.12); border-color:${t.gold}44; }

        .als-course-card { background:#fff; border:1px solid ${t.light}; border-radius:18px; overflow:hidden; transition:all .25s; cursor:pointer; }
        .als-course-card:hover { transform:translateY(-4px); box-shadow:0 12px 36px rgba(27,43,94,.12); }

        .als-divider-gold { width:64px; height:3px; border-radius:99px; background:linear-gradient(90deg,${t.gold},${t.goldL}); margin:14px auto 0; }

        .als-nav-dd { position:absolute; top:calc(100% + 10px); left:50%; transform:translateX(-50%); min-width:232px; background:#fff; border:1px solid ${t.light}; border-radius:12px; box-shadow:0 16px 40px rgba(27,43,94,.12); padding:6px 0; z-index:200; }
        .als-nav-dd button { display:flex; align-items:center; gap:10px; width:100%; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; color:${t.navy}; text-align:left; padding:10px 16px; transition:background .15s,color .15s; }
        .als-nav-dd button:hover { background:rgba(201,168,76,.1); color:${t.goldD}; }

        .als-nav-trigger { display:inline-flex; align-items:center; gap:4px; font-size:14px; font-weight:600; color:${t.navy}; cursor:pointer; transition:color .2s; padding:6px 10px; border:none; border-radius:8px; background:transparent; font-family:inherit; }
        .als-nav-trigger:hover { color:${t.gold}; }
        .als-nav-pill { font-size:14px; font-weight:600; color:${t.navy}; cursor:pointer; padding:6px 10px; border:none; border-radius:8px; background:transparent; font-family:inherit; transition:color .2s; }
        .als-nav-pill:hover { color:${t.gold}; }

        @media (max-width:900px) {
          .als-nav-links { display:none !important; }
          .als-gamif-grid { grid-template-columns:1fr !important; gap:32px !important; }
          .als-footer-grid { grid-template-columns:1fr !important; gap:28px !important; }
        }
      `}</style>

      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#ffffff",
          borderBottom: `1px solid ${scrolled ? t.light : "transparent"}`,
          boxShadow: scrolled ? "0 4px 24px rgba(27,43,94,.1)" : "0 2px 8px rgba(27,43,94,.04)",
          transition: "all .3s ease",
        }}
      >
        <div
          style={{
            height: scrolled ? 4 : 3,
            background: `linear-gradient(90deg, ${t.navy}, ${t.gold}, ${t.goldL}, ${t.gold}, ${t.navy})`,
            transition: "height .3s",
          }}
        />
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: `${scrolled ? "8px" : "12px"} 28px`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "padding .3s ease",
            minHeight: scrolled ? 72 : 92,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src={publicUrl("logo.jpeg")}
              alt="Al Shamail Logo"
              style={{
                height: scrolled ? 56 : 70,
                width: scrolled ? 56 : 70,
                objectFit: "contain",
                flexShrink: 0,
                transition: "all .3s ease",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div style={{ width: 1, height: scrolled ? 40 : 52, background: t.light, transition: "height .3s" }} />
            <div>
              <div
                style={{
                  fontSize: scrolled ? 18 : 21,
                  fontWeight: 900,
                  color: t.navy,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "-.01em",
                  lineHeight: 1.1,
                  transition: "font-size .3s",
                }}
              >
                Al Shamail
              </div>
              <div
                style={{
                  fontSize: scrolled ? 9 : 10.5,
                  fontWeight: 700,
                  color: t.gold,
                  textTransform: "uppercase",
                  letterSpacing: ".18em",
                  lineHeight: 1.4,
                  marginTop: 3,
                  transition: "font-size .3s",
                }}
              >
                International Academy
              </div>
              <div
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: t.muted,
                  textTransform: "uppercase",
                  letterSpacing: ".22em",
                  marginTop: 1,
                }}
              >
                Online
              </div>
            </div>
          </div>

          <nav ref={navRef} className="als-nav-links" style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }} aria-label="Primary">
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="als-nav-trigger"
                aria-expanded={navOpen === "syllabus"}
                aria-haspopup="true"
                onClick={() => setNavOpen((v) => (v === "syllabus" ? null : "syllabus"))}
              >
                Syllabus{" "}
                <span
                  style={{
                    opacity: 0.7,
                    fontSize: 12,
                    transform: navOpen === "syllabus" ? "rotate(180deg)" : "none",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {navOpen === "syllabus" ? (
                <div className="als-nav-dd" role="menu">
                  <button type="button" role="menuitem" onClick={() => goTo("/syllabus/book-list")}>
                    <span>Book List</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => goTo("/syllabus/semesters")}>
                    <span>Semesters</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="als-nav-pill" onClick={() => goTo("/courses-info")}>
              Courses
            </button>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="als-nav-trigger"
                aria-expanded={navOpen === "enrollment"}
                aria-haspopup="true"
                onClick={() => setNavOpen((v) => (v === "enrollment" ? null : "enrollment"))}
              >
                Enrollment Hub{" "}
                <span
                  style={{
                    opacity: 0.7,
                    fontSize: 12,
                    transform: navOpen === "enrollment" ? "rotate(180deg)" : "none",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>
              {navOpen === "enrollment" ? (
                <div className="als-nav-dd" role="menu">
                  <button type="button" role="menuitem" onClick={() => goTo("/enrollment/rules")}>
                    <span>Rules &amp; Regulations</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => goTo("/enrollment/fees")}>
                    <span>Fee Details</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => goTo("/enrollment/documents")}>
                    <span>Documents Required</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => goTo("/teachers")}>
                    <span>Our Teachers</span>
                  </button>
                  <button type="button" role="menuitem" onClick={goApply}>
                    <span>Enroll Now</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="als-nav-pill" onClick={() => goTo("/about")}>
              About
            </button>
            <button type="button" className="als-nav-pill" onClick={() => goTo("/contact")}>
              Contact
            </button>
          </nav>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={goLogin}
              style={{
                padding: scrolled ? "9px 22px" : "11px 26px",
                borderRadius: 10,
                border: `2px solid ${t.navy}`,
                background: "transparent",
                color: t.navy,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = t.navy;
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = t.navy;
              }}
            >
              Sign In
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(201,168,76,.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={goApply}
              style={{
                padding: scrolled ? "9px 22px" : "11px 26px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${t.gold}, ${t.goldD})`,
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(201,168,76,.35)",
                transition: "padding .3s",
              }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </header>

      <section style={{ position: "relative", height: "100vh", minHeight: 640, overflow: "hidden", paddingTop: 92 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            style={{ position: "absolute", top: 92, left: 0, right: 0, bottom: 0 }}
          >
            {slide.kind === "brand" ? (
              <>
                <img
                  src={publicUrl("hero-10.png")}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center center",
                    filter: "brightness(1.04) contrast(1.02)",
                  }}
                />
                <img
                  src={publicUrl("hero-10.png")}
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center center",
                    filter: heroBrandGlobeFilter,
                    WebkitMaskImage: heroBrandGlobeMask,
                    maskImage: heroBrandGlobeMask,
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "absolute", inset: 0, background: heroBrandOverlay }} />
                <div style={{ position: "absolute", inset: 0, background: heroBrandGlow }} />
                <div
                  style={{
                    position: "absolute",
                    width: 360,
                    height: 360,
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(232,201,106,0.07) 0%, transparent 65%)",
                    bottom: -60,
                    right: -40,
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.04,
                    backgroundImage: `radial-gradient(circle at 20% 80%, ${t.gold} 1px, transparent 1px), radial-gradient(circle at 80% 20%, ${t.goldL} 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 52%, rgba(8,14,40,0.1) 100%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: heroBrandGlobeLift,
                    mixBlendMode: "screen",
                    WebkitMaskImage: heroBrandGlobeMask,
                    maskImage: heroBrandGlobeMask,
                    pointerEvents: "none",
                  }}
                />
                <style>{`
                  @keyframes als-rotateSlow  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
                  @keyframes als-rotateSlowR { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
                  @keyframes als-floatY      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                  @keyframes als-pulseDot    { 0%,100% { opacity:.5; transform:scale(1);   } 50% { opacity:1; transform:scale(1.5); } }
                  @keyframes als-expandW     { from { width:0; opacity:0; } to { width:100%; opacity:1; } }
                  @keyframes als-fadeUp      { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
                  @keyframes als-slideInL    { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
                  .als-orbit-1 { position:absolute; top:50%; left:28%; width:480px; height:480px; margin:-240px 0 0 -240px; border-radius:50%; border:1px solid rgba(201,168,76,0.07); pointer-events:none; animation:als-rotateSlow 90s linear infinite; }
                  .als-orbit-2 { position:absolute; top:50%; left:28%; width:680px; height:680px; margin:-340px 0 0 -340px; border-radius:50%; border:1px solid rgba(201,168,76,0.04); pointer-events:none; animation:als-rotateSlowR 130s linear infinite; }
                  .als-orbit-dot { position:absolute; top:4%; left:50%; width:6px; height:6px; margin-left:-3px; border-radius:50%; background:#C9A84C; box-shadow:0 0 10px rgba(201,168,76,0.9); animation:als-pulseDot 3s ease-in-out infinite; }
                  .als-ring-outer { position:absolute; inset:-24px; border-radius:50%; border:1px solid rgba(201,168,76,0.12); animation:als-rotateSlowR 24s linear infinite; }
                  .als-ring-mid   { position:absolute; inset:-12px; border-radius:50%; border:1.5px solid rgba(201,168,76,0.28); animation:als-rotateSlow 16s linear infinite; }
                  .als-ring-mid::after { content:''; position:absolute; top:7%; right:-5px; width:9px; height:9px; border-radius:50%; background:#C9A84C; box-shadow:0 0 12px rgba(201,168,76,1); }
                  .als-gold-line { height:2.5px; border-radius:99px; background:linear-gradient(90deg,#C9A84C,#E8C96A,#C9A84C,transparent); max-width:280px; animation:als-expandW 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.5s both; }
                  .als-brand-text .als-brand-eyebrow { color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.5); }
                  .als-brand-text .als-brand-title { color:#ffffff; text-shadow:0 2px 28px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.45); }
                  .als-brand-text .als-brand-academy { color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.4); }
                  .als-brand-text .als-brand-tagline { color:#ffffff; text-shadow:0 1px 3px rgba(0,0,0,0.35); }
                  .als-brand-text .als-brand-body { color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.4); }
                  .als-brand-logo-wrap .als-ring-outer { inset:-10px; }
                  .als-brand-logo-wrap .als-ring-mid { inset:-5px; border-width:1px; }
                  .als-brand-logo-wrap .als-ring-mid::after { width:6px; height:6px; right:-3px; }
                  .als-brand-cols .als-brand-text { align-items:center; text-align:center; }
                  .als-brand-cols .als-brand-title-row { justify-content:center; }
                  .als-brand-cols .als-gold-line { margin-left:auto; margin-right:auto; }
                  @media (max-width:900px) {
                    .als-brand-cols { padding:clamp(64px, 9vh, 92px) 20px 56px !important; }
                    .als-brand-title-row { flex-direction:column !important; align-items:center !important; }
                  }
                `}</style>
                <div
                  className="als-brand-cols"
                  style={{
                    position: "relative",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    width: "100%",
                    maxWidth: 1160,
                    margin: "0 auto",
                    height: "100%",
                    padding: "clamp(96px, 11.5vh, 140px) 28px clamp(100px, 12vh, 120px)",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className="als-brand-text"
                    style={{
                      flex: "0 1 auto",
                      minWidth: 0,
                      maxWidth: 480,
                      width: "100%",
                      margin: "0 auto",
                      marginTop: "clamp(32px, 4vh, 52px)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0,
                    }}
                  >
                    <div
                      className="als-brand-eyebrow"
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        marginBottom: 10,
                        animation: "als-fadeUp 0.6s ease 0.3s both",
                      }}
                    >
                      Welcome to
                    </div>
                    <div
                      className="als-brand-title-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(14px, 2vw, 20px)",
                        animation: "als-fadeUp 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both",
                      }}
                    >
                      <div
                        className="als-brand-logo-wrap"
                        style={{ flexShrink: 0, animation: "als-slideInL 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}
                      >
                        <div style={{ position: "relative" }}>
                          <div className="als-ring-outer" />
                          <div className="als-ring-mid" />
                          <div
                            style={{
                              width: "clamp(64px, 8vw, 84px)",
                              height: "clamp(64px, 8vw, 84px)",
                              borderRadius: "50%",
                              background: "#ffffff",
                              border: "2px solid rgba(255,255,255,0.25)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow:
                                "0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 0 1px rgba(201,168,76,0.15)",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: "50%",
                                border: "2px solid rgba(201,168,76,0.18)",
                                pointerEvents: "none",
                                zIndex: 1,
                              }}
                            />
                            <img
                              src={publicUrl("logo.jpeg")}
                              alt="Al Shamail International Academy"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition: "center center",
                                display: "block",
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <h1
                        className="als-brand-title"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: "clamp(34px, 5vw, 56px)",
                          fontWeight: 900,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          margin: 0,
                        }}
                      >
                        Al Shamail
                      </h1>
                    </div>
                    <div className="als-gold-line" style={{ margin: "14px 0" }} />
                    <div
                      className="als-brand-academy"
                      style={{
                        fontSize: "clamp(11px,1.4vw,13px)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        animation: "als-fadeUp 0.6s ease 0.55s both",
                      }}
                    >
                      International Academy
                    </div>
                    <div
                      className="als-brand-tagline"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.26em",
                        marginTop: 4,
                        animation: "als-fadeUp 0.6s ease 0.65s both",
                      }}
                    >
                      Online · KG to A-Level · Learn · Grow · Succeed
                    </div>
                    <p
                      className="als-brand-body"
                      style={{
                        fontSize: "clamp(14px, 1.8vw, 16.5px)",
                        lineHeight: 1.8,
                        fontWeight: 500,
                        marginTop: 18,
                        marginBottom: 0,
                        animation: "als-fadeUp 0.65s ease 0.75s both",
                      }}
                    >
                      An online school built for children who deserve{" "}
                      <span style={{ color: "#ffffff", fontWeight: 700 }}>structure, warmth</span> and real academic
                      progress.{" "}
                      <span style={{ color: "#ffffff" }}>
                        Qualified teachers. A clear curriculum. A platform families trust.
                      </span>
                    </p>
                  </div>
                </div>

                {/* Trust badges — absolutely pinned to bottom, matching story slides */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "clamp(68px, 9vh, 100px)",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    display: "flex",
                    justifyContent: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: "0 28px",
                    animation: "als-fadeUp 0.65s ease 1.05s both",
                  }}
                >
                  {["10K+ Happy Students", "300+ Expert Teachers", "97% Parent Satisfaction"].map((label) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.96)",
                        padding: "8px 14px",
                        borderRadius: 10,
                        background: "rgba(15,26,60,0.55)",
                        border: "1px solid rgba(255,255,255,.15)",
                        boxShadow: "0 4px 18px rgba(0,0,0,.25)",
                        textShadow: "0 1px 2px rgba(0,0,0,.35)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <CircleCheckBig size={14} color={t.goldL} strokeWidth={2.25} /> {label}
                    </div>
                  ))}
                </div>

                <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, zIndex: 5, pointerEvents: "none" }}>
                  <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%" }}>
                    <path d="M0 60L1440 60L1440 22C1200 52 960 8 720 30C480 52 240 8 0 22L0 60Z" fill={t.offW} />
                  </svg>
                </div>
              </>
            ) : (
              <>
                <img
                  src={slide.image}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center center",
                  }}
                />
                <div style={{ position: "absolute", inset: 0, background: slide.overlay }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.025,
                    backgroundImage: `radial-gradient(circle at 20% 80%, ${t.gold} 1px, transparent 1px), radial-gradient(circle at 80% 20%, ${t.goldL} 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {!isBrandSlide ? (
        <div
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: 1160,
            margin: "0 auto",
            padding: "0 28px",
            height: "100%",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            flexDirection: "column",
            paddingTop: "clamp(6px, 1.25vh, 14px)",
            paddingBottom: "clamp(60px, 8vh, 90px)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: 640,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIdx}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
              maxWidth: 640,
              width: "100%",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
                  <>
                    <h1
                      style={{
                        fontSize: "clamp(38px, 5.5vw, 68px)",
                        fontWeight: 900,
                        color: t.white,
                        fontFamily: "'Playfair Display', Georgia, serif",
                        lineHeight: 1.1,
                        marginBottom: 22,
                        whiteSpace: "pre-line",
                        textShadow: "0 2px 28px rgba(0,0,0,.55), 0 1px 2px rgba(0,0,0,.4)",
                      }}
                    >
                      {slide.heading}
                    </h1>
                    <p
                      style={{
                        fontSize: 17,
                        color: "rgba(255,255,255,.9)",
                        lineHeight: 1.75,
                        marginBottom: 36,
                        maxWidth: 520,
                        fontWeight: 500,
                        textShadow: "0 1px 3px rgba(0,0,0,.35)",
                      }}
                    >
                      {slide.sub}
                    </p>
                  </>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <button type="button" className="als-btn-gold" onClick={goApply} style={{ fontSize: 15, padding: "14px 32px" }}>
                    {slide.cta} <ArrowRight size={16} />
                  </button>
                  <button type="button" className="als-btn-outline" onClick={goLogin} style={{ fontSize: 15, padding: "14px 28px" }}>
                    Sign In
                  </button>
                </div>

                {/* marginTop auto eats spare height so trust row never collides with CTAs */}
                <div
                  style={{
                    marginTop: "auto",
                    flexShrink: 0,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    paddingTop: "clamp(16px, 2.5vh, 28px)",
                    width: "100%",
                  }}
                >
                  {["10K+ Happy Students", "300+ Expert Teachers", "97% Parent Satisfaction"].map((label) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.96)",
                        padding: "8px 14px",
                        borderRadius: 10,
                        background: "rgba(15,26,60,0.55)",
                        border: "1px solid rgba(255,255,255,.15)",
                        boxShadow: "0 4px 18px rgba(0,0,0,.25)",
                        textShadow: "0 1px 2px rgba(0,0,0,.35)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <CircleCheckBig size={14} color={t.goldL} strokeWidth={2.25} /> {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        ) : null}

        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          style={{
            position: "absolute",
            left: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,.3)",
            background: "rgba(255,255,255,.12)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .2s",
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,.3)",
            background: "rgba(255,255,255,.12)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .2s",
          }}
        >
          <ChevronRight size={20} />
        </button>

        <div
          style={{
            position: "absolute",
            bottom: "clamp(18px, 2.8vh, 30px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            gap: 10,
            paddingTop: 10,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === slideIdx ? 28 : 8,
                height: 8,
                borderRadius: 99,
                border: "none",
                background: i === slideIdx ? t.gold : "rgba(255,255,255,.4)",
                cursor: "pointer",
                transition: "all .3s",
                padding: 0,
              }}
            />
          ))}
        </div>

        {!isBrandSlide ? (
          <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, zIndex: 5 }}>
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%" }}>
              <path d="M0 80L1440 80L1440 30C1200 70 960 10 720 40C480 70 240 10 0 30L0 80Z" fill={t.offW} />
            </svg>
          </div>
        ) : null}
      </section>

      <section style={{ padding: "96px 28px", background: t.offW }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 12 }}>Why Choose Us</div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 900,
                color: t.navy,
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.15,
              }}
            >
              Everything a Young Learner Needs
            </h2>
            <div className="als-divider-gold" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 24 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="als-feature-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${t.navy}15, ${t.gold}15)`,
                    border: `1px solid ${t.gold}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.navy,
                    marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: t.navy, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.7 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ActivitiesGallery />

      {/* ── Fee Details Section ────────────────────────────────────────────── */}
      <section style={{ padding: "96px 28px", background: t.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(201,168,76,.1)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(201,168,76,.07)", pointerEvents: "none" }} />
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            background: t.white,
            borderRadius: 20,
            padding: "36px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 12 }}>
              Tuition &amp; Fees
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 900,
                color: t.navy,
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.15,
                marginBottom: 0,
              }}
            >
              Clear, Transparent Pricing
            </h2>
            <div style={{ width: 52, height: 3, borderRadius: 99, background: `linear-gradient(90deg, ${t.gold}, ${t.goldL})`, margin: "16px auto 20px" }} />
            <p style={{ fontSize: 16, color: t.muted, lineHeight: 1.75, maxWidth: 520, margin: "0 auto" }}>
              We believe every family deserves to know exactly what they&apos;re paying for. View our full fee schedule, payment plans, and sibling discounts — all in one place.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 28,
              background: t.navy,
              border: `1px solid ${t.navyL}`,
              borderRadius: 20,
              padding: "36px 48px",
              flexWrap: "wrap",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[
                { icon: "📋", label: "Full Fee Schedule", desc: "Per subject, per term, all year groups" },
                { icon: "💳", label: "Payment Plans", desc: "Flexible monthly and termly options" },
                { icon: "👨‍👩‍👧‍👦", label: "Sibling Discounts", desc: "Special rates for families enrolling multiple children" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${t.gold}18`,
                      border: `1px solid ${t.gold}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.white, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="als-btn-gold"
              onClick={() => goTo("/enrollment/fees")}
              style={{ fontSize: 15, padding: "14px 34px", flexShrink: 0 }}
            >
              View Fee Details <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      <section
        style={{
          padding: "80px 28px",
          background: `linear-gradient(135deg, ${t.navyD} 0%, ${t.navy} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage: `radial-gradient(circle, ${t.gold} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="als-gamif-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 14 }}>Designed for Young Learners</div>
              <h2
                style={{
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  fontWeight: 900,
                  color: t.white,
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: 1.2,
                  marginBottom: 20,
                }}
              >
                Learning That Rewards Every Step
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,.7)", lineHeight: 1.7, marginBottom: 32 }}>
                Children learn best when they are motivated. Our gamified platform rewards effort at every stage — turning homework into an adventure and lessons into achievements.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: <Sparkles size={16} />, label: "Earn XP points for completing lessons and quizzes" },
                  { icon: <Trophy size={16} />, label: "Unlock badges and certificates as skills grow" },
                  { icon: <Zap size={16} />, label: "Daily streaks and leaderboards keep children engaged" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: `${t.gold}22`,
                        border: `1px solid ${t.gold}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: t.gold,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Daily XP Earned", val: "1,240 XP", icon: "⭐", color: t.gold, bg: "rgba(201,168,76,.1)", border: "rgba(201,168,76,.25)" },
                { label: "Current Streak", val: "7 Days 🔥", icon: "🔥", color: "#fb923c", bg: "rgba(251,146,60,.1)", border: "rgba(251,146,60,.25)" },
                { label: "Achievements", val: "12 Unlocked", icon: "🏆", color: "#60a5fa", bg: "rgba(96,165,250,.1)", border: "rgba(96,165,250,.25)" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 22px",
                    borderRadius: 16,
                    background: item.bg,
                    border: `1px solid ${item.border}`,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.5)",
                        textTransform: "uppercase",
                        letterSpacing: ".07em",
                        marginBottom: 3,
                      }}
                    >
                      {item.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.val}</div>
                  </div>
                </motion.div>
              ))}
              <button type="button" className="als-btn-gold" onClick={goApply} style={{ alignSelf: "flex-start", fontSize: 14, padding: "13px 28px", marginTop: 4 }}>
                Join &amp; Start Earning XP <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "96px 28px", background: t.offW }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 12 }}>Testimonials</div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, color: t.navy, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>What Our Community Says</h2>
          <div className="als-divider-gold" style={{ margin: "0 auto 52px" }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              style={{
                background: "#fff",
                border: `1px solid ${t.light}`,
                borderRadius: 24,
                padding: "44px 48px",
                position: "relative",
                boxShadow: "0 8px 40px rgba(27,43,94,.08)",
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  color: t.gold,
                  fontFamily: "serif",
                  lineHeight: 1,
                  position: "absolute",
                  top: 20,
                  left: 32,
                  opacity: 0.35,
                }}
                aria-hidden
              >
                &ldquo;
              </div>
              <StarRating />
              <p
                style={{
                  fontSize: 17,
                  color: t.text,
                  lineHeight: 1.8,
                  marginTop: 18,
                  marginBottom: 28,
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
              >
                &ldquo;{testimonials[testimonialIdx].text}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${t.navy}, ${t.navyL})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: t.gold,
                    fontSize: 16,
                  }}
                >
                  {testimonials[testimonialIdx].name[0]}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.navy }}>{testimonials[testimonialIdx].name}</div>
                  <div style={{ fontSize: 12, color: t.gold, fontWeight: 700 }}>{testimonials[testimonialIdx].role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTestimonialIdx(i)}
                aria-label={`Show testimonial ${i + 1}`}
                style={{
                  width: i === testimonialIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: "none",
                  background: i === testimonialIdx ? t.gold : t.light,
                  cursor: "pointer",
                  padding: 0,
                  transition: "all .3s",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "100px 28px",
          background: `linear-gradient(135deg, ${t.navyD}, ${t.navy} 50%, #243875)`,
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(201,168,76,.15)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(201,168,76,.1)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 46px)",
              fontWeight: 900,
              color: t.white,
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1.15,
              marginBottom: 18,
            }}
          >
            Ready to Give Your Child the Best Start?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.7)", marginBottom: 40, lineHeight: 1.7 }}>
            Join thousands of families already learning with Al Shamail International Academy. Enroll today and watch your child&apos;s confidence and ability grow.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="als-btn-gold" onClick={goApply} style={{ fontSize: 15, padding: "15px 36px" }}>
              Get Started Free <ArrowRight size={16} />
            </button>
            <button type="button" className="als-btn-outline" onClick={goLogin} style={{ fontSize: 15, padding: "15px 28px" }}>
              Sign In
            </button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 20 }}>No credit card required · Free trial available</p>
        </div>
      </section>

      <footer style={{ background: t.navyD, padding: "64px 28px 32px", color: "rgba(255,255,255,.6)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="als-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={publicUrl("logo-full.jpeg")}
                  alt="Al Shamail International Academy"
                  style={{ width: 70, height: 70, objectFit: "contain", display: "block", flexShrink: 0 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: t.white,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      letterSpacing: "-.01em",
                      lineHeight: 1.1,
                    }}
                  >
                    Al Shamail
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.gold,
                      textTransform: "uppercase",
                      letterSpacing: ".18em",
                      lineHeight: 1.4,
                      marginTop: 4,
                    }}
                  >
                    International Academy
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 18, maxWidth: 280, color: "rgba(255,255,255,.5)" }}>
                Providing world-class online education for children of all ages. Structured, fun, and results-driven. Learn. Grow. Excel.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                {["📘", "📷", "🐦"].map((icon, i) => (
                  <div
                    key={i}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            {[
              { heading: "Subjects", links: ["Mathematics", "English & Literacy", "Science", "Geography", "Reading & Comprehension", "Critical Thinking"] },
              { heading: "Academy", links: ["About Us", "Our Teachers", "Testimonials", "Blog", "Careers"] },
              { heading: "Support", links: ["Contact Us", "FAQ", "Privacy Policy", "Terms of Service", "Help Center"] },
            ].map((col) => (
              <div key={col.heading}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: t.gold, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 18 }}>{col.heading}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map((link) => (
                    <span
                      key={link}
                      style={{ fontSize: 13, cursor: "pointer", transition: "color .2s", color: "rgba(255,255,255,.6)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLSpanElement).style.color = t.goldL;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLSpanElement).style.color = "rgba(255,255,255,.6)";
                      }}
                    >
                      {link}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.08)",
              paddingTop: 28,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p style={{ fontSize: 12 }}>© {new Date().getFullYear()} Al Shamail International Academy. All rights reserved.</p>
            <p style={{ fontSize: 12, color: t.gold }}>Learn · Grow · Excel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
