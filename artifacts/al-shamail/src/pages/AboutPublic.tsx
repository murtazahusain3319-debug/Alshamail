import { StaticPageShell } from "@/pages/StaticPage";

export default function AboutPublic() {
  return (
    <StaticPageShell title="About Al Shamail" tag="Academy">
      <div style={{ display: "grid", gap: 24 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#64748b" }}>
          Welcome to Al Shamail Academy, a dedicated early learning institution committed to providing a safe, caring, and high-quality educational environment for young learners. We believe that early childhood education plays a vital role in shaping a child's future. Our goal is to build a strong foundation that supports lifelong learning, confidence, and personal growth.
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Our Vision</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#64748b" }}>
              To be a trusted early education center that nurtures confident, responsible, and well-rounded learners prepared for future academic success.
            </p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Our Mission</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#64748b" }}>
              To provide a safe, supportive, and stimulating learning environment where every child receives quality education, care, and individual attention.
            </p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>What We Offer</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {[
                "Safe, clean, and child-friendly environment",
                "Qualified and caring teaching staff",
                "Strong foundation in early literacy and numeracy",
                "Focus on behavior, manners, and discipline",
                "Creative and interactive learning activities",
                "Individual attention for each child",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#64748b" }}>
                  <span style={{ color: "#c9a84c", fontSize: 18 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Our Approach</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#64748b" }}>
              We follow a balanced learning approach that combines structured academics with play-based learning. This helps children develop curiosity, independence, and confidence while enjoying their learning journey.
            </p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Our Commitment</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#64748b" }}>
              We are committed to working closely with parents to ensure each child receives the support they need to reach their full potential in a positive and encouraging environment.
            </p>
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}

