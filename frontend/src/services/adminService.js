// src/services/adminService.js — CODE 100% FONCTIONNEL
const API_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const adminService = {
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur de connexion');
    return data;
  },

  getInscriptions: async (filters = {}) => {
    const token = getToken();
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/admin/inscriptions?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur');
    return { data };
  },

  getStats: async () => {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur');
    return { data };
  },

  updateInscription: async (id, updates) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/inscriptions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Erreur mise à jour');
  }
};

export default adminService;