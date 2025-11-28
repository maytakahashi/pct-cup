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
        "rounded-lg px-2 py-1 text-sm transition",
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
      ].join(" ")}
    >
      {children}
    </Link>
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
            : "Auth check failed (network error). Is the backend running on :3001?"
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
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-500">Loading</div>
          <div className="mt-1 text-lg font-semibold">Checking session…</div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <div className="text-sm text-zinc-500">Not logged in</div>
            <div className="mt-1 text-lg font-semibold">Please log in again</div>
            {authError && <div className="mt-2 text-sm text-red-700">{authError}</div>}
          </div>

          <div className="flex gap-2">
            <Link
              to="/login"
              className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Go to login
            </Link>
            <a
              href="http://localhost:3001/me"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Test /me
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = me?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-base font-semibold tracking-tight">
              PCT Cup
            </Link>
            <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 sm:inline">
              {me.username}
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/calendar">Calendar</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>

            <span className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block" />
            <button
              onClick={logout}
              disabled={busy}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        {me && !isAdmin && window.location.pathname.startsWith("/admin") ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-zinc-500">Restricted</div>
            <div className="mt-1 text-xl font-semibold">Admin pages aren’t available on this account.</div>
            <div className="mt-4">
              <Link
                to="/dashboard"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
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
