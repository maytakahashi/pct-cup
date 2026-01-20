import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import PageHeader from "./components/PageHeader";

function progress(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

const DEFAULT_TEAM_PFP = "https://cdn.pfps.gg/pfps/2301-default-2.png";

const TEAM_PFPS = {
  2:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFeL8_FEi29l43IzWKJy8vxW10p3rM5zXnXA&s",
  6: "https://eu-images.contentstack.com/v3/assets/bltabaa95ef14172c61/blt121188a63203f7fd/687aa73aff1382e245ef801b/jeffrey-epstein-2004.jpg?width=1280&auto=webp&quality=80&disable=upscale",
  3: "https://img.freepik.com/premium-vector/asian-emoticon-with-traditional-look-vector-yellow-emoji-with-mustache-beard-hat_858082-435.jpg?w=360",
  8: "https://cdn.prod.website-files.com/5e6616ad415f1e3b494ddec8/62d7d207311241020cbfdaed_Female%20Holding%20Playing%20Cards%20Playing%20Poker%201.png",
  
};

function TeamAvatar({ src, alt }) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_TEAM_PFP);

  useEffect(() => {
    setCurrentSrc(src || DEFAULT_TEAM_PFP);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
      onError={() => {
        if (currentSrc !== DEFAULT_TEAM_PFP) setCurrentSrc(DEFAULT_TEAM_PFP);
      }}
      loading="lazy"
    />
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

function TeamCard({ t, rank, isMine }) {
  const p = clamp01(t.progress);
  const label = t.teamName || `Team ${t.teamId}`;

  // Prefer API-provided image URL if present; otherwise fall back to TEAM_PFPS map; otherwise default.
  const avatarSrc =
    t.imageUrl || t.pfpUrl || TEAM_PFPS[Number(t.teamId)] || DEFAULT_TEAM_PFP;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border bg-white/5 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur",
        "min-h-[128px]",
        isMine ? "border-emerald-300/30" : "border-white/10",
        isMine ? "ring-1 ring-emerald-400/20" : "",
      ].join(" ")}
    >
      {/* left stripe */}
      <div
        className={[
          "pointer-events-none absolute left-0 top-0 h-full w-1.5",
          isMine
            ? "bg-[linear-gradient(180deg,#22c55e,#38bdf8,#a78bfa,#f472b6)] opacity-90"
            : "bg-white/10",
        ].join(" ")}
      />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* rank column */}
          <div className="flex w-14 shrink-0 flex-col items-center pt-0.5">
            <div
              className={[
                "mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border text-base font-semibold text-white",
                rank === 1
                  ? "border-amber-300/40 bg-amber-400/15 ring-1 ring-amber-300/25"
                  : rank === 2
                  ? "border-slate-200/30 bg-slate-200/10 ring-1 ring-slate-200/15"
                  : rank === 3
                  ? "border-orange-300/30 bg-orange-400/10 ring-1 ring-orange-300/15"
                  : isMine
                  ? "border-emerald-300/30 bg-emerald-400/10"
                  : "border-white/10 bg-[#0b1224]/60",
              ].join(" ")}
            >
              {rank}
            </div>
          </div>

          {/* content column */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <TeamAvatar src={avatarSrc} alt={`${label} avatar`} />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-lg font-semibold text-white">
                      {label}
                    </div>

                    {isMine && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                        ★ Your team
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-slate-300">
                    Met requirements:{" "}
                    <span className="font-semibold text-slate-100">
                      {t.metCount}
                    </span>{" "}
                    / {t.teamSize} bros <span className="text-slate-400">·</span>{" "}
                    <span className="font-semibold text-slate-200">
                      {progress(p)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-semibold tracking-tight text-white">
                  {progress(p)}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  team completion
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <ProgressBar value={p} highlight={isMine} />
              <div className="flex items-center justify-between text-xs text-slate-400" />
            </div>
          </div>
        </div>
      </div>
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
      const [meRes, lbRes] = await Promise.all([
        api.get("/me"),
        api.get("/api/leaderboard/teams"),
      ]);
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

  const [leftRows, rightRows] = useMemo(() => {
    const r = rows || [];
    const mid = Math.ceil(r.length / 2);
    return [r.slice(0, mid), r.slice(mid)];
  }, [rows]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="PCT Cup Leaderboard"
        subtitle={
          data?.checkpoint?.endDate
            ? `Next checkpoint ends ${new Date(
                data.checkpoint.endDate
              ).toLocaleDateString()}`
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
          {rows.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <div className="space-y-2">
                {leftRows.map((t, idx) => {
                  const rank = idx + 1;
                  const isMine =
                    myTeamId != null && Number(t.teamId) === Number(myTeamId);

                  return (
                    <TeamCard
                      key={t.teamId}
                      t={t}
                      rank={rank}
                      isMine={isMine}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                {rightRows.map((t, idx) => {
                  const rank = leftRows.length + idx + 1;
                  const isMine =
                    myTeamId != null && Number(t.teamId) === Number(myTeamId);

                  return (
                    <TeamCard
                      key={t.teamId}
                      t={t}
                      rank={rank}
                      isMine={isMine}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
              No teams found yet (missing team assignments).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
