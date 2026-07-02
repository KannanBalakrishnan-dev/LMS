import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import api from "../../api";

const PALETTE = {
  blue: { bg: "#E8F0FE", fg: "#3B6FE0" },
  purple: { bg: "#F1EBFC", fg: "#8B5CF6" },
  amber: { bg: "#FDF3DF", fg: "#E5A93B" },
  green: { bg: "#E4F4EC", fg: "#1F9D6E" },
};

/**
 * calcChange(current, previous)
 * Returns a real percentage change between two periods.
 *
 * Rules:
 *  - Both 0            → null   (hide badge — no data yet)
 *  - Previous 0, cur>0 → null   (can't divide by 0; show nothing rather than ∞%)
 *  - Otherwise         → Math.round((cur - prev) / prev * 100)
 *
 * We return null instead of 0 when there is genuinely no change data,
 * so the StatCard can render "N/A" or hide the trend row entirely.
 */
const calcChange = (current, previous) => {
  if (current === 0 && previous === 0) return null; // truly no data
  if (previous === 0 && current > 0) return 100; // new data appeared → 100% increase
  if (current === 0 && previous > 0) return -100; // all data gone → 100% decrease
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * splitHalves(arr)
 * Splits an array into first half (previous period) and second half (current
 * period) so we can compute a meaningful trend from any time-series the API
 * already returns (e.g. registrationTrend).
 */
const splitHalves = (arr = []) => {
  if (!arr.length) return { prev: 0, curr: 0 };
  const mid = Math.floor(arr.length / 2);
  const sum = (a) => a.reduce((s, n) => s + (Number(n) || 0), 0);
  return {
    prev: sum(arr.slice(0, mid)),
    curr: sum(arr.slice(mid)),
  };
};

// ─── StatCard ────────────────────────────────────────────────────────────────
// `change` is a number (can be null = no data) representing % change.
const StatCard = ({ icon, iconColor, label, value, change }) => {
  const hasData = change !== null && change !== undefined;
//   const isPositive = hasData && change >= 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {/* Top row: icon + label */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1.25}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: iconColor.bg,
              color: iconColor.fg,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            sx={{ lineHeight: 1.3 }}
          >
            {label}
          </Typography>
        </Stack>

        {/* Large value */}
        <Typography
          sx={{
            fontSize: "1.75rem",
            fontWeight: 700,
            lineHeight: 1.2,
            mb: 1,
            color: "text.primary",
          }}
        >
          {value}
        </Typography>

        {/* Trend row */}
        {hasData ? (
          <Stack direction="row" alignItems="center" spacing={0.4}>
            {change >= 0 ? (
              <TrendingUpRoundedIcon
                sx={{ fontSize: 15, color: "success.main" }}
              />
            ) : (
              <TrendingDownRoundedIcon
                sx={{ fontSize: 15, color: "error.main" }}
              />
            )}

            <Typography
              variant="caption"
              fontWeight={700}
              color={change >= 0 ? "success.main" : "error.main"}
            >
              {change >= 0 ? "+" : ""}
              {change}%
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.4}>
            <TrendingUpRoundedIcon
              sx={{ fontSize: 15, color: "text.secondary" }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
            >
              0%
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

// ─── ChartCard ───────────────────────────────────────────────────────────────
const ChartCard = ({ title, action, children }) => (
  <Card
    variant="outlined"
    sx={{
      borderRadius: 1,
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      height: "100%",
    }}
  >
    <CardHeader
      title={title}
      titleTypographyProps={{ fontWeight: 700, fontSize: "1.05rem" }}
      action={action}
      sx={{ pb: 0 }}
    />
    <CardContent>{children}</CardContent>
  </Card>
);

// ─── Analytics ───────────────────────────────────────────────────────────────
const Analytics = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
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
      const [usersRes, coursesRes, teamsRes] = await Promise.all([
        api.get("/analytics/users/"),
        api.get("/analytics/courses/"),
        api.get("/analytics/teams/"),
      ]);
      setAnalytics({
        users: usersRes.data,
        courses: coursesRes.data,
        teams: teamsRes.data,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Raw values from API ──
  const studentCount = analytics.users.studentCount ?? 0;
  const adminCount = analytics.users.adminCount ?? 0;
  const activeCourses =
    analytics.courses.activeCourseCount ??
    analytics.courses.topCourses?.length ??
    0;
  const completionRate = analytics.courses.overallCompletionRate ?? 0;
  const revenue = analytics.teams.revenue ?? 0;

  // ── Compute % change ──
  // Priority 1: if the API returns explicit change fields, use them.
  // Priority 2: derive from trend arrays already in the response.
  // Priority 3: null → StatCard shows "No comparison data yet".

  const studentChange = (() => {
    if (analytics.users.studentCountChange != null)
      return analytics.users.studentCountChange;
    const trend = analytics.users.registrationTrend?.map((d) => d.count) ?? [];
    const { prev, curr } = splitHalves(trend);
    return calcChange(curr, prev);
  })();

  const coursesChange = (() => {
    if (analytics.courses.activeCourseCountChange != null)
      return analytics.courses.activeCourseCountChange;
    const trend = analytics.courses.enrollmentTrend?.map((d) => d.count) ?? [];
    const { prev, curr } = splitHalves(trend);
    return calcChange(curr, prev);
  })();

  const completionChange = (() => {
    if (analytics.courses.overallCompletionRateChange != null)
      return analytics.courses.overallCompletionRateChange;
    const trend =
      analytics.courses.completionTimeTrend?.map((d) => d.avgDays) ?? [];
    const { prev, curr } = splitHalves(trend);
    return calcChange(curr, prev);
  })();

  const revenueChange = (() => {
    if (analytics.teams.revenueChange != null)
      return analytics.teams.revenueChange;
    const trend = analytics.teams.revenueTrend?.map((d) => d.amount) ?? [];
    const { prev, curr } = splitHalves(trend);
    return calcChange(curr, prev);
  })();

  // ── Stat cards config ──
  const statCards = [
    {
      label: "Total Students",
      value: studentCount.toLocaleString(),
      change: studentChange,
      icon: <PeopleAltRoundedIcon fontSize="small" />,
      color: PALETTE.blue,
    },
    {
      label: "Active Courses",
      value: activeCourses.toLocaleString(),
      change: coursesChange,
      icon: <MenuBookRoundedIcon fontSize="small" />,
      color: PALETTE.purple,
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      change: completionChange,
      icon: <CheckCircleRoundedIcon fontSize="small" />,
      color: PALETTE.amber,
    },
    {
      label: "Revenue",
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

  // ── Pie chart data ──
  const totalUsers = studentCount + adminCount || 1;
  const studentPct = Math.round((studentCount / totalUsers) * 100);
  const adminPct = 100 - studentPct;

  // ─── Tab panels ──────────────────────────────────────────────────────────

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
              sx={{ borderRadius: 2, fontSize: "0.85rem", minWidth: 140 }}
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
                data:
                  analytics.users.registrationTrend?.map((d) => d.count) || [],
                label: "New Users",
                area: true,
                showMark: true,
                curve: "natural",
                color: PALETTE.green.fg,
              },
            ]}
            xAxis={[
              {
                data:
                  analytics.users.registrationTrend?.map((d) => d.date) || [],
                scaleType: "band",
              },
            ]}
            grid={{ horizontal: true }}
            sx={{
              ".MuiAreaElement-root": { fillOpacity: 0.12 },
              ".MuiChartsAxis-line, .MuiChartsAxis-tick": {
                stroke: "transparent",
              },
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
                    {
                      id: 0,
                      value: studentCount,
                      label: "Students",
                      color: PALETTE.green.fg,
                    },
                    {
                      id: 1,
                      value: adminCount,
                      label: "Admins",
                      color: PALETTE.amber.fg,
                    },
                  ],
                },
              ]}
              hideLegend
            />
            <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 280, mt: 1 }}>
              {[
                { label: "Students", pct: studentPct, color: PALETTE.green.fg },
                { label: "Admins", pct: adminPct, color: PALETTE.amber.fg },
              ].map((row) => (
                <Stack
                  key={row.label}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: row.color,
                      }}
                    />
                    <Typography variant="body2">{row.label}</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={700}>
                    {row.pct}%
                  </Typography>
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
                data:
                  analytics.courses.topCourses?.map((c) => c.enrollments) || [],
                label: "Enrollments",
                color: PALETTE.blue.fg,
              },
              {
                data:
                  analytics.courses.topCourses?.map((c) => c.completions) || [],
                label: "Completions",
                color: PALETTE.green.fg,
              },
            ]}
            xAxis={[
              {
                data: analytics.courses.topCourses?.map((c) => c.title) || [],
                scaleType: "band",
              },
            ]}
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
                data:
                  analytics.courses.completionTimeTrend?.map(
                    (d) => d.avgDays,
                  ) || [],
                label: "Days",
                area: true,
                curve: "natural",
                color: PALETTE.purple.fg,
              },
            ]}
            xAxis={[
              {
                data:
                  analytics.courses.completionTimeTrend?.map((d) => d.month) ||
                  [],
                scaleType: "band",
              },
            ]}
            grid={{ horizontal: true }}
            sx={{ ".MuiAreaElement-root": { fillOpacity: 0.12 } }}
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
                  {
                    id: 0,
                    value: analytics.courses.quizStats?.excellent || 0,
                    label: "Excellent (90-100%)",
                    color: PALETTE.green.fg,
                  },
                  {
                    id: 1,
                    value: analytics.courses.quizStats?.good || 0,
                    label: "Good (70-89%)",
                    color: PALETTE.blue.fg,
                  },
                  {
                    id: 2,
                    value: analytics.courses.quizStats?.average || 0,
                    label: "Average (50-69%)",
                    color: PALETTE.amber.fg,
                  },
                  {
                    id: 3,
                    value: analytics.courses.quizStats?.poor || 0,
                    label: "Poor (0-49%)",
                    color: PALETTE.purple.fg,
                  },
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
                data:
                  analytics.teams.teamPerformance?.map((t) => t.avgScore) || [],
                label: "Average Score",
                color: PALETTE.blue.fg,
              },
            ]}
            xAxis={[
              {
                data: analytics.teams.teamPerformance?.map((t) => t.name) || [],
                scaleType: "band",
              },
            ]}
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
                data:
                  analytics.teams.completionRates?.map(
                    (t) => t.completionRate,
                  ) || [],
                label: "Completion Rate (%)",
                color: PALETTE.green.fg,
              },
            ]}
            xAxis={[
              {
                data: analytics.teams.completionRates?.map((t) => t.name) || [],
                scaleType: "band",
              },
            ]}
            grid={{ horizontal: true }}
          />
        </ChartCard>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
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
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Tabs
            value={selectedTab}
            onChange={(_, v) => setSelectedTab(v)}
            TabIndicatorProps={{ style: { display: "none" } }}
            sx={{
              minHeight: 0,
              "& .MuiTab-root": {
                minHeight: 0,
                py: 1,
                px: 2.5,
                borderRadius: 1, // rectangle tab
                textTransform: "none",
                fontWeight: 600,
                color: "text.secondary",
              },
              "& .Mui-selected": {
                bgcolor: PALETTE.green.bg,
                color: `${PALETTE.green.fg} !important`,
                borderRadius: 1,
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
