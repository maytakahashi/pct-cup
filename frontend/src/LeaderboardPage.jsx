import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function GradientProgress({ value }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="h-[18px] w-full rounded-full border border-[#23304D] bg-[#0B0F1A] p-[2px]">
      <div
        className="h-[14px] rounded-full"
        style={{
          width: `${Math.round(v * 100)}%`,
          background:
            "linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6, #AF52DE)",
        }}
      />
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="rounded-2xl border border-[#23304D] bg-[#121A2B]/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      {children}
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
      <Card>
        <div className="p-5">
          <div className="text-xl font-semibold text-[#EAF0FF]">
            Teams — who’s hitting the next checkpoint
          </div>
          {data?.checkpoint?.endDate && (
            <div className="mt-1 text-sm text-[#9FB0D0]">
              Next checkpoint ends{" "}
              {new Date(data.checkpoint.endDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
        <div
          className="h-[2px] w-full opacity-80"
          style={{
            background:
              "linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6, #AF52DE)",
          }}
        />
        <div className="px-5 py-4 text-sm text-[#9FB0D0]">
          Ranked by how many bros in each team have met <span className="font-semibold text-[#EAF0FF]">all</span>{" "}
          category requirements for the next checkpoint.
        </div>
      </Card>

      {err && (
        <div className="rounded-xl border border-[#5b1b1b] bg-[#2a1010] px-4 py-3 text-sm text-[#FFB4B4]">
          {err}
        </div>
      )}

      {loading && <div className="text-sm text-[#9FB0D0]">Loading…</div>}

      {!loading && (
        <div className="space-y-3">
          {rows.map((t, idx) => {
            const isMine = myTeamId != null && Number(t.teamId) === Number(myTeamId);

            return (
              <div
                key={t.teamId}
                className={[
                  "rounded-2xl border border-[#23304D] bg-[#121A2B]/70 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur",
                  isMine ? "ring-1 ring-[#34C759]/30" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: rank + team */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-2xl border border-[#23304D] bg-[#0B0F1A] flex items-center justify-center">
                      <div className="text-lg font-extrabold text-[#EAF0FF]">{idx + 1}</div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-lg font-extrabold text-[#EAF0FF]">
                          Team {t.teamId}
                        </div>
                        {isMine && (
                          <span className="inline-flex items-center rounded-full border border-[#2d5a3b] bg-[#0f2418] px-2 py-0.5 text-xs font-semibold text-[#9ff2bf]">
                            Your team
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-[#9FB0D0]">
                        Met requirements:{" "}
                        <span className="font-semibold text-[#EAF0FF]">
                          {t.metCount}/{t.teamSize}
                        </span>{" "}
                        <span className="opacity-80">•</span> {pct(t.pct)}
                      </div>
                    </div>
                  </div>

                  {/* Right: big percent number like the SVG */}
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-black text-[#EAF0FF]">{pct(t.pct)}</div>
                    <div className="text-xs text-[#9FB0D0]">team completion</div>
                  </div>
                </div>

                <div className="mt-3">
                  <GradientProgress value={t.pct} />
                </div>
              </div>
            );
          })}

          {!rows.length && (
            <div className="rounded-2xl border border-[#23304D] bg-[#121A2B]/70 px-5 py-6 text-sm text-[#9FB0D0]">
              No teams found yet (missing team assignments).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
