import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { createPortal } from "react-dom";
import PageHeader from "./components/PageHeader";

function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-[#23304D] bg-[#121A2B]/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function RainbowRule() {
  return (
    <div
      className="h-0.5 w-full opacity-80"
      style={{
        background:
          "linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6, #AF52DE)",
      }}
    />
  );
}

function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#23304D] bg-[#0B0F1A] text-xs font-bold text-[#EAF0FF] hover:bg-[#121A2B]"
        onMouseEnter={(e) => {
          setRect(e.currentTarget.getBoundingClientRect());
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          setRect(e.currentTarget.getBoundingClientRect());
          setOpen((v) => !v);
        }}
        aria-label="Info"
      >
        i
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            className="rounded-xl border border-[#23304D] bg-[#0B0F1A] p-3 text-sm text-[#EAF0FF] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
            style={{
              position: "fixed",
              zIndex: 9999,
              left: Math.min(rect.left, window.innerWidth - 320),
              top: Math.max(8, rect.bottom + 8),
              width: 300,
            }}
          >
            <div className="text-xs font-semibold text-[#9FB0D0]">Note</div>
            <div className="mt-1">{text}</div>
          </div>,
          document.body
        )}
    </>
  );
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function formatCheckpoint(cp) {
  if (!cp) return null;
  const label = cp.label ?? (cp.number ? `Checkpoint ${cp.number}` : "Next checkpoint");
  const end = cp.endDate ? new Date(cp.endDate).toLocaleDateString() : null;
  return end ? `Due by ${label} (${end})` : label;
}

function GradientProgress({ value }) {
  const progress = Math.round(clamp01(value) * 100);
  return (
    <div className="h-[18px] w-full rounded-full border border-[#23304D] bg-[#0B0F1A] p-0.5">
      <div
        className="h-3.5 rounded-full"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6, #AF52DE)",
        }}
      />
    </div>
  );
}

function Badge({ met }) {
  return met ? (
    <span className="shrink-0 rounded-full border border-[#2d5a3b] bg-[#0f2418] px-2 py-0.5 text-xs font-semibold text-[#9ff2bf]">
      Completed
    </span>
  ) : (
    <span className="shrink-0 rounded-full border border-[#5a4a1d] bg-[#231c0b] px-2 py-0.5 text-xs font-semibold text-[#ffd08a]">
      In Progress
    </span>
  );
}

function CategoryCard({ c }) {
  const remainingNeeded = c.remainingNeeded ?? Math.max((c.required ?? 0) - (c.completed ?? 0), 0);
  const met = remainingNeeded === 0;

  const ratio = c.required > 0 ? c.completed / c.required : 1;

  const isService = c.categoryKey === "SERVICE";
  const unit = isService ? "hrs" : "events";

  const remainingOpps = c.remainingOpportunities ?? 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-[#23304D]"
              style={{ background: c.color || "#EAF0FF" }}
            />
            <div className="truncate text-base font-semibold text-[#EAF0FF]">{c.categoryName}</div>
          </div>

          <div className="mt-1 text-sm text-[#9FB0D0]">
            <span className="font-semibold text-[#EAF0FF]">{c.completed}</span> {unit} completed ·{" "}
            <span className="font-semibold italic text-[#EAF0FF]">
              {c.required} required
            </span>
          </div>
        </div>

        <Badge met={met} />
      </div>

      <div className="mt-3 space-y-2">
        <GradientProgress value={ratio} />

        {!met ? (
          <div className="flex items-center justify-between text-sm text-[#9FB0D0]">
            <span>
              <span className="font-semibold text-[#EAF0FF]">{remainingOpps}</span> remaining opportunities till checkpoint
            </span>
          </div>
        ) : (
          <div className="text-sm text-[#9ff2bf]">Nice — you’ve met this category for this checkpoint.</div>
        )}
      </div>
    </Card>
  );
}

