/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * Every network call in the app goes through `request()` so error handling,
 * auth headers and the base URL live in exactly one place.
 */

const BASE_URL = import.meta.env.VITE_API_BASE || "";

export const TOKEN_STORAGE_KEY = "leanor.admin.token";

export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* private mode / storage disabled — the session just won't persist */
  }
}

async function request(path, { method = "GET", token = "", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty body */
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed (status ${response.status})`,
    );
    error.status = response.status;
    // FastAPI validation errors arrive as { field: "message" }
    error.detail = data?.detail ?? null;
    error.fields = error.detail && typeof error.detail === "object" ? error.detail : null;
    throw error;
  }
  return data;
}

/* ---------------------------------------------------------------- public */

export function submitInformation(formData) {
  return request("/api/submissions", { method: "POST", body: formData });
}

export function fetchHealth() {
  return request("/api/health");
}

/* ----------------------------------------------------------------- admin */

export async function login(email, password) {
  const result = await request("/api/admin/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  setToken(result.token);
  return result;
}

export function checkSession(token) {
  return request("/api/admin/session", { token });
}

export function fetchSubmissions(token) {
  return request("/api/submissions?limit=200", { token });
}

export function fetchStats(token) {
  return request("/api/stats", { token });
}

export function deleteSubmission(id, token) {
  return request(`/api/submissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}