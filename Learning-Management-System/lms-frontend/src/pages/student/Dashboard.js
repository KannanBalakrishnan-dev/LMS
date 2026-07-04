import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import Container from '@mui/material';

import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    LinearProgress,
    CircularProgress,
    Tooltip,
    useTheme,
    Container,
} from '@mui/material';
import { Avatar, Rating } from '@mui/material';
import {
    Check as CheckIcon,
    School as SchoolIcon,
    LocalFireDepartment as LocalFireDepartmentIcon,
    MenuBook as MenuBookIcon,
    Star as StarIcon,
    TrendingUpRounded as TrendingUpRoundedIcon,
    PendingActionsRounded as PendingActionsRoundedIcon,
    TaskAltRounded as TaskAltRoundedIcon,
    PersonAddAlt1Rounded as PersonAddAlt1RoundedIcon,
    NorthEast as NorthEastIcon,
    EmojiEvents as EmojiEventsIcon,
    NotificationsActive as NotificationsActiveIcon,
    RocketLaunchRounded as RocketLaunchRoundedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';


const formatStatNumber = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return '00';
    }

    const roundedValue = Math.max(0, Math.round(numericValue));
    return roundedValue < 100 ? String(roundedValue).padStart(2, '0') : String(roundedValue);
};

const StatCard = ({ title, value, icon, accent, badge }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                height: '100%',
                minHeight: { xs: 108, sm: 118 },
                borderRadius: '16px',
                p: { xs: 1.75, sm: 2 },
                background: theme.palette.mode === 'dark' ? '#16233a' : '#FFFFFF',
                border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(148, 163, 184, 0.14)'
                    : '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 2px 10px rgba(0,0,0,0.3)'
                    : '0 2px 10px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 1,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 22px rgba(0,0,0,0.38)'
                        : '0 10px 24px rgba(15, 23, 42, 0.1)',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '10px',
                        background: accent.soft,
                        color: accent.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {React.cloneElement(icon, { sx: { fontSize: 19, color: accent.main } })}
                </Box>
                {badge ? (
                    <Box
                        sx={{
                            px: 1.1,
                            py: 0.3,
                            borderRadius: '999px',
                            background: accent.soft,
                            color: accent.main,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {badge}
                    </Box>
                ) : null}
            </Box>
            <Box>
                <Typography
                    sx={{
                        color: theme.palette.mode === 'dark' ? '#f8fafc' : '#0f172a',
                        fontSize: { xs: '1.5rem', sm: '1.65rem' },
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        mb: 0.4,
                    }}
                >
                    {value}
                </Typography>
                <Typography
                    sx={{
                        color: theme.palette.mode === 'dark' ? 'rgba(226, 232, 240, 0.65)' : '#64748b',
                        fontSize: { xs: '0.78rem', sm: '0.82rem' },
                        fontWeight: 600,
                    }}
                >
                    {title}
                </Typography>
            </Box>
        </Paper>
    );
};

const AttendanceCard = ({ attendance }) => {
    const theme = useTheme();
    const clampedAttendance = Math.max(0, Math.min(100, attendance));
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const dash = (circumference * clampedAttendance) / 100;

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.5, sm: 2 },
                minHeight: { xs: 260, sm: 290 },
                borderRadius: '24px',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(19, 47, 76, 0.96) 0%, rgba(12, 30, 51, 0.98) 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(148, 163, 184, 0.18)'
                    : '1px solid rgba(148, 163, 184, 0.22)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 16px 32px rgba(0, 0, 0, 0.28)'
                    : '0 18px 34px rgba(15, 23, 42, 0.08), 0 8px 16px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 1.5,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, fontWeight: 500, color: '#111' }}>
                    Attendance
                </Typography>
                <NorthEastIcon sx={{ fontSize: 20, color: '#111' }} />
            </Box>

            <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: { xs: 130, sm: 150 } }}>
                <svg viewBox="0 0 180 180" width="100%" height="170" preserveAspectRatio="xMidYMid meet">
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="#232323" strokeWidth="20" opacity="0.95" />
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="none"
                        stroke="#2f7cc1"
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        transform="rotate(-90 90 90)"
                    />
                </svg>
                <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: { xs: '1.8rem', sm: '2rem' }, fontWeight: 700, color: '#4b4a64', lineHeight: 1 }}>
                        {clampedAttendance}%
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#8b8ba7', mt: 0.25 }}>
                        Performance
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: '14px', background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
                            <CheckIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, fontWeight: 700, color: '#4b4a64', lineHeight: 1 }}>
                                90%
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: '#8b8ba7', mt: 0.25 }}>
                                Respond rate
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: '14px', background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
                            <SchoolIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, fontWeight: 700, color: '#4b4a64', lineHeight: 1 }}>
                                1.298
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: '#8b8ba7', mt: 0.25 }}>
                                Order completion
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Paper>
    );
};

