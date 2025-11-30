import axios from "axios";

const baseURL = import.meta.env?.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, "")
  : ""; // same-origin in prod

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export async function listCheckpoints() {
  const res = await api.get("/admin/checkpoints");
  return res.data.checkpoints;
}

export async function updateCheckpoint(number, patch) {
  // patch: { label?, endDate?, newNumber? }
  const res = await api.put(`/admin/checkpoints/${number}`, patch);
  return res.data;
}

export async function createCheckpoint(body) {
  // body: { number, label?, endDate }
  const res = await api.post("/admin/checkpoints", body);
  return res.data;
}

export async function deleteCheckpoint(number) {
  const res = await api.delete(`/admin/checkpoints/${number}`);
  return res.data;
}

export async function updateEvent(id, patch) {
  // patch: { title?, startsAt?, categoryKey?, serviceHours? }
  const res = await api.put(`/admin/events/${id}`, patch);
  return res.data;
}
