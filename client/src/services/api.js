const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error || 'Request failed';
    throw new Error(message);
  }

  return data;
}

const api = {
  API_BASE_URL,
  getCurrentUser: () => request('/api/users/me'),
  getUserStats: () => request('/api/users/me/stats'),
  getAllMemories: () => request('/api/memories/all'),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  getNearbyMemories: ({ latitude, longitude, radius = 500 }) =>
    request(
      `/api/memories/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`,
    ),
  getPlacedMemories: () => request('/api/memories/placed'),
  getUnlockedMemories: () => request('/api/memories/unlocked'),
  updateMemoryVisibility: (id, visibility) =>
    request(`/api/memories/${id}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    }),
  getMemoryDetail: (id) => request(`/api/memories/${id}`),
  createMemory: (formData) =>
    fetch(`${API_BASE_URL}/api/memories`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Unable to create memory');
      }
      return payload;
    }),
  unlockMemory: (memoryId, coords) =>
    request(`/api/memories/${memoryId}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords),
    }),
  getFollowers: () => request('/api/followers'),
  addFollower: (email) =>
    request('/api/followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  removeFollower: (userId) =>
    request(`/api/followers/${userId}`, {
      method: 'DELETE',
    }),
  getJourneys: () => request('/api/journeys'),
  getJourneyMemories: (journeyId) => request(`/api/journeys/${journeyId}/memories`),
  updateJourneyVisibility: (journeyId, visibility) =>
    request(`/api/journeys/${journeyId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    }),
  createJourney: (payload) =>
    request('/api/journeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};

export default api;
