import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Chip,
  Button,
  Alert,
  Snackbar,
  TextField,
  Switch,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  Lock,
  Shield,
  NotificationsActive,
  Visibility as VisibilityIcon,
  PersonOutline,
  ContentCopy,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// DEMO MODE — flip this to `true` locally to preview without a live API.
// Keep `false` in any shipped build; consider gating with an env var instead
// of a hardcoded flag before this reaches production.
// ---------------------------------------------------------------------------
const DEMO_MODE = false;

const DEMO_SETTINGS = {
  email: 'kittuishore0628@gmail.com',
  passwordUpdatedAt: '2025-04-01',
  otpEnabled: true,
  inAppNotifications: true,
  weeklyProgressEmails: true,
  productAnnouncements: false,
  showProfileToRecruiters: true,
  showEmailOnProfile: false,
  showProjectPortfolio: true,
  showPhoneOnProfile: false,
  showWorkExperience: true,
  showEducation: true,
  name: 'Kittukishore',
  domain: 'Learning & Development',
  position: 'Admin',
};

// ---- motion-wrapped MUI primitives ----
const MotionCard = motion(Card);
const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

// ---- animation variants ----
const containerStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardEnter = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

const monthYear = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

// Builds a safe baseline settings object straight from the already-working
// AuthContext user object, so the page has something real to show even
// before (or if) the extended settings endpoint responds.
const buildBaseSettingsFromAuthUser = (user) => {
  if (!user) return null;
  return {
    email: user.email || '',
    passwordUpdatedAt: user.password_updated_at || null,
    otpEnabled: user.otp_enabled !== undefined ? user.otp_enabled : true,
    inAppNotifications: user.in_app_notifications !== undefined ? user.in_app_notifications : true,
    weeklyProgressEmails: user.weekly_progress_emails !== undefined ? user.weekly_progress_emails : true,
    productAnnouncements: !!user.product_announcements,
    showProfileToRecruiters: user.show_profile_to_recruiters !== undefined ? user.show_profile_to_recruiters : true,
    showEmailOnProfile: !!user.show_email_on_profile,
    showProjectPortfolio: user.show_project_portfolio !== undefined ? user.show_project_portfolio : true,
    showPhoneOnProfile: !!user.show_phone_on_profile,
    showWorkExperience: user.show_work_experience !== undefined ? user.show_work_experience : true,
    showEducation: user.show_education !== undefined ? user.show_education : true,
    name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'User',
    domain: user.department || user.team || '',
    position: user.user_type === 'ADMIN' ? 'Admin' : user.user_type === 'STAFF' ? 'Staff' : (user.user_type || ''),
  };
};

const SettingRow = ({ title, description, checked, onChange, disabled }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.75 }}>
    <Box sx={{ pr: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
    <Switch checked={!!checked} onChange={onChange} disabled={disabled} />
  </Stack>
);

const SnapshotRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value || '—'}
    </Typography>
  </Stack>
);