// ---------------------------------------------------------------------------
// Learning Trends — real bar-chart derived from the student's own activity
// log, with a Week / Month toggle (mirrors the "Learning Trends" widget in
// the Stitch mockup).
// ---------------------------------------------------------------------------
const LearningTrendsCard = ({ activityLog }) => {
    const theme = useTheme();
    const [range, setRange] = useState('week'); // 'week' | 'month'

    const buckets = useMemo(() => {
        const log = Array.isArray(activityLog) ? activityLog : [];
        const now = new Date();
        const count = 12;

        if (range === 'week') {
            // last 12 days
            return Array.from({ length: count }, (_, i) => {
                const day = new Date(now);
                day.setHours(0, 0, 0, 0);
                day.setDate(day.getDate() - (count - 1 - i));
                const label = day.toLocaleDateString('en-US', { weekday: 'narrow' });
                const total = log.filter((item) => {
                    const ts = item?.timestamp ? new Date(item.timestamp) : null;
                    return ts && ts.toDateString() === day.toDateString();
                }).length;
                return { label, value: total };
            });
        }

        // last 12 months
        return Array.from({ length: count }, (_, i) => {
            const month = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
            const label = month.toLocaleDateString('en-US', { month: 'narrow' });
            const total = log.filter((item) => {
                const ts = item?.timestamp ? new Date(item.timestamp) : null;
                return ts && ts.getFullYear() === month.getFullYear() && ts.getMonth() === month.getMonth();
            }).length;
            return { label, value: total };
        });
    }, [activityLog, range]);

    const maxValue = Math.max(1, ...buckets.map((b) => b.value));
    const hasActivity = buckets.some((b) => b.value > 0);
    const highlightIndex = buckets.reduce(
        (best, b, i) => (b.value > buckets[best].value ? i : best),
        0
    );

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 2.5 },
                minHeight: { xs: 260, sm: 290 },
                borderRadius: '24px',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, rgba(19, 47, 76, 0.96) 0%, rgba(12, 30, 51, 0.98) 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(148, 163, 184, 0.18)'
                    : '1px solid rgba(148, 163, 184, 0.22)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 16px 32px rgba(0, 0, 0, 0.28)'
                    : '0 18px 34px rgba(15, 23, 42, 0.08), 0 8px 16px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#fff' : '#111' }}>
                        Learning Trends
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '0.76rem', sm: '0.82rem' }, color: '#8b8ba7', mt: 0.25 }}>
                        {range === 'week' ? 'Daily activity over the last 12 days' : 'Monthly activity over the last 12 months'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, background: 'rgba(148, 163, 184, 0.12)', borderRadius: '999px', p: 0.4 }}>
                    {['month', 'week'].map((key) => (
                        <Box
                            key={key}
                            role="button"
                            tabIndex={0}
                            onClick={() => setRange(key)}
                            sx={{
                                px: 1.4,
                                py: 0.45,
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                color: range === key ? '#fff' : '#8b8ba7',
                                background: range === key ? '#2563eb' : 'transparent',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {key}
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1.25 }, px: 0.5, pb: 1 }}>
                {buckets.map((bucket, index) => {
                    const heightPct = Math.max(6, Math.round((bucket.value / maxValue) * 100));
                    const isPeak = hasActivity && index === highlightIndex;
                    return (
                        <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6 }}>
                            <Tooltip title={`${bucket.value} activit${bucket.value === 1 ? 'y' : 'ies'}`} arrow>
                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 22,
                                        height: { xs: 90, sm: 120 },
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: `${heightPct}%`,
                                            borderRadius: '6px',
                                            background: isPeak
                                                ? 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)'
                                                : 'rgba(148, 163, 184, 0.28)',
                                            transition: 'height 0.3s ease',
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                            <Typography sx={{ fontSize: '0.62rem', color: '#8b8ba7', fontWeight: 600 }}>
                                {bucket.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};

// ---------------------------------------------------------------------------
// Notifications — surfaces the most recent real milestone (course completed)
// and the most time-sensitive item (a course still in progress) so the panel
// never fabricates data that doesn't exist in the schema.
// ---------------------------------------------------------------------------
const NotificationsCard = ({ items }) => {
    const theme = useTheme();
    const list = Array.isArray(items) ? items.slice(0, 3) : [];

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.75, sm: 2 },
                borderRadius: '20px',
                height: '100%',
                background: theme.palette.mode === 'dark' ? '#16233a' : '#FFFFFF',
                border: theme.palette.mode === 'dark'
                    ? '1px solid rgba(148, 163, 184, 0.14)'
                    : '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 2px 10px rgba(0,0,0,0.3)'
                    : '0 2px 10px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
            }}
        >
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: theme.palette.mode === 'dark' ? '#fff' : '#0f172a' }}>
                Notifications
            </Typography>

            {list.length === 0 ? (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.82rem', color: '#8b8ba7' }}>
                        You're all caught up — nothing new right now.
                    </Typography>
                </Box>
            ) : (
                list.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: item.accent.soft,
                                color: item.accent.main,
                            }}
                        >
                            {item.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: theme.palette.mode === 'dark' ? '#fff' : '#0f172a' }}>
                                {item.title}
                            </Typography>
                            <Typography noWrap sx={{ fontSize: '0.78rem', color: '#8b8ba7' }}>
                                {item.subtitle}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#a0a0b8', mt: 0.15 }}>
                                {item.meta}
                            </Typography>
                        </Box>
                    </Box>
                ))
            )}
        </Paper>
    );
};

// ---------------------------------------------------------------------------
// New Course promo — highlights the most recently added catalog course.
// ---------------------------------------------------------------------------
const NewCoursePromoCard = ({ course, onEnroll }) => {
    if (!course) return null;
    const title = course.title || course.name || 'New Course';

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 2.25 },
                borderRadius: '20px',
                height: '100%',
                background: 'linear-gradient(160deg, #0f1b30 0%, #16233F 60%, #1E3A6B 100%)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 1.5,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    alignSelf: 'flex-start',
                    px: 1.1,
                    py: 0.35,
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.12)',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.85)',
                }}
            >
                <RocketLaunchRoundedIcon sx={{ fontSize: 14 }} />
                New Course
            </Box>

            <Typography
                noWrap
                sx={{
                    fontSize: { xs: '1.15rem', sm: '1.3rem' },
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                }}
            >
                {title}
            </Typography>

            <Button
                variant="contained"
                onClick={() => onEnroll(course.id || course.course_id)}
                sx={{
                    alignSelf: 'flex-start',
                    px: 2.4,
                    py: 0.85,
                    borderRadius: '999px',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#12305F',
                    backgroundColor: '#FFFFFF',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#EDF3FF' },
                }}
            >
                Enroll Now
            </Button>
        </Paper>
    );
};


