import { StaticPageShell } from "@/pages/StaticPage";

const B = {
  navy: "#1B2B5E",
  gold: "#C9A84C",
  goldL: "#E8C96A",
  offW: "#F8F6F1",
  light: "#E8EBF4",
  muted: "#64748b",
  text: "#1a1a2e",
  greenBg: "#F0FDF4",
  greenText: "#166534",
  redBg: "#FFF1F2",
  redText: "#9F1239",
  blueBg: "#EFF6FF",
  blueText: "#1E40AF",
  amberBg: "#FFFBEB",
  amberText: "#92400E",
};

type BadgeVariant = "required" | "optional" | "mandatory" | "strict";

const Badge = ({ variant, label }: { variant: BadgeVariant; label: string }) => {
  const styles: Record<BadgeVariant, { bg: string; color: string }> = {
    required: { bg: B.greenBg, color: B.greenText },
    optional: { bg: B.blueBg, color: B.blueText },
    mandatory: { bg: B.redBg, color: B.redText },
    strict: { bg: B.amberBg, color: B.amberText },
  };
  const s = styles[variant];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        background: s.bg,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
};

const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "20px 24px",
      background: B.navy,
      borderRadius: "14px 14px 0 0",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: "rgba(201,168,76,.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{subtitle}</div>
    </div>
  </div>
);

type TableRow = {
  rule: string;
  detail: string;
  badge: BadgeVariant;
  label: string;
};

