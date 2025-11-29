import React from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function PageHeader({
  title,
  subtitle,
  meta,
  glow = "strong", // "none" | "subtle" | "strong"
  className,
  children,
}) {
  const glowCls =
    glow === "none"
      ? ""
      : glow === "subtle"
      ? "shadow-[0_18px_55px_-35px_rgba(0,0,0,0.92),0_0_0_1px_rgba(255,255,255,0.05)]"
      : // strong (matches your leaderboard header vibe)
        "shadow-[0_22px_70px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06),0_0_70px_-50px_rgba(56,189,248,0.45),0_0_70px_-55px_rgba(167,139,250,0.35)]";

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-3xl border border-white/10",
        "bg-slate-950/35 backdrop-blur-md",
        glowCls,
        className
      )}
    >
      {/* Glow blobs (the “real” glow) */}
      {glow !== "none" && (
        <div className="pointer-events-none absolute inset-0">
          {/* top-left cool glow */}
          <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-sky-400/18 blur-3xl" />
          {/* bottom-right purple glow */}
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-violet-400/14 blur-3xl" />
          {/* subtle inner sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/6 via-white/0 to-white/0" />
        </div>
      )}

      <div className="relative px-6 py-6">
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-semibold tracking-tight text-slate-50">{title}</div>

          {subtitle && (
            <div className="text-sm leading-relaxed text-slate-200/80">{subtitle}</div>
          )}

          {meta && (
            <div className="text-sm text-slate-200/70">{meta}</div>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>

      {/* Bottom rainbow ribbon (CLIPPED inside rounding) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <div className="h-[2px] w-full bg-gradient-to-r from-red-400 via-amber-300 via-lime-300 via-emerald-300 via-cyan-300 via-blue-400 to-violet-400" />
        <div className="h-[10px] w-full bg-gradient-to-r from-red-400/25 via-amber-300/18 via-lime-300/18 via-emerald-300/16 via-cyan-300/16 via-blue-400/16 to-violet-400/25 blur-md" />
      </div>
    </div>
  );
}
