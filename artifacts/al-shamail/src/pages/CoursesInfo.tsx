import { StaticPageShell } from "@/pages/StaticPage";

export default function CoursesInfo() {
  return (
    <StaticPageShell title="Courses" tag="Subjects">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {[
          { t: "Mathematics", d: "Primary to secondary coverage with strong foundations and problem solving." },
          { t: "English & Literacy", d: "Reading, comprehension, writing, and grammar—paced for each learner." },
          { t: "Science", d: "Engaging explorations with clear explanations and real-world connections." },
          { t: "Geography", d: "Global perspectives and understanding the world around us." },
          { t: "Critical Thinking", d: "Logic, reasoning, and structured problem-solving skills." },
          { t: "Digital Literacy", d: "Safe, practical skills for learning and communicating online." },
        ].map((c) => (
          <div key={c.t} style={{ background: "#fff", border: "1px solid #E8EBF4", borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 900, color: "#1B2B5E", marginBottom: 8 }}>{c.t}</div>
            <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7 }}>{c.d}</div>
          </div>
        ))}
      </div>
    </StaticPageShell>
  );
}

