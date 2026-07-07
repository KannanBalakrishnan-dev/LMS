import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  CssBaseline,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Dashboard,
  People,
  School,
  Groups,
  Analytics,
  Notifications,
  Assignment,
  History,
  Feedback,
  WorkspacePremium,
  KeyboardArrowDown,
  AutoStories,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  // HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import api, { isNetworkConnectionError } from '../../api';

const drawerWidth = 240;
const collapsedWidth = 64;

// ---- Palette to match the reference sidebar (navy/indigo pill nav) ----
const NAV_ACTIVE_BG = '#1e1b4b';
const NAV_TEXT = '#1c2061';
const NAV_ICON = '#1c2061';
const NAV_HOVER_BG = '#f1f0fb';
const NAV_SECTION_LABEL = '#9ca3af';

// ---- Path to the profile page. ----
const PROFILE_PATH = '/admin/UserProfile';

// ---- motion-wrapped MUI primitives ----
const MotionListItemButton = motion(ListItemButton);
const MotionBox = motion(Box);

// ---- shared animation variants ----
const EASE = [0.16, 1, 0.3, 1];

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE } },
};

const navStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const navItemEnter = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE } },
};

const notifListEnter = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE } },
};

const AdminLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [logoHovered, setLogoHovered] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const lastNotificationAtRef = useRef(null);
  const liveNotificationFailureCountRef = useRef(0);
  const liveNotificationsPausedRef = useRef(false);
  const liveNotificationPauseLoggedRef = useRef(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleLogout = () => { logout(); navigate('/login'); };
  const handleToggleDarkMode = () => setDarkMode((prev) => !prev);

  // Navigate to the profile page and close whichever menu triggered it.
  const handleGoToProfile = () => {
    setAnchorEl(null);
    navigate(PROFILE_PATH);
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await api.get('/notifications/');
      setNotifications(response.data);
      lastNotificationAtRef.current = response.data?.[0]?.created_at || null;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchLiveNotifications = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (liveNotificationsPausedRef.current || !localStorage.getItem('token')) return;
    try {
      const since = lastNotificationAtRef.current;
      const params = since ? { params: { since } } : undefined;
      const response = await api.get('/notifications/live/', params);
      const incoming = response.data?.notifications || [];
      const latest = response.data?.latest || null;
      liveNotificationFailureCountRef.current = 0;
      liveNotificationsPausedRef.current = false;
      liveNotificationPauseLoggedRef.current = false;
      if (incoming.length) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const merged = [...incoming.filter((n) => !existingIds.has(n.id)), ...prev];
          merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return merged.slice(0, 100);
        });
      }
      if (latest) lastNotificationAtRef.current = latest;
    } catch (error) {
      if (isNetworkConnectionError(error)) {
        liveNotificationFailureCountRef.current += 1;
        if (liveNotificationFailureCountRef.current >= 3) {
          liveNotificationsPausedRef.current = true;
          if (!liveNotificationPauseLoggedRef.current) {
            console.warn('Live notifications paused.');
            liveNotificationPauseLoggedRef.current = true;
          }
        }
        return;
      }
      console.error('Error fetching live notifications:', error);
    }
  };

  const handleNotificationClick = async (event) => {
    setNotificationAnchorEl(event.currentTarget);
    try {
      await api.put('/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationClose = () => setNotificationAnchorEl(null);

  const handleNotificationItemClick = async (notification) => {
    try {
      await api.put(`/notifications/${notification.id}/mark-read/`);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      if (notification.navigation_data?.path) {
        navigate(notification.navigation_data.path);
        setNotificationAnchorEl(null);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchLiveNotifications, 10000);
    const resumeLiveNotifications = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      liveNotificationFailureCountRef.current = 0;
      liveNotificationsPausedRef.current = false;
      liveNotificationPauseLoggedRef.current = false;
      fetchLiveNotifications();
    };
    window.addEventListener('online', resumeLiveNotifications);
    document.addEventListener('visibilitychange', resumeLiveNotifications);
    return () => {
      window.removeEventListener('online', resumeLiveNotifications);
      document.removeEventListener('visibilitychange', resumeLiveNotifications);
      clearInterval(interval);
    };
  }, []);

  // ---- Sidebar grouped into sections to match the reference design ----
  const navSections = [
    {
      label: 'Main Menu',
      items: [
        { text: 'Dashboard', icon: <Dashboard />, path: '/admin' },
        { text: 'Users', icon: <People />, path: '/admin/users' },
        { text: 'Courses', icon: <School />, path: '/admin/courses' },
        { text: 'Team', icon: <Groups />, path: '/admin/teams' },
      ],
    },
    {
      label: 'Reports & Management',
      items: [
        { text: 'Analytics', icon: <Analytics />, path: '/admin/analytics' },
        { text: 'Certificates', icon: <WorkspacePremium />, path: '/admin/certificates' },
      ],
    },
    {
      label: 'System',
      items: [
        { text: 'Feedback', icon: <Feedback />, path: '/admin/feedback' },
        ...(user?.user_type === 'ADMIN'
          ? [
              { text: 'Approval Dashboard', icon: <Assignment />, path: '/admin/requests' },
              { text: 'Approved List', icon: <History />, path: '/admin/deleted-actions' },
            ]
          : []),
        // { text: 'Help Center', icon: <HelpOutlineIcon />, path: '/admin/help' },
      ],
    },
  ];

  const expanded = drawerOpen || railHovered;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          //-----navbar background colour-----
          backgroundColor: '#fff9fa',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderRadius: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Toolbar>
          <Tooltip title={drawerOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}>
            <Box
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
              onClick={handleDrawerToggle}
              sx={{
                mr: 1,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                '&:hover': { background: 'rgba(0,0,0,0.06)' },
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {logoHovered ? (
                  <motion.div
                    key={drawerOpen ? 'close' : 'open'}
                    initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    style={{ display: 'flex' }}
                  >
                    {drawerOpen
                      ? <MenuOpenIcon sx={{ color: '#374151', fontSize: 26 }} />
                      : <MenuIcon sx={{ color: '#374151', fontSize: 26 }} />}
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    style={{ display: 'flex' }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: NAV_ACTIVE_BG,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AutoStories sx={{ color: '#ffffff', fontSize: 18 }} />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Tooltip>

          {/* Brand (moved here from sidebar) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mr: 3 }}>
            <Typography
              sx={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: -0.2,
              }}
            >
              EduPlatform
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Dark mode toggle */}
            <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={handleToggleDarkMode} sx={{ color: '#374151' }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={darkMode ? 'dark' : 'light'}
                    initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    style={{ display: 'flex' }}
                  >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </motion.div>
                </AnimatePresence>
              </IconButton>
            </Tooltip>
            {/* Notifications */}
            <IconButton onClick={handleNotificationClick} sx={{ color: '#374151' }}>
              <motion.div
                key={notifications.filter(n => !n.is_read).length}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Badge
                  variant={notifications.some(n => !n.is_read) ? 'dot' : undefined}
                  badgeContent={notifications.filter(n => !n.is_read).length}
                  color="error"
                >
                  <Notifications />
                </Badge>
              </motion.div>
            </IconButton>
            {/* Profile Avatar — opens the profile menu (click "My Profile" to navigate) */}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Avatar sx={{ bgcolor: NAV_ACTIVE_BG, width: 36, height: 36, fontSize: '0.9rem' }}>
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </Avatar>
              </motion.div>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        onMouseEnter={() => !drawerOpen && setRailHovered(true)}
        onMouseLeave={() => setRailHovered(false)}
        sx={{
          width: drawerOpen ? drawerWidth : railHovered ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'width 0.25s ease',
          '& .MuiDrawer-paper': {
            mt: '64px',
            width: drawerOpen ? drawerWidth : railHovered ? drawerWidth : collapsedWidth,
            height: 'calc(100% - 64px)',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            //-----slidebar background colour-----
            background: '#fff9fa',
            color: NAV_TEXT,
            transition: 'width 0.25s ease',
            border: 'none',
            borderRight: '1px solid #eef0f5',
            boxShadow: railHovered && !drawerOpen
              ? '4px 0 24px rgba(0,0,0,0.10)'
              : 'none',
            zIndex: theme.zIndex.drawer,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
      >
        <MotionBox
          sx={{ px: 1.5, pt: 2, pb: 0, flex: 1, overflowY: 'auto' }}
          variants={navStagger}
          initial="hidden"
          animate="visible"
        >
          {navSections.map((section, sectionIdx) => (
            <Box key={section.label} sx={{ mb: 0.5 }}>
              {expanded ? (
                <Typography
                  sx={{
                    px: 1.5,
                    pt: sectionIdx === 0 ? 0 : 1.75,
                    pb: 0.75,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: NAV_SECTION_LABEL,
                  }}
                >
                  {section.label}
                </Typography>
              ) : (
                sectionIdx > 0 && (
                  <Box sx={{ my: 1, mx: 1, borderTop: '1px solid #eef0f5' }} />
                )
              )}
              <List sx={{ p: 0 }}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Tooltip key={item.text} title={!expanded ? item.text : ''} placement="right">
                      <MotionListItemButton
                        onClick={() => navigate(item.path)}
                        variants={navItemEnter}
                        whileHover={{ x: isActive ? 0 : 3 }}
                        whileTap={{ scale: 0.97 }}
                        sx={{
                          justifyContent: expanded ? 'flex-start' : 'center',
                          px: expanded ? 2 : 0,
                          py: 1.1,
                          borderRadius: '12px',
                          my: 0.4,
                          backgroundColor: isActive ? NAV_ACTIVE_BG : 'transparent',
                          color: isActive ? '#ffffff' : NAV_TEXT,
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            backgroundColor: isActive ? NAV_ACTIVE_BG : NAV_HOVER_BG,
                            color: isActive ? '#ffffff' : NAV_TEXT,
                          },
                          minHeight: 46,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: expanded ? 1.5 : 'auto',
                            ml: expanded ? 0 : 'auto',
                            justifyContent: 'center',
                            color: isActive ? '#ffffff' : NAV_ICON,
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: 20,
                            '& svg': { fontSize: 20 },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {expanded && (
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.92rem',
                              fontWeight: isActive ? 600 : 500,
                              letterSpacing: 0,
                            }}
                          />
                        )}
                      </MotionListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          ))}
        </MotionBox>

        {/* User profile at bottom — clicking navigates straight to the profile page */}
        {expanded && (
          <Box
            sx={{
              px: 2,
              py: 1.75,
              borderTop: '1px solid #eef0f5',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              '&:hover': { backgroundColor: NAV_HOVER_BG },
            }}
            onClick={handleGoToProfile}
          >
            <Avatar sx={{ bgcolor: NAV_ACTIVE_BG, width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }} noWrap>
                {user?.username || 'Admin'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.3 }} noWrap>
                {user?.user_type === 'ADMIN' ? 'Admin' : 'Manager'}
              </Typography>
            </Box>
            <KeyboardArrowDown sx={{ color: '#9ca3af', fontSize: 18, flexShrink: 0 }} />
          </Box>
        )}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1, minWidth: 0, maxWidth: '100%',
          mt: '64px', transition: 'margin-left 0.25s ease',
          bgcolor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)',
          overflow: 'hidden', boxSizing: 'border-box',
        }}
      >
        <Box sx={{ p: 2, width: '100%', boxSizing: 'border-box' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>

      {/* Profile Menu — top navbar avatar */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>
          <Typography variant="subtitle1">{user?.username || 'Admin'}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleGoToProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          My Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Notification Dropdown */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: 6, minWidth: 320, maxHeight: 400, overflow: 'auto', mt: 1.5 } }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={500}>Notifications</Typography>
        </Box>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {loadingNotifications ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Loading notifications...</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  variants={notifListEnter}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, height: 0 }}
                  whileHover={{ backgroundColor: theme.palette.action.hover }}
                >
                  <Box
                    onClick={() => handleNotificationItemClick(notification)}
                    sx={{
                      p: 2, borderBottom: `1px solid ${theme.palette.divider}`, cursor: 'pointer',
                      backgroundColor: notification.is_read ? 'transparent' : theme.palette.action.hover,
                    }}
                  >
                    {notification.sender_username && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar
                          src={notification.sender_profile_picture || undefined}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}
                        >
                          {notification.sender_username[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={500} color="primary">
                          {notification.sender_username}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="body2" sx={{ mb: 0.5 }}>{notification.message}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Box>
      </Menu>
    </Box>
  );
};

export default AdminLayout;