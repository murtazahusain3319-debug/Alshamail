import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Play, PlusCircle, CheckCircle2, Clock, ArrowLeft, Users,
  BookOpen, Trash2, Sparkles, FileText, Video, Image as ImageIcon,
  X, GripVertical, ChevronLeft, ChevronRight, AlignLeft, Upload, ZoomIn, ZoomOut, Mail,
  HelpCircle, Save, Edit2, Plus, Minus,
} from "lucide-react";
import {
  useGetCourse, useGetCurrentUser, useCreateLesson, useDeleteLesson,
  useEnrollInCourse, useUpdateCourse, useDeleteCourse, useCompleteLesson,
  useListUsers,
  getGetCourseQueryKey, getGetLessonQueryKey, getGetCurrentUserQueryKey, getListCoursesQueryKey, getListMyEnrollmentsQueryKey,
} from "@workspace/api-client-react";
import { useGetCourseMembers, getGetCourseMembersQueryKey } from "@/lib/mock-api";
import { B } from "@/lib/brand";
import { DashboardLayout, Card, Pill, PrimaryButton, GoldButton, inputStyle } from "@/components/DashboardLayout";
import { API_BASE } from "@/lib/api-base";

type LessonKind = "video" | "reading" | "quiz" | "members";

const EMOJI_PRESETS = ["🌙","📖","☪️","✏️","📜","🎓","🕌","📚","🧠","⭐","📝","🔬","🎨","🌍","🕋"];
const COVER_COLORS = [
  "#1B2B5E","#C9A84C","#166534","#be185d","#4338ca","#0f766e","#b45309","#334155",
];

/* ── PDF Slide Player ── */
function PdfSlidePlayer({ pdfUrl, title, onPageChange }: { pdfUrl: string; title?: string; onPageChange?: (page: number, total: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!pdfUrl) return;
    const scriptId = "pdfjs-script";

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!document.getElementById(scriptId)) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script");
            s.id = scriptId;
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = () => res();
            s.onerror = () => rej(new Error("Failed to load PDF.js"));
            document.head.appendChild(s);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js not available");

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load PDF");
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  const renderPage = useCallback(async (pageNum: number, doc: any, scl: number) => {
    if (!doc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scl });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const buffer = document.createElement("canvas");
      buffer.width = viewport.width;
      buffer.height = viewport.height;
      const bufferCtx = buffer.getContext("2d");
      if (!bufferCtx) return;

      canvas.style.opacity = "0";
      const renderTask = page.render({ canvasContext: bufferCtx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.drawImage(buffer, 0, 0);
      canvas.style.opacity = "1";
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Render error:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage, pdfDoc, scale);
  }, [pdfDoc, currentPage, scale, renderPage]);

  useEffect(() => {
    onPageChange?.(currentPage, totalPages);
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      } else if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(p - 1, 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalPages]);

  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  return (
    <div style={{
      background: "#18202e",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,.35)",
      display: "flex",
      flexDirection: "column",
      userSelect: "none",
      width: "fit-content",
      maxWidth: "100%",
      margin: "18px auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: "#111827",
        borderBottom: "1px solid rgba(255,255,255,.07)",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={15} color={B.gold}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", opacity: .85 }}>
            {title ?? "PDF Lesson"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {totalPages > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", fontVariantNumeric: "tabular-nums" }}>
              {currentPage} / {totalPages}
            </span>
          )}
          <button onClick={() => setScale((s) => Math.max(.6, s - .2))} style={iconBtnStyle} title="Zoom out"><ZoomOut size={14}/></button>
          <button onClick={() => setScale((s) => Math.min(3, s + .2))} style={iconBtnStyle} title="Zoom in"><ZoomIn size={14}/></button>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", overflowX: "auto",
        background: "#1e2535",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "18px 14px",
        minHeight: 280,
      }}>
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, margin: "auto", paddingTop: 60 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${B.gold}44`, borderTop: `3px solid ${B.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }}/>
            <span style={{ color: "rgba(255,255,255,.45)", fontSize: 13 }}>Loading PDF…</span>
          </div>
        )}
        {error && (
          <div style={{ color: "#f87171", fontSize: 14, textAlign: "center", margin: "auto", paddingTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            {error}
          </div>
        )}
        {!isLoading && !error && (
          <canvas ref={canvasRef} style={{
            boxShadow: "0 4px 32px rgba(0,0,0,.5)",
            borderRadius: 6,
            width: "auto",
            maxWidth: "100%",
            maxHeight: 520,
            height: "auto",
            display: "block",
            transition: "opacity .15s ease",
          }}/>
        )}
      </div>

      {totalPages > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, padding: "14px 20px",
          background: "#111827",
          borderTop: "1px solid rgba(255,255,255,.07)",
        }}>
          <button onClick={() => goTo(1)} disabled={currentPage === 1} style={navBtnStyle(currentPage === 1)} title="First page">«</button>
          <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} style={{ ...navBtnStyle(currentPage === 1), display: "flex", alignItems: "center", gap: 4 }} title="Previous (← key)"><ChevronLeft size={15}/> Prev</button>
          <div style={{ display: "flex", gap: 5, maxWidth: 280, overflowX: "auto" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} style={{ color: "rgba(255,255,255,.3)", fontSize: 12, padding: "0 4px", alignSelf: "center" }}>…</span>
                ) : (
                  <button key={p} onClick={() => goTo(p as number)} style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: currentPage === p ? `2px solid ${B.gold}` : "1.5px solid rgba(255,255,255,.12)",
                    background: currentPage === p ? `${B.gold}22` : "transparent",
                    color: currentPage === p ? B.gold : "rgba(255,255,255,.45)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    flexShrink: 0,
                  }}>
                    {p}
                  </button>
                )
              )}
          </div>
          <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...navBtnStyle(currentPage === totalPages), display: "flex", alignItems: "center", gap: 4 }} title="Next (→ key)">Next <ChevronRight size={15}/></button>
          <button onClick={() => goTo(totalPages)} disabled={currentPage === totalPages} style={navBtnStyle(currentPage === totalPages)} title="Last page">»</button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.07)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 8,
  color: "rgba(255,255,255,.6)",
  cursor: "pointer",
  padding: "5px 8px",
  display: "flex",
  alignItems: "center",
  transition: "background .15s",
};

const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.07)",
  border: `1px solid rgba(255,255,255,${disabled ? ".05" : ".12"})`,
  borderRadius: 9,
  color: disabled ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.7)",
  cursor: disabled ? "not-allowed" : "pointer",
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 4,
});

