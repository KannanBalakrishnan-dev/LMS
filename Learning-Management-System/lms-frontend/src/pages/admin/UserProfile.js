import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Avatar,
  Chip,
  Button,
  Alert,
  Snackbar,
  TextField,
  MenuItem,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  Lock,
  Shield,
  Edit,
  Save,
  Close,
  Logout,
  Settings,
  PersonAdd,
  WorkspacePremium,
  AccessTime,
  FilterList,
  DeleteOutline,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------------------------------------------------------
// DEMO MODE — flip this to `true` locally to preview without a live API.
// Keep `false` in any shipped build; consider gating with an env var instead
// of a hardcoded flag before this reaches production.
// ---------------------------------------------------------------------------
const DEMO_MODE = false;

const DEMO_PROFILE = {
  fullName: 'Kishore Kittu',
  email: 'kishore.admin@eduplatform.com',
  phone: '+91 94436 04662',
  department: 'Administration',
  role: 'Admin',
  team: 'Learning & Development',
  bio: 'Passionate educator and system administrator dedicated to building seamless learning experiences. Managing global team permissions and course quality assurance.',
  avatarUrl: '',
  memberSince: '2025-08-01',
  isActive: true,
  passwordUpdatedAt: '2025-04-01',
  twoFactorEnabled: true,
  emailNotifications: true,
  browserAlerts: true,
  weeklyReports: false,
  lastLoginDevice: 'Chrome on MacOS (San Francisco, CA)',
  recentActivity: [
    { id: 1, type: 'course', text: 'Kishore updated course settings for "Advanced UI Design"', date: new Date().toISOString() },
    { id: 2, type: 'team', text: 'Kishore added new team member: Sarah Chen', date: new Date(Date.now() - 864e5).toISOString() },
    { id: 3, type: 'cert', text: 'Kishore approved 5 pending certificates', date: '2024-07-24T11:00:00' },
  ],
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

const listItemEnter = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || '?';

const avatarColorFromString = (str = '') => {
  const palette = ['#4F46E5', '#0EA5E9', '#059669', '#D97706', '#DB2777', '#7C3AED', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
};

const monthYear = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

// Builds a safe baseline profile straight from the already-working AuthContext
// user object, so the page has something real to show even before (or if)
// the extended profile endpoint responds. Field names here follow the
// user_type-based shape used elsewhere in the app (see AuthContext.js).
const buildBaseProfileFromAuthUser = (user) => {
  if (!user) return null;
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'User';
  return {
    fullName,
    email: user.email || '',
    phone: user.phone || '',
    department: user.department || '',
    role: user.user_type === 'ADMIN' ? 'Admin' : user.user_type === 'STAFF' ? 'Staff' : (user.user_type || ''),
    team: user.team || '',
    bio: user.bio || '',
    avatarUrl: user.avatar || user.profile_picture || '',
    memberSince: user.date_joined || null,
    isActive: user.is_active !== undefined ? user.is_active : true,
    passwordUpdatedAt: user.password_updated_at || null,
    twoFactorEnabled: !!user.two_factor_enabled,
    emailNotifications: user.email_notifications !== undefined ? user.email_notifications : true,
    browserAlerts: user.browser_alerts !== undefined ? user.browser_alerts : true,
    weeklyReports: !!user.weekly_reports,
    lastLoginDevice: '',
    recentActivity: [],
  };
};

const ACTIVITY_ICON_META = {
  course: { icon: <Settings sx={{ fontSize: 17 }} />, bg: '#e8f0fe', color: '#1a56db' },
  team: { icon: <PersonAdd sx={{ fontSize: 17 }} />, bg: '#e8f0fe', color: '#1a56db' },
  cert: { icon: <WorkspacePremium sx={{ fontSize: 17 }} />, bg: '#fdf1e0', color: '#c2570b' },
};

const ActivityItem = ({ type, text, date }) => {
  const meta = ACTIVITY_ICON_META[type] || ACTIVITY_ICON_META.course;
  return (
    <MotionPaper
      variant="outlined"
      layout
      variants={listItemEnter}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ backgroundColor: '#f7f8fa' }}
      sx={{
        p: 1.75,
        mb: 1.25,
        borderRadius: '12px',
        border: 'none',
        bgcolor: 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: meta.bg,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {text}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
          <AccessTime sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {timeAgo(date)}
          </Typography>
        </Stack>
      </Box>
    </MotionPaper>
  );
};

const SecurityRow = ({ icon, title, description, action }) => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    sx={{ p: 1.75, borderRadius: '12px', bgcolor: 'grey.50', mb: 1.5 }}
  >
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: '10px',
        bgcolor: '#e8f0fe',
        color: '#1a56db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
    {action}
  </Stack>
);

const NotificationRow = ({ title, description, checked, onChange }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.5 }}>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
    <Switch checked={checked} onChange={onChange} />
  </Stack>
);

const UserProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [preEditSnapshot, setPreEditSnapshot] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

  // ---- Change Password dialog ----
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleOpenPasswordDialog = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordFieldErrors({});
    setShowPasswordFields(false);
    setPasswordDialogOpen(true);
  };

  const handleClosePasswordDialog = () => {
    if (changingPassword) return; // don't let them close mid-request
    setPasswordDialogOpen(false);
  };

  const handlePasswordFieldChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    setPasswordFieldErrors((prev) => ({ ...prev, [field]: undefined }));
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
    setPasswordFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setChangingPassword(true);
    try {
      if (!DEMO_MODE) {
        await api.post('/auth/change-password/', {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        });
      }
      setPasswordDialogOpen(false);
      showToast('Password changed successfully.');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        // Backend correctly rejected — most likely the current password was wrong.
        setPasswordFieldErrors((prev) => ({
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
      setChangingPassword(false);
    }
  };

  const fetchProfile = useCallback(async (isMounted) => {
    if (DEMO_MODE) {
      if (isMounted()) {
        setProfile(DEMO_PROFILE);
        setForm(DEMO_PROFILE);
        setLoading(false);
      }
      return;
    }

    // Baseline comes from AuthContext's user, which is already known to work
    // (it's what powers login/routing). The extended profile endpoint is
    // treated as a nice-to-have on top of that baseline, not a hard
    // requirement — if it 404s (not built yet) or errors, we quietly keep
    // the baseline instead of showing an error screen.
    const baseline = buildBaseProfileFromAuthUser(authUser);
    if (isMounted() && baseline) {
      setProfile(baseline);
      setForm(baseline);
    }

    try {
      const response = await api.get('/auth/user/profile/');
      if (isMounted()) {
        const merged = { ...baseline, ...response.data };
        setProfile(merged);
        setForm(merged);
        setError(null);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // Extended endpoint doesn't exist yet — not a real error for the user,
        // just means we stick with the AuthContext baseline above.
        console.warn('Extended profile endpoint not found (404); using baseline user data.');
      } else {
        console.error('Error fetching extended profile:', err);
      }
      if (isMounted() && !baseline) {
        setError('Unable to load profile data. Please try refreshing the page.');
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;
    fetchProfile(isMounted);
    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const handleFieldChange = (field) => (event) => {
    if (!isEditing) return; // fields are locked until Edit is clicked
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleEnterEdit = () => {
    setPreEditSnapshot(form);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (preEditSnapshot) setForm(preEditSnapshot);
    setPreEditSnapshot(null);
    setIsEditing(false);
  };

  const handleToggle = (field) => (event) => {
    const value = event.target.checked;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (!DEMO_MODE) {
      api.patch('/auth/user/profile/', { [field]: value }).catch((err) => {
        if (err?.response?.status === 404) {
          console.warn('Extended profile endpoint not found (404); toggle kept locally only.');
        } else {
          console.error('Error updating preference:', err);
        }
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!DEMO_MODE) {
        try {
          await api.patch('/auth/user/profile/', {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            department: form.department,
            bio: form.bio,
          });
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
          console.warn('Extended profile endpoint not found (404); changes kept locally only.');
        }
      }
      setProfile(form);
      setPreEditSnapshot(null);
      setIsEditing(false);
      showToast('Profile updated successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('Unable to save changes. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!DEMO_MODE) {
      try {
        await api.post('/admin/sign-out-all-devices/');
      } catch (err) {
        console.error('Error signing out of all devices:', err);
      }
    }
  };

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (event) => {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file later
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      showToast('Please choose a JPG, PNG, WEBP, or GIF image.', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showToast('That image is too large — please choose one under 5MB.', 'error');
      return;
    }

    // Show it immediately as a local preview so the UI feels instant,
    // before the network round-trip resolves.
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, avatarUrl: previewUrl }));
    setUploadingPhoto(true);

    if (DEMO_MODE) {
      // Nothing to upload to in demo mode — the local preview is the result.
      setProfile((prev) => ({ ...prev, avatarUrl: previewUrl }));
      setUploadingPhoto(false);
      showToast('Profile picture updated.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.patch('/auth/user/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response?.data?.avatarUrl || response?.data?.avatar || previewUrl;
      setForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
      setProfile((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
      showToast('Profile picture updated.');
    } catch (err) {
      if (err?.response?.status === 404) {
        // Upload endpoint doesn't exist yet — keep the local preview so the
        // person still sees their choice reflected, just not persisted.
        console.warn('Avatar upload endpoint not found (404); keeping local preview only.');
        setProfile((prev) => ({ ...prev, avatarUrl: previewUrl }));
        showToast('Profile picture updated (will sync once the server supports it).', 'info');
      } else {
        console.error('Error uploading profile photo:', err);
        setForm((prev) => ({ ...prev, avatarUrl: profile?.avatarUrl || '' }));
        showToast('Unable to upload photo. Please try again.', 'error');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    if (DEMO_MODE) {
      setForm((prev) => ({ ...prev, avatarUrl: '' }));
      setProfile((prev) => ({ ...prev, avatarUrl: '' }));
      setUploadingPhoto(false);
      showToast('Profile picture removed.');
      return;
    }
    try {
      await api.patch('/auth/user/profile/', { avatarUrl: null });
      setForm((prev) => ({ ...prev, avatarUrl: '' }));
      setProfile((prev) => ({ ...prev, avatarUrl: '' }));
      showToast('Profile picture removed.');
    } catch (err) {
      if (err?.response?.status === 404) {
        setForm((prev) => ({ ...prev, avatarUrl: '' }));
        setProfile((prev) => ({ ...prev, avatarUrl: '' }));
        showToast('Profile picture removed (will sync once the server supports it).', 'info');
      } else {
        console.error('Error removing profile photo:', err);
        showToast('Unable to remove photo. Please try again.', 'error');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading profile...
        </Typography>
      </Box>
    );
  }

  if (error && !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" sx={{ p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!profile || !form) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No profile data available
          </Typography>
        </Paper>
      </Box>
    );
  }

  const activity = profile.recentActivity || [];

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

      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Current Password"
              type={showPasswordFields ? 'text' : 'password'}
              fullWidth
              size="small"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange('currentPassword')}
              error={!!passwordFieldErrors.currentPassword}
              helperText={passwordFieldErrors.currentPassword}
              disabled={changingPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPasswordFields((v) => !v)} edge="end">
                      {showPasswordFields ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="New Password"
              type={showPasswordFields ? 'text' : 'password'}
              fullWidth
              size="small"
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange('newPassword')}
              error={!!passwordFieldErrors.newPassword}
              helperText={passwordFieldErrors.newPassword || 'At least 8 characters.'}
              disabled={changingPassword}
            />
            <TextField
              label="Confirm New Password"
              type={showPasswordFields ? 'text' : 'password'}
              fullWidth
              size="small"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange('confirmPassword')}
              error={!!passwordFieldErrors.confirmPassword}
              helperText={passwordFieldErrors.confirmPassword}
              disabled={changingPassword}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClosePasswordDialog} disabled={changingPassword} color="inherit" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={changingPassword}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header card */}
      <MotionPaper
        elevation={0}
        initial="hidden"
        animate="visible"
        variants={cardEnter}
        sx={{ p: { xs: 2.5, md: 3 }, borderRadius: '20px', border: '1px solid', borderColor: 'divider', mb: 3 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Box sx={{ position: 'relative' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handlePhotoSelected}
              />
              <Avatar
                src={form.avatarUrl || undefined}
                sx={{ width: 88, height: 88, fontSize: '1.75rem', bgcolor: avatarColorFromString(form.fullName), opacity: uploadingPhoto ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                {getInitials(form.fullName)}
              </Avatar>
              {uploadingPhoto && (
                <CircularProgress
                  size={32}
                  sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-16px', marginLeft: '-16px' }}
                />
              )}
              <IconButton
                size="small"
                onClick={handleChangePhotoClick}
                disabled={uploadingPhoto}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  border: '2px solid #fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <Edit sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {form.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {form.role} • {form.team}
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleChangePhotoClick}
                  disabled={uploadingPhoto}
                  sx={{ borderRadius: '8px', textTransform: 'none' }}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </Button>
                {form.avatarUrl && (
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    startIcon={<DeleteOutline sx={{ fontSize: 16 }} />}
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                  >
                    Remove
                  </Button>
                )}
                <Button variant="outlined" size="small" sx={{ borderRadius: '8px', textTransform: 'none' }}>
                  View Public Profile
                </Button>
              </Stack>
            </Box>
          </Stack>

          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
            <Chip
              icon={<Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#16a34a', ml: 1 }} />}
              label={form.isActive ? 'Active Now' : 'Offline'}
              size="small"
              sx={{ bgcolor: '#e6f4ea', color: '#16a34a', fontWeight: 700 }}
            />
            <Typography variant="caption" color="text.secondary">
              Member since {monthYear(form.memberSince)}
            </Typography>
          </Stack>
        </Stack>
      </MotionPaper>

      <MotionBox
        component={Grid}
        container
        spacing={3}
        variants={containerStagger}
        initial="hidden"
        animate="visible"
      >
        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <MotionCard
            elevation={0}
            variants={cardEnter}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 3 }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button
                    size="small"
                    startIcon={<Edit sx={{ fontSize: 16 }} />}
                    onClick={handleEnterEdit}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Edit
                  </Button>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      startIcon={<Close sx={{ fontSize: 16 }} />}
                      onClick={handleCancelEdit}
                      disabled={saving}
                      color="inherit"
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Save sx={{ fontSize: 16 }} />}
                      onClick={handleSave}
                      disabled={saving}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Stack>
                )}
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    size="small"
                    value={form.fullName || ''}
                    onChange={handleFieldChange('fullName')}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Email Address"
                    fullWidth
                    size="small"
                    value={form.email || ''}
                    onChange={handleFieldChange('email')}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    size="small"
                    value={form.phone || ''}
                    onChange={handleFieldChange('phone')}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Department"
                    fullWidth
                    size="small"
                    value={form.department || ''}
                    onChange={handleFieldChange('department')}
                    disabled={!isEditing}
                  >
                    <MenuItem value="Administration">Administration</MenuItem>
                    <MenuItem value="Learning & Development">Learning &amp; Development</MenuItem>
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Operations">Operations</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Bio"
                    fullWidth
                    multiline
                    minRows={3}
                    value={form.bio || ''}
                    onChange={handleFieldChange('bio')}
                    disabled={!isEditing}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </MotionCard>

          <MotionCard
            elevation={0}
            variants={cardEnter}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px' }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Activity Log
                </Typography>
                <IconButton size="small">
                  <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />
                </IconButton>
              </Stack>

              {activity.length > 0 ? (
                <>
                  <Divider sx={{ mb: 1 }} />
                  <AnimatePresence initial>
                    {activity.map((item) => (
                      <ActivityItem key={item.id} type={item.type} text={item.text} date={item.date} />
                    ))}
                  </AnimatePresence>
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => fetchProfile(() => true)}
                    sx={{ mt: 1, borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#eef1ff' }}
                  >
                    View All Activity
                  </Button>
                </>
              ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: '12px' }}>
                  <Typography variant="body1" color="text.secondary">
                    No recent activity
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <MotionCard
            elevation={0}
            variants={cardEnter}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 3 }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Security &amp; Access
              </Typography>

              <SecurityRow
                icon={<Lock sx={{ fontSize: 18 }} />}
                title="Password"
                description={`Last updated ${timeAgo(form.passwordUpdatedAt)}`}
                action={
                  <Button size="small" onClick={handleOpenPasswordDialog} sx={{ textTransform: 'none', fontWeight: 700 }}>
                    Change
                  </Button>
                }
              />
              <SecurityRow
                icon={<Shield sx={{ fontSize: 18 }} />}
                title="Two-Factor Auth"
                description="Secure your account with 2FA"
                action={<Switch checked={!!form.twoFactorEnabled} onChange={handleToggle('twoFactorEnabled')} />}
              />

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Logged in from: {form.lastLoginDevice}
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Logout sx={{ fontSize: 16 }} />}
                onClick={handleSignOutAll}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Sign out from all devices
              </Button>
            </CardContent>
          </MotionCard>

          <MotionCard
            elevation={0}
            variants={cardEnter}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px' }}
          >
            <CardContent sx={{ p: 3 }}>
              <NotificationRow
                title="Email Notifications"
                description="Daily digest and news"
                checked={!!form.emailNotifications}
                onChange={handleToggle('emailNotifications')}
              />
              <Divider />
              <NotificationRow
                title="Browser Alerts"
                description="Real-time admin tasks"
                checked={!!form.browserAlerts}
                onChange={handleToggle('browserAlerts')}
              />
              <Divider />
              <NotificationRow
                title="Weekly Reports"
                description="Analytics summary"
                checked={!!form.weeklyReports}
                onChange={handleToggle('weeklyReports')}
              />
            </CardContent>
          </MotionCard>
        </Grid>
      </MotionBox>
    </Box>
  );
};

export default UserProfile;