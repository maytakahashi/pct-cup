import { useState } from "react";
import { api } from "./api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/login", { username, password });
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-zinc-400">Use your PCT Cup username + password.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div>
          <label className="text-sm text-zinc-300">Username</label>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-600"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-300">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-600"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          disabled={busy}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
