import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100">
      <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${Math.round(v * 100)}%` }} />
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
        api.get("/leaderboard/teams"),
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-xl font-semibold">Teams — who’s hitting the next checkpoint</div>
        {data?.checkpoint?.endDate && (
          <div className="mt-1 text-sm text-zinc-600">
            Next checkpoint ends {new Date(data.checkpoint.endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {loading && <div className="text-sm text-zinc-600">Loading…</div>}

      {!loading && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Ranked by how many bros in each team have met <span className="font-medium">all</span> category requirements
            for the next checkpoint.
          </div>

          <div className="divide-y divide-zinc-200">
            {rows.map((t, idx) => {
              const isMine = myTeamId != null && Number(t.teamId) === Number(myTeamId);

              return (
                <div
                  key={t.teamId}
                  className={[
                    "px-4 py-4",
                    isMine ? "bg-emerald-50/45" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-sm font-semibold text-zinc-500">#{idx + 1}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold text-zinc-900">Team {t.teamId}</div>
                        {isMine && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Your team
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-900">{t.metCount}</span> / {t.teamSize} met
                      <span className="ml-2 text-zinc-500">({pct(t.pct)})</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <ProgressBar value={t.pct} />
                  </div>
                </div>
              );
            })}

            {!rows.length && (
              <div className="px-4 py-6 text-sm text-zinc-600">
                No teams found yet (missing team assignments).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
