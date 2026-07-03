import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
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
  Divider,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import { Close, Visibility, VisibilityOff, Email as EmailIcon, ArrowBack } from "@mui/icons-material";
import registerPageImage from "../../assets/Start_Convert_1.png";

// ---- Backend config ----
// Adjust these two if your urls.py registers them under different paths/prefixes.
const API_BASE = "/api";
const SEND_OTP_URL = `${API_BASE}/send-otp/`;
const VERIFY_OTP_URL = `${API_BASE}/verify-otp/`;
const GOOGLE_LOGIN_URL = `${API_BASE}/google-login/`;

// Must match the client ID hardcoded in google_login() on the backend.
const GOOGLE_CLIENT_ID = "145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const Register = ({ onClose }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    mobile: "",
    user_type: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, setUser } = useAuth();
  const navigate = useNavigate();
  const postRegisterTimeoutRef = useRef(null);

  // ---- Continue with Email (OTP) flow state ----
  const [authMode, setAuthMode] = useState("form"); // "form" | "email-otp"
  const [otpStep, setOtpStep] = useState("enter-email"); // "enter-email" | "enter-otp" | "verified"
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef([]);
  const resendIntervalRef = useRef(null);

  // ---- Google Sign-In ----
  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const persistAuthAndRedirect = (data) => {
    // Backend returns { token, refresh, user }
    if (data.token) localStorage.setItem("access_token", data.token);
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
    setUser(data.user || null);

    postRegisterTimeoutRef.current = setTimeout(() => {
      if (onClose) onClose();
      navigate("/dashboard", { replace: true });
    }, 1000);
  };

  // ---- Load Google Identity Services script + render button ----
  useEffect(() => {
    if (window.google && window.google.accounts) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!googleReady || authMode !== "form" || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 240,
      text: "continue_with",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, authMode]);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    try {
      const res = await fetch(GOOGLE_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Google sign-in failed.");
      }
      // google_login() returns { access, refresh } (SimpleJWT default keys)
      if (data.access) localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
      setPopup({ open: true, message: "Signed in with Google!", severity: "success" });
      postRegisterTimeoutRef.current = setTimeout(() => {
        if (onClose) onClose();
        navigate("/dashboard", { replace: true });
      }, 800);
    } catch (err) {
      setPopup({ open: true, message: err.message || "Google sign-in failed.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(RESEND_SECONDS);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetOtpFlow = () => {
    setAuthMode("form");
    setOtpStep("enter-email");
    setOtpEmail("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setResendTimer(0);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
  };

  const handleSendOtp = async () => {
    setOtpError("");
    if (!isValidEmail(otpEmail)) {
      setOtpError("Please enter a valid email address.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(SEND_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Backend returns 'No user found with this email address' if not registered
        throw new Error(data?.error || "Could not send OTP. Please try again.");
      }

      setOtpStep("enter-otp");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      startResendTimer();
      setPopup({
        open: true,
        message: `We've sent a 6-digit code to ${otpEmail.trim()}`,
        severity: "success",
      });
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError(err.message || "Could not send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setOtpDigits(next);
    otpInputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    const code = otpDigits.join("");
    if (code.length !== OTP_LENGTH) {
      setOtpError(`Please enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail.trim(), otp: code }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Invalid or expired OTP. Please try again.");
      }

      setOtpStep("verified");
      setPopup({ open: true, message: "Login successful!", severity: "success" });
      persistAuthAndRedirect(data);
    } catch (err) {
      setOtpError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const formatRegistrationError = (err) => {
    const responseData = err?.response?.data || err;

    if (!responseData) {
      return "Registration failed. Please try again.";
    }

    if (typeof responseData === "string") {
      return responseData;
    }

    if (typeof responseData !== "object") {
      return String(responseData);
    }

    const stringifyMessage = (message) => {
      if (typeof message === "string") {
        return message;
      }
      if (Array.isArray(message)) {
        return message.map(stringifyMessage).join(", ");
      }
      if (message && typeof message === "object") {
        return Object.values(message).map(stringifyMessage).join(", ");
      }
      return String(message);
    };

    const message = Object.entries(responseData)
      .flatMap(([field, value]) => {
        const messages = Array.isArray(value) ? value : [value];
        return messages.map((message) => {
          const text = stringifyMessage(message);
          if (
            field === "non_field_errors" ||
            field === "detail" ||
            field === "error"
          ) {
            return text;
          }
          return `${field.replace(/_/g, " ")}: ${text}`;
        });
      })
      .join(". ");

    return (
      message || "Registration failed. Please check your details and try again."
    );
  };

  const validateForm = () => {
    const username = formData.username.trim();
    const email = formData.email.trim();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const mobile = formData.mobile.trim();

    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !mobile ||
      !formData.password ||
      !formData.password2
    ) {
      return "Please fill all required fields.";
    }

    if (!isValidEmail(email)) {
      return "Please enter a valid email address.";
    }

    if (!/^\d{10,15}$/.test(mobile)) {
      return "Mobile number must contain 10 to 15 digits only.";
    }

    if (formData.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (formData.password !== formData.password2) {
      return "Passwords do not match.";
    }

    return "";
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
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
    setError("");
    setLoading(true);

    const validationMessage = validateForm();
    if (validationMessage) {
      const message = validationMessage;
      setError(message);
      setLoading(false);
      setPopup({ open: true, message, severity: "error" });
      return;
    }

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

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
      const successMessage = "Registration successful! You can now log in.";

      setPopup({ open: true, message: successMessage, severity: "success" });

      // If someone registers while an old session is still present, the app can
      // keep using the previous user's token and show their enrollment stats.
      // Clear auth tokens so the next view is always a fresh login.
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);

      postRegisterTimeoutRef.current = setTimeout(() => {
        if (onClose) {
          onClose();
        }
        navigate("/login", {
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
      setPopup({ open: true, message, severity: "error" });
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
    if (field === "password") {
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
    width: { xs: "100%", md: 512 },
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      background: "transparent",
      color: "#fff",
      height: 54,
      "& fieldset": { borderColor: "rgba(255,255,255,0.30)" },
      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.55)" },
      "&.Mui-focused fieldset": { borderColor: "#ffffff" },
    },
    "& .MuiInputBase-input": {
      fontSize: "12px",
      fontWeight: 500,
      py: 0,
      backgroundColor: "transparent !important",
      boxShadow: "none !important",
    },
    "& .MuiOutlinedInput-input": {
      backgroundColor: "transparent !important",
    },
    "& .MuiInputBase-input::placeholder": {
      color: "rgba(255,255,255,0.75)",
      opacity: 1,
    },
    "& .MuiInputBase-input:-webkit-autofill": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
      WebkitTextFillColor: "#ffffff",
      transition: "background-color 9999s ease-out 0s",
    },
    "& .MuiInputBase-input:-webkit-autofill:hover": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
      WebkitTextFillColor: "#ffffff",
    },
    "& .MuiInputBase-input:-webkit-autofill:focus": {
      WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
      WebkitTextFillColor: "#ffffff",
    },
  };

  const passwordInputSx = {
    ...inputSx,
    "& .MuiInputAdornment-root": {
      mr: 0.25,
    },
    "& .MuiIconButton-root": {
      color: "#d4d8ff",
    },
  };

  const socialButtonSx = {
    flex: 1,
    minWidth: 0,
    borderRadius: "10px",
    py: 1,
    color: "#fff",
    borderColor: "rgba(255,255,255,0.30)",
    textTransform: "none",
    fontWeight: 600,
    fontSize: 13,
    gap: 1,
    "&:hover": {
      borderColor: "#ffffff",
      background: "rgba(255,255,255,0.08)",
    },
  };

  const otpBoxSx = {
    width: 44,
    height: 52,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.30)",
    borderRadius: "10px",
    outline: "none",
  };

  // ---- Continue with Email (OTP) panel ----
  const renderEmailOtpPanel = () => (
    <Box sx={{ width: "100%", maxWidth: { xs: 420, md: 512 } }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2.5 }}>
        <IconButton
          onClick={resetOtpFlow}
          sx={{ color: "#b9c0ff", mr: 1 }}
          size="small"
          aria-label="Back"
        >
          <ArrowBack fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 700, fontSize: "28px" }}>
          {otpStep === "verified" ? "You're in!" : "Continue with Email"}
        </Typography>
      </Box>

      {otpError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
          {otpError}
        </Alert>
      )}

      {otpStep === "enter-email" && (
        <>
          <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 13, mb: 1.5 }}>
            Enter your email address and we'll send you a one-time code.
            (Your account must already be registered.)
          </Typography>
          <TextField
            name="otpEmail"
            type="email"
            placeholder="Email Address *"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
            fullWidth
            required
            size="small"
            sx={inputSx}
            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
          />
          <Button
            fullWidth
            variant="contained"
            disabled={otpLoading}
            onClick={handleSendOtp}
            sx={{
              mt: 1,
              borderRadius: 1,
              py: 1,
              color: "#1d1f3f",
              background: "#f2d779",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { background: "#e9cc67" },
            }}
          >
            {otpLoading ? (
              <CircularProgress size={22} sx={{ color: "#1d1f3f" }} />
            ) : (
              "Send OTP"
            )}
          </Button>
        </>
      )}

      {otpStep === "enter-otp" && (
        <>
          <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 13, mb: 2 }}>
            Enter the {OTP_LENGTH}-digit code sent to <b>{otpEmail.trim()}</b>
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }} onPaste={handleOtpPaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpInputRefs.current[i] = el)}
                value={digit}
                onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                maxLength={1}
                inputMode="numeric"
                style={otpBoxSx}
              />
            ))}
          </Box>
          <Button
            fullWidth
            variant="contained"
            disabled={otpLoading}
            onClick={handleVerifyOtp}
            sx={{
              borderRadius: 1,
              py: 1,
              color: "#1d1f3f",
              background: "#f2d779",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { background: "#e9cc67" },
            }}
          >
            {otpLoading ? (
              <CircularProgress size={22} sx={{ color: "#1d1f3f" }} />
            ) : (
              "Verify OTP & Login"
            )}
          </Button>

          <Box sx={{ textAlign: "center", mt: 1.5 }}>
            {resendTimer > 0 ? (
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5 }}>
                Resend code in {resendTimer}s
              </Typography>
            ) : (
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={handleSendOtp}
                sx={{ color: "#f2d779", fontWeight: 600, fontSize: 12.5 }}
              >
                Resend OTP
              </Link>
            )}
          </Box>
        </>
      )}

      {otpStep === "verified" && (
        <Alert severity="success" sx={{ borderRadius: 1.5 }}>
          OTP verified — login successful! Redirecting...
        </Alert>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100vw",
        background: "#1f1f63",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 0,
        py: 0,
        overflow: "hidden",
        m: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100vw",
          maxWidth: "100vw",
          minWidth: "100vw",
          height: "100dvh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
          borderRadius: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "51.22% 48.78%" },
          background: "transparent",
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: { xs: "none", md: "block" },
            p: 0,
            color: "#fff",
            backgroundImage: `linear-gradient(rgba(30, 34, 92, 0.65), rgba(30, 34, 92, 0.65)), url(${registerPageImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: "15%",
              top: "32%",
              maxWidth: 380,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 600,
                lineHeight: 1.1,
                mb: 1.8,
                fontSize: { md: "48px" },
              }}
            >
              One Step Closer to Your Dreams
            </Typography>
            <Typography
              sx={{
                fontSize: "22px",
                lineHeight: 1.3,
                opacity: 0.95,
                fontWeight: 500,
              }}
            >
              You have a vision, we have the platform to bring it to life - fast
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            background: "#1f1f63",
            color: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            px: { xs: 2, sm: 3, md: 5.3 },
            py: { xs: 1.6, md: 2.1 },
            position: "relative",
          }}
        >
          <IconButton
            sx={{
              position: "absolute",
              top: 14,
              right: 14,
              color: "#b9c0ff",
              display: { xs: "inline-flex", md: "none" },
            }}
            onClick={() => navigate("/")}
            size="large"
          >
            <Close />
          </IconButton>

          <Snackbar
            open={popup.open}
            autoHideDuration={3000}
            onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
              severity={popup.severity}
              sx={{ width: "100%", borderRadius: 1.5 }}
            >
              {popup.message}
            </Alert>
          </Snackbar>

          {authMode === "email-otp" ? (
            renderEmailOtpPanel()
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                width: "100%",
                maxWidth: { xs: 420, md: 512 },
                maxHeight: "100%",
                overflow: "hidden",
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1.3, fontSize: "36px" }}>
                Get Started Now
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
                  {error}
                </Alert>
              )}

              <TextField
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={handleChange}
                fullWidth
                required
                size="small"
                sx={inputSx}
              />

              <TextField
                name="lastName"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={handleChange}
                fullWidth
                required
                size="small"
                sx={inputSx}
              />

              <TextField
                name="username"
                placeholder="Username *"
                value={formData.username}
                onChange={handleChange}
                fullWidth
                required
                size="small"
                sx={inputSx}
              />

              <TextField
                name="email"
                type="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                size="small"
                sx={inputSx}
              />

              <TextField
                name="mobile"
                type="tel"
                placeholder="Mobile Number *"
                value={formData.mobile}
                onChange={handleChange}
                fullWidth
                required
                size="small"
                inputProps={{
                  maxLength: 10,
                  pattern: "[0-9]{10}",
                }}
                sx={inputSx}
              />

              <FormControl fullWidth size="small" sx={{ ...inputSx, mb: 1.1 }}>
                <Select
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleChange}
                  displayEmpty
                  sx={{
                    borderRadius: "10px",
                    color: "#fff",
                    height: 54,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.30)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.55)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#ffffff",
                    },
                    "& .MuiSvgIcon-root": {
                      color: "#fff",
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select Role *
                  </MenuItem>

                  <MenuItem value="STUDENT">Student</MenuItem>
                  <MenuItem value="STAFF">Staff</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>

              <TextField
                name="password"
                placeholder="Password *"
                type={showPassword ? "text" : "password"}
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
                        onClick={() => handleTogglePasswordVisibility("password")}
                        onMouseDown={handleMouseDownPassword}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
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
                type={showConfirmPassword ? "text" : "password"}
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
                        onClick={() =>
                          handleTogglePasswordVisibility("password2")
                        }
                        onMouseDown={handleMouseDownPassword}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 0.8,
                  mb: 0.9,
                  justifyContent: "center",
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    minWidth: 138,
                    borderRadius: 1,
                    py: 0.55,
                    color: "#1d1f3f",
                    background: "#f2d779",
                    textTransform: "none",
                    fontWeight: 700,
                    "&:hover": { background: "#e9cc67" },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} sx={{ color: "#1d1f3f" }} />
                  ) : (
                    "Register"
                  )}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/login")}
                  sx={{
                    minWidth: 138,
                    borderRadius: 1,
                    py: 0.55,
                    color: "#ffffff",
                    borderColor: "rgba(255,255,255,0.65)",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "#ffffff",
                      background: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  Cancel
                </Button>
              </Box>

              <Divider
                sx={{
                  my: 1.4,
                  "&::before, &::after": { borderColor: "rgba(255,255,255,0.25)" },
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                }}
              >
                OR CONTINUE WITH
              </Divider>

              <Box sx={{ display: "flex", gap: 1.5, mb: 1.6, alignItems: "center" }}>
                {/* Real Google Identity Services button renders here */}
                <Box ref={googleButtonRef} sx={{ flex: 1, display: "flex", justifyContent: "center" }} />

                <Button
                  variant="outlined"
                  sx={socialButtonSx}
                  onClick={() => {
                    setAuthMode("email-otp");
                    setOtpStep("enter-email");
                    setOtpEmail(formData.email);
                  }}
                >
                  <EmailIcon fontSize="small" />
                  Email
                </Button>
              </Box>

              <Typography
                sx={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 13,
                }}
              >
                Already have an account?{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  underline="hover"
                  sx={{ color: "#f2d779", fontWeight: 700 }}
                >
                  Login
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;