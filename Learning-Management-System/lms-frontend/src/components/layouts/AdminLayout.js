import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  // AutoStories,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import api, { isNetworkConnectionError } from '../../api';
import vdartLogo from '../../assets/vdartacademylogo1 1.png';

const drawerWidth = 240;
const collapsedWidth = 64;

// ---- Palette to match the reference sidebar (navy/indigo pill nav) ----
const NAV_ACTIVE_BG = '#1e1b4b';
const NAV_TEXT = '#312e81';
const NAV_ICON = '#4c4899';
const NAV_HOVER_BG = '#f1f0fb';

const AdminLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [logoHovered, setLogoHovered] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
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

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin' },
    { text: 'Users', icon: <People />, path: '/admin/users' },
    { text: 'Courses', icon: <School />, path: '/admin/courses' },
    { text: 'Team', icon: <Groups />, path: '/admin/teams' },
    { text: 'Analytics', icon: <Analytics />, path: '/admin/analytics' },
    { text: 'Certificates', icon: <WorkspacePremium />, path: '/admin/certificates' },
    { text: 'Feedback', icon: <Feedback />, path: '/admin/feedback' },
    ...(user?.user_type === 'ADMIN'
      ? [
          { text: 'Approval Dashboard', icon: <Assignment />, path: '/admin/requests' },
          { text: 'Approved List', icon: <History />, path: '/admin/deleted-actions' },
        ]
      : []),
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          backgroundColor: '#ffffff',
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
                mr: 2,
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
              {logoHovered
                ? (drawerOpen ? <MenuOpenIcon sx={{ color: '#374151', fontSize: 26 }} /> : <MenuIcon sx={{ color: '#374151', fontSize: 26 }} />)
                : <Box component="img" src={vdartLogo} alt="VDart" sx={{ width: 48, height: 48, objectFit: 'contain' }} />}
            </Box>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <IconButton onClick={handleNotificationClick} sx={{ color: '#374151' }}>
              <Badge badgeContent={notifications.filter(n => !n.is_read).length} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            {/* Profile Avatar */}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ bgcolor: NAV_ACTIVE_BG, width: 36, height: 36, fontSize: '0.9rem' }}>
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </Avatar>
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
            background: '#ffffff',
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
        {/* Brand row (matches reference: stacked-book icon + "EduPlatform") */}
        {/* {(drawerOpen || railHovered) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 2.5,
              pt: 2.5,
              pb: 1.5,
            }}
          >
            <AutoStories sx={{ color: NAV_ACTIVE_BG, fontSize: 24 }} />
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
        )} */}

        <List sx={{ px: 1.5, pt: 1, pb: 0, flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const expanded = drawerOpen || railHovered;
            return (
              <Tooltip key={item.text} title={!expanded ? item.text : ''} placement="right">
                <ListItemButton
                  onClick={() => navigate(item.path)}
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
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        {/* User profile at bottom */}
        {(drawerOpen || railHovered) && (
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
            onClick={(e) => setAnchorEl(e.currentTarget)}
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
          <Outlet />
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>
          <Typography variant="subtitle1">{user?.username || 'Admin'}</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
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
            notifications.map((notification) => (
              <Box
                key={notification.id}
                onClick={() => handleNotificationItemClick(notification)}
                sx={{
                  p: 2, borderBottom: `1px solid ${theme.palette.divider}`, cursor: 'pointer',
                  backgroundColor: notification.is_read ? 'transparent' : theme.palette.action.hover,
                  '&:hover': { backgroundColor: theme.palette.action.hover },
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
            ))
          )}
        </Box>
      </Menu>
    </Box>
  );
};

export default AdminLayout;