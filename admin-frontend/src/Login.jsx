import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        if (res.data?.role === "ADMIN") nav("/events");
      } catch {}
    })();
  }, [nav]);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post("/auth/login", { username, password });
      const me = await api.get("/me");
      if (me.data?.role !== "ADMIN") {
        setErr("This portal is admin-only.");
        await api.post("/auth/logout");
        return;
      }
      nav("/events");
    } catch (e2) {
      setErr(e2?.response?.data?.error ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-500">PCT Cup</div>
          <h1 className="mt-1 text-2xl font-semibold">Admin Login</h1>

          {err && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-800">Username</div>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-800">Password</div>
              <input
                type="password"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              disabled={busy}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-center text-xs text-zinc-500">
              This portal is separate from the bro dashboard.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
