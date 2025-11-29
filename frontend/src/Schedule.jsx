import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
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

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameDay(a, b) {
  return ymd(a) === ymd(b);
}

function formatMonthYear(d) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function Dot({ color }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border border-[#23304D]"
      style={{ backgroundColor: color || "#EAF0FF" }}
    />
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
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState(null);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState(() => new Date());

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const res = await api.get("/schedule");
        const list = res.data || [];
        setEvents(list);

        const first = list[0];
        if (first?.startsAt) {
          const d = new Date(first.startsAt);
          const m = new Date(d.getFullYear(), d.getMonth(), 1);
          const hasAnyThisMonth = list.some((e) => {
            const ed = new Date(e.startsAt);
            return ed.getFullYear() === month.getFullYear() && ed.getMonth() === month.getMonth();
          });
          if (!hasAnyThisMonth) {
            setMonth(m);
            setSelectedDay(d);
          }
        }
      } catch (e) {
        setErr(e?.response?.data?.error ?? "Failed to load schedule");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = ymd(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfMonth(month);
    const cells = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    while (cells.length < 42 || cells[cells.length - 1] < end) {
      cells.push(addDays(cells[cells.length - 1], 1));
    }
    return cells.slice(0, 42);
  }, [month]);

  const selectedEvents = useMemo(() => {
    return eventsByDay.get(ymd(selectedDay)) || [];
  }, [eventsByDay, selectedDay]);

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }
  function jumpToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Schedule of Events — ${formatMonthYear(month)}`}
        subtitle="Click/tap to open the agenda for any day."
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              ←
            </button>
            <button
              onClick={jumpToday}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              →
            </button>
          </div>
        }
      />

      {err && (
        <div className="rounded-xl border border-[#5b1b1b] bg-[#2a1010] px-4 py-3 text-sm text-[#FFB4B4]">
          {err}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Calendar */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[#23304D] bg-[#0B0F1A] text-xs font-semibold text-[#9FB0D0]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="px-3 py-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = ymd(d);
              const dayEvents = eventsByDay.get(key) || [];
              const inMonth = sameMonth(d, month);
              const isSel = sameDay(d, selectedDay);
              const isToday = sameDay(d, new Date());

              const dots = [];
              const seen = new Set();
              for (const e of dayEvents) {
                const c = e.color || "#EAF0FF";
                if (!seen.has(c)) {
                  dots.push(c);
                  seen.add(c);
                }
                if (dots.length >= 4) break;
              }

              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedDay(d);
                    if (!sameMonth(d, month)) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                  className={[
                    "group relative h-[92px] w-full border-b border-r border-[#23304D] px-2 py-2 text-left transition",
                    inMonth
                      ? "bg-white/6 hover:bg-white/10"
                      : "bg-white/2 hover:bg-white/5 opacity-60",
                    isSel ? "ring-2 ring-inset ring-[#EAF0FF]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={[
                        "inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold border",
                        isToday
                          ? "bg-[#EAF0FF] text-[#0B0F1A] border-transparent"
                          : "text-[#EAF0FF] border-[#23304D] bg-[#121A2B]/40",
                        !inMonth ? "opacity-80" : "",
                      ].join(" ")}
                      title={d.toLocaleDateString()}
                    >
                      {d.getDate()}
                    </div>

                    {dayEvents.length > 0 && (
                      <div className="text-xs font-semibold text-[#9FB0D0]">{dayEvents.length}</div>
                    )}
                  </div>

                  {dots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dots.map((c, i) => (
                        <Dot key={`${c}-${i}`} color={c} />
                      ))}
                      {dayEvents.length > dots.length && <span className="ml-1 text-xs text-[#9FB0D0]">+</span>}
                    </div>
                  )}

                  {/* hover preview (desktop) */}
                  {dayEvents.length > 0 && (
                    <div className="pointer-events-none absolute left-2 top-10 z-10 hidden w-[280px] rounded-2xl border border-[#23304D] bg-[#0B0F1A] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] group-hover:block">
                      <div className="text-xs font-semibold text-[#9FB0D0]">{d.toLocaleDateString()}</div>
                      <div className="mt-2 space-y-2">
                        {dayEvents.slice(0, 3).map((e) => {
                          const time = new Date(e.startsAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <div key={e.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#EAF0FF]">{e.title}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#9FB0D0]">
                                  <span>{time}</span>
                                  {e.mandatory && <Pill tone="warn">Mandatory</Pill>}
                                  {typeof e.serviceHours === "number" && e.serviceHours !== null && (
                                    <Pill>{e.serviceHours} hr</Pill>
                                  )}
                                </div>
                              </div>
                              <Dot color={e.color} />
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && <div className="text-xs text-[#9FB0D0]">+{dayEvents.length - 3} more</div>}
                      </div>
                      <div className="mt-3 text-xs text-[#9FB0D0] opacity-90">Click the day to see full list →</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Agenda panel */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm text-[#9FB0D0]">Agenda</div>
              <div className="text-lg font-semibold text-[#EAF0FF]">{selectedDay.toLocaleDateString()}</div>
            </div>
            {selectedEvents.length > 0 && (
              <div className="text-sm text-[#9FB0D0]">
                {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-[#23304D] bg-[#0B0F1A] px-3 py-3 text-sm text-[#9FB0D0]">
                No events on this day.
              </div>
            ) : (
              selectedEvents.map((e) => {
                const time = new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={e.id} className="rounded-2xl border border-[#23304D] bg-[#0B0F1A]/40 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#EAF0FF]">{e.title}</div>
                      <div className="mt-0.5 text-xs text-[#9FB0D0]">{time}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#23304D] bg-[#0B0F1A] px-2 py-0.5 text-xs font-semibold text-[#9FB0D0]">
                          <Dot color={e.color} /> {e.categoryName || e.categoryKey}
                        </span>
                        {e.mandatory && <Pill tone="warn">Mandatory</Pill>}
                        {typeof e.serviceHours === "number" && e.serviceHours !== null && <Pill>{e.serviceHours} hr</Pill>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
