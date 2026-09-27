/**
 * API Service Client for Flask REST Backend
 * Handles async fetch requests, error handling, loading states, and fallback defaults.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result?.error?.message || `HTTP ${response.status}: API request failed`);
    }
    return result.data;
  } catch (error) {
    console.warn(`[API Client Warning] Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => fetchAPI("/health"),

  // Dashboard Stats
  getDashboardStats: () => fetchAPI("/dashboard/stats"),

  // Risk Areas / Habitations
  getRiskAreas: () => fetchAPI("/risk-areas"),
  getRiskAreaById: (id) => fetchAPI(`/risk-areas/${id}`),

  // GIS Map Data
  getMapData: () => fetchAPI("/map"),

  // Relocation
  getRelocationPriorities: () => fetchAPI("/relocation/priorities"),
  getRelocationWorkflow: () => fetchAPI("/relocation/workflow"),
  assignShelter: (areaId, shelterId) =>
    fetchAPI(`/relocation/${areaId}/assign`, {
      method: "POST",
      body: JSON.stringify({ shelterId }),
    }),
  updateRelocationStatus: (areaId, status, progress) =>
    fetchAPI(`/relocation/${areaId}/update-status`, {
      method: "POST",
      body: JSON.stringify({ status, progress }),
    }),

  // Shelters
  getShelters: () => fetchAPI("/shelters"),

  // Resources
  getResources: () => fetchAPI("/resources"),

  // Alerts
  getAlerts: () => fetchAPI("/alerts"),

  // Reports
  getReports: () => fetchAPI("/reports"),
};
