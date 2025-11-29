import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import PageHeader from "./components/PageHeader";

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function RainbowRule({ className = "" }) {
  return (
    <div className={["relative", className].join(" ")}>
      <div className="h-px w-full bg-[linear-gradient(90deg,#ef4444,#f59e0b,#fde047,#22c55e,#38bdf8,#6366f1,#a855f7)] opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-6 bg-[linear-gradient(90deg,rgba(239,68,68,0.25),rgba(245,158,11,0.25),rgba(253,224,71,0.22),rgba(34,197,94,0.22),rgba(56,189,248,0.22),rgba(99,102,241,0.22),rgba(168,85,247,0.22))] blur-xl" />
    </div>
  );
}

function Surface({ className = "", children }) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function ProgressBar({ value, highlight = false }) {
  const v = clamp01(value || 0);
  const w = `${Math.round(v * 100)}%`;

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
      <div
        className={[
          "h-2.5 rounded-full",
          highlight
            ? "bg-[linear-gradient(90deg,#22c55e,#38bdf8,#a78bfa,#f472b6)] shadow-[0_0_18px_rgba(34,197,94,0.20)]"
            : "bg-[linear-gradient(90deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))]",
        ].join(" ")}
        style={{ width: w }}
      />
    </div>
  );
}

function RankPill({ rank }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1224]/60 text-sm font800 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [myTeamId, setMyTeamId] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [meRes, lbRes] = await Promise.all([api.get("/me"), api.get("/leaderboard/teams")]);
      setMyTeamId(meRes.data?.teamId ?? null);
      setData(lbRes.data);
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => data?.teams ?? [], [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="PCT Cup Leaderboard"
        subtitle={
          data?.checkpoint?.endDate
            ? `Next checkpoint ends ${new Date(data.checkpoint.endDate).toLocaleDateString()}`
            : " "
        }
      />


      {err && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading && <div className="text-sm text-slate-300">Loading…</div>}

      {!loading && (
        <div className="space-y-2">
          {rows.map((t, idx) => {
            const isMine = myTeamId != null && Number(t.teamId) === Number(myTeamId);
            const p = clamp01(t.pct);

            return (
              <div
                key={t.teamId}
                className={[
                  "relative overflow-hidden rounded-2xl border bg-white/5 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur",
                  isMine ? "border-emerald-300/30" : "border-white/10",
                  isMine ? "ring-1 ring-emerald-400/20" : "",
                ].join(" ")}
              >
                {/* left accent stripe (stronger for YOUR team) */}
                <div
                  className={[
                    // use fixed top + height to avoid stretching the card vertically
                    // make stripe taller so it reads visually prominent but doesn't stretch the card
                    "pointer-events-none absolute left-3 top-5 h-19 w-1 rounded-full",
                    isMine
                      ? "bg-[linear-gradient(180deg,#22c55e,#38bdf8,#a78bfa,#f472b6)] opacity-95 shadow-[0_0_24px_rgba(34,197,94,0.20)]"
                      : "bg-white/10",
                  ].join(" ")}
                />

                <div className="p-4 pl-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <RankPill rank={idx + 1} />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-white">Team {t.teamId}</div>

                          {isMine && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                              ★ Your team
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-300">
                          Met requirements:{" "}
                          <span className="font-semibold text-slate-100">{t.metCount}</span> / {t.teamSize} bros{" "}
                          <span className="text-slate-400">·</span>{" "}
                          <span className="font-semibold text-slate-200">{pct(p)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-semibold tracking-tight text-white">{pct(p)}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">team completion</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <ProgressBar value={p} highlight={isMine} />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!rows.length && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
              No teams found yet (missing team assignments).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
