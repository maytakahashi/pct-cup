import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

function normalize(str) {
  return String(str ?? "").toLowerCase().trim();
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function alphaKeyForUser(u) {
  const last = String(u?.lastName ?? "").trim();
  const name = String(u?.name ?? "").trim();
  const ch = (last[0] || name[0] || "?").toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

function sortUsersAlpha(a, b) {
  const aLast = String(a?.lastName ?? "").trim();
  const bLast = String(b?.lastName ?? "").trim();
  const aFirst = String(a?.firstName ?? "").trim();
  const bFirst = String(b?.firstName ?? "").trim();

  return (
    aLast.localeCompare(bLast) ||
    aFirst.localeCompare(bFirst) ||
    String(a?.username ?? "").localeCompare(String(b?.username ?? "")) ||
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
  );
}

function groupByAlpha(users) {
  const sorted = [...users].sort(sortUsersAlpha);

  const map = new Map();
  for (const u of sorted) {
    const k = alphaKeyForUser(u);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(u);
  }

  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return keys.map((k) => ({ key: k, users: map.get(k) }));
}

function jumpToAlpha(key) {
  const el = document.getElementById(`alpha-${key}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function slugifyFilename(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function fmtDateForFilename(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "unknown_date";
    const yyyy = String(dt.getFullYear());
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "unknown_date";
  }
}

function downloadTextFile(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fullName(u) {
  // Prefer explicit first/last; fall back to u.name; fall back to username.
  const first = String(u?.firstName ?? "").trim();
  const last = String(u?.lastName ?? "").trim();
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;

  const name = String(u?.name ?? "").trim();
  if (name) return name;

  return String(u?.username ?? "").trim();
}

export default function AdminAttendance() {
  const nav = useNavigate();

  const [events, setEvents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [presentSet, setPresentSet] = useState(() => new Set());
  const initialPresentRef = useRef(new Set()); // dirty baseline

  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);

  const dirty = !setsEqual(presentSet, initialPresentRef.current);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [eventsRes, rosterRes] = await Promise.all([
        api.get("/admin/events"),
        api.get("/admin/roster"),
      ]);

      setEvents(eventsRes.data);

      // normalize roster shape
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
      initialPresentRef.current = next;
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
      const blob = normalize(
        `${fullName(u)} ${u.username} ${u.firstName} ${u.lastName}`
      );
      return blob.includes(q);
    });
  }, [roster, query]);

  const alphaGroups = useMemo(
    () => groupByAlpha(filteredRoster),
    [filteredRoster]
  );

  const availableAlphaKeys = useMemo(
    () => alphaGroups.map((g) => g.key),
    [alphaGroups]
  );

  const alphabet = useMemo(() => {
    const letters = [];
    for (let i = 65; i <= 90; i++) letters.push(String.fromCharCode(i)); // A-Z
    letters.push("#");
    return letters;
  }, []);

  function toggleUser(userId) {
    setSavedMsg(null);
    setPresentSet((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function setMany(users, value) {
    setSavedMsg(null);
    setPresentSet((prev) => {
      const next = new Set(prev);
      for (const u of users) {
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
      await api.post(`/admin/events/${selectedEventId}/attendance`, {
        presentUserIds,
      });
      setSavedMsg(`Saved ${presentUserIds.length} present ✔`);
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
      const ok = window.confirm(
        "You have unsaved changes for this event. Switch events and discard them?"
      );
      if (!ok) return;
    }
    setSelectedEventId(String(nextId));
  }

  useEffect(() => {
    if (!selectedEventId) return;
    loadAttendance(selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  // ---------- TSV EXPORT (alphabetical) ----------
  function buildAttendanceRows() {
    // Export FULL roster, alphabetical
    const sorted = [...roster].sort(sortUsersAlpha);

    // X for present, AB for absent
    return sorted.map((u) => {
      const mark = presentSet.has(u.id) ? "X" : "AB";
      return {
        name: fullName(u),
        mark,
      };
    });
  }

  async function copyTSV() {
    if (!selectedEvent) return;

    const rows = buildAttendanceRows();

    const lines = rows.map((r) => r.mark);

    await navigator.clipboard.writeText(lines.join("\n"));
    setSavedMsg(`Copied attendance table to clipboard ✔`);
  }

  function downloadTSV() {
    if (!selectedEvent) return;

    const rows = buildAttendanceRows();
    const header = ["Name", "Attendance"];

    const lines = [
      header.join("\t"),
      ...rows.map((r) => [r.name, r.mark].join("\t")),
    ];

    const datePart = fmtDateForFilename(selectedEvent.startsAt);
    const titlePart = slugifyFilename(selectedEvent.title);
    const filename = `attendance_${datePart}_${titlePart}.tsv`;

    downloadTextFile(
      filename,
      lines.join("\n"),
      "text/tab-separated-values;charset=utf-8"
    );
    setSavedMsg(`Downloaded TSV ✔`);
  }
  // --------------------------------------------

  if (loading) return <div className="text-sm text-zinc-600">Loading…</div>;

  return (
    <div className="space-y-6 text-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pick an event, then mark who was present.
            {dirty && (
              <span className="ml-2 font-semibold text-amber-700">
                Unsaved changes
              </span>
            )}
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

          {/* TSV export */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyTSV}
              disabled={!selectedEvent || loadingAttendance}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
              title="Copy TSV (alphabetical): Attendance = X (present) / AB (absent)"
            >
              Copy Table
            </button>

            <button
              type="button"
              onClick={downloadTSV}
              disabled={!selectedEvent || loadingAttendance}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
              title="Download TSV (alphabetical): Attendance = X (present) / AB (absent)"
            >
              Download Table
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-md">
          <div className="mb-1 text-xs font-medium text-zinc-600">
            Search roster
          </div>
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Type a name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-700">
            Marked present:{" "}
            <span className="font-semibold text-zinc-900">
              {presentSet.size}
            </span>
          </div>

          <span className="hidden h-6 w-px bg-zinc-200 sm:block" />

          <button
            onClick={() => setMany(filteredRoster, true)}
            disabled={loadingAttendance || filteredRoster.length === 0}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            title="Marks everyone in the current filtered roster as present"
          >
            All present
          </button>
          <button
            onClick={() => setMany(filteredRoster, false)}
            disabled={loadingAttendance || filteredRoster.length === 0}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            title="Clears everyone in the current filtered roster"
          >
            Clear
          </button>
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
                <div className="font-semibold text-zinc-900">
                  {selectedEvent.title}
                </div>
                {selectedEvent.category?.key === "INTERNAL" && (
                  <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
                    Mandatory
                  </span>
                )}
                {loadingAttendance && (
                  <span className="text-xs text-zinc-500">
                    Loading attendance…
                  </span>
                )}
              </div>

              <div className="text-sm text-zinc-600">
                {new Date(selectedEvent.startsAt).toLocaleString()}
                {selectedEvent.category?.name
                  ? ` · ${selectedEvent.category.name}`
                  : ""}
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              {query
                ? `Filtered roster: ${filteredRoster.length}`
                : `Roster: ${roster.length}`}
            </div>
          </div>
        </div>
      )}

      {/* Alphabetical roster + jump bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div className="font-semibold text-zinc-900">Roster</div>

          <div className="flex flex-wrap gap-1">
            {alphabet.map((ch) => {
              const enabled = availableAlphaKeys.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => enabled && jumpToAlpha(ch)}
                  disabled={!enabled}
                  className={[
                    "h-7 w-7 rounded-lg text-xs font-semibold",
                    enabled
                      ? "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-300 cursor-not-allowed",
                  ].join(" ")}
                  title={enabled ? `Jump to ${ch}` : `No ${ch} names in roster`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[460px] overflow-auto p-2">
          {alphaGroups.map((g) => (
            <div key={g.key} className="mb-3">
              <div
                id={`alpha-${g.key}`}
                className="sticky top-0 z-10 -mx-2 px-4 py-2 bg-white/95 backdrop-blur border-b border-zinc-100"
              >
                <div className="text-xs font-semibold text-zinc-600">
                  {g.key}{" "}
                  <span className="font-normal text-zinc-400">
                    ({g.users.length})
                  </span>
                </div>
              </div>

              <div className="pt-2">
                {g.users.map((u) => {
                  const checked = presentSet.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-zinc-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {fullName(u)}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          {u.username}
                        </div>
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
              </div>
            </div>
          ))}

          {filteredRoster.length === 0 && (
            <div className="px-3 py-6 text-sm text-zinc-600">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
