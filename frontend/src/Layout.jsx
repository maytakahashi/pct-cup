import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api";
import { useEffect, useState } from "react";

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={[
        "rounded-lg px-3 py-1.5 text-sm transition border",
        active
          ? "bg-[#121A2B] text-[#EAF0FF] border-[#23304D]"
          : "text-[#9FB0D0] border-transparent hover:border-[#23304D] hover:bg-[#121A2B] hover:text-[#EAF0FF]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function ShellCard({ children }) {
  return (
    <div className="rounded-2xl border border-[#23304D] bg-[#121A2B]/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      {children}
    </div>
  );
}

export default function Layout() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const [me, setMe] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

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
            : "Auth check failed (network error). Your API might be down, or cookies aren’t being set."
        );
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

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
      <div className="min-h-screen flex items-center justify-center px-4">
        <ShellCard>
          <div className="text-sm text-[#9FB0D0]">Loading</div>
          <div className="mt-1 text-lg font-semibold text-[#EAF0FF]">Checking session…</div>
        </ShellCard>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <ShellCard>
            <div className="text-sm text-[#9FB0D0]">Not logged in</div>
            <div className="mt-1 text-lg font-semibold text-[#EAF0FF]">Please log in again</div>
            {authError && <div className="mt-2 text-sm text-[#FFB4B4]">{authError}</div>}

            <div className="mt-5 flex gap-2">
              <Link
                to="/login"
                className="inline-flex rounded-xl bg-[#EAF0FF] px-4 py-2 text-sm font-semibold text-[#0B0F1A] hover:opacity-90"
              >
                Go to login
              </Link>

              {/* Keep this relative so it works on Railway too */}
              <a
                href="/me"
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl border border-[#23304D] bg-transparent px-4 py-2 text-sm font-semibold text-[#EAF0FF] hover:bg-[#121A2B]"
              >
                Test /me
              </a>
            </div>
          </ShellCard>
        </div>
      </div>
    );
  }

  const isAdmin = me?.role === "ADMIN";

  return (
    <div className="min-h-screen text-[#EAF0FF]">
      <header className="sticky top-0 z-10 border-b border-[#23304D] bg-[#0B0F1A]/75 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-base font-semibold tracking-tight">
              PCT Cup
            </Link>

            <span className="hidden rounded-full border border-[#23304D] bg-[#121A2B]/60 px-2 py-0.5 text-xs text-[#9FB0D0] sm:inline">
              {me.username}
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/calendar">Calendar</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>

            <span className="mx-1 hidden h-5 w-px bg-[#23304D] sm:block" />

            <button
              onClick={logout}
              disabled={busy}
              className="rounded-lg border border-[#23304D] bg-transparent px-3 py-1.5 text-sm font-medium text-[#EAF0FF] hover:bg-[#121A2B] disabled:opacity-50"
            >
              Logout
            </button>
          </nav>
        </div>

        {/* Subtle rainbow accent line */}
        <div
          className="h-[2px] w-full opacity-80"
          style={{
            background:
              "linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6, #AF52DE)",
          }}
        />
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        {me && !isAdmin && window.location.pathname.startsWith("/admin") ? (
          <ShellCard>
            <div className="text-sm text-[#9FB0D0]">Restricted</div>
            <div className="mt-1 text-xl font-semibold text-[#EAF0FF]">
              Admin pages aren’t available on this account.
            </div>
            <div className="mt-4">
              <Link
                to="/dashboard"
                className="inline-flex rounded-xl bg-[#EAF0FF] px-4 py-2 text-sm font-semibold text-[#0B0F1A] hover:opacity-90"
              >
                Back to Dashboard
              </Link>
            </div>
          </ShellCard>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
