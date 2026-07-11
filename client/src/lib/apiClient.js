import axios from 'axios';

const isDev = import.meta.env.DEV;
export const API_BASE_URL = import.meta.env.VITE_API_URL || (isDev ? "http://localhost:5000/api" : "/api");

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
    // Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/signin';
      }
    }

    // Handle 503 Maintenance Mode
    if (error.response && error.response.status === 503 && error.response.data?.error === 'MAINTENANCE_MODE') {
      // Prevent redirect loop
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
