import api from './index';

export const authService = {
    login: async (credentials) => {
        const response = await api.post('/token/', credentials);
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/users/', userData, { skipAuth: true });
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/users/me/');
        return response.data;
    },

    // OTP Forgot Password functions
    sendOTP: async (email) => {
        const response = await api.post('/send-otp/', { email: email });
        return response.data;
    },

    verifyOTP: async (email, otp, newPassword = null) => {
        const data = { email: email, otp: otp };
        if (newPassword) {
            data.new_password = newPassword;
        }
        const response = await api.post('/verify-otp/', data);
        return response.data;
    },
};
