import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Tab,
    Tabs,
    CircularProgress,
    Select,
    MenuItem,
    Stack,
} from '@mui/material';
import {
    BarChart,
    LineChart,
    PieChart,
} from '@mui/x-charts';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import api from '../../api';

// Palette used for the icon chips + charts, kept close to the reference design.
const PALETTE = {
    blue: { bg: '#E8F0FE', fg: '#3B6FE0' },
    purple: { bg: '#F1EBFC', fg: '#8B5CF6' },
    amber: { bg: '#FDF3DF', fg: '#E5A93B' },
    green: { bg: '#E4F4EC', fg: '#1F9D6E' },
};

const StatCard = ({ icon, iconColor, label, value, change }) => {
    const isPositive = change >= 0;
    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                height: '100%',
            }}
        >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: iconColor.bg,
                            color: iconColor.fg,
                        }}
                    >
                        {icon}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {label}
                    </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={700} mb={0.5}>
                    {value}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    {isPositive ? (
                        <TrendingUpRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                        <TrendingDownRoundedIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                    <Typography
                        variant="caption"
                        fontWeight={600}
                        color={isPositive ? 'success.main' : 'error.main'}
                    >
                        {isPositive ? '+' : ''}{change}%
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

const ChartCard = ({ title, action, children }) => (
    <Card
        variant="outlined"
        sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}
    >
        <CardHeader
            title={title}
            titleTypographyProps={{ fontWeight: 700, fontSize: '1.05rem' }}
            action={action}
            sx={{ pb: 0 }}
        />
        <CardContent>{children}</CardContent>
    </Card>
);

const Analytics = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');
    const [analytics, setAnalytics] = useState({
        users: {},
        courses: {},
        teams: {},
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [usersResponse, coursesResponse, teamsResponse] = await Promise.all([
                api.get('/analytics/users/'),
                api.get('/analytics/courses/'),
                api.get('/analytics/teams/'),
            ]);

            setAnalytics({
                users: usersResponse.data,
                courses: coursesResponse.data,
                teams: teamsResponse.data,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Top-level KPIs. Falls back to 0 / neutral change if the backend hasn't
    // added these fields yet, so the cards never crash on missing data.
    const studentCount = analytics.users.studentCount ?? 0;
    const studentChange = analytics.users.studentCountChange ?? 0;
    const activeCourses = analytics.courses.activeCourseCount ?? analytics.courses.topCourses?.length ?? 0;
    const activeCoursesChange = analytics.courses.activeCourseCountChange ?? 0;
    const completionRate = analytics.courses.overallCompletionRate ?? 0;
    const completionRateChange = analytics.courses.overallCompletionRateChange ?? 0;
    const revenue = analytics.teams.revenue ?? 0;
    const revenueChange = analytics.teams.revenueChange ?? 0;

    const statCards = [
        {
            label: 'Total Students',
            value: studentCount.toLocaleString(),
            change: studentChange,
            icon: <PeopleAltRoundedIcon fontSize="small" />,
            color: PALETTE.blue,
        },
        {
            label: 'Active Courses',
            value: activeCourses.toLocaleString(),
            change: activeCoursesChange,
            icon: <MenuBookRoundedIcon fontSize="small" />,
            color: PALETTE.purple,
        },
        {
            label: 'Completion Rate',
            value: `${completionRate}%`,
            change: completionRateChange,
            icon: <CheckCircleRoundedIcon fontSize="small" />,
            color: PALETTE.amber,
        },
        {
            label: 'Revenue',
            value: `$${(revenue / 1000).toFixed(1)}k`,
            change: revenueChange,
            icon: <AttachMoneyRoundedIcon fontSize="small" />,
            color: PALETTE.green,
        },
    ];

    const StatCardsRow = () => (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {statCards.map((card) => (
                <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        icon={card.icon}
                        iconColor={card.color}
                        label={card.label}
                        value={card.value}
                        change={card.change}
                    />
                </Grid>
            ))}
        </Grid>
    );

    const adminCount = analytics.users.adminCount ?? 0;
    const totalUsers = studentCount + adminCount || 1;
    const studentPct = Math.round((studentCount / totalUsers) * 100);
    const adminPct = 100 - studentPct;

    const UserAnalytics = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard
                    title="User Registration Trends"
                    action={
                        <Select
                            size="small"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            sx={{ borderRadius: 2, fontSize: '0.85rem', minWidth: 140 }}
                        >
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                            <MenuItem value="90d">Last 90 Days</MenuItem>
                        </Select>
                    }
                >
                    <LineChart
                        height={300}
                        series={[
                            {
                                data: analytics.users.registrationTrend?.map(item => item.count) || [],
                                label: 'New Users',
                                area: true,
                                showMark: true,
                                curve: 'natural',
                                color: PALETTE.green.fg,
                            },
                        ]}
                        xAxis={[{
                            data: analytics.users.registrationTrend?.map(item => item.date) || [],
                            scaleType: 'band',
                        }]}
                        grid={{ horizontal: true }}
                        sx={{
                            '.MuiAreaElement-root': { fillOpacity: 0.12 },
                            '.MuiChartsAxis-line, .MuiChartsAxis-tick': { stroke: 'transparent' },
                        }}
                    />
                </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard title="User Type Distribution">
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <PieChart
                            height={260}
                            series={[
                                {
                                    innerRadius: 70,
                                    outerRadius: 110,
                                    paddingAngle: 2,
                                    cornerRadius: 6,
                                    data: [
                                        { id: 0, value: studentCount, label: 'Students', color: PALETTE.green.fg },
                                        { id: 1, value: adminCount, label: 'Admins', color: PALETTE.amber.fg },
                                    ],
                                },
                            ]}
                            hideLegend
                        />
                        <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 280, mt: 1 }}>
                            {[
                                { label: 'Students', pct: studentPct, color: PALETTE.green.fg },
                                { label: 'Admins', pct: adminPct, color: PALETTE.amber.fg },
                            ].map((row) => (
                                <Stack
                                    key={row.label}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
                                        <Typography variant="body2">{row.label}</Typography>
                                    </Stack>
                                    <Typography variant="body2" fontWeight={700}>{row.pct}%</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </ChartCard>
            </Grid>
        </Grid>
    );

    const CourseAnalytics = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <ChartCard title="Course Enrollment Statistics">
                    <BarChart
                        height={300}
                        series={[
                            {
                                data: analytics.courses.topCourses?.map(course => course.enrollments) || [],
                                label: 'Enrollments',
                                color: PALETTE.blue.fg,
                            },
                            {
                                data: analytics.courses.topCourses?.map(course => course.completions) || [],
                                label: 'Completions',
                                color: PALETTE.green.fg,
                            },
                        ]}
                        xAxis={[{
                            data: analytics.courses.topCourses?.map(course => course.title) || [],
                            scaleType: 'band',
                        }]}
                        grid={{ horizontal: true }}
                    />
                </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard title="Average Course Completion Time">
                    <LineChart
                        height={300}
                        series={[
                            {
                                data: analytics.courses.completionTimeTrend?.map(item => item.avgDays) || [],
                                label: 'Days',
                                area: true,
                                curve: 'natural',
                                color: PALETTE.purple.fg,
                            },
                        ]}
                        xAxis={[{
                            data: analytics.courses.completionTimeTrend?.map(item => item.month) || [],
                            scaleType: 'band',
                        }]}
                        grid={{ horizontal: true }}
                        sx={{ '.MuiAreaElement-root': { fillOpacity: 0.12 } }}
                    />
                </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard title="Quiz Performance Distribution">
                    <PieChart
                        height={300}
                        series={[
                            {
                                innerRadius: 60,
                                paddingAngle: 2,
                                cornerRadius: 6,
                                data: [
                                    { id: 0, value: analytics.courses.quizStats?.excellent || 0, label: 'Excellent (90-100%)', color: PALETTE.green.fg },
                                    { id: 1, value: analytics.courses.quizStats?.good || 0, label: 'Good (70-89%)', color: PALETTE.blue.fg },
                                    { id: 2, value: analytics.courses.quizStats?.average || 0, label: 'Average (50-69%)', color: PALETTE.amber.fg },
                                    { id: 3, value: analytics.courses.quizStats?.poor || 0, label: 'Poor (0-49%)', color: PALETTE.purple.fg },
                                ],
                            },
                        ]}
                    />
                </ChartCard>
            </Grid>
        </Grid>
    );

    const TeamAnalytics = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard title="Team Performance">
                    <BarChart
                        height={300}
                        series={[
                            {
                                data: analytics.teams.teamPerformance?.map(team => team.avgScore) || [],
                                label: 'Average Score',
                                color: PALETTE.blue.fg,
                            },
                        ]}
                        xAxis={[{
                            data: analytics.teams.teamPerformance?.map(team => team.name) || [],
                            scaleType: 'band',
                        }]}
                        grid={{ horizontal: true }}
                    />
                </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <ChartCard title="Team Course Completion Rates">
                    <BarChart
                        height={300}
                        series={[
                            {
                                data: analytics.teams.completionRates?.map(team => team.completionRate) || [],
                                label: 'Completion Rate (%)',
                                color: PALETTE.green.fg,
                            },
                        ]}
                        xAxis={[{
                            data: analytics.teams.completionRates?.map(team => team.name) || [],
                            scaleType: 'band',
                        }]}
                        grid={{ horizontal: true }}
                    />
                </ChartCard>
            </Grid>
        </Grid>
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                mb={3}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Analytics Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Detailed overview of your platform performance
                    </Typography>
                </Box>

                <Paper
                    variant="outlined"
                    sx={{
                        p: 0.5,
                        borderRadius: 5,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Tabs
                        value={selectedTab}
                        onChange={(e, newValue) => setSelectedTab(newValue)}
                        TabIndicatorProps={{ style: { display: 'none' } }}
                        sx={{
                            minHeight: 0,
                            '& .MuiTab-root': {
                                minHeight: 0,
                                py: 1,
                                px: 2.5,
                                borderRadius: 4,
                                textTransform: 'none',
                                fontWeight: 600,
                                color: 'text.secondary',
                            },
                            '& .Mui-selected': {
                                bgcolor: PALETTE.green.bg,
                                color: `${PALETTE.green.fg} !important`,
                            },
                        }}
                    >
                        <Tab label="User Analytics" disableRipple />
                        <Tab label="Course Analytics" disableRipple />
                        <Tab label="Team Analytics" disableRipple />
                    </Tabs>
                </Paper>
            </Stack>

            <StatCardsRow />

            {selectedTab === 0 && <UserAnalytics />}
            {selectedTab === 1 && <CourseAnalytics />}
            {selectedTab === 2 && <TeamAnalytics />}
        </Box>
    );
};

export default Analytics;