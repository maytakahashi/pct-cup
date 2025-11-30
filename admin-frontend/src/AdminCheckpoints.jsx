import { useEffect, useState } from "react";
import { api } from "./api";

function toLocalInputValue(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects "YYYY-MM-DDTHH:mm" in *local* time
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCheckpoints() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  async function reload() {
    setErr(null);
    const res = await api.get("/admin/checkpoints");
    const cps = res.data?.checkpoints || [];
    setRows(
      cps.map((c) => ({
        ...c,
        _label: c.label ?? "",
        _endDate: toLocalInputValue(c.endDate),
      }))
    );
  }

  useEffect(() => {
    reload().catch((e) => setErr(e?.response?.data?.error || "Failed to load checkpoints"));
  }, []);

  async function saveRow(r) {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/admin/checkpoints/${r.number}`, {
        label: r._label,
        endDate: new Date(r._endDate).toISOString(),
      });
      await reload();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to save checkpoint");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    setBusy(true);
    setErr(null);
    try {
      await api.post("/admin/checkpoints", {
        number: Number(newNumber),
        label: newLabel || undefined,
        endDate: new Date(newEndDate).toISOString(),
      });
      setNewNumber("");
      setNewLabel("");
      setNewEndDate("");
      await reload();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create checkpoint");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(n) {
    if (!confirm(`Delete checkpoint ${n}? This may fail if requirements reference it.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api.delete(`/admin/checkpoints/${n}`);
      await reload();
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to delete checkpoint");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Checkpoints</h1>
          <p className="mt-1 text-sm text-slate-600">Edit label + endDate to fix seed data.</p>
        </div>
      </div>

      {err ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Add checkpoint */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Number</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="e.g. 1"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Label (optional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Checkpoint 1"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">End Date</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              disabled={busy || !newNumber || !newEndDate}
              onClick={onCreate}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Add checkpoint
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
          <div className="col-span-2">Number</div>
          <div className="col-span-4">Label</div>
          <div className="col-span-4">End Date</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.map((r) => (
          <div key={r.number} className="grid grid-cols-12 gap-2 px-4 py-3">
            <div className="col-span-2 flex items-center text-sm font-medium text-slate-900">{r.number}</div>

            <div className="col-span-4">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={r._label}
                onChange={(e) =>
                  setRows((xs) => xs.map((x) => (x.number === r.number ? { ...x, _label: e.target.value } : x)))
                }
              />
            </div>

            <div className="col-span-4">
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={r._endDate}
                onChange={(e) =>
                  setRows((xs) => xs.map((x) => (x.number === r.number ? { ...x, _endDate: e.target.value } : x)))
                }
              />
            </div>

            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                disabled={busy || !r._endDate}
                onClick={() => saveRow(r)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                disabled={busy}
                onClick={() => onDelete(r.number)}
                className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No checkpoints found.</div>
        ) : null}
      </div>
    </div>
  );
}
