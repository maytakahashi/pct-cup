import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const CATEGORY_KEYS = ["CHAPTER", "RUSH", "INTERNAL", "CORPORATE", "PLEDGE", "SERVICE", "CASUAL"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Convert a Date/string to "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local" />
function toLocalInputValue(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

// Convert "YYYY-MM-DDTHH:mm" (local) to ISO string for backend (UTC)
function localInputToISO(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue); // interpreted as local time by JS
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeCategoryKey(ev) {
  return ev?.category?.key || ev?.categoryKey || null;
}

function eventBadgeClasses(categoryKey) {
  switch (categoryKey) {
    case "INTERNAL":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "SERVICE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CORPORATE":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "CHAPTER":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "RUSH":
      return "border-pink-200 bg-pink-50 text-pink-700";
    case "PLEDGE":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "CASUAL":
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  // create form
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [categoryKey, setCategoryKey] = useState("INTERNAL");
  const [serviceHours, setServiceHours] = useState("");

  // inline edits: id -> draft
  const [drafts, setDrafts] = useState({});

  // open state: only one open at a time for compactness
  const [openId, setOpenId] = useState(null);

  const [busyId, setBusyId] = useState(null);

  const eventIndex = useMemo(() => {
    const m = new Map();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  function hasId(arr, id) {
    return arr.some((x) => x.id === id);
  }

  async function load() {
    setErr(null);
    try {
      const res = await api.get("/admin/events");
      setEvents(res.data);

      setDrafts((prev) => {
        const next = { ...prev };

        for (const e of res.data) {
          if (!next[e.id]) {
            next[e.id] = {
              title: e.title ?? "",
              startsAt: toLocalInputValue(e.startsAt),
              categoryKey: normalizeCategoryKey(e) ?? "INTERNAL",
              serviceHours: e.serviceHours != null ? String(e.serviceHours) : "",
            };
          }
        }

        for (const idStr of Object.keys(next)) {
          const id = Number(idStr);
          if (!hasId(res.data, id)) delete next[idStr];
        }

        return next;
      });
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to load events");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    try {
      await api.post("/admin/events", {
        title,
        startsAt: localInputToISO(startsAt) ?? startsAt,
        categoryKey,
        serviceHours: categoryKey === "SERVICE" ? serviceHours : undefined,
      });
      setOk("Created event ✔");
      setTitle("");
      setStartsAt("");
      setServiceHours("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.error ?? "Failed to create event");
    }
  }

  async function removeEvent(eventId) {
    setErr(null);
    setOk(null);

    const ev = eventIndex.get(eventId);
    const label = ev ? `${ev.title} (${new Date(ev.startsAt).toLocaleString()})` : `Event ${eventId}`;

    if (!confirm(`Delete this event?\n\n${label}\n\nThis will also remove recorded attendance for it.`)) return;

    try {
      setBusyId(eventId);
      await api.delete(`/admin/events/${eventId}`);
      setOk("Deleted event ✔");
      if (openId === eventId) setOpenId(null);
      await load();
    } catch (e3) {
      setErr(e3?.response?.data?.error ?? "Failed to delete event");
    } finally {
      setBusyId(null);
    }
  }

  function updateDraft(id, patch) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  function isDirty(id) {
    const ev = eventIndex.get(id);
    const d = drafts[id];
    if (!ev || !d) return false;

    const baseTitle = ev.title ?? "";
    const baseStarts = toLocalInputValue(ev.startsAt);
    const baseCat = normalizeCategoryKey(ev) ?? "INTERNAL";
    const baseSvc = ev.serviceHours != null ? String(ev.serviceHours) : "";

    const draftSvc = d.categoryKey === "SERVICE" ? d.serviceHours : "";
    const baseSvcNormalized = baseCat === "SERVICE" ? baseSvc : "";

    return d.title !== baseTitle || d.startsAt !== baseStarts || d.categoryKey !== baseCat || draftSvc !== baseSvcNormalized;
  }

  async function saveEvent(id) {
    setErr(null);
    setOk(null);

    const d = drafts[id];
    if (!d) return;

    if (!d.title?.trim()) return setErr("Title is required.");
    if (!d.startsAt) return setErr("Starts at is required.");
    if (!CATEGORY_KEYS.includes(d.categoryKey)) return setErr("Invalid category.");

    if (d.categoryKey === "SERVICE") {
      const n = parseInt(String(d.serviceHours || "0"), 10);
      if (!Number.isFinite(n) || n < 1) return setErr("Service hours must be a whole number ≥ 1.");
    }

    const payload = {
      title: d.title.trim(),
      startsAt: localInputToISO(d.startsAt),
      categoryKey: d.categoryKey,
      serviceHours: d.categoryKey === "SERVICE" ? d.serviceHours : undefined,
    };

    try {
      setBusyId(id);
      await api.put(`/admin/events/${id}`, payload);
      setOk("Saved ✔");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to save event");
    } finally {
      setBusyId(null);
    }
  }

  function resetDraft(id) {
    const ev = eventIndex.get(id);
    if (!ev) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        title: ev.title ?? "",
        startsAt: toLocalInputValue(ev.startsAt),
        categoryKey: normalizeCategoryKey(ev) ?? "INTERNAL",
        serviceHours: ev.serviceHours != null ? String(ev.serviceHours) : "",
      },
    }));
  }

  function toggleOpen(id) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-500">Admin</div>
        <div className="text-xl font-semibold">Events</div>
        <div className="mt-1 text-sm text-zinc-600">Edit event title/time/category in the dropdown per row.</div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Create event</div>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Title</div>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Starts at</div>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Category</div>
            <select
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
            >
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          {categoryKey === "SERVICE" && (
            <label className="block">
              <div className="mb-1 text-sm text-zinc-700">Service hours (whole number)</div>
              <input
                type="number"
                step="1"
                min="1"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                value={serviceHours}
                onChange={(e) => setServiceHours(e.target.value)}
                required
              />
              <div className="mt-1 text-xs text-zinc-500">Whole numbers only.</div>
            </label>
          )}

          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Create
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">All events</div>

          <div className="max-h-[560px] overflow-auto">
            {events.map((ev) => {
              const d = drafts[ev.id] || {
                title: ev.title ?? "",
                startsAt: toLocalInputValue(ev.startsAt),
                categoryKey: normalizeCategoryKey(ev) ?? "INTERNAL",
                serviceHours: ev.serviceHours != null ? String(ev.serviceHours) : "",
              };

              const dirty = isDirty(ev.id);
              const open = openId === ev.id;
              const busy = busyId === ev.id;
              const catKey = normalizeCategoryKey(ev) ?? "CASUAL";

              return (
                <div key={ev.id} className="border-b border-zinc-100">
                  {/* Row header (compact) */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleOpen(ev.id)}
                      className="group flex min-w-0 flex-1 items-start justify-between gap-3 rounded-xl px-2 py-1 text-left hover:bg-zinc-50"
                      aria-expanded={open}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-medium text-zinc-900">{ev.title}</div>
                          <span
                            className={[
                              "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                              eventBadgeClasses(catKey),
                            ].join(" ")}
                          >
                            {catKey}
                          </span>
                          {ev.mandatory && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
                              Mandatory
                            </span>
                          )}
                          {ev.serviceHours ? (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                              {ev.serviceHours} hr
                            </span>
                          ) : null}
                          {dirty ? (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Unsaved
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm text-zinc-600">
                          {new Date(ev.startsAt).toLocaleString()} · ID {ev.id}
                        </div>
                      </div>

                      <div className="mt-0.5 shrink-0 text-xs font-semibold text-zinc-500">
                        {open ? "Hide" : "Edit"}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeEvent(ev.id)}
                      disabled={busy}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {busy ? "…" : "Delete"}
                    </button>
                  </div>

                  {/* Dropdown editor */}
                  {open && (
                    <div className="px-6 pb-4">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <div className="mb-1 text-xs font-semibold text-zinc-700">Title</div>
                            <input
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                              value={d.title}
                              onChange={(e) => updateDraft(ev.id, { title: e.target.value })}
                            />
                          </label>

                          <label className="block">
                            <div className="mb-1 text-xs font-semibold text-zinc-700">Starts at</div>
                            <input
                              type="datetime-local"
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                              value={d.startsAt}
                              onChange={(e) => updateDraft(ev.id, { startsAt: e.target.value })}
                            />
                          </label>

                          <label className="block">
                            <div className="mb-1 text-xs font-semibold text-zinc-700">Category</div>
                            <select
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                              value={d.categoryKey}
                              onChange={(e) => updateDraft(ev.id, { categoryKey: e.target.value })}
                            >
                              {CATEGORY_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-xs text-zinc-500">INTERNAL ⇒ mandatory automatically.</div>
                          </label>

                          <div className="block">
                            <div className="mb-1 text-xs font-semibold text-zinc-700">Service hours</div>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              disabled={d.categoryKey !== "SERVICE"}
                              className={[
                                "w-full rounded-xl border px-3 py-2 text-sm text-zinc-900",
                                d.categoryKey === "SERVICE"
                                  ? "border-zinc-300 bg-white"
                                  : "border-zinc-200 bg-zinc-100 text-zinc-400",
                              ].join(" ")}
                              value={d.serviceHours}
                              onChange={(e) => updateDraft(ev.id, { serviceHours: e.target.value })}
                              placeholder={d.categoryKey === "SERVICE" ? "e.g. 2" : "N/A"}
                            />
                            <div className="mt-1 text-xs text-zinc-500">Only applies to SERVICE.</div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-xs text-zinc-500">
                            {dirty ? "Unsaved changes" : "Up to date"}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => resetDraft(ev.id)}
                              disabled={!dirty || busy}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEvent(ev.id)}
                              disabled={!dirty || busy}
                              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
                            >
                              {busy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!events.length && <div className="px-4 py-6 text-sm text-zinc-600">No events yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
