import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  applicationsTable,
  coursesTable,
  badgesTable,
  scheduleEventsTable,
  messagesTable,
  xpEventsTable,
} from "@workspace/db";
import { logger } from "./logger";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysFromNow(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

const STUDENT_HASH_ROUNDS = 10;
const DEMO_LOGIN_EMAILS = new Set([
  "admin@alshamail.edu",
  "teacher@alshamail.edu",
  "student@alshamail.edu",
]);

const seedUsers = [
  { firstName: "Hadia", lastName: "Al-Mansouri", email: "admin@alshamail.edu", role: "admin", isAdmin: true, password: "admin123", phone: "+971 50 111 2200", bio: "Headmistress · Al Shamail Academy", xp: 0, level: 1, streak: 0 },
  { firstName: "Omar", lastName: "Bin Saleh", email: "teacher@alshamail.edu", role: "teacher", isAdmin: false, password: "teacher123", department: "Quranic Studies", phone: "+971 50 222 3300", bio: "Quranic studies & Tajwid · 12 years teaching", xp: 0, level: 1, streak: 0 },
  { firstName: "Layla", lastName: "Hashimi", email: "layla.teacher@alshamail.edu", role: "teacher", isAdmin: false, password: "teacher123", department: "Mathematics", phone: "+971 50 333 4400", bio: "Mathematics teacher · loves real-world problems", xp: 0, level: 1, streak: 0 },
  { firstName: "Yusuf", lastName: "Rahman", email: "yusuf.teacher@alshamail.edu", role: "teacher", isAdmin: false, password: "teacher123", department: "Science", phone: "+971 50 444 5500", bio: "Science enthusiast · physics & biology", xp: 0, level: 1, streak: 0 },
  { firstName: "Aisha", lastName: "Khan", email: "student@alshamail.edu", role: "student", isAdmin: false, password: "student123", grade: "Year 6", xp: 4250, level: 8, streak: 14 },
  { firstName: "Bilal", lastName: "Ahmed", email: "bilal@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 5", xp: 3680, level: 7, streak: 9 },
  { firstName: "Zara", lastName: "Iqbal", email: "zara@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 6", xp: 3120, level: 6, streak: 21 },
  { firstName: "Hamza", lastName: "Siddiqui", email: "hamza@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 7", xp: 2840, level: 6, streak: 5 },
  { firstName: "Mariam", lastName: "Hussain", email: "mariam@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 5", xp: 2410, level: 5, streak: 11 },
  { firstName: "Idris", lastName: "Mahmood", email: "idris@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 7", xp: 2100, level: 5, streak: 3 },
  { firstName: "Safiya", lastName: "Abdul", email: "safiya@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 6", xp: 1820, level: 4, streak: 7 },
  { firstName: "Tariq", lastName: "Yusufzai", email: "tariq@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 8", xp: 1540, level: 4, streak: 1 },
  { firstName: "Nadia", lastName: "Farooqi", email: "nadia@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 5", xp: 1320, level: 3, streak: 4 },
  { firstName: "Khalid", lastName: "Ansari", email: "khalid@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 8", xp: 1080, level: 3, streak: 0 },
  { firstName: "Ruqayya", lastName: "Bakr", email: "ruqayya@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 7", xp: 870, level: 2, streak: 2 },
  { firstName: "Imran", lastName: "Daud", email: "imran@example.com", role: "student", isAdmin: false, password: "student123", grade: "Year 6", xp: 640, level: 2, streak: 6 },
];

async function ensureDemoUsers(): Promise<void> {
  for (const u of seedUsers) {
    if (!DEMO_LOGIN_EMAILS.has(u.email)) continue;
    const passwordHash = await bcrypt.hash(u.password, STUDENT_HASH_ROUNDS);
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, u.email))
      .limit(1);

    if (existing) {
      await db
        .update(usersTable)
        .set({
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isAdmin: u.isAdmin,
          passwordHash,
          phone: u.phone ?? null,
          bio: u.bio ?? null,
          department: u.department ?? null,
          grade: u.grade ?? null,
        })
        .where(eq(usersTable.id, existing.id));
      continue;
    }

    await db.insert(usersTable).values({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isAdmin: u.isAdmin,
      passwordHash,
      phone: u.phone ?? null,
      bio: u.bio ?? null,
      department: u.department ?? null,
      grade: u.grade ?? null,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
    });
  }
}

