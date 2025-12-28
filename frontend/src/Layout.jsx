import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api";
import { useEffect, useMemo, useState } from "react";

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={[
        "rounded-xl px-3 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-white/10 text-white ring-1 ring-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          : "text-slate-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function RainbowRule({ className = "" }) {
  return (
    <div className={["relative", className].join(" ")}>
      <div className="h-px w-full bg-[linear-gradient(90deg,#ef4444,#f59e0b,#fde047,#22c55e,#38bdf8,#6366f1,#a855f7)] opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-6 bg-[linear-gradient(90deg,rgba(239,68,68,0.25),rgba(245,158,11,0.25),rgba(253,224,71,0.22),rgba(34,197,94,0.22),rgba(56,189,248,0.22),rgba(99,102,241,0.22),rgba(168,85,247,0.22))] blur-xl" />
    </div>
  );
}

export default function Layout() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const apiOrigin = useMemo(() => {
    const raw = import.meta.env?.VITE_API_URL;
    if (!raw) return "";
    return String(raw).replace(/\/+$/, "");
  }, []);

  useEffect(() => {
    (async () => {
      setAuthError(null);
      try {
        const res = await api.get("/me");
        setMe(res.data);
      } catch (e) {
        setMe(null);
        setAuthError(
          e?.response?.status
            ? `Auth check failed (HTTP ${e.response.status}).`
            : "Auth check failed (network error). Is the backend reachable?"
        );
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // If auth has been checked and there is no user, redirect to login automatically.
  useEffect(() => {
    if (authChecked && !me) {
      // replace history so back button doesn't stay on the protected page
      nav("/login", { replace: true });
    }
  }, [authChecked, me, nav]);

  async function logout() {
    try {
      setBusy(true);
      await api.post("/auth/logout");
      setMe(null);
      nav("/login");
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#050B1A] text-white flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/6 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="text-sm text-slate-300">Loading</div>
          <div className="mt-1 text-lg font-semibold">Checking session…</div>
        </div>
      </div>
    );
  }

  if (!me) {
    // while redirecting, render nothing (or could show a spinner briefly)
    return null;
  }

  const isAdmin = me?.role === "ADMIN";

  return (
    <div
      className="min-h-screen text-white
      bg-[radial-gradient(1000px_circle_at_15%_0%,rgba(59,130,246,0.20),transparent_55%),radial-gradient(900px_circle_at_85%_15%,rgba(236,72,153,0.16),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(34,197,94,0.12),transparent_60%),linear-gradient(180deg,#050B1A_0%,#020617_65%,#050B1A_100%)]"
    >
      <header className="sticky top-0 z-10 bg-[#050B1A]/60 backdrop-blur border-b border-white/10">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 lg:px-8">
          {/* mobile: stack | sm+: single row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Row 1 (mobile): title + username pill */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  to="/dashboard"
                  className="text-base font-semibold tracking-tight text-white whitespace-nowrap"
                >
                  PCT Cup
                </Link>

                <span className="truncate rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-slate-200">
                  {me.username}
                </span>
              </div>

              {/* Optional: keep logout accessible on mobile without cramping nav */}
              <button
                onClick={logout}
                disabled={busy}
                className="shrink-0 rounded-xl border border-white/15 bg-white/4 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 sm:hidden"
              >
                Logout
              </button>
            </div>

            {/* Row 2 (mobile): navbar */}
            <nav className="w-full sm:w-auto sm:ml-auto">
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/calendar">Calendar</NavLink>
                <NavLink to="/leaderboard">Leaderboard</NavLink>
                <NavLink to="/faqs">FAQs</NavLink> {/* ✅ ADD */}

                <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
                <button
                  onClick={logout}
                  disabled={busy}
                  className="hidden rounded-xl border border-white/15 bg-white/4 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 sm:inline-flex"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>

        <RainbowRule />
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        {me && !isAdmin && window.location.pathname.startsWith("/admin") ? (
          <div className="rounded-2xl border border-white/10 bg-white/6 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="text-sm text-slate-300">Restricted</div>
            <div className="mt-1 text-xl font-semibold">
              Admin pages aren’t available on this account.
            </div>
            <div className="mt-4">
              <Link
                to="/dashboard"
                className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
