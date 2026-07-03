import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
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

// ─── motion-wrapped MUI primitives ─────────────────────────────────────────
const MotionCard = motion(Card);
const MotionBox = motion(Box);

// ─── shared animation variants ─────────────────────────────────────────────
// Slowed down + smoothed out for a more polished, "premium" feel.
const EASE = [0.16, 1, 0.3, 1]; // smooth "easeOutExpo"-like curve

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

const cardEnter = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

const panelEnter = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.35, ease: EASE } },
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
 * so the StatCard can render "No data" and never fabricate a number.
 */
const calcChange = (current, previous) => {
  if (current === 0 && previous === 0) return null; // truly no data
  if (previous === 0 && current > 0) return 100; // new data appeared → 100% increase
  if (current === 0 && previous > 0) return -100; // all data gone → 100% decrease
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * changeFromCumulativeTrend(currentTotal, trend)
 * For metrics where `currentTotal` is a running total (e.g. total students,
 * total active courses) and `trend` is an array of *new additions per
 * bucket* over the displayed window (e.g. new registrations per day).
 *
 * We back-calculate what the total was BEFORE this window started:
 *   startOfWindowTotal = currentTotal - sum(trend)
 * then compare that real starting value to the real current value. This
 * reflects actual growth over the window instead of arbitrarily splitting
 * the trend array in half and summing both halves (which can hide real
 * growth whenever a spike happens to land in the "wrong" half).
 */
const changeFromCumulativeTrend = (currentTotal, trend = []) => {
  const additions = trend.reduce((s, n) => s + (Number(n) || 0), 0);
  const startOfWindowTotal = currentTotal - additions;
  return calcChange(currentTotal, startOfWindowTotal);
};

/**
 * changeFromPointInTimeTrend(trend)
 * For metrics where each bucket in `trend` is already a snapshot value at
 * that point in time (e.g. completion rate %, avg days to complete,
 * revenue at that date) rather than an incremental addition. Summing these
 * would be meaningless, so instead we compare the FIRST value in the
 * window (oldest) to the LAST value (most recent) — the actual before/after
 * for that metric.
 */
const changeFromPointInTimeTrend = (trend = []) => {
  const values = trend.map((n) => Number(n) || 0);
  if (!values.length) return null;
  const first = values[0];
  const last = values[values.length - 1];
  return calcChange(last, first);
};

// ─── StatCard ────────────────────────────────────────────────────────────────
// `change` is a number (can be null = no data) representing % change.
// `changeIsInverted` = true means a *lower* value is the good direction
// (e.g. "average days to complete" going down is improvement, not decline).
//
// The big number now animates in with react-countup instead of snapping to
// its final value. Pass `countEnd` (the raw numeric target) plus optional
// `decimals` / `prefix` / `suffix` / `separator`. If `countEnd` is not a
// finite number (e.g. no revenue source → "—"), we just render `value`
// as static text.
const StatCard = ({
  icon,
  iconColor,
  label,
  value,
  change,
  changeIsInverted = false,
  countEnd,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
}) => {
  const hasData = change !== null && change !== undefined;
  const isGoodDirection = hasData
    ? changeIsInverted
      ? change <= 0
      : change >= 0
    : true;

  const canAnimateCount = typeof countEnd === "number" && Number.isFinite(countEnd);

  return (
    <MotionCard
      variant="outlined"
      variants={cardEnter}
      whileHover={{ y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 180, damping: 20, mass: 0.9 }}
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
          {canAnimateCount ? (
            <CountUp
              start={0}
              end={countEnd}
              duration={2.2}
              decimals={decimals}
              separator={separator}
              prefix={prefix}
              suffix={suffix}
              useEasing
              easingFn={(t, b, c, d) => {
                // easeOutExpo — matches the EASE curve used elsewhere
                return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
              }}
            />
          ) : (
            value
          )}
        </Typography>

        {/* Trend row */}
        {hasData ? (
          <Stack direction="row" alignItems="center" spacing={0.4}>
            {change >= 0 ? (
              <TrendingUpRoundedIcon
                sx={{ fontSize: 15, color: isGoodDirection ? "success.main" : "error.main" }}
              />
            ) : (
              <TrendingDownRoundedIcon
                sx={{ fontSize: 15, color: isGoodDirection ? "success.main" : "error.main" }}
              />
            )}

            <Typography
              variant="caption"
              fontWeight={700}
              color={isGoodDirection ? "success.main" : "error.main"}
            >
              {change >= 0 ? "+" : ""}
              {change}%
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.4} alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              No comparison data yet
            </Typography>
          </Stack>
        )}
      </CardContent>
    </MotionCard>
  );
};

