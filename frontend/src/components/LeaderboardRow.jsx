// frontend/src/components/LeaderboardRow.jsx
import React from "react";
import { CATEGORY } from "../theme";

export default function LeaderboardRow({
  rank,
  name,
  teamLabel,
  metCount,      // e.g. 6
  totalCount,    // e.g. 7
  perCategoryMet // object: { CHAPTER:true, ... }
}) {
  const pct = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

  const pills = Object.keys(CATEGORY).map((k) => {
    const c = CATEGORY[k];
    const met = !!perCategoryMet?.[k];
    return { key: k, color: c.color, met };
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {/* rank badge */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
          {rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="truncate text-sm font-semibold text-zinc-900">{name}</div>
            {teamLabel ? (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {teamLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {/* category dots */}
            <div className="flex items-center gap-1.5">
              {pills.map((p) => (
                <span
                  key={p.key}
                  className={[
                    "h-3.5 w-3.5 rounded-full border",
                    p.met ? "border-zinc-200" : "border-zinc-300 opacity-40",
                  ].join(" ")}
                  style={{ backgroundColor: p.color }}
                  title={`${p.key}: ${p.met ? "met" : "not met"}`}
                />
              ))}
            </div>

            {/* met counter */}
            <span className="ml-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-900">
              {metCount}/{totalCount} categories
            </span>

            {/* percent */}
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
