import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

function normalize(str) {
  return String(str ?? "")
    .toLowerCase()
    .trim();
}

function groupByTeam(roster) {
  const map = new Map();
  for (const u of roster) {
    const key = u.teamId ?? 0;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(u);
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    map.set(k, arr);
  }
  return map;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export default function AdminAttendance() {
  const nav = useNavigate();

  const [events, setEvents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [presentSet, setPresentSet] = useState(() => new Set());
  const initialPresentRef = useRef(new Set()); // used for dirty check

  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);

  const dirty = useMemo(() => !setsEqual(presentSet, initialPresentRef.current), [presentSet]);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [eventsRes, rosterRes] = await Promise.all([
        api.get("/admin/events"),
        api.get("/admin/roster"),
      ]);

      setEvents(eventsRes.data);

      // normalize roster shape: ensure { id, username, firstName, lastName, teamId, name }
      const normalizedRoster = (rosterRes.data ?? []).map((u) => {
        const first = u.firstName ?? "";
        const last = u.lastName ?? "";
        const name = u.name ?? `${first} ${last}`.trim();
        return {
          id: u.id,
          username: u.username,
          firstName: first,
          lastName: last,
          teamId: u.teamId ?? 0,
          name,
        };
      });

      setRoster(normalizedRoster);

      if (!selectedEventId && eventsRes.data.length) {
        setSelectedEventId(String(eventsRes.data[0].id));
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) nav("/login");
      else setErr(e?.response?.data?.error ?? "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance(eventId) {
    if (!eventId) return;
    setErr(null);
    setSavedMsg(null);
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/admin/events/${eventId}/attendance`);
      const ids = res.data?.presentUserIds ?? [];
      const next = new Set(ids);
      setPresentSet(next);
      initialPresentRef.current = next; // reset dirty baseline
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) nav("/login");
      else setErr(e?.response?.data?.error ?? "Failed to load attendance");
      const empty = new Set();
      setPresentSet(empty);
      initialPresentRef.current = empty;
    } finally {
      setLoadingAttendance(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // protect against refresh close if unsaved
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectedEvent = useMemo(() => {
    return events.find((e) => String(e.id) === String(selectedEventId)) || null;
  }, [events, selectedEventId]);

  const filteredRoster = useMemo(() => {
    const q = normalize(query);
    if (!q) return roster;
    return roster.filter((u) => {
      const blob = normalize(`${u.name} ${u.username} ${u.firstName} ${u.lastName}`);
      return blob.includes(q);
    });
  }, [roster, query]);

  const rosterByTeam = useMemo(() => groupByTeam(filteredRoster), [filteredRoster]);

  function toggleUser(userId) {
    setSavedMsg(null);
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function setTeamAll(teamUsers, value) {
    setSavedMsg(null);
    setPresentSet((prev) => {
      const next = new Set(prev);
      for (const u of teamUsers) {
        if (value) next.add(u.id);
        else next.delete(u.id);
      }
      return next;
    });
  }

  async function save() {
    if (!selectedEventId) return;
    setErr(null);
    setSavedMsg(null);
    setSaving(true);
    try {
      const presentUserIds = Array.from(presentSet.values());
      await api.post(`/admin/events/${selectedEventId}/attendance`, { presentUserIds });
      setSavedMsg(`Saved ${presentUserIds.length} present ✔`);

      // update dirty baseline
      initialPresentRef.current = new Set(presentUserIds);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) nav("/login");
      else setErr(e?.response?.data?.error ?? "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  function handleEventChange(nextId) {
    if (!selectedEventId || String(nextId) === String(selectedEventId)) {
      setSelectedEventId(String(nextId));
      return;
    }
    if (dirty) {
      const ok = window.confirm("You have unsaved changes for this event. Switch events and discard them?");
      if (!ok) return;
    }
    setSelectedEventId(String(nextId));
  }

  useEffect(() => {
    if (!selectedEventId) return;
    loadAttendance(selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  if (loading) return <div className="text-sm text-zinc-600">Loading…</div>;

  return (
    <div className="space-y-6 text-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pick an event, then mark who was present.
            {dirty && <span className="ml-2 font-semibold text-amber-700">Unsaved changes</span>}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 sm:w-[360px]"
            value={selectedEventId}
            onChange={(e) => handleEventChange(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {new Date(e.startsAt).toLocaleString()} — {e.title}
              </option>
            ))}
          </select>

          <button
            onClick={save}
            disabled={saving || !selectedEventId || loadingAttendance}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-md">
          <div className="mb-1 text-xs font-medium text-zinc-600">Search roster</div>
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Type a name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="text-sm text-zinc-700">
          Marked present: <span className="font-semibold text-zinc-900">{presentSet.size}</span>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {savedMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {savedMsg}
        </div>
      )}

      {selectedEvent && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-zinc-500">Selected event</div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-zinc-900">{selectedEvent.title}</div>
                {selectedEvent.category?.key === "INTERNAL" && (
                  <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
                    Mandatory
                  </span>
                )}
                {loadingAttendance && <span className="text-xs text-zinc-500">Loading attendance…</span>}
              </div>

              <div className="text-sm text-zinc-600">
                {new Date(selectedEvent.startsAt).toLocaleString()}
                {selectedEvent.category?.name ? ` · ${selectedEvent.category.name}` : ""}
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              {query ? `Filtered roster: ${filteredRoster.length}` : `Roster: ${roster.length}`}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from(rosterByTeam.entries())
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([teamId, teamUsers]) => (
            <div key={teamId} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <div className="font-semibold text-zinc-900">
                  Team {teamId === 0 ? "?" : teamId}{" "}
                  <span className="text-xs font-normal text-zinc-500">({teamUsers.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTeamAll(teamUsers, true)}
                    disabled={loadingAttendance}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    All present
                  </button>
                  <button
                    onClick={() => setTeamAll(teamUsers, false)}
                    disabled={loadingAttendance}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-auto p-2">
                {teamUsers.map((u) => {
                  const checked = presentSet.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-zinc-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">{u.name}</div>
                        <div className="truncate text-xs text-zinc-500">{u.username}</div>
                      </div>

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(u.id)}
                        disabled={loadingAttendance}
                        className="h-4 w-4 accent-zinc-900"
                      />
                    </label>
                  );
                })}

                {!teamUsers.length && (
                  <div className="px-3 py-6 text-sm text-zinc-600">No matches in this team.</div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
