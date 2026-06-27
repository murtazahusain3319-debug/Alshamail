CREATE TABLE "class_teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"subjects" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text NOT NULL,
	"student_id" integer NOT NULL,
	"title" text NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "grade_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "subject" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "teacher_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cv_url" text;--> statement-breakpoint
ALTER TABLE "badges" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD COLUMN "audience" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD COLUMN "class_id" integer;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_teachers_class_teacher_idx" ON "class_teachers" USING btree ("class_id","teacher_id");--> statement-breakpoint
CREATE INDEX "class_teachers_class_idx" ON "class_teachers" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_teachers_teacher_idx" ON "class_teachers" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "grade_entries_class_idx" ON "grade_entries" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "grade_entries_student_idx" ON "grade_entries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "grade_entries_class_subject_idx" ON "grade_entries" USING btree ("class_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_subjects_class_subject_idx" ON "grade_subjects" USING btree ("class_id","subject_id");--> statement-breakpoint
CREATE INDEX "grade_subjects_class_idx" ON "grade_subjects" USING btree ("class_id");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;