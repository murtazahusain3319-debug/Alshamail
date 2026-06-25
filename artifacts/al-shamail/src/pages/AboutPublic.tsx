import { StaticPageShell } from "@/pages/StaticPage";

export default function AboutPublic() {
  return (
    <StaticPageShell title="About Al Shamail" tag="Academy">
      <div style={{ display: "grid", gap: 18 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#64748b" }}>
          Al Shamail International Academy Online was founded to make exceptional education accessible to every child, regardless of location.
          We combine a structured curriculum with a nurturing online environment, so learners can build confidence and achieve strong outcomes.
        </p>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            ["Structured learning", "Every student follows a clear learning path with guided lessons, assessments, and feedback."],
            ["Qualified educators", "Our teachers are experienced, supportive, and committed to each learner’s growth."],
            ["Family-focused", "Parents receive a transparent view of progress, achievements, and next steps."],
          ].map(([title, body]) => (
            <div key={title} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
              <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#64748b" }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    </StaticPageShell>
  );
}

