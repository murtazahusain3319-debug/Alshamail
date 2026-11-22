import { StaticPageShell } from "@/pages/StaticPage";

export default function ContactPublic() {
  return (
    <StaticPageShell title="Contact Us" tag="Support">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #E8EBF4", borderRadius: 16, padding: 18 }}>
          <div style={{ fontWeight: 900, color: "#1B2B5E", marginBottom: 10 }}>Admissions</div>
          <div style={{ color: "#64748b", lineHeight: 1.8, fontSize: 14 }}>
            Email: admissions@alshamail.academy
            <br />
            Office hours: Mon–Fri, 9:00 AM – 5:00 PM (GMT)
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E8EBF4", borderRadius: 16, padding: 18 }}>
          <div style={{ fontWeight: 900, color: "#1B2B5E", marginBottom: 10 }}>General</div>
          <div style={{ color: "#64748b", lineHeight: 1.8, fontSize: 14 }}>
            Response time: within 24 hours on school days.
            <br />
            For urgent matters, please email admissions.
          </div>
        </div>
      </div>
      <section style={{ marginTop: 16, background: "#fff", border: "1px solid #E8EBF4", borderRadius: 16, padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: "#1B2B5E", margin: "0 0 10px" }}>Address</h2>
        <address style={{ color: "#64748b", lineHeight: 1.8, fontSize: 14, fontStyle: "normal" }}>
          EDGA7969, 7969 Al Imam Ali Ibn Abi Talib, 2296, Ash Shifa Dist., DAMMAM, Eastern Province, 32236
        </address>
      </section>
      <div style={{ marginTop: 18, color: "#64748b", fontSize: 13 }}>
        Note: This page is informational; in-app messaging is available once you’re enrolled and signed in.
      </div>
    </StaticPageShell>
  );
}

