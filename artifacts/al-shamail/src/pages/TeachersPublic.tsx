import { StaticPageShell } from "@/pages/StaticPage";

export default function TeachersPublic() {
  return (
    <StaticPageShell title="Meet Our Teachers" tag="Academy">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {[
          { name: "Ms. Amira Hassan", subject: "Head of Mathematics", bio: "Known for making complex ideas simple and fun." },
          { name: "Mr. James Whitfield", subject: "English Language & Literacy", bio: "Specialist in early reading and comprehension." },
          { name: "Dr. Priya Nair", subject: "Science", bio: "Brings real-world science into every lesson." },
          { name: "Mr. Tariq Al‑Rashid", subject: "Geography & World Studies", bio: "Global perspectives and real experience in every session." },
        ].map((t) => (
          <div key={t.name} style={{ background: "#fff", border: "1px solid #E8EBF4", borderRadius: 16, padding: 18 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, color: "#1B2B5E", fontSize: 16 }}>{t.name}</div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#A8873A", textTransform: "uppercase", letterSpacing: ".08em" }}>{t.subject}</div>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.75 }}>{t.bio}</p>
          </div>
        ))}
      </div>
    </StaticPageShell>
  );
}

