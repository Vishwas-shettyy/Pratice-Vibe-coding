const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

export const authApi = {
  async register(data) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'omit' // cookies are not set until login
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'omit' // sends nothing, expects set-cookie back
    });
    return res.json();
  },

  async me() {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include' // sends cookies
    });
    if (res.status === 401) {
      const data = await res.clone().json().catch(() => ({}));
      if (data?.error?.message === "Missing token") {
        return res.json();
      }
      // Try refresh
      const refRes = await this.refresh();
      if (refRes.ok) {
        return fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include'
        }).then(r => r.json());
      }
    }
    return res.json();
  },

  async refresh() {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return res.json();
  },

  async updateProfile(data) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    if (res.status === 401) {
      const refRes = await this.refresh();
      if (refRes.ok) {
        return fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        }).then(r => r.json());
      }
    }
    return res.json();
  }
};
