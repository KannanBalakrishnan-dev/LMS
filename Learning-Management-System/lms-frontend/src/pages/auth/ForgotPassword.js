import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper
} from '@mui/material';
import { 
    Email, 
    Shield, 
    ArrowBack, 
    CheckCircle, 
    Visibility, 
    VisibilityOff,
    Close,
    AccountCircle
} from '@mui/icons-material';
import { authService } from '../../api/auth';

const ForgotPasswordForm = () => {
    const [step, setStep] = useState(1); // 1: email input, 2: OTP verification, 3: new password, 4: success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    const navigate = useNavigate();

    // Timer for resend OTP
    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(timer => timer - 1);
            }, 1000);
        } else if (timer === 0 && step === 2) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer, step]);

    const validateEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    const handleSendOTP = async () => {
        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.sendOTP(email);
            setStep(2);
            setTimer(60); // 60 seconds timer
            setCanResend(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        
        const newOTP = [...otp];
        newOTP[index] = value;
        setOtp(newOTP);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleVerifyOTP = async () => {
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.verifyOTP(email, otpValue);
            setStep(3); // Move to password reset step
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!validatePassword(newPassword)) {
            setError('Password must be at least 8 characters with uppercase, lowercase, and number');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const otpValue = otp.join('');
            const response = await authService.verifyOTP(email, otpValue, newPassword);

            // Store tokens
            if (response.token) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('refreshToken', response.refresh);
            }
            
            setStep(4);
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setCanResend(false);
        setTimer(60);
        setOtp(['', '', '', '', '', '']);
        await handleSendOTP();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStepIcon = () => {
        switch (step) {
            case 1:
                return <Email sx={{ fontSize: 32, color: '#fff' }} />;
            case 2:
                return <Shield sx={{ fontSize: 32, color: '#fff' }} />;
            case 3:
                return <Shield sx={{ fontSize: 32, color: '#fff' }} />;
            case 4:
                return <CheckCircle sx={{ fontSize: 32, color: '#fff' }} />;
            default:
                return <Email sx={{ fontSize: 32, color: '#fff' }} />;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1:
                return 'Forgot Password';
            case 2:
                return 'Verify OTP';
            case 3:
                return 'Reset Password';
            case 4:
                return 'Password Reset Successful';
            default:
                return 'Forgot Password';
        }
    };

    const getStepDescription = () => {
        switch (step) {
            case 1:
                return 'Enter your email address to receive OTP';
            case 2:
                return `OTP sent to ${email}`;
            case 3:
                return 'Enter your new password';
            case 4:
                return 'Redirecting to dashboard...';
            default:
                return 'Enter your email address to receive OTP';
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
                p: 2,
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 370,
                    borderRadius: 4,
                    p: 4,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <IconButton
                    sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', zIndex: 2 }}
                    onClick={() => navigate('/login')}
                    size="large"
                >
                    <Close />
                </IconButton>

                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 3, width: '100%' }}>
                    <Box
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.1)',
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2
                        }}
                    >
                        {getStepIcon()}
                    </Box>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, mb: 1 }}>
                        {getStepTitle()}
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: 14, opacity: 0.8 }}>
                        {getStepDescription()}
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2, width: '100%' }}>
                        {error}
                    </Alert>
                )}

                {/* Step 1: Email Input */}
                {step === 1 && (
                    <Box sx={{ width: '100%' }}>
                        <TextField
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            fullWidth
                            required
                            margin="normal"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email sx={{ color: '#fff' }} />
                                    </InputAdornment>
                                ),
                                style: { color: '#fff' },
                            }}
                            InputLabelProps={{
                                style: { color: '#fff' },
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: '#fff' },
                                    '&:hover fieldset': { borderColor: '#fff' },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                input: { color: '#fff' },
                                label: { color: '#fff' },
                            }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSendOTP}
                            disabled={loading || !validateEmail(email)}
                            sx={{
                                py: 1.2,
                                borderRadius: 2,
                                background: 'linear-gradient(90deg, #7f53ac 0%, #647dee 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 16px rgba(100, 125, 222, 0.18)',
                                mt: 2,
                                mb: 1.5,
                                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #647dee 0%, #7f53ac 100%)',
                                    boxShadow: '0 8px 32px rgba(100, 125, 222, 0.28)',
                                    transform: 'scale(1.03)',
                                },
                                '&:disabled': {
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'rgba(255,255,255,0.5)',
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Send OTP'}
                        </Button>
                    </Box>
                )}

                {/* Step 2: OTP Verification */}
                {step === 2 && (
                    <Box sx={{ width: '100%' }}>
                        <Typography sx={{ color: '#fff', textAlign: 'center', mb: 3, fontSize: 14 }}>
                            Enter 6-digit OTP sent to your email
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                            {otp.map((digit, index) => (
                                <TextField
                                    key={index}
                                    id={`otp-${index}`}
                                    value={digit}
                                    onChange={(e) => handleOTPChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    inputProps={{
                                        maxLength: 1,
                                        style: { 
                                            textAlign: 'center', 
                                            fontSize: '1.2rem',
                                            color: '#fff'
                                        }
                                    }}
                                    sx={{
                                        width: 50,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            background: 'rgba(255,255,255,0.08)',
                                            color: '#fff',
                                            '& fieldset': { borderColor: '#fff' },
                                            '&:hover fieldset': { borderColor: '#fff' },
                                            '&.Mui-focused fieldset': { borderColor: '#fff' },
                                        },
                                        input: { color: '#fff' },
                                    }}
                                />
                            ))}
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.join('').length !== 6}
                            sx={{
                                py: 1.2,
                                borderRadius: 2,
                                background: 'linear-gradient(90deg, #7f53ac 0%, #647dee 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 16px rgba(100, 125, 222, 0.18)',
                                mt: 1,
                                mb: 2,
                                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #647dee 0%, #7f53ac 100%)',
                                    boxShadow: '0 8px 32px rgba(100, 125, 222, 0.28)',
                                    transform: 'scale(1.03)',
                                },
                                '&:disabled': {
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'rgba(255,255,255,0.5)',
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Verify OTP'}
                        </Button>

                        <Box sx={{ textAlign: 'center', space: 1 }}>
                            {timer > 0 ? (
                                <Typography sx={{ color: '#fff', fontSize: 14, opacity: 0.8 }}>
                                    Resend OTP in {formatTime(timer)}
                                </Typography>
                            ) : (
                                <Button
                                    onClick={handleResendOTP}
                                    disabled={!canResend}
                                    variant="text"
                                    size="small"
                                    sx={{ color: '#fff', fontSize: 14, opacity: canResend ? 1 : 0.5 }}
                                >
                                    Resend OTP
                                </Button>
                            )}
                            
                            <Box sx={{ mt: 1 }}>
                                <Button
                                    onClick={() => setStep(1)}
                                    variant="text"
                                    size="small"
                                    startIcon={<ArrowBack />}
                                    sx={{ color: '#fff', fontSize: 14, opacity: 0.8 }}
                                >
                                    Change Email Address
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <Box sx={{ width: '100%' }}>
                        <TextField
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            fullWidth
                            required
                            margin="normal"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountCircle sx={{ color: '#fff' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff sx={{ color: '#fff' }} /> : <Visibility sx={{ color: '#fff' }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                style: { color: '#fff' },
                            }}
                            InputLabelProps={{
                                style: { color: '#fff' },
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: '#fff' },
                                    '&:hover fieldset': { borderColor: '#fff' },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                input: { color: '#fff' },
                                label: { color: '#fff' },
                            }}
                        />

                        <TextField
                            label="Confirm Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            fullWidth
                            required
                            margin="normal"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountCircle sx={{ color: '#fff' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                            {showConfirmPassword ? <VisibilityOff sx={{ color: '#fff' }} /> : <Visibility sx={{ color: '#fff' }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                style: { color: '#fff' },
                            }}
                            InputLabelProps={{
                                style: { color: '#fff' },
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: '#fff' },
                                    '&:hover fieldset': { borderColor: '#fff' },
                                    '&.Mui-focused fieldset': { borderColor: '#fff' },
                                },
                                input: { color: '#fff' },
                                label: { color: '#fff' },
                            }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleResetPassword}
                            disabled={loading || !newPassword || !confirmPassword}
                            sx={{
                                py: 1.2,
                                borderRadius: 2,
                                background: 'linear-gradient(90deg, #7f53ac 0%, #647dee 100%)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 16px rgba(100, 125, 222, 0.18)',
                                mt: 2,
                                mb: 1.5,
                                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #647dee 0%, #7f53ac 100%)',
                                    boxShadow: '0 8px 32px rgba(100, 125, 222, 0.28)',
                                    transform: 'scale(1.03)',
                                },
                                '&:disabled': {
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'rgba(255,255,255,0.5)',
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Reset Password'}
                        </Button>
                    </Box>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                        <Box
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%',
                                width: 80,
                                height: 80,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2
                            }}
                        >
                            <CheckCircle sx={{ fontSize: 40, color: '#fff' }} />
                        </Box>
                        <Typography sx={{ color: '#fff', fontSize: 14, opacity: 0.8, mb: 2 }}>
                            Password reset successful! You will be redirected to the dashboard shortly.
                        </Typography>
                        <CircularProgress size={24} sx={{ color: '#fff' }} />
                    </Box>
                )}
            </Paper>

            {/* Back to Login Card */}
            <Paper
                elevation={6}
                sx={{
                    width: '100%',
                    maxWidth: 370,
                    borderRadius: 4,
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography sx={{ color: '#fff', mb: 1, fontSize: 15 }}>
                    Remember your password?
                </Typography>
                <Button
                    component={RouterLink}
                    to="/login"
                    variant="contained"
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #7f53ac 0%, #647dee 100%)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '1rem',
                        boxShadow: '0 2px 8px rgba(100, 125, 222, 0.10)',
                        mt: 1,
                        '&:hover': {
                            background: 'linear-gradient(90deg, #647dee 0%, #7f53ac 100%)',
                            boxShadow: '0 4px 16px rgba(100, 125, 222, 0.18)',
                            transform: 'scale(1.03)',
                        },
                    }}
                >
                    BACK TO LOGIN
                </Button>
            </Paper>
        </Box>
    );
};

export default ForgotPasswordForm; 
