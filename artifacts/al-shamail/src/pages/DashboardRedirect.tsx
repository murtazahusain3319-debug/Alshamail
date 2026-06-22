import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { B } from "@/lib/brand";

export default function DashboardRedirect() {
  const [, navigate] = useLocation();
  const me = useGetCurrentUser();

  useEffect(() => {
    if (!me.isFetched) return;
    const u = me.data?.user;
    if (!u) {
      navigate("/login");
      return;
    }
    if (u.isAdmin) navigate("/admin");
    else if (u.role === "teacher") navigate("/teacher");
    else navigate("/student");
  }, [me.isFetched, me.data?.user, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: B.offW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: B.muted,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      Loading…
    </div>
  );
}
