import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";

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

export default function AdminLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        if (res.data?.role !== "ADMIN") {
          nav("/login");
          return;
        }
        setMe(res.data);
      } catch {
        nav("/login");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    try {
      setBusy(true);
      await api.post("/auth/logout");
      nav("/login");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-zinc-600">Loading…</div>;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/events" className="text-base font-semibold tracking-tight">
              PCT Cup · Admin
            </Link>
            {me && (
              <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 sm:inline">
                {me.username}
              </span>
            )}
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/attendance">Attendance</NavLink>
            <NavLink to="/alerts">Alerts</NavLink>

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
        <Outlet />
      </main>
    </div>
  );
}
