import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, Calendar, Award, Trophy,
  MessageSquare, User, LogOut, Menu as MenuIcon, X,
  Users, ClipboardList, ChevronRight, Bell, FileText, Zap, Users2, GraduationCap,
} from "lucide-react";
import {
  useGetCurrentUser, useLogout, getGetCurrentUserQueryKey,
  useListMessageContacts,
} from "@workspace/api-client-react";
import {
  B,
  LOGO_SRC,
  BRAND_NAME,
  BRAND_WORDMARK,
  BRAND_TAGLINE,
} from "@/lib/brand";
import { prefetchRoute } from "@/lib/route-prefetch";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";

/* ─── Types ─────────────────────────────────────── */
type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  badge?: number;
};

/* ─── Nav builder ────────────────────────────────── */
function navForRole(role: string | undefined, isAdmin: boolean): NavItem[] {
  const home: NavItem = isAdmin
    ? { to: "/admin",   label: "Dashboard", icon: <LayoutDashboard size={16} /> }
    : role === "teacher"
    ? { to: "/teacher", label: "Dashboard", icon: <LayoutDashboard size={16} /> }
    : { to: "/student", label: "Dashboard", icon: <LayoutDashboard size={16} /> };

  const shared: NavItem[] = [
    { to: "/courses",     label: "Courses",     icon: <BookOpen      size={16} /> },
    { to: "/classes",     label: "Classes",     icon: <Users2        size={16} /> },
    { to: "/schedule",    label: "Schedule",    icon: <Calendar      size={16} /> },
    { to: "/assignments", label: "Assignments", icon: <FileText      size={16} /> },
    { to: "/grades",      label: "Grades",      icon: <GraduationCap size={16} /> },
    { to: "/badges",      label: "Badges",      icon: <Award         size={16} /> },
    {
      to: "/messages", label: "Messages", icon: <MessageSquare size={16} />,
      match: (p) => p === "/messages" || p.startsWith("/messages/"),
    },
  ];
  const staffOnly: NavItem[] = [
    { to: "/leaderboard", label: "Leaderboard", icon: <Trophy size={16} /> },
  ];
  const adminExtras: NavItem[] = [
    { to: "/admin/classes",      label: "Classes",        icon: <Users2         size={16} /> },
    { to: "/admin/applications", label: "Applications", icon: <ClipboardList size={16} /> },
    { to: "/admin/users",        label: "Users",         icon: <Users         size={16} /> },
  ];
  const teacherExtras: NavItem[] = [
    { to: "/teacher/students", label: "My Students", icon: <Users size={16} /> },
  ];
  const profile: NavItem = { to: "/profile", label: "Profile", icon: <User size={16} /> };

  return isAdmin
    ? [home, ...adminExtras, ...shared.filter((it) => it.to !== "/classes"), ...staffOnly, profile]
    : role === "teacher"
    ? [home, ...teacherExtras, ...shared, ...staffOnly, profile]
    : [home, ...shared, profile];
}

const HOME_PATHS = new Set(["/", "/admin", "/teacher", "/student"]);

function isActive(item: NavItem, current: string): boolean {
  if (item.match) return item.match(current);
  // Role-home items (and "/") must match exactly so they don't light up
  // for nested routes like /admin/users or /teacher/students.
  if (HOME_PATHS.has(item.to)) return current === item.to;
  return current === item.to || current.startsWith(item.to + "/");
}

function levelForXp(xp: number): { currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  let needed = 500;
  let cumulative = 0;
  while (xp >= cumulative + needed) {
    cumulative += needed;
    level += 1;
    needed = 500 + (level - 1) * 100;
  }
  return {
    currentLevelXp: xp - cumulative,
    nextLevelXp: needed,
  };
}

