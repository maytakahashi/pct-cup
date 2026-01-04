import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const CLASS_TYPES = ["NON_GRAD", "SENIOR"]; // adjust if your schema uses different values

function keyFor(classType, categoryId, checkpointId) {
  return `${classType}:${categoryId}:${checkpointId}`;
}

export default function AdminRequirements() {
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const [activeClassType, setActiveClassType] = useState(CLASS_TYPES[0]);

  const [categories, setCategories] = useState([]);     // [{id,key,name,color}]
  const [checkpoints, setCheckpoints] = useState([]);   // [{id,number,label,endDate}]
  const [base, setBase] = useState({});                 // key -> required
  const [draft, setDraft] = useState({});               // key -> required (string)

  async function load() {
    setErr(null);
    setOk(null);

    try {
      const res = await api.get("/admin/requirements");
      const { categories, checkpoints, requirements } = res.data;

      // checkpoints sorted asc; last column labeled "Final" in UI
      const cps = [...checkpoints].sort((a, b) => a.number - b.number);

      setCategories(categories);
      setCheckpoints(cps);

      const nextBase = {};
      for (const r of requirements) {
        nextBase[keyFor(r.classType, r.categoryId, r.checkpointId)] =
          r.required ?? 0;
      }

      // ensure every cell exists (default 0)
      for (const ct of CLASS_TYPES) {
        for (const c of categories) {
          for (const cp of cps) {
            const k = keyFor(ct, c.id, cp.id);
            if (nextBase[k] == null) nextBase[k] = 0;
          }
        }
      }

      setBase(nextBase);

      // initialize draft from base (string inputs)
      const nextDraft = {};
      for (const [k, v] of Object.entries(nextBase)) nextDraft[k] = String(v ?? 0);
      setDraft(nextDraft);
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to load requirements");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const lastCheckpointId = useMemo(() => {
    if (!checkpoints.length) return null;
    return checkpoints[checkpoints.length - 1].id;
  }, [checkpoints]);

  function isDirtyKey(k) {
    const b = base[k];
    const dRaw = draft[k];
    const d = dRaw === "" ? 0 : Number(dRaw);
    return Number.isFinite(d) && d !== (b ?? 0);
  }

  const dirtyCountForActive = useMemo(() => {
    let n = 0;
    for (const c of categories) {
      for (const cp of checkpoints) {
        const k = keyFor(activeClassType, c.id, cp.id);
        if (isDirtyKey(k)) n += 1;
      }
    }
    return n;
  }, [activeClassType, categories, checkpoints, base, draft]);

  const totalDirtyCount = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(draft)) if (isDirtyKey(k)) n += 1;
    return n;
  }, [base, draft]);

  function setCell(classType, categoryId, checkpointId, value) {
    const k = keyFor(classType, categoryId, checkpointId);

    // allow empty while typing, but normalize on save
    setDraft((prev) => ({ ...prev, [k]: value }));
  }

  function resetAll() {
    const nextDraft = {};
    for (const [k, v] of Object.entries(base)) nextDraft[k] = String(v ?? 0);
    setDraft(nextDraft);
    setOk(null);
    setErr(null);
  }

  async function saveAll() {
    setErr(null);
    setOk(null);

    // collect dirty updates across BOTH class types (for everyone)
    const updates = [];

    for (const ct of CLASS_TYPES) {
      for (const c of categories) {
        for (const cp of checkpoints) {
          const k = keyFor(ct, c.id, cp.id);
          if (!isDirtyKey(k)) continue;

          const raw = draft[k];
          const n = raw === "" ? 0 : Number(raw);
          if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
            return setErr("All requirement values must be whole numbers ≥ 0.");
          }

          updates.push({
            classType: ct,
            categoryId: c.id,
            checkpointId: cp.id,
            required: n,
          });
        }
      }
    }

    if (!updates.length) {
      setOk("No changes to save.");
      return;
    }

    try {
      setBusy(true);
      await api.put("/admin/requirements", { updates });
      setOk(`Saved ✔ (${updates.length} changes)`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error ?? "Failed to save requirements");
    } finally {
      setBusy(false);
    }
  }

  function colLabel(cp, idx) {
    // last checkpoint shown as "Final"
    if (idx === checkpoints.length - 1) return "Final";
    return `Checkpoint #${cp.number}`;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-500">Admin</div>
        <div className="text-xl font-semibold">Checkpoint Requirements</div>
        <div className="mt-1 text-sm text-zinc-600">
          Edit requirements by category + checkpoint. Final column = last checkpoint.
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

      <div className="flex flex-wrap items-center gap-2">
        {CLASS_TYPES.map((ct) => (
          <button
            key={ct}
            type="button"
            onClick={() => setActiveClassType(ct)}
            className={[
              "rounded-xl px-3 py-2 text-sm font-semibold border",
              activeClassType === ct
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
            ].join(" ")}
          >
            {ct === "NON_GRAD" ? "Non-graduating" : "Senior"}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            disabled={busy || totalDirtyCount === 0}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={busy || totalDirtyCount === 0}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {busy ? "Saving…" : `Save all (${totalDirtyCount})`}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          {activeClassType === "NON_GRAD" ? "Non-grad requirements" : `${activeClassType} requirements`}
        </div>

        {/* scroll only the grid, header stays visible */}
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="border-b border-zinc-200 px-4 py-2 text-left text-xs font-semibold text-zinc-600">
                  Category
                </th>
                {checkpoints.map((cp, idx) => (
                  <th
                    key={cp.id}
                    className="border-b border-zinc-200 px-4 py-2 text-left text-xs font-semibold text-zinc-600"
                    title={cp.label || `Checkpoint ${cp.number}`}
                  >
                    {colLabel(cp, idx)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/60">
                  <td className="border-b border-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color || "#A1A1AA" }}
                      />
                      <span>{cat.key}</span>
                      <span className="text-xs font-normal text-zinc-500">
                        {cat.name ? `· ${cat.name}` : ""}
                      </span>
                    </div>
                  </td>

                  {checkpoints.map((cp) => {
                    const k = keyFor(activeClassType, cat.id, cp.id);
                    const dirty = isDirtyKey(k);
                    const isFinal = lastCheckpointId != null && cp.id === lastCheckpointId;

                    return (
                      <td key={cp.id} className="border-b border-zinc-100 px-4 py-2">
                        <input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          type="number"
                          min="0"
                          step="1"
                          className={[
                            "w-24 rounded-xl border px-3 py-1.5 text-sm",
                            dirty
                              ? "border-amber-300 bg-amber-50 text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-900",
                            isFinal ? "font-semibold" : "",
                          ].join(" ")}
                          value={draft[k] ?? "0"}
                          onChange={(e) =>
                            setCell(activeClassType, cat.id, cp.id, e.target.value)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {!categories.length && (
                <tr>
                  <td colSpan={1 + checkpoints.length} className="px-4 py-6 text-sm text-zinc-600">
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
