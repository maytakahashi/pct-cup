import axios from "axios";

// Use an env var in production, fallback to local dev.
// Vite env vars must start with VITE_
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ✅ THIS is the "include credentials" for cookies
});