function XpProgressBar({ xp, level }: { xp: number; level: number }) {
  const { toast } = useToast();
  const prevLevelRef = useRef(level);
  const { currentLevelXp, nextLevelXp } = levelForXp(xp);
  const progress = nextLevelXp > 0 ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100)) : 0;

  useEffect(() => {
    if (level > prevLevelRef.current) {
      toast({
        title: "Level up!",
        description: `You reached Level ${level} 🎉`,
      });
      prevLevelRef.current = level;
    }
  }, [level, toast]);

  return (
    <div className="dl-xpbar" style={{
      minWidth: 240,
      maxWidth: 320,
      padding: 14,
      borderRadius: 16,
      background: "rgba(248,246,241,.92)",
      border: `1px solid ${B.line}`,
      boxShadow: "0 14px 28px rgba(27,43,94,.08)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Zap size={16} color={B.gold} />
        <div style={{ fontSize: 12, fontWeight: 800, color: B.navy }}>Level {level}</div>
        <div style={{ fontSize: 10, color: B.muted, flex: 1, minWidth: 0 }}>
          {currentLevelXp} / {nextLevelXp} XP
        </div>
      </div>
      <div style={{ width: "100%", height: 10, borderRadius: 999, background: "rgba(27,43,94,.08)", overflow: "hidden" }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${B.gold}, ${B.goldD})`,
          transition: "width .33s ease",
        }}/>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, color: B.muted }}>
        <span>{currentLevelXp} XP</span>
        <span className="dl-xpbar-meta">{nextLevelXp - currentLevelXp} XP to next</span>
      </div>
    </div>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
      <div
        style={{
          width: compact ? 46 : 56,
          height: compact ? 46 : 56,
          borderRadius: compact ? 14 : 16,
          overflow: "hidden",
          flexShrink: 0,
          border: `1.5px solid ${B.gold}66`,
          background: "rgba(255,255,255,.96)",
          boxShadow: "0 10px 24px rgba(15,26,60,.18)",
          padding: compact ? 5 : 6,
        }}
      >
        <img
          src={LOGO_SRC}
          alt={`${BRAND_NAME} logo`}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: compact ? 18 : 21,
            color: B.white,
            lineHeight: 1.05,
            letterSpacing: "-.01em",
          }}
        >
          {BRAND_NAME}
        </div>
        <div
          style={{
            fontSize: compact ? 9 : 10,
            fontWeight: 800,
            color: B.goldL,
            textTransform: "uppercase",
            letterSpacing: ".18em",
            marginTop: 4,
            lineHeight: 1.35,
          }}
        >
          {BRAND_WORDMARK}
        </div>
        {!compact && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,.62)",
              textTransform: "uppercase",
              letterSpacing: ".22em",
              marginTop: 2,
            }}
          >
            {BRAND_TAGLINE}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── DashboardLayout ────────────────────────────── */
export function DashboardLayout({
  title, subtitle, action, children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const logout = useLogout();
  const [openMobile, setOpenMobile] = useState(false);

  const isAdmin = !!user?.isAdmin;
  const role = user?.role;
  const items = navForRole(role, isAdmin);

  const onLogout = async () => {
    try { await logout.mutateAsync(); } catch {}
    await qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    qc.clear();
    navigate("/");
  };

  useEffect(() => {
    if (!me.isLoading && !me.data?.user) navigate("/login");
  }, [me.isLoading, me.data, navigate]);

  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${B.offW2} 0%, ${B.offW} 52%, #f1f4fa 100%)`,
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        color: B.text,
      }}
      className="dl-grid"
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 99px; }

        .dl-nav-link { transition: all .18s ease; }
        .dl-nav-link:hover {
          background: rgba(255,255,255,.12) !important;
          color: #fff !important;
          transform: translateX(2px);
        }
        .dl-nav-link:hover .dl-nav-arrow { opacity: 1 !important; transform: translateX(0) !important; }

        .dl-card:hover { box-shadow: 0 18px 44px rgba(27,43,94,.12); transform: translateY(-2px); }
        .dl-statcard:hover { box-shadow: 0 18px 40px rgba(27,43,94,.14); transform: translateY(-2px); }

        .dl-sidebar { position: sticky; top: 0; height: 100vh; overflow: hidden; }
        .dl-sidebar-scroll {
          flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent;
        }

        .dl-xpbar { min-width: 240px; }
        .dl-xpbar-meta { display: inline; }

        @media (max-width: 960px) {
          .dl-grid { grid-template-columns: 1fr !important; }
          .dl-sidebar {
            position: fixed !important; top: 0; left: 0; bottom: 0;
            height: 100vh; width: min(88vw, 300px); z-index: 50;
            transform: translateX(-100%); transition: transform .25s ease;
          }
          .dl-sidebar.open { transform: translateX(0); }
          .dl-mobile-toggle { display: inline-flex !important; }
          .dl-overlay { display: block !important; }
          .dl-topbar {
            padding: 14px 18px !important;
            height: auto !important;
            gap: 14px;
            align-items: flex-start !important;
            flex-direction: column;
          }
          .dl-topbar-right {
            width: 100%;
            justify-content: space-between;
          }
          .dl-xpbar { min-width: 0; flex: 1; }
          .dl-xpbar-meta { display: none; }
          .dl-content { padding: 20px 18px 28px !important; }
        }
      `}</style>

      {/* ─── SIDEBAR ─────────────────────────────── */}
      <aside
        className={`dl-sidebar ${openMobile ? "open" : ""}`}
        style={{
          background: `linear-gradient(180deg, ${B.navyD} 0%, ${B.navy} 55%, ${B.navyL} 100%)`,
          color: B.white,
          display: "flex",
          flexDirection: "column",
          boxShadow: "14px 0 38px rgba(15,26,60,.24)",
          borderRight: "1px solid rgba(255,255,255,.06)",
        }}
      >
        {/* Gold accent stripe */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${B.goldD}, ${B.gold}, ${B.goldL}, ${B.gold}, ${B.goldD})`,
        }}/>

        {/* Logo */}
        <div style={{ padding: "22px 20px 18px" }}>
          <Link
            href={isAdmin ? "/admin" : role === "teacher" ? "/teacher" : "/student"}
            style={{ display: "block", textDecoration: "none" }}
            onClick={() => setOpenMobile(false)}
          >
            <BrandLockup />
          </Link>
        </div>

        {/* User mini card */}
        {user && (
          <div style={{
            margin: "0 14px 14px",
            padding: "14px",
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.06))",
            border: "1px solid rgba(255,255,255,.12)",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: user.avatarUrl ? B.white : `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13, color: B.navy, overflow: "hidden",
            }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                : initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontWeight: 800, fontSize: 13, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{user.firstName} {user.lastName}</div>
              <div style={{
                fontSize: 10, color: B.goldL, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: ".08em", marginTop: 1,
              }}>{isAdmin ? "Admin" : role}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="dl-sidebar-scroll" style={{ flex: 1, padding: "6px 12px 12px" }}>
          <div style={{
            margin: "0 12px 10px",
            fontSize: 10,
            fontWeight: 800,
            color: "rgba(255,255,255,.48)",
            textTransform: "uppercase",
            letterSpacing: ".18em",
          }}>
            Workspace
          </div>
          {items.map((item, idx) => {
            const active = isActive(item, location);
            const isProfile = item.to === "/profile";
            const prevIsProfile = idx > 0 && items[idx - 1].to === "/profile";
            const showDivider = isProfile && !prevIsProfile;

            return (
              <div key={item.to}>
                {showDivider && (
                  <div style={{
                    height: 1, background: "rgba(255,255,255,.08)",
                    margin: "8px 0",
                  }}/>
                )}
                <Link
                  href={item.to}
                  onMouseEnter={() => prefetchRoute(item.to)}
                  onFocus={() => prefetchRoute(item.to)}
                  onClick={() => {
                    prefetchRoute(item.to);
                    setOpenMobile(false);
                  }}
                  className="dl-nav-link"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 12px", borderRadius: 14, marginBottom: 4,
                    color: active ? B.navy : "rgba(255,255,255,.78)",
                    background: active
                      ? `linear-gradient(135deg, ${B.gold}, ${B.goldD})`
                      : "rgba(255,255,255,.02)",
                    fontWeight: active ? 800 : 600,
                    fontSize: 13,
                    textDecoration: "none",
                    boxShadow: active ? `0 10px 24px rgba(201,168,76,.3)` : "none",
                    borderLeft: active ? "none" : "3px solid transparent",
                  }}
                >
                  <span style={{ opacity: active ? 1 : .85 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 99,
                      background: "#ef4444", color: "#fff",
                    }}>{item.badge}</span>
                  )}
                  <ChevronRight
                    size={12}
                    className="dl-nav-arrow"
                    style={{
                      opacity: active ? .7 : 0,
                      transform: active ? "translateX(0)" : "translateX(-4px)",
                      transition: "all .15s",
                    }}
                  />
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "12px 12px 16px" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 14,
              background: "rgba(220,38,38,.1)", border: "1px solid rgba(248,113,113,.2)",
              color: "#fecaca", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", transition: "all .15s",
            }}
          >
            <LogOut size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {openMobile && (
        <div
          className="dl-overlay"
          onClick={() => setOpenMobile(false)}
          style={{
            display: "none", position: "fixed", inset: 0,
            background: "rgba(0,0,0,.45)", zIndex: 40,
          }}
        />
      )}

      {/* ─── MAIN CONTENT ──────────────────────── */}
      <main style={{ minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              `radial-gradient(circle at top right, rgba(201,168,76,.08), transparent 24%), radial-gradient(circle at top left, rgba(27,43,94,.05), transparent 26%)`,
          }}
        />

        {/* Top bar */}
        <header className="dl-topbar" style={{
          padding: "16px 28px",
          minHeight: 82,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,.88)",
          borderBottom: `1px solid ${B.line}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
          boxShadow: "0 10px 26px rgba(27,43,94,.05)",
          backdropFilter: "blur(18px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Mobile toggle */}
            <button
              className="dl-mobile-toggle"
              onClick={() => setOpenMobile(v => !v)}
              style={{
                display: "none", background: "transparent",
                border: `1.5px solid ${B.light}`, borderRadius: 10,
                width: 38, height: 38, alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: B.navy,
              }}
            >
              {openMobile ? <X size={18}/> : <MenuIcon size={18}/>}
            </button>

            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                color: B.goldD,
                textTransform: "uppercase",
                letterSpacing: ".18em",
                marginBottom: 6,
              }}>
                {BRAND_NAME} Dashboard
              </div>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 900, fontSize: 24, color: B.navy, margin: 0, lineHeight: 1.08,
              }}>{title}</h1>
              {subtitle && (
                <p style={{ color: B.muted, fontSize: 12, margin: 0, marginTop: 6, fontWeight: 500 }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="dl-topbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {action && <div>{action}</div>}
            {user && !isAdmin && role === "student" && typeof user.xp === "number" && typeof user.level === "number" && (
              <XpProgressBar xp={user.xp} level={user.level} />
            )}
            <NotificationsBell/>
            {/* Avatar */}
            {user && (
              <Link href="/profile" style={{
                display: "flex", alignItems: "center", gap: 9, padding: "6px 12px 6px 6px",
                borderRadius: 14, border: `1px solid ${B.line}`, background: "rgba(248,246,241,.85)",
                textDecoration: "none", cursor: "pointer",
                boxShadow: "0 8px 18px rgba(27,43,94,.05)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 11, color: B.gold, overflow: "hidden",
                }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    : initials}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: B.navy, lineHeight: 1 }}>
                    {user.firstName}
                  </div>
                  <div style={{ fontSize: 9, color: B.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {isAdmin ? "Admin" : role}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="dl-content" style={{ padding: "30px 28px 34px", flex: 1, position: "relative" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

/* ─── Card ───────────────────────────────────────── */
export function Card({
  title, children, style, action, noPad,
}: {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  action?: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <section
      className="dl-card"
      style={{
        background: B.white,
        borderRadius: 22,
        border: `1px solid ${B.line}`,
        boxShadow: "0 10px 26px rgba(27,43,94,.06)",
        transition: "box-shadow .2s, transform .2s",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || action) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 22px 16px",
          borderBottom: `1px solid ${B.line}`,
        }}>
          {title && (
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800, fontSize: 17, color: B.navy, margin: 0,
            }}>{title}</h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPad ? 0 : 22 }}>{children}</div>
    </section>
  );
}

/* ─── StatCard ───────────────────────────────────── */
export function StatCard({
  icon, label, value, accent = B.navy, hint, trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
  hint?: string;
  trend?: { val: string; up: boolean };
}) {
  return (
    <div
      className="dl-statcard"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,255,.96))",
        borderRadius: 20,
        padding: "20px",
        border: `1px solid ${B.line}`,
        boxShadow: "0 12px 26px rgba(27,43,94,.06)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "box-shadow .2s, transform .2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: `${accent}14`,
          border: `1px solid ${accent}28`,
          color: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>{icon}</div>
        {trend && (
          <span style={{
            fontSize: 10, fontWeight: 800,
            padding: "3px 7px", borderRadius: 99,
            background: trend.up ? "#f0fdf4" : "#fef2f2",
            color: trend.up ? "#16a34a" : "#dc2626",
            border: `1px solid ${trend.up ? "#bbf7d0" : "#fecaca"}`,
          }}>{trend.up ? "↑" : "↓"} {trend.val}</span>
        )}
      </div>
      <div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900, fontSize: 30, color: B.navy, lineHeight: 1,
        }}>{value}</div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: B.muted,
          textTransform: "uppercase", letterSpacing: ".08em", marginTop: 4,
        }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: B.muted, marginTop: 3 }}>{hint}</div>}
      </div>
    </div>
  );
}

