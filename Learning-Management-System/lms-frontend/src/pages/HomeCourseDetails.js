import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import api from '../api';
import PublicSiteHeader, { PUBLIC_SITE_HEADER_HEIGHT } from '../components/public/PublicSiteHeader';
import { createPublicSiteHeaderNavItems } from '../components/public/publicSiteNav';
import courseImage3 from '../assets/pexels-olya-kobruseva-5561923 1 - Copy.png';
import courseImage4 from '../assets/pexels-shane-aldendorff-924676 1.png';
import courseImage5 from '../assets/pexels-brett-sayles-2881232 1.png';
import courseImage6 from '../assets/pexels-picjumbocom-196645 (1) 1.png';

const HOME_FONT_FAMILY = '"Poppins", sans-serif';
const PAGE_WIDTH = 1400;
const CONTENT_WIDTH = 1320;
const DEFAULT_COURSE_IMAGE = '/image-001.png';
const DIGITAL_MARKETING_IMAGE = '/image-002.png';

const publicHeaderNavItems = createPublicSiteHeaderNavItems();

const courseDetailsByTitle = {
  'Full Stack': {
    title: 'Full Stack',
    subtitle: 'Build end-to-end Web applications from scratch',
    image: DEFAULT_COURSE_IMAGE,
    about: [
      'Full stack development is closely associated with web applications and the internet because it involves building complete, end-to-end solutions for the web. A full stack developer works on both the front end (what users see) and the back end (server, database, and application logic) to create fully functional websites and applications.',
      'Learn how to design engaging user interfaces, develop robust server-side logic, and manage databases - all in one complete skill set.',
    ],
    benefitsLead: 'The benefits of learning Full stack:',
    points: [
      'End-to-end development skills',
      'High career demand & opportunities',
      'Faster project delivery & innovation',
    ],
  },
  'Digital Marketing': {
    title: 'Digital Marketing',
    subtitle: 'Learn strategies and campaign management',
    image: DIGITAL_MARKETING_IMAGE,
    about: [
      'Digital marketing is all about promoting products or services using the internet. It helps businesses reach the right audience through platforms people use every day, such as Google, social media, websites, and email.',
      'You will learn how to create engaging content, improve website visibility on search engines, manage social media pages, run online advertisements, and understand performance data to see what works best.',
    ],
    benefitsLead: 'The benefits of learning Digital Marketing:',
    points: [
      'High career opportunities',
      'Cost-effective and measurable marketing skills',
      'Promote brands and see real results',
    ],
  },
  'Data Analytics': {
    title: 'Data Analytics',
    subtitle: 'Build insights with data and reporting',
    image: courseImage3,
    about: [
      'Data analytics is all about collecting, understanding, and using data to make better decisions. It helps businesses discover patterns, track performance, and solve problems by analyzing information from everyday sources like websites, sales records, customer behavior, and applications.',
      'You will learn how to clean and organize data, use tools like Excel and analytics software, create charts and dashboards, and interpret results to understand what is working and what needs improvement.',
    ],
    benefitsLead: 'The benefits of learning Data Analytics:',
    points: [
      'Smarter decision-making',
      'Ability to spot trends and solve problems',
      'Strong career opportunities',
    ],
  },
  'AI/ML': {
    title: 'AI | ML',
    subtitle: 'Learn artificial intelligence and machine learning fundamentals',
    image: courseImage4,
    about: [
      'Artificial intelligence and machine learning are about building systems that can learn from data, recognize patterns, and make decisions with minimal human effort. These technologies help businesses automate tasks, personalize experiences, and solve complex problems across industries.',
      'You will learn the basics of data handling, algorithms, and models, explore programming concepts, train simple machine-learning models, and evaluate their performance step by step.',
    ],
    benefitsLead: 'The benefits of learning AI/ML:',
    points: [
      'Automation and efficiency',
      'Solve real-world problems',
      'High-demand career opportunities',
    ],
  },
  'Cloud Computing': {
    title: 'Cloud Computing',
    subtitle: 'Learn cloud infrastructure and services',
    image: courseImage5,
    about: [
      'Cloud computing is all about delivering resources like servers, storage, databases, and applications over the internet instead of relying only on local machines. It helps teams scale quickly, collaborate remotely, and manage modern digital systems efficiently.',
      'You will learn cloud platforms, storage and networking concepts, virtualization, application deployment, and resource management practices that support secure and flexible infrastructure.',
    ],
    benefitsLead: 'The benefits of learning Cloud Computing:',
    points: [
      'Automation and efficiency',
      'Solve real-world problems',
      'Boost career opportunities',
    ],
  },
  'UI/UX Design': {
    title: 'UI \\ UX Design',
    subtitle: 'Learn interface and experience design fundamentals',
    image: courseImage6,
    about: [
      'UI/UX design is about creating digital products that are easy to use, visually appealing, and enjoyable for people. It focuses on understanding how users interact with websites and apps, then shaping those experiences to feel clear, intuitive, and helpful.',
      'You will learn user research, layout planning, wireframing, prototyping, visual design choices, and testing methods that help create thoughtful, user-centered digital experiences.',
    ],
    benefitsLead: 'The benefits of learning UI/UX Design:',
    points: [
      'Create better user experiences',
      'High demand across industries',
      'Improve problem-solving and creativity',
    ],
  },
};

