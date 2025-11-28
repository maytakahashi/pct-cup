import { useEffect, useState } from "react";
import { api } from "./api";

export default function AdminAlerts() {
  const [checkpoint, setCheckpoint] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const res = await api.get(`/admin/alerts?checkpoint=${checkpoint}`);
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.error ?? "Failed to load alerts");
      }
    })();
  }, [checkpoint]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-500">Admin</div>
            <div className="text-xl font-semibold">Alerts</div>
            <div className="mt-1 text-sm text-zinc-600">
              People who are at risk or off track for this checkpoint.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-600">Checkpoint</div>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              value={checkpoint}
              onChange={(e) => setCheckpoint(Number(e.target.value))}
            >
              {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {data && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            {data.checkpoint?.label ?? `Checkpoint ${checkpoint}`}
          </div>

          <div className="overflow-auto">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr className="text-left">
                  <th className="px-4 py-3">Bro</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Remaining needed</th>
                  <th className="px-4 py-3">Remaining opportunities</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.alerts.map((a, i) => (
                  <tr key={`${a.username}-${i}`} className="border-t border-zinc-200">
                    <td className="px-4 py-3 font-medium text-zinc-900">{a.name}</td>
                    <td className="px-4 py-3">{a.teamId}</td>
                    <td className="px-4 py-3">{a.categoryKey}</td>
                    <td className="px-4 py-3">{a.remainingNeeded}</td>
                    <td className="px-4 py-3">{a.remainingOpportunities}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        a.status === "OFF_TRACK"
                          ? "border-rose-200 bg-rose-50 text-rose-900"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!data.alerts.length && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-zinc-600" colSpan={6}>
                      No alerts 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