const RulesTable = ({ rows }: { rows: TableRow[] }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#F1F4FA" }}>
          <th
            style={{
              padding: "11px 20px",
              textAlign: "left",
              fontSize: 11,
              fontWeight: 800,
              color: B.navy,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              width: "22%",
              borderBottom: `2px solid ${B.light}`,
            }}
          >
            Rule
          </th>
          <th
            style={{
              padding: "11px 20px",
              textAlign: "left",
              fontSize: 11,
              fontWeight: 800,
              color: B.navy,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              borderBottom: `2px solid ${B.light}`,
            }}
          >
            Details & Expectations
          </th>
          <th
            style={{
              padding: "11px 20px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 800,
              color: B.navy,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              width: "14%",
              borderBottom: `2px solid ${B.light}`,
            }}
          >
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.rule}
            style={{
              background: i % 2 === 0 ? "#fff" : "#FAFBFD",
              borderBottom: `1px solid ${B.light}`,
            }}
          >
            <td
              style={{
                padding: "14px 20px",
                fontWeight: 800,
                fontSize: 13.5,
                color: B.navy,
                verticalAlign: "top",
              }}
            >
              {row.rule}
            </td>
            <td
              style={{
                padding: "14px 20px",
                fontSize: 13.5,
                color: B.muted,
                lineHeight: 1.7,
                verticalAlign: "top",
              }}
            >
              {row.detail}
            </td>
            <td style={{ padding: "14px 20px", textAlign: "center", verticalAlign: "top" }}>
              <Badge variant={row.badge} label={row.label} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const sections = [
  {
    icon: "📋",
    title: "Attendance & Punctuality",
    subtitle: "Presence and time management expectations",
    rows: [
      {
        rule: "Minimum Attendance",
        detail:
          "Students must attend at least 80% of scheduled live sessions per term to remain in good academic standing. Attendance is tracked automatically via the portal.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Absence Notification",
        detail:
          "Parents or guardians must notify the school of any planned absences at least 24 hours in advance through the student portal or by contacting administration directly.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Joining Sessions",
        detail:
          "Students should connect to the virtual classroom at least 5 minutes before the scheduled start time to allow for technical checks and avoid disrupting the lesson.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Late Arrivals",
        detail:
          "Joining more than 10 minutes after the session begins counts as a late mark. Three late marks in a term are equivalent to one absence for attendance tracking purposes.",
        badge: "strict" as BadgeVariant,
        label: "Enforced",
      },
      {
        rule: "Makeup Sessions",
        detail:
          "Recorded sessions are available for up to 7 days after the live class. Students who miss a session must watch the recording and complete any assigned work within that window.",
        badge: "optional" as BadgeVariant,
        label: "Encouraged",
      },
    ],
  },
  {
    icon: "🤝",
    title: "Conduct & Behaviour",
    subtitle: "Standards for respectful participation and interaction",
    rows: [
      {
        rule: "Respectful Communication",
        detail:
          "All students must communicate respectfully with teachers, staff, and fellow classmates at all times — in live sessions, the messaging portal, and all school-related channels.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Anti-Bullying Policy",
        detail:
          "Any form of bullying, harassment, or targeted unkindness — verbal, written, or otherwise — is strictly prohibited and subject to immediate disciplinary review.",
        badge: "strict" as BadgeVariant,
        label: "Zero Tolerance",
      },
      {
        rule: "Classroom Etiquette",
        detail:
          "Microphones should be muted when not speaking. Video is encouraged during interactive sessions. Distracting behaviour in the virtual classroom is not permitted.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Appropriate Dress",
        detail:
          "Students appearing on camera should be dressed modestly and appropriately as they would be in a physical school environment.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Language Standards",
        detail:
          "Instruction is conducted in formal Arabic and/or English depending on the course. The use of offensive, vulgar, or inappropriate language in any form is not tolerated.",
        badge: "strict" as BadgeVariant,
        label: "Enforced",
      },
    ],
  },
  {
    icon: "📚",
    title: "Academic Integrity",
    subtitle: "Honesty, originality, and fair assessment",
    rows: [
      {
        rule: "Original Work",
        detail:
          "All assignments, essays, and assessments must represent the student's own work. Copying, paraphrasing without attribution, or submitting AI-generated content as original work is not permitted.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Plagiarism",
        detail:
          "Submitting the work of another student, or reproducing content from external sources without proper citation, constitutes plagiarism and may result in a zero grade and disciplinary action.",
        badge: "strict" as BadgeVariant,
        label: "Zero Tolerance",
      },
      {
        rule: "Assessment Conduct",
        detail:
          "During timed tests and quizzes, students may not consult other people or unauthorised materials unless explicitly stated by the teacher. Violations will be treated as cheating.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Submission Deadlines",
        detail:
          "Assignments must be submitted by the stated deadline. Late submissions may receive a grade penalty. Extensions can be requested in advance through the portal with a valid reason.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Citing Sources",
        detail:
          "When referencing books, articles, or online material, students should acknowledge the source clearly. Teachers will guide students on appropriate citation formats for their level.",
        badge: "optional" as BadgeVariant,
        label: "Encouraged",
      },
    ],
  },
  {
    icon: "🔒",
    title: "Online Safety & Technology",
    subtitle: "Responsible digital use and account security",
    rows: [
      {
        rule: "Account Security",
        detail:
          "Login credentials are personal and must never be shared with anyone, including friends or siblings. Students are responsible for all activity that occurs under their account.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Messaging Guidelines",
        detail:
          "The in-platform messaging system is for educational communication only. All messages may be monitored by school staff to ensure the safety and wellbeing of all students.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Device Requirements",
        detail:
          "A device capable of running a modern browser, with a working microphone and camera, is required for full participation. A stable internet connection of at least 5 Mbps is recommended.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Screen Recording",
        detail:
          "Students may not record, capture, screenshot, or redistribute live session content without explicit written permission from the school. Lessons may be recorded by the school for academic purposes.",
        badge: "strict" as BadgeVariant,
        label: "Prohibited",
      },
      {
        rule: "External Platforms",
        detail:
          "Students should exercise caution when sharing personal information on external platforms. Any school-related communication should be conducted exclusively through official Al Shamail channels.",
        badge: "optional" as BadgeVariant,
        label: "Advisory",
      },
    ],
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent & Guardian Responsibilities",
    subtitle: "Partnership expectations between the school and families",
    rows: [
      {
        rule: "Contact Information",
        detail:
          "Parents must ensure their contact details in the portal are accurate and up to date. The school communicates critical information via the registered email and phone number.",
        badge: "mandatory" as BadgeVariant,
        label: "Mandatory",
      },
      {
        rule: "Portal Engagement",
        detail:
          "Parents are expected to regularly review their child's progress, grades, and communications through the parent dashboard at least once per week.",
        badge: "required" as BadgeVariant,
        label: "Required",
      },
      {
        rule: "Fee Payments",
        detail:
          "Tuition fees must be paid by the due date specified in the enrollment agreement. Students whose fees are in arrears by more than 14 days may have portal access temporarily restricted.",
        badge: "strict" as BadgeVariant,
        label: "Enforced",
      },
      {
        rule: "Learning Environment",
        detail:
          "Parents should ensure their child has a quiet, dedicated space for attending live sessions and completing coursework, free from significant distractions.",
        badge: "optional" as BadgeVariant,
        label: "Encouraged",
      },
      {
        rule: "Feedback & Concerns",
        detail:
          "Parents are encouraged to raise any concerns or feedback through the official contact channels rather than directly during live lessons. The school commits to responding within 2 working days.",
        badge: "optional" as BadgeVariant,
        label: "Encouraged",
      },
    ],
  },
];

