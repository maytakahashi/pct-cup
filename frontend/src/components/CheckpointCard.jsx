// frontend/src/components/CheckpointCard.jsx
import React from "react";
import { RAINBOW } from "../theme";

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function CheckpointCard({
  title = "Next Checkpoint",
  subtitle = "",
  rightTop = "",
  rightBottom = "",
  progress = 0.5, // 0..1
}) {
  const pct = Math.round(clamp01(progress) * 100);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      {/* rainbow strip */}
      <div className="flex h-2 w-full">
        {RAINBOW.map((c) => (
          <div key={c} className="h-2 flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-zinc-500">PCT Cup</div>
            <div className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-zinc-900">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm text-zinc-600">{subtitle}</div>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            {rightTop ? (
              <div className="text-sm font-semibold text-zinc-900">{rightTop}</div>
            ) : null}
            {rightBottom ? (
              <div className="mt-0.5 text-xs text-zinc-500">{rightBottom}</div>
            ) : null}
          </div>
        </div>

        {/* SVG progress bar */}
        <div className="mt-4">
          <svg viewBox="0 0 600 38" className="h-10 w-full">
            {/* track */}
            <rect x="6" y="14" width="588" height="10" rx="5" fill="#F4F4F5" />
            {/* fill */}
            <rect
              x="6"
              y="14"
              width={Math.max(10, Math.round(588 * clamp01(progress)))}
              height="10"
              rx="5"
              fill="#18181B"
            />
            {/* percent pill */}
            <g transform="translate(510, 0)">
              <rect x="0" y="0" width="90" height="28" rx="14" fill="#18181B" />
              <text
                x="45"
                y="19"
                textAnchor="middle"
                fontSize="13"
                fontFamily="ui-sans-serif, system-ui, -apple-system"
                fill="white"
                fontWeight="700"
              >
                {pct}%
              </text>
            </g>
          </svg>

          <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
            <span>Progress toward next checkpoint</span>
            <span className="font-medium text-zinc-700">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
