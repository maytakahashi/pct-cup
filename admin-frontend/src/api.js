import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001",
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
