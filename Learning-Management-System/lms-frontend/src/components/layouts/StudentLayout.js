import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import UserProfile from '../../pages/student/UserProfile';
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  Dialog,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
  Button,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Search as SearchIcon,
  StarBorderRounded as StarBorderRoundedIcon,
  NotificationsNoneRounded as NotificationsNoneRoundedIcon,
  School as SchoolIcon,
  SmartToyOutlined as AiTutorIcon,
  AutoAwesome as StudyAssistantIcon,
  History as ChatHistoryIcon,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { CourseProgressProvider, useCourseProgress } from '../../contexts/CourseProgressContext';
import api from '../../api';
import { useTheme } from '@mui/material/styles';
import dashboardIcon from '../../assets/Container11.png';
import courseCatalogIcon from '../../assets/container12.png';
import myCoursesIcon from '../../assets/Container13.png';
import creditPointsIcon from '../../assets/Container14.png';

const expandedWidth = 224;
const collapsedWidth = 76;

// ---- Palette taken directly from the AdminLayout reference ----
const NAV_ACTIVE_BG = '#1e1b4b';       // navy/indigo active pill
const NAV_TEXT = '#1c2061';
const NAV_ICON = '#1c2061';
const NAV_HOVER_BG = '#f1f0fb';
const NAV_SECTION_LABEL = '#9ca3af';
const SURFACE_BG = '#fff9fa';          // navbar + sidebar background
const BORDER_COLOR = '#eef0f5';
const APPBAR_BORDER = '#e5e7eb';

const STUDENT_SURFACE_BACKGROUND = `
  radial-gradient(circle at 50% 12%, rgba(29, 78, 216, 0.10) 0%, rgba(219, 234, 254, 0.28) 26%, rgba(255, 255, 255, 0) 55%),
  linear-gradient(180deg, #eef8ff 0%, #f8fcff 54%, #f5fbff 100%)
`;

// ---- motion-wrapped MUI primitives (same approach as AdminLayout) ----
const MotionListItemButton = motion(ListItemButton);
const MotionBox = motion(Box);

// ---- shared animation variants, copied from AdminLayout ----
const EASE = [0.16, 1, 0.3, 1];

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

const StudentLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [logoHovered, setLogoHovered] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [creditPoints, setCreditPoints] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const lastNotificationAtRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: courseId } = useParams();
  const { setCourseProgress } = useCourseProgress();
  const theme = useTheme();

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openProfileDialog = (event) => {
    event.currentTarget.blur();
    setAnchorEl(null);
    window.setTimeout(() => {
      setProfileOpen(true);
    }, 0);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (query) {
      navigate(`/catalog?q=${encodeURIComponent(query)}`);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await api.get('/notifications/');
      setNotifications(response.data);
      const latest = response.data?.[0]?.created_at || null;
      lastNotificationAtRef.current = latest;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchCreditPoints = async () => {
    try {
      const response = await api.get('/student/credit-points/');
      setCreditPoints(Number(response.data?.total_credit_points || 0));
    } catch (error) {
      console.error('Error fetching credit points:', error);
    }
  };

  const fetchLiveNotifications = async () => {
    try {
      const since = lastNotificationAtRef.current;
      const params = since ? { params: { since } } : undefined;
      const response = await api.get('/notifications/live/', params);
      const incoming = response.data?.notifications || [];
      const latest = response.data?.latest || null;

      if (incoming.length) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const merged = [
            ...incoming.filter((n) => !existingIds.has(n.id)),
            ...prev,
          ];
          merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return merged.slice(0, 100);
        });
      }

      if (latest) {
        lastNotificationAtRef.current = latest;
      }
    } catch (error) {
      console.error('Error fetching live notifications:', error);
    }
  };

  const handleNotificationClick = async (event) => {
    setNotificationAnchorEl(event.currentTarget);
    try {
      await api.put('/notifications/mark-all-read/');
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNotificationItemClick = async (notification) => {
    try {
      await api.put(`/notifications/${notification.id}/mark-read/`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, is_read: true }
            : n
        )
      );
      if (notification.navigation_data && notification.navigation_data.path) {
        navigate(notification.navigation_data.path);
        setNotificationAnchorEl(null);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // ---- Sidebar sections ----
  const navSections = [
    {
      label: 'Main Menu',
      items: [
        { text: 'Dashboard', iconAsset: dashboardIcon, path: '/userlogin', iconWidth: 18, iconHeight: 18 },
        { text: 'Course Catalog', iconAsset: courseCatalogIcon, path: '/catalog', iconWidth: 22, iconHeight: 20 },
        { text: 'My Courses', iconAsset: myCoursesIcon, path: '/my-courses', iconWidth: 22, iconHeight: 18 },
        { text: 'Credit Points', iconAsset: creditPointsIcon, path: '/credit-points', iconWidth: 20, iconHeight: 20 },
      ],
    },
    {
      label: 'AI Learning',
      items: [
        { text: 'AI Tutor', icon: <AiTutorIcon />, path: '/ai-tutor' },
        { text: 'Study Assistant', icon: <StudyAssistantIcon />, path: '/study-assistant' },
        { text: 'Chat History', icon: <ChatHistoryIcon />, path: '/chat-history' },
      ],
    },
  ];

  const supportItems = [
    { text: 'Help Center', path: '/help' },
    { text: 'Settings', path: '/settings' },
  ];

  const unreadNotificationCount = notifications.filter((n) => !n.is_read).length;

  const isCourseView = location.pathname.startsWith('/course/');

  useEffect(() => {
    const fetchProgress = async () => {
      if (isCourseView && courseId) {
        try {
          const res = await api.get(`/courses/${courseId}/enrollment_status/`);
          if (typeof res.data.progress_percent === 'number') {
            setCourseProgress(Math.round(res.data.progress_percent));
          }
        } catch (e) {
          // Optionally handle error
        }
      }
    };
    fetchProgress();
  }, [isCourseView, courseId, setCourseProgress]);

  useEffect(() => {
    fetchNotifications();
    fetchCreditPoints();
    const interval = setInterval(fetchLiveNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const expanded = drawerOpen || railHovered;

  return (
    <CourseProgressProvider>
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <CssBaseline />

      {/* AppBar — same background, border, and morphing logo/hamburger motion as AdminLayout */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: '100%',
          backgroundColor: SURFACE_BG,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderRadius: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderBottom: `1px solid ${APPBAR_BORDER}`,
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Tooltip title={drawerOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}>
            <Box
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
              onClick={toggleDrawer}
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
                      <SchoolIcon sx={{ color: '#ffffff', fontSize: 18 }} />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Tooltip>

          {/* Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mr: 3 }}>
            <Typography
              sx={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: -0.2,
                whiteSpace: 'nowrap',
              }}
            >
              VDart Academy
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Search bar (student-specific, kept, colors updated to match) */}
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: { xs: 'none', md: 'block' }, width: 260, mr: 1 }}>
            <TextField
              size="small"
              placeholder="Search courses..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 19, color: NAV_TEXT }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '10px',
                  backgroundColor: NAV_HOVER_BG,
                  fontSize: 14,
                  '& fieldset': { border: 'none' },
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Saved courses">
              <IconButton sx={{ color: '#374151' }}>
                <StarBorderRoundedIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Credit Points">
              <Box
                sx={{
                  minWidth: 36,
                  height: 36,
                  px: 1.25,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1, color: 'inherit' }}>
                  {creditPoints}
                </Typography>
              </Box>
            </Tooltip>

            {/* Notifications — with the same pulse-on-count-change motion as AdminLayout */}
            <IconButton onClick={handleNotificationClick} sx={{ color: '#374151' }}>
              <motion.div
                key={unreadNotificationCount}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <Badge
                  variant={unreadNotificationCount > 0 ? 'dot' : undefined}
                  badgeContent={unreadNotificationCount}
                  color="error"
                >
                  <NotificationsNoneRoundedIcon sx={{ fontSize: 22 }} />
                </Badge>
              </motion.div>
            </IconButton>

            {/* Avatar — same hover/tap micro-interaction as AdminLayout */}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                <Avatar
                  src={user?.profile_picture || undefined}
                  imgProps={{ referrerPolicy: 'no-referrer' }}
                  sx={{ bgcolor: NAV_ACTIVE_BG, width: 36, height: 36, fontSize: '0.9rem' }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
              </motion.div>
            </IconButton>
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: { borderRadius: 3, boxShadow: 6, minWidth: 320, p: 2, mt: 1.5, overflow: 'visible' }
            }}
          >
            <Box sx={{ p: 3, pt: 4, pb: 4, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', background: theme.palette.background.paper, color: theme.palette.text.primary }}>
              <Avatar
                src={user?.profile_picture || undefined}
                imgProps={{ referrerPolicy: 'no-referrer' }}
                sx={{ bgcolor: NAV_ACTIVE_BG, width: 72, height: 72, mb: 1.5, fontSize: 32 }}
              >
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                {user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user?.email}
              </Typography>
              <Box sx={{ width: '100%', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <b>First Name:</b> {user?.first_name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <b>Last Name:</b> {user?.last_name || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <b>Team:</b> {user?.team?.name || 'No Team'}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ p: 2, pt: 1 }}>
              <Button
                variant="contained"
                fullWidth
                sx={{ mb: 1, borderRadius: 2, fontWeight: 600, backgroundColor: NAV_ACTIVE_BG, '&:hover': { backgroundColor: '#312e81' } }}
                onClick={openProfileDialog}
              >
                Edit Profile
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{ borderRadius: 2, fontWeight: 600, borderColor: BORDER_COLOR, color: NAV_ACTIVE_BG }}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Box>
          </Menu>

          {/* Notification Dropdown — same list-item enter/exit motion as AdminLayout */}
          <Menu
            anchorEl={notificationAnchorEl}
            open={Boolean(notificationAnchorEl)}
            onClose={handleNotificationClose}
            PaperProps={{ sx: { borderRadius: 3, boxShadow: 6, minWidth: 320, maxHeight: 400, overflow: 'auto', mt: 1.5 } }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight={700}>Notifications</Typography>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {loadingNotifications ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Loading notifications...</Typography>
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No new notifications</Typography>
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
                          p: 2,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          cursor: 'pointer',
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
                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: NAV_ACTIVE_BG }}>
                              {notification.sender_username}
                            </Typography>
                          </Box>
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.is_read ? 400 : 500,
                            color: notification.is_read ? 'text.secondary' : 'text.primary',
                            mb: 0.5
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {new Date(notification.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </Box>
          </Menu>

          <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
            <UserProfile user={user} onClose={() => setProfileOpen(false)} />
          </Dialog>
        </Toolbar>
      </AppBar>

      {/* Sidebar — same background, active-pill color, rail-hover shadow, and
          staggered nav-item entrance motion as AdminLayout */}
      <Drawer
        variant="permanent"
        onMouseEnter={() => !drawerOpen && setRailHovered(true)}
        onMouseLeave={() => setRailHovered(false)}
        sx={{
          width: expanded ? expandedWidth : collapsedWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'width 0.25s ease',
          '& .MuiDrawer-paper': {
            mt: '64px',
            width: expanded ? expandedWidth : collapsedWidth,
            height: 'calc(100% - 64px)',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            background: SURFACE_BG,
            color: NAV_TEXT,
            transition: 'width 0.25s ease',
            border: 'none',
            borderRight: `1px solid ${BORDER_COLOR}`,
            boxShadow: railHovered && !drawerOpen ? '4px 0 24px rgba(0,0,0,0.10)' : 'none',
            zIndex: theme.zIndex.drawer,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }
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
                  <Box sx={{ my: 1, mx: 1, borderTop: `1px solid ${BORDER_COLOR}` }} />
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
                            flexShrink: 0,
                            width: 22,
                          }}
                        >
                          {item.iconAsset ? (
                            <Box
                              component="span"
                              sx={{
                                width: item.iconWidth,
                                height: item.iconHeight,
                                display: 'inline-block',
                                flexShrink: 0,
                                backgroundColor: isActive ? '#ffffff' : NAV_ICON,
                                WebkitMaskImage: `url(${item.iconAsset})`,
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                WebkitMaskSize: 'contain',
                                maskImage: `url(${item.iconAsset})`,
                                maskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                maskSize: 'contain',
                              }}
                            />
                          ) : (
                            React.cloneElement(item.icon, { sx: { fontSize: 20 } })
                          )}
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

          {/* Support & Settings */}
          <Box sx={{ mt: 1.5 }}>
            {expanded && (
              <Typography
                sx={{
                  px: 1.5,
                  pb: 0.75,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: NAV_SECTION_LABEL,
                }}
              >
                Support &amp; Settings
              </Typography>
            )}
            <List sx={{ p: 0 }}>
              {supportItems.map((item) => (
                <Tooltip key={item.text} title={!expanded ? item.text : ''} placement="right">
                  <MotionListItemButton
                    onClick={() => navigate(item.path)}
                    variants={navItemEnter}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    sx={{
                      justifyContent: expanded ? 'flex-start' : 'center',
                      px: expanded ? 2 : 0,
                      py: 0.9,
                      my: 0.3,
                      minHeight: 40,
                      borderRadius: '12px',
                      color: NAV_TEXT,
                      '&:hover': { backgroundColor: NAV_HOVER_BG },
                    }}
                  >
                    {expanded && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 500 }}
                      />
                    )}
                  </MotionListItemButton>
                </Tooltip>
              ))}
            </List>
          </Box>
        </MotionBox>

        {/* User profile at bottom — same treatment as AdminLayout's footer block */}
        {expanded && (
          <Box
            sx={{
              px: 2,
              py: 1.75,
              borderTop: `1px solid ${BORDER_COLOR}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              '&:hover': { backgroundColor: NAV_HOVER_BG },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar
              src={user?.profile_picture || undefined}
              imgProps={{ referrerPolicy: 'no-referrer' }}
              sx={{ bgcolor: NAV_ACTIVE_BG, width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', lineHeight: 1.3 }} noWrap>
                {user?.username || 'Student'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.3 }} noWrap>
                Student
              </Typography>
            </Box>
            <KeyboardArrowDown sx={{ color: '#9ca3af', fontSize: 18, flexShrink: 0 }} />
          </Box>
        )}
      </Drawer>

      {/* Main content + footer — unchanged from before */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          boxSizing: 'border-box',
          mt: '64px',
        }}
      >
        <Box sx={{ flexGrow: 1, background: STUDENT_SURFACE_BACKGROUND }}>
          <Outlet context={{ drawerOpen, creditPoints, refreshCreditPoints: fetchCreditPoints }} />
        </Box>
        <Box sx={{
          background: '#ffffff',
          color: NAV_TEXT,
          textAlign: 'center',
          borderTop: `1px solid ${BORDER_COLOR}`,
          py: 3,
          flexShrink: 0,
        }}>
          <Typography variant="body2" sx={{ color: NAV_TEXT, fontWeight: 500 }}>
            © {new Date().getFullYear()} YourLMS. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
    </CourseProgressProvider>
  );
};

export default StudentLayout;