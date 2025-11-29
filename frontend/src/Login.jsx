import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

function GradientOrb({ className = "" }) {
  return (
    <div
      className={[
        "pointer-events-none absolute rounded-full blur-3xl opacity-60",
        className,
      ].join(" ")}
      style={{
        background:
          "linear-gradient(135deg, rgba(0,122,255,0.75), rgba(175,82,222,0.75))",
      }}
    />
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 7L10 17l-4-4"
        fill="none"
        stroke="#EAF0FF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !busy;
  }, [username, password, busy]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/login", { username: username.trim(), password });
      nav("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? "Invalid username or password."
          : err?.response?.data?.error ||
            "Login failed (network or server error).";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F1A] text-[#EAF0FF]">
      {/* background */}
      <GradientOrb className="left-[-120px] top-[-180px] h-[420px] w-[420px]" />
      <GradientOrb className="right-[-160px] bottom-[-200px] h-[520px] w-[520px] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,26,43,0.85),rgba(11,15,26,1)_55%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#EAF0FF_1px,transparent_1px),linear-gradient(to_bottom,#EAF0FF_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#23304D] bg-[#121A2B] shadow-[0_14px_40px_rgba(0,0,0,0.50)]">
                <div
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)",
                  }}
                >
                  <CheckIcon />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  PCT Cup
                </h1>
                <p className="mt-0.5 text-sm text-[#9FB0D0]">
                  Log in to view your progress and next checkpoint.
                </p>
              </div>
            </div>
          </div>

          {/* card */}
          <div className="relative rounded-[22px] border border-[#23304D] bg-[#121A2B] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
            {/* gradient glow stroke */}
            <div
              className="pointer-events-none absolute -inset-px rounded-[22px] opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,122,255,0.55), rgba(175,82,222,0.55))",
                mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMask:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                padding: "1px",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#EAF0FF]">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="first.last"
                  className="w-full rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-2.5 text-[#EAF0FF] placeholder:text-[#9FB0D0]/60 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#007AFF]/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#EAF0FF]">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-2.5 text-[#EAF0FF] placeholder:text-[#9FB0D0]/60 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#AF52DE]/60"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-2.5 font-semibold text-[#0B0F1A] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)",
                }}
              >
                <span className="relative z-10">
                  {busy ? "Logging in…" : "Log in"}
                </span>
                <span className="absolute inset-0 opacity-0 transition group-hover:opacity-20 bg-white" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
