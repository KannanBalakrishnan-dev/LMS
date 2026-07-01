import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Link,
    Alert,
    Paper,
    Snackbar,
    CircularProgress,
    IconButton,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { Close, Visibility, VisibilityOff } from '@mui/icons-material';
import registerPageImage from '../../assets/Start_Convert_1.png';

const Register = ({ onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        firstName: '',
        lastName: '',
        user_type: 'STUDENT',
        mobile: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, message: '', severity: 'success' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register, setUser } = useAuth();
    const navigate = useNavigate();
    const postRegisterTimeoutRef = useRef(null);

    const formatRegistrationError = (err) => {
        const responseData = err?.response?.data || err;

        if (!responseData) {
            return 'Registration failed. Please try again.';
        }

        if (typeof responseData === 'string') {
            return responseData;
        }

        if (typeof responseData !== 'object') {
            return String(responseData);
        }

        const stringifyMessage = (message) => {
            if (typeof message === 'string') {
                return message;
            }
            if (Array.isArray(message)) {
                return message.map(stringifyMessage).join(', ');
            }
            if (message && typeof message === 'object') {
                return Object.values(message).map(stringifyMessage).join(', ');
            }
            return String(message);
        };

        const message = Object.entries(responseData)
            .flatMap(([field, value]) => {
                const messages = Array.isArray(value) ? value : [value];
                return messages.map((message) => {
                    const text = stringifyMessage(message);
                    if (field === 'non_field_errors' || field === 'detail' || field === 'error') {
                        return text;
                    }
                    return `${field.replace(/_/g, ' ')}: ${text}`;
                });
            })
            .join('. ');

        return message || 'Registration failed. Please check your details and try again.';
    };

    const validateForm = () => {
        const username = formData.username.trim();
        const email = formData.email.trim();
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const mobile = formData.mobile.trim();

        if (!firstName || !lastName || !username || !email || !mobile || !formData.password || !formData.password2) {
            return 'Please fill all required fields.';
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'Please enter a valid email address.';
        }

        if (!/^\d{10,15}$/.test(mobile)) {
            return 'Mobile number must contain 10 to 15 digits only.';
        }

        if (formData.password.length < 8) {
            return 'Password must be at least 8 characters long.';
        }

        if (formData.password !== formData.password2) {
            return 'Passwords do not match.';
        }

        return '';
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        return () => {
            if (postRegisterTimeoutRef.current) {
                clearTimeout(postRegisterTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const validationMessage = validateForm();
        if (validationMessage) {
            const message = validationMessage;
            setError(message);
            setLoading(false);
            setPopup({ open: true, message, severity: 'error' });
            return;
        }

        try {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            const registrationData = {
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password,
                password2: formData.password2,
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                user_type: formData.user_type,
                mobile: formData.mobile.trim(),
            };

            await register(registrationData);
            const successMessage = 'Registration successful! You can now log in.';

            setPopup({ open: true, message: successMessage, severity: 'success' });

            // If someone registers while an old session is still present, the app can
            // keep using the previous user's token and show their enrollment stats.
            // Clear auth tokens so the next view is always a fresh login.
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);

            postRegisterTimeoutRef.current = setTimeout(() => {
                if (onClose) {
                    onClose();
                }
                navigate('/login', {
                    replace: true,
                    state: {
                        registrationMessage: successMessage,
                        registrationPending: false,
                    },
                });
            }, 1400);
        } catch (err) {
            const message = formatRegistrationError(err);
            setError(message);
            setPopup({ open: true, message, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleTogglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword((prev) => !prev);
            return;
        }
        setShowConfirmPassword((prev) => !prev);
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

    const inputSx = {
        mb: 1.1,
        width: { xs: '100%', md: 512 },
        '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            background: 'transparent',
            color: '#fff',
            height: 54,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.30)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
            '&.Mui-focused fieldset': { borderColor: '#ffffff' },
        },
        '& .MuiInputBase-input': {
            fontSize: '12px',
            fontWeight: 500,
            py: 0,
            backgroundColor: 'transparent !important',
            boxShadow: 'none !important',
        },
        '& .MuiOutlinedInput-input': {
            backgroundColor: 'transparent !important',
        },
        '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.75)', opacity: 1 },
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
    };

    const passwordInputSx = {
        ...inputSx,
        '& .MuiInputAdornment-root': {
            mr: 0.25,
        },
        '& .MuiIconButton-root': {
            color: '#d4d8ff',
        },
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                height: '100dvh',
                width: '100vw',
                background: '#1f1f63',
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
                        p: 0,
                        color: '#fff',
                        backgroundImage: `linear-gradient(rgba(30, 34, 92, 0.65), rgba(30, 34, 92, 0.65)), url(${registerPageImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            left: '15%',
                            top: '32%',
                            maxWidth: 380,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 600,
                                lineHeight: 1.1,
                                mb: 1.8,
                                fontSize: { md: '48px' },
                            }}
                        >
                            One Step Closer to Your Dreams
                        </Typography>
                        <Typography sx={{ fontSize: '22px', lineHeight: 1.3, opacity: 0.95, fontWeight: 500 }}>
                            You have a vision, we have the platform to bring it to life - fast
                        </Typography>
                    </Box>
                </Box>

                <Box
                    sx={{
                        background: '#1f1f63',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        px: { xs: 2, sm: 3, md: 5.3 },
                        py: { xs: 1.6, md: 2.1 },
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

                    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: { xs: 420, md: 512 }, maxHeight: '100%', overflow: 'hidden' }}>
                        <Typography sx={{ fontWeight: 700, mb: 1.3, fontSize: '36px' }}>
                            Get Started Now
                        </Typography>

                        <Snackbar
                            open={popup.open}
                            autoHideDuration={3000}
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

                        {error && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                                {error}
                            </Alert>
                        )}

                        <TextField name="firstName" placeholder="First Name *" value={formData.firstName} onChange={handleChange} fullWidth required size="small" sx={inputSx} />
                        <TextField name="lastName" placeholder="Last Name *" value={formData.lastName} onChange={handleChange} fullWidth required size="small" sx={inputSx} />
                        <TextField name="username" placeholder="User Name *" value={formData.username} onChange={handleChange} fullWidth required size="small" sx={inputSx} />
                        <TextField name="email" placeholder="Email Address *" value={formData.email} onChange={handleChange} fullWidth required size="small" sx={inputSx} />
                        <TextField name="mobile" placeholder="Mobile No. *" type="tel" value={formData.mobile} onChange={handleChange} fullWidth required size="small" sx={inputSx} />
                        <FormControl fullWidth size="small" sx={{ ...inputSx, mb: 1.1 }}>
                            <Select
                                name="user_type"
                                value={formData.user_type}
                                onChange={handleChange}
                                displayEmpty
                                sx={{
                                    borderRadius: '10px',
                                    color: '#fff',
                                    height: 54,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.30)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.55)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
                                    '& .MuiSvgIcon-root': { color: '#fff' },
                                }}
                            >
                                <MenuItem value="STUDENT">Student</MenuItem>
                                <MenuItem value="ADMIN">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            name="password"
                            placeholder="Password *"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            fullWidth
                            required
                            size="small"
                            sx={passwordInputSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleTogglePasswordVisibility('password')}
                                            onMouseDown={handleMouseDownPassword}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            name="password2"
                            placeholder="Confirm Password *"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.password2}
                            onChange={handleChange}
                            fullWidth
                            required
                            size="small"
                            sx={passwordInputSx}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleTogglePasswordVisibility('password2')}
                                            onMouseDown={handleMouseDownPassword}
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                        >
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ display: 'flex', gap: 2, mt: 0.8, mb: 0.9, justifyContent: 'center' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    minWidth: 138,
                                    borderRadius: 1,
                                    py: 0.55,
                                    color: '#1d1f3f',
                                    background: '#f2d779',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': { background: '#e9cc67' },
                                }}
                            >
                                {loading ? <CircularProgress size={22} sx={{ color: '#1d1f3f' }} /> : 'Register'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/login')}
                                sx={{
                                    minWidth: 138,
                                    borderRadius: 1,
                                    py: 0.55,
                                    color: '#ffffff',
                                    borderColor: 'rgba(255,255,255,0.65)',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': {
                                        borderColor: '#ffffff',
                                        background: 'rgba(255,255,255,0.08)',
                                    },
                                }}
                            >
                                Cancel
                            </Button>
                        </Box>

                        <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                            Already have an account?{' '}
                            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: '#f2d779', fontWeight: 700 }}>
                                Login
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default Register;
