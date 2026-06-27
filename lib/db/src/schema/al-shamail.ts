import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* Users (admin / teacher / student). Passwords are stored as bcrypt hashes. */
export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email").notNull(),
    role: text("role").notNull(), // student | teacher | admin
    isAdmin: boolean("is_admin").notNull().default(false),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    phone: text("phone"),
    grade: text("grade"),
    department: text("department"),
    bio: text("bio"),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    streak: integer("streak").notNull().default(0),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

/* Server-side sessions, keyed by random opaque token in cookie. */
export const sessionsTable = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

/* Admissions / staff applications. */
export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  city: text("city"),
  role: text("role").notNull().default("student"), // student | teacher
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  grade: text("grade"),
  school: text("school"),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  department: text("department"),
  qualification: text("qualification"),
  experience: text("experience"),
  subjects: text("subjects"),
  cvUrl: text("cv_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Courses, owned by a teacher. */
export const coursesTable = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    level: text("level").notNull().default("Introductory"),
    description: text("description").notNull().default(""),
    thumbnailUrl: text("thumbnail_url"),
    bannerUrl: text("banner_url"),
    coverEmoji: text("cover_emoji").notNull().default("📘"),
    coverColor: text("cover_color").notNull().default("#1B2B5E"),
    teacherId: integer("teacher_id").references(() => usersTable.id, { onDelete: "set null" }),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    teacherIdx: index("courses_teacher_idx").on(t.teacherId),
  }),
);

/* Lessons inside a course. */
export const lessonsTable = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().default("reading"), // video | reading | quiz
    durationMin: integer("duration_min").notNull().default(10),
    xpReward: integer("xp_reward").notNull().default(50),
    videoUrl: text("video_url"),
    content: text("content"),
    mcqQuestions: text("mcq_questions").notNull().default("[]"), // JSON array of MCQ questions
    order: integer("display_order").notNull().default(0),
  },
  (t) => ({
    courseIdx: index("lessons_course_idx").on(t.courseId),
  }),
);

/* Quizzes — one optional quiz per lesson with embedded JSON questions. */
export const quizzesTable = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    questions: text("questions_json").notNull().default("[]"),
  },
  (t) => ({
    lessonIdx: uniqueIndex("quizzes_lesson_idx").on(t.lessonId),
  }),
);

/* Catalog of badges available to award. */
export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("🏅"),
  imageUrl: text("image_url"),
  color: text("color").notNull().default("#C9A84C"),
  criteria: text("criteria").notNull().default("manual"), // manual | xp | lessons | streak
  threshold: integer("threshold"),
});

/* Badges earned by users. */
export const achievementsTable = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id")
      .notNull()
      .references(() => badgesTable.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("achievements_user_idx").on(t.userId),
    uniq: uniqueIndex("achievements_user_badge_idx").on(t.userId, t.badgeId),
  }),
);

/* Course enrollments. */
export const enrollmentsTable = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("enrollments_user_course_idx").on(t.userId, t.courseId),
    userIdx: index("enrollments_user_idx").on(t.userId),
    courseIdx: index("enrollments_course_idx").on(t.courseId),
  }),
);

/* Classes — for grouping students with a teacher teaching a specific subject. */
export const classesTable = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    subject: text("subject"),
    teacherId: integer("teacher_id")
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    teacherIdx: index("classes_teacher_idx").on(t.teacherId),
  }),
);

export const classTeachersTable = pgTable(
  "class_teachers",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subjects: text("subjects").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("class_teachers_class_teacher_idx").on(t.classId, t.teacherId),
    classIdx: index("class_teachers_class_idx").on(t.classId),
    teacherIdx: index("class_teachers_teacher_idx").on(t.teacherId),
  }),
);

/* Class enrollments — students enrolled in a class. */
export const classEnrollmentsTable = pgTable(
  "class_enrollments",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("class_enrollments_class_user_idx").on(t.classId, t.userId),
    classIdx: index("class_enrollments_class_idx").on(t.classId),
    userIdx: index("class_enrollments_user_idx").on(t.userId),
  }),
);

/* Per-user lesson completion. */
export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("lesson_progress_user_lesson_idx").on(t.userId, t.lessonId),
    userIdx: index("lesson_progress_user_idx").on(t.userId),
  }),
);

/* Quiz attempts log. */
export const quizAttemptsTable = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("quiz_attempts_user_idx").on(t.userId),
  }),
);

/* School calendar / schedule. */
export const scheduleEventsTable = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("class"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"),
  link: text("link"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* Grade subjects — class + subject groupings for the grades tab. */
export const gradeSubjectsTable = pgTable(
  "grade_subjects",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    subjectId: text("subject_id").notNull(),
    subjectName: text("subject_name").notNull(),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    classSubjectIdx: uniqueIndex("grade_subjects_class_subject_idx").on(t.classId, t.subjectId),
    classIdx: index("grade_subjects_class_idx").on(t.classId),
  }),
);

/* Individual test scores for students. */
export const gradeEntriesTable = pgTable(
  "grade_entries",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    subjectId: text("subject_id").notNull(),
    subjectName: text("subject_name").notNull(),
    studentId: integer("student_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull().default(100),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => ({
    classIdx: index("grade_entries_class_idx").on(t.classId),
    studentIdx: index("grade_entries_student_idx").on(t.studentId),
    classSubjectIdx: index("grade_entries_class_subject_idx").on(t.classId, t.subjectId),
  }),
);

/* Direct messages between users. */
export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => ({
    fromIdx: index("messages_from_idx").on(t.fromUserId),
    toIdx: index("messages_to_idx").on(t.toUserId),
  }),
);

/* XP audit log — drives the activity charts. */
export const xpEventsTable = pgTable(
  "xp_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("xp_events_user_idx").on(t.userId),
  }),
);

export type DbUser = typeof usersTable.$inferSelect;
export type DbCourse = typeof coursesTable.$inferSelect;
export type DbLesson = typeof lessonsTable.$inferSelect;
export type DbBadge = typeof badgesTable.$inferSelect;
export type DbApplication = typeof applicationsTable.$inferSelect;
export type DbScheduleEvent = typeof scheduleEventsTable.$inferSelect;
export type DbMessage = typeof messagesTable.$inferSelect;
export type DbClass = typeof classesTable.$inferSelect;
export type DbClassEnrollment = typeof classEnrollmentsTable.$inferSelect;
export type DbGradeSubject = typeof gradeSubjectsTable.$inferSelect;
export type DbGradeEntry = typeof gradeEntriesTable.$inferSelect;
