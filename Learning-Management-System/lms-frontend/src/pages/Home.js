import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Skeleton,

  
  Stack,
  Typography,
} from "@mui/material";
import {
  Add,
  ArrowForward,
  CallOutlined,
  Facebook,
  Instagram,
  KeyboardArrowDown,
  LinkedIn,
  LocationOnOutlined,
  MailOutline,
  North,
  Remove,
  YouTube,
} from "@mui/icons-material";
import phoneFrame from "../assets/Group 2659.png";
import aboutImage from "../assets/unsplash_vbxyFxlgpjM.png";
import courseAnalyticsImage from "../assets/pexels-olya-kobruseva-5561923 1 - Copy.png";
// import logoImage from "../assets/eduplatformlogo1 3.png";
import courseCardFrameImage from "../assets/Group 2626.png";
import featureAnalyticsIcon from "../assets/Container.png";
import featureBuilderIcon from "../assets/Container (1).png";
import featureCommunityIcon from "../assets/Container (2).png";
import featureAttendanceIcon from "../assets/Icons.png";
import faqIcon1 from "../assets/Icon.png";
import faqIcon2 from "../assets/Icon2.png";
import faqIcon3 from "../assets/Icon3.png";
import faqIcon4 from "../assets/Icon4.png";
import faqIconActive1 from "../assets/Icon6.png";
import faqIconActive2 from "../assets/Icon7.png";
import faqIconActive3 from "../assets/Icon8.png";
import faqIconActive4 from "../assets/Icon9.png";
import contactPromoImage from "../assets/Group 2678.png";
import contactLocationIcon from "../assets/SVG.png";
import contactCallIcon from "../assets/SVG1.png";
import contactEmailIcon from "../assets/contact-email.svg";
import PublicSiteHeader, {
  PUBLIC_SITE_HEADER_HEIGHT,
} from "../components/public/PublicSiteHeader";
import { PUBLIC_SITE_NAV_SECTIONS } from "../components/public/publicSiteNav";

const courseFullStackImage = "/image-001.png";
const courseDigitalMarketingImage = "/image-002.png";
const CONTACT_EMAIL = "Eduplatforminc@gmail.com";
const CONTACT_PHONE_DISPLAY = "+91 9876543210";
const CONTACT_PHONE_LINK = "tel:+919876543210";
const CONTACT_MAP_URL = "#";
const SOCIAL_LINKS = {
  facebook: "",
  instagram: "",
  linkedin: "",
  youtube: "",
};

const colors = {
  navy: "#1c1e53",
  blueTint: "#d7e5f2",
  white: "#ffffff",
  paper: "#f5f5f5",
  ink: "#121212",
  muted: "#64666f",
  yellow: "#efc95d",
  border: "rgba(18, 18, 18, 0.12)",
  faqBlue: "rgb(56, 43, 232)",
  // Hero — new color combo (indigo → violet, warm accent)
  heroBg: "#F5F4FF",
  heroBadgeBg: "rgba(108, 71, 255, 0.10)",
  heroBadgeText: "#6C47FF",
  heroBadgeDot: "#6C47FF",
  heroSubtitle: "#5B5B6B",
  heroDark: "#1B1230",
  heroAccentGrad: "linear-gradient(90deg, #6C47FF 0%, #A855F7 100%)",
  heroBlob1: "rgba(108, 71, 255, 0.18)",
  heroBlob2: "rgba(255, 176, 82, 0.20)",
  heroPanelBorder: "rgba(108, 71, 255, 0.14)",
};

const fontFamily = '"Poppins","Inter", "Segoe UI", sans-serif';

const pageGutter = { xs: 3, sm: 4, md: 6, lg: 8 };

const navItems = PUBLIC_SITE_NAV_SECTIONS;

const stats = [
  { value: "2.5M+", label: "Engaged learners" },
  { value: "500+", label: "Courses Available" },
  { value: "800+", label: "Expert Mentors" },
];

const featuresLeft = [
  {
    title: "Advanced analytics",
    description:
      "Track student progress, engagement rates, and revenue with our detailed dashboard.",
    iconSrc: featureAnalyticsIcon,
    desktopTop: 15,
    desktopLeft: 110,
  },
  {
    title: "Instant course builder",
    description:
      "Drag-and-drop course creator with support for video, quizzes, and assignments.",
    iconSrc: featureBuilderIcon,
    desktopTop: 300,
    desktopLeft: 110,
  },
];

const featuresRight = [
  {
    title: "Community tools",
    description:
      "Built-in discussion forums and peer review systems to foster collaborative learning.",
    iconSrc: featureCommunityIcon,
    desktopTop: 15,
    desktopLeft: -45,
  },
  {
    title: "Easy attendance tracking",
    description:
      "Easy attendance tracking enables educators to record, monitor, and manage students attendance effortlessly.",
    iconSrc: featureAttendanceIcon,
    desktopTop: 300,
    desktopLeft: -45,
  },
];

const courseCards = [
  {
    title: "Full Stack",
    description: "Learning on creating beginner level websites developer",
    image: courseFullStackImage,
  },
  {
    title: "Digital Marketing",
    description: "Learning on marketing strategies and concepts for beginners",
    image: courseDigitalMarketingImage,
  },
  {
    title: "Data Analytics",
    description: "Learning on the basics of data analytics",
    image: courseAnalyticsImage,
  },
];

const faqItems = [
  {
    id: "faq-1",
    title: "Why choose EduPlatform?",
    body: "Transform your career with industry-leading training and real-world experience. Gain practical experience by applying what you learn in real internships.",
    icon: faqIcon1,
    activeIcon: faqIconActive4,
  },
  {
    id: "faq-2",
    title: "How is EduPlatform different from other platforms?",
    body: "We offer a comprehensive learning ecosystem that includes advanced analytics to track your progress, productivity tools to keep you organized, and a Data dashboard for real-time insights into your learning journey.",
    icon: faqIcon2,
    activeIcon: faqIconActive3,
  },
  {
    id: "faq-3",
    title: "Can I track how my students are performing?",
    body: "Yes. With advanced analytics, you can view a detailed dashboard that tracks student progress and engagement rates.",
    icon: faqIcon3,
    activeIcon: faqIconActive2,
  },
  {
    id: "faq-4",
    title: "How do I keep track of student attendance?",
    body: "We offer an easy attendance tracking tool that enables educators to record, monitor, and manage.",
    icon: faqIcon4,
    activeIcon: faqIconActive1,
  },
];

const footerQuickLinks = [
  { label: "Home", to: "/#home" },
  { label: "Features", to: "/#features" },
  { label: "Courses", to: "/#courses" },
  { label: "Register", to: "/register" },
];

