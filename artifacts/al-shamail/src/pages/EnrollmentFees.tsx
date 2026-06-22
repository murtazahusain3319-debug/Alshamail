import React from "react";
import { StaticPageShell } from "@/pages/StaticPage";

const colors = {
  navy: "#1B2B5E",
  gold: "#C9A84C",
  goldD: "#A8873A",
  goldL: "#E8C96A",
  offW: "#F8F6F1",
  text: "#1a1a2e",
  muted: "#64748b",
  light: "#E8EBF4",
  green: "#16a34a",
  greenL: "#f0fdf4",
  amber: "#d97706",
  amberL: "#fffbeb",
  blue: "#2563eb",
  blueL: "#eff6ff",
  purple: "#7c3aed",
  purpleL: "#f5f3ff",
};

function SectionHeader({ icon, title, color = colors.navy }: { icon: string; title: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
        paddingBottom: 12,
        borderBottom: `2px solid ${color}33`,
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 900,
          color: color,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function InfoCard({ icon, label, value, note }: { icon: string; label: string; value: string; note?: string }) {
  return (
    <div
      style={{
        background: colors.blueL,
        borderRadius: 12,
        border: `1px solid ${colors.blue}33`,
        padding: 18,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.blue, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: colors.navy, marginBottom: 4 }}>{value}</div>
      {note && <div style={{ fontSize: 11, color: colors.muted }}>{note}</div>}
    </div>
  );
}

function FeatureBox({
  title,
  items,
  bgColor = colors.greenL,
  borderColor = colors.green,
}: {
  title: string;
  items: { label: string; value: string }[];
  bgColor?: string;
  borderColor?: string;
}) {
  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 12,
        border: `1px solid ${borderColor}33`,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: colors.navy }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: colors.text }}>{item.label}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: borderColor }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EnrollmentFees() {
  return (
    <StaticPageShell title="Fee Structure 2026–2027" tag="Enrollment & Fees">
      {/* Quick Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 40,
        }}
      >
        <InfoCard icon="🎓" label="Starting From" value="300 SR" note="per month" />
        <InfoCard icon="📝" label="Registration" value="300 SR" note="one-time" />
        <InfoCard icon="👨‍👩‍👧‍👦" label="Sibling Discount" value="Up to 15%" note="for 4+ children" />
        <InfoCard icon="🏆" label="Merit Award" value="Up to 25%" note="scholarship" />
      </div>

      {/* Monthly Tuition Fees */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon="📚" title="Monthly Tuition Fees" color={colors.navy} />
        <div style={{ overflowX: "auto", borderRadius: 12, background: "#fff", border: `1px solid ${colors.light}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ background: colors.offW }}>
                <th style={{ padding: 14, textAlign: "left", fontSize: 12, fontWeight: 800, color: colors.muted, borderBottom: `2px solid ${colors.light}` }}>
                  Class / Programme
                </th>
                <th style={{ padding: 14, textAlign: "left", fontSize: 12, fontWeight: 800, color: colors.muted, borderBottom: `2px solid ${colors.light}` }}>
                  Monthly (SR)
                </th>
                <th style={{ padding: 14, textAlign: "left", fontSize: 12, fontWeight: 800, color: colors.muted, borderBottom: `2px solid ${colors.light}` }}>
                  Annual (10 months)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { prog: "KG I, KG II, KG III", monthly: 350 },
                { prog: "Grade 1 – Grade 5", monthly: 300 },
                { prog: "O-Level 1 & 2", monthly: 500 },
                { prog: "O-Level 3 & 4", monthly: 600 },
                { prog: "A-Level 1, 2 & 3", monthly: 800 },
              ].map((row, i) => (
                <tr key={row.prog} style={{ background: i % 2 === 0 ? "#fff" : colors.offW }}>
                  <td style={{ padding: 14, fontWeight: 700, color: colors.navy, borderBottom: `1px solid ${colors.light}` }}>
                    {row.prog}
                  </td>
                  <td style={{ padding: 14, fontWeight: 700, fontSize: 16, color: colors.gold, borderBottom: `1px solid ${colors.light}` }}>
                    {row.monthly} SR
                  </td>
                  <td style={{ padding: 14, color: colors.text, borderBottom: `1px solid ${colors.light}` }}>
                    {row.monthly * 10} SR
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: colors.muted }}>
          ✦ Registration fee (300 SR) is charged separately, one-time per student.
        </p>
      </div>

      {/* Sibling Discount */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon="👨‍👩‍👧‍👦" title="Sibling Discount Plan" color={colors.green} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { children: "2 Children", discount: "5%", detail: "Discount on tuition fee of both children" },
            { children: "3 Children", discount: "10%", detail: "Discount on tuition + 3rd child registration waived" },
            { children: "4 or More", discount: "15%", detail: "Discount on tuition + 3rd child onwards registration waived" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: colors.greenL,
                borderRadius: 12,
                border: `1px solid ${colors.green}33`,
                padding: 18,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.green, marginBottom: 6 }}>
                {item.children}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: colors.green, marginBottom: 8 }}>
                {item.discount}
              </div>
              <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            background: colors.greenL,
            borderRadius: 10,
            border: `1px solid ${colors.green}44`,
            padding: 12,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 16 }}>🎁</span>
          <span style={{ fontSize: 13, color: colors.text }}>
            <strong>Special Offer:</strong> Registration fee (300 SR) is waived for the 3rd child onwards.
          </span>
        </div>
      </div>

      {/* Advance Payment Discounts */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon="💳" title="Advance Payment Discounts" color={colors.amber} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { plan: "Quarterly", advance: "3 Months", discount: "5%", extra: "" },
            { plan: "Semi-Annual", advance: "6 Months", discount: "8%", extra: "" },
            { plan: "Annual", advance: "Full Year", discount: "12%", extra: "+ Reg. fee waived" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: colors.amberL,
                borderRadius: 12,
                border: `1px solid ${colors.amber}33`,
                padding: 18,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.amber, marginBottom: 4 }}>
                {item.plan} Payment
              </div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>
                {item.advance} Advance
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: colors.amber, marginBottom: 6 }}>
                {item.discount}
              </div>
              <div style={{ fontSize: 11, color: colors.text }}>on tuition fee</div>
              {item.extra && (
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.amber, marginTop: 8 }}>
                  {item.extra}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Merit Scholarship */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon="🏆" title="Merit Scholarship Program" color={colors.purple} />

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: colors.navy, marginBottom: 14 }}>
            Academic Excellence Scholarship
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { range: "95% and above", scholarship: "25%", color: colors.purple, bg: colors.purpleL },
              { range: "90%–94%", scholarship: "15%", color: "#6d28d9", bg: "#ede9fe" },
              { range: "85%–89%", scholarship: "10%", color: "#5b21b6", bg: "#ddd6fe" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: item.bg,
                  borderRadius: 10,
                  border: `1px solid ${item.color}33`,
                  padding: 14,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: item.color, marginBottom: 6 }}>
                  {item.range}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>
                  {item.scholarship}
                </div>
                <div style={{ fontSize: 11, color: colors.text, marginTop: 4 }}>tuition scholarship</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: colors.muted }}>
            ✦ Scholarship is reviewed every term based on academic performance.
          </p>
        </div>

        <FeatureBox
          title="Need-Based Scholarship"
          items={[
            { label: "High Need", value: "Up to 50%" },
            { label: "Moderate Need", value: "Up to 30%" },
            { label: "Special Cases (Orphans / Widows)", value: "Up to 75%" },
          ]}
          bgColor={colors.purpleL}
          borderColor={colors.purple}
        />

        <div style={{ background: colors.purpleL, borderRadius: 10, border: `1px solid ${colors.purple}33`, padding: 16 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: colors.navy }}>
            Al Shamail Education Support Program
          </h4>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: colors.muted }}>
            For deserving families: Application form, income proof, and interview with academy management required.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: colors.text, fontWeight: 700 }}>
            ⚠️ Limited seats available each academic year.
          </p>
        </div>
      </div>

      {/* Referral Program */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader icon="🔗" title="Referral Program" color="#0891b2" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { trigger: "Refer 1 Student", reward: "50 SR", sub: "tuition credit" },
            { trigger: "Refer 3 Students", reward: "200 SR", sub: "tuition credit" },
            { trigger: "Refer 5 Students", reward: "1 Month", sub: "free tuition (max 1 child)" },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "#ecfeff",
                borderRadius: 10,
                border: "1px solid #0891b233",
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0891b2", marginBottom: 8 }}>
                {item.trigger}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0891b2", marginBottom: 4 }}>
                {item.reward}
              </div>
              <div style={{ fontSize: 11, color: colors.text }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Founder Offer */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.navy}, #243570)`,
          borderRadius: 14,
          padding: 24,
          marginBottom: 28,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 6px 24px rgba(27,43,94,.2)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: colors.gold + "18",
            top: -40,
            right: -40,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.gold,
              borderRadius: 999,
              padding: "4px 14px",
              marginBottom: 12,
            }}
          >
            <span>⭐</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>
              Founder Offer
            </span>
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>
            For the First 100 Students
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {[
              { icon: "📝", text: "Registration Fee: 300 SR" },
              { icon: "💰", text: "First Month Tuition: 10% Discount" },
              { icon: "🎓", text: "Free Orientation Classes" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 0", borderTop: `1px solid ${colors.light}` }}>
        <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>
          For inquiries about scholarships, payment plans, or enrollment,
          <br />
          please contact our admissions team.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: colors.muted }}>
          Fees are subject to review each academic year.
        </p>
      </div>
    </StaticPageShell>
  );
}
