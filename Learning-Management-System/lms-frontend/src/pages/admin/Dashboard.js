import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Person,
  MenuBook,
  Groups,
  Assignment,
  AccessTime,
  CheckCircle,
  ArrowForward,
  UndoRounded,
} from '@mui/icons-material';
import api from '../../api';

// ---- tiny inline sparkline (no chart library dependency) ----
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

const STAT_CARD_META = {
  totalUsers: {
    title: 'Total Users',
    icon: <Person sx={{ fontSize: 20 }} />,
    iconBg: '#e6f4ea',
    iconColor: '#1a7f3c',
    trendColor: '#16a34a',
    trendBg: '#e6f4ea',
    // Placeholder trend data — wire up to real historical stats when available
    sparkline: [3, 5, 4, 7, 6, 9, 8],
    changeLabel: '+12.5%',
  },
  activeCourses: {
    title: 'Active Courses',
    icon: <MenuBook sx={{ fontSize: 20 }} />,
    iconBg: '#e8f0fe',
    iconColor: '#1a56db',
    trendColor: '#2563eb',
    trendBg: '#e8f0fe',
    sparkline: [4, 4, 5, 4, 6, 5, 6],
    changeLabel: '+3.2%',
  },
  totalTeams: {
    title: 'Total Teams',
    icon: <Groups sx={{ fontSize: 20 }} />,
    iconBg: '#fdeee3',
    iconColor: '#c2570b',
    trendColor: '#ea7c1e',
    trendBg: '#fdeee3',
    sparkline: [2, 3, 3, 5, 4, 7, 8],
    changeLabel: '+18.1%',
  },
  totalEnrollments: {
    title: 'Total Enrollments',
    icon: <Assignment sx={{ fontSize: 20 }} />,
    iconBg: '#ede9fe',
    iconColor: '#5b21b6',
    trendColor: '#7c3aed',
    trendBg: '#ede9fe',
    sparkline: [5, 6, 6, 7, 9, 8, 10],
    changeLabel: '+24.0%',
  },
};

const StatCard = ({ statKey, value }) => {
  const meta = STAT_CARD_META[statKey];
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        transition: 'all 0.2s ease-in-out',
        '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
      }}
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
            <Sparkline points={meta.sparkline} color={meta.trendColor} />
            <Chip
              label={meta.changeLabel}
              size="small"
              sx={{
                bgcolor: meta.trendBg,
                color: meta.trendColor,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 20,
              }}
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
    </Card>
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
  <Paper
    variant="outlined"
    sx={{
      p: 1.75,
      mb: 1.5,
      borderRadius: '12px',
      border: 'none',
      bgcolor: 'grey.50',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      transition: 'all 0.15s ease-in-out',
      '&:hover': { bgcolor: 'grey.100' },
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
      <Chip
        label="NEW"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
      />
    )}
  </Paper>
);

const CompletionItem = ({ user, course, date }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.75,
      mb: 1.5,
      borderRadius: '12px',
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      transition: 'all 0.15s ease-in-out',
      '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
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
        sx={{
          bgcolor: '#e6f4ea',
          color: '#16a34a',
          fontWeight: 700,
          fontSize: '0.65rem',
          height: 20,
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
        {timeAgo(date)}
      </Typography>
    </Stack>
  </Paper>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get('/admin/dashboard-stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading dashboard...
        </Typography>
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
  // Completion rate: use API value if present, otherwise derive a simple ratio as a fallback
  const completionRate =
    stats.completionRate ??
    (stats.totalEnrollments
      ? Math.round((completions.length / Math.max(enrollments.length + completions.length, 1)) * 100)
      : 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f6f7fb' }}>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard statKey="totalUsers" value={stats.totalUsers ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard statKey="activeCourses" value={stats.activeCourses ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard statKey="totalTeams" value={stats.totalTeams ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard statKey="totalEnrollments" value={stats.totalEnrollments ?? 0} />
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 4 },
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'divider',
          width: '100%',
        }}
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

        <Grid container spacing={4}>
          {/* Latest Enrollments */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                color: '#059669',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                letterSpacing: '0.06em',
              }}
            >
              <MenuBook sx={{ fontSize: 18 }} />
              Latest Enrollments
            </Typography>

            {enrollments.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {enrollments.map((enrollment) => (
                  <EnrollmentItem
                    key={enrollment.id}
                    user={enrollment.user?.username}
                    course={enrollment.course?.title}
                    date={enrollment.enrolled_on}
                  />
                ))}
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{
                    mt: 1,
                    borderRadius: '12px',
                    borderStyle: 'dashed',
                    textTransform: 'none',
                    color: 'text.secondary',
                    borderColor: 'divider',
                  }}
                >
                  Load More Activity
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
                sx={{
                  fontWeight: 700,
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  letterSpacing: '0.06em',
                }}
              >
                <UndoRounded sx={{ fontSize: 18, transform: 'scaleX(-1)' }} />
                Latest Course Completions
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textDecoration: 'underline', cursor: 'pointer' }}
              >
                View All History
              </Typography>
            </Stack>

            {completions.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {completions.map((completion) => (
                  <CompletionItem
                    key={completion.id}
                    user={completion.user?.username}
                    course={completion.course?.title}
                    date={completion.completed_on}
                  />
                ))}
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
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={90}
                  thickness={4}
                  sx={{ color: 'grey.200', position: 'absolute' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={completionRate}
                  size={90}
                  thickness={4}
                  sx={{ color: '#7c3aed' }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  bgcolor: '#111827',
                  '&:hover': { bgcolor: '#1f2937' },
                }}
              >
                View Full History
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;