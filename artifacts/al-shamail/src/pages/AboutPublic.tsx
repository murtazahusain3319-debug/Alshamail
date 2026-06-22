import { StaticPageShell } from "@/pages/StaticPage";

export default function AboutPublic() {
  return (
    <StaticPageShell title="About Al Shamail" tag="Academy">
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#64748b" }}>
        Al Shamail International Academy Online was founded to make exceptional education accessible to every child, regardless of location.
        We combine a structured curriculum with a nurturing online environment, so learners can build confidence and achieve strong outcomes.
      </p>
      <div style={{ height: 18 }} />
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#64748b" }}>
        Our approach focuses on clarity, consistency, and genuine teacher support—paired with an engaging platform that keeps children motivated.
      </p>
    </StaticPageShell>
  );
}

