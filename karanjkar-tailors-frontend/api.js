import axios from "axios";

export const AUTH_TOKEN_KEY = "kt_token_v1";
export const AUTH_USER_KEY = "kt_user_v1";

const ENV_API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").trim();
const API_BASE_URL = (ENV_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error?.config?.method?.toUpperCase() || "UNKNOWN";
    const url = `${error?.config?.baseURL || ""}${error?.config?.url || ""}`;
    const status = error?.response?.status;
    const payload = error?.config?.data;
    const server = error?.response?.data;
    // Helps identify which exact API call is failing in browser devtools.
    // eslint-disable-next-line no-console
    console.error("[API ERROR]", { method, url, status, payload, server });
    if (status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    return Promise.reject(error);
  }
);

export const getApiError = (error, fallback) =>
  (!error?.response && error?.message
    ? `Cannot connect to backend API at ${API_BASE_URL}. Start backend server or set REACT_APP_API_BASE_URL and restart frontend.`
    : null) ||
  (error?.response?.status === 404
    ? "API route not found (404). Restart backend server."
    : null) ||
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

export default api;
