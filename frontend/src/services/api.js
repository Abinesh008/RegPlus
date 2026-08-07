import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://regplus-1-o.onrender.com';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds
  withCredentials: true, // Crucial for receiving and sending HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
};

const handleRequest = async (promise) => {
  try {
    const response = await promise;
    return { data: response.data, headers: response.headers, error: null, suggestion: null, success: true };
  } catch (error) {
    console.error("API Client Error:", error);
    const responseData = error.response?.data;
    const message = responseData?.detail || error.message || "Network Error";
    const suggestion = responseData?.suggestion || (
      error.code === 'ECONNABORTED' 
        ? "The API request timed out. Gemini may be taking too long or your database may be locked. Please retry in a few seconds." 
        : "Check that your backend server is running and your network is connected, then try again."
    );
    return { data: null, error: message, suggestion: suggestion, success: false };
  }
};

export const api = {
  // 1. Health check
  healthCheck: () => handleRequest(client.get('/health')),

  // 2. List all circulars
  listCirculars: () => handleRequest(client.get('/circulars')),

  // 3. Upload circular PDF
  uploadCircular: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return handleRequest(
      client.post('/circulars/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  },

  // 4. Retrieve metadata for a circular
  getCircularMetadata: (id) => handleRequest(client.get(`/circulars/${id}`)),

  // 5. Retrieve extracted text for a circular
  getCircularText: (id) => handleRequest(client.get(`/circulars/${id}/text`)),

  // 6. Process sample circulars
  processSamples: () => handleRequest(client.post('/circulars/process-samples')),

  // 7. Extract obligations
  extractObligations: (id) => handleRequest(client.post(`/circulars/${id}/extract`)),

  // 8. Retrieve stored obligations
  getCircularObligations: (id) => handleRequest(client.get(`/circulars/${id}/obligations`)),

  // 9. Compare two circulars
  compareCirculars: (oldId, newId) => handleRequest(client.post('/diff', { old_circular_id: oldId, new_circular_id: newId })),

  // 10. Retrieve diff results
  getDiffDetail: (diffId) => handleRequest(client.get(`/diff/${diffId}`)),

  // 11. Run rule mapping engine
  runRuleMapping: (diffId) => handleRequest(client.post(`/diff/${diffId}/map`)),

  // 12. Retrieve rule mappings
  getRuleMappings: (diffId) => handleRequest(client.get(`/diff/${diffId}/mappings`)),

  // 13. Auth Endpoints
  login: (email, password) => handleRequest(client.post('/auth/login', { email, password })),
  logout: () => handleRequest(client.post('/auth/logout')),
  refresh: () => handleRequest(client.post('/auth/refresh')),
  changePassword: (old_password, new_password) => handleRequest(client.post('/auth/change-password', { old_password, new_password })),
  forgotPassword: (email) => handleRequest(client.post('/auth/forgot-password', { email })),
  getMe: () => handleRequest(client.get('/auth/me')),

  // 14. User Management Endpoints
  listUsers: (search, role) => handleRequest(client.get('/users', { params: { search, role } })),
  createUser: (userData) => handleRequest(client.post('/users', userData)),
  updateUser: (id, userData) => handleRequest(client.put(`/users/${id}`, userData)),
  deleteUser: (id) => handleRequest(client.delete(`/users/${id}`)),
  exportPDF: (diffId) => handleRequest(client.get(`/diff/${diffId}/export/pdf`, { responseType: 'blob' })),
  exportCSV: (diffId) => handleRequest(client.get(`/diff/${diffId}/export/csv`, { responseType: 'blob' }))
};

export default api;