function SegmentedTabs({ tab, setTab, meCount, teamCount }) {
  return (
    <div>
      <div className="flex w-full rounded-xl border border-[#23304D] bg-[#0B0F1A] p-1">
        <button
          type="button"
          onClick={() => setTab("ME")}
          className={[
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition border",
            tab === "ME"
              ? "bg-[#121A2B] text-[#EAF0FF] border-[#23304D]"
              : "text-[#9FB0D0] border-transparent hover:border-[#23304D] hover:bg-[#121A2B] hover:text-[#EAF0FF]",
          ].join(" ")}
        >
          <span className="mr-2">🙋‍♀️</span>
          Me
          {Number.isFinite(meCount) && (
            <span className="ml-2 rounded-full border border-[#23304D] bg-[#121A2B]/60 px-2 py-0.5 text-xs font-semibold text-[#9FB0D0]">
              {meCount} categories
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("TEAM")}
          className={[
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition border",
            tab === "TEAM"
              ? "bg-[#121A2B] text-[#EAF0FF] border-[#23304D]"
              : "text-[#9FB0D0] border-transparent hover:border-[#23304D] hover:bg-[#121A2B] hover:text-[#EAF0FF]",
          ].join(" ")}
        >
          <span className="mr-2">👥</span>
          Team
          {Number.isFinite(teamCount) && (
            <span className="ml-2 rounded-full border border-[#23304D] bg-[#121A2B]/60 px-2 py-0.5 text-xs font-semibold text-[#9FB0D0]">
              {teamCount} bros
            </span>
          )}
        </button>
      </div>

      <div className="mt-2 text-xs text-[#9FB0D0]">
        Tip: switch to <span className="font-semibold text-[#EAF0FF]">Team</span> to see everyone’s totals at a glance.
      </div>
    </div>
  );
}

const CATEGORY_ORDER = ["CHAPTER", "RUSH", "INTERNAL", "CORPORATE", "PLEDGE", "SERVICE", "CASUAL"];
const CATEGORY_LABELS = {
  CHAPTER: "CHAPTER",
  RUSH: "RUSH",
  INTERNAL: "INTERNAL",
  CORPORATE: "CORPORATE",
  PLEDGE: "PLEDGE",
  SERVICE: "SERVICE",
  CASUAL: "CASUAL",
};

function getPillStyle({ required, completed }) {
  const reqKnown = Number.isFinite(required);
  const compKnown = Number.isFinite(completed);

  if (!reqKnown || !compKnown) {
    return {
      cls: "border-[#23304D] bg-[#0B0F1A] text-[#9FB0D0]",
      label: "Unknown",
      met: false,
      text: `${compKnown ? completed : 0}/—`,
    };
  }

  const met = required === 0 ? true : completed >= required;
  return {
    cls: met
      ? "border-[#2d5a3b] bg-[#0f2418] text-[#9ff2bf]"
      : "border-[#5a4a1d] bg-[#231c0b] text-[#ffd08a]",
    label: met ? "Complete" : "In Progress",
    met,
    text: `${completed}/${required}`,
  };
}

export default function Dashboard() {
  const [meDash, setMeDash] = useState(null);
  const [teamDash, setTeamDash] = useState(null);
  const [tab, setTab] = useState("ME");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [meRes, teamRes] = await Promise.all([api.get("/dashboard/me"), api.get("/dashboard/team")]);
      setMeDash(meRes.data);
      setTeamDash(teamRes.data);
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cpText = useMemo(() => {
    return formatCheckpoint(meDash?.checkpoint || teamDash?.checkpoint) ?? "Next checkpoint";
  }, [meDash, teamDash]);

  const meSummary = useMemo(() => {
    const cats = meDash?.categories ?? [];
    const total = cats.length;
    const met = cats.filter((c) => {
      const remaining = c.remainingNeeded ?? Math.max((c.required ?? 0) - (c.completed ?? 0), 0);
      return remaining === 0;
    }).length;
    return { met, total };
  }, [meDash]);

  const teamCount = teamDash?.members ? teamDash.members.length : undefined;

  const teamRows = useMemo(() => {
    const members = teamDash?.members ?? [];
    return members.map((m) => {
      const map = new Map((m.perCategory ?? []).map((pc) => [pc.categoryKey, pc]));
      const ordered = CATEGORY_ORDER.map((k) => {
        const pc = map.get(k);
        return (
          pc || {
            categoryKey: k,
            completed: 0,
            required: undefined,
            status: "AT_RISK",
          }
        );
      });
      return { ...m, perCategoryOrdered: ordered };
    });
  }, [teamDash]);

  const teamMetSummary = useMemo(() => {
    const members = teamRows ?? [];
    const total = members.length;

    let met = 0;
    for (const m of members) {
      const pcs = m.perCategoryOrdered ?? [];

      const allKnown = pcs.every((pc) => Number.isFinite(pc.required) && Number.isFinite(pc.completed));
      if (!allKnown) continue;

      const okAll = pcs.every((pc) => {
        const required = pc.required;
        const completed = pc.completed;
        return required === 0 || completed >= required;
      });

      if (okAll) met += 1;
    }

    return {
      met,
      total,
      hasUnknown: members.some((m) => (m.perCategoryOrdered ?? []).some((pc) => !Number.isFinite(pc.required))),
    };
  }, [teamRows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Next Checkpoint Requirements"
        subtitle="Review your progress and your team’s progress toward the next checkpoint."
      />


      <Card className="overflow-hidden">
        <div className="border-b border-[#23304D] p-4">
          <SegmentedTabs tab={tab} setTab={setTab} meCount={meDash?.categories?.length} teamCount={teamCount} />
        </div>

        <div className="p-4">
          {err && (
            <div className="mb-3 rounded-xl border border-[#5b1b1b] bg-[#2a1010] px-4 py-3 text-sm text-[#FFB4B4]">
              {err}
            </div>
          )}
          {loading && <div className="text-sm text-[#9FB0D0]">Loading…</div>}

          {!loading && tab === "ME" && meDash && (
            <>
              <Card className="p-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#EAF0FF]">
                  Hi {meDash?.user?.firstName ?? "there"}!
                </h1>

                <div className="mt-2 text-xl font-semibold text-[#EAF0FF]">
                  Categories Complete: {meSummary.met}/{meSummary.total}
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#9FB0D0]">
                    <span>{cpText}</span>
                  </div>
                </div>
              </Card>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {meDash.categories.map((c) => (
                  <CategoryCard key={c.categoryKey} c={c} />
                ))}
              </div>
            </>
          )}

          {!loading && tab === "TEAM" && teamDash && (
            <>
              <Card className="p-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#EAF0FF]">
                  Stats – Team {teamDash.teamName || `${teamDash.teamId}`}
                </h1>

                <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-[#EAF0FF]">
                  <span>
                    Members Done: {teamMetSummary.met}/{teamMetSummary.total}
                  </span>
                  <InfoTip text="Seniors have adjusted requirements." />
                </div>

                <div className="mt-1 flex items-center gap-2 text-sm text-[#9FB0D0]">
                  <span>{cpText}</span>
                </div>

                {teamMetSummary.hasUnknown && (
                  <div className="mt-1 text-sm text-[#9FB0D0]">
                    Some requirements are still loading from the backend (shown as <span className="font-semibold">—</span>).
                  </div>
                )}
              </Card>

              <div className="mt-4 overflow-auto rounded-2xl border border-[#23304D] bg-[#121A2B]/70">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-[#0B0F1A] text-[#9FB0D0]">
                    <tr className="text-left">
                      <th className="px-4 py-3">Member</th>
                      {CATEGORY_ORDER.map((k) => (
                        <th key={k} className="px-4 py-3">
                          {CATEGORY_LABELS[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {teamRows.map((m) => (
                      <tr key={m.username} className="border-t border-[#23304D]">
                        <td className="px-4 py-3 font-semibold text-[#EAF0FF]">{m.name}</td>

                        {m.perCategoryOrdered.map((pc) => {
                          const completed = pc.completed;
                          const required = pc.required;
                          const pill = getPillStyle({ required, completed });

                          return (
                            <td key={pc.categoryKey} className="px-4 py-3">
                              <span
                                className={[
                                  "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  pill.cls,
                                ].join(" ")}
                              >
                                <span>{pill.text}</span>
                                <span className="font-medium opacity-80">{pill.label}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
