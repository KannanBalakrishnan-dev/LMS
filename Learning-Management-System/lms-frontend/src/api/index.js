import axios from 'axios';

// In index.js, change the API_BASE_URL:
const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === 'development'
        ? 'http://localhost:8000/api' // Local development
        : 'https://learning-management-system-4i6f.onrender.com/api'); // Production

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    maxContentLength: 20 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
});

const isTransientNetworkError = (error) => {
    const code = error?.code;
    const message = String(error?.message || '');
    return (
        code === 'ERR_NETWORK' ||
        message.includes('ERR_NETWORK_CHANGED') ||
        message.toLowerCase().includes('network error')
    );
};

const isNetworkConnectionError = (error) => isTransientNetworkError(error);

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && !config.skipAuth) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Let the browser set the correct Content-Type for FormData requests
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            originalRequest &&
            !originalRequest._networkRetry &&
            String(originalRequest.method || 'get').toLowerCase() === 'get' &&
            isTransientNetworkError(error)
        ) {
            originalRequest._networkRetry = true;
            await new Promise((resolve) => setTimeout(resolve, 500));
            return api(originalRequest);
        }

        if (error.response?.status === 401 && originalRequest && !originalRequest.skipAuth && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
                    refresh: refreshToken
                });

                if (response.data.access) {
                    localStorage.setItem('token', response.data.access);
                    originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL, isNetworkConnectionError };
