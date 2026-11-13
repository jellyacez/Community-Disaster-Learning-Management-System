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

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config?.offlineSync) {
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/signin';
      }
    }

    // 503 maintenance: hand off to the router via an event instead of window.location.href, which breaks React
    if (error.response && error.response.status === 503 && error.response.data?.error === 'MAINTENANCE_MODE') {
      window.dispatchEvent(new CustomEvent('system:maintenance'));
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.request.use((config) => {
  const superBarangayScope = localStorage.getItem("super_admin_barangay_scope");
  if (superBarangayScope) {
    config.headers["x-barangay-scope"] = superBarangayScope;
  }
  return config;
});


apiClient.interceptors.request.use((config) => {
  config.headers["Cache-Control"] = "no-cache";
  config.headers["Pragma"] = "no-cache";
  return config;
});

export default apiClient;
