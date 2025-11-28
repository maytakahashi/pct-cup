import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { createPortal } from "react-dom";

function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50"
        onMouseEnter={(e) => { setRect(e.currentTarget.getBoundingClientRect()); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { setRect(e.currentTarget.getBoundingClientRect()); setOpen((v) => !v); }}
        aria-label="Info"
      >
        i
      </button>

      {open && rect &&
        createPortal(
          <div
            className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 shadow-xl"
            style={{
              position: "fixed",
              zIndex: 9999,
              left: Math.min(rect.left, window.innerWidth - 320),
              top: Math.max(8, rect.bottom + 8),
              width: 300,
            }}
          >
            <div className="text-xs font-semibold text-zinc-500">Note</div>
            <div className="mt-1">{text}</div>
          </div>,
          document.body
        )
      }
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

function ProgressBar({ value }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100">
      <div className="h-2 rounded-full bg-green-900" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Ribbon() {
  const colors = ["#DE6561", "#FAB86D", "#FFDE76", "#9ECC80", "#7DA9B4", "#709CF2", "#8978C7"];
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex h-2 w-full">
        {colors.map((c) => (
          <div key={c} className="h-3 flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="p-4">
        <div className="text-2xl font-semibold">Next Checkpoint Requirements</div>
        <div className="mt-1 text-sm text-zinc-600">
          Review your team&apos;s progress made towards the next checkpoint.
        </div>
      </div>
    </div>
  );
}

function Badge({ met }) {
  return met ? (
    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Completed
    </span>
  ) : (
    <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: c.color || "#111827" }} />
            <div className="truncate text-base font-semibold text-zinc-900">{c.categoryName}</div>
          </div>

          <div className="mt-1 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{c.completed}</span> {unit} completed ·{" "}
            <span className="font-semibold italic text-zinc-900">{c.required} {unit} required</span>
          </div>
        </div>

        <Badge met={met} />
      </div>

      <div className="mt-3 space-y-2">
        <ProgressBar value={ratio} />

        {!met ? (
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>
              <span className="font-semibold text-zinc-900">{remainingOpps}</span> remaining opportunities till checkpoint
            </span>
          </div>
        ) : (
          <div className="text-sm text-emerald-800">Nice — you’ve met this category for this checkpoint.</div>
        )}
      </div>
    </div>
  );
}


function SegmentedTabs({ tab, setTab, meCount, teamCount }) {
  return (
    <div>
      <div className="flex w-full rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab("ME")}
          className={[
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            tab === "ME"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
              : "text-zinc-700 hover:text-zinc-900",
          ].join(" ")}
        >
          <span className="mr-2">🙋‍♀️</span>
          Me
          {Number.isFinite(meCount) && (
            <span className="ml-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {meCount} categories
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("TEAM")}
          className={[
            "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            tab === "TEAM"
              ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
              : "text-zinc-700 hover:text-zinc-900",
          ].join(" ")}
        >
          <span className="mr-2">👥</span>
          Team
          {Number.isFinite(teamCount) && (
            <span className="ml-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {teamCount} bros
            </span>
          )}
        </button>
      </div>

      <div className="mt-2 text-xs text-zinc-600">
        Tip: switch to <span className="font-semibold text-zinc-900">Team</span> to see everyone’s totals at a glance.
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

// For team table pills: handle unknown required cleanly
function getPillStyle({ required, completed }) {
  const reqKnown = Number.isFinite(required);
  const compKnown = Number.isFinite(completed);

  // Unknown data => neutral gray
  if (!reqKnown || !compKnown) {
    return {
      cls: "border-zinc-200 bg-zinc-50 text-zinc-700",
      label: "Unknown",
      met: false,
      text: `${compKnown ? completed : 0}/—`,
    };
  }

  const met = required === 0 ? true : completed >= required;
  return {
    cls: met ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-orange-200 bg-orange-50 text-orange-800",
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

  // Normalize TEAM rows so categories always render in the same order.
  const teamRows = useMemo(() => {
    const members = teamDash?.members ?? [];
    return members.map((m) => {
      const map = new Map((m.perCategory ?? []).map((pc) => [pc.categoryKey, pc]));
      const ordered = CATEGORY_ORDER.map((k) => {
        const pc = map.get(k);
        // IMPORTANT: do NOT default required to 0 anymore (that causes green lies)
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

  // Team summary: how many bros met ALL category requirements (only counting categories where required is known).
  const teamMetSummary = useMemo(() => {
    const members = teamRows ?? [];
    const total = members.length;

    let met = 0;
    for (const m of members) {
      const pcs = m.perCategoryOrdered ?? [];

      const allKnown = pcs.every((pc) => Number.isFinite(pc.required) && Number.isFinite(pc.completed));
      if (!allKnown) continue; // don’t “credit” anyone until we actually have requirement data

      const okAll = pcs.every((pc) => {
        const required = pc.required;
        const completed = pc.completed;
        return required === 0 || completed >= required;
      });

      if (okAll) met += 1;
    }

    return { met, total, hasUnknown: members.some((m) => (m.perCategoryOrdered ?? []).some((pc) => !Number.isFinite(pc.required))) };
  }, [teamRows]);

  return (
    <div className="space-y-6">
      <Ribbon />

      {/* One container around toggle + content */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-white p-4">
          <SegmentedTabs tab={tab} setTab={setTab} meCount={meDash?.categories?.length} teamCount={teamCount} />
        </div>

        <div className="p-4">
          {err && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          {loading && <div className="text-sm text-zinc-600">Loading…</div>}

          {!loading && tab === "ME" && meDash && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  Hi {meDash?.user?.firstName ?? "there"}!
                </h1>

                <div className="mt-2 text-2xl font-semibold text-zinc-900">
                  Categories Complete: {meSummary.met}/{meSummary.total}
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                    <span>{cpText}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {meDash.categories.map((c) => (
                  <CategoryCard key={c.categoryKey} c={c} />
                ))}
              </div>
            </>
          )}

          {!loading && tab === "TEAM" && teamDash && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Team {teamDash.teamId} Stats</h1>

                <div className="mt-2 text-2xl font-semibold text-zinc-900 flex items-center-safe gap-2">
                  <span>Members Done: {teamMetSummary.met}/{teamMetSummary.total}</span>
                  <InfoTip text="Seniors have adjusted requirements." />
                </div>
                <div className="mt-1 flex font-semibold items-center gap-2 text-sm text-zinc-600">
                    <span>{cpText}</span>
                </div>

                {teamMetSummary.hasUnknown && (
                  <div className="mt-1 text-sm text-zinc-600">
                    Some requirements are still loading from the backend (shown as <span className="font-semibold">—</span>).
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
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
                      <tr key={m.username} className="border-t border-zinc-200">
                        <td className="px-4 py-3 font-medium text-zinc-900">{m.name}</td>

                        {m.perCategoryOrdered.map((pc) => {
                          const completed = pc.completed;
                          const required = pc.required;
                          const pill = getPillStyle({ required, completed });

                          return (
                            <td key={pc.categoryKey} className="px-4 py-3">
                              <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${pill.cls}`}>
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
      </div>
    </div>
  );
}
