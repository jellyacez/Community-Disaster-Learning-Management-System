import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to dynamically attach any required headers
apiClient.interceptors.request.use(
  (config) => {
    // Better-auth automatically manages cookie sessions, but if you need to attach tokens manually later:
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle 401 Unauthorized globally here if desired
    return Promise.reject(error);
  }
);

export default apiClient;
