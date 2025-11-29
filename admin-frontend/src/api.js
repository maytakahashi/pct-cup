import axios from "axios";

const baseURL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://pct-cup-production.up.railway.app");

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// tiny helper (optional)
export async function safeGetMe() {
  try {
    const res = await api.get("/me");
    return res.data;
  } catch {
    return null;
  }
}