const CourseCatalogMarquee = ({ courses, isLoading, onCourseClick }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const courseList = Array.isArray(courses) ? courses : [];
    const isEmptyCatalog = !isLoading && courseList.length === 0;
    const shouldLoopCatalog = !isLoading && courseList.length > 0;

    const renderItems = (prefix = 'first') => {
        if (isLoading) {
            return (
                <Box
                    sx={{
                        minWidth: { xs: 180, sm: 220 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        whiteSpace: 'nowrap',
                        px: 1.5,
                        py: 0.8,
                        borderRadius: '999px',
                        opacity: 0.75,
                    }}
                >
                    <MenuBookIcon sx={{ fontSize: 20, color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d' }} />
                    <Typography
                        sx={{
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d',
                            fontSize: { xs: '0.88rem', sm: '0.95rem' },
                            fontWeight: 700,
                        }}
                    >
                        Loading courses...
                    </Typography>
                </Box>
            );
        }

        if (courseList.length === 0) {
            return (
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/catalog')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            navigate('/catalog');
                        }
                    }}
                    sx={{
                        minWidth: { xs: 210, sm: 250 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        px: 1.5,
                        py: 0.8,
                        borderRadius: '999px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            background: theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(25, 118, 210, 0.1)',
                            transform: 'scale(1.04)',
                        },
                    }}
                >
                    <MenuBookIcon sx={{ fontSize: 20, color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d' }} />
                    <Typography
                        sx={{
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d',
                            fontSize: { xs: '0.88rem', sm: '0.95rem' },
                            fontWeight: 800,
                        }}
                    >
                        Browse Course Catalog : 
                    </Typography>
                </Box>
            );
        }

        return (
            <>
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/catalog')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            navigate('/catalog');
                        }
                    }}
                    sx={{
                        minWidth: { xs: 210, sm: 260 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        px: 1.5,
                        py: 0.8,
                        borderRadius: '999px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            background: theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(25, 118, 210, 0.1)',
                            transform: 'scale(1.04)',
                        },
                    }}
                >
                    <Typography
                        sx={{
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d',
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            fontWeight: 900,
                            fontStyle: 'italic',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Course Catalog:
                    </Typography>
                </Box>

                {courseList.map((course, index) => (
                    <Box
                        key={`${prefix}-${course?.id || course?.course_id || index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onCourseClick(course?.id || course?.course_id)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                onCourseClick(course?.id || course?.course_id);
                            }
                        }}
                        sx={{
                            minWidth: { xs: 160, sm: 190, md: 220 },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            px: 1.5,
                            py: 0.8,
                            borderRadius: '999px',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                background: theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'rgba(25, 118, 210, 0.1)',
                                transform: 'scale(1.04)',
                            },
                        }}
                    >
                        <MenuBookIcon sx={{ fontSize: 20, color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d' }} />
                        <Typography
                            sx={{
                                color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a365d',
                                fontSize: { xs: '0.88rem', sm: '0.95rem' },
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {course?.title || course?.name || 'Untitled Course'}
                        </Typography>
                    </Box>
                ))}
            </>
        );
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(90deg, rgba(58, 85, 114, 0.95) 0%, rgba(63, 84, 109, 0.95) 100%)'
                    : 'linear-gradient(90deg, rgba(227, 242, 253, 0.95) 0%, rgba(187, 222, 251, 0.95) 100%)',
                py: 0,
                overflow: 'hidden',
                borderBottomLeftRadius: { xs: '28px', md: '36px' },
                borderBottomRightRadius: { xs: '28px', md: '36px' },
                minHeight: 42,
                zIndex: 2,
                borderTop: theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 -2px 8px rgba(0, 0, 0, 0.3)'
                    : '0 -2px 8px rgba(0, 0, 0, 0.1)',
                '&:hover .course-catalog-track': {
                    animationPlayState: 'paused',
                },
            }}
        >
            <Box
                className="course-catalog-track"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: 'max-content',
                    minWidth: shouldLoopCatalog ? '100%' : 'auto',
                    py: 0.35,
                    animation: shouldLoopCatalog
                        ? 'courseCatalogMarquee 40s linear infinite'
                        : isEmptyCatalog
                            ? 'courseCatalogSingle 14s linear infinite'
                            : 'none',
                    willChange: 'transform',
                    '@keyframes courseCatalogMarquee': {
                        '0%': { transform: 'translateX(0)' },
                        '100%': { transform: 'translateX(-50%)' },
                    },
                    '@keyframes courseCatalogSingle': {
                        '0%': { transform: 'translateX(100vw)' },
                        '100%': { transform: 'translateX(-100%)' },
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2.5, md: 3.5 }, pr: { xs: 1.5, sm: 2.5, md: 3.5 } }}>
                    {renderItems('first')}
                </Box>
                {shouldLoopCatalog && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2.5, md: 3.5 }, pr: { xs: 1.5, sm: 2.5, md: 3.5 } }} aria-hidden="true">
                        {renderItems('second')}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

const Banner = ({ user, stats, inProgressCourses, allCourses, isLoadingCourses, onCourseClick }) => {
    const navigate = useNavigate();

    const latestAddedCourse = useMemo(() => {
        if (!Array.isArray(allCourses) || allCourses.length === 0) {
            return null;
        }

        const toTimestamp = (course) => {
            const raw =
                course?.created_at ??
                course?.createdAt ??
                course?.created_on ??
                course?.createdOn ??
                course?.created;
            const ts = raw ? new Date(raw).getTime() : 0;
            return Number.isFinite(ts) ? ts : 0;
        };

        return [...allCourses].sort((a, b) => toTimestamp(b) - toTimestamp(a))[0] || null;
    }, [allCourses]);

    const resumeCourse = useMemo(() => {
        if (!Array.isArray(inProgressCourses) || inProgressCourses.length === 0) {
            return null;
        }

        return (
            inProgressCourses.find((course) => course?.progress_state === 'IN_PROGRESS') ||
            inProgressCourses.find((course) => course?.progress_state === 'NOT_STARTED') ||
            inProgressCourses[0] ||
            null
        );
    }, [inProgressCourses]);

    const displayName = (user?.first_name || user?.username || 'Learner').trim();
    const totalEnrollments = Number(stats?.totalEnrollments) || 0;
    const courseAvg = Math.round(Number(stats?.averageScore) || 0);
    const pendingCount = Number(stats?.inProgressCount) || 0;
    const hasNewCourse = Boolean(latestAddedCourse?.id) && !resumeCourse;

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const clampedAvg = Math.max(0, Math.min(100, courseAvg));
    const dash = (circumference * clampedAvg) / 100;

    const supportingText = totalEnrollments > 0
        ? `Take the first step toward your career goals. You have ${pendingCount} course${pendingCount === 1 ? '' : 's'} in progress${hasNewCourse ? ' and 1 new course recommendation.' : '.'}`
        : 'Start your first course and build steady progress toward your next certificate.';

    const streakLabel = (() => {
        const days = Number(stats?.streakDays);
        return Number.isFinite(days) && days > 0 ? `${days} Day Streak` : 'Day Streak';
    })();

    const handlePrimaryAction = () => {
        if (resumeCourse?.id) {
            onCourseClick(resumeCourse.id);
            return;
        }
        navigate('/catalog');
    };

    return (
        <Box
            sx={{
                width: '100%',
                mb: 4,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #16233F 0%, #1E3A6B 55%, #1B4CA0 100%)',
                boxShadow: '0 20px 44px rgba(15, 42, 96, 0.28)',
                px: { xs: 3, sm: 4, md: 5 },
                pt: { xs: 3.5, md: 4.5 },
                pb: { xs: 7, md: 7.5 },
                display: 'flex',
                alignItems: 'center',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 3, md: 4 },
            }}
        >
            <Box sx={{ flex: 1, position: 'relative', zIndex: 1, width: '100%' }}>
                <Box
                    sx={{
                        display: 'inline-block',
                        px: 1.4,
                        py: 0.4,
                        mb: 1.5,
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                    }}
                >
                    Academic Year {new Date().getFullYear()}
                </Box>

                <Typography
                    sx={{
                        color: '#FFFFFF',
                        fontSize: { xs: '2rem', sm: '2.4rem', md: '2.7rem' },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        mb: 1.25,
                    }}
                >
                    Welcome back, {displayName}!
                </Typography>

                <Typography
                    sx={{
                        color: 'rgba(226, 232, 245, 0.85)',
                        fontSize: { xs: '0.92rem', sm: '1rem' },
                        lineHeight: 1.55,
                        maxWidth: 520,
                        mb: 3,
                    }}
                >
                    {supportingText}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                    <Button
                        variant="contained"
                        onClick={handlePrimaryAction}
                        sx={{
                            px: 3.2,
                            py: 1.15,
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#12305F',
                            backgroundColor: '#FFFFFF',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: '#EDF3FF' },
                        }}
                    >
                        {resumeCourse ? 'Continue Learning' : 'Start Learning'}
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<LocalFireDepartmentIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            px: 2.4,
                            py: 1.1,
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            borderColor: 'rgba(255,255,255,0.28)',
                            color: '#FFFFFF',
                            '&:hover': { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.06)' },
                        }}
                    >
                        {streakLabel}
                    </Button>
                </Box>
            </Box>

            <Box sx={{ position: 'relative', width: { xs: 180, md: 210 }, height: { xs: 180, md: 210 }, flexShrink: 0 }}>
                <svg viewBox="0 0 180 180" width="100%" height="100%">
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="14" />
                    {clampedAvg > 0 && (
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${dash} ${circumference - dash}`}
                            transform="rotate(-90 90 90)"
                        />
                    )}
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: { xs: '1.7rem', md: '2rem' }, fontWeight: 800, lineHeight: 1 }}>
                        {clampedAvg}%
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', mt: 0.4 }}>
                        Course Avg.
                    </Typography>
                </Box>
            </Box>

            <CourseCatalogMarquee
                courses={allCourses}
                isLoading={isLoadingCourses}
                onCourseClick={onCourseClick}
            />
        </Box>
    );
};

const StudentDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [latestFeedback, setLatestFeedback] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [allCourses, setAllCourses] = useState([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [categories, setCategories] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [, setIsLoadingEnrollments] = useState(true);
    const [creditPointsData, setCreditPointsData] = useState({ total_credit_points: 0, courses: [] });
    const [isLoadingCreditPoints, setIsLoadingCreditPoints] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    const categoryNameById = useMemo(() => {
        return new Map(
            (categories || []).map((category) => [String(category?.id), String(category?.name || '').trim()])
        );
    }, [categories]);

    const resolveCourseCategoryNames = useCallback((course) => {
        const categoriesFromField = course?.categories ?? course?.category;

        if (Array.isArray(categoriesFromField)) {
            return categoriesFromField
                .map((item) => {
                    if (item && typeof item === 'object') {
                        const embeddedName = String(item.name || '').trim();
                        if (embeddedName) return embeddedName;
                        const embeddedId = String(item.id ?? '').trim();
                        return categoryNameById.get(embeddedId) || '';
                    }
                    return categoryNameById.get(String(item ?? '').trim()) || '';
                })
                .filter(Boolean);
        }

        if (categoriesFromField && typeof categoriesFromField === 'object') {
            const embeddedName = String(categoriesFromField.name || '').trim();
            if (embeddedName) return [embeddedName];

            const embeddedId = String(categoriesFromField.id ?? '').trim();
            const mappedName = categoryNameById.get(embeddedId);
            return mappedName ? [mappedName] : [];
        }

        if (categoriesFromField !== undefined && categoriesFromField !== null) {
            const mappedName = categoryNameById.get(String(categoriesFromField).trim());
            return mappedName ? [mappedName] : [];
        }

        return [];
    }, [categoryNameById]);

    const enrollmentCounts = useMemo(() => {
        // Treat backend auto-created NOT_STARTED (0%) enrollments as not yet enrolled/started for dashboard counts.
        const toNumber = (value) => {
            if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
            if (typeof value === 'string') {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : 0;
            }
            return 0;
        };

        const parseTimestamp = (enrollment) => {
            const raw =
                enrollment?.enrolled_at ??
                enrollment?.enrolledAt ??
                enrollment?.created_at ??
                enrollment?.createdAt ??
                enrollment?.created_on ??
                enrollment?.createdOn ??
                enrollment?.created;
            if (!raw) return null;
            const ts = new Date(raw).getTime();
            return Number.isFinite(ts) ? ts : null;
        };

        const recentWindowStart = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const base = { total: 0, inProgress: 0, completed: 0, recent: 0 };
        if (!Array.isArray(enrollments)) return base;

        return enrollments.reduce((acc, enrollment) => {
            if (!enrollment) return acc;

            const progressRaw = enrollment.progress ?? enrollment.enrollment_status ?? enrollment.enrollmentStatus ?? '';
            const progress = String(progressRaw).toUpperCase();
            const percent = toNumber(
                enrollment.progress_percent ??
                    enrollment.progressPercent ??
                    enrollment.overall_progress ??
                    enrollment.overallProgress
            );

            const isCompleted = progress === 'COMPLETED' || percent >= 100 || Boolean(enrollment.completed_on || enrollment.completedOn);
            const isStarted = percent > 0 || progress === 'BLOCKED';
            const enrolledTs = parseTimestamp(enrollment);

            if (isCompleted) acc.completed += 1;
            if (!isCompleted && isStarted) acc.inProgress += 1;
            if (enrolledTs && enrolledTs >= recentWindowStart) acc.recent += 1;
            acc.total += 1;

            return acc;
        }, base);
    }, [enrollments]);

    const effectiveTotalEnrollments = enrollmentCounts.total;
    const effectiveInProgressCount = enrollmentCounts.inProgress;
    const effectiveCompletedCount = enrollmentCounts.completed;
    const effectiveRecentEnrollmentCount = enrollmentCounts.recent;
    // Build progress list from real enrollments (same source as My Courses)
    // so dashboard always shows all enrolled course states.
    const effectiveInProgressCourses = useMemo(() => {
        const toNumber = (value) => {
            if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
            if (typeof value === 'string') {
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : 0;
            }
            return 0;
        };

        const normalizeState = (enrollment) => {
            const raw = enrollment?.progress ?? enrollment?.enrollment_status ?? enrollment?.enrollmentStatus ?? '';
            const normalized = String(raw).toUpperCase();
            return normalized || 'NOT_STARTED';
        };

        const stateOrder = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2, BLOCKED: 3 };

        // Build a lookup map from course id -> credit points using already-fetched creditPointsData
        const creditPointsByCourseId = new Map(
            (creditPointsData?.courses || []).map((c) => [String(c.id), toNumber(c.credit_points ?? c.points)])
        );

        return (enrollments || [])
            .filter((enrollment) => enrollment && enrollment.course)
            .map((enrollment) => {
                const percent = toNumber(
                    enrollment.progress_percent ??
                        enrollment.progressPercent ??
                        enrollment.overall_progress ??
                        enrollment.overallProgress
                );
                const progressState = normalizeState(enrollment);
                const categoryNames = resolveCourseCategoryNames(enrollment.course);
                const courseId = String(enrollment.course?.id ?? '');

                return {
                    ...enrollment.course,
                    progress_percent: percent,
                    progress_state: progressState,
                    category_names: categoryNames,
                    category_name: categoryNames[0] || 'General',
                    enrolled_on: enrollment.enrolled_on,
                    completed_on: enrollment.completed_on,
                    credit_points: creditPointsByCourseId.get(courseId) ?? 0,
                };
            })
            .sort((a, b) => {
                const aRank = stateOrder[a.progress_state] ?? 99;
                const bRank = stateOrder[b.progress_state] ?? 99;
                if (aRank !== bRank) return aRank - bRank;
                const aTime = a.enrolled_on ? new Date(a.enrolled_on).getTime() : 0;
                const bTime = b.enrolled_on ? new Date(b.enrolled_on).getTime() : 0;
                return bTime - aTime;
            });
    }, [enrollments, creditPointsData, resolveCourseCategoryNames]);

    // Mandatory course enrollments are ensured server-side (on login/dashboard), so the dashboard should never POST
    // to `/enrollments/` (read-only endpoint).

    useEffect(() => {
        const initializeDashboard = async () => {
            setLoading(true);
            try {
                // Fetch all required data
                await Promise.all([
                    fetchDashboardData(),
                    fetchLatestFeedback(),
                    fetchAllCourses(),
                    fetchCategories(),
                    fetchCreditPoints(),
                    fetchEnrollments()
                ]);
            } catch (error) {
                console.error('Error initializing dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
       
        initializeDashboard();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/student/dashboard/');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const fetchCreditPoints = async () => {
        try {
            setIsLoadingCreditPoints(true);
            const response = await api.get('/student/credit-points/');
            const data = response.data || { total_credit_points: 0, courses: [] };
            // Normalize backend field names to what the UI expects
            const normalizedCourses = (data.courses || []).map((c) => ({
                ...c,
                points: c.credit_points ?? c.points ?? 0,
                performance: c.performance_percent ?? c.performance ?? null,
                completedOn: c.completed_on
                    ? new Date(c.completed_on).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—',
            }));
            setCreditPointsData({ ...data, courses: normalizedCourses });
        } catch (error) {
            console.error('Error fetching credit points:', error);
            setCreditPointsData({ total_credit_points: 0, courses: [] });
        } finally {
            setIsLoadingCreditPoints(false);
        }
    };

    const fetchLatestFeedback = async () => {
        try {
            setFeedbackLoading(true);
            // Endpoint visible to students; returns recent feedback and supports optional filters
            const response = await api.get('/feedback/student/');
            setLatestFeedback((response.data || []).slice(0, 6));
        } catch (error) {
            console.error('Error fetching latest feedback:', error);
            setLatestFeedback([]);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            setIsLoadingEnrollments(true);
            const response = await api.get('/enrollments/');
            setEnrollments(response.data || []);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
            // Try alternative endpoint if the first one fails
            try {
                const altResponse = await api.get('/student/enrollments/');
                setEnrollments(altResponse.data || []);
            } catch (altError) {
                console.error('Error fetching alternative enrollments:', altError);
                setEnrollments([]);
            }
        } finally {
            setIsLoadingEnrollments(false);
        }
    };

    const fetchAllCourses = async () => {
        try {
            setIsLoadingCourses(true);
            const response = await api.get('/courses/'); // Assuming this endpoint fetches all courses
            const courseList = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : [];
            setAllCourses(courseList);
        } catch (error) {
            console.error('Error fetching all courses:', error);
            setAllCourses([]);
        } finally {
            setIsLoadingCourses(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories/');
            const categoryList = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : [];
            setCategories(categoryList);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([]);
        }
    };

    // Refresh dashboard reference data with one timer instead of multiple competing intervals.
    useEffect(() => {
        const refreshDashboardReferences = () => {
            Promise.all([
                fetchEnrollments(),
                fetchAllCourses(),
                fetchCategories(),
            ]).catch((error) => {
                console.error('Error refreshing dashboard reference data:', error);
            });
        };

        const interval = setInterval(refreshDashboardReferences, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleCourseClick = (courseId) => {
        navigate(`/course/${courseId}`);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
                <CircularProgress thickness={5} size={72} color="primary"/>
            </Box>
        );
    }

    // Only show last 5 recent activities
    const recentActivities = (dashboardData?.recentActivity || []).slice(0, 5);

    const handleActivityClick = async (activity) => {
        try {
            if (activity.quiz_id && activity.course_id) {
                // Fetch the lesson list for the course
                const videosRes = await api.get(`/courses/${activity.course_id}/videos/`);
                const courseRes = await api.get(`/courses/${activity.course_id}/`);
                const enableQuizzes = courseRes.data.enable_quizzes !== false;

                // Build the lesson list (same as in LessonPage)
                const orderedVideos = videosRes.data.sort((a, b) => a.order - b.order);
                let lessonList = [];
                orderedVideos.forEach((v) => {
                    lessonList.push({ type: 'video', video: v });
                    if (enableQuizzes && v.has_quiz && v.quiz_id) {
                        lessonList.push({
                            type: 'quiz',
                            quizId: v.quiz_id,
                            videoTitle: v.title,
                            videoId: v.id,
                        });
                    }
                });
                if (courseRes.data.final_quiz?.id) {
                    lessonList.push({ type: 'final_quiz', quizId: courseRes.data.final_quiz.id });
                }

                // Find the lessonIndex for the quiz
                let lessonIndex = lessonList.findIndex(l => l.type === 'quiz' && l.quizId === activity.quiz_id);
                if (lessonIndex === -1 && courseRes.data.final_quiz?.id === activity.quiz_id) {
                    lessonIndex = lessonList.findIndex(l => l.type === 'final_quiz');
                }

                if (lessonIndex >= 0) {
                    navigate(`/course/${activity.course_id}/lesson/${lessonIndex}`, { state: { courseId: activity.course_id } });
                } else {
                    alert('Could not find the relevant lesson.');
                }
            } else if (activity.video_id && activity.course_id) {
                // Fetch the lesson list for the course
                const videosRes = await api.get(`/courses/${activity.course_id}/videos/`);
                const courseRes = await api.get(`/courses/${activity.course_id}/`);
                const enableQuizzes = courseRes.data.enable_quizzes !== false;

                // Build the lesson list (same as in LessonPage)
                const orderedVideos = videosRes.data.sort((a, b) => a.order - b.order);
                let lessonList = [];
                orderedVideos.forEach((v) => {
                    lessonList.push({ type: 'video', video: v });
                    if (enableQuizzes && v.has_quiz && v.quiz_id) {
                        lessonList.push({
                            type: 'quiz',
                            quizId: v.quiz_id,
                            videoTitle: v.title,
                            videoId: v.id,
                        });
                    }
                });
                if (courseRes.data.final_quiz?.id) {
                    lessonList.push({ type: 'final_quiz', quizId: courseRes.data.final_quiz.id });
                }

                // Find the lessonIndex for the video
                let lessonIndex = lessonList.findIndex(l => l.type === 'video' && l.video.id === activity.video_id);

                if (lessonIndex >= 0) {
                    navigate(`/course/${activity.course_id}/lesson/${lessonIndex}`, { state: { courseId: activity.course_id } });
                } else {
                    alert('Could not find the relevant lesson.');
                }
            } else {
                alert('Activity does not have enough information to navigate.');
            }
        } catch (err) {
            alert('Failed to navigate to the activity.');
            console.error(err);
        }
    };

    const courseCount = dashboardData?.stats?.courseCount || 0;
    const effectiveStats = {
        ...dashboardData?.stats,
        courseCount,
        totalEnrollments: effectiveTotalEnrollments,
        inProgressCount: effectiveInProgressCount,
        completedCount: effectiveCompletedCount,
        recentEnrollmentCount: effectiveRecentEnrollmentCount,
    };
    const completionPercentage = effectiveTotalEnrollments > 0
        ? Math.round((effectiveCompletedCount / effectiveTotalEnrollments) * 100)
        : 0;
    const attendancePercentage = effectiveTotalEnrollments > 0
        ? Math.round(((effectiveInProgressCount + effectiveCompletedCount) / effectiveTotalEnrollments) * 100)
        : 0;
    const summaryCards = [
        {
            title: 'Courses in Progress',
            value: formatStatNumber(effectiveInProgressCount),
            icon: <PendingActionsRoundedIcon />,
            badge: effectiveRecentEnrollmentCount > 0 ? `+${effectiveRecentEnrollmentCount} this week` : null,
            accent: {
                main: '#0F6CBD',
                soft: 'rgba(15, 108, 189, 0.10)',
            },
        },
        {
            title: 'Completed Courses',
            value: formatStatNumber(effectiveCompletedCount),
            icon: <TaskAltRoundedIcon />,
            badge: `${completionPercentage}% Completion`,
            accent: {
                main: '#0F7A3A',
                soft: 'rgba(15, 122, 58, 0.10)',
            },
        },
        {
            title: 'Total Credit Points',
            value: formatStatNumber(creditPointsData?.total_credit_points || 0),
            icon: <StarIcon />,
            badge: null,
            accent: {
                main: '#9A6B00',
                soft: 'rgba(154, 107, 0, 0.10)',
            },
        },
        {
            title: 'Average Grade',
            value: `${Math.round(dashboardData?.stats?.averageScore || 0)}%`,
            icon: <TrendingUpRoundedIcon />,
            badge: null,
            accent: {
                main: '#1E67C6',
                soft: 'rgba(30, 103, 198, 0.10)',
            },
        },
        {
            title: 'Recently Enrolled',
            value: formatStatNumber(effectiveRecentEnrollmentCount),
            icon: <PersonAddAlt1RoundedIcon />,
            badge: null,
            accent: {
                main: '#1E67C6',
                soft: 'rgba(30, 103, 198, 0.10)',
            },
        },
    ];

    // --- Notifications: most recent completed course + newest catalog course ---
    const latestCompletedCourse = [...effectiveInProgressCourses]
        .filter((c) => c.progress_state === 'COMPLETED')
        .sort((a, b) => new Date(b.completed_on || 0) - new Date(a.completed_on || 0))[0];

    const newestCatalogCourse = allCourses.length
        ? [...allCourses].sort((a, b) => {
            const at = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
            const bt = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
            return bt - at;
        })[0]
        : null;

    const isAlreadyEnrolledInNewest = newestCatalogCourse
        ? effectiveInProgressCourses.some((c) => String(c.id) === String(newestCatalogCourse.id))
        : false;

    const notificationItems = [];
    if (latestCompletedCourse) {
        notificationItems.push({
            icon: <EmojiEventsIcon sx={{ fontSize: 18 }} />,
            title: 'Course Completed',
            subtitle: latestCompletedCourse.title || latestCompletedCourse.name,
            meta: latestCompletedCourse.completed_on
                ? new Date(latestCompletedCourse.completed_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '',
            accent: { main: '#0F7A3A', soft: 'rgba(15, 122, 58, 0.10)' },
        });
    }
    if (newestCatalogCourse && !isAlreadyEnrolledInNewest) {
        notificationItems.push({
            icon: <NotificationsActiveIcon sx={{ fontSize: 18 }} />,
            title: 'New Course Available',
            subtitle: newestCatalogCourse.title || newestCatalogCourse.name,
            meta: 'Recommended for you',
            accent: { main: '#1E67C6', soft: 'rgba(30, 103, 198, 0.10)' },
        });
    }

    return (
        <Box sx={{
            px: { xs: 1, sm: 2, md: 3, lg: 4 },
            py: 2,
            background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0a1929 0%, #132f4c 50%, #1e3a5f 100%)'
                : '#F4F8FC',
            minHeight: '100vh',
            width: '100%',
            overflowX: 'clip',
        }}>
            <Container maxWidth={false} sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
            {/* Banner Section */}
            <Banner
                user={user}
                stats={effectiveStats}
                inProgressCourses={effectiveInProgressCourses}
                allCourses={allCourses}
                isLoadingCourses={isLoadingCourses}
                onCourseClick={handleCourseClick}
            />
            {/* Stats Section */}
            <Box sx={{ width: '100%', mb: 4 }}>
                <Box
                    sx={{
                        maxWidth: 1320,
                        mx: 'auto',
                        display: 'grid',
                        gap: { xs: 1, sm: 1.25, md: 1.5 },
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(3, minmax(0, 1fr))',
                            lg: 'repeat(5, minmax(0, 1fr))',
                        },
                        alignItems: 'stretch',
                    }}
                >
                    {summaryCards.map((card) => (
                        <StatCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            accent={card.accent}
                            badge={card.badge}
                        />
                    ))}
                </Box>
            </Box>

            {/* Notifications + New Course Promo Section */}
            <Box sx={{ width: '100%', mb: 4 }}>
                <Box
                    sx={{
                        maxWidth: 1320,
                        mx: 'auto',
                        display: 'grid',
                        gap: { xs: 1.5, sm: 2 },
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: newestCatalogCourse && !isAlreadyEnrolledInNewest ? '1fr 1fr' : '1fr',
                        },
                        alignItems: 'stretch',
                    }}
                >
                    <NotificationsCard items={notificationItems} />
                    {newestCatalogCourse && !isAlreadyEnrolledInNewest && (
                        <NewCoursePromoCard course={newestCatalogCourse} onEnroll={handleCourseClick} />
                    )}
                </Box>
            </Box>

            <Box sx={{ width: '100%', mb: 4 }}>
                <Box
                    sx={{
                        maxWidth: 1320,
                        mx: 'auto',
                        display: 'grid',
                        gap: { xs: 1.5, sm: 2, md: 2.5 },
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, minmax(0, 1fr))',
                        },
                        alignItems: 'stretch',
                    }}
                >
                    <AttendanceCard attendance={attendancePercentage || 90} />
                    <LearningTrendsCard activityLog={dashboardData?.recentActivity} />
                </Box>
            </Box>


            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Grid
                    container
                    spacing={{ xs: 1.25, sm: 1.75 }}
                    alignItems="stretch"
                    sx={{ maxWidth: { xs: '100%', sm: '100%', md: 1200, lg: 1280 } }}
                    justifyContent="center"
                >
                    {/* In Progress Courses */}
                    <Grid size={{ xs: 12, md: 6, lg: 7 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 1.25, md: 2 },
                                minHeight: 360,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                borderRadius: '20px',
                               background: (theme) => theme.palette.mode === 'dark'
                                    ? `linear-gradient(145deg, #1a2332 0%, #2d3748 100%)`
                                    : `linear-gradient(145deg, #ffffff 0%, #f8faff 100%)`,
                                border: (theme) => theme.palette.mode === 'dark'
                                    ? '1px solid rgba(255, 255, 255, 0.08)'
                                    : '1px solid rgba(59, 130, 246, 0.08)',
                                boxShadow: (theme) => theme.palette.mode === 'dark'
                                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
                                    : '0 8px 32px rgba(59, 130, 246, 0.08), 0 4px 16px rgba(59, 130, 246, 0.04), 0 2px 8px rgba(0, 0, 0, 0.06)',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-8px)',
                                    boxShadow: (theme) => theme.palette.mode === 'dark'
                                        ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)'
                                        : '0 16px 48px rgba(59, 130, 246, 0.12), 0 8px 24px rgba(59, 130, 246, 0.08), 0 4px 12px rgba(0, 0, 0, 0.08)',
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                                    borderRadius: '20px 20px 0 0',
                                },
                            }}
                        >
                            <Box sx={{ position: 'relative', zIndex: 1, width: '100%', overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography
                                        variant="h5"
                                        fontWeight={700}
                                        sx={{
                                            background: (theme) => theme.palette.mode === 'dark'
                                                ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                                                : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontSize: { xs: '1.05rem', md: '1.2rem' },
                                        }}
                                    >
                                        In Progress Courses
                                    </Typography>
                                    <Typography
                                        component="span"
                                        onClick={() => navigate('/my-courses')}
                                        sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1976d2', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        View All
                                    </Typography>
                                </Box>

                                {/* Table Header — hidden on xs */}
                                <Box sx={{
                                    display: { xs: 'none', sm: 'grid' },
                                    gridTemplateColumns: '2fr 1.5fr 2fr 1fr',
                                    px: 1.5,
                                    py: 1,
                                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                                }}>
                                    {['Course', 'Enrolled', 'Progress', 'Points'].map((h) => (
                                        <Typography key={h} sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.secondary', textAlign: h === 'Points' ? 'center' : 'left' }}>{h}</Typography>
                                    ))}
                                </Box>

                                <Box sx={{ maxHeight: 300, overflowY: 'auto', scrollbarWidth: 'thin', width: '100%' }}>
                                    {effectiveInProgressCourses.length ? (
                                        effectiveInProgressCourses.map((course) => {
                                            const diff = course.enrolled_on ? Math.floor((Date.now() - new Date(course.enrolled_on).getTime()) / 1000) : null;
                                            const enrolledLabel = diff !== null ? `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h` : '—';
                                            const barSx = { flexGrow: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar': { borderRadius: 4, background: course.progress_state === 'COMPLETED' ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#2563eb,#1d4ed8)' } };
                                            return (
                                                <Box key={course.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)', '&:hover': { backgroundColor: 'rgba(59,130,246,0.04)' } }}>
                                                    {/* Desktop row */}
                                                    <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: '2fr 1.5fr 2fr 1fr', alignItems: 'center', px: 1.5, py: 1.5 }}>
                                                        <Tooltip title={course.title} arrow disableInteractive={course.title.length < 30}>
                                                            <Typography noWrap sx={{ fontWeight: 500, fontSize: '0.92rem', color: 'text.primary' }}>{course.title}</Typography>
                                                        </Tooltip>
                                                        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{enrolledLabel}</Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <LinearProgress variant="determinate" value={course.progress_percent || 0} sx={barSx} />
                                                            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', minWidth: 32 }}>{Math.round(course.progress_percent || 0)}%</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                                            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: course.credit_points > 0 ? 'text.primary' : 'text.disabled' }}>{course.credit_points > 0 ? course.credit_points : '—'}</Typography>
                                                            {course.credit_points > 0 && <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />}
                                                        </Box>
                                                    </Box>
                                                    {/* Mobile card */}
                                                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 0.75, px: 1, py: 1.25 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                                            <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', flex: 1 }}>{course.title}</Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
                                                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: course.credit_points > 0 ? 'text.primary' : 'text.disabled' }}>{course.credit_points > 0 ? course.credit_points : '—'}</Typography>
                                                                {course.credit_points > 0 && <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />}
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <LinearProgress variant="determinate" value={course.progress_percent || 0} sx={{ ...barSx, height: 7 }} />
                                                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 30, flexShrink: 0 }}>{Math.round(course.progress_percent || 0)}%</Typography>
                                                        </Box>
                                                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Enrolled {enrolledLabel} ago</Typography>
                                                    </Box>
                                                </Box>
                                            );
                                        })
                                    ) : (
                                        <Box py={6} textAlign="center">
                                            <Typography variant="body1" color="textSecondary" sx={{ opacity: 0.7, fontWeight: 500 }}>
                                                No enrolled courses found yet.
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            <Box display="flex" justifyContent="center" mt={3}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        borderRadius: '16px',
                                        fontWeight: 500,
                                        px: 4,
                                        py: 1.5,
                                        borderWidth: 2,
                                        color: '#282938',
                                        borderColor: '#FCD980',
                                        transition: 'all 0.3s ease',
                                        background: (theme) => theme.palette.mode === 'dark'
                                            ? 'rgba(252, 217, 128, 0.10)'
                                            : 'rgba(252, 217, 128, 0.06)',
                                        boxShadow: (theme) => theme.palette.mode === 'dark'
                                            ? '0 4px 16px rgba(252, 217, 128, 0.25)'
                                            : '0 4px 16px rgba(252, 217, 128, 0.15)',
                                        '&:hover': {
                                            backgroundColor: '#FCD980',
                                            color: '#282938',
                                            borderColor: '#FCD980',
                                            transform: 'translateY(-2px)',
                                            boxShadow: (theme) => theme.palette.mode === 'dark'
                                                ? '0 8px 24px rgba(252, 217, 128, 0.35)'
                                                : '0 8px 24px rgba(252, 217, 128, 0.25)',
                                        },
                                    }}
                                    onClick={() => navigate('/catalog')}
                                >
                                    Browse More Courses
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Recent Activity */}
                    <Grid size={{ xs: 12, md: 6, lg: 5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 1.5, md: 2 },
                                minHeight: 360,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '20px',
                                background: (theme) => theme.palette.mode === 'dark'
                                    ? `linear-gradient(145deg, #1a2332 0%, #2d3748 100%)`
                                    : `linear-gradient(145deg, #ffffff 0%, #f8faff 100%)`,
                                border: (theme) => theme.palette.mode === 'dark'
                                    ? '1px solid rgba(255, 255, 255, 0.08)'
                                    : '1px solid rgba(59, 130, 246, 0.08)',
                                boxShadow: (theme) => theme.palette.mode === 'dark'
                                    ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)'
                                    : '0 8px 32px rgba(59, 130, 246, 0.08), 0 4px 16px rgba(59, 130, 246, 0.04), 0 2px 8px rgba(0, 0, 0, 0.06)',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-8px)',
                                    boxShadow: (theme) => theme.palette.mode === 'dark'
                                        ? '0 16px 48px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)'
                                        : '0 16px 48px rgba(59, 130, 246, 0.12), 0 8px 24px rgba(59, 130, 246, 0.08), 0 4px 12px rgba(0, 0, 0, 0.08)',
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
                                    borderRadius: '20px 20px 0 0',
                                },
                            }}
                        >
                            <Typography
                                variant="h5"
                                fontWeight={700}
                                sx={{
                                    mb: 2,
                                    background: (theme) => theme.palette.mode === 'dark'
                                        ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                                        : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontSize: { xs: '1.05rem', md: '1.2rem' },
                                }}
                            >
                                Recent Activity
                            </Typography>

                            <Box sx={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                                {recentActivities.length > 0 ? (
                                    recentActivities.map((activity, idx) => {
                                        const iconColors = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#00838f'];
                                        const bgColor = iconColors[idx % iconColors.length];
                                        const ts = new Date(activity.timestamp);
                                        const diffDays = Math.floor((Date.now() - ts.getTime()) / 86400000);
                                        const timeLabel = diffDays === 0
                                            ? `Today, ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : diffDays === 1
                                                ? `Yesterday, ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                : `${diffDays} days ago`;
                                        return (
                                            <Box
                                                key={activity.id}
                                                onClick={() => handleActivityClick(activity)}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: { xs: 1, sm: 1.5 },
                                                    py: { xs: 1.25, sm: 1.5 },
                                                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                                                    cursor: 'pointer',
                                                    '&:hover': { backgroundColor: 'rgba(59,130,246,0.04)', borderRadius: 1 },
                                                }}
                                            >
                                                <Avatar sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, bgcolor: bgColor, flexShrink: 0 }}>
                                                    <SchoolIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                                                </Avatar>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.82rem', sm: '0.9rem' }, color: 'text.primary', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                        {activity.description}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: 'text.secondary', mt: 0.3 }}>
                                                        {timeLabel}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })
                                ) : (
                                    <Box py={6} textAlign="center">
                                        <Typography variant="body1" color="textSecondary" sx={{ opacity: 0.7, fontWeight: 500 }}>
                                            No recent activity
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Credit Points Card */}
                    <Grid size={{ xs: 12 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                maxWidth: 997,
                                mx: 'auto',
                                width: '100%',
                                borderRadius: '12px',
                                background: '#ffffff',
                                border: '1px solid rgba(86, 97, 103, 0.35)',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.18)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    px: { xs: 2, md: 2.5 },
                                    py: 1.2,
                                    background: '#EAF6FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        border: '2px solid #F2C94C',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <StarIcon sx={{ fontSize: 16, color: '#F2C94C' }} />
                                </Box>

                                <Typography
                                    sx={{
                                        color: '#566167',
                                        fontSize: { xs: '1rem', md: '1.15rem' },
                                        fontWeight: 800,
                                        fontFamily: 'Poppins, sans-serif',
                                    }}
                                >
                                    Credit Points
                                </Typography>
                            </Box>

                            {/* Body */}
                            <Box
                                sx={{
                                    px: { xs: 1.5, md: 4.5 },
                                    pt: { xs: 1.5, md: 1.25 },
                                    pb: { xs: 1.5, md: 2 },
                                    background: '#ffffff',
                                }}
                            >
                                {isLoadingCreditPoints ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={18} />
                                        <Typography variant="body2" color="text.secondary">
                                            Loading points...
                                        </Typography>
                                    </Box>
                                ) : creditPointsData?.courses && creditPointsData.courses.length > 0 ? (
                                    <Box
                                        sx={{
                                            maxHeight: 280,
                                            overflowY: 'auto',
                                            scrollbarWidth: 'thin',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                        }}
                                    >
                                        {creditPointsData.courses.map((course, index) => {
                                            const rawPoints = Number(course.points ?? course.credit_points ?? 0);
                                            const points = Number.isFinite(rawPoints) ? Math.round(rawPoints) : 0;
                                            const courseTitle =
                                                course.title ||
                                                course.name ||
                                                course.course_title ||
                                                course.course?.title ||
                                                'Untitled Course';

                                            return (
                                                <Paper
                                                    key={course.id || `${courseTitle}-${index}`}
                                                    elevation={0}
                                                    sx={{
                                                        minHeight: { xs: 70, md: 76 },
                                                        px: { xs: 2, md: 3.5 },
                                                        py: { xs: 1.5, md: 1.75 },
                                                        borderRadius: '16px',
                                                        border: '1px solid rgba(86, 97, 103, 0.22)',
                                                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                                                        background: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            color: '#000000',
                                                            fontSize: { xs: '1rem', md: '1.1rem' },
                                                            fontWeight: 800,
                                                            fontFamily: 'Poppins, sans-serif',
                                                            lineHeight: 1.2,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {courseTitle}
                                                    </Typography>

                                                    <Typography
                                                        sx={{
                                                            color: points >= 75 ? '#059669' : '#F2C94C',
                                                            fontSize: { xs: '0.95rem', md: '1rem' },
                                                            fontWeight: 800,
                                                            fontFamily: 'Poppins, sans-serif',
                                                            whiteSpace: 'nowrap',
                                                            minWidth: 56,
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        +{points}
                                                    </Typography>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                                        No completed courses yet. Complete your courses to earn credit points!
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* Latest Course Feedback from all students */}
            <Box sx={{ display: 'flex', width: '100%', mt: 4 }}>
           
                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ maxWidth: { xs: '100%', sm: '100%', md: 1200, lg: 1400 }, mx: 'auto' }}>
                    <Grid size={{ xs: 12 }}>
                        <Box
                            sx={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 3,
                            }}
                        >
                                    <Typography
                                        variant="h5"
                                        fontWeight={500}
                                        letterSpacing={-0.3}
                                        color="text.primary"
                                        sx={{
                                            background: (theme) => theme.palette.mode === 'dark'
                                                ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
                                                : `linear-gradient(145deg, #121419ff 0%, #1d222aff 100%)`,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontSize: { xs: '1.25rem', md: '1.5rem' },
                                        }}
                                    >
                                        Latest Course Feedback
                                    </Typography>
                                   
                                </Box>
                               
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                                    gap: { xs: 1.5, sm: 2 }
                                }}>
                                    {feedbackLoading ? (
                                        [...Array(6)].map((_, idx) => (
                                            <Paper
                                                key={idx}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: '14px',
                                                    opacity: 0.7,
                                                    background: (theme) => theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.02)'
                                                        : 'rgba(59, 130, 246, 0.02)',
                                                    border: (theme) => theme.palette.mode === 'dark'
                                                        ? '1px solid rgba(255, 255, 255, 0.04)'
                                                        : '1px solid rgba(59, 130, 246, 0.06)',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        background: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.1)'
                                                            : 'rgba(59, 130, 246, 0.1)',
                                                    }} />
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Box sx={{
                                                            width: '60%',
                                                            height: 14,
                                                            bgcolor: 'action.hover',
                                                            borderRadius: 2,
                                                            mb: 1
                                                        }} />
                                                        <Box sx={{
                                                            width: '80%',
                                                            height: 12,
                                                            bgcolor: 'action.hover',
                                                            borderRadius: 2
                                                        }} />
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        ))
                                    ) : latestFeedback.length === 0 ? (
                                        <Box py={6} textAlign="center">
                                            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7, fontWeight: 500 }}>
                                                No feedback yet.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        latestFeedback.map(item => (
                                            <Paper
                                                key={item.id}
                                                sx={{
                                                    p: 1.75,
                                                    borderRadius: '12px',
                                                    background: (theme) => theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 255, 255, 0.02)'
                                                        : 'rgba(255, 255, 255, 0.95)',
                                                    border: (theme) => theme.palette.mode === 'dark'
                                                        ? '1px solid rgba(255, 255, 255, 0.04)'
                                                        : '1px solid rgba(0, 0, 0, 0.08)',
                                                    transition: 'all 0.3s ease',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    '&:hover': {
                                                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.04)'
                                                            : 'rgba(255, 255, 255, 1)',
                                                        transform: 'translateY(-4px)',
                                                        borderColor: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.08)'
                                                            : 'rgba(59, 130, 246, 0.2)',
                                                        boxShadow: (theme) => theme.palette.mode === 'dark'
                                                            ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                                                            : '0 8px 24px rgba(0, 0, 0, 0.1)',
                                                    },
                                                }}
                                            >
                                                {/* Header with Avatar and Rating */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                    <Avatar
                                                        src={item.user_profile_picture || undefined}
                                                        sx={{
                                                            width: 42,
                                                            height: 42,
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                                            fontSize: '1rem',
                                                            fontWeight: 500,
                                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                                        }}
                                                    >
                                                        {item.user_username?.[0]?.toUpperCase()}
                                                    </Avatar>
                                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="subtitle1"
                                                            fontWeight={500}
                                                            noWrap
                                                            sx={{
                                                                color: (theme) => theme.palette.mode === 'dark'
                                                                    ? '#ffffff'
                                                                    : '#1e293b',
                                                                fontSize: '1rem',
                                                                mb: 0.5,
                                                            }}
                                                        >
                                                            {item.user_username || 'Student'}
                                                        </Typography>
                                                        <Rating
                                                            value={item.rating}
                                                            readOnly
                                                            size="small"
                                                            sx={{
                                                                '& .MuiRating-iconFilled': {
                                                                    color: '#f59e0b',
                                                                    filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))',
                                                                },
                                                                '& .MuiRating-iconEmpty': {
                                                                    color: (theme) => theme.palette.mode === 'dark'
                                                                        ? 'rgba(255, 255, 255, 0.2)'
                                                                        : 'rgba(0, 0, 0, 0.2)',
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>

                                                {/* Course Title */}
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.8)'
                                                            : 'rgba(0, 0, 0, 0.7)',
                                                        fontWeight: 500,
                                                        fontSize: '0.9rem',
                                                        mb: 2,
                                                        opacity: 0.8,
                                                    }}
                                                    noWrap
                                                >
                                                    Course: {item.course_title || 'Course'}
                                                </Typography>

                                                {/* Feedback Message */}
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: (theme) => theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 255, 255, 0.9)'
                                                            : 'rgba(0, 0, 0, 0.8)',
                                                        fontWeight: 500,
                                                        lineHeight: 1.5,
                                                        flexGrow: 1,
                                                        mb: 2,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {item.message}
                                                </Typography>

                                                {/* Footer with Timestamp */}
                                                <Box sx={{
                                                    mt: 'auto',
                                                    pt: 2,
                                                    borderTop: (theme) => theme.palette.mode === 'dark'
                                                        ? '1px solid rgba(255, 255, 255, 0.1)'
                                                        : '1px solid rgba(0, 0, 0, 0.1)',
                                                }}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: (theme) => theme.palette.mode === 'dark'
                                                                ? 'rgba(255, 255, 255, 0.6)'
                                                                : 'rgba(0, 0, 0, 0.5)',
                                                            fontWeight: 500,
                                                            fontSize: '0.75rem',
                                                        }}
                                                    >
                                                        {new Date(item.created_at || item.timestamp).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        ))
                                    )}
                                </Box>
                            </Grid>
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
};

export default StudentDashboard;