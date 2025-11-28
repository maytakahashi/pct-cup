import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

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
  // week starts Sunday
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
      className="inline-block h-4 w-4 rounded-full border border-black/10"
      style={{ backgroundColor: color || "#111827" }}
    />
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "neutral"
      ? "border-zinc-200 bg-zinc-50 text-zinc-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

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

        // If your current month has no events, jump to the first event’s month
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
    const map = new Map(); // ymd -> events[]
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold">Schedule of Events - {formatMonthYear(month)}</div>
            <div className="mt-1 text-sm text-zinc-600">Click/tap to open the agenda for any day.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              ←
            </button>
            <button
              onClick={jumpToday}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Calendar */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="px-3 py-2">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = ymd(d);
              const dayEvents = eventsByDay.get(key) || [];
              const inMonth = sameMonth(d, month);
              const isSel = sameDay(d, selectedDay);
              const isToday = sameDay(d, new Date());

              // unique category dots
              const dots = [];
              const seen = new Set();
              for (const e of dayEvents) {
                const c = e.color || "#111827";
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
                    "group relative h-[92px] w-full border-b border-r border-zinc-100 px-2 py-2 text-left transition",
                    inMonth ? "bg-white hover:bg-zinc-50" : "bg-zinc-200 hover:bg-zinc-300", // 👈 darker
                    isSel ? "ring-2 ring-inset ring-zinc-900" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={[
                        "inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold",
                        isToday ? "bg-zinc-900 text-white" : "text-zinc-900",
                        !inMonth ? "text-zinc-700" : "",
                      ].join(" ")}
                      title={d.toLocaleDateString()}
                    >
                      {d.getDate()}
                    </div>

                    {dayEvents.length > 0 && (
                      <div className={["text-xs font-semibold", inMonth ? "text-zinc-500" : "text-zinc-700"].join(" ")}>
                        {dayEvents.length}
                      </div>
                    )}
                  </div>

                  {dots.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dots.map((c, i) => <Dot key={`${c}-${i}`} color={c} />)}
                      {dayEvents.length > dots.length && <span className="ml-1 text-xs text-zinc-600">+</span>}
                    </div>
                  )}

                  {/* hover preview (desktop) */}
                  {dayEvents.length > 0 && (
                    <div className="pointer-events-none absolute left-2 top-10 z-10 hidden w-[280px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg group-hover:block">
                      <div className="text-xs font-semibold text-zinc-500">{d.toLocaleDateString()}</div>
                      <div className="mt-2 space-y-2">
                        {dayEvents.slice(0, 3).map((e) => {
                          const time = new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                          return (
                            <div key={e.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-900">{e.title}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
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
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-zinc-500">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-zinc-500">Click the day to see full list →</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda panel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm text-zinc-500">Agenda</div>
              <div className="text-lg font-semibold">{selectedDay.toLocaleDateString()}</div>
            </div>
            {selectedEvents.length > 0 && (
              <div className="text-sm text-zinc-600">
                {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
                No events on this day.
              </div>
            ) : (
              selectedEvents.map((e) => {
                const time = new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={e.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">{e.title}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">{time}</div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-800">
                            <Dot color={e.color} /> {e.categoryName || e.categoryKey}
                          </span>
                          {e.mandatory && <Pill tone="warn">Mandatory</Pill>}
                          {typeof e.serviceHours === "number" && e.serviceHours !== null && (
                            <Pill>{e.serviceHours} hr</Pill>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
