import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds since Gemini API requests can take time
  headers: {
    'Content-Type': 'application/json',
  },
});

const handleRequest = async (promise) => {
  try {
    const response = await promise;
    return { data: response.data, error: null, suggestion: null, success: true };
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

  // 7. Extract obligations (invokes Gemini/Mock workflow)
  extractObligations: (id) => handleRequest(client.post(`/circulars/${id}/extract`)),

  // 8. Retrieve stored obligations (no Gemini call)
  getCircularObligations: (id) => handleRequest(client.get(`/circulars/${id}/obligations`)),

  // 9. Compare two circulars (diff engine)
  compareCirculars: (oldId, newId) => handleRequest(client.post('/diff', { old_circular_id: oldId, new_circular_id: newId })),

  // 10. Retrieve diff results
  getDiffDetail: (diffId) => handleRequest(client.get(`/diff/${diffId}`)),

  // 11. Run rule mapping engine for a diff session
  runRuleMapping: (diffId) => handleRequest(client.post(`/diff/${diffId}/map`)),

  // 12. Retrieve rule mappings for a diff session
  getRuleMappings: (diffId) => handleRequest(client.get(`/diff/${diffId}/mappings`)),
};

export default api;