export async function seedIfEmpty(): Promise<void> {
  await ensureDemoUsers();
  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) {
    logger.info("Seed skipped — users already exist (demo logins ensured)");
    return;
  }

  logger.info("Seeding initial demo data …");

  /* Users */
  const userRows = await Promise.all(
    seedUsers.map(async (u) => ({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isAdmin: u.isAdmin,
      passwordHash: await bcrypt.hash(u.password, STUDENT_HASH_ROUNDS),
      phone: u.phone ?? null,
      bio: u.bio ?? null,
      department: u.department ?? null,
      grade: u.grade ?? null,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
    })),
  );
  const insertedUsers = await db.insert(usersTable).values(userRows).returning();
  const byEmail = new Map(insertedUsers.map((u) => [u.email, u]));
  const omarId = byEmail.get("teacher@alshamail.edu")!.id;
  const laylaId = byEmail.get("layla.teacher@alshamail.edu")!.id;
  const yusufId = byEmail.get("yusuf.teacher@alshamail.edu")!.id;
  const adminId = byEmail.get("admin@alshamail.edu")!.id;

  /* Applications */
  await db.insert(applicationsTable).values([
    { firstName: "Sara", lastName: "Mahmoud", email: "sara.m@example.com", phone: "+971 50 990 1122", city: "Dubai", role: "student", status: "pending", grade: "Year 5", school: "Crescent International", parentName: "Mahmoud Idris", parentPhone: "+971 50 990 1100", createdAt: daysAgo(1) },
    { firstName: "Ali", lastName: "Rashid", email: "ali.r@example.com", phone: "+971 50 778 8821", city: "Sharjah", role: "student", status: "pending", grade: "Year 7", school: "Al Noor Academy", parentName: "Rashid Ali", parentPhone: "+971 50 778 8800", createdAt: daysAgo(2) },
    { firstName: "Fatima", lastName: "Saeed", email: "fatima.s@example.com", phone: "+971 55 111 2233", city: "Abu Dhabi", role: "teacher", status: "pending", department: "English Literature", qualification: "MA English, University of Manchester", experience: "8 years secondary teaching", subjects: "English, Literature, Creative Writing", createdAt: daysAgo(3) },
    { firstName: "Hassan", lastName: "Bilal", email: "hassan.b@example.com", phone: "+971 50 444 7788", city: "Dubai", role: "student", status: "approved", grade: "Year 6", school: "Garden Hill School", parentName: "Bilal Hassan", parentPhone: "+971 50 444 7700", createdAt: daysAgo(5) },
    { firstName: "Noor", lastName: "Jaffar", email: "noor.j@example.com", phone: "+971 56 333 9911", city: "Dubai", role: "student", status: "rejected", grade: "Year 4", school: "Sunrise International", parentName: "Jaffar Hussain", parentPhone: "+971 56 333 9900", createdAt: daysAgo(7) },
    { firstName: "Zaid", lastName: "Karim", email: "zaid.k@example.com", phone: "+971 50 222 1144", city: "Ajman", role: "student", status: "pending", grade: "Year 8", school: "Pearl Academy", parentName: "Karim Zaid", parentPhone: "+971 50 222 1100", createdAt: daysAgo(0) },
  ]);

  /* Courses */
  await db.insert(coursesTable).values([
    { title: "General Biology", subject: "Biology", level: "Introductory", description: "An overview of living systems — cells, ecosystems, and the web of life. Add your own topics and lessons to shape this course.", coverEmoji: "🧬", coverColor: "#166534", teacherId: yusufId, published: true, createdAt: daysAgo(30) },
    { title: "General Chemistry", subject: "Chemistry", level: "Introductory", description: "The building blocks of matter, reactions, and everyday chemistry. Topics and lessons to be added.", coverEmoji: "⚗️", coverColor: "#7C3AED", teacherId: yusufId, published: true, createdAt: daysAgo(20) },
    { title: "General Physics", subject: "Physics", level: "Introductory", description: "Motion, energy, and the forces that shape our universe. Topics and lessons to be added.", coverEmoji: "🔭", coverColor: "#1F3A5F", teacherId: yusufId, published: true, createdAt: daysAgo(10) },
    { title: "Quranic Studies & Tajwid", subject: "Quranic Studies", level: "Year 5–8", description: "Recitation, memorisation, and reflection on selected surahs. Includes weekly live circles.", coverEmoji: "📖", coverColor: "#B58F2A", teacherId: omarId, published: true, createdAt: daysAgo(40) },
    { title: "Mathematics — Foundations", subject: "Mathematics", level: "Year 5–6", description: "Number sense, fractions, geometry, and problem-solving with everyday examples.", coverEmoji: "➗", coverColor: "#1B2B5E", teacherId: laylaId, published: true, createdAt: daysAgo(35) },
  ]);

  /* Badges */
  await db.insert(badgesTable).values([
    { name: "First Steps", description: "Completed your very first lesson.", icon: "🌱", color: "#16A34A", criteria: "lessons", threshold: 1 },
    { name: "Bookworm", description: "Completed 10 lessons across the academy.", icon: "📚", color: "#7C3AED", criteria: "lessons", threshold: 10 },
    { name: "Streak Master", description: "Maintained a 7-day learning streak.", icon: "🔥", color: "#DC2626", criteria: "streak", threshold: 7 },
    { name: "Scholar", description: "Reached 2,000 XP.", icon: "🎓", color: "#1F3A5F", criteria: "xp", threshold: 2000 },
    { name: "Star Pupil", description: "Awarded by your teacher for outstanding work.", icon: "⭐", color: "#C9A84C", criteria: "manual", threshold: null },
    { name: "Quiz Champion", description: "Scored 100% on three quizzes.", icon: "🏆", color: "#0EA5E9", criteria: "manual", threshold: null },
  ]);

  /* Schedule */
  await db.insert(scheduleEventsTable).values([
    { title: "Quranic Studies — Live Class", kind: "class", startsAt: daysFromNow(0, 16, 0), endsAt: daysFromNow(0, 17, 0), location: "Online · Zoom", link: "https://zoom.us/j/example", createdBy: omarId },
    { title: "Maths Worksheet Due", kind: "exam", startsAt: daysFromNow(1, 9, 0), location: "Submit on portal", createdBy: laylaId },
    { title: "Friday Assembly", kind: "assembly", startsAt: daysFromNow(2, 8, 30), endsAt: daysFromNow(2, 9, 15), location: "Main Hall", createdBy: adminId },
    { title: "Science Lab — Forces Experiment", kind: "class", startsAt: daysFromNow(3, 11, 0), endsAt: daysFromNow(3, 12, 0), location: "Science Block 2", createdBy: yusufId },
    { title: "Mid-term Break", kind: "holiday", startsAt: daysFromNow(7, 0, 0), endsAt: daysFromNow(11, 23, 59), notes: "School closed.", createdBy: adminId },
    { title: "Parent–Teacher Meeting", kind: "meeting", startsAt: daysFromNow(5, 14, 0), endsAt: daysFromNow(5, 17, 0), location: "Main Office", createdBy: adminId },
    { title: "Calligraphy Club", kind: "club", startsAt: daysFromNow(4, 15, 30), endsAt: daysFromNow(4, 16, 30), location: "Art Room", createdBy: laylaId },
  ]);

  /* Messages */
  const aishaId = byEmail.get("student@alshamail.edu")!.id;
  await db.insert(messagesTable).values([
    { fromUserId: omarId, toUserId: aishaId, body: "Salaam Aisha — wonderful work on Surah Al-Fatiha. Keep going.", sentAt: daysAgo(3) },
    { fromUserId: aishaId, toUserId: omarId, body: "Thank you, ustadh! I'll start the next lesson tonight.", sentAt: daysAgo(3) },
    { fromUserId: laylaId, toUserId: aishaId, body: "Reminder: maths worksheet due tomorrow.", sentAt: daysAgo(1) },
    { fromUserId: adminId, toUserId: omarId, body: "Could you share next week's Quranic studies plan?", sentAt: daysAgo(2) },
    { fromUserId: omarId, toUserId: adminId, body: "Of course — sending the brief by tomorrow morning.", sentAt: daysAgo(2) },
  ]);

  /* XP audit log — 30-day distribution per student. */
  const students = insertedUsers.filter((u) => u.role === "student");
  const xpRows: Array<typeof xpEventsTable.$inferInsert> = [];
  for (const s of students) {
    const base = Math.max(20, Math.floor(s.xp / 30));
    for (let d = 0; d < 30; d++) {
      const noise = ((s.id * 7 + d * 3) % 11) - 4;
      const amt = Math.max(0, base + noise * 5);
      if (amt > 0) {
        xpRows.push({ userId: s.id, amount: amt, reason: "Daily activity", at: daysAgo(d) });
      }
    }
  }
  if (xpRows.length > 0) await db.insert(xpEventsTable).values(xpRows);

  logger.info({ userCount: insertedUsers.length }, "Seed complete");
}
