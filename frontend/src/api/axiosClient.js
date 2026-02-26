import axios from "axios";

// Use Vite env with sensible fallback matching backend/.env PORT=5050
const baseURL = import.meta?.env?.VITE_API_URL || "http://localhost:5050";

const api = axios.create({ baseURL });

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      // Token invalid/expired → logout and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (typeof window !== "undefined") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
