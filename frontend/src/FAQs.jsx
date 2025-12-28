// FAQs.jsx
import { useMemo } from "react";
import PageHeader from "./components/PageHeader";

function Card({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl border border-[#23304D] bg-[#121A2B]/70",
        "shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SoftRule({ className = "" }) {
  return (
    <div className={["relative", className].join(" ")}>
      <div className="h-px w-full bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-6 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] blur-xl" />
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "neutral"
      ? "border-[#23304D] bg-[#0B0F1A] text-[#9FB0D0]"
      : tone === "warn"
      ? "border-[#5a4a1d] bg-[#231c0b] text-[#ffd08a]"
      : "border-[#2d5a3b] bg-[#0f2418] text-[#9ff2bf]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ id, title }) {
  return (
    <div id={id} className="scroll-mt-28">
      <div className="text-xl font-extrabold tracking-tight text-[#EAF0FF]">
        {title}
      </div>
      <SoftRule className="mt-3" />
    </div>
  );
}

function Callout({ tone = "neutral", title, children }) {
  const cls =
    tone === "neutral"
      ? "border-[#23304D] bg-[#0B0F1A]/60"
      : tone === "warn"
      ? "border-[#5a4a1d] bg-[#231c0b]/60"
      : "border-[#2d5a3b] bg-[#0f2418]/60";

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      {title ? (
        <div className="text-sm font-semibold text-[#EAF0FF]">{title}</div>
      ) : null}
      <div className="mt-1 text-sm text-[#EAF0FF]/90">{children}</div>
    </div>
  );
}

function Bullets({ items }) {
  return (
    <ul className="mt-3 list-disc pl-5 text-sm text-[#EAF0FF]/90">
      {items.map((x) => (
        <li key={x} className="my-1">
          {x}
        </li>
      ))}
    </ul>
  );
}

export default function FAQs() {
  const websiteUse = useMemo(
    () => [
      "Upcoming event & checkpoint dates",
      "Your progress & team progress toward meeting requirements",
      "Your team’s ranking within the fraternity",
    ],
    []
  );

  const why = useMemo(
    () => [
      "Build consistency.",
      "Support chapter performance.",
      "Make expectations clear and fair with transparent requirements + deadlines.",
      "Encourage personal growth by balancing social, service, and professional development.",
    ],
    []
  );

  const how = useMemo(
    () => [
      "The semester is divided into checkpoints.",
      "By each checkpoint, brothers are expected to complete a target number of events/hours in different categories.",
      "Your progress is evaluated at checkpoints to see whether you’re on track.",
    ],
    []
  );

  const best = useMemo(
    () => [
      "Start early. Spread attendance across the semester so you’re never rushing near a checkpoint.",
      "Use the calendar. Look ahead at what’s scheduled and plan around busy weeks (exams, travel).",
      "Communicate with your team, and let your VP know if conflicts arise.",
    ],
    []
  );

  return (
    // ✅ This inner container is what prevents “edge-to-edge” feeling
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="FAQs"
        subtitle="What PCT Cup is, why it exists, and how to stay on track."
      />

      {/* Main box (single) */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6 space-y-6">
          {/* Mini TOC */}
          <div className="flex flex-wrap gap-2">
            <a
              href="#what"
              className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-1.5 text-xs font-semibold text-[#EAF0FF] hover:bg-white/5"
            >
              What is PCT Cup?
            </a>
            <a
              href="#site"
              className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-1.5 text-xs font-semibold text-[#EAF0FF] hover:bg-white/5"
            >
              What’s the site for?
            </a>
            <a
              href="#why"
              className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-1.5 text-xs font-semibold text-[#EAF0FF] hover:bg-white/5"
            >
              Why do we do it?
            </a>
            <a
              href="#how"
              className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-1.5 text-xs font-semibold text-[#EAF0FF] hover:bg-white/5"
            >
              How it works
            </a>
            <a
              href="#best"
              className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-1.5 text-xs font-semibold text-[#EAF0FF] hover:bg-white/5"
            >
              Best practices
            </a>
          </div>

          <SectionTitle id="what" title="What is PCT Cup?" />
          <div className="text-sm text-[#EAF0FF]/90">
            PCT Cup is a semesterly tournament designed to keep brothers
                consistently involved and aligned with chapter values.
            <br /> The brotherhood is divided into{" "}
            <span className="font-semibold text-[#EAF0FF]">8 teams</span>, each
            led by a board member. Throughout the semester, teams compete to
            meet requirements and win the final prize.
          </div>

          <Callout tone="ok" title="SPRING '26 FINAL PRIZE:">
            Free dinner at Sakana (or restaurant of choice) for winning team
          </Callout>

          <SectionTitle id="site" title="What is the website useful for?" />
          <div className="text-sm text-[#EAF0FF]/90">
            The website is mainly a fast way to check what’s coming up and
            whether you’re on track.
          </div>
          <Bullets items={websiteUse} />

          <SectionTitle id="why" title="Why do we do it?" />
          <div className="text-sm text-[#EAF0FF]/90">PCT Cup exists to:</div>
          <Bullets items={why} />

          <SectionTitle id="how" title="How it works" />
          <Bullets items={how} />

          <Callout tone="warn">
            <b>NOTE:</b> Party-based events are categorized under{" "}
            <span className="font-semibold">“Social”</span> and are meant purely
            for fun. They <span className="font-semibold">do not</span> count
            toward requirements.
          </Callout>

          <SectionTitle id="best" title="Best practices" />
          <Bullets items={best} />
        </div>
      </Card>
    </div>
  );
}
