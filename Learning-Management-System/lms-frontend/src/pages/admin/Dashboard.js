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
} from '@mui/material';
import {
  Person,
  MenuBook,
  Groups,
  Assignment,
  AccessTime,
  CheckCircle,
  ArrowForward,
} from '@mui/icons-material';
import api from '../../api';

// ---------------------------------------------------------------------------
// DEMO MODE — flip this to `true` locally to prove the % calculation is real.
// Keep `false` in any shipped build; consider gating with an env var instead
// of a hardcoded flag before this reaches production.
// ---------------------------------------------------------------------------
const DEMO_MODE = false;

const DEMO_STATS = {
  totalUsers: 12,
  totalUsersPrevMonth: 8,
  totalUsersThisMonth: 12,
  activeCourses: 4,
  activeCoursesPrevMonth: 5,
  activeCoursesThisMonth: 4,
  totalTeams: 3,
  totalTeamsPrevMonth: 3,
  totalTeamsThisMonth: 3,
  totalEnrollments: 34,
  totalEnrollmentsPrevMonth: 20,
  totalEnrollmentsThisMonth: 34,
  completionRate: 62,
  recentEnrollments: [],
  recentCompletions: [],
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

// ---- tiny inline sparkline ----
const Sparkline = ({ points = [], color = '#16a34a' }) => {
  if (!points.length) return null;
  const w = 70;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1 || 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={path} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---- Percentage-change calculation: previous month vs this month ----
// prevMonthValue: total as of end of last month (0 if no data)
// thisMonthValue: current running total for this month
// Returns null only when thisMonthValue is missing entirely.
// FIX: a 0 -> 0 change is now flagged neutral (isPositive: null) instead of
// being colored as a "positive" trend, since nothing actually increased.
const computeChange = (prevMonthValue, thisMonthValue) => {
  if (thisMonthValue === undefined || thisMonthValue === null) return null;

  const prev = prevMonthValue ?? 0;
  const current = thisMonthValue;

  if (prev === 0) {
    if (current === 0) return { pct: 0, label: '0.0%', isPositive: null };
    return { pct: 100, label: '+100.0%', isPositive: true };
  }

  const pct = ((current - prev) / prev) * 100;
  const sign = pct > 0 ? '+' : '';
  return {
    pct,
    label: `${sign}${pct.toFixed(1)}%`,
    isPositive: pct > 0 ? true : pct < 0 ? false : null,
  };
};

const STAT_CARD_META = {
  totalUsers: {
    title: 'Total Users',
    icon: <Person sx={{ fontSize: 20 }} />,
    iconBg: '#e6f4ea',
    iconColor: '#1a7f3c',
    positiveTrendColor: '#16a34a',
    positiveTrendBg: '#e6f4ea',
  },
  activeCourses: {
    title: 'Active Courses',
    icon: <MenuBook sx={{ fontSize: 20 }} />,
    iconBg: '#e8f0fe',
    iconColor: '#1a56db',
    positiveTrendColor: '#2563eb',
    positiveTrendBg: '#e8f0fe',
  },
  totalTeams: {
    title: 'Total Teams',
    icon: <Groups sx={{ fontSize: 20 }} />,
    iconBg: '#fdeee3',
    iconColor: '#c2570b',
    positiveTrendColor: '#ea7c1e',
    positiveTrendBg: '#fdeee3',
  },
  totalEnrollments: {
    title: 'Total Enrollments',
    icon: <Assignment sx={{ fontSize: 20 }} />,
    iconBg: '#ede9fe',
    iconColor: '#5b21b6',
    positiveTrendColor: '#7c3aed',
    positiveTrendBg: '#ede9fe',
  },
};

const NEGATIVE_TREND_COLOR = '#dc2626';
const NEGATIVE_TREND_BG = '#fdecea';
const NEUTRAL_TREND_COLOR = '#6b7280';
const NEUTRAL_TREND_BG = '#f3f4f6';

const StatCard = ({ statKey, value, prevMonthValue, thisMonthValue }) => {
  const meta = STAT_CARD_META[statKey];

  const effectiveThisMonth = thisMonthValue ?? value ?? 0;
  const effectivePrevMonth = prevMonthValue ?? 0;

  const change = computeChange(effectivePrevMonth, effectiveThisMonth);

  let trendColor = meta.positiveTrendColor;
  let trendBg = meta.positiveTrendBg;
  if (change) {
    if (change.isPositive === true) {
      trendColor = meta.positiveTrendColor;
      trendBg = meta.positiveTrendBg;
    } else if (change.isPositive === false) {
      trendColor = NEGATIVE_TREND_COLOR;
      trendBg = NEGATIVE_TREND_BG;
    } else {
      trendColor = NEUTRAL_TREND_COLOR;
      trendBg = NEUTRAL_TREND_BG;
    }
  }

  const sparklinePoints = [effectivePrevMonth, effectiveThisMonth];

  return (
    <MotionCard
      elevation={0}
      variants={cardEnter}
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: '16px' }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box
            sx={{
              bgcolor: meta.iconBg,
              color: meta.iconColor,
              width: 44,
              height: 44,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {meta.icon}
          </Box>
          <Stack alignItems="flex-end" spacing={0.5}>
            <Sparkline points={sparklinePoints} color={trendColor} />
            <Chip
              label={change ? change.label : '0.0%'}
              size="small"
              sx={{ bgcolor: trendBg, color: trendColor, fontWeight: 700, fontSize: '0.7rem', height: 20 }}
            />
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
          {meta.title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          {value}
        </Typography>
      </CardContent>
    </MotionCard>
  );
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

const isRecent = (dateStr) => {
  if (!dateStr) return false;
  const diffHours = (Date.now() - new Date(dateStr).getTime()) / 36e5;
  return diffHours >= 0 && diffHours < 24;
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
  return `${days} days ago`;
};

const EnrollmentItem = ({ user, course, date }) => (
  <MotionPaper
    variant="outlined"
    layout
    variants={listItemEnter}
    initial="hidden"
    animate="visible"
    exit="exit"
    whileHover={{ backgroundColor: '#f0f1f5' }}
    sx={{
      p: 1.75,
      mb: 1.5,
      borderRadius: '12px',
      border: 'none',
      bgcolor: 'grey.50',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
    }}
  >
    <Avatar sx={{ width: 38, height: 38, bgcolor: avatarColorFromString(user || ''), fontSize: '0.85rem' }}>
      {getInitials(user)}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
        <Box component="span" sx={{ color: '#059669', fontWeight: 700 }}>
          {user}
        </Box>
        {' enrolled in '}
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
          {course}
        </Box>
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
        <AccessTime sx={{ fontSize: 13, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary">
          {date ? new Date(date).toLocaleString() : ''}
        </Typography>
      </Stack>
    </Box>
    {isRecent(date) && (
      <Chip label="NEW" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
    )}
  </MotionPaper>
);

const CompletionItem = ({ user, course, date }) => (
  <MotionPaper
    variant="outlined"
    layout
    variants={listItemEnter}
    initial="hidden"
    animate="visible"
    exit="exit"
    whileHover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    sx={{
      p: 1.75,
      mb: 1.5,
      borderRadius: '12px',
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
    }}
  >
    <Box sx={{ position: 'relative' }}>
      <Avatar sx={{ width: 40, height: 40, bgcolor: avatarColorFromString(user || ''), fontSize: '0.9rem' }}>
        {getInitials(user)}
      </Avatar>
      <CheckCircle
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          fontSize: 15,
          color: '#16a34a',
          bgcolor: 'background.paper',
          borderRadius: '50%',
        }}
      />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
        {user}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        Completed: {course}
      </Typography>
    </Box>
    <Stack alignItems="flex-end" spacing={0.25}>
      <Chip
        label="VERIFIED"
        size="small"
        sx={{ bgcolor: '#e6f4ea', color: '#16a34a', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
        {timeAgo(date)}
      </Typography>
    </Stack>
  </MotionPaper>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Separate, non-blocking error state for background refreshes. A failed
  // refresh must never tear down an already-loaded dashboard — it should
  // just surface a dismissible warning, not replace the whole page with the
  // full-screen error state (that's reserved for the initial load failing).
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  // Single shared mount flag instead of a fresh isMounted() closure created
  // per call — avoids leaking a stale closure if the component unmounts
  // while a manually-triggered refresh is still in flight.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // `silent: true` is used for background refreshes (e.g. the "Refresh
  // Activity" button): errors go to `refreshError` and never touch the
  // page-blocking `error`/`loading` state, so the existing dashboard stays
  // visible even if the refresh itself fails.
  const fetchDashboardStats = useCallback(async ({ silent = false } = {}) => {
    if (DEMO_MODE) {
      if (isMountedRef.current) {
        setStats(DEMO_STATS);
        if (silent) {
          setRefreshError(null);
          setRefreshing(false);
        } else {
          setError(null);
          setLoading(false);
        }
      }
      return;
    }

    try {
      const response = await api.get('/admin/dashboard-stats/');
      if (isMountedRef.current) {
        setStats(response.data);
        if (silent) setRefreshError(null);
        else setError(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      if (isMountedRef.current) {
        const message = 'Unable to load dashboard data. Please try refreshing the page.';
        if (silent) setRefreshError(message);
        else setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // NOTE: this refetches the same latest-activity snapshot from
  // /admin/dashboard-stats/ — there's no pagination/offset support on that
  // endpoint, so it can only ever refresh the same "latest N" items, not
  // append additional older ones. It's exposed as "Refresh Activity" (not
  // "Load More") to match what it actually does; wire up real pagination
  // here if the backend adds offset/cursor support later.
  const handleRefreshActivity = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchDashboardStats({ silent: true });
  }, [fetchDashboardStats, refreshing]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" sx={{ p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No data available
          </Typography>
        </Paper>
      </Box>
    );
  }

  const enrollments = stats.recentEnrollments || [];
  const completions = stats.recentCompletions || [];

  // FIX: previously this derived a fallback "completion rate" from
  // completions.length / (enrollments.length + completions.length), which is
  // just the ratio of items in the *recent activity feed* — not a real
  // completion rate. That produced numbers with no relationship to actual
  // course-completion performance. Now we trust the API's real
  // completionRate and default to 0 (clearly "no data") rather than fabricate
  // a number. Clamped to 0-100 so a bad/unexpected API value can't send the
  // CircularProgress indicator out of its valid range.
  const completionRate = Math.min(100, Math.max(0, stats.completionRate ?? 0));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f6f7fb' }}>
      {/* Stats Cards */}
      <MotionBox
        component={Grid}
        container
        spacing={3}
        sx={{ mb: 3 }}
        variants={containerStagger}
        initial="hidden"
        animate="visible"
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            statKey="totalUsers"
            value={stats.totalUsers ?? 0}
            prevMonthValue={stats.totalUsersPrevMonth}
            thisMonthValue={stats.totalUsersThisMonth}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            statKey="activeCourses"
            value={stats.activeCourses ?? 0}
            prevMonthValue={stats.activeCoursesPrevMonth}
            thisMonthValue={stats.activeCoursesThisMonth}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            statKey="totalTeams"
            value={stats.totalTeams ?? 0}
            prevMonthValue={stats.totalTeamsPrevMonth}
            thisMonthValue={stats.totalTeamsThisMonth}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            statKey="totalEnrollments"
            value={stats.totalEnrollments ?? 0}
            prevMonthValue={stats.totalEnrollmentsPrevMonth}
            thisMonthValue={stats.totalEnrollmentsThisMonth}
          />
        </Grid>
      </MotionBox>

      {/* Recent Activity Section */}
      <MotionPaper
        elevation={0}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        sx={{ p: { xs: 2.5, md: 4 }, borderRadius: '20px', border: '1px solid', borderColor: 'divider', width: '100%' }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            Recent Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Latest enrollments and course completions overview across the platform.
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {refreshError && (
          <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setRefreshError(null)}>
            {refreshError}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Latest Enrollments */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: '#059669', mb: 2, display: 'flex', alignItems: 'center', gap: 1, letterSpacing: '0.06em' }}
            >
              <MenuBook sx={{ fontSize: 18 }} />
              Latest Enrollments
            </Typography>

            {enrollments.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                <AnimatePresence initial>
                  {enrollments.map((enrollment) => (
                    <EnrollmentItem
                      key={enrollment.id}
                      user={enrollment.user?.username}
                      course={enrollment.course?.title}
                      date={enrollment.enrolled_on}
                    />
                  ))}
                </AnimatePresence>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleRefreshActivity}
                  disabled={refreshing}
                  startIcon={refreshing ? <CircularProgress size={14} thickness={5} /> : null}
                  sx={{ mt: 1, borderRadius: '12px', borderStyle: 'dashed', textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh Activity'}
                </Button>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', mt: 2, borderRadius: '12px' }}>
                <Typography variant="body1" color="text.secondary">
                  No recent enrollments
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* Latest Course Completions */}
          <Grid size={{ xs: 12, lg: 6 }} sx={{ borderLeft: { lg: '1px solid' }, borderColor: { lg: 'divider' }, pl: { lg: 4 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 700, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 1, letterSpacing: '0.06em' }}
              >
                <CheckCircle sx={{ fontSize: 18 }} />
                Latest Course Completions
              </Typography>
            </Stack>

            {completions.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                <AnimatePresence initial>
                  {completions.map((completion) => (
                    <CompletionItem
                      key={completion.id}
                      user={completion.user?.username}
                      course={completion.course?.title}
                      date={completion.completed_on}
                    />
                  ))}
                </AnimatePresence>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', mt: 2, borderRadius: '12px' }}>
                <Typography variant="body1" color="text.secondary">
                  No recent course completions
                </Typography>
              </Paper>
            )}

            {/* Completion rate donut */}
            <Stack alignItems="center" spacing={1.5} sx={{ mt: 4, mb: 1 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={100} size={90} thickness={4} sx={{ color: 'grey.200', position: 'absolute' }} />
                <CircularProgress variant="determinate" value={completionRate} size={90} thickness={4} sx={{ color: '#7c3aed' }} />
                <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {completionRate}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Overall completion rate
              </Typography>
              <Button
                variant="contained"
                endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                sx={{ borderRadius: '10px', textTransform: 'none', bgcolor: '#111827', '&:hover': { bgcolor: '#1f2937' } }}
              >
                View Full History
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </MotionPaper>
    </Box>
  );
};

export default AdminDashboard;