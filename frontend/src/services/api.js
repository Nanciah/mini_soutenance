import axios from 'axios';

// URL de l'API : en ligne sur Render, en local sur localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mini-soutenance.onrender.com/api';

// Configuration axios
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour déconnexion auto en cas de 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Services
export const etablissementService = {
  login: (credentials) => api.post('/etablissements/login', credentials),
};

export const adminService = {
  login: (credentials) => api.post('/admin/login', credentials),
  getInscriptions: (params) => api.get('/admin/inscriptions', { params }),
  updateInscription: (id, data) => api.put(`/admin/inscriptions/${id}`, data),
  getStats: () => api.get('/admin/stats'),
};

export const inscriptionService = {
  create: (data) => api.post('/inscriptions', data),
  getEtablissementInscriptions: () => api.get('/etablissement/inscriptions'),
};

export const examenService = {
  getExamens: () => api.get('/examens'),
};

export default api;
