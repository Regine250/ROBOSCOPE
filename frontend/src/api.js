// frontend/src/api.js

const API_BASE = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('roboscope_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  // --- AI Research Chatbot ---
  async sendChatMessage(message, history = []) {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, history }),
    });
    return handleResponse(response);
  },

  // --- Dashboard ---
  async getDashboardData() {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Authentication ---
  auth: {
    async register(data) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async login(data) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async getMe() {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  // --- Papers ---
  async listPapers(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) {
        query.append(key, val);
      }
    });
    const response = await fetch(`${API_BASE}/papers?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getPaper(paperId) {
    const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(paperId)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async addPaperTag(paperId, tagName) {
    const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(paperId)}/tags/${encodeURIComponent(tagName)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async removePaperTag(paperId, tagName) {
    const response = await fetch(`${API_BASE}/papers/${encodeURIComponent(paperId)}/tags/${encodeURIComponent(tagName)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Tags ---
  async listTags() {
    const response = await fetch(`${API_BASE}/tags`);
    return handleResponse(response);
  },

  async createTag(name) {
    const response = await fetch(`${API_BASE}/tags?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteTag(name) {
    const response = await fetch(`${API_BASE}/tags/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Saved Items (Bookmarks) ---
  async listSaved() {
    const response = await fetch(`${API_BASE}/saved`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async addSaved(itemType, itemId, note = '') {
    const response = await fetch(`${API_BASE}/saved?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(itemId)}&note=${encodeURIComponent(note)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async removeSaved(itemType, itemId) {
    const response = await fetch(`${API_BASE}/saved/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // --- Datasets ---
  async listDatasets() {
    const response = await fetch(`${API_BASE}/datasets`);
    return handleResponse(response);
  },

  async getDataset(repoId) {
    const response = await fetch(`${API_BASE}/datasets/${repoId}`);
    return handleResponse(response);
  },

  async downloadDataset(repoId) {
    const response = await fetch(`${API_BASE}/datasets/download`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ repo_id: repoId }),
    });
    return handleResponse(response);
  },

  async listEpisodes(repoId) {
    const response = await fetch(`${API_BASE}/datasets/${repoId}/episodes`);
    return handleResponse(response);
  },

  async getTrajectory(repoId, episodeIndex) {
    const response = await fetch(`${API_BASE}/datasets/${repoId}/episodes/${episodeIndex}/trajectory`);
    return handleResponse(response);
  },

  getVideoUrl(repoId, episodeIndex, cameraKey = 'observation.images.front') {
    return `${API_BASE}/datasets/${repoId}/episodes/${episodeIndex}/video?key=${encodeURIComponent(cameraKey)}`;
  },

  // --- arXiv Ingestion Sync ---
  async runIngestion() {
    const response = await fetch(`${API_BASE}/ingest/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getIngestionStatus() {
    const response = await fetch(`${API_BASE}/ingest/status`);
    return handleResponse(response);
  },
};