/* ─── Pill ───────────────────────────────────────── */
export function Pill({ children, color = B.navy }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: `${color}16`, color,
      border: `1px solid ${color}44`,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      textTransform: "capitalize", letterSpacing: ".02em",
    }}>{children}</span>
  );
}

/* ─── Buttons ────────────────────────────────────── */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  full?: boolean;
};

export function PrimaryButton({ children, style, full, ...rest }: ButtonProps) {
  return (
    <button {...rest} style={{
      background: `linear-gradient(135deg, ${B.navy}, ${B.navyL})`, color: B.white, border: "none",
      borderRadius: 12, padding: "11px 18px",
      fontWeight: 700, fontSize: 13, cursor: rest.disabled ? "not-allowed" : "pointer",
      opacity: rest.disabled ? .6 : 1,
      display: full ? "flex" : "inline-flex",
      width: full ? "100%" : undefined,
      justifyContent: full ? "center" : undefined,
      alignItems: "center", gap: 6, fontFamily: "inherit",
      boxShadow: "0 10px 20px rgba(27,43,94,.16)",
      transition: "all .15s", ...style,
    }}>{children}</button>
  );
}

export function GoldButton({ children, style, full, ...rest }: ButtonProps) {
  return (
    <button {...rest} style={{
      background: `linear-gradient(135deg, ${B.gold}, ${B.goldD})`,
      color: "#fff", border: "none",
      borderRadius: 12, padding: "11px 18px",
      fontWeight: 800, fontSize: 13, cursor: rest.disabled ? "not-allowed" : "pointer",
      opacity: rest.disabled ? .6 : 1,
      display: full ? "flex" : "inline-flex",
      width: full ? "100%" : undefined,
      justifyContent: full ? "center" : undefined,
      alignItems: "center", gap: 6, fontFamily: "inherit",
      boxShadow: "0 10px 22px rgba(201,168,76,.28)",
      transition: "all .15s", ...style,
    }}>{children}</button>
  );
}