const socialIconLinks = [
  { icon: Facebook, key: "facebook", label: "Facebook" },
  { icon: Instagram, key: "instagram", label: "Instagram" },
  { icon: LinkedIn, key: "linkedin", label: "LinkedIn" },
  { icon: YouTube, key: "youtube", label: "YouTube" },
];

const courseDetailsPath = (courseTitle) =>
  `/home/details?course=${encodeURIComponent(courseTitle)}`;

function scrollToSection(sectionId, behavior = "smooth") {
  document
    .getElementById(sectionId)
    ?.scrollIntoView({ behavior, block: "start" });
}

function shellField(placeholder, type = "text") {
  const autoCompleteValue = type === "password" ? "new-password" : "off";

  return (
    <Box
      sx={{
        height: { xs: 76, md: 58 },
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: "5px",
        display: "flex",
        alignItems: "center",
        px: 1.8,
        backgroundColor: colors.white,
      }}
    >
      <InputBase
        fullWidth
        type={type}
        placeholder={placeholder}
        autoComplete={autoCompleteValue}
        name={placeholder.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
        inputProps={{
          autoComplete: autoCompleteValue,
        }}
        sx={{
          fontSize: { xs: "18px", md: "16px" },
          fontFamily: '"Proxima Nova", sans-serif',
          fontWeight: 400,
          lineHeight: { xs: "28px", md: "26px" },
          color: "#5B6472",
          "& input::placeholder": {
            opacity: 1,
            color: "#5B6472",
          },
        }}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll / count-up animation helpers                                */
/* ------------------------------------------------------------------ */

// Generic hook: tells you when an element has scrolled into view.
// `once` (default true) means it only fires the first time — good for
// entrance animations that shouldn't replay every time you scroll past.
function useInView(options = {}) {
  const { threshold = 0.25, rootMargin = "0px", once = true } = options;
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView];
}

// Wrap any block of content in <Reveal> to have it fade + slide up
// into place the first time it scrolls into the viewport.
function Reveal({
  children,
  delay = 0,
  duration = 700,
  y = 28,
  sx = {},
  component = Box,
  ...rest
}) {
  const [ref, isInView] = useInView({ threshold: 0.15 });
  const Component = component;

  return (
    <Component
      ref={ref}
      sx={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
        willChange: "opacity, transform",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Animates a numeric string like "2.5M+", "500+", "800+" counting up
// from 0 to its target value once it scrolls into view.
function CountUp({ value, duration = 1600 }) {
  const match = String(value).match(/^([\d.]+)(.*)$/);
  const numericPart = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : "";
  const decimals = numericPart % 1 !== 0 ? 1 : 0;

  const [ref, isInView] = useInView({ threshold: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return undefined;

    let startTime = null;
    let rafId;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(numericPart * eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplay(numericPart);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isInView, numericPart, duration]);

  return (
    <span ref={ref}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Shows a skeleton placeholder in place of an image until it has actually
// finished loading, then cross-fades to the real image. Prevents blank
// gaps / layout pop-in for images that load over the network.
function ImageWithSkeleton({ src, alt, imgProps = {} }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      {!loaded && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.45s ease",
          ...imgProps,
        }}
      />
    </Box>
  );
}

const FeatureCard = React.memo(function FeatureCard({
  icon: Icon,
  iconSrc,
  title,
  description,
}) {
  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 280, lg: 260 },
        maxWidth: 320,
        minHeight: { xs: 220, md: 240 },
        height: "auto",
        border: "1px solid #DCDCDC",
        borderRadius: "12px",
        backgroundColor: colors.white,
        px: 3,
        py: 3,
        textAlign: "center",
        mx: "auto",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 16px 30px rgba(28, 30, 83, 0.10)",
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          mx: "auto",
          mb: 3,
        }}
      >
        {iconSrc ? (
          <Box
            component="img"
            src={iconSrc}
            alt=""
            loading="lazy"
            sx={{ width: 48, height: 48, display: "block" }}
          />
        ) : (
          <Icon sx={{ fontSize: 24, color: colors.ink }} />
        )}
      </Box>
      <Typography
        sx={{
          fontSize: { xs: "1.05rem", md: "15px" },
          fontWeight: 700,
          color: "#141828",
          mb: 1.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: "0.95rem", md: "15px" },
          lineHeight: 1.4,
          color: "#9A9A9A",
        }}
      >
        {description}
      </Typography>
    </Box>
  );
});

const CourseCard = React.memo(function CourseCard({ image, title, description }) {
  return (
    <Box
      component={RouterLink}
      to={courseDetailsPath(title)}
      sx={{
        textDecoration: "none",
        width: "100%",
        maxWidth: { xs: "100%", sm: 420, lg: 340 },
        height: { xs: "auto", md: 350 },
        borderRadius: "20px",
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.05)",
        mx: "auto",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 18px 32px rgba(5, 8, 28, 0.18)",
        },
      }}
    >
      <Box sx={{ width: "100%", height: { xs: 220, md: 198 } }}>
        <ImageWithSkeleton
          src={image}
          alt={title}
          imgProps={{ objectFit: "cover" }}
        />
      </Box>
      <Box
        sx={{
          px: { xs: 2, md: "18px" },
          py: { xs: 2, md: "20px" },
          minHeight: { xs: 140, md: 168 },
          backgroundImage: `linear-gradient(180deg, rgba(132, 140, 205, 0.18) 0%, rgba(76, 80, 133, 0.60) 100%), url("${courseCardFrameImage}")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <Typography
          sx={{
            color: colors.white,
            fontSize: { xs: "1.4rem", md: "21px" },
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            mt: { xs: 1.2, md: "17px" },
            width: { xs: "100%", md: 318 },
            color: "rgba(255, 255, 255, 0.72)",
            fontSize: { xs: "0.95rem", md: "15px" },
            lineHeight: { xs: 1.6, md: "180%" },
            letterSpacing: "0.8%",
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
});

export default function Home() {
  const location = useLocation();
  const [expanded, setExpanded] = useState("");
  const [courseCategory, setCourseCategory] = useState("All");
  const [activeSection, setActiveSection] = useState("home");
  const navTargetLockRef = useRef(null);
  const navTargetLockTimerRef = useRef(null);
  const visibleCourseCards =
    courseCategory === "All"
      ? courseCards
      : courseCards.filter((course) => course.title === courseCategory);

  const lockNavTarget = useCallback((sectionId) => {
    window.clearTimeout(navTargetLockTimerRef.current);
    navTargetLockRef.current = sectionId;
    navTargetLockTimerRef.current = window.setTimeout(() => {
      navTargetLockRef.current = null;
    }, 700);
  }, []);

  const handleNavSelect = useCallback(
    (event, sectionId) => {
      event?.preventDefault();
      lockNavTarget(sectionId);
      setActiveSection(sectionId);
      scrollToSection(sectionId);
    },
    [lockNavTarget]
  );

  const publicHeaderNavItems = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        href: `#${item.id}`,
        onClick: (event) => handleNavSelect(event, item.id),
      })),
    [handleNavSelect]
  );

  useEffect(() => {
    // Throttle scroll handling to at most once per animation frame instead
    // of running the section-detection loop (getElementById x N) on every
    // single scroll event, which was causing unnecessary layout work.
    let ticking = false;

    const updateActiveSection = () => {
      ticking = false;
      const headerOffset = PUBLIC_SITE_HEADER_HEIGHT + 36;
      let currentSection = "home";

      navItems.forEach((item) => {
        const element = document.getElementById(item.id);
        if (!element) return;

        const top = element.offsetTop - headerOffset;
        if (window.scrollY >= top) {
          currentSection = item.id;
        }
      });

      if (navTargetLockRef.current) {
        if (currentSection !== navTargetLockRef.current) {
          return;
        }

        navTargetLockRef.current = null;
        window.clearTimeout(navTargetLockTimerRef.current);
      }

      setActiveSection(currentSection);
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(navTargetLockTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const sectionId = location.hash.replace("#", "");

    if (!sectionId) {
      navTargetLockRef.current = null;
      window.clearTimeout(navTargetLockTimerRef.current);
      setActiveSection("home");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      if (!document.getElementById(sectionId)) {
        return;
      }

      window.clearTimeout(navTargetLockTimerRef.current);
      navTargetLockRef.current = sectionId;
      navTargetLockTimerRef.current = window.setTimeout(() => {
        navTargetLockRef.current = null;
      }, 700);
      setActiveSection(sectionId);
      scrollToSection(sectionId, "auto");
    }, 0);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [location.hash]);

  return (
    <Box
      sx={{
        backgroundColor: colors.blueTint,
        display: "flex",
        justifyContent: "center",
        overflowX: "hidden",
        "& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root, & .MuiSelect-select":
          {
            fontFamily,
          },
      }}
    >
      <Box
        id="home"
        sx={{
          width: "100%",
          backgroundColor: colors.paper,
        }}
      >
        <PublicSiteHeader
          navItems={publicHeaderNavItems}
          activeItemId={activeSection}
          logoHref="#home"
          onLogoClick={(event) => handleNavSelect(event, "home")}
        />

        <Box
          sx={{
            backgroundColor: colors.heroBg,
            px: pageGutter,
            pt: {
              xs: `calc(${PUBLIC_SITE_HEADER_HEIGHT}px + 32px)`,
              md: `calc(${PUBLIC_SITE_HEADER_HEIGHT}px + 56px)`,
            },
            pb: { xs: 6, md: "96px" },
            position: "relative",
            overflow: "hidden",
            "@keyframes heroFadeUp": {
              "0%": { opacity: 0, transform: "translateY(24px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
            "@keyframes heroFloat": {
              "0%": { transform: "translateY(0px)" },
              "50%": { transform: "translateY(-14px)" },
              "100%": { transform: "translateY(0px)" },
            },
            "@keyframes blobDrift1": {
              "0%": { transform: "translate(0px, 0px) scale(1)" },
              "50%": { transform: "translate(30px, -20px) scale(1.08)" },
              "100%": { transform: "translate(0px, 0px) scale(1)" },
            },
            "@keyframes blobDrift2": {
              "0%": { transform: "translate(0px, 0px) scale(1)" },
              "50%": { transform: "translate(-24px, 18px) scale(1.06)" },
              "100%": { transform: "translate(0px, 0px) scale(1)" },
            },
            "@keyframes badgeDotPulse": {
              "0%": { boxShadow: `0 0 0 0 ${colors.heroBadgeDot}55` },
              "70%": { boxShadow: "0 0 0 8px rgba(108, 71, 255, 0)" },
              "100%": { boxShadow: "0 0 0 0 rgba(108, 71, 255, 0)" },
            },
          }}
        >
          {/* Animated background blobs */}
          <Box
            sx={{
              position: "absolute",
              top: -60,
              left: -80,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: colors.heroBlob1,
              filter: "blur(70px)",
              animation: "blobDrift1 9s ease-in-out infinite",
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -80,
              right: -60,
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: colors.heroBlob2,
              filter: "blur(70px)",
              animation: "blobDrift2 11s ease-in-out infinite",
              zIndex: 0,
            }}
          />

          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
            spacing={{ xs: 5, lg: 6 }}
            sx={{ maxWidth: 1280, mx: "auto", position: "relative", zIndex: 1 }}
          >
            {/* ---------- LEFT: Text content ---------- */}
            <Box
              sx={{
                width: { xs: "100%", lg: "54%" },
                maxWidth: { lg: 640 },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {/* Badge */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 0.7,
                  borderRadius: "999px",
                  backgroundColor: colors.heroBadgeBg,
                  mb: 3,
                  opacity: 0,
                  animation: "heroFadeUp 0.7s ease-out 0.05s forwards",
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: colors.heroBadgeDot,
                    animation: "badgeDotPulse 2s ease-out infinite",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "1.2px",
                    color: colors.heroBadgeText,
                    textTransform: "uppercase",
                  }}
                >
                  World-Class Professional Education
                </Typography>
              </Box>

              {/* Heading */}
              <Typography
                sx={{
                  fontWeight: 700,
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: {
                    xs: "2.4rem",
                    sm: "2.9rem",
                    md: "3.1rem",
                    lg: "3rem",
                  },
                  lineHeight: 1.15,
                  color: colors.heroDark,
                  textAlign: "left",
                  opacity: 0,
                  animation: "heroFadeUp 0.7s ease-out 0.15s forwards",
                }}
              >
                Build and Achieve Your Dreams
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: -0.2,
                }}
              >
                EduPlatform
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  mt: { xs: 2.5, md: 3 },
                  width: "100%",
                  maxWidth: 500,
                  color: colors.heroSubtitle,
                  fontFamily: '"Inter", "Proxima Nova", sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: "1rem", md: "16px" },
                  lineHeight: 1.75,
                  textAlign: "left",
                  opacity: 0,
                  animation: "heroFadeUp 0.7s ease-out 0.35s forwards",
                }}
              >
                Unlock your potential with a premium learning platform designed
                to accelerate your professional growth. Develop
                industry-relevant expertise through expertly curated,
                high-quality courses and structured learning paths created to
                help ambitious professionals achieve lasting career success.
              </Typography>

              {/* Buttons */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  mt: { xs: 4, md: 5 },
                  width: "100%",
                  opacity: 0,
                  animation: "heroFadeUp 0.7s ease-out 0.45s forwards",
                }}
                alignItems="center"
                justifyContent="flex-start"
              >
                <Button
                  component={RouterLink}
                  to="/courses"
                  variant="contained"
                  endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    px: 3.5,
                    height: { xs: 52, sm: 54 },
                    borderRadius: "8px",
                    textTransform: "none",
                    background: colors.heroAccentGrad,
                    color: colors.white,
                    boxShadow: "0 8px 20px rgba(108, 71, 255, 0.28)",
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 12px 26px rgba(108, 71, 255, 0.38)",
                      background: colors.heroAccentGrad,
                    },
                  }}
                >
                  VIEW COURSES
                </Button>
                <Button
                  component={RouterLink}
                  to="/#features"
                  variant="outlined"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    px: 3.5,
                    height: { xs: 52, sm: 54 },
                    borderRadius: "8px",
                    textTransform: "none",
                    borderColor: "rgba(27,18,48,0.25)",
                    color: colors.heroDark,
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    transition:
                      "transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      borderColor: colors.heroBadgeText,
                      backgroundColor: "rgba(108, 71, 255, 0.06)",
                    },
                  }}
                >
                  EXPLORE TRACKS
                </Button>
              </Stack>
            </Box>

            {/* ---------- RIGHT: Illustration panel ---------- */}
            <Box
              sx={{
                width: { xs: "100%", sm: "70%", md: "55%", lg: "38%" },
                maxWidth: 460,
                aspectRatio: "1 / 0.85",
                borderRadius: "24px",
                background: "linear-gradient(160deg, #FFFFFF 0%, #F0EDFF 100%)",
                border: `1px solid ${colors.heroPanelBorder}`,
                boxShadow: "0 20px 50px rgba(108, 71, 255, 0.12)",
                position: "relative",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                mx: "auto",
                opacity: 0,
                animation:
                  "heroFadeUp 0.8s ease-out 0.3s forwards, heroFloat 5s ease-in-out 1.1s infinite",
              }}
            >
              {/* faint decorative bars mimicking a code/dashboard layout */}
              <Box
                sx={{
                  position: "absolute",
                  top: 28,
                  left: 28,
                  right: 28,
                  opacity: 0.6,
                }}
              >
                <Box
                  sx={{
                    height: 10,
                    width: "55%",
                    borderRadius: "5px",
                    background: colors.heroAccentGrad,
                    opacity: 0.25,
                    mb: 1.2,
                  }}
                />
                <Box
                  sx={{
                    height: 10,
                    width: "35%",
                    borderRadius: "5px",
                    backgroundColor: "#E7E2FF",
                  }}
                />
              </Box>
              <Box
                sx={{
                  position: "absolute",
                  bottom: 30,
                  left: 28,
                  right: 28,
                  opacity: 0.5,
                }}
              >
                <Box
                  sx={{
                    height: 8,
                    width: "80%",
                    borderRadius: "4px",
                    backgroundColor: "#E7E2FF",
                    mb: 1,
                  }}
                />
                <Box
                  sx={{
                    height: 8,
                    width: "60%",
                    borderRadius: "4px",
                    backgroundColor: "#E7E2FF",
                    mb: 1,
                  }}
                />
                <Box
                  sx={{
                    height: 8,
                    width: "70%",
                    borderRadius: "4px",
                    backgroundColor: "#F1EEFF",
                  }}
                />
              </Box>

              {/* central "{}" badge */}
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: "20px",
                  backgroundColor: colors.white,
                  boxShadow: "0 12px 30px rgba(108, 71, 255, 0.18)",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: "2.6rem",
                    fontWeight: 700,
                    background: colors.heroAccentGrad,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    lineHeight: 1,
                  }}
                >
                  {"</>"}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            minHeight: { xs: "auto", md: 520 },
            backgroundColor: "#DCEBF9",
            px: pageGutter,
            pt: { xs: 6, md: "80px" },
            pb: { xs: 6, md: "60px" },
          }}
        >
          <Reveal>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              justifyContent="space-between"
              spacing={{ xs: 3, md: 4 }}
              sx={{
                width: "100%",
                maxWidth: 1000,
                mx: "auto",
                alignItems: { xs: "center", lg: "center" },
                textAlign: { xs: "center", lg: "left" },
              }}
            >
              {/* Left - Heading (Smaller Font) */}
              <Typography
                sx={{
                  width: "100%",
                  maxWidth: { lg: 435 },
                  color: "#141219",
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 600,
                  mt: { xs: 1, md: "20px" },
                  fontSize: {
                    xs: "2.05rem",
                    sm: "2.45rem",
                    md: "2.70rem",
                  },
                  lineHeight: "1.1",
                  letterSpacing: "-0.03em",
                  textAlign: { xs: "center", lg: "left" },
                }}
              >
                Enhance Your
                <br />
                Knowledge and
                <br />
                Achieve Your Goals
              </Typography>

              {/* Right - Description (Smaller Font) */}
              <Box
                sx={{
                  width: "100%",
                  maxWidth: { lg: 480 },
                  ml: { lg: "auto" },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Inter", "Poppins", sans-serif',
                    color: "#141219",
                    fontSize: { xs: "1.02rem", md: "1.12rem" },
                    fontWeight: 400,
                    lineHeight: "1.68",
                    letterSpacing: "0.25px",
                  }}
                >
                 At Sparkly, we combine expert instruction, interactive learning experiences, and industry-focused resources to help you develop valuable skills, accelerate your career, and achieve lasting professional success.

                </Typography>

                <Typography
                  sx={{
                    mt: { xs: 2.8, md: "30px" },
                    fontFamily: '"Inter", "Poppins", sans-serif',
                    color: "#141219",
                    fontSize: { xs: "1.02rem", md: "1.12rem" },
                    fontWeight: 400,
                    lineHeight: "1.68",
                    letterSpacing: "0.25px",
                  }}
                >
                 Sparkly empowers learners through immersive internships, expert-led guidance, and practical, career-focused training. Gain real-world experience, develop in-demand skills, and stay ahead in today's competitive professional landscape.

                </Typography>
              </Box>
            </Stack>
          </Reveal>

          {/* Stats Cards - Compact like your image, now with count-up */}
          <Reveal delay={150}>
            <Box
              sx={{
                mt: { xs: 6, md: "60px" },
                width: "100%",
                maxWidth: 1000,
                mx: "auto",
                backgroundColor: colors.white,
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 4px 25px rgba(0,0,0,0.06)",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                divider={
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ borderColor: "rgba(0,0,0,0.08)" }}
                  />
                }
                sx={{
                  "& > *": {
                    flex: 1,
                    py: { xs: 3.2, sm: "38px" },
                    textAlign: "center",
                  },
                }}
              >
                {stats.map((item) => (
                  <Box key={item.label}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.95rem", md: "2.25rem" },
                        fontWeight: 600,
                        color: "#141219",
                        lineHeight: 1,
                      }}
                    >
                      <CountUp value={item.value} />
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.8,
                        fontSize: { xs: "0.93rem", md: "1.02rem" },
                        color: "#2b2b2f",
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Reveal>
        </Box>

        {/* ================= PLATFORM FEATURES ================= */}
        <Box
          id="features"
          sx={{
            minHeight: { xs: "auto", md: 700 },
            backgroundColor: colors.white,
            px: pageGutter,
            pt: { xs: 5, md: "28px" },
            pb: { xs: 1, md: "24px" },
            overflow: { xs: "hidden", md: "visible" },
            "@keyframes galaxyFloat": {
              "0%": { transform: "translateY(0px)" },
              "50%": { transform: "translateY(-12px)" },
              "100%": { transform: "translateY(0px)" },
            },
          }}
        >
          <Reveal>
            <Box
              sx={{
                maxWidth: 1240,
                mx: "auto",
                textAlign: "center",
                mb: { xs: 4, md: "28px" },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "2.5rem", md: "36px" },
                  fontWeight: 700,
                  color: "#3A3A3D",
                }}
              >
                Platform Features
              </Typography>
              <Typography
                sx={{
                  mt: 1.5,
                  mx: "auto",
                  maxWidth: 620,
                  fontFamily: '"Inter", "Poppins", sans-serif',
                  fontSize: { xs: "0.95rem", md: "1rem" },
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: "#6B7280",
                }}
              >
                Empowering educators with cutting-edge tools to deliver
                seamless, engaging, and data-driven learning experiences.
              </Typography>
            </Box>
          </Reveal>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(12, minmax(0, 1fr))",
              },
              columnGap: { lg: "18px" },
              rowGap: { xs: 4, lg: 0 },
              alignItems: "start",
              maxWidth: 1240,
              mx: "auto",
            }}
          >
            <Box
              sx={{
                gridColumn: { xs: "1 / -1", lg: "1 / span 3" },
                width: "100%",
                order: { xs: 1, md: 1 },
                mt: { lg: "8px" },
                display: "grid",
                gap: { xs: 3, md: 4 },
                justifyItems: "center",
              }}
            >
              {featuresLeft.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={index * 120}
                  sx={{ width: "100%", display: "flex", justifyContent: "center" }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      animation: "galaxyFloat 4.5s ease-in-out infinite",
                      animationDelay: `${index * 0.6}s`,
                    }}
                  >
                    <FeatureCard {...feature} />
                  </Box>
                </Reveal>
              ))}
            </Box>

            <Box
              sx={{
                gridColumn: { xs: "1 / -1", lg: "4 / span 5" },
                width: "100%",
                position: "relative",
                display: "grid",
                placeItems: "center",
                order: { xs: 2, md: 2 },
                minHeight: { xs: "auto", md: 660, lg: 560 },
                overflow: { xs: "hidden", md: "visible" },
                zIndex: 3,
                px: { xs: 0, sm: 2, md: 3 },
                py: { xs: 0, md: 1 },
              }}
            >
              <Box
                component="img"
                src={phoneFrame}
                alt="Mobile app preview"
                loading="lazy"
                sx={{
                  gridArea: "1 / 1",
                  width: "100%",
                  justifySelf: "center",
                  alignSelf: "center",
                  maxWidth: { xs: 220, sm: 300, md: 380, lg: 580 },
                  height: "auto",
                  objectFit: "contain",
                  objectPosition: "center top",
                  display: "block",
                  clipPath: "none",
                  zIndex: 2,
                  mx: "auto",
                  mb: { xs: -2, md: -4 },
                  animation: "galaxyFloat 5.5s ease-in-out infinite",
                }}
              />
            </Box>

            <Box
              sx={{
                gridColumn: { xs: "1 / -1", lg: "10 / span 3" },
                width: "100%",
                order: { xs: 3, md: 3 },
                mt: { lg: "8px" },
                display: "grid",
                gap: { xs: 3, md: 4 },
                justifyItems: "center",
              }}
            >
              {featuresRight.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={index * 120}
                  sx={{ width: "100%", display: "flex", justifyContent: "center" }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      animation: "galaxyFloat 4.5s ease-in-out infinite",
                      animationDelay: `${(index + 2) * 0.6}s`,
                    }}
                  >
                    <FeatureCard {...feature} />
                  </Box>
                </Reveal>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          id="about"
          sx={{
            minHeight: { xs: "auto", md: 460 },
            backgroundColor: "#DCEBF9",
            px: pageGutter,
            pt: { xs: 7, md: "45px" },
            pb: { xs: 7, md: "55px" },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: { xs: 5, lg: "80px" },
              alignItems: "center",
              maxWidth: 1180,
              mx: "auto",
            }}
          >
            {/* Left Side - Text Content (Moved more to left) */}
            <Reveal sx={{ maxWidth: 460, pl: { lg: "20px" } }}>
              <Typography
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: { xs: "2.1rem", sm: "2.55rem", md: "2.65rem" },
                  fontWeight: 600,
                  lineHeight: "1.15",
                  color: "#1F2937",
                  mb: 2.5,
                }}
              >
                About Us
              </Typography>

              <Typography
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: { xs: "1.52rem", sm: "1.7rem", md: "1.5rem" },
                  fontWeight: 600,
                  lineHeight: "1.22",
                  color: "#1F2937",
                  mb: 3.5,
                }}
              >
                Everything You Need to Learn, Grow, and Succeed
              </Typography>

              <Typography
                sx={{
                  fontFamily: '"Inter", "Poppins", sans-serif',
                  fontSize: { xs: "1.05rem", md: "1rem" },
                  fontWeight: 400,
                  lineHeight: "1.60",
                  color: "#4B5563",
                  maxWidth: 415,
                }}
              >
               Comprehensive learning tools, expert guidance, and hands-on opportunities designed to help you build in-demand skills, gain real-world experience, and advance your career with confidence.

              </Typography>

              <Button
                component={RouterLink}
                to="/#about"
                sx={{
                  mt: 4,
                  width: { xs: 155, sm: 170 },
                  height: 50,
                  borderRadius: "8px",
                  backgroundColor: "#FCD980",
                  color: "#1F2937",
                  textTransform: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  fontFamily: '"Poppins", sans-serif',
                  boxShadow: "0 4px 15px rgba(252, 217, 128, 0.25)",
                  "&:hover": {
                    backgroundColor: "#FCD980",
                    boxShadow: "0 6px 20px rgba(252, 217, 128, 0.35)",
                  },
                }}
              >
                Read More
              </Button>
            </Reveal>

            {/* Right Side - Square Image */}
            <Reveal
              delay={150}
              sx={{
                width: "100%",
                maxWidth: { xs: 520, lg: 560 },
                mx: { xs: "auto", lg: 0 },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  aspectRatio: "1 / 1", // Square shape (was an invalid "-1 / -1")
                  borderRadius: "0px",
                  boxShadow: "0 12px 35px rgba(0, 0, 0, 0.09)",
                  overflow: "hidden",
                }}
              >
                <ImageWithSkeleton
                  src={aboutImage}
                  alt="EduPlatform team"
                  imgProps={{ objectFit: "cover" }}
                />
              </Box>
            </Reveal>
          </Box>
        </Box>

        <Box
          id="courses"
          sx={{
            minHeight: { xs: "auto", md: 560 },
            backgroundColor: "#1C1E53",
            px: pageGutter,
            pt: { xs: 5, md: "26px" },
            pb: { xs: 6, md: "81px" },
          }}
        >
          <Reveal>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
              sx={{ maxWidth: 1180, mx: "auto" }}
            >
              <Typography
                sx={{
                  color: colors.white,
                  width: "100%",
                  maxWidth: { lg: 640 },
                  fontSize: { xs: "2.2rem", md: "32px" },
                  fontWeight: 500,
                  lineHeight: "150%",
                  letterSpacing: "0.8%",
                }}
              >
                Recommended Courses
                <br />
                For You
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1.6, md: "40px" }}
                alignItems="center"
                sx={{
                  width: { xs: "100%", lg: "auto" },
                  justifyContent: "flex-start",
                }}
              >
                <Select
                  value={courseCategory}
                  onChange={(event) => setCourseCategory(event.target.value)}
                  variant="standard"
                  disableUnderline
                  IconComponent={KeyboardArrowDown}
                  sx={{
                    minWidth: 118,
                    color: colors.white,
                    fontFamily: '"Proxima Nova", sans-serif',
                    fontSize: "18px",
                    fontWeight: 400,
                    lineHeight: "32px",
                    "& .MuiSelect-select": {
                      py: 0,
                      pr: "28px !important",
                    },
                    "& .MuiSelect-icon": {
                      color: colors.white,
                      right: 0,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        mt: 1,
                      },
                    },
                  }}
                >
                  <MenuItem value="All">Category</MenuItem>
                  <MenuItem value="Full Stack">Full Stack</MenuItem>
                  <MenuItem value="Digital Marketing">Digital Marketing</MenuItem>
                  <MenuItem value="Data Analytics">Data Analytics</MenuItem>
                </Select>
                <Button
                  component={RouterLink}
                  to="/courses"
                  sx={{
                    width: { xs: "100%", sm: 85 },
                    minWidth: { xs: "100%", sm: 180 },
                    height: { xs: 50, sm: 62 },
                    borderRadius: "4px",
                    backgroundColor: "#FCD980",
                    color: colors.ink,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: { xs: "15px", sm: "18px" },
                    "&:hover": { backgroundColor: "#FCD980" },
                  }}
                >
                  See all
                </Button>
              </Stack>
            </Stack>
          </Reveal>

          <Divider
            sx={{
              mt: { xs: 3, md: "17px" },
              mb: { xs: 4, md: "27px" },
              borderColor: "rgba(255,255,255,0.95)",
            }}
          />

          <Box
            sx={{
              maxWidth: 1200,
              mx: "auto",
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: { xs: 3, md: 3 },
            }}
          >
            {visibleCourseCards.length > 0 ? (
              visibleCourseCards.map((course, index) => (
                <Reveal key={course.title} delay={index * 120}>
                  <CourseCard {...course} />
                </Reveal>
              ))
            ) : (
              <Typography sx={{ color: "rgba(255,255,255,0.75)", gridColumn: "1 / -1" }}>
                No courses found in this category yet.
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            minHeight: { xs: "auto", md: 450 },
            backgroundColor: "#DCEBF9",
            px: pageGutter,
            pt: { xs: 7, md: "78px" },
            pb: { xs: 7, md: "58px" },
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Reveal sx={{ width: "100%", maxWidth: 920, mx: "auto" }}>
            <Typography
              sx={{
                width: "100%",
                color: "#2F2B2B",
                fontFamily: '"Proxima Nova", sans-serif',
                fontSize: { xs: "2rem", sm: "2.6rem", md: "40px" },
                fontWeight: 500,
                lineHeight: { xs: 1.15, md: 1.2 },
                letterSpacing: 1,
                textAlign: "center",
              }}
            >
             Ready to Start Your Learning Journey and 

              <br />
             Advance Your Career
            </Typography>
            <Typography
              sx={{
                mt: { xs: 3, md: 3.5 },
                width: "100%",
                maxWidth: 820,
                mx: "auto",
                color: "#111827",
                fontFamily: '"Proxima Nova", sans-serif,"Inter"',
                fontSize: { xs: "1rem", sm: "1.1rem", md: "25px" },
                fontWeight: 300,
                lineHeight: { xs: 1.7, md: "40px" },
                letterSpacing: 0,
                textAlign: "center",
              }}
            >
              Advance your career with expert-led online courses that combine practical learning, industry-relevant content, and the flexibility to study anytime, anywhere. Gain the skills you need to succeed—all at an accessible price.

            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              sx={{
                mt: 4,
                width: { xs: 156, sm: 166 },
                minWidth: { xs: 156, sm: 166 },
                height: { xs: 52, sm: 61 },
                borderRadius: "2px",
                backgroundColor: "#FCD980",
                color: colors.ink,
                textTransform: "none",
                fontFamily: '"Proxima Nova", sans-serif',
                fontWeight: 600,
                fontSize: { xs: "16px", sm: "19px" },
                "&:hover": { backgroundColor: "#FCD980" },
              }}
            >
              Get started
            </Button>
          </Reveal>
        </Box>

        <Box
          id="contact"
          sx={{
            minHeight: { xs: "auto", md: 600 },
            display: "flex", // ✅ center whole section
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.white,
            border: "1px solid rgba(0,0,0,0.08)",
            px: pageGutter,
            pt: { xs: 6, md: "25px" },
            pb: { xs: 6, md: "45px" },
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="center"
            alignItems="flex-end" // ✅ FIX alignment
            spacing={{ xs: 5, lg: 10 }}
            sx={{ maxWidth: 1100, width: "100%", gap: { lg: "50px" } }}
          >
            {/* ================= LEFT SIDE ================= */}
            <Reveal sx={{ width: { xs: "100%", lg: 480 }, height: "100%" }}>
              <Stack spacing={2}>
                {/* Visit Us */}
                <Box
                  sx={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: "8px",
                    px: 3,
                    py: 2.5,
                    minHeight: 85,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={contactLocationIcon}
                    sx={{ width: 24 }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Visit Us</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#6B7280" }}>
                      EduPlatform,
                      <br />
                      Bengaluru, Karnataka
                      <br />
                      678934
                    </Typography>
                  </Box>
                </Box>

                {/* Email */}
                <Box
                  sx={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: "8px",
                    px: 3,
                    py: 2.5,
                    minHeight: 85,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={contactEmailIcon}
                    sx={{ width: 24 }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Email Us</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#6B7280" }}>
                      {CONTACT_EMAIL}
                    </Typography>
                  </Box>
                </Box>

                {/* Call */}
                <Box
                  sx={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: "8px",
                    px: 3,
                    py: 2.5,
                    minHeight: 85,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={contactCallIcon}
                    sx={{ width: 24 }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Call Us</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#6B7280" }}>
                      {CONTACT_PHONE_DISPLAY}
                    </Typography>
                  </Box>
                </Box>

                {/* Image */}
                <Box
                  sx={{
                    height: { xs: 200, md: 240 },
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <ImageWithSkeleton
                    src={contactPromoImage}
                    alt="EduPlatform"
                    imgProps={{ objectFit: "cover", objectPosition: "center" }}
                  />
                </Box>
              </Stack>
            </Reveal>

            {/* ================= RIGHT SIDE ================= */}
            <Reveal delay={150} sx={{ width: { xs: "100%", lg: 470 }, height: "100%" }}>
              {/* Title */}
              <Typography
                sx={{
                  fontSize: "26px",
                  fontWeight: 700,
                  textAlign: "center",
                  mb: 2.5, // ✅ reduced gap
                }}
              >
                Register
              </Typography>

              {/* Form */}
              <Stack spacing={1.8}>
                {shellField("First Name *")}
                {shellField("Last Name *")}
                {shellField("User Name *")}
                {shellField("Email Address *")}
                {shellField("Mobile No. *")}
                {shellField("Password *")}
                {shellField("Confirm Password *")}
              </Stack>

              {/* Buttons */}
              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 3.5, justifyContent: "center" }} // ✅ centered
              >
                <Button
                  component={RouterLink}
                  to="/register"
                  sx={{
                    width: 150,
                    height: 48,
                    borderRadius: "4px",
                    backgroundColor: "#FCD980",
                    color: "#111827",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#FCD980" },
                  }}
                >
                  Register
                </Button>

                <Button
                  component={RouterLink}
                  to="/"
                  sx={{
                    width: 130,
                    height: 48,
                    borderRadius: "4px",
                    border: "1px solid #111827",
                    color: "#111827",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </Button>
              </Stack>

              {/* Login */}
              <Typography
                sx={{
                  mt: 2,
                  textAlign: "center",
                  fontSize: "16px",
                  color: "#6B7280",
                }}
              >
                Already have an account?{" "}
                <Box
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: "#111827",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Login
                </Box>
              </Typography>
            </Reveal>
          </Stack>
        </Box>

        <Box
          sx={{
            backgroundColor: "#DCEBF9",
            minHeight: { xs: "auto", md: 500 },
            px: pageGutter,
            pt: { xs: 6, md: "74px" },
            pb: { xs: 6, md: "50px" },
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="center"
            alignItems="center"
            spacing={{ xs: 4, lg: 7 }}
            sx={{
              width: "100%",
              maxWidth: 1120,
              mx: "auto",
            }}
          >
            <Reveal
              sx={{
                width: "100%",
                mt: { xs: 2, md: 12 },
                maxWidth: { lg: 430 },
              }}
            >
              <Typography
                sx={{
                  width: "100%",
                  display: "inline-block",
                  background: "linear-gradient(90deg, #3C19D9 0%, #200D73 68%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: '"Proxima Nova", sans-serif',
                  fontSize: { xs: "2.5rem", sm: "4rem", lg: "80px" },
                  fontWeight: 500,
                  lineHeight: { xs: 1.05, lg: "0.98" },
                  letterSpacing: "-1px",
                  textAlign: { xs: "center", lg: "left" },
                }}
              >
                Frequently
                <br />
                Asked
                <br />
                Question
              </Typography>
            </Reveal>

            <Box
              sx={{
                width: "100%",
                maxWidth: { lg: 436 },
                ml: { lg: "auto" },
              }}
            >
              {faqItems.map((item, index) => {
                const isExpanded = expanded === item.id;
                const itemIcon = isExpanded ? item.activeIcon : item.icon;

                return (
                  <Accordion
                    key={item.id}
                    expanded={isExpanded}
                    onChange={(_, next) => setExpanded(next ? item.id : "")}
                    disableGutters
                    sx={{
                      backgroundColor: "transparent",
                      boxShadow: "none",
                      border: "none",
                      outline: "none",
                      borderRadius: 0,
                      borderBottom: "1px solid rgba(17,24,39,0.12)",
                      opacity: 0,
                      transform: "translateY(18px)",
                      animation:
                        "faqStaggerIn 5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                      animationDelay: `${index * 90}ms`,
                      "&.MuiAccordion-root": {
                        boxShadow: "none",
                      },
                      "&::before": { display: "none" },
                      "@keyframes faqStaggerIn": {
                        "0%": {
                          opacity: 0,
                          transform: "translateY(18px)",
                        },
                        "100%": {
                          opacity: 1,
                          transform: "translateY(0)",
                        },
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        isExpanded ? (
                          <Remove sx={{ fontSize: 18, color: colors.ink }} />
                        ) : (
                          <Add sx={{ fontSize: 18, color: colors.ink }} />
                        )
                      }
                      sx={{
                        px: 0,
                        minHeight: isExpanded ? 50 : 84,
                        alignItems: "center",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        boxShadow: "none",
                        "&.Mui-focusVisible": {
                          backgroundColor: "transparent",
                        },
                        "& .MuiAccordionSummary-expandIconWrapper": {
                          color: "#111827",
                          mt: isExpanded ? "10px" : "12px",
                        },
                        "& .MuiAccordionSummary-content": {
                          alignItems: "center",
                          my: 0,
                          gap: "14px",
                          mr: 0,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          mt: isExpanded ? "2px" : "8px",
                        }}
                      >
                        <Box
                          component="img"
                          src={itemIcon}
                          alt=""
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          maxWidth: { xs: "100%", md: 318 },
                          display: "inline-block",
                          fontFamily: '"Proxima Nova", sans-serif',
                          background: isExpanded
                            ? "linear-gradient(90deg, #3C19D9 0%, #200D73 68%)"
                            : "none",
                          WebkitBackgroundClip: isExpanded
                            ? "text"
                            : "border-box",
                          WebkitTextFillColor: isExpanded
                            ? "transparent"
                            : "#111827",
                          fontSize: "14px",
                          color: isExpanded ? "transparent" : "#111827",
                          lineHeight: 1.1,
                          fontWeight: 500,
                          pt: isExpanded ? "4px" : "10px",
                        }}
                      >
                        {item.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        px: 0,
                        pb: "6px",
                        pl: "58px",
                        pr: "18px",
                        opacity: isExpanded ? 1 : 0,
                        transform: isExpanded
                          ? "translateY(0)"
                          : "translateY(-8px)",
                        transition: "all 0.3s ease",
                        overflow: "hidden",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"Proxima Nova", sans-serif',
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "26px",
                          letterSpacing: 0,
                          color: "#667085",
                        }}
                      >
                        {item.body}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            backgroundColor: colors.white,
            width: "100%",
            minHeight: { xs: "auto", md: 310 },
            px: 0,
            pt: { xs: 5, md: "24px" },
            pb: { xs: 4, md: "18px" },
          }}
        >
          <Box sx={{ maxWidth: 1440, mx: "auto", px: pageGutter }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={{ xs: 4, sm: 6 }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.2, mr: 3 }}
              >
                <Typography
                  sx={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#111827",
                    letterSpacing: -0.2,
                  }}
                >
                  EduPlatform
                </Typography>
              </Box>

              <Box sx={{ width: { xs: "100%", md: 180 } }}>
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: colors.ink,
                    mb: 1.6,
                  }}
                >
                  Quick Links
                </Typography>
                <Stack spacing={1.1} sx={{ pl: { md: "1px" } }}>
                  {footerQuickLinks.map((item) => (
                    <Typography
                      key={item.label}
                      component={RouterLink}
                      to={item.to}
                      sx={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "16px",
                        fontWeight: 400,
                        color: "#2F2B2B",
                        lineHeight: 1.2,
                        textDecoration: "none",
                        "&:hover": {
                          color: "#1C1E53",
                        },
                      }}
                    >
                      {item.label}
                    </Typography>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ width: { xs: "100%", md: 360 } }}>
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: colors.ink,
                    mb: 1.6,
                  }}
                >
                  Contact Us
                </Typography>
                <Stack spacing={1.1}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <LocationOnOutlined
                      sx={{ fontSize: 18, color: "#4A53FF", mt: 0.25 }}
                    />
                    <Typography
                      component="a"
                      href={CONTACT_MAP_URL}
                      target={CONTACT_MAP_URL !== "#" ? "_blank" : undefined}
                      rel={CONTACT_MAP_URL !== "#" ? "noreferrer" : undefined}
                      sx={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "16px",
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: "#2F2B2B",
                        textDecoration: "none",
                        "&:hover": {
                          color: "#1C1E53",
                        },
                      }}
                    >
                      Eduplatform ,
                      <br />
                      Bengaluru, Karnataka
                      <br />
                      678934
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CallOutlined sx={{ fontSize: 18, color: "#4A53FF" }} />
                    <Typography
                      component="a"
                      href={CONTACT_PHONE_LINK}
                      sx={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "16px",
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: "#2F2B2B",
                        textDecoration: "none",
                        "&:hover": {
                          color: "#1C1E53",
                        },
                      }}
                    >
                      {CONTACT_PHONE_DISPLAY}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MailOutline sx={{ fontSize: 18, color: "#4A53FF" }} />
                    <Typography
                      component="a"
                      href={`mailto:${CONTACT_EMAIL}`}
                      sx={{
                        fontFamily: '"Proxima Nova", sans-serif',
                        fontSize: "16px",
                        fontWeight: 400,
                        lineHeight: 1.2,
                        color: "#2F2B2B",
                        textDecoration: "none",
                        "&:hover": {
                          color: "#1C1E53",
                        },
                      }}
                    >
                      {CONTACT_EMAIL}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1.7}
                    alignItems="center"
                    sx={{ pt: 0.4 }}
                  >
                    <Typography
                      sx={{
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#2F2B2B",
                      }}
                    >
                      Back to top
                    </Typography>
                    <IconButton
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                      sx={{
                        width: 38,
                        height: 38,
                        border: "1px solid rgba(0,0,0,0.4)",
                        borderRadius: "8px",
                        color: "#2F2B2B",
                      }}
                    >
                      <North sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            </Stack>

            <Divider
              sx={{ my: { xs: 3, md: 2.5 }, borderColor: "rgba(0,0,0,0.12)" }}
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ width: "100%" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={{ xs: 2, sm: 3 }}
            >
              <Typography
                sx={{ fontSize: "16px", color: "#2F2B2B", flexGrow: 1 }}
              >
                © 2026 Eduplatform. Empowering learners worldwide.
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{
                  width: { xs: "100%", md: 360, sm: "auto" },
                  justifyContent: { xs: "flex-start", sm: "flex-start" },
                }}
              >
                {socialIconLinks.map(({ icon: Icon, key, label }) => {
                  const href = SOCIAL_LINKS[key];
                  const hasLink = Boolean(href);

                  return (
                    <IconButton
                      key={key}
                      component={hasLink ? "a" : "span"}
                      href={hasLink ? href : undefined}
                      target={hasLink ? "_blank" : undefined}
                      rel={hasLink ? "noopener noreferrer" : undefined}
                      aria-label={label}
                      aria-disabled={!hasLink}
                      sx={{
                        width: 30,
                        height: 30,
                        p: 0,
                        color: "#4B4347",
                        opacity: hasLink ? 1 : 0.4,
                        cursor: hasLink ? "pointer" : "default",
                        pointerEvents: hasLink ? "auto" : "none",
                      }}
                    >
                      <Icon sx={{ fontSize: 30 }} />
                    </IconButton>
                  );
                })}
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}