import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../api/auth';
import api from '../api';
import { jwtDecode } from 'jwt-decode'; // Updated import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const getCurrentUserWithTimeout = async (timeoutMs = 6000) => {
        return Promise.race([
            authService.getCurrentUser(),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Auth initialization timeout')), timeoutMs);
            }),
        ]);
    };

    const refreshAccessToken = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            return null;
        }

        const response = await api.post('/token/refresh/', { refresh: refreshToken }, { skipAuth: true });
        const accessToken = response.data?.access;
        if (!accessToken) {
            return null;
        }

        localStorage.setItem('token', accessToken);
        return accessToken;
    };

    useEffect(() => {
        const initializeAuth = async () => {
            let token = localStorage.getItem('token');
            const refreshToken = localStorage.getItem('refreshToken');

            if (token || refreshToken) {
                try {
                    if (token) {
                        const decodedToken = jwtDecode(token); // Updated usage
                        if (decodedToken.exp * 1000 <= Date.now()) {
                            token = await refreshAccessToken();
                        }
                    } else {
                        token = await refreshAccessToken();
                    }

                    if (token) {
                        const userData = await getCurrentUserWithTimeout();
                        setUser(userData);
                    } else {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                    }
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    useEffect(() => {
        const checkEnrollmentLimitAfterLogin = async () => {
            if (!user || user.user_type !== 'STUDENT') {
                return;
            }

            const popupKey = `enrollment_limit_popup_shown_${user.id}`;
            if (sessionStorage.getItem(popupKey) === '1') {
                return;
            }

            try {
                const response = await api.get('/enrollments/');
                const activeEnrollments = (response.data || []).filter((enrollment) => {
                    const progress = enrollment?.progress;
                    return progress !== 'COMPLETED';
                });

                if (activeEnrollments.length > 2) {
                    alert('You are enrolled in more than 2 active courses. Please complete your current courses before enrolling in new ones.');
                }

                sessionStorage.setItem(popupKey, '1');
            } catch (error) {
                console.error('Failed to check enrollment limit on login:', error);
            }
        };

        checkEnrollmentLimitAfterLogin();
    }, [user]);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        localStorage.setItem('token', response.access);
        localStorage.setItem('refreshToken', response.refresh);
        const userData = await authService.getCurrentUser();
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        return response;
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#0f172a',
                    background: '#f8fafc',
                    fontWeight: 600,
                    fontFamily: 'Poppins, Segoe UI, sans-serif',
                }}
            >
                Loading application...
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user,setUser, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
