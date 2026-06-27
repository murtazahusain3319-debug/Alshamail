import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Sparkles, Trophy, ClipboardList,
  BookOpen, Play, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  useGetLesson, useCompleteLesson, useGetLessonQuiz, useGetCurrentUser,
  getGetLessonQueryKey, getGetCourseQueryKey, getGetCurrentUserQueryKey,
  getListMyEnrollmentsQueryKey,
} from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import { API_BASE } from "@/lib/api-base";
import { DashboardLayout, Card, Pill, GoldButton } from "@/components/DashboardLayout";

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const normalized = String(url).trim();
  if (!normalized) return undefined;
  if (normalized.startsWith("data:") || normalized.startsWith("blob:") || /^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith("/api/uploads/")) {
    const baseUrl = API_BASE.replace(/\/api\/?$/, "");
    const cleanPath = normalized.replace(/^\/api/, "");
    return `${baseUrl}${cleanPath}`;
  }
  if (normalized.startsWith("/uploads/")) {
    const baseUrl = API_BASE.replace(/\/api\/?$/, "");
    return `${baseUrl}${normalized}`;
  }
  if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/${normalized}`;
}

/* ── Reading renderer ── */
function ReadingContent({ content }: { content: string }) {
  const lines = (content ?? "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let buf: string[] = [], listBuf: string[] = [];

  const flushBuf = () => {
    if (!buf.length) return;
    nodes.push(<p key={`p${nodes.length}`} style={{ margin: "0 0 18px", lineHeight: 1.85, color: "#374151" }}>{renderInline(buf.join(" "))}</p>);
    buf = [];
  };
  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      <ul key={`ul${nodes.length}`} style={{ margin: "0 0 18px 0", padding: "0 0 0 24px", listStyle: "disc" }}>
        {listBuf.map((it, i) => (
          <li key={i} style={{ marginBottom: 7, lineHeight: 1.75, color: "#374151" }}>
            {renderInline(it)}
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBuf(); flushList(); continue; }
    if (line.startsWith("# ")) {
      flushBuf(); flushList();
      nodes.push(
        <h2 key={`h${nodes.length}`} style={{
          fontFamily: "'Playfair Display',serif", fontWeight: 900, color: B.navy,
          fontSize: 26, margin: "28px 0 16px", lineHeight: 1.2,
          borderBottom: `2px solid ${B.gold}44`, paddingBottom: 10,
        }}>
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushBuf(); flushList();
      nodes.push(<h3 key={`h${nodes.length}`} style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, color: B.navy, fontSize: 19, margin: "22px 0 10px" }}>{renderInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith("### ")) {
      flushBuf(); flushList();
      nodes.push(<h4 key={`h${nodes.length}`} style={{ fontWeight: 800, color: B.navy, fontSize: 15, margin: "16px 0 6px" }}>{renderInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith("> ")) {
      flushBuf(); flushList();
      nodes.push(
        <blockquote key={`q${nodes.length}`} style={{
          margin: "0 0 18px", padding: "16px 22px",
          borderLeft: `5px solid ${B.gold}`, background: `${B.gold}0E`,
          borderRadius: "0 14px 14px 0", color: B.navy,
          fontWeight: 600, fontStyle: "italic", fontSize: 15.5, lineHeight: 1.7,
        }}>
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) { flushBuf(); listBuf.push(line.replace(/^[-*]\s+/, "")); continue; }
    flushList(); buf.push(line);
  }
  flushBuf(); flushList();
  return <>{nodes}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0; let m; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`b${i++}`} style={{ color: B.navy, fontWeight: 800 }}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v"); if (v) return v;
      const parts = u.pathname.split("/"); const i = parts.indexOf("embed");
      if (i >= 0) return parts[i + 1] ?? null;
    }
  } catch { return null; }
  return null;
}

/* ══ MAIN ══ */
export default function LessonView() {
  const [, params] = useRoute<{ id: string }>("/lessons/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const me = useGetCurrentUser();

  const lessonQ = useGetLesson(id, { query: { enabled: id > 0 } });
  const quizQ = useGetLessonQuiz(id, { query: { enabled: id > 0, retry: false } });
  const complete = useCompleteLesson();

  const lesson: any = lessonQ.data;
  const quiz: any = (quizQ as any).data;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiFrameRef = useRef<number | null>(null);
  const confettiRunningRef = useRef(false);
  const confettiParticlesRef = useRef<any[]>([]);
  const [watched, setWatched] = useState(0);
  const [reward, setReward] = useState<{ xpAwarded: number; leveledUp: boolean; level: number; newBadges: any[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [youtubeEnded, setYoutubeEnded] = useState(false);
  const [notifications, setNotifications] = useState<{id: string; title: string; description: string}[]>([]);
  const youtubePlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const completingRef = useRef(false);

  useEffect(() => {
    console.log("LessonView mounted");

    return () => {
      console.log("LessonView unmounted");
    };
  }, []);

  useEffect(() => {
    setReward(null);
    setWatched(0);
    setVideoError(null);
    setYoutubeEnded(false);
    setNotifications([]);
    stopConfetti();
    // Reset auto-completion refs when lesson changes
    hasAutoCompletedRef.current = null;
    hasAutoCompletedVideoRef.current = false;
  }, [id]);

  const resizeConfettiCanvas = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  };

  const createConfettiParticles = () => {
    const canvas = confettiCanvasRef.current;
    const width = canvas ? canvas.width / window.devicePixelRatio : window.innerWidth;
    const particles: any[] = [];
    const colors = [B.gold, B.navy, B.goldL, "#f97316", "#10b981"];
    for (let i = 0; i < 80; i += 1) {
      particles.push({
        x: Math.random() * width,
        y: -Math.random() * 40,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 3,
        size: 7 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * Math.PI,
        tiltSpeed: 0.05 + Math.random() * 0.05,
        life: 100 + Math.round(Math.random() * 40),
      });
    }
    confettiParticlesRef.current = particles;
  };

  const drawConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, width, height);
    const particles = confettiParticlesRef.current;
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0.2, Math.min(1, p.life / 120));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.55, p.size, p.tilt, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const stopConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (confettiFrameRef.current) {
      window.cancelAnimationFrame(confettiFrameRef.current);
      confettiFrameRef.current = null;
    }
    confettiRunningRef.current = false;
    setConfettiActive(false);
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      ctx?.clearRect(0, 0, width, height);
    }
  };

  const animateConfetti = () => {
    const particles = confettiParticlesRef.current;
    const canvas = confettiCanvasRef.current;
    if (!canvas || !confettiRunningRef.current) return;
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    let active = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.tilt += p.tiltSpeed;
      p.vy += 0.05;
      p.life -= 1;
      if (p.life > 0 && p.y < height + 50) active = true;
    }
    drawConfetti();
    if (active) {
      confettiFrameRef.current = window.requestAnimationFrame(animateConfetti);
    } else {
      stopConfetti();
    }
  };

  const startConfetti = () => {
    if (confettiRunningRef.current) return;
    resizeConfettiCanvas();
    createConfettiParticles();
    confettiRunningRef.current = true;
    setConfettiActive(true);
    if (confettiFrameRef.current) window.cancelAnimationFrame(confettiFrameRef.current);
    confettiFrameRef.current = window.requestAnimationFrame(animateConfetti);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setWatched(Math.min(100, Math.round((v.currentTime / v.duration) * 100)));
  };

  const handleVideoError = useCallback(() => {
    setVideoError("The video could not be loaded. Please refresh and try again.");
  }, []);

  const resolvedVideoUrl = useMemo(() => {
    const value = lesson?.videoUrl;
    if (!value) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    if (normalized.startsWith("data:") || normalized.startsWith("blob:") || /^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    // Handle paths that already include /api/uploads/ - strip the /api prefix
    if (normalized.startsWith("/api/uploads/")) {
      const baseUrl = API_BASE.replace(/\/api\/?$/, "");
      const cleanPath = normalized.replace(/^\/api/, "");
      return `${baseUrl}${cleanPath}`;
    }
    // Handle server upload paths - strip /api from base URL for static file serving
    if (normalized.startsWith("/uploads/")) {
      const baseUrl = API_BASE.replace(/\/api\/?$/, "");
      return `${baseUrl}${normalized}`;
    }
    if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
    return `${API_BASE}/${normalized}`;
  }, [lesson?.videoUrl]);

  const updateYouTubeProgress = useCallback(() => {
    const player = youtubePlayerRef.current;
    if (!player?.getCurrentTime || !player?.getDuration) return;
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    if (duration) {
      setWatched(Math.min(100, Math.round((currentTime / duration) * 100)));
    }
  }, []);

  const user = me.data?.user;
  const isStaff = !!user?.isAdmin || user?.role === "teacher";
  const isReading = lesson?.kind === "reading";
  const completionReady = lesson?.completed || isReading || watched >= 80;
  const isYouTube = !isReading && resolvedVideoUrl && !resolvedVideoUrl.startsWith("data:") && (resolvedVideoUrl.includes("youtube.com") || resolvedVideoUrl.includes("youtu.be"));
  const youTubeId = isYouTube ? extractYouTubeId(resolvedVideoUrl) : null;
  const nextVideoLesson = lesson?.next?.kind === "video" ? lesson.next : lesson?.nextVideo ?? null;
  const prevVideoLesson = lesson?.prev?.kind === "video" ? lesson.prev : lesson?.prevVideo ?? null;
  const nextLesson = lesson?.next ?? null;
  const prevLesson = lesson?.prev ?? null;

  const pageTitle = lesson?.course?.title ?? lesson?.course?.subject ?? lesson?.title ?? "Lesson";

  console.log("LessonView render check:", { lessonId: id, lessonCompleted: lesson?.completed, isReading, watched, reward: !!reward });

  const onComplete = useCallback(async () => {
    if (completingRef.current) return;

    completingRef.current = true;

    console.log("onComplete called");
    if (!isReading && watched < 80) {
      setErrorMessage("Watch at least 80% of the lesson before marking it complete.");
      completingRef.current = false;
      return;
    }

    try {
      const r = await complete.mutateAsync({ id });
      console.log("Lesson complete response:", r);
      const newBadges = (r as any).newBadges ?? [];
      console.log("New badges from server:", newBadges.length, newBadges);
      // Setting reward triggers the useEffect below which fires the toasts
      setReward({ xpAwarded: (r as any).xpAwarded, leveledUp: (r as any).leveledUp, level: (r as any).level, newBadges });
      
      toast.success("Lesson completed! 🎉", {
        description: lesson?.title,
        duration: 4000,
      });

      newBadges.forEach((badge: any, i: number) => {
        setTimeout(() => {
          toast("🏅 Badge Earned!", {
            description: badge.name,
            duration: 6000,
            style: {
              background: "#1b2b5e",
              color: "#fff",
              border: "1.5px solid rgba(218,165,32,.5)",
            },
          });
        }, (i + 1) * 700);
      });
      
      qc.invalidateQueries({ queryKey: ["my-gamification"] });
      qc.invalidateQueries({ queryKey: getGetLessonQueryKey(id) });
      if (lesson?.courseId) qc.invalidateQueries({ queryKey: getGetCourseQueryKey(lesson.courseId) });
      startConfetti();
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Failed to complete lesson.");
      // Revalidate cache to ensure consistency
      await qc.invalidateQueries({ queryKey: getGetLessonQueryKey(id) });
      if (lesson?.courseId) await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(lesson.courseId) });
    } finally {
      completingRef.current = false;
    }
  }, [id, qc, complete, lesson?.courseId, lesson?.title, isReading, watched]);

  const onVideoEnded = () => {
    if (lesson && !lesson?.completed && !complete.isPending) {
      if (!isReading && watched < 80) {
        setErrorMessage("Watch at least 80% of the lesson before marking it complete.");
        return;
      }
      onComplete();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (confettiRunningRef.current) resizeConfettiCanvas();
    };
    resizeConfettiCanvas();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (confettiFrameRef.current) window.cancelAnimationFrame(confettiFrameRef.current);
    };
  }, []);

  const readingEndRef = useRef<HTMLDivElement | null>(null);
  const hasAutoCompletedRef = useRef<number | null>(null);
  const hasAutoCompletedVideoRef = useRef<boolean>(false);

  useEffect(() => {
    hasAutoCompletedRef.current = null;
    hasAutoCompletedVideoRef.current = false;
  }, [id]);

  // Auto-complete video lesson when 80% watched
  useEffect(() => {
    console.log("Auto-complete check:", { isReading, isStaff, lessonCompleted: lesson?.completed, hasAutoCompleted: hasAutoCompletedVideoRef.current, watched, isPending: complete.isPending, hasReward: !!reward });
    if (isReading || isStaff || lesson?.completed || hasAutoCompletedVideoRef.current) return;
    if (watched >= 80 && !complete.isPending && !reward) {
      console.log("Auto-completing lesson");
      hasAutoCompletedVideoRef.current = true;
      onComplete();
    }
  }, [watched, isReading, isStaff, lesson?.completed, complete.isPending, reward, onComplete]);

  useEffect(() => {
    if (!isYouTube || !youTubeId) {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const initializePlayer = () => {
      const container = document.getElementById("youtube-lesson-player");
      if (!container || youtubePlayerRef.current) return;
      youtubePlayerRef.current = new (window as any).YT.Player(container, {
        videoId: youTubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          disablekb: 0,
          fs: 1,
          autoplay: 0,
          playsinline: 1,
          controls: 1,
          loop: 0,
          html5: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            updateYouTubeProgress();
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              // Video ended - stop to prevent recommendations from showing
              if (youtubePlayerRef.current) {
                youtubePlayerRef.current.stopVideo();
                setYoutubeEnded(true);
                if (lesson && !lesson?.completed && !complete.isPending && watched >= 80) {
                  onComplete();
                }
              }
            } else {
              setYoutubeEnded(false);
            }
          },
        },
      });
    };

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      (window as any).onYouTubeIframeAPIReady = initializePlayer;
      document.body.appendChild(tag);
    } else {
      initializePlayer();
    }

    progressIntervalRef.current = window.setInterval(updateYouTubeProgress, 500);

    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, youTubeId, updateYouTubeProgress]);

  useEffect(() => {
    if (!isReading || isStaff || lesson?.completed || hasAutoCompletedRef.current === id) return;

    const minMs = Math.max(4000, (lesson?.durationMinutes ?? 1) * 60 * 1000 * 0.25);
    const t = setTimeout(() => {
      if (hasAutoCompletedRef.current === id) return;
      hasAutoCompletedRef.current = id;
      onComplete();
    }, minMs);

    return () => clearTimeout(t);
  }, [id, isReading, isStaff, lesson?.completed, lesson?.durationMinutes, onComplete]);

  return (
    <>
    <DashboardLayout
      title={pageTitle}
    >
      <div style={{ marginBottom: 18 }}>
        {lesson?.courseId && (
          <Link
            href={`/courses/${lesson.courseId}`}
            style={{
              color: B.navy,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1.5px solid rgba(0,0,0,.18)`,
              background: B.white,
            }}
          >
            <ArrowLeft size={13}/> Back to Course
          </Link>
        )}
      </div>

      {lessonQ.isError ? (
        <div style={{ padding: 28, borderRadius: 18, background: B.offW, border: `1px solid ${B.light}`, color: B.error }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Lesson could not be loaded.</div>
          <div>{String(lessonQ.error?.message ?? "Lesson not found.")}</div>
        </div>
      ) : !lesson ? (
        <div style={{ color: B.muted }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* ── LEFT: Content ── */}
          <div style={{ minWidth: 0 }}>
            {isReading ? (
              /* Reading lesson - beautiful article layout */
              <div style={{
                background: B.white, borderRadius: 20, border: `1px solid ${B.light}`,
                boxShadow: "0 4px 24px rgba(27,43,94,.07)", overflow: "hidden",
              }}>
                {/* Reading header */}
                <div style={{
                  padding: "28px 36px 22px",
                  background: `linear-gradient(135deg, ${B.navyD} 0%, ${B.navy} 100%)`,
                  color: B.white, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, opacity: .05, backgroundImage: `radial-gradient(circle, ${B.gold} 1px, transparent 1px)`, backgroundSize: "20px 20px" }}/>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${B.gold}28`, border: `1px solid ${B.gold}55`, padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, color: B.goldL, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>
                    <BookOpen size={12}/> Reading Lesson
                  </div>
                  <h1 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 24, margin: 0, lineHeight: 1.2 }}>{lesson.title}</h1>
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12.5, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>
                    {lesson.durationMinutes > 0 && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={12}/> {lesson.durationMinutes} min read</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Sparkles size={12} color={B.goldL}/> {lesson.xpReward ?? 50} XP on completion</span>
                    {lesson?.completed && <span style={{ display: "flex", alignItems: "center", gap: 5, color: B.success }}><CheckCircle2 size={12}/> Completed</span>}
                  </div>
                </div>

                {/* Article body */}
                <div style={{ padding: "36px 40px", fontSize: 16, lineHeight: 1.85, fontFamily: "'DM Sans', Georgia, serif", maxWidth: 780 }}>
                  {lesson.content?.trim() ? (
                    <ReadingContent content={lesson.content}/>
                  ) : (
                    <p style={{ color: B.muted, fontStyle: "italic" }}>No reading content has been added to this lesson yet.</p>
                  )}
                  <div ref={readingEndRef} style={{ height: 1 }} />

                  {/* Reading lesson navigation */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 40,
                    paddingTop: 24,
                    borderTop: `1.5px solid ${B.light}`,
                  }}>
                    <button
                      type="button"
                      onClick={() => prevLesson && navigate(`/lessons/${prevLesson.id}`)}
                      disabled={!prevLesson}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "11px 20px", borderRadius: 12,
                        background: prevLesson ? B.white : "rgba(255,255,255,.5)",
                        border: `1.5px solid ${prevLesson ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.07)"}`,
                        color: prevLesson ? B.navy : B.muted,
                        fontSize: 13, fontWeight: 700,
                        boxShadow: prevLesson ? "0 2px 8px rgba(27,43,94,.06)" : "none",
                        cursor: prevLesson ? "pointer" : "not-allowed",
                        opacity: prevLesson ? 1 : 0.45,
                      }}
                    >
                      <ChevronLeft size={15}/> View previous lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => nextLesson && navigate(`/lessons/${nextLesson.id}`)}
                      disabled={!nextLesson}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "11px 20px", borderRadius: 12,
                        background: nextLesson ? B.navy : "rgba(255,255,255,.5)",
                        border: `1.5px solid ${nextLesson ? B.navy : "rgba(0,0,0,.07)"}`,
                        color: nextLesson ? B.white : B.muted,
                        fontSize: 13, fontWeight: 700,
                        boxShadow: nextLesson ? "0 4px 16px rgba(27,43,94,.18)" : "none",
                        cursor: nextLesson ? "pointer" : "not-allowed",
                        opacity: nextLesson ? 1 : 0.45,
                      }}
                    >
                      View next lesson <ChevronRight size={15}/>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Video lesson */
              <>
                <div style={{
                    position: "relative",
                    background: "#000", borderRadius: 18, overflow: "hidden",
                    boxShadow: "0 8px 40px rgba(0,0,0,.25)",
                    marginBottom: 16, maxWidth: "100%", margin: "0 auto 16px",
                    display: "flex", flexDirection: "column",
                    aspectRatio: "16 / 9", width: "100%",
                  }}>
                    <div style={{ flex: "1 1 auto", minHeight: 0, width: "100%", position: "relative" }}>
                      {isYouTube && youTubeId ? (
                        <>
                          <div id="youtube-lesson-player" key={youTubeId} style={{ width: "100%", height: "100%" }} />
                          {youtubeEnded && (
                            <div style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.85)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10,
                            }}>
                              <button
                                onClick={() => {
                                  setYoutubeEnded(false);
                                  if (youtubePlayerRef.current) {
                                    youtubePlayerRef.current.seekTo(0);
                                    youtubePlayerRef.current.playVideo();
                                  }
                                }}
                                style={{
                                  padding: "16px 32px",
                                  borderRadius: 12,
                                  background: B.gold,
                                  color: B.white,
                                  border: "none",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <span>▶</span> Replay Video
                              </button>
                              <div style={{ color: B.white, fontSize: 14, marginTop: 12 }}>
                                {watched}% watched
                              </div>
                            </div>
                          )}
                        </>
                      ) : resolvedVideoUrl ? (
                        <>
                          <video key={resolvedVideoUrl} ref={videoRef} src={resolvedVideoUrl} controls crossOrigin="anonymous" onTimeUpdate={onTimeUpdate} onEnded={onVideoEnded} onError={handleVideoError} style={{ width: "100%", height: "100%", display: "block" }}/>
                          {videoError && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", color: "#fff", padding: 20, textAlign: "center" }}>
                              <div>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Video Error</div>
                                <div style={{ fontSize: 14 }}>{videoError}</div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: B.offW, background: "#111827" }}>
                          No video is available for this lesson yet.
                        </div>
                      )}
                    </div>
                  </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: B.muted, fontWeight: 700, marginBottom: 5 }}>
                    <span>Watched</span><span>{watched}%</span>
                  </div>
                  <div style={{ background: B.light, borderRadius: 999, height: 5, overflow: "hidden" }}>
                    <div style={{ width: `${watched}%`, height: "100%", background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})`, transition: "width .5s" }}/>
                  </div>
                </div>

              </>
            )}

            {/* Lesson meta card */}
            <Card style={{ marginTop: 16 }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, color: B.navy, margin: "0 0 10px", fontSize: 20 }}>{lesson.title}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {lesson.durationMinutes > 0 && <Pill color={B.navy}><Clock size={11}/> {lesson.durationMinutes} min</Pill>}
                <Pill color={B.gold}><Sparkles size={11}/> {lesson.xpReward} XP</Pill>
                {lesson.hasQuiz && <Pill color={B.navyL}>Quiz available</Pill>}
                {lesson?.completed && <Pill color={B.success}><CheckCircle2 size={11}/> Completed</Pill>}
              </div>
              {lesson.description && (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#374151" }}>
                  {lesson.description}
                </p>
              )}
            </Card>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Complete card */}
            <Card title={lesson?.completed ? "Good job 👍" : "Complete to earn XP"}>
              {errorMessage ? (
                <div style={{ color: B.error, fontWeight: 700, fontSize: 14, lineHeight: 1.6 }}>
                  {errorMessage}
                </div>
              ) : lesson?.completed ? (
                <>
                  <div style={{ color: B.success, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontSize: 14, marginBottom: reward ? 16 : 0 }}>
                    <CheckCircle2 size={18}/> Lesson marked complete
                  </div>
                </>
              ) : (
                <GoldButton onClick={() => { console.log("Complete button clicked"); onComplete(); }} disabled={complete.isPending || (!isReading && !completionReady)} full>
                  <CheckCircle2 size={15}/>
                  {completionReady ? `Complete (+${lesson?.xpReward ?? 50} XP)` : `Watch ${80 - watched}% more to unlock`}
                </GoldButton>
              )}

              {reward && (
                <div style={{
                  background: `linear-gradient(135deg, ${B.gold}18, ${B.goldL}28)`,
                  border: `1.5px solid ${B.gold}55`, borderRadius: 14, padding: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: B.navy, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
                    <Sparkles size={18} color={B.gold}/> +{reward.xpAwarded} XP earned!
                  </div>
                  {reward.leveledUp && (
                    <div style={{ color: B.gold, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, fontSize: 14, marginBottom: 6 }}>
                      <Trophy size={15}/> Level up! Now Level {reward.level}
                    </div>
                  )}
                  {reward.newBadges.map((b: any) => (
                    <div key={b.id} style={{ color: B.navy, fontWeight: 700, fontSize: 13, marginTop: 4 }}>🏅 {b.name}</div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quiz card */}
            {lesson.hasQuiz && quiz && (
              <Card title="Lesson Quiz">
                <div style={{ fontSize: 14, color: B.text, marginBottom: 6, fontWeight: 600 }}>{quiz.title}</div>
                <div style={{ fontSize: 12, color: B.muted, marginBottom: 14 }}>
                  {quiz.questions?.length ?? 0} questions · up to {quiz.xpReward} XP
                </div>
                <Link href={`/lessons/${id}/quiz`} style={{
                  background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                  color: B.white, textDecoration: "none",
                  padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <ClipboardList size={14}/> Take Quiz
                </Link>
              </Card>
            )}

            {/* Video lesson navigation */}
            {!isReading && (
              <>
                <button
                  type="button"
                  onClick={() => nextVideoLesson && navigate(`/lessons/${nextVideoLesson.id}`)}
                  disabled={!nextVideoLesson}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 16px", borderRadius: 14,
                    background: nextVideoLesson ? B.white : "rgba(255,255,255,.65)",
                    border: `1.5px solid ${nextVideoLesson ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.08)"}`,
                    color: nextVideoLesson ? B.navy : B.muted,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: nextVideoLesson ? "0 2px 8px rgba(27,43,94,.05)" : "none",
                    cursor: nextVideoLesson ? "pointer" : "not-allowed",
                    opacity: nextVideoLesson ? 1 : 0.6,
                  }}
                >
                  <Play size={14}/> {nextVideoLesson ? "Watch next lesson" : "No next video"}
                </button>
                <button
                  type="button"
                  onClick={() => prevVideoLesson && navigate(`/lessons/${prevVideoLesson.id}`)}
                  disabled={!prevVideoLesson}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 16px", borderRadius: 14,
                    background: prevVideoLesson ? B.white : "rgba(255,255,255,.65)",
                    border: `1.5px solid ${prevVideoLesson ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.08)"}`,
                    color: prevVideoLesson ? B.navy : B.muted,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: prevVideoLesson ? "0 2px 8px rgba(27,43,94,.05)" : "none",
                    cursor: prevVideoLesson ? "pointer" : "not-allowed",
                    opacity: prevVideoLesson ? 1 : 0.6,
                  }}
                >
                  <ChevronLeft size={14}/> {prevVideoLesson ? "Watch previous lesson" : "No previous video"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Confetti canvas — always mounted, invisible until activated */}
      <canvas
        ref={confettiCanvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 9999,
          display: confettiActive ? "block" : "none",
        }}
      />
    </DashboardLayout>

    {/* Inline notifications — guaranteed to show regardless of toast library issues */}
    {notifications.length > 0 && (
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
        {notifications.map(n => (
          <div key={n.id} style={{ background: "#1b2b5e", color: "#fff", borderRadius: 16, padding: "16px 22px", boxShadow: "0 10px 40px rgba(27,43,94,.35)", minWidth: 280, maxWidth: 380, border: "1.5px solid rgba(218,165,32,.4)" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{n.title}</div>
            {n.description && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{n.description}</div>}
          </div>
        ))}
      </div>
    )}
    </>
  );

}
