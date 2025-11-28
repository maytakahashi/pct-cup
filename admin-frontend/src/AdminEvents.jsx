import { useEffect, useState } from "react";
import { api } from "./api";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [categoryKey, setCategoryKey] = useState("INTERNAL");
  const [serviceHours, setServiceHours] = useState("");

  const [busyId, setBusyId] = useState(null);

  async function load() {
    setErr(null);
    try {
      const res = await api.get("/admin/events");
      setEvents(res.data);
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
        startsAt,
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

    const ev = events.find((x) => x.id === eventId);
    const label = ev ? `${ev.title} (${new Date(ev.startsAt).toLocaleString()})` : `Event ${eventId}`;

    if (!confirm(`Delete this event?\n\n${label}\n\nThis will also remove recorded attendance for it.`)) return;

    try {
      setBusyId(eventId);
      await api.delete(`/admin/events/${eventId}`);
      setOk("Deleted event ✔");
      await load();
    } catch (e3) {
      setErr(e3?.response?.data?.error ?? "Failed to delete event");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-500">Admin</div>
        <div className="text-xl font-semibold">Events</div>
        <div className="mt-1 text-sm text-zinc-600">
          Internal events are automatically mandatory (no checkbox).
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </div>
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
              {["CHAPTER", "RUSH", "INTERNAL", "CORPORATE", "PLEDGE", "SERVICE", "CASUAL"].map((k) => (
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
                min="0"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                value={serviceHours}
                onChange={(e) => setServiceHours(e.target.value)}
                required
              />
              <div className="mt-1 text-xs text-zinc-500">Partial hours don’t count — whole numbers only.</div>
            </label>
          )}

          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Create
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">All events</div>

          <div className="max-h-[520px] overflow-auto">
            {events.map((e) => (
              <div key={e.id} className="border-b border-zinc-100 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{e.title}</div>
                    <div className="text-sm text-zinc-600">
                      {new Date(e.startsAt).toLocaleString()} · {e.category?.name ?? e.categoryId}
                      {e.serviceHours ? ` · ${e.serviceHours} hr` : ""}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {e.mandatory && (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
                        Mandatory
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeEvent(e.id)}
                      disabled={busyId === e.id}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {busyId === e.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!events.length && <div className="px-4 py-6 text-sm text-zinc-600">No events yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
