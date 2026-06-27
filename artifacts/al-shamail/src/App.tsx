import { Component, Suspense, lazy, type ReactNode } from "react";
import { SkeletonGrid } from "@/lib/smooth";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { B } from "@/lib/brand";
const Home = lazy(() => import("@/pages/Home"));
const Apply = lazy(() => import("@/pages/Apply"));
const Login = lazy(() => import("@/pages/Login"));
const Admin = lazy(() => import("@/pages/Admin"));
const DashboardRedirect = lazy(() => import("@/pages/DashboardRedirect"));
const StudentDashboard = lazy(() => import("@/pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminApplications = lazy(() => import("@/pages/AdminApplications"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminClasses = lazy(() => import("@/pages/AdminClasses"));
const TeacherStudents = lazy(() => import("@/pages/TeacherStudents"));
const AssignmentsPage = lazy(() => import("@/pages/AssignmentsPage"));
const GradesPage = lazy(() => import("@/pages/GradesPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const LessonView = lazy(() => import("@/pages/LessonView"));
const QuizView = lazy(() => import("@/pages/QuizView"));
const SchedulePage = lazy(() => import("@/pages/SchedulePage"));
const BadgesPage = lazy(() => import("@/pages/BadgesPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const ClassesView = lazy(() => import("@/pages/ClassesView"));
const AboutPublic = lazy(() => import("@/pages/AboutPublic"));
const ContactPublic = lazy(() => import("@/pages/ContactPublic"));
const CoursesInfo = lazy(() => import("@/pages/CoursesInfo"));
const TeachersPublic = lazy(() => import("@/pages/TeachersPublic"));
const SyllabusBookList = lazy(() => import("@/pages/SyllabusBookList"));
const SyllabusSemesters = lazy(() => import("@/pages/SyllabusSemesters"));
const EnrollmentRules = lazy(() => import("@/pages/EnrollmentRules"));
const EnrollmentFees = lazy(() => import("@/pages/EnrollmentFees"));
const EnrollmentDocuments = lazy(() => import("@/pages/EnrollmentDocuments"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled app error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: `linear-gradient(180deg, ${B.offW} 0%, ${B.offW2} 100%)`,
            color: B.text,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: B.white,
              border: `1px solid ${B.line}`,
              borderRadius: 24,
              boxShadow: "0 18px 44px rgba(27,43,94,.1)",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: B.goldD,
                textTransform: "uppercase",
                letterSpacing: ".16em",
                marginBottom: 12,
              }}
            >
              Al Shamail
            </div>
            <h1
              style={{
                margin: 0,
                color: B.navy,
                fontFamily: "'Playfair Display', serif",
                fontSize: 32,
                lineHeight: 1.1,
              }}
            >
              Something went wrong
            </h1>
            <p style={{ margin: "14px 0 0", color: B.muted, fontSize: 15, lineHeight: 1.7 }}>
              The application hit an unexpected error. Refresh the page to try
              again.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              <button
                onClick={() => window.location.reload()}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
                  color: B.white,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Reload
              </button>
              <button
                onClick={() => {
                  window.location.href = import.meta.env.BASE_URL;
                }}
                style={{
                  border: `1px solid ${B.line}`,
                  borderRadius: 12,
                  padding: "12px 18px",
                  background: B.offW,
                  color: B.navy,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <div style={{ padding: 24 }}>
      <SkeletonGrid count={2} />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => (
        <Suspense fallback={<RouteFallback/>}><Home/></Suspense>
      )}</Route>

      <Route path="/apply">{() => (
        <Suspense fallback={<RouteFallback/>}><Apply/></Suspense>
      )}</Route>

      <Route path="/login">{() => (
        <Suspense fallback={<RouteFallback/>}><Login/></Suspense>
      )}</Route>

      <Route path="/dashboard">{() => (
        <Suspense fallback={<RouteFallback/>}><DashboardRedirect/></Suspense>
      )}</Route>

      <Route path="/student">{() => (
        <Suspense fallback={<RouteFallback/>}><StudentDashboard/></Suspense>
      )}</Route>

      <Route path="/teacher">{() => (
        <Suspense fallback={<RouteFallback/>}><TeacherDashboard/></Suspense>
      )}</Route>

      <Route path="/teacher/students">{() => (
        <Suspense fallback={<RouteFallback/>}><TeacherStudents/></Suspense>
      )}</Route>

      <Route path="/admin">{() => (
        <Suspense fallback={<RouteFallback/>}><AdminDashboard/></Suspense>
      )}</Route>

      <Route path="/admin/applications">{() => (
        <Suspense fallback={<RouteFallback/>}><AdminApplications/></Suspense>
      )}</Route>

      <Route path="/admin/applications-legacy">{() => (
        <Suspense fallback={<RouteFallback/>}><Admin/></Suspense>
      )}</Route>

      <Route path="/admin/users">{() => (
        <Suspense fallback={<RouteFallback/>}><AdminUsers/></Suspense>
      )}</Route>

      <Route path="/admin/classes">{() => (
        <Suspense fallback={<RouteFallback/>}><AdminClasses/></Suspense>
      )}</Route>

      <Route path="/courses">{() => (
        <Suspense fallback={<RouteFallback/>}><CoursesPage/></Suspense>
      )}</Route>

      <Route path="/classes">{() => (
        <Suspense fallback={<RouteFallback/>}><ClassesView/></Suspense>
      )}</Route>

      <Route path="/courses/:id">{() => (
        <Suspense fallback={<RouteFallback/>}><CourseDetail/></Suspense>
      )}</Route>

      <Route path="/lessons/:id">{() => (
        <Suspense fallback={<RouteFallback/>}><LessonView/></Suspense>
      )}</Route>

      <Route path="/lessons/:id/quiz">{() => (
        <Suspense fallback={<RouteFallback/>}><QuizView/></Suspense>
      )}</Route>

      <Route path="/schedule">{() => (
        <Suspense fallback={<RouteFallback/>}><SchedulePage/></Suspense>
      )}</Route>

      <Route path="/badges">{() => (
        <Suspense fallback={<RouteFallback/>}><BadgesPage/></Suspense>
      )}</Route>

      <Route path="/leaderboard">{() => (
        <Suspense fallback={<RouteFallback/>}><LeaderboardPage/></Suspense>
      )}</Route>

      <Route path="/profile">{() => (
        <Suspense fallback={<RouteFallback/>}><ProfilePage/></Suspense>
      )}</Route>

      <Route path="/messages">{() => (
        <Suspense fallback={<RouteFallback/>}><MessagesPage/></Suspense>
      )}</Route>

      <Route path="/messages/:userId">{() => (
        <Suspense fallback={<RouteFallback/>}><MessagesPage/></Suspense>
      )}</Route>

      <Route path="/assignments">{() => (
        <Suspense fallback={<RouteFallback/>}><AssignmentsPage/></Suspense>
      )}</Route>

      <Route path="/grades">{() => (
        <Suspense fallback={<RouteFallback/>}><GradesPage/></Suspense>
      )}</Route>

      <Route path="/about">{() => (
        <Suspense fallback={<RouteFallback/>}><AboutPublic/></Suspense>
      )}</Route>

      <Route path="/contact">{() => (
        <Suspense fallback={<RouteFallback/>}><ContactPublic/></Suspense>
      )}</Route>

      <Route path="/courses-info">{() => (
        <Suspense fallback={<RouteFallback/>}><CoursesInfo/></Suspense>
      )}</Route>

      <Route path="/teachers">{() => (
        <Suspense fallback={<RouteFallback/>}><TeachersPublic/></Suspense>
      )}</Route>

      <Route path="/syllabus/book-list">{() => (
        <Suspense fallback={<RouteFallback/>}><SyllabusBookList/></Suspense>
      )}</Route>

      <Route path="/syllabus/semesters">{() => (
        <Suspense fallback={<RouteFallback/>}><SyllabusSemesters/></Suspense>
      )}</Route>

      <Route path="/enrollment/rules">{() => (
        <Suspense fallback={<RouteFallback/>}><EnrollmentRules/></Suspense>
      )}</Route>

      <Route path="/enrollment/fees">{() => (
        <Suspense fallback={<RouteFallback/>}><EnrollmentFees/></Suspense>
      )}</Route>

      <Route path="/enrollment/documents">{() => (
        <Suspense fallback={<RouteFallback/>}><EnrollmentDocuments/></Suspense>
      )}</Route>

      <Route>{() => (
        <Suspense fallback={<RouteFallback/>}><NotFound/></Suspense>
      )}</Route>
    </Switch>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={(
              <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
                <SkeletonGrid count={4} />
              </div>
            )}>
              <Router />
            </Suspense>
          </WouterRouter>
          <Toaster richColors theme="light" position="top-right" />
          <ShadcnToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