const toDynamicCourseDetails = (course) => {
  const description = (course?.description || '').trim();
  const about = description
    ? description
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : ['Course details will be available soon.'];
  const subtitleSource = about[0] || '';
  const subtitle =
    subtitleSource.length > 68
      ? `${subtitleSource.slice(0, 65).trim()}...`
      : (subtitleSource || 'Explore this course and start learning today.');

  return {
    title: (course?.title || 'Course').trim(),
    subtitle,
    image: course?.cover_image || DEFAULT_COURSE_IMAGE,
    about,
    benefitsLead: 'Course highlights:',
    points: [
      course?.enable_quizzes === false
        ? 'Quizzes are currently disabled for this course.'
        : 'Includes guided lessons and quizzes.',
      course?.total_quizzes
        ? `Contains ${course.total_quizzes} quiz section(s).`
        : 'Practice components are included in this course.',
      'Learn at your own pace with practical content.',
    ],
  };
};

const HomeCourseDetails = () => {
  const location = useLocation();
  const [dynamicCourse, setDynamicCourse] = useState(null);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const courseParam = searchParams.get('course');
  const courseIdParam = searchParams.get('courseId');

  useEffect(() => {
    let isMounted = true;

    const fetchDynamicCourse = async () => {
      if (!courseIdParam) {
        setDynamicCourse(null);
        return;
      }

      setIsCourseLoading(true);
      try {
        const response = await api.get(`/courses/${courseIdParam}/`);
        if (isMounted) {
          setDynamicCourse(toDynamicCourseDetails(response.data));
        }
      } catch (error) {
        console.error('Error fetching public course detail:', error);
        if (isMounted) {
          setDynamicCourse(null);
        }
      } finally {
        if (isMounted) {
          setIsCourseLoading(false);
        }
      }
    };

    fetchDynamicCourse();

    return () => {
      isMounted = false;
    };
  }, [courseIdParam]);

  const selectedCourse = dynamicCourse || (courseParam ? (courseDetailsByTitle[courseParam] || courseDetailsByTitle['Full Stack']) : null);
  const coursesToRender = selectedCourse ? [selectedCourse] : Object.values(courseDetailsByTitle);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#ffffff',
        pt: `${PUBLIC_SITE_HEADER_HEIGHT}px`,
        fontFamily: HOME_FONT_FAMILY,
        overflowX: 'hidden',
        '& .MuiTypography-root': {
          fontFamily: HOME_FONT_FAMILY,
          letterSpacing: '0.005em',
        },
        '& .MuiButton-root': {
          fontFamily: HOME_FONT_FAMILY,
          letterSpacing: '0.005em',
        },
      }}
    >
      <PublicSiteHeader navItems={publicHeaderNavItems} activeItemId="courses" />

      <Box
        sx={{
          backgroundColor: '#dfeaf7',
          width: '100%',
          borderBottom: '1px solid rgba(17, 24, 39, 0.1)',
        }}
      >
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            px: { xs: 3, sm: 4, md: 5.5 },
            maxWidth: `${PAGE_WIDTH}px !important`,
            minHeight: { xs: 52, md: 58 },
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography
              component={RouterLink}
              to="/"
              sx={{
                color: '#2f3746',
                textDecoration: 'none',
                fontSize: { xs: '0.95rem', md: '1.02rem' },
                fontWeight: 600,
                '&:hover': { color: '#1c1e53' },
              }}
            >
              {'\u2190'} Home
            </Typography>
            <Typography sx={{ color: '#667085', fontSize: { xs: '0.95rem', md: '1.02rem' }, fontWeight: 500 }}>
              Course {'\u203a'}
            </Typography>
            <Typography sx={{ color: '#667085', fontSize: { xs: '0.95rem', md: '1.02rem' }, fontWeight: 500 }}>
              Detail courses {'\u203a'}
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth={false}
        sx={{
          maxWidth: `${CONTENT_WIDTH}px !important`,
          px: { xs: 3, sm: 4, md: 5.5 },
          py: { xs: 4, md: 5.5 },
        }}
      >
        {isCourseLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
            <CircularProgress />
            <Typography sx={{ color: '#5e6f88' }}>Loading course details...</Typography>
          </Box>
        ) : (
          coursesToRender.map((course, idx) => {
            const aboutParagraphs = Array.isArray(course.about)
              ? course.about
              : String(course.about || '')
                  .split(/\n\s*\n/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean);
            const coursePoints = Array.isArray(course.points) ? course.points.filter(Boolean) : [];

            return (
              <Box
                key={course.title}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: { xs: 4, md: 6.5 },
                  alignItems: 'flex-start',
                  mb: idx === coursesToRender.length - 1 ? 0 : { xs: 6, md: 8 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '2.4rem', md: '3.25rem' },
                      fontWeight: 580,
                      color: '#2f3545',
                      lineHeight: 1,
                      letterSpacing: '-0.035em',
                    }}
                  >
                    {course.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      color: '#81879a',
                      mt: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    {course.subtitle}
                  </Typography>

                  <Box
                    component="img"
                    src={course.image}
                    alt={course.title}
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_COURSE_IMAGE;
                    }}
                    sx={{
                      width: '100%',
                      mt: { xs: 2.5, md: 3 },
                      height: { xs: 280, sm: 340, md: 440 },
                      objectFit: 'cover',
                      borderRadius: '2px',
                      display: 'block',
                      backgroundColor: '#f4f6f9',
                    }}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, pt: { md: 0.25 } }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '2rem', md: '2.75rem' },
                      fontWeight: 500,
                      color: '#2f3545',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    About the Course
                  </Typography>

                  <Box sx={{ mt: { xs: 2, md: 3 } }}>
                    {aboutParagraphs.map((paragraph, paragraphIndex) => (
                      <Typography
                        key={`${course.title}-paragraph-${paragraphIndex}`}
                        sx={{
                          fontSize: { xs: '1rem', md: '1.04rem' },
                          color: '#7b8190',
                          lineHeight: 2,
                          mb: paragraphIndex === aboutParagraphs.length - 1 ? 0 : { xs: 2.25, md: 3 },
                        }}
                      >
                        {paragraph}
                      </Typography>
                    ))}
                  </Box>

                  {coursePoints.length > 0 ? (
                    <Box sx={{ mt: { xs: 3, md: 4 } }}>
                      {course.benefitsLead ? (
                        <Typography
                          sx={{
                            fontSize: { xs: '1rem', md: '1.04rem' },
                            color: '#7b8190',
                            lineHeight: 1.8,
                            mb: 1.25,
                          }}
                        >
                          {course.benefitsLead}
                        </Typography>
                      ) : null}

                      <Box component="ol" sx={{ m: 0, pl: '1.3rem', color: '#7b8190' }}>
                        {coursePoints.map((point) => (
                          <Typography
                            key={point}
                            component="li"
                            sx={{
                              fontSize: { xs: '0.98rem', md: '1rem' },
                              lineHeight: 1.9,
                              mb: 0.4,
                              color: '#7b8190',
                            }}
                          >
                            {point}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            );
          })
        )}
      </Container>
    </Box>
  );
};

export default HomeCourseDetails;

