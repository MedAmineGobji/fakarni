import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const tokens = {
  get access() { return localStorage.getItem("access"); },
  get refresh() { return localStorage.getItem("refresh"); },
  set({ access, refresh }) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  clear() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

const api = axios.create({ baseURL: API_URL });

// Ajoute le jeton JWT à chaque requête.
api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

// Si le jeton d'accès a expiré (401), on tente une fois de le renouveler.
let refreshing = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith("/auth/token");
    if (error.response?.status === 401 && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true;
      try {
        refreshing ??= axios.post(`${API_URL}/auth/refresh/`, { refresh: tokens.refresh });
        const { data } = await refreshing;
        tokens.set(data);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        tokens.clear();
        window.location.assign("/login");
      } finally {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

// Transforme une erreur DRF en message lisible.
export function errorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Impossible de joindre le serveur. Le backend est-il lancé ?";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([field, msgs]) => `${field} : ${[].concat(msgs).join(" ")}`)
    .join("\n");
}

export const authApi = {
  login: (email, password) => api.post("/auth/token/", { email, password }),
  register: (payload) => api.post("/auth/register/", payload),
  me: () => api.get("/auth/me/"),
  updateMe: (payload) => api.patch("/auth/me/", payload),
};

export default api;

export const medsApi = {
  list: (archived = false) => api.get("/medications/", { params: archived ? { archived: true } : {} }),
  get: (id) => api.get(`/medications/${id}/`),
  create: (payload) => api.post("/medications/", payload),
  update: (id, payload) => api.patch(`/medications/${id}/`, payload),
  archive: (id) => api.delete(`/medications/${id}/`),
  restore: (id) => api.patch(`/medications/${id}/`, { is_archived: false }),
};

export const intakesApi = {
  forDay: (date) => api.get("/intakes/", { params: { date } }),
  history: (from, to) => api.get("/intakes/", { params: { from, to } }),
  take: (id) => api.post(`/intakes/${id}/take/`),
  snooze: (id, minutes = 15) => api.post(`/intakes/${id}/snooze/`, { minutes }),
  skip: (id) => api.post(`/intakes/${id}/skip/`),
  stats: (days = 30) => api.get("/intakes/stats/", { params: { days } }),
};

export const notificationsApi = {
  list: () => api.get("/notifications/"),
  read: (id) => api.post(`/notifications/${id}/read/`),
  readAll: () => api.post("/notifications/read-all/"),
};