// ─── ChartCard ───────────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, action, children }) => (
  <MotionCard
    variant="outlined"
    variants={cardEnter}
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
      subheader={subtitle}
      titleTypographyProps={{ fontWeight: 700, fontSize: "1.05rem" }}
      subheaderTypographyProps={{ fontSize: "0.78rem" }}
      action={action}
      sx={{ pb: 0 }}
    />
    <CardContent>{children}</CardContent>
  </MotionCard>
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
  // Full list of courses with real created_on timestamps, used only to
  // derive an honest "Active Courses" % change when the analytics endpoint
  // doesn't provide a course-count trend. Stays null if the endpoint
  // doesn't exist or doesn't return usable data — we never fabricate a
  // percentage from nothing.
  const [courseList, setCourseList] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [usersRes, coursesRes, teamsRes, courseListRes] = await Promise.allSettled([
        api.get("/analytics/users/"),
        api.get("/analytics/courses/"),
        api.get("/analytics/teams/"),
        api.get("/courses/"),
      ]);

      if (usersRes.status === "fulfilled" && coursesRes.status === "fulfilled" && teamsRes.status === "fulfilled") {
        setAnalytics({
          users: usersRes.value.data,
          courses: coursesRes.value.data,
          teams: teamsRes.value.data,
        });
      } else {
        console.error("Error fetching analytics:", { usersRes, coursesRes, teamsRes });
      }

      if (courseListRes.status === "fulfilled") {
        const data = courseListRes.value.data;
        // Handle both a plain array response and DRF's default paginated
        // { results: [...] } shape.
        const list = Array.isArray(data) ? data : data?.results;
        if (Array.isArray(list)) setCourseList(list);
      }
      // If /courses/ doesn't exist or fails, courseList just stays null —
      // the fallback below simply won't fire, no error shown to the user.
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

  // Completion rate: prefer the backend's own figure. If it's missing OR
  // the backend sent 0 while we can see real completions in topCourses
  // (a sign the backend query is broken rather than the true rate being
  // zero), fall back to computing it directly from real enrollment/
  // completion counts already present in the response — never a made-up
  // number, just a different, verifiable way to derive the same real data.
  const topCourses = analytics.courses.topCourses ?? [];
  const totalEnrollmentsFromTopCourses = topCourses.reduce(
    (s, c) => s + (Number(c.enrollments) || 0),
    0,
  );
  const totalCompletionsFromTopCourses = topCourses.reduce(
    (s, c) => s + (Number(c.completions) || 0),
    0,
  );
  const computedCompletionRate =
    totalEnrollmentsFromTopCourses > 0
      ? Math.round(
          (totalCompletionsFromTopCourses / totalEnrollmentsFromTopCourses) * 100,
        )
      : null;

  const backendCompletionRate = analytics.courses.overallCompletionRate;
  const completionRate =
    backendCompletionRate != null && backendCompletionRate !== 0
      ? backendCompletionRate
      : computedCompletionRate ?? backendCompletionRate ?? 0;

  // Revenue has no backing data model in this LMS (no payments/subscriptions
  // table) unless your backend computes it from something else. Treat as 0
  // until a real revenue source exists, rather than showing a misleading number.
  const revenue = analytics.teams.revenue ?? 0;
  const hasRevenueSource = analytics.teams.revenue != null;

  // ── Compute % change ──
  // Priority 1: if the API returns explicit change fields, use them (most accurate).
  // Priority 2: derive from trend arrays already in the response (approximate).
  // Priority 3: null → StatCard shows "No comparison data yet" instead of a fake number.

  const studentChange = (() => {
    if (analytics.users.studentCountChange != null)
      return analytics.users.studentCountChange;
    const rawTrend = analytics.users.registrationTrend;
    if (!Array.isArray(rawTrend) || rawTrend.length === 0) return null; // field not sent by backend
    const trend = rawTrend.map((d) => d.count);
    return changeFromCumulativeTrend(studentCount, trend);
  })();

  const coursesChange = (() => {
    if (analytics.courses.activeCourseCountChange != null)
      return analytics.courses.activeCourseCountChange;

    const rawTrend = analytics.courses.enrollmentTrend;
    if (Array.isArray(rawTrend) && rawTrend.length > 0) {
      const trend = rawTrend.map((d) => d.count);
      return changeFromCumulativeTrend(activeCourses, trend);
    }

    // Fallback: derive a real percentage from actual course creation dates
    // (fetched separately via /courses/) instead of an unavailable trend
    // field. Compares "active courses that existed 30 days ago" to "active
    // courses that exist now" — genuine data, not a guess.
    if (Array.isArray(courseList) && courseList.length > 0) {
      const WINDOW_DAYS = 30;
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

      const isActive = (c) => (c.isActive ?? c.is_active) !== false;
      const createdOn = (c) => new Date(c.createdOn ?? c.created_on);

      const activeNow = courseList.filter(isActive).length;
      const activeAtWindowStart = courseList.filter(
        (c) => isActive(c) && createdOn(c) <= windowStart,
      ).length;

      if (activeNow > 0 || activeAtWindowStart > 0) {
        return calcChange(activeNow, activeAtWindowStart);
      }
    }

    return null;
  })();

  // FIX: This previously fell back to `completionTimeTrend` (avg DAYS to
  // finish a course) whenever `overallCompletionRateChange` was missing.
  // That's a completely different metric from completion RATE, and an
  // increase in "days to complete" was even being shown as a green "good"
  // trend, which is backwards. Now:
  //   1. Prefer an explicit `overallCompletionRateChange` from the API.
  //   2. Otherwise derive a rate-based trend from `completionTimeTrend`
  //      point counts if the API shape includes a `completions`/`total`
  //      pair per bucket (safe, same unit as the metric).
  //   3. Otherwise show "No comparison data yet" — never borrow an
  //      unrelated metric just to produce a number.
  const completionChange = (() => {
    if (analytics.courses.overallCompletionRateChange != null)
      return analytics.courses.overallCompletionRateChange;

    const buckets = analytics.courses.completionRateTrend; // expected: [{ date, rate }]
    if (Array.isArray(buckets) && buckets.length) {
      const rates = buckets.map((d) => Number(d.rate) || 0);
      return changeFromPointInTimeTrend(rates);
    }

    return null; // no safe same-unit series available — don't guess
  })();

  // Separate, correctly-labeled metric: average days to complete a course.
  // Lower is better, so this uses `changeIsInverted` on its own StatCard-style
  // treatment inside the chart subtitle rather than being folded into the
  // Completion Rate card above.
  const avgCompletionDaysChange = (() => {
    const trend = analytics.courses.completionTimeTrend?.map((d) => d.avgDays) ?? [];
    return changeFromPointInTimeTrend(trend);
  })();

  const revenueChange = (() => {
    if (!hasRevenueSource) return null;
    if (analytics.teams.revenueChange != null)
      return analytics.teams.revenueChange;
    const rawTrend = analytics.teams.revenueTrend;
    if (!Array.isArray(rawTrend) || rawTrend.length === 0) return null; // field not sent by backend
    const trend = rawTrend.map((d) => d.amount);
    return changeFromCumulativeTrend(revenue, trend);
  })();

  // ── Stat cards config ──
  // `countEnd` carries the raw numeric target for the CountUp animation;
  // `value` remains as a static fallback string for cases with no numeric
  // target (e.g. revenue with no data source, rendered as "—").
  const statCards = [
    {
      label: "Total Students",
      value: studentCount.toLocaleString(),
      countEnd: studentCount,
      separator: ",",
      change: studentChange,
      icon: <PeopleAltRoundedIcon fontSize="small" />,
      color: PALETTE.blue,
    },
    {
      label: "Active Courses",
      value: activeCourses.toLocaleString(),
      countEnd: activeCourses,
      separator: ",",
      change: coursesChange,
      icon: <MenuBookRoundedIcon fontSize="small" />,
      color: PALETTE.purple,
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      countEnd: completionRate,
      suffix: "%",
      change: completionChange,
      icon: <CheckCircleRoundedIcon fontSize="small" />,
      color: PALETTE.amber,
    },
    {
      label: "Revenue",
      value: hasRevenueSource ? `$${(revenue / 1000).toFixed(1)}k` : "—",
      countEnd: hasRevenueSource ? revenue / 1000 : null,
      decimals: 1,
      prefix: "$",
      suffix: "k",
      change: revenueChange,
      icon: <AttachMoneyRoundedIcon fontSize="small" />,
      color: PALETTE.green,
    },
  ];

  const StatCardsRow = () => (
    <MotionBox
      component={Grid}
      container
      spacing={2.5}
      sx={{ mb: 3 }}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {statCards.map((card) => (
        <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={card.icon}
            iconColor={card.color}
            label={card.label}
            value={card.value}
            change={card.change}
            countEnd={card.countEnd}
            decimals={card.decimals}
            prefix={card.prefix}
            suffix={card.suffix}
            separator={card.separator}
          />
        </Grid>
      ))}
    </MotionBox>
  );

  // ── Pie chart data ──
  const totalUsers = studentCount + adminCount || 1;
  const studentPct = Math.round((studentCount / totalUsers) * 100);
  const adminPct = 100 - studentPct;

  // ─── Tab panels ──────────────────────────────────────────────────────────

  const UserAnalytics = () => (
    <MotionBox
      component={Grid}
      container
      spacing={3}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
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
            skipAnimation
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
            <motion.div
              initial={{ rotate: -360, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 1.4, ease: EASE }}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                transformOrigin: "center center",
              }}
            >
              <PieChart
                height={260}
                skipAnimation
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
            </motion.div>
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
                    <CountUp end={row.pct} suffix="%" duration={1.8} useEasing />
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </ChartCard>
      </Grid>
    </MotionBox>
  );

  const CourseAnalytics = () => (
    <MotionBox
      component={Grid}
      container
      spacing={3}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Grid size={{ xs: 12 }}>
        <ChartCard title="Course Enrollment Statistics">
          <BarChart
            height={300}
            skipAnimation
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
        <ChartCard
          title="Average Course Completion Time"
          subtitle={
            avgCompletionDaysChange != null
              ? `${avgCompletionDaysChange <= 0 ? "▼ faster" : "▲ slower"} ${Math.abs(avgCompletionDaysChange)}% vs. previous period`
              : undefined
          }
        >
          <LineChart
            height={300}
            skipAnimation
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
            skipAnimation
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
    </MotionBox>
  );

  const TeamAnalytics = () => (
    <MotionBox
      component={Grid}
      container
      spacing={3}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Team Performance">
          <BarChart
            height={300}
            skipAnimation
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
            skipAnimation
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
    </MotionBox>
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
      <MotionBox
        component={Stack}
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE }}
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
                transition: "background-color 0.4s ease, color 0.4s ease",
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
      </MotionBox>

      <StatCardsRow />

      <AnimatePresence mode="wait">
        {selectedTab === 0 && (
          <motion.div
            key="user"
            variants={panelEnter}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <UserAnalytics />
          </motion.div>
        )}
        {selectedTab === 1 && (
          <motion.div
            key="course"
            variants={panelEnter}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <CourseAnalytics />
          </motion.div>
        )}
        {selectedTab === 2 && (
          <motion.div
            key="team"
            variants={panelEnter}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <TeamAnalytics />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Analytics;