/* ── Reading lesson rendered as a pretty card ── */
function ReadingCard({ content }: { content: string }) {
  const lines = (content ?? "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let buf: string[] = [];
  let listBuf: string[] = [];

  const flushBuf = () => {
    if (!buf.length) return;
    nodes.push(<p key={`p${nodes.length}`} style={{ margin: "0 0 14px", color: B.text, lineHeight: 1.8 }}>{renderInline(buf.join(" "))}</p>);
    buf = [];
  };
  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      <ul key={`ul${nodes.length}`} style={{ margin: "0 0 14px 20px", padding: 0 }}>
        {listBuf.map((it, i) => <li key={i} style={{ marginBottom: 5, color: B.text, lineHeight: 1.7 }}>{renderInline(it)}</li>)}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBuf(); flushList(); continue; }
    if (line.startsWith("# ")) {
      flushBuf(); flushList();
      nodes.push(<h2 key={`h${nodes.length}`} style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, color: B.navy, fontSize: 22, margin: "4px 0 14px" }}>{renderInline(line.slice(2))}</h2>);
      continue;
    }
    if (line.startsWith("## ")) {
      flushBuf(); flushList();
      nodes.push(<h3 key={`h${nodes.length}`} style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: B.navy, fontSize: 17, margin: "14px 0 8px" }}>{renderInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith("> ")) {
      flushBuf(); flushList();
      nodes.push(<blockquote key={`q${nodes.length}`} style={{ margin: "0 0 14px", padding: "12px 18px", borderLeft: `4px solid ${B.gold}`, background: B.offW, borderRadius: "0 10px 10px 0", color: B.navy, fontWeight: 600, fontStyle: "italic" }}>{renderInline(line.slice(2))}</blockquote>);
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
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`b${i++}`} style={{ color: B.navy }}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ── Add lesson panel ── */
function AddLessonPanel({
  defaultKind, onSave, onCancel, isLoading, initialLesson, mode,
}: {
  defaultKind: LessonKind; onSave: (data: any) => void; onCancel: () => void; isLoading: boolean;
  initialLesson?: any; mode?: "add" | "edit";
}) {
  const [form, setForm] = useState({
    title: initialLesson?.title ?? "",
    description: initialLesson?.description ?? "",
    kind: (initialLesson?.kind as LessonKind) ?? defaultKind,
    videoUrl: initialLesson?.videoUrl ?? "",
    content: initialLesson?.content ?? "",
    durationMinutes: initialLesson?.durationMin?.toString() ?? "10",
    xpReward: initialLesson?.xpReward?.toString() ?? "20",
  });
  const [videoFileName, setVideoFileName] = useState(initialLesson?.videoUrl ? "Lesson video" : "");
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(initialLesson?.videoUrl ?? null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [pdfFileName, setPdfFileName] = useState(initialLesson?.content?.startsWith("__pdf__:") ? "Lesson PDF" : "");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(initialLesson?.content?.startsWith("__pdf__:") ? initialLesson.content : null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!initialLesson) return;
    setForm({
      title: initialLesson.title ?? "",
      description: initialLesson.description ?? "",
      kind: (initialLesson.kind as LessonKind) ?? defaultKind,
      videoUrl: initialLesson.videoUrl ?? "",
      content: initialLesson.content ?? "",
      durationMinutes: initialLesson.durationMin?.toString() ?? "10",
      xpReward: initialLesson.xpReward?.toString() ?? "20",
    });
    setPdfObjectUrl(initialLesson.content?.startsWith("__pdf__:") ? initialLesson.content : null);
    setPdfFileName(initialLesson.content?.startsWith("__pdf__:") ? "Lesson PDF" : "");
    setVideoFileName(initialLesson.videoUrl ? "Lesson video" : "");
    setVideoObjectUrl(initialLesson.videoUrl ?? null);
  }, [initialLesson, defaultKind]);

  const importVideoFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      window.alert("Please select a video file.");
      return;
    }

    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch(`${API_BASE}/lessons/upload-video`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to upload video.");
      }

      const { videoUrl } = await res.json();
      setVideoObjectUrl(videoUrl);
      setVideoFileName(file.name);
      set("videoUrl", videoUrl);
    } catch (err: any) {
      const localPreviewUrl = window.URL.createObjectURL(file);
      setVideoObjectUrl(localPreviewUrl);
      setVideoFileName(file.name);
      set("videoUrl", localPreviewUrl);
      window.alert(err?.message ?? "The upload did not complete, so a local preview was attached instead.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const importDocFile = (file?: File) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      window.alert("Please select a PDF file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setPdfObjectUrl(dataUrl);
      setPdfFileName(file.name);
      set("content", `__pdf__:${dataUrl}`);
    };
    reader.readAsDataURL(file);
  };

  const canSave = form.title.trim() !== "" &&
    (form.kind === "video"
      ? !!form.videoUrl
      : form.kind === "reading"
      ? !!pdfObjectUrl
      : true);

  return (
    <div style={{ background: `${B.gold}0A`, border: `1.5px dashed ${B.gold}88`, borderRadius: 16, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h4 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, color: B.navy, margin: 0, fontSize: 15 }}>
          {mode === "edit" ? "Edit" : "Add"} {form.kind === "video" ? "Video Lesson" : form.kind === "reading" ? "Reading Lesson" : "Quiz Lesson"}
        </h4>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}><X size={16}/></button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input placeholder="Lesson title *" value={form.title} onChange={(e) => set("title", e.target.value)} style={inputStyle}/>
        <textarea placeholder="Lesson description" value={form.description} onChange={(e) => set("description", e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}/>

        {form.kind === "quiz" ? (
          <div style={{ padding: "14px 16px", background: B.offW, border: `1.5px solid ${B.light}`, borderRadius: 12, color: B.muted, fontSize: 12 }}>
            Save this quiz lesson first, then add MCQ questions, explanations, and optional images.
          </div>
        ) : null}

        {form.kind === "video" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <input placeholder="Video URL (YouTube or .mp4)" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} style={inputStyle}/>
              <button type="button" onClick={() => videoFileRef.current?.click()} disabled={isUploadingVideo} style={{
                border: `1.5px solid ${B.light}`, borderRadius: 10, padding: "10px 14px",
                background: B.white, color: B.navy, cursor: isUploadingVideo ? "wait" : "pointer", fontWeight: 700, fontSize: 13,
                opacity: isUploadingVideo ? 0.6 : 1,
              }}>
                {isUploadingVideo ? "Uploading…" : "Import"}
              </button>
            </div>
            {videoFileName && (
              <div style={{ fontSize: 12, color: B.muted }}>
                Imported: <strong style={{ color: B.navy }}>{videoFileName}</strong>
              </div>
            )}
            <input ref={videoFileRef} type="file" accept="video/*" style={{ display: "none" }} disabled={isUploadingVideo}
              onChange={(e) => { importVideoFile(e.target.files?.[0]); if (e.target) e.target.value = ""; }}/>
          </>
        ) : form.kind === "reading" ? (
          <>
            <input ref={pdfFileRef} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { importDocFile(e.target.files?.[0]); if (e.target) e.target.value = ""; }}/>

            {!pdfObjectUrl ? (
              <button
                type="button"
                onClick={() => pdfFileRef.current?.click()}
                style={{
                  width: "100%", padding: "28px 20px", borderRadius: 14,
                  border: `2px dashed ${B.gold}66`, background: `${B.gold}08`,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 10, color: B.muted,
                }}
              >
                <Upload size={28} color={B.gold}/>
                <div>
                  <div style={{ fontWeight: 700, color: B.navy, fontSize: 14, marginBottom: 3 }}>Import PDF</div>
                  <div style={{ fontSize: 12 }}>Click to browse - PDF files</div>
                </div>
              </button>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 12,
                border: `1.5px solid ${B.success}44`, background: `${B.success}08`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={18} color={B.success}/>
                  <div>
                    <div style={{ fontWeight: 700, color: B.navy, fontSize: 13 }}>{pdfFileName}</div>
                    <div style={{ fontSize: 11, color: B.muted }}>PDF ready to upload</div>
                  </div>
                </div>
                <button type="button" onClick={() => { setPdfObjectUrl(null); setPdfFileName(""); set("content", ""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}>
                  <X size={15}/>
                </button>
              </div>
            )}
          </>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="XP reward" value={form.xpReward} onChange={(e) => set("xpReward", e.target.value)} style={inputStyle} type="number" min={0}/>
          {form.kind === "video" && (
            <input placeholder="Duration (minutes)" value={form.durationMinutes ?? "10"} onChange={(e) => set("durationMinutes", e.target.value)} style={inputStyle} type="number" min={0}/>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <GoldButton onClick={() => { if (canSave) onSave(form); }} disabled={isLoading || !canSave}>
          {form.kind === "video"
            ? (mode === "edit"
                ? <><Video size={13}/> Update Video</>
                : <><Video size={13}/> Add Video</>)
            : form.kind === "reading"
            ? (mode === "edit"
                ? <><FileText size={13}/> Update Reading</>
                : <><FileText size={13}/> Add Reading</>)
            : (mode === "edit"
                ? <><HelpCircle size={13}/> Update Quiz</>
                : <><HelpCircle size={13}/> Add Quiz</>) }
        </GoldButton>
        <button onClick={onCancel} style={{ background: "none", border: `1.5px solid ${B.light}`, borderRadius: 10, padding: "9px 18px", color: B.muted, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── MCQ Quiz Editor for staff ── */
function McqEditor({ lesson, onSave, onCancel, isLoading }: { lesson: any; onSave: (questions: any[]) => void; onCancel: () => void; isLoading: boolean }) {
  const [questions, setQuestions] = useState<any[]>(
    lesson?.mcqQuestions ? (typeof lesson.mcqQuestions === "string" ? JSON.parse(lesson.mcqQuestions) : lesson.mcqQuestions) : []
  );
  const imageFileRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now(),
      text: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      image: null,
    }]);
  };

  const updateQuestion = (id: number, field: string, value: any) => {
    setQuestions(questions.map((q) => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateOption = (qId: number, optIndex: number, text: string) => {
    setQuestions(questions.map((q) =>
      q.id === qId
        ? { ...q, options: q.options.map((opt: string, i: number) => i === optIndex ? text : opt) }
        : q
    ));
  };

  const addOption = (qId: number) => {
    setQuestions(questions.map((q) =>
      q.id === qId ? { ...q, options: [...q.options, ""] } : q
    ));
  };

  const removeOption = (qId: number, optIndex: number) => {
    setQuestions(questions.map((q) => {
      if (q.id !== qId) return q;
      const newOpts = q.options.filter((_: string, i: number) => i !== optIndex);
      return { ...q, options: newOpts, correctIndex: q.correctIndex >= newOpts.length ? newOpts.length - 1 : q.correctIndex };
    }));
  };

  const importImageForQuestion = (qId: number, file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setQuestions(questions.map((q) => q.id === qId ? { ...q, image: dataUrl } : q));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ background: `${B.gold}0A`, border: `1.5px dashed ${B.gold}88`, borderRadius: 16, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h4 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, color: B.navy, margin: 0, fontSize: 15 }}>
          Edit Quiz Questions
        </h4>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}><X size={16}/></button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q, qIdx) => (
          <div key={q.id} style={{ background: B.white, border: `1.5px solid ${B.light}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: B.gold }}>Question {qIdx + 1}</div>
              <button onClick={() => removeQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: B.error }}><Trash2 size={15}/></button>
            </div>

            <textarea
              placeholder="Enter question text"
              value={q.text}
              onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
              style={{ ...inputStyle, minHeight: 60, marginBottom: 12, resize: "vertical" }}
            />

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, marginBottom: 8, textTransform: "uppercase" }}>Question Image (optional)</div>
              {q.image ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: B.offW, borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: B.navy }}>Image attached</span>
                  <button
                    type="button"
                    onClick={() => { updateQuestion(q.id, "image", null); if (imageFileRef.current) imageFileRef.current.value = ""; }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}
                  >
                    <X size={14}/>
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => importImageForQuestion(q.id, e.target.files?.[0]);
                  input.click();
                }}
                style={{ fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW, border: `1.5px solid ${B.light}`, padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
              >
                <ImageIcon size={12} style={{ display: "inline", marginRight: 4 }}/>
                Import Image
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, marginBottom: 8, textTransform: "uppercase" }}>Answer Options</div>
              {q.options.map((opt: string, optIdx: number) => (
                <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input
                    type="radio"
                    checked={q.correctIndex === optIdx}
                    onChange={() => updateQuestion(q.id, "correctIndex", optIdx)}
                    style={{ cursor: "pointer" }}
                  />
                  <input
                    placeholder={`Option ${optIdx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                    style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 13 }}
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(q.id, optIdx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: B.error }}
                    >
                      <Minus size={14}/>
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 5 && (
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  style={{ fontSize: 12, fontWeight: 700, color: B.gold, background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
                >
                  <Plus size={12} style={{ display: "inline", marginRight: 4 }}/>
                  Add Option
                </button>
              )}
            </div>

            <textarea
              placeholder="Explanation for the correct answer (shown after submission)"
              value={q.explanation}
              onChange={(e) => updateQuestion(q.id, "explanation", e.target.value)}
              style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: B.offW,
            border: `1.5px dashed ${B.light}`,
            color: B.navy,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "center",
          }}
        >
          <Plus size={14}/>
          Add Question
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <GoldButton onClick={() => onSave(questions)} disabled={isLoading || questions.length === 0}>
          <Save size={13}/>
          Save {questions.length} {questions.length === 1 ? "Question" : "Questions"}
        </GoldButton>
        <button onClick={onCancel} style={{ background: "none", border: `1.5px solid ${B.light}`, borderRadius: 10, padding: "9px 18px", color: B.muted, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── MCQ Quiz Viewer/Taker ── */
function McqQuizViewer({ lesson, isStudent, onComplete, onEdit }: { lesson: any; isStudent: boolean; onComplete?: (answers: number[]) => void; onEdit?: () => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);

  const questions = lesson?.mcqQuestions
    ? (typeof lesson.mcqQuestions === "string" ? JSON.parse(lesson.mcqQuestions) : lesson.mcqQuestions)
    : [];

  if (questions.length === 0) {
    return (
      <Card title="Quiz">
        <div style={{ color: B.muted, textAlign: "center", padding: "20px 0" }}>
          {isStudent ? "No quiz available yet" : "Create questions to get started"}
        </div>
      </Card>
    );
  }

  const q = questions[currentQuestion];
  const answered = selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null;
  const isCorrect = answered && selectedAnswers[currentQuestion] === q.correctIndex;
  const allAnswered = selectedAnswers.filter((a) => a !== undefined && a !== null).length === questions.length;

  return (
    <Card title={`Quiz: ${lesson.title}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: B.muted }}>
            Question {currentQuestion + 1} of {questions.length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: B.gold }}>
            {selectedAnswers.filter((a) => a !== undefined && a !== null).length}/{questions.length} answered
          </div>
        </div>

        <div style={{ background: B.offW, padding: 16, borderRadius: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: B.navy, marginBottom: 12 }}>{q.text}</div>
          {q.image && (
            <img src={q.image} alt="Question" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 12 }} />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options.map((opt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  if (!showResults) {
                    const newAnswers = [...selectedAnswers];
                    newAnswers[currentQuestion] = idx;
                    setSelectedAnswers(newAnswers);
                  }
                }}
                disabled={showResults}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `2px solid ${
                    selectedAnswers[currentQuestion] === idx
                      ? B.gold
                      : showResults && idx === q.correctIndex
                      ? B.success
                      : showResults && selectedAnswers[currentQuestion] === idx
                      ? B.error
                      : B.light
                  }`,
                  background:
                    selectedAnswers[currentQuestion] === idx
                      ? `${B.gold}14`
                      : showResults && idx === q.correctIndex
                      ? `${B.success}14`
                      : showResults && selectedAnswers[currentQuestion] === idx
                      ? `${B.error}14`
                      : B.white,
                  color: B.navy,
                  textAlign: "left",
                  cursor: showResults ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all .15s",
                  opacity: showResults && selectedAnswers[currentQuestion] !== idx && idx !== q.correctIndex ? 0.6 : 1,
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {showResults && q.explanation && (
            <div style={{ marginTop: 12, padding: 12, background: `${B.gold}0F`, borderRadius: 10, border: `1px solid ${B.gold}44`, fontSize: 12, color: B.navy }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Explanation:</div>
              {q.explanation}
            </div>
          )}
        </div>

        {!showResults && (
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${currentQuestion === 0 ? B.light : B.navy}`,
                background: B.white,
                color: currentQuestion === 0 ? B.muted : B.navy,
                fontWeight: 700,
                cursor: currentQuestion === 0 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <GoldButton
                onClick={() => setShowResults(true)}
                disabled={!allAnswered}
              >
                Review Answers
              </GoldButton>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${B.navy}`,
                  background: B.white,
                  color: B.navy,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            )}
          </div>
        )}

        {showResults && (
          <div style={{ padding: 14, background: `${B.gold}0F`, borderRadius: 12, border: `1.5px solid ${B.gold}44` }}>
            <div style={{ fontWeight: 800, color: B.navy, marginBottom: 8 }}>
              Quiz Complete! Score: {selectedAnswers.filter((a, idx) => a === questions[idx].correctIndex).length}/{questions.length}
            </div>
            {isStudent && onComplete && (
              <GoldButton onClick={() => onComplete(selectedAnswers.filter((a): a is number => a !== null))}>
                <CheckCircle2 size={14}/>
                Mark Complete & Earn XP
              </GoldButton>
            )}
          </div>
        )}

        {!isStudent && onEdit && (
          <button
            onClick={onEdit}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${B.light}`,
              background: B.white,
              color: B.navy,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <Edit2 size={14}/>
            Edit Questions
          </button>
        )}
      </div>
    </Card>
  );
}

/* ── Thumbnail/Banner editor for staff ── */
function ThumbnailEditor({ course, onSave }: { course: any; onSave: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(course.bannerUrl ?? "");
  const [emoji, setEmoji] = useState(course.coverEmoji ?? "📘");
  const [color, setColor] = useState(course.coverColor ?? B.navy);
  const importImage = (field: "thumbnail" | "banner", file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const next = String(reader.result ?? "");
      if (field === "thumbnail") setThumbnailUrl(next);
      else setBannerUrl(next);
    };
    reader.readAsDataURL(file);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
        border: `1.5px solid ${B.light}`, background: B.white, color: B.muted, fontFamily: "inherit",
      }}>
        <ImageIcon size={13}/> Edit Thumbnail / Banner
      </button>
    );
  }

  return (
    <div style={{ background: B.white, border: `1.5px solid ${B.light}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: B.navy, fontSize: 13 }}>Edit Course Media</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: B.muted }}><X size={15}/></button>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Thumbnail URL (cards)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://…" style={inputStyle}/>
            <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
              Import
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImage("thumbnail", e.target.files?.[0])} />
            </label>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Banner URL (course page header)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" style={inputStyle}/>
            <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
              Import
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImage("banner", e.target.files?.[0])} />
            </label>
          </div>
        </div>
        {!thumbnailUrl && (
          <>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Emoji</label>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {EMOJI_PRESETS.map((em) => (
                  <button key={em} type="button" onClick={() => setEmoji(em)} style={{ width: 32, height: 32, borderRadius: 7, border: `1.5px solid ${emoji === em ? B.gold : B.light}`, background: emoji === em ? `${B.gold}14` : B.offW, fontSize: 17, cursor: "pointer" }}>{em}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em" }}>Colour</label>
              <div style={{ display: "flex", gap: 6 }}>
                {COVER_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: 6, border: `2.5px solid ${color === c ? B.gold : "transparent"}`, background: c, cursor: "pointer" }}/>
                ))}
              </div>
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <PrimaryButton onClick={() => { onSave({ thumbnailUrl, bannerUrl, coverEmoji: emoji, coverColor: color }); setOpen(false); }}>Save</PrimaryButton>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: `1.5px solid ${B.light}`, borderRadius: 10, padding: "9px 14px", color: B.muted, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Course Modal ── */
function EditCourseModal({ course, onClose, onSave }: { course: any; onClose: () => void; onSave: (data: any) => void }) {
  const [title, setTitle] = useState(course.title ?? "");
  const [subject, setSubject] = useState(course.subject ?? "");
  const [level, setLevel] = useState(course.level ?? "");
  const [teacherId, setTeacherId] = useState<number | null>(course.teacherId ?? null);
  const [description, setDescription] = useState(course.description ?? "");
  const [coverEmoji, setCoverEmoji] = useState(course.coverEmoji ?? "📘");
  const [coverColor, setCoverColor] = useState(course.coverColor ?? B.navy);
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(course.bannerUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const teacherUsersQ = useListUsers({ role: "teacher" });
  const teacherUsers = teacherUsersQ.data?.items ?? [];

  const importImage = (field: "thumbnail" | "banner", file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const next = String(reader.result ?? "");
      if (field === "thumbnail") setThumbnailUrl(next);
      else setBannerUrl(next);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      window.alert("Course title is required.");
      return;
    }
    if (!subject.trim()) {
      window.alert("Course subject is required.");
      return;
    }
    if (!level.trim()) {
      window.alert("Course level is required.");
      return;
    }
    if (teacherId === null) {
      window.alert("Course teacher is required.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        subject: subject.trim(),
        level: level.trim(),
        teacherId,
        description: description.trim(),
        coverEmoji,
        coverColor,
        thumbnailUrl: thumbnailUrl || null,
        bannerUrl: bannerUrl || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: B.white,
          borderRadius: 22,
          boxShadow: "0 24px 64px rgba(27,43,94,.2)",
          overflow: "hidden",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${B.light}`, position: "sticky", top: 0, background: B.white, zIndex: 10 }}>
          <div style={{ fontWeight: 800, color: B.navy }}>Edit Course</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: B.muted, cursor: "pointer", padding: 6, borderRadius: 10 }} title="Close">
            <X size={18}/>
          </button>
        </div>

        <div style={{ background: B.offW, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Course Title"
              style={inputStyle}
            />
          </div>

          {/* Subject & Level */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Level</label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., Grade 10"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Teacher */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Teacher</label>
            <select
              value={teacherId ?? ""}
              onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : null)}
              style={inputStyle}
            >
              <option value="">Select a teacher</option>
              {teacherUsers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Course description (optional)"
              style={{
                ...inputStyle,
                fontFamily: "inherit",
                minHeight: 100,
                resize: "vertical",
              }}
            />
          </div>

          {/* Emoji */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Icon</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {EMOJI_PRESETS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setCoverEmoji(em)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `2px solid ${coverEmoji === em ? B.gold : B.light}`,
                    background: coverEmoji === em ? `${B.gold}14` : B.white,
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `2.5px solid ${coverColor === c ? B.gold : "transparent"}`,
                    background: c,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Thumbnail URL (cards)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
              <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
                Import
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImage("thumbnail", e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Banner URL */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: B.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>Banner URL (header)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
              <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 12px", borderRadius: 10, border: `1.5px solid ${B.light}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: B.navy, background: B.offW }}>
                Import
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => importImage("banner", e.target.files?.[0])} />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                background: isSaving ? "#ccc" : `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                color: B.white,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: B.white,
                color: B.muted,
                border: `1.5px solid ${B.light}`,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Enroll Panel ── */
function EnrollPanel({ courseId, onClose }: { courseId: number; onClose: () => void }) {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const studentUsersQ = useListUsers({ role: "student" });
  const teacherUsersQ = useListUsers({ role: "teacher" });
  const studentUsers = studentUsersQ.data?.items ?? [];
  const teacherUsers = teacherUsersQ.data?.items ?? [];

  const filterUsers = (users: any[]) => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user: any) => {
      const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      return label.includes(term) || email.includes(term);
    });
  };

  const filteredStudents = useMemo(() => filterUsers(studentUsers), [search, studentUsers]);
  const filteredTeachers = useMemo(() => filterUsers(teacherUsers), [search, teacherUsers]);
  const activeUsers = selectedRole === "student" ? filteredStudents : filteredTeachers;
  const activeUsersQ = selectedRole === "student" ? studentUsersQ : teacherUsersQ;
  const activeRoleLabel = selectedRole === "student" ? "Students" : "Teachers";
  const activeRolePlural = selectedRole === "student" ? "students" : "teachers";

  const qc = useQueryClient();

  const handleEnroll = async () => {
    if (!selectedUser) {
      setMessage("Select a student or teacher from the list.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    const queryKey = getGetCourseMembersQueryKey(courseId);
    const previous = qc.getQueryData(queryKey);

    const newMember = {
      id: selectedUser.id,
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      email: selectedUser.email,
      role: selectedUser.role || "student",
    };

    // Optimistically add member to cache (works even if cache is empty)
    qc.setQueryData(queryKey, (old: any) => {
      const base = old ?? { admins: [], teachers: [], students: [] };
      const key = newMember.role === "teacher" ? "teachers" : "students";
      const exists = (base[key] ?? []).some((m: any) => m.id === newMember.id);
      if (exists) return base;
      return { ...base, [key]: [...(base[key] ?? []), newMember] };
    });

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/enroll-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUser.email, role: selectedUser.role || "student" }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to enroll");
      }

      // Ensure React Query refetches authoritative data
      await qc.invalidateQueries({ queryKey, refetchType: "all" });
      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId), refetchType: "all" });
      await qc.invalidateQueries({ queryKey: getListCoursesQueryKey() });

      setMessage(`Successfully enrolled ${selectedUser.firstName} ${selectedUser.lastName} as ${selectedUser.role || "student"}`);
      setSelectedUser(null);
      setSearch("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      // Rollback optimistic update
      qc.setQueryData(queryKey, previous as any);
      setMessage(err?.message ?? "Enrollment failed");
    } finally {
      setIsLoading(false);
    }
  };


  const labelFor = (user: any) => `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: B.white,
          borderRadius: 22,
          boxShadow: "0 24px 64px rgba(27,43,94,.2)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${B.light}` }}>
          <div style={{ fontWeight: 800, color: B.navy }}>Enroll Users</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: B.muted, cursor: "pointer", padding: 6, borderRadius: 10 }} title="Close">
            <X size={18}/>
          </button>
        </div>

        <div style={{ background: B.offW, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <button
              type="button"
              onClick={() => setRolePickerOpen((v) => !v)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: `1.5px solid ${B.light}`,
                background: B.white,
                color: B.navy,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{activeRoleLabel}</span>
              <span style={{ fontSize: 12 }}>{rolePickerOpen ? "▲" : "▼"}</span>
            </button>
            {rolePickerOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 8,
                background: B.white,
                border: `1.5px solid ${B.light}`,
                borderRadius: 14,
                overflow: "hidden",
                zIndex: 10,
              }}>
                {(["student", "teacher"] as const).map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => {
                      setSelectedRole(roleKey);
                      setRolePickerOpen(false);
                      setSelectedUser(null);
                      setSearch("");
                      setMessage("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      background: selectedRole === roleKey ? `${B.gold}12` : "transparent",
                      color: B.navy,
                      cursor: "pointer",
                    }}
                  >
                    {roleKey === "student" ? "Students" : "Teachers"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: B.white,
            border: `1.5px solid ${B.light}`,
            borderRadius: 14,
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            padding: "12px 14px",
          }}>
            {selectedUser ? (
              <span style={{ color: "#000", fontWeight: 700, fontSize: 13 }}>{labelFor(selectedUser)}</span>
            ) : (
              <span style={{ color: B.muted, fontSize: 13 }}>No user selected</span>
            )}
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedUser(null);
              setMessage("");
            }}
            placeholder="Search by name or email"
            disabled={isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading}
            style={{
              ...inputStyle,
              padding: "10px 14px",
              fontSize: 13,
              opacity: isLoading ? 0.6 : 1,
            }}
          />

          <div style={{
            background: B.white,
            border: `1.5px solid ${B.light}`,
            borderRadius: 14,
            maxHeight: 240,
            overflowY: "auto",
            overflowX: "hidden",
            scrollBehavior: "smooth",
          }}>
            {activeUsersQ.isLoading ? (
              <div style={{ padding: 12, color: B.muted, fontSize: 13 }}>Loading {activeRolePlural}...</div>
            ) : activeUsersQ.isError ? (
              <div style={{ padding: 12, color: B.error, fontSize: 13 }}>Unable to load {activeRolePlural} list.</div>
            ) : activeUsers.length === 0 ? (
              <div style={{ padding: 12, color: B.muted, fontSize: 13 }}>No {activeRolePlural} match that search.</div>
            ) : (
              activeUsers.map((user: any) => {
                const label = labelFor(user);
                const selected = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      if (selectedUser?.id === user.id) {
                        setSelectedUser(null);
                      } else {
                        setSelectedUser({ ...user, role: selectedRole });
                      }
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: selected ? `${B.gold}12` : "transparent",
                      color: B.navy,
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 12, color: B.muted }}>{user.email}</div>
                    </span>
                    {selected ? <span style={{ color: B.gold, fontWeight: 700 }}>Selected</span> : null}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={handleEnroll}
            disabled={isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading || !selectedUser}
            style={{
              padding: "11px 16px",
              borderRadius: 12,
              background: B.gold,
              color: B.white,
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading ? "wait" : "pointer",
              opacity: isLoading || studentUsersQ.isLoading || teacherUsersQ.isLoading ? 0.65 : 1,
            }}
          >
            {isLoading ? "Enrolling…" : "Enroll"}
          </button>

          {message && (
            <div style={{
              padding: "11px 14px",
              borderRadius: 12,
              background: message.toLowerCase().includes("success") ? "#d1fae5" : "#fee2e2",
              color: message.toLowerCase().includes("success") ? "#065f46" : "#991b1b",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ MAIN PAGE ══ */
export default function CourseDetail() {
  const [, params] = useRoute<{ id: string }>("/courses/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const courseQ = useGetCourse(id, { query: { enabled: id > 0 } });
  const data: any = courseQ.data;
  const course = data?.course;
  const lessons: any[] = data?.lessons ?? [];
  const isEnrolled = !!data?.enrolled;
  const completedSet = new Set<number>((data?.completedLessonIds ?? []) as number[]);
  const progress = data?.progress ?? 0;

  const me = useGetCurrentUser();
  const user = me.data?.user;
  const isAdmin = !!user?.isAdmin;
  const isStaff = isAdmin || user?.role === "teacher";
  const isStudent = !!user && !isStaff;
  const canManageCourse = isAdmin || (user?.role === "teacher" && (
    Number(course?.teacherId) === Number(user?.id) ||
    (course?.teacherAssignments ?? []).some((assignment: any) => Number(assignment.teacher?.id) === Number(user?.id))
  ));

  const membersQ = useGetCourseMembers(id, { query: { enabled: id > 0 } });
  const members: any = membersQ.data ?? { admins: [], teachers: [], students: [] };

  const enroll = useEnrollInCourse();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const complete = useCompleteLesson();
  const [, setLocation] = useLocation();
  
  const [tab, setTab] = useState<LessonKind>("video");
  const [showAdd, setShowAdd] = useState(false);
  const [activeDocumentLesson, setActiveDocumentLesson] = useState<any | null>(null);
  const [activeDocumentPage, setActiveDocumentPage] = useState(1);
  const [activeDocumentTotalPages, setActiveDocumentTotalPages] = useState(0);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [isUpdatingLesson, setIsUpdatingLesson] = useState(false);
  const [removingMemberIds, setRemovingMemberIds] = useState<number[]>([]);
  const activeDocumentRef = useRef<HTMLDivElement | null>(null);
  const [showEnrollPanel, setShowEnrollPanel] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const previousLessonIdRef = useRef<number | null>(null);
  const [activeQuizLesson, setActiveQuizLesson] = useState<any | null>(null);
  const [editingQuizLesson, setEditingQuizLesson] = useState<any | null>(null);
  
    // Auto-complete document lessons when user reaches the last page (students only)
    useEffect(() => {
      if (!activeDocumentLesson) return;
      if (isStaff) return;
      if (!activeDocumentTotalPages) return;
      if (activeDocumentPage >= activeDocumentTotalPages && !activeDocumentLesson.completed && !complete.isPending) {
        void onDocumentComplete();
      }
    }, [activeDocumentPage, activeDocumentTotalPages, activeDocumentLesson?.id, activeDocumentLesson?.completed, isStaff, complete.isPending]);

  const onDeleteCourse = async () => {
    if (!course) return;
    if (!window.confirm(`Permanently delete "${course.title}"? This will remove all lessons, enrollments, and progress for this course. This cannot be undone.`)) {
      return;
    }
    try {
      await deleteCourse.mutateAsync({ id });
      setLocation("/courses");
    } catch (err: any) {
      window.alert(err?.message ?? "Couldn't delete course.");
    }
  };

  const onRemoveMember = async (memberId: number) => {
    if (!course || !isAdmin) return;
    if (!window.confirm("Remove this member from the course?")) {
      return;
    }

    const queryKey = getGetCourseMembersQueryKey(id);
    const previous = qc.getQueryData(queryKey);

    // Optimistically remove member from cache
    qc.setQueryData(queryKey, (old: any) => {
      const base = old ?? { admins: [], teachers: [], students: [] };
      return {
        ...base,
        admins: (base.admins ?? []).filter((m: any) => m.id !== memberId),
        teachers: (base.teachers ?? []).filter((m: any) => m.id !== memberId),
        students: (base.students ?? []).filter((m: any) => m.id !== memberId),
      };
    });

    setRemovingMemberIds((prev) => [...prev, memberId]);
    try {
      const res = await fetch(`${API_BASE}/courses/${id}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        let errorMessage = "Could not remove member.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await qc.invalidateQueries({ queryKey, refetchType: "all" });
      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id), refetchType: "all" });
    } catch (err: any) {
      // Rollback cache on failure
      qc.setQueryData(queryKey, previous as any);
      window.alert(err?.message ?? "Couldn't remove member.");
    } finally {
      setRemovingMemberIds((prev) => prev.filter((value) => value !== memberId));
    }
  };
  const onDelete = async (lessonId: number) => {
    if (!course) return;
    if (!window.confirm("Permanently delete this lesson? This cannot be undone.")) {
      return;
    }

    // Close reader panel immediately before the async work starts
    if (activeDocumentLesson?.id === lessonId) {
      setActiveDocumentLesson(null);
    }

    // Optimistically remove from cache so the row disappears instantly
    const queryKey = getGetCourseQueryKey(id);
    const previous = qc.getQueryData(queryKey);
    qc.setQueryData(queryKey, (old: any) => {
      if (!old || !Array.isArray(old.lessons)) return old;
      return { ...old, lessons: old.lessons.filter((l: any) => l.id !== lessonId) };
    });

    try {
      await deleteLesson.mutateAsync({ id: lessonId, courseId: id });
      // Do NOT call invalidateQueries here — useDeleteLesson's onSettled already
      // handles it. A second invalidation races with the first and can momentarily
      // re-surface the deleted lesson from stale server data.
    } catch (err: any) {
      // Restore previous cache on failure
      if (previous !== undefined) {
        qc.setQueryData(queryKey, previous as any);
      } else {
        await qc.invalidateQueries({ queryKey, exact: true, refetchType: "all" });
      }
      window.alert(err?.message ?? "Couldn't delete lesson.");
    }
  };

  const videos = lessons.filter((l) => (l.kind ?? "video") === "video");
  const readings = lessons.filter((l) => l.kind === "reading");
  const quizzes = lessons.filter((l) => l.kind === "quiz");

  const getDocumentSource = (lesson: any) => {
    const content = lesson?.content ?? "";
    if (content.startsWith("__pdf__:")) return { type: "pdf", url: content.replace("__pdf__:", "") };
    return { type: "none", url: "" };
  };
  const activeReadingIndex = activeDocumentLesson ? readings.findIndex((l) => l.id === activeDocumentLesson.id) : -1;
  const activeDocumentPrevLesson = activeReadingIndex > 0 ? readings[activeReadingIndex - 1] : null;
  const activeDocumentNextLesson = activeReadingIndex >= 0 && activeReadingIndex < readings.length - 1 ? readings[activeReadingIndex + 1] : null;
  const activeDocumentLastPage = activeDocumentTotalPages > 0 && activeDocumentPage === activeDocumentTotalPages;
  const canCompleteDocumentLesson = !!activeDocumentLesson && !activeDocumentLesson.completed && activeDocumentLastPage;

  const ensureCompleted = (l: any) => (l ? { ...l, completed: completedSet.has(l.id) || Boolean(l.completed) } : l);

  useEffect(() => {
    const currentLessonId = activeDocumentLesson?.id ?? null;
    
    // Only clear messages when switching to a *different* lesson (both must be non-null)
    // This allows closing/reopening the same lesson without losing the message
    if (
      previousLessonIdRef.current !== null &&
      currentLessonId !== null &&
      previousLessonIdRef.current !== currentLessonId
    ) {
      setCompleteMessage(null);
      setCompleteError(null);
    }
    
    previousLessonIdRef.current = currentLessonId;
    
    if (!activeDocumentLesson) {
      setActiveDocumentPage(1);
      setActiveDocumentTotalPages(0);
      return;
    }
  }, [activeDocumentLesson?.id]);

  const onDocumentComplete = async () => {
    if (!activeDocumentLesson) return;
    try {
      setCompleteError(null);
      const result = await complete.mutateAsync({ id: activeDocumentLesson.id });
      setActiveDocumentLesson((current: any) => current ? { ...current, completed: true } : current);
      setCompleteMessage("Lesson marked complete!");
      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id), refetchType: "all" });
      if (result?.lessonId) {
        await qc.invalidateQueries({ queryKey: getGetLessonQueryKey(result.lessonId), refetchType: "all" });
      }
    } catch (err: any) {
      setCompleteError(err?.message ?? "Failed to complete lesson.");
    }
  };

  useEffect(() => {
    if (!activeDocumentLesson) return;
    if (activeDocumentRef.current) {
      activeDocumentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [activeDocumentLesson?.id]);

  const visible = tab === "video"
    ? videos
    : tab === "reading"
    ? readings.filter((lesson) => !activeDocumentLesson || lesson.id !== activeDocumentLesson.id)
    : tab === "quiz"
    ? quizzes
    : [];
  const shouldShowEmptyPlaceholder = tab !== "members" && visible.length === 0;

  const onEnroll = async () => {
    await enroll.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
    await qc.invalidateQueries({ queryKey: getListMyEnrollmentsQueryKey() });
  };

  const onAddLesson = async (form: any) => {
    // Capture the base64 PDF content before the mutation. The server cannot
    // persist it, so the cache will lose it after the success refetch unless we
    // manually restore it.
    const clientContent = form.kind === "reading" ? (form.content ?? "") : "";

    const created = await createLesson.mutateAsync({
      courseId: id,
      data: {
        title: form.title,
        description: form.description,
        kind: form.kind,
        videoUrl: form.kind === "video" ? form.videoUrl : "",
        content: clientContent,
        durationMin: parseInt(form.durationMinutes, 10) || 10,
        xpReward: parseInt(form.xpReward, 10) || 20,
      } as any,
    });

    // After onSuccess runs, the cache lesson has the server shape (no content).
    // Patch the content back so the PDF viewer works immediately without refresh.
    if (form.kind === "reading" && clientContent && created?.id) {
      qc.setQueryData(getGetCourseQueryKey(id), (old: any) => {
        if (!old || !Array.isArray(old.lessons)) return old;
        return {
          ...old,
          lessons: old.lessons.map((l: any) =>
            l.id === created.id ? { ...l, content: clientContent } : l
          ),
        };
      });
    }

    setTab(form.kind);
    setShowAdd(false);
  };

  const onUpdateLesson = async (form: any) => {
    if (!editingLesson) return;
    try {
      setIsUpdatingLesson(true);
      const payload = {
        title: form.title,
        description: form.description,
        kind: form.kind,
        durationMin: parseInt(form.durationMinutes, 10) || 10,
        xpReward: parseInt(form.xpReward, 10) || 20,
        videoUrl: form.kind === "video" ? form.videoUrl : "",
        content: form.kind === "reading" ? (form.content ?? "") : null,
      };
      const res = await fetch(`${API_BASE}/lessons/${editingLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update lesson.");
      }
      const updated = await res.json();

      qc.setQueryData(getGetCourseQueryKey(id), (old: any) => {
        if (!old || !Array.isArray(old.lessons)) return old;
        return {
          ...old,
          lessons: old.lessons.map((l: any) =>
            l.id === editingLesson.id
              ? { ...l, ...updated, durationMinutes: updated.durationMin }
              : l
          ),
        };
      });

      setEditingLesson(null);
      setActiveDocumentLesson((current: any) =>
        current?.id === editingLesson.id
          ? { ...current, ...updated, durationMinutes: updated.durationMin }
          : current
      );

      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
      await qc.invalidateQueries({ queryKey: getGetLessonQueryKey(editingLesson.id) });
    } catch (err: any) {
      window.alert(err?.message ?? "Couldn't update lesson.");
    } finally {
      setIsUpdatingLesson(false);
    }
  };

  const onUpdateThumbnail = async (patch: any) => {
    try {
      const payload = {
        thumbnailUrl: patch.thumbnailUrl ?? null,
        bannerUrl: patch.bannerUrl ?? null,
        coverEmoji: patch.coverEmoji ?? course.coverEmoji,
        coverColor: patch.coverColor ?? course.coverColor,
      };
      await updateCourse.mutateAsync({ id, data: payload as any });
      await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
      await qc.invalidateQueries({ queryKey: ["courses"] });
    } catch (err: any) {
      window.alert(err?.message ?? "Couldn't update course media. Try a smaller image or a direct URL.");
    }
  };

  return (
    <DashboardLayout
      title={course?.title ?? "Course"}
      subtitle={course ? `${course.subject} · ${course.level}` : ""}
    >
      <div style={{ marginBottom: 18 }}>
        <Link
          href="/courses"
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
          <ArrowLeft size={13}/> All Courses
        </Link>
      </div>

      {!course ? (
        <div style={{ color: B.muted }}>Loading…</div>
      ) : (
        <>
          {/* ── Course hero ── */}
          <div style={{
            borderRadius: 22, overflow: "hidden", marginBottom: 22,
            border: `1px solid ${B.light}`,
            boxShadow: "0 4px 24px rgba(27,43,94,.09)",
          }}>
            <div style={{ position: "relative", minHeight: 220 }}>
              {course.bannerUrl ? (
                <img src={course.bannerUrl} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}/>
              ) : course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}/>
              ) : (
                <div style={{
                  width: "100%", height: 220,
                  background: `linear-gradient(135deg, ${course.coverColor ?? B.navy} 0%, ${course.coverColor ?? B.navy}dd 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 90, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", inset: 0, opacity: .06, backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`, backgroundSize: "24px 24px" }}/>
                  <span style={{ position: "relative", zIndex: 1 }}>{course.coverEmoji}</span>
                </div>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.05) 15%, rgba(0,0,0,.55) 100%)" }}/>

                {/* Overlay content */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 28px", color: B.white }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 26, margin: 0, textShadow: "0 2px 10px rgba(0,0,0,.3)" }}>{course.subject}</h2>
                </div>

                {/* Enroll button */}
                {isStudent && isEnrolled && (
                  <div style={{
                    position: "absolute", top: 18, right: 18,
                    background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)",
                    color: B.white, padding: "10px 18px", borderRadius: 12,
                    fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                    border: "1px solid rgba(255,255,255,.3)",
                  }}>
                    <CheckCircle2 size={15}/> Enrolled
                  </div>
                )}
            </div>

            {/* Info bar */}
            <div style={{ background: B.white, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 20, fontSize: 13, color: B.muted, fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Video size={14}/> {videos.length} videos</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><FileText size={14}/> {readings.length} readings</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Users size={14}/> {course.enrolledCount ?? 0} enrolled</span>
                {course.teacherName && <span>Taught by {course.teacherName}</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowEnrollPanel(true)}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                        color: B.white,
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Enroll Users
                    </button>
                    {canManageCourse && (
                      <button
                        onClick={() => setShowEditCourseModal(true)}
                        style={{
                        padding: "9px 14px",
                        borderRadius: 10,
                        background: B.white,
                        color: B.navy,
                        border: `1.5px solid ${B.light}`,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                        <Edit2 size={14} />
                        Edit Course
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={onDeleteCourse}
                        disabled={deleteCourse.isPending}
                        style={{
                        padding: "9px 14px",
                        borderRadius: 10,
                        background: deleteCourse.isPending ? "#ccc" : "#dc2626",
                        color: B.white,
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: deleteCourse.isPending ? "not-allowed" : "pointer",
                        opacity: deleteCourse.isPending ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                        <Trash2 size={14} />
                        {deleteCourse.isPending ? "Deleting..." : "Delete Course"}
                      </button>
                    )}
                  </>
                )}
                {isEnrolled && lessons.length > 0 && !isStaff && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: B.light, borderRadius: 999, height: 6, width: 160, overflow: "hidden" }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${B.gold}, ${B.goldL})` }}/>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.navy }}>{progress}%</div>
                  </div>
                )}
              </div>

              {/* Description */}
              {course.description && (
                <p style={{ margin: 0, fontSize: 13.5, color: B.muted, lineHeight: 1.65, width: "100%", borderTop: `1px solid ${B.light}`, paddingTop: 14, marginTop: 4 }}>
                  {course.description}
                </p>
              )}

              {/* Staff: thumbnail editor */}
              {canManageCourse && <ThumbnailEditor course={course} onSave={onUpdateThumbnail}/>}
            </div>
          </div>

          {/* ── Lessons ── */}
          {/* Tab row */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1.5px solid ${B.light}` }}>
            {([["video", "Videos", videos.length], ["reading", "Reading", readings.length], ["quiz", "Quiz", quizzes.length], ["members", "Members", (members.admins?.length ?? 0) + (members.teachers?.length ?? 0) + (members.students?.length ?? 0)]] as const).map(([k, label, count]) => (
              <button key={k} onClick={() => {
                setTab(k as LessonKind);
                setShowAdd(false);
                if (k === "video") setActiveDocumentLesson(null);
                if (k === "quiz") setActiveQuizLesson(null);
              }} style={{
                background: "transparent", border: "none",
                borderBottom: `3px solid ${tab === k ? B.gold : "transparent"}`,
                color: tab === k ? B.navy : B.muted, fontWeight: 700, fontSize: 14,
                padding: "10px 18px", cursor: "pointer", marginBottom: -1.5, fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 7,
                transition: "color .15s",
              }}>
                {k === "video" ? <Video size={14}/> : k === "reading" ? <AlignLeft size={14}/> : k === "quiz" ? <HelpCircle size={14}/> : <Users size={14}/>}
                {label}
                <span style={{ fontSize: 11, background: tab === k ? `${B.gold}20` : B.light, color: tab === k ? B.gold : B.muted, padding: "1px 7px", borderRadius: 99, fontWeight: 800 }}>{count}</span>
              </button>
            ))}
          </div>

          {showEnrollPanel && user?.isAdmin && (
            <EnrollPanel courseId={id} onClose={() => setShowEnrollPanel(false)} />
          )}

          {showEditCourseModal && course && canManageCourse && (
            <EditCourseModal
              course={course}
              onClose={() => setShowEditCourseModal(false)}
              onSave={async (data: any) => {
                try {
                  await updateCourse.mutateAsync({ id, data });
                  await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
                  await qc.invalidateQueries({ queryKey: ["courses"] });
                  setShowEditCourseModal(false);
                } catch (err: any) {
                  window.alert(err?.message ?? "Failed to update course.");
                }
              }}
            />
          )}

          <Card
            title={tab === "video" ? "Video Lessons" : tab === "reading" ? "Reading Lessons" : tab === "quiz" ? "Quiz Lessons" : "Members"}
            action={canManageCourse && tab !== "members" && (
              <GoldButton onClick={() => setShowAdd((v) => !v)} style={{ padding: "7px 14px", fontSize: 12 }}>
                <PlusCircle size={13}/> Add {tab === "video" ? "Video" : tab === "reading" ? "Reading" : "Quiz"}
              </GoldButton>
            )}
          >
            {showAdd && canManageCourse && (
              <AddLessonPanel
                defaultKind={tab}
                onSave={onAddLesson}
                onCancel={() => setShowAdd(false)}
                isLoading={createLesson.isPending}
              />
            )}

            {editingLesson && editingLesson.kind !== "quiz" ? (
              <AddLessonPanel
                defaultKind={editingLesson.kind ?? "reading"}
                initialLesson={editingLesson}
                mode="edit"
                onSave={onUpdateLesson}
                onCancel={() => setEditingLesson(null)}
                isLoading={isUpdatingLesson}
              />
            ) : null}

            {editingQuizLesson ? (
              <McqEditor
                lesson={editingQuizLesson}
                onSave={async (questions) => {
                  setIsUpdatingLesson(true);
                  try {
                    const res = await fetch(`${API_BASE}/lessons/${editingQuizLesson.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: editingQuizLesson.title,
                        description: editingQuizLesson.description,
                        kind: "quiz",
                        mcqQuestions: questions,
                        xpReward: editingQuizLesson.xpReward,
                      }),
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error("Failed to save quiz");
                    await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
                    setEditingQuizLesson(null);
                  } catch (err: any) {
                    window.alert(err?.message ?? "Failed to save quiz");
                  } finally {
                    setIsUpdatingLesson(false);
                  }
                }}
                onCancel={() => setEditingQuizLesson(null)}
                isLoading={isUpdatingLesson}
              />
            ) : null}

            {activeDocumentLesson ? (
              (() => {
                const doc = getDocumentSource(activeDocumentLesson);
                return (
                  <div ref={activeDocumentRef} style={{ margin: "18px 0", borderRadius: 20, overflow: "hidden", border: `1.5px solid ${B.light}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: B.offW, borderBottom: `1px solid ${B.light}` }}>
                      <div>
                        <div style={{ fontWeight: 700, color: B.navy }}>{activeDocumentLesson.title}</div>
                        {activeDocumentLesson.description ? (
                          <div style={{ fontSize: 13, color: B.muted, lineHeight: 1.6, maxWidth: 760, marginTop: 6 }}>
                            {activeDocumentLesson.description}
                          </div>
                        ) : null}
                      </div>
                      <button onClick={() => setActiveDocumentLesson(null)} style={{ border: "none", background: "transparent", color: B.muted, cursor: "pointer", padding: 6, borderRadius: 10 }} title="Close reader">
                        <X size={16}/>
                      </button>
                    </div>
                    <PdfSlidePlayer
                      pdfUrl={doc.url}
                      title={activeDocumentLesson.title}
                      onPageChange={(page, total) => {
                        setActiveDocumentPage(page);
                        setActiveDocumentTotalPages(total);
                      }}
                    />
                    <div style={{ padding: "18px 24px", background: B.offW, borderBottom: `1px solid ${B.light}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ color: B.muted, fontSize: 13 }}>
                          Page {activeDocumentPage} of {activeDocumentTotalPages}
                        </div>
                        {!activeDocumentLesson.completed && (
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            {canCompleteDocumentLesson ? (
                              <button
                                type="button"
                                onClick={onDocumentComplete}
                                disabled={complete.isPending}
                                style={{
                                  padding: "10px 16px",
                                  borderRadius: 12,
                                  background: complete.isPending ? B.light : B.gold,
                                  color: complete.isPending ? B.muted : B.white,
                                  border: "none",
                                  fontWeight: 700,
                                  cursor: complete.isPending ? "wait" : "pointer",
                                }}
                              >
                                {complete.isPending ? "Completing…" : `Mark complete (+${activeDocumentLesson.xpReward} XP)`}
                              </button>
                            ) : (
                              <div style={{ fontSize: 12, color: B.muted, maxWidth: 520 }}>
                                Scroll to the last slide to mark this reading lesson complete.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {completeMessage ? (
                        <div style={{ marginTop: 12, color: B.success, fontWeight: 700, fontSize: 13 }}>
                          {completeMessage}
                        </div>
                      ) : null}
                      {completeError ? (
                        <div style={{ marginTop: 12, color: B.error, fontWeight: 700, fontSize: 13 }}>
                          {completeError}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "20px 24px", borderTop: `1px solid ${B.light}`, background: B.white }}>
                      <button
                        type="button"
                        onClick={() => activeDocumentPrevLesson && setActiveDocumentLesson(ensureCompleted(activeDocumentPrevLesson))}
                        disabled={!activeDocumentPrevLesson}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "11px 18px", borderRadius: 12,
                          background: activeDocumentPrevLesson ? B.white : "rgba(255,255,255,.6)",
                          border: `1.5px solid ${activeDocumentPrevLesson ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.08)"}`,
                          color: activeDocumentPrevLesson ? B.navy : B.muted,
                          cursor: activeDocumentPrevLesson ? "pointer" : "not-allowed",
                          opacity: activeDocumentPrevLesson ? 1 : 0.45,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        <ChevronLeft size={15}/> View Previous lesson
                      </button>

                      <button
                        type="button"
                        onClick={() => activeDocumentNextLesson && setActiveDocumentLesson(ensureCompleted(activeDocumentNextLesson))}
                        disabled={!activeDocumentNextLesson}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "11px 18px", borderRadius: 12,
                          background: activeDocumentNextLesson ? B.navy : "rgba(255,255,255,.6)",
                          border: `1.5px solid ${activeDocumentNextLesson ? B.navy : "rgba(0,0,0,.08)"}`,
                          color: activeDocumentNextLesson ? B.white : B.muted,
                          cursor: activeDocumentNextLesson ? "pointer" : "not-allowed",
                          opacity: activeDocumentNextLesson ? 1 : 0.45,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        View Next lesson <ChevronRight size={15}/>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : activeQuizLesson ? (
              <McqQuizViewer
                lesson={activeQuizLesson}
                isStudent={isStudent}
                onComplete={async (answers) => {
                  if (!isStudent) return;
                  try {
                    const res = await fetch(`${API_BASE}/lessons/${activeQuizLesson.id}/complete`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ answers }),
                      credentials: "include",
                    });
                    if (!res.ok) throw new Error("Failed to complete quiz");
                    const result = await res.json();
                    await qc.invalidateQueries({ queryKey: getGetCourseQueryKey(id) });
                    setCompleteMessage("Quiz completed! +XP earned!");
                    setActiveQuizLesson(null);
                  } catch (err: any) {
                    setCompleteError(err?.message ?? "Failed to complete quiz");
                  }
                }}
                onEdit={() => setEditingQuizLesson(activeQuizLesson)}
              />
            ) : null}


            {shouldShowEmptyPlaceholder ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: B.offW, borderRadius: 14, border: `1.5px dashed ${B.light}` }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: .4 }}>
                  {tab === "video" ? "🎬" : tab === "reading" ? "📖" : "🧠"}
                </div>
                <div style={{ fontWeight: 700, color: B.navy, marginBottom: 4, fontSize: 15 }}>
                  No {tab === "video" ? "videos" : tab === "reading" ? "reading material" : "quizzes"} yet
                </div>
                <div style={{ fontSize: 13, color: B.muted }}>
                  {canManageCourse ? `Click "Add ${tab === "video" ? "Video" : tab === "reading" ? "Reading" : "Quiz"}" to add content.` : "Your teacher hasn't added this yet."}
                </div>
              </div>
            ) : tab === "members" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Admins */}
                {(members.admins?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: B.navy, marginBottom: 12 }}>👤 Admins</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {members.admins.map((member: any) => (
                        <div key={member.id} style={{
                          padding: "12px 16px",
                          borderRadius: 12,
                          border: `1.5px solid ${B.light}`,
                          background: B.offW,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>{member.firstName} {member.lastName}</div>
                            <div style={{ fontSize: 12, color: B.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                              <Mail size={12}/> {member.email}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, background: `${B.gold}20`, color: B.gold, padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>Admin</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teachers */}
                {(members.teachers?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: B.navy, marginBottom: 12 }}>🎓 Teachers</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {members.teachers.map((member: any) => (
                        <div key={member.id} style={{
                          padding: "12px 16px",
                          borderRadius: 12,
                          border: `1.5px solid ${B.light}`,
                          background: B.offW,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>{member.firstName} {member.lastName}</div>
                            <div style={{ fontSize: 12, color: B.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                              <Mail size={12}/> {member.email}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onRemoveMember(member.id)}
                                disabled={removingMemberIds.includes(member.id)}
                                title="Remove from course"
                                style={{
                                  border: "none",
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  borderRadius: 6,
                                  cursor: removingMemberIds.includes(member.id) ? "not-allowed" : "pointer",
                                  padding: "6px 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: removingMemberIds.includes(member.id) ? 0.6 : 1,
                                }}
                              >
                                <X size={16} />
                              </button>
                            )}
                            <span style={{ fontSize: 11, background: `${B.gold}20`, color: B.gold, padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>Teacher</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Students */}
                {(members.students?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: B.navy, marginBottom: 12 }}>👥 Students ({members.students?.length ?? 0})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {members.students.map((member: any) => (
                        <div key={member.id} style={{
                          padding: "12px 16px",
                          borderRadius: 12,
                          border: `1.5px solid ${B.light}`,
                          background: B.offW,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: B.navy, fontSize: 14 }}>{member.firstName} {member.lastName}</div>
                            <div style={{ fontSize: 12, color: B.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                              <Mail size={12}/> {member.email}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onRemoveMember(member.id)}
                                disabled={removingMemberIds.includes(member.id)}
                                title="Remove from course"
                                style={{
                                  border: "none",
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  borderRadius: 6,
                                  cursor: removingMemberIds.includes(member.id) ? "not-allowed" : "pointer",
                                  padding: "6px 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  opacity: removingMemberIds.includes(member.id) ? 0.6 : 1,
                                }}
                              >
                                <X size={16} />
                              </button>
                            )}
                            <span style={{ fontSize: 11, background: B.light, color: B.muted, padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>Student</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(members.admins?.length ?? 0) === 0 && (members.teachers?.length ?? 0) === 0 && (members.students?.length ?? 0) === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: B.offW, borderRadius: 14, border: `1.5px dashed ${B.light}` }}>
                    <div style={{ fontSize: 32, marginBottom: 8, opacity: .4 }}>👥</div>
                    <div style={{ fontWeight: 700, color: B.navy, marginBottom: 4, fontSize: 15 }}>No members yet</div>
                    <div style={{ fontSize: 13, color: B.muted }}>Members will appear here once enrolled.</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: activeDocumentLesson ? "none" : "flex", flexDirection: "column", gap: 8 }}>
                {visible.map((l: any, i: number) => {
                  const done = completedSet.has(l.id) || l.completed;
                  const kind: LessonKind = l.kind === "reading" ? "reading" : l.kind === "quiz" ? "quiz" : "video";
                  return (
                    <div
                      key={l.id}
                      className="lesson-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr auto auto",
                        alignItems: "center", gap: 14, padding: "14px 16px",
                        borderRadius: 14, border: `1.5px solid ${done ? B.success + "44" : B.light}`,
                        background: done ? `${B.success}08` : B.offW,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: done ? B.success : `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                        color: B.white, display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 13, flexShrink: 0,
                      }}>
                        {done ? <CheckCircle2 size={17}/> : i + 1}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: B.navy, fontSize: 14, marginBottom: 3 }}>{l.title}</div>
                        
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          {l.durationMinutes > 0 && (
                            <span style={{ fontSize: 11.5, color: B.muted, display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={11}/> {l.durationMinutes} min{kind === "reading" ? " read" : kind === "quiz" ? " quiz" : ""}
                            </span>
                          )}
                          <span style={{ fontSize: 11.5, color: B.gold, display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                            <Sparkles size={11}/> {l.xpReward ?? 50} XP
                          </span>
                          {kind === "quiz" && <Pill color={B.gold}>Quiz</Pill>}
                          {done && <Pill color={B.success}>Completed</Pill>}
                        </div>
                      </div>

                      {kind === "video" ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Link href={`/lessons/${l.id}`} style={{
                            background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                            color: B.white, textDecoration: "none",
                            padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: 6,
                          }}>
                            <Play size={12}/> Watch
                            <ChevronRight size={12}/>
                          </Link>
                          {canManageCourse && (
                            <button type="button" onClick={() => setEditingLesson(l)} style={{
                              background: "transparent", border: "1px solid rgba(0,0,0,0.25)", outline: "1px solid rgba(0,0,0,0.15)", color: B.navy,
                              padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                            }}>
                              Edit
                            </button>
                          )}
                        </div>
                      ) : kind === "reading" && l.content?.startsWith("__pdf__:") ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button type="button" onClick={() => setActiveDocumentLesson(ensureCompleted(l))} style={{
                            background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                            color: B.white, border: "none", padding: "8px 16px", borderRadius: 10,
                            fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex",
                            alignItems: "center", gap: 6,
                          }}>
                            <BookOpen size={12}/> Read
                            <ChevronRight size={12}/>
                          </button>
                          {canManageCourse && (
                            <button type="button" onClick={() => setEditingLesson(l)} style={{
                              background: "transparent", border: "1px solid rgba(0,0,0,0.25)", outline: "1px solid rgba(0,0,0,0.15)", color: B.navy,
                              padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                            }}>
                              Edit
                            </button>
                          )}
                        </div>
                      ) : kind === "quiz" ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Link href={`/lessons/${l.id}/quiz`} style={{
                            background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                            color: B.white, textDecoration: "none", padding: "8px 16px", borderRadius: 10,
                            fontSize: 12.5, fontWeight: 700, display: "inline-flex",
                            alignItems: "center", gap: 6,
                          }}>
                            <HelpCircle size={12}/> {done ? "Retake" : "Take"}
                            <ChevronRight size={12}/>
                          </Link>
                          {canManageCourse && (
                            <button
                              type="button"
                              onClick={() => setEditingQuizLesson(l)}
                              style={{
                                background: "transparent", border: "1px solid rgba(0,0,0,0.25)", outline: "1px solid rgba(0,0,0,0.15)", color: B.navy,
                                padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Link href={`/lessons/${l.id}`} style={{
                            background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                            color: B.white, textDecoration: "none",
                            padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                            display: "inline-flex", alignItems: "center", gap: 6,
                          }}>
                            <BookOpen size={12}/> Read
                            <ChevronRight size={12}/>
                          </Link>
                          {canManageCourse && (
                            <button type="button" onClick={() => setEditingLesson(l)} style={{
                              background: "transparent", border: "1px solid rgba(0,0,0,0.25)", outline: "1px solid rgba(0,0,0,0.15)", color: B.navy,
                              padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                            }}>
                              Edit
                            </button>
                          )}
                        </div>
                      )}

                      {canManageCourse && (
                        <button type="button" onClick={() => onDelete(l.id)} disabled={deleteLesson.isPending} style={{
                          background: "transparent", border: "1px solid rgba(0,0,0,0.25)", outline: "1px solid rgba(0,0,0,0.15)", color: B.error,
                          padding: 8, borderRadius: 9, cursor: deleteLesson.isPending ? "wait" : "pointer", display: "flex",
                          opacity: deleteLesson.isPending ? 0.5 : 1,
                        }} title="Delete lesson">
                          <Trash2 size={14}/>
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