export default function EnrollmentRules() {
  return (
    <StaticPageShell
      title={
        <div style={{ display: "inline-block", transform: "translateX(14px)" }}>
          Rules{" "}
          <span
            style={{
              fontFamily:
                "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
              fontWeight: 700,
              fontStyle: "normal",
              verticalAlign: "middle",
            }}
          >
            &
          </span>{" "}
          Regulations
        </div>
      }
      tag="Enrollment"
    >
      {/* Intro note */}
      <p
        style={{
          textAlign: "center",
          color: B.muted,
          fontSize: 15,
          lineHeight: 1.75,
          maxWidth: 680,
          margin: "0 auto 40px",
        }}
      >
        By enrolling at Al Shamail International Academy, students and their families agree to uphold the
        following standards. These rules exist to ensure a safe, focused, and respectful learning environment
        for everyone.
      </p>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          marginBottom: 44,
        }}
      >
        {(
          [
            { variant: "mandatory" as BadgeVariant, label: "Mandatory", desc: "Strictly enforced" },
            { variant: "required" as BadgeVariant, label: "Required", desc: "Expected of all students" },
            { variant: "strict" as BadgeVariant, label: "Enforced / Zero Tolerance", desc: "No exceptions" },
            { variant: "optional" as BadgeVariant, label: "Encouraged / Advisory", desc: "Best practice" },
          ] as { variant: BadgeVariant; label: string; desc: string }[]
        ).map((item) => (
          <div
            key={item.variant}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: `1px solid ${B.light}`,
              borderRadius: 10,
              padding: "7px 14px",
              fontSize: 12,
              color: B.muted,
            }}
          >
            <Badge variant={item.variant} label={item.label} />
            <span>— {item.desc}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              border: `1px solid ${B.light}`,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(27,43,94,.06)",
            }}
          >
            <SectionHeader icon={section.icon} title={section.title} subtitle={section.subtitle} />
            <RulesTable rows={section.rows} />
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        style={{
          marginTop: 48,
          padding: "20px 28px",
          background: "#fff",
          border: `1px solid ${B.light}`,
          borderRadius: 14,
          borderLeft: `4px solid ${B.gold}`,
          fontSize: 13.5,
          color: B.muted,
          lineHeight: 1.75,
        }}
      >
        <strong style={{ color: B.navy }}>Policy Updates:</strong> Al Shamail International Academy reserves
        the right to amend these rules at any time. Enrolled families will be notified of significant changes
        via email at least 7 days before they take effect. Continued enrollment constitutes acceptance of the
        current rules and regulations.
      </div>
    </StaticPageShell>
  );
}

