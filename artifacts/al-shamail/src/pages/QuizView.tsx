import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  useGetLesson,
  useGetLessonQuiz,
  useSubmitQuiz,
  getGetLessonQueryKey,
  getGetCourseQueryKey,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { B } from "@/lib/brand";
import {
  DashboardLayout,
  Card,
  Pill,
  GoldButton,
} from "@/components/DashboardLayout";
import { toast } from "sonner";

function resolveImageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const API_BASE = import.meta.env.VITE_API_BASE || "/api";
  const normalized = url.startsWith("/") ? url.slice(1) : url;
  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  return `${baseUrl}${normalized}`;
}

export default function QuizView() {
  const [, params] = useRoute<{ id: string }>("/lessons/:id/quiz");
  const lessonId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const lessonQ = useGetLesson(lessonId, { query: { enabled: lessonId > 0 } });
  const quizQ = useGetLessonQuiz(lessonId, { query: { enabled: lessonId > 0 } });
  const submit = useSubmitQuiz();

  const lesson: any = lessonQ.data;

  const quiz: any = quizQ.data;
  const pageTitle = lesson?.course?.title ?? lesson?.course?.subject ?? lesson?.title ?? "Quiz";
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<any | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showBadgePopup, setShowBadgePopup] = useState(false);
  const [badgePopupBadge, setBadgePopupBadge] = useState<any | null>(null);

  const allAnswered =
    quiz?.questions?.length &&
    quiz.questions.every((q: any) => typeof answers[q.id] === "number");

  const onSubmit = async () => {
    if (!quiz || !allAnswered) return;
    
    const r = await submit.mutateAsync({
      id: quiz.id,
      data: {
        answers: quiz.questions.map((q: any) => ({
          questionId: q.id,
          choiceIndex: answers[q.id],
        })),
      },
    });
    setResult(r);
    
    // Use newBadges directly from the server response — no before/after comparison needed
    const newBadges = (r as any).newBadges ?? [];
    console.log("Quiz - New badges from server:", newBadges.length, newBadges);
    
    // Show quiz completion toast
    toast.success("Quiz Submitted!", { description: r?.passed ? "You passed!" : "Keep practicing!" });
    
    // Show badge toasts for new badges
    if (newBadges.length > 0) {
      newBadges.forEach((badge: any) => {
        toast.success("Badge Earned!", { description: badge.name });
      });
    }
    
    // Refresh gamification cache in the background
    qc.invalidateQueries({ queryKey: ["my-gamification"] });
    
    if (r?.passed) {
      await qc.invalidateQueries({ queryKey: getGetLessonQueryKey(lessonId), exact: true, refetchType: "all" });
      if (lesson?.courseId) {
        await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(lesson.courseId), exact: true, refetchType: "all" });
      }
    }
    await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  return (
    <DashboardLayout title={pageTitle} subtitle="">
      <div style={{ marginBottom: 18, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!result && lesson?.courseId && (
          <Link
            href={`/courses/${lesson.courseId}`}
            style={{
              position: "absolute",
              left: 0,
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
            <ArrowLeft size={13} /> Back to Course
          </Link>
        )}
        {quiz?.title && (
          <div style={{ fontSize: 16, fontWeight: 800, color: B.navy, textAlign: "center" }}>{quiz.title}</div>
        )}
      </div>

      {!quiz ? (
        <div style={{ color: B.muted }}>Loading quiz…</div>
      ) : result ? (
        <Card>
          <div
            style={{
              textAlign: "center",
              padding: "10px 0 20px",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: `${result.percentage >= 70 ? B.success : B.warning}22`,
                color: result.percentage >= 70 ? B.success : B.warning,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              {result.percentage >= 70 ? (
                <Trophy size={36} />
              ) : (
                <Sparkles size={36} />
              )}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 800,
                fontSize: 36,
                color: B.navy,
                marginTop: 12,
              }}
            >
              {result.percentage}%
            </div>
            <div style={{ color: B.muted, marginTop: 4 }}>
              {result.score} of {result.total} correct
            </div>
            {result.xpAwarded > 0 && (
              <div
                style={{
                  marginTop: 14,
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  color: B.gold,
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                <Sparkles size={18} /> +{result.xpAwarded} XP
              </div>
            )}
            {result.leveledUp && (
              <div
                style={{
                  marginTop: 8,
                  color: B.navy,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                }}
              >
                <Trophy size={16} color={B.gold} /> Level up! Now Level {result.level}
              </div>
            )}
            {result.newBadges?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: B.muted, fontWeight: 700 }}>
                  Badges earned
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {result.newBadges.map((b: any) => (
                    <span
                      key={b.id}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        background: `${b.color}22`,
                        color: b.color,
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      🏅 {b.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${B.light}`, paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: B.navy, marginBottom: 10 }}>
              Review answers
            </div>
            {quiz.questions.map((q: any, qi: number) => {
              const userIdx = answers[q.id];
              const image = q.image || q.img || q.imageUrl || q.image_url || q.imageDataUrl || q.dataUrl || null;
              const correctness = result.correctness.find(
                (c: any) => c.questionId === q.id,
              );
              const isCorrect = correctness?.correct;
              const correctIdx = correctness?.correctIndex;
              return (
                <div
                  key={q.id}
                  style={{
                    background: B.offW,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    borderLeft: `4px solid ${isCorrect ? B.success : B.error}`,
                  }}
                >
                  <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>
                    {qi + 1}. {q.prompt}
                  </div>
                  {image && (
                    <img
                      src={image}
                      alt="Question"
                      style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 8, cursor: "pointer" }}
                      onClick={() => setLightboxSrc(image)}
                    />
                  )}
                  <div style={{ marginTop: 6, fontSize: 13, display: "grid", gap: 4 }}>
                    {q.choices.map((c: string, i: number) => {
                      const isUser = i === userIdx;
                      const isRight = i === correctIdx;
                      const color = isRight ? B.success : isUser ? B.error : B.muted;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color,
                            fontWeight: isRight || isUser ? 700 : 500,
                          }}
                        >
                          {isRight ? (
                            <CheckCircle2 size={14} />
                          ) : isUser ? (
                            <XCircle size={14} />
                          ) : (
                            <span style={{ width: 14 }} />
                          )}
                          {c}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: `${B.navy}08`, borderRadius: 8, fontSize: 12, color: B.navy, lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Explanation:</div>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              style={{
                background: "transparent",
                border: `1.5px solid ${B.gold}`,
                color: B.gold,
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Retry quiz
            </button>
            {lesson?.courseId && (
              <Link
                href={`/courses/${lesson.courseId}`}
                style={{
                  background: B.gold,
                  color: B.white,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ArrowLeft size={14} /> Back to course
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <Card>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Pill color={B.gold}>
              <Sparkles size={11} /> {quiz.xpReward} XP
            </Pill>
            <Pill color={B.navy}>{quiz.questions.length} questions</Pill>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quiz.questions.map((q: any, qi: number) => {
              const image = q.image || q.img || q.imageUrl || q.image_url || q.imageDataUrl || q.dataUrl || null;
              return (
                <div
                  key={q.id}
                  style={{
                    background: B.offW,
                    borderRadius: 14,
                    padding: 16,
                    border: `1.5px solid ${B.light}`,
                  }}
                >
                  <div style={{ fontWeight: 800, color: B.navy, fontSize: 15 }}>
                    {qi + 1}. {q.prompt}
                  </div>
                  {image && (
                    <img
                      src={image}
                      alt="Question"
                      style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 8, marginBottom: 8, cursor: "pointer" }}
                      onClick={() => setLightboxSrc(image)}
                    />
                  )}
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {q.choices.map((c: string, i: number) => {
                      const selected = answers[q.id] === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setAnswers({ ...answers, [q.id]: i })}
                          style={{
                            textAlign: "left",
                            background: selected ? `${B.navy}11` : B.white,
                            border: `1.5px solid ${selected ? B.navy : B.light}`,
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontFamily: "inherit",
                            fontSize: 14,
                            fontWeight: 600,
                            color: B.text,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: `2px solid ${selected ? B.navy : B.muted}`,
                              background: selected ? B.navy : "transparent",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            <GoldButton onClick={onSubmit} disabled={!allAnswered || submit.isPending} full>
              Submit quiz
            </GoldButton>
          </div>
        </Card>
      )}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxSrc}
            alt="Preview"
            style={{ maxWidth: "94%", maxHeight: "94%", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}
          />
        </div>
      )}
      {showBadgePopup && badgePopupBadge && (
        <div
          onClick={() => setShowBadgePopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: B.white,
              borderRadius: 24,
              padding: 32,
              textAlign: "center",
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              animation: "scaleIn 0.4s ease-out",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: B.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              🎉 Badge Earned!
            </div>
            {badgePopupBadge.imageUrl ? (
              <img
                src={resolveImageUrl(badgePopupBadge.imageUrl) || badgePopupBadge.imageUrl}
                alt={badgePopupBadge.name}
                style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto 16px", animation: "bounce 1s ease-in-out infinite" }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${badgePopupBadge.color || B.gold} 0%, ${badgePopupBadge.color || B.gold}cc 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  margin: "0 auto 16px",
                  animation: "bounce 1s ease-in-out infinite",
                }}
              >
                🏆
              </div>
            )}
            <div style={{ fontSize: 24, fontWeight: 800, color: B.navy, marginBottom: 8 }}>
              {badgePopupBadge.name}
            </div>
            <div style={{ fontSize: 14, color: B.muted, marginBottom: 24, lineHeight: 1.5 }}>
              {badgePopupBadge.description}
            </div>
            <button
              onClick={() => {
                setShowBadgePopup(false);
                if (badgePopupBadge) {
                  toast.success("Badge Earned!", { description: badgePopupBadge.name });
                }
              }}
              style={{
                background: B.gold,
                color: B.white,
                border: "none",
                borderRadius: 12,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Awesome!
            </button>
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
    </DashboardLayout>
  );
}