export const inputStyle: React.CSSProperties = {
  background: B.offW,
  border: `1.5px solid ${B.line}`,
  borderRadius: 12,
  padding: "11px 13px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  color: B.text,
  width: "100%",
  transition: "border-color .15s",
};
/* ─── Header notifications bell ──────────────────── */
const ASSIGNMENT_NOTIFICATIONS_KEY = "al_shamail_assignment_notifications_v1";

function loadAssignmentNotifications() {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [];
}

function clearAssignmentNotifications() {
  try { localStorage.removeItem(ASSIGNMENT_NOTIFICATIONS_KEY); } catch {}
}

function NotificationsBell() {
  const me = useGetCurrentUser();
  const user = me.data?.user;
  const isAdmin = !!user?.isAdmin;
  const isTeacher = !isAdmin && user?.role === "teacher";
  const assignmentNotifications = (isAdmin || isTeacher) ? loadAssignmentNotifications() : [];
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const contactsQ = useListMessageContacts({
    query: {
      enabled: !!user,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const contacts: any[] = (contactsQ.data as any)?.items ?? [];
  const unreadConvos = contacts
    .filter((c) => (c.unreadCount ?? 0) > 0)
    .sort((a, b) => {
      const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return bt - at;
    });
  const totalMessageUnread = unreadConvos.reduce(
    (n, c) => n + (c.unreadCount ?? 0), 0,
  );
  const totalAssignmentUnread = assignmentNotifications.length;
  const totalUnread = totalMessageUnread + totalAssignmentUnread;

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${totalUnread ? ` (${totalUnread} unread)` : ""}`}
        style={{
          width: 38, height: 38, borderRadius: 11,
          border: `1px solid ${open ? B.navy : B.light}`,
          background: open ? B.offW : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: totalUnread > 0 ? B.navy : B.muted,
          position: "relative",
          transition: "all .15s",
        }}
      >
        <Bell size={16}/>
        {totalUnread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, background: B.error,
            color: B.white,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, border: `2px solid ${B.white}`,
            lineHeight: 1,
          }}>
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 46, right: 0, width: 320,
          background: B.white,
          border: `1px solid ${B.line}`, borderRadius: 16,
          boxShadow: "0 10px 32px rgba(15,23,42,.18)",
          zIndex: 50, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: `1px solid ${B.light}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 800, color: B.navy, fontSize: 13 }}>
              Notifications
            </span>
            <span style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>
              {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
            </span>
          </div>

          {assignmentNotifications.length === 0 && unreadConvos.length === 0 ? (
            <div style={{
              padding: "24px 14px", textAlign: "center",
              color: B.muted, fontSize: 12,
            }}>
              <Bell size={22} style={{ opacity: .35, marginBottom: 6 }}/>
              <div style={{ fontWeight: 700, color: B.navy, marginBottom: 2 }}>
                You're all caught up
              </div>
              <div>New messages and submissions will appear here.</div>
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {assignmentNotifications.length > 0 && (
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${B.light}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, marginBottom: 8 }}>
                    Assignment notifications
                  </div>
                  {assignmentNotifications.map((note, index) => (
                    <div key={`assignment-notification-${index}`} style={{
                      padding: "10px 12px", borderRadius: 12, background: B.offW,
                      color: B.text, fontSize: 12, marginBottom: 8,
                    }}>
                      {note}
                    </div>
                  ))}
                </div>
              )}
              {unreadConvos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/messages/${c.id}`);
                  }}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "11px 14px", border: "none", background: "transparent",
                    borderBottom: `1px solid ${B.light}`,
                    cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = B.offW)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <UserAvatar
                    firstName={c.firstName}
                    lastName={c.lastName}
                    avatarUrl={c.avatarUrl}
                    size={32}
                    square
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", gap: 6,
                      alignItems: "baseline",
                    }}>
                      <span style={{ fontWeight: 800, color: B.navy, fontSize: 13 }}>
                        {c.firstName} {c.lastName}
                      </span>
                      <span style={{ fontSize: 10, color: B.muted, flexShrink: 0 }}>
                        {fmt(c.lastAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: B.text, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {c.lastBody ?? "New message"}
                    </div>
                  </div>
                  {c.unreadCount > 1 && (
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      background: B.gold, color: B.navy,
                      borderRadius: 99, padding: "2px 7px", flexShrink: 0,
                    }}>
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => { setOpen(false); navigate("/messages"); }}
            style={{
              width: "100%", padding: "11px 14px", border: "none",
              background: B.offW, color: B.navy, fontWeight: 700,
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              borderTop: `1px solid ${B.light}`,
            }}
          >
            Open Messages
          </button>
        </div>
      )}
    </div>
  );
}
