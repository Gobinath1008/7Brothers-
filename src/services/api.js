/**
 * Unified API Client for Box Cricket Tournament System
 * Uses relative paths (/api) so it works out of the box in Vercel and local dev
 */

const TOKEN_KEY = 'box_cricket_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication API
export const authService = {
  login: (email, password) => apiRequest('/api/auth/login', { method: 'POST', body: { email, password } }),
  getMe: () => apiRequest('/api/auth/me'),
  initAdmin: () => apiRequest('/api/auth/init', { method: 'POST' }),
};

// Tournaments API
export const tournamentService = {
  getAll: () => apiRequest('/api/tournaments'),
  getById: (id) => apiRequest(`/api/tournaments/${id}`),
  create: (data) => apiRequest('/api/tournaments', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/api/tournaments/${id}`, { method: 'PUT', body: data }),
  delete: (id) => apiRequest(`/api/tournaments/${id}`, { method: 'DELETE' }),
};

// Registrations API
export const registrationService = {
  registerTeam: (data) => apiRequest('/api/registrations', { method: 'POST', body: data }),
  getAll: (tournamentId, search) => {
    let url = '/api/registrations';
    const params = new URLSearchParams();
    if (tournamentId) params.append('tournamentId', tournamentId);
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    return apiRequest(url);
  },
  getById: (id) => apiRequest(`/api/registrations/${id}`),
  update: (id, data) => apiRequest(`/api/registrations/${id}`, { method: 'PUT', body: data }),
  delete: (id) => apiRequest(`/api/registrations/${id}`, { method: 'DELETE' }),
  confirmTeams: (tournamentId, confirmedTeamIds) =>
    apiRequest('/api/teams/confirm', { method: 'POST', body: { tournamentId, confirmedTeamIds } }),
};

// Matches & Fixtures API
export const matchService = {
  getAll: (tournamentId, round, status) => {
    let url = '/api/matches';
    const params = new URLSearchParams();
    if (tournamentId) params.append('tournamentId', tournamentId);
    if (round) params.append('round', round);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    return apiRequest(url);
  },
  getById: (id) => apiRequest(`/api/matches/${id}`),
  update: (id, data) => apiRequest(`/api/matches/${id}`, { method: 'PUT', body: data }),
  generateFixtures: (tournamentId, force = false) =>
    apiRequest('/api/matches/generate', { method: 'POST', body: { tournamentId, force } }),
};

// Scoring API
export const scoringService = {
  recordBall: (data) => apiRequest('/api/scoring/ball', { method: 'POST', body: data }),
  undoBall: (matchId) => apiRequest('/api/scoring/undo', { method: 'POST', body: { matchId } }),
  updateStatus: (data) => apiRequest('/api/scoring/status', { method: 'POST', body: data }),
};

// Exports API (for fresh data fetching before PDF/CSV generation)
export const exportService = {
  getData: (tournamentId, type = 'registrations') =>
    apiRequest(`/api/exports/data?tournamentId=${tournamentId}&type=${type}`),
};