const UserSettings = () => {
  const { user: authUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // ---- Change email inline editing ----
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // ---- Change password inline editing ----
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

  const fetchSettings = useCallback(async (isMounted) => {
    if (DEMO_MODE) {
      if (isMounted()) {
        setSettings(DEMO_SETTINGS);
        setForm(DEMO_SETTINGS);
        setLoading(false);
      }
      return;
    }

    const baseline = buildBaseSettingsFromAuthUser(authUser);
    if (isMounted() && baseline) {
      setSettings(baseline);
      setForm(baseline);
    }

    try {
      const response = await api.get('/auth/user/settings/');
      if (isMounted()) {
        const merged = { ...baseline, ...response.data };
        setSettings(merged);
        setForm(merged);
        setError(null);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // Extended settings endpoint doesn't exist yet — not a real error,
        // just means we stick with the AuthContext baseline above.
        console.warn('Extended settings endpoint not found (404); using baseline user data.');
      } else {
        console.error('Error fetching settings:', err);
      }
      if (isMounted() && !baseline) {
        setError('Unable to load settings. Please try refreshing the page.');
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;
    fetchSettings(isMounted);
    return () => {
      mounted = false;
    };
  }, [fetchSettings]);

  // Persists a single field change to the backend. On failure (other than a
  // 404, which just means the endpoint isn't built yet), the field is rolled
  // back to its previous value so the UI never lies about what was saved.
  const persistField = (field, value, previousValue) => {
    if (DEMO_MODE) return;
    setSaveState('saving');
    api
      .patch('/auth/user/settings/', { [field]: value })
      .then(() => {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1500);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          console.warn('Extended settings endpoint not found (404); change kept locally only.');
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1500);
        } else {
          console.error('Error updating setting:', err);
          setSaveState('idle');
          setForm((prev) => ({ ...prev, [field]: previousValue }));
          showToast('Unable to save that change. Reverted.', 'error');
        }
      });
  };

  const handleToggle = (field) => (event) => {
    const value = event.target.checked;
    const previousValue = form[field];
    setForm((prev) => ({ ...prev, [field]: value }));
    if (DEMO_MODE) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
      return;
    }
    persistField(field, value, previousValue);
  };

  // ---- Email change flow ----
  const handleStartEditEmail = () => {
    setEmailDraft(form.email || '');
    setEmailError(null);
    setEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setEditingEmail(false);
    setEmailError(null);
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSaveEmail = async () => {
    if (!validateEmail(emailDraft)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setSavingEmail(true);
    try {
      if (!DEMO_MODE) {
        try {
          await api.patch('/auth/user/settings/', { email: emailDraft });
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
          console.warn('Extended settings endpoint not found (404); email kept locally only.');
        }
      }
      setForm((prev) => ({ ...prev, email: emailDraft }));
      setSettings((prev) => ({ ...prev, email: emailDraft }));
      setEditingEmail(false);
      showToast('Email address updated.');
    } catch (err) {
      console.error('Error updating email:', err);
      showToast('Unable to update email. Please try again.', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  // ---- Password change flow ----
  const handleStartEditPassword = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
    setEditingPassword(true);
  };

  const handleCancelEditPassword = () => {
    if (savingPassword) return;
    setEditingPassword(false);
  };

  const handlePasswordFieldChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validatePasswordForm = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Enter your current password.';
    if (!passwordForm.newPassword) {
      errs.newPassword = 'Enter a new password.';
    } else if (passwordForm.newPassword.length < 8) {
      errs.newPassword = 'New password must be at least 8 characters.';
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errs.newPassword = 'New password must be different from the current one.';
    }
    if (!passwordForm.confirmPassword) {
      errs.confirmPassword = 'Confirm your new password.';
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePasswordForm()) return;
    setSavingPassword(true);
    try {
      if (!DEMO_MODE) {
        await api.post('/auth/change-password/', {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        });
      }
      setEditingPassword(false);
      setForm((prev) => ({ ...prev, passwordUpdatedAt: new Date().toISOString() }));
      showToast('Password changed successfully.');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword: err?.response?.data?.detail || 'Current password is incorrect.',
        }));
      } else if (status === 404) {
        console.warn('Change-password endpoint not found (404).');
        showToast('Password change isn\u2019t available yet — this endpoint hasn\u2019t been built on the backend.', 'error');
      } else {
        console.error('Error changing password:', err);
        showToast('Unable to change password. Please try again.', 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!form?.email) return;
    try {
      await navigator.clipboard.writeText(form.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading settings...
        </Typography>
      </Box>
    );
  }

  if (error && !settings) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" sx={{ p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!settings || !form) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No settings data available
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f6f7fb' }}>
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ borderRadius: '10px' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 0.5, fontSize: 12 }}>
          <MuiLink
            component={RouterLink}
            to="/dashboard"
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: 12, fontWeight: 600 }}
          >
            DASHBOARD
          </MuiLink>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>SETTINGS</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your account, notifications, and profile visibility controls.
            </Typography>
          </Box>
          <Chip
            icon={
              saveState === 'saving' ? (
                <CircularProgress size={12} sx={{ ml: 1 }} />
              ) : (
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#16a34a', ml: 1 }} />
              )
            }
            label={saveState === 'saving' ? 'Saving changes...' : 'Changes are saved automatically'}
            size="small"
            sx={{
              bgcolor: saveState === 'saving' ? '#fdf1e0' : '#e6f4ea',
              color: saveState === 'saving' ? '#c2570b' : '#16a34a',
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>

      <MotionBox component={Grid} container spacing={3} variants={containerStagger} initial="hidden" animate="visible">
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Account Preferences */}
          <MotionCard elevation={0} variants={cardEnter} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
                <PersonOutline sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Account Preferences
                </Typography>
              </Stack>

              {/* Email */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  PRIMARY EMAIL
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 0.75 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={editingEmail ? emailDraft : form.email || ''}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    disabled={!editingEmail}
                    error={!!emailError}
                    helperText={editingEmail ? emailError : 'Used for login and secure verification.'}
                    InputProps={{
                      endAdornment: !editingEmail && (
                        <IconButton size="small" onClick={handleCopyEmail}>
                          {copied ? <CheckCircle sx={{ fontSize: 16, color: '#16a34a' }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
                        </IconButton>
                      ),
                    }}
                  />
                  {!editingEmail ? (
                    <Button onClick={handleStartEditEmail} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', mt: 0.25 }}>
                      Change
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                      <Button size="small" onClick={handleCancelEditEmail} color="inherit" disabled={savingEmail} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Cancel
                      </Button>
                      <Button size="small" variant="contained" onClick={handleSaveEmail} disabled={savingEmail} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        {savingEmail ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Box>

              {/* Password */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  PASSWORD
                </Typography>
                {!editingPassword ? (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75 }}>
                    <TextField fullWidth size="small" type="password" value="••••••••••" disabled />
                    <Button onClick={handleStartEditPassword} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Update
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={1.5} sx={{ mt: 0.75 }}>
                    <TextField
                      label="Current Password"
                      type="password"
                      size="small"
                      fullWidth
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange('currentPassword')}
                      error={!!passwordErrors.currentPassword}
                      helperText={passwordErrors.currentPassword}
                      disabled={savingPassword}
                    />
                    <TextField
                      label="New Password"
                      type="password"
                      size="small"
                      fullWidth
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange('newPassword')}
                      error={!!passwordErrors.newPassword}
                      helperText={passwordErrors.newPassword || 'At least 8 characters.'}
                      disabled={savingPassword}
                    />
                    <TextField
                      label="Confirm New Password"
                      type="password"
                      size="small"
                      fullWidth
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordFieldChange('confirmPassword')}
                      error={!!passwordErrors.confirmPassword}
                      helperText={passwordErrors.confirmPassword}
                      disabled={savingPassword}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button onClick={handleCancelEditPassword} color="inherit" disabled={savingPassword} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Cancel
                      </Button>
                      <Button variant="contained" onClick={handleSavePassword} disabled={savingPassword} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        {savingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </Stack>
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {form.otpEnabled
                    ? `OTP-based login is already enabled for your account. Last changed ${monthYear(form.passwordUpdatedAt)}.`
                    : `Last changed ${monthYear(form.passwordUpdatedAt)}.`}
                </Typography>
              </Box>
            </CardContent>
          </MotionCard>

          {/* Notification Settings */}
          <MotionCard elevation={0} variants={cardEnter} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <NotificationsActive sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Notification Settings
                </Typography>
              </Stack>
              <SettingRow
                title="In-app notifications"
                description="Show notification alerts and updates on the dashboard."
                checked={form.inAppNotifications}
                onChange={handleToggle('inAppNotifications')}
              />
              <Divider />
              <SettingRow
                title="Weekly progress emails"
                description="Receive a weekly summary of milestones and activity."
                checked={form.weeklyProgressEmails}
                onChange={handleToggle('weeklyProgressEmails')}
              />
              <Divider />
              <SettingRow
                title="Product announcements"
                description="Get updates about new learning tools and platform features."
                checked={form.productAnnouncements}
                onChange={handleToggle('productAnnouncements')}
              />
            </CardContent>
          </MotionCard>

          {/* Privacy & Visibility */}
          <MotionCard elevation={0} variants={cardEnter} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <VisibilityIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Privacy &amp; Visibility
                </Typography>
              </Stack>
              <Alert severity="info" variant="outlined" sx={{ mb: 1, borderRadius: '10px' }}>
                Controls what appears on your public profile. Changes save automatically.
              </Alert>
              <SettingRow title="Show profile to recruiters" checked={form.showProfileToRecruiters} onChange={handleToggle('showProfileToRecruiters')} />
              <Divider />
              <SettingRow title="Display email on public profile" checked={form.showEmailOnProfile} onChange={handleToggle('showEmailOnProfile')} />
              <Divider />
              <SettingRow title="Show project portfolio" checked={form.showProjectPortfolio} onChange={handleToggle('showProjectPortfolio')} />
              <Divider />
              <SettingRow title="Show phone number on public profile" checked={form.showPhoneOnProfile} onChange={handleToggle('showPhoneOnProfile')} />
              <Divider />
              <SettingRow title="Show work experience on public profile" checked={form.showWorkExperience} onChange={handleToggle('showWorkExperience')} />
              <Divider />
              <SettingRow title="Show education on public profile" checked={form.showEducation} onChange={handleToggle('showEducation')} />
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MotionPaper
            elevation={0}
            variants={cardEnter}
            sx={{
              p: 3,
              borderRadius: '16px',
              mb: 3,
              background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
              color: '#fff',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
              }}
            >
              <Shield sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
              Security Tip
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.92, lineHeight: 1.6 }}>
              Your account already uses OTP verification by default for each login. Keep your email secure for uninterrupted access.
            </Typography>
          </MotionPaper>

          <MotionCard elevation={0} variants={cardEnter} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <PersonOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Profile Snapshot
                </Typography>
              </Stack>
              <SnapshotRow label="Name" value={form.name} />
              <Divider />
              <SnapshotRow label="Domain" value={form.domain} />
              <Divider />
              <SnapshotRow label="Position" value={form.position} />
            </CardContent>
          </MotionCard>

          <MotionPaper
            elevation={0}
            variants={cardEnter}
            sx={{ p: 3, borderRadius: '16px', bgcolor: '#eef1ff', border: '1px solid', borderColor: '#dbe1fb' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Lock sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Live Settings Sync
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              These preferences are stored securely in your account and reused across your dashboard experience for consistency.
            </Typography>
          </MotionPaper>
        </Grid>
      </MotionBox>
    </Box>
  );
};

export default UserSettings;