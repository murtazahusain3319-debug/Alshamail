// Preload route bundles on hover/click to avoid "flash" on navigation.
// This does not change UI; it just warms the browser module cache.

export function prefetchRoute(path: string): void {
  // Normalize dynamic paths (e.g. /courses/123 -> /courses/:id)
  const normalized =
    path.startsWith("/courses/") ? "/courses/:id"
    : path.startsWith("/lessons/") && path.endsWith("/quiz") ? "/lessons/:id/quiz"
    : path.startsWith("/lessons/") ? "/lessons/:id"
    : path.startsWith("/messages/") ? "/messages/:userId"
    : path;

  switch (normalized) {
    case "/":
      void import("@/pages/Home");
      break;
    case "/apply":
      void import("@/pages/Apply");
      break;
    case "/login":
      void import("@/pages/Login");
      break;
    case "/dashboard":
      void import("@/pages/DashboardRedirect");
      break;
    case "/student":
      void import("@/pages/StudentDashboard");
      break;
    case "/teacher":
      void import("@/pages/TeacherDashboard");
      break;
    case "/teacher/students":
      void import("@/pages/TeacherStudents");
      break;
    case "/admin":
      void import("@/pages/AdminDashboard");
      break;
    case "/admin/applications":
      void import("@/pages/AdminApplications");
      break;
    case "/admin/users":
      void import("@/pages/AdminUsers");
      break;
    case "/courses":
      void import("@/pages/CoursesPage");
      break;
    case "/courses/:id":
      void import("@/pages/CourseDetail");
      break;
    case "/lessons/:id":
      void import("@/pages/LessonView");
      break;
    case "/lessons/:id/quiz":
      void import("@/pages/QuizView");
      break;
    case "/schedule":
      void import("@/pages/SchedulePage");
      break;
    case "/badges":
      void import("@/pages/BadgesPage");
      break;
    case "/leaderboard":
      void import("@/pages/LeaderboardPage");
      break;
    case "/profile":
      void import("@/pages/ProfilePage");
      break;
    case "/messages":
    case "/messages/:userId":
      void import("@/pages/MessagesPage");
      break;
    default:
      break;
  }
}

