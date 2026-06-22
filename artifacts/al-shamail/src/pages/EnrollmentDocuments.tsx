import { StaticPageShell } from "@/pages/StaticPage";

export default function EnrollmentDocuments() {
  return (
    <StaticPageShell title="Documents Required" tag="Enrollment">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {[
          "Birth certificate or age verification",
          "Passport-style photo of the student",
          "Previous school reports (if available)",
          "Medical / SEN information (if applicable)",
          "Parent / guardian proof of identity",
          "Proof of address (recent utility bill or statement)",
        ].map((doc) => (
          <div
            key={doc}
            style={{
              background: "#fff",
              border: "1px solid #E8EBF4",
              borderRadius: 16,
              padding: 18,
              fontWeight: 700,
              color: "#1B2B5E",
              lineHeight: 1.5,
            }}
          >
            {doc}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 14, color: "#64748b", fontSize: 13, lineHeight: 1.7 }}>
        Documents can be submitted digitally during enrollment. Originals are not required unless requested by admissions.
      </p>
    </StaticPageShell>
  );
}

