import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Link,
    Alert,
    Snackbar,
    IconButton,
    InputAdornment,
    FormControlLabel,
    CircularProgress,
    Paper
} from '@mui/material';
import { Visibility, VisibilityOff, Close } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import loginPanelImage from '../../assets/Start_Convert.png';
import { GoogleLogin } from "@react-oauth/google";
import { API_BASE_URL } from '../../api';
import { isNetworkConnectionError } from '../../api';
import { getGoogleAuthAvailability } from '../../config/googleAuth';

const GoogleGIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
            fill="#EA4335"
            d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.54-2.54C13.46.89 11.46 0 9 0 5.48 0 2.44 2.02.96 4.96l2.95 2.29C4.62 5.13 6.62 3.48 9 3.48z"
        />
        <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72l2.91 2.26c1.7-1.57 2.69-3.87 2.69-6.62z"
        />
        <path
            fill="#FBBC05"
            d="M3.91 10.75A5.41 5.41 0 0 1 3.6 9c0-.61.1-1.2.31-1.75L.96 4.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.95-2.29z"
        />
        <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.38 0-4.4-1.61-5.12-3.78L.93 12.93C2.4 15.96 5.44 18 9 18z"
        />
    </svg>
);

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const { user: authUser, setUser, login } = useAuth();
    const [error, setError] = useState('');
    const [popup, setPopup] = useState({ open: false, message: '', severity: 'info' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isOnline, setIsOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine
    );
    const googleAuth = getGoogleAuthAvailability({ isOnline });
    const loginAttempted = React.useRef(false);

    // Only redirect if user is already logged in on mount, or after a login attempt
    useEffect(() => {
        if (!authUser) return;
        const targetPath = (authUser.user_type === 'ADMIN' || authUser.user_type === 'STAFF') ? '/admin' : '/userlogin';
        navigate(targetPath, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser]);

    // Set base page colors for the login screen.
    useEffect(() => {
      document.body.style.setProperty('--bg', '#f4f4f7');
      document.body.style.setProperty('--text', '#181a20');
      document.body.style.setProperty('--toggle-bg', '#fff');
      document.body.style.background = '#f4f4f7';
      document.body.style.color = '#181a20';
    }, []);

    useEffect(() => {
        const registrationMessage = location.state?.registrationMessage;
        if (!registrationMessage) {
            return;
        }

        setPopup({
            open: true,
            severity: location.state?.registrationPending ? 'info' : 'success',
            message: registrationMessage,
        });
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        loginAttempted.current = true;

        try {
            await login(formData);
            // navigation handled by useEffect above once authUser is set
        } catch (err) {
            const rawMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.error ||
                err?.response?.data?.non_field_errors?.[0] ||
                err?.detail ||
                err?.error ||
                '';

            const isTimeoutError =
                err?.code === 'ECONNABORTED' ||
                /timeout/i.test(String(rawMessage));

            let message = rawMessage || 'Invalid username or password';

            if (isTimeoutError) {
                message = 'Login request timed out. Please retry in a few seconds.';
            } else if (isNetworkConnectionError(err)) {
                message = 'Unable to reach the server. Check your internet connection and try again.';
            }

            // Student registered but not yet approved by admin
            const isInactiveAccount =
                !message ||
                /no active account/i.test(message) ||
                /inactive/i.test(message) ||
                /disabled/i.test(message) ||
                /administrator/i.test(message) ||
                /get access/i.test(message) ||
                /no token/i.test(message) ||
                /pending/i.test(message) ||
                /approval/i.test(message) ||
                /not approved/i.test(message) ||
                /contact your/i.test(message);

            const friendlyMsg = isInactiveAccount
                ? 'Your account is pending admin approval. Please wait for an admin to approve your account before logging in.'
                : message;

            setError(friendlyMsg);
            setPopup({
                open: true,
                severity: isInactiveAccount ? 'info' : 'error',
                message: friendlyMsg,
            });
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In logic
    const handleGoogleResponse = useCallback(async (response) => {
        const token = response.credential;

        try {
            const res = await fetch(`${API_BASE_URL}/google/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: token }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.detail || data.error || "Google login failed");
                return;
            }

            // Store tokens
            localStorage.setItem("token", data.access);
            localStorage.setItem("refreshToken", data.refresh);

            const accessToken = data.access;

            const userRes = await fetch(`${API_BASE_URL}/users/me/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            
            if (!userRes.ok) {
                const userErr = await userRes.json().catch(() => ({}));
                alert(userErr.detail || userErr.error || "Failed to fetch user profile.");
                return;
            }
            
            const userData = await userRes.json();

            setUser(userData);

            if (userData.user_type === 'ADMIN' || userData.user_type === 'STAFF') {
                navigate('/admin');
            } else {
                navigate('/userlogin');
            }

        } catch (error) {
            console.error("Error during Google Sign-In:", error);
            alert("An error occurred during Google Sign-In.");
        }
    }, [navigate, setUser]);

    const handleGoogleError = useCallback(() => {
        setPopup({
            open: true,
            severity: 'error',
            message: 'Google login failed. Please try again.',
        });
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleGoogleButtonClick = () => {
        setPopup({
            open: true,
            severity: googleAuth.reason === 'origin_not_allowed' || googleAuth.reason === 'disabled' ? 'info' : 'warning',
            message: googleAuth.message,
        });
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                height: '100dvh',
                width: '100vw',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0,
                py: 0,
                overflow: 'hidden',
                m: 0,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: '100vw',
                    maxWidth: '100vw',
                    minWidth: '100vw',
                    height: '100dvh',
                    minHeight: '100dvh',
                    maxHeight: '100dvh',
                    borderRadius: 0,
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '51.22% 48.78%' },
                    background: 'transparent',
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: { xs: 'none', md: 'block' },
                        flexDirection: 'column',
                        p: 0,
                        backgroundImage: `url(${loginPanelImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: '#ffffff',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(28, 30, 83, 0.6)',
                        },
                    }}
                >
                    <Button
                        onClick={() => navigate('/')}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            color: '#ffffff',
                            bgcolor: 'rgba(240,240,240,0.30)',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            borderRadius: '999px',
                            px: 1.9,
                            py: 0.45,
                            minWidth: 'auto',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            zIndex: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
                        }}
                        startIcon={<Close sx={{ fontSize: 15, transform: 'rotate(45deg)' }} />}
                    >
                        Homepage
                    </Button>

                    <Box
                        sx={{
                            position: 'absolute',
                            left: '10%',
                            top: '32%',
                            zIndex: 1,
                            maxWidth: 520,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 600,
                                lineHeight: '64.7px',
                                mb: 2,
                                fontSize: { md: '42px' },
                                letterSpacing: '0.21px',
                            }}
                        >
                            One Step Closer to Your Dreams
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 600,
                                fontSize: '22px',
                                lineHeight: '28px',
                                letterSpacing: 0,
                                opacity: 0.95,
                                maxWidth: 500,
                            }}
                        >
                            You have a vision, we have the platform to bring it to life - fast
                        </Typography>
                    </Box>
                </Box>

                <Box
                    sx={{
                        background: '#1f1f63',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: { xs: 2.5, sm: 4, md: 5.5 },
                        py: { xs: 2, md: 3 },
                        position: 'relative',
                    }}
                >
                    <IconButton
                        sx={{ position: 'absolute', top: 14, right: 14, color: '#b9c0ff', display: { xs: 'inline-flex', md: 'none' } }}
                        onClick={() => navigate('/')}
                        size="large"
                    >
                        <Close />
                    </IconButton>

                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: { xs: 427, md: 404 },
                            maxHeight: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <Typography sx={{ fontWeight: 500, mb: 1, fontSize: '32px', fontFamily: '"Poppins", sans-serif' }}>
                            Welcome back!
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.95)', mb: 4.2, fontSize: '16px', fontWeight: 500 }}>
                            Enter your Credentials to access your account
                        </Typography>

                        {error && (
                            <Alert severity={/pending|approval|administrator|get access/i.test(error) ? 'info' : 'error'} sx={{ mb: 2, borderRadius: 1.5 }}>
                                {error}
                            </Alert>
                        )}

                        <Snackbar
                            open={popup.open}
                            autoHideDuration={popup.severity === 'info' ? 8000 : 4000}
                            onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        >
                            <Alert
                                onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
                                severity={popup.severity}
                                sx={{ width: '100%', borderRadius: 1.5 }}
                            >
                                {popup.message}
                            </Alert>
                        </Snackbar>

                        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                            <Typography sx={{ fontSize: '14px', mb: 0.8, color: '#ffffff', fontWeight: 500 }}>Username</Typography>
                            <TextField
                                name="username"
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={handleChange}
                                fullWidth
                                required
                                size="small"
                                autoComplete="username"
                                sx={{
                                    mb: 2.8,
                                    width: { xs: '100%', md: 404 },
                                    '& .MuiOutlinedInput-root': {
                                        height: 54,
                                        borderRadius: '10px',
                                        color: '#ffffff',
                                        bgcolor: 'transparent',
                                        '& fieldset': { borderColor: '#d9d9d9' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.8)' },
                                        '&.Mui-focused fieldset': { borderColor: '#ffffff' },
                                    },
                                    '& .MuiInputBase-input': {
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        backgroundColor: 'transparent !important',
                                        boxShadow: 'none !important',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                        backgroundColor: 'transparent !important',
                                    },
                                    '& .MuiInputBase-input::placeholder': { color: '#d9d9d9', opacity: 1 },
                                    '& .MuiInputBase-input:-webkit-autofill': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                        transition: 'background-color 9999s ease-out 0s',
                                    },
                                    '& .MuiInputBase-input:-webkit-autofill:hover': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                    },
                                    '& .MuiInputBase-input:-webkit-autofill:focus': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                    },
                                }}
                            />

                            <Typography sx={{ fontSize: '14px', mb: 0.8, color: '#ffffff', fontWeight: 500 }}>Password</Typography>
                            <TextField
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                fullWidth
                                required
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleClickShowPassword} edge="end" sx={{ color: '#d4d8ff', p: 0.7 }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 1.5,
                                    width: { xs: '100%', md: 404 },
                                    '& .MuiOutlinedInput-root': {
                                        height: 54,
                                        borderRadius: '10px',
                                        color: '#ffffff',
                                        bgcolor: 'transparent',
                                        '& fieldset': { borderColor: '#d9d9d9' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.8)' },
                                        '&.Mui-focused fieldset': { borderColor: '#ffffff' },
                                    },
                                    '& .MuiInputBase-input': {
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        backgroundColor: 'transparent !important',
                                        boxShadow: 'none !important',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                        backgroundColor: 'transparent !important',
                                    },
                                    '& .MuiInputBase-input::placeholder': { color: '#d9d9d9', opacity: 1 },
                                    '& .MuiInputAdornment-root': { mr: 0.2 },
                                    '& .MuiInputBase-input:-webkit-autofill': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                        transition: 'background-color 9999s ease-out 0s',
                                    },
                                    '& .MuiInputBase-input:-webkit-autofill:hover': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                    },
                                    '& .MuiInputBase-input:-webkit-autofill:focus': {
                                        WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                                        WebkitTextFillColor: '#ffffff',
                                    },
                                }}
                            />

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.6 }}>
                                <FormControlLabel
                                    control={
                                        <input
                                            type="checkbox"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                            style={{ marginRight: 6 }}
                                        />
                                    }
                                    label={<Typography sx={{ color: '#ffffff', fontSize: 14, fontWeight: 500 }}>Remember for 30 days</Typography>}
                                    sx={{ m: 0 }}
                                />
                                <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ color: '#fcd980', fontSize: 14, fontWeight: 500 }}>
                                    forgot password
                                </Link>
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    display: 'block',
                                    mx: 'auto',
                                    minWidth: 174,
                                    width: 174,
                                    height: 40,
                                    borderRadius: '5px',
                                    py: 0,
                                    fontWeight: 700,
                                    color: '#1d1f3f',
                                    background: '#fcd980',
                                    textTransform: 'none',
                                    fontSize: '19px',
                                    mb: 3.1,
                                    '&:hover': { background: '#e9cc67' },
                                }}
                            >
                                {loading ? <CircularProgress size={24} sx={{ color: '#1d1f3f' }} /> : 'Login'}
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                position: 'relative',
                                textAlign: 'center',
                                mb: 2.6,
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: '50%',
                                    left: 0,
                                    right: 0,
                                    borderTop: '1px solid rgba(255,255,255,0.32)',
                                },
                            }}
                        >
                            <Typography
                                sx={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    px: 1.5,
                                    fontSize: 16,
                                    color: 'rgba(255,255,255,0.95)',
                                    lineHeight: 1,
                                    background: '#1f1f63',
                                }}
                            >
                                or continue with
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                            {googleAuth.available ? (
                                <GoogleLogin
                                    onSuccess={handleGoogleResponse}
                                    onError={handleGoogleError}
                                    theme="outline"
                                    size="large"
                                    text="continue_with"
                                    shape="rectangular"
                                    width="260"
                                />
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleGoogleButtonClick}
                                    startIcon={<GoogleGIcon />}
                                    sx={{
                                        minWidth: 260,
                                        height: 40,
                                        background: '#ffffff',
                                        borderRadius: '8px',
                                        color: '#1f1f63',
                                        px: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&:hover': { background: '#f3f3f3' },
                                    }}
                                >
                                    Continue with Google
                                </Button>
                            )}
                        </Box>

                        <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                            Don't have an account?{' '}
                            <Link component={RouterLink} to="/register" underline="hover" sx={{ color: '#fcd980', fontWeight: 700 }}>
                                Sign Up
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default Login;
