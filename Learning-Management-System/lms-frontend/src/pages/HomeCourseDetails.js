import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api';
import PublicSiteHeader, { PUBLIC_SITE_HEADER_HEIGHT } from '../components/public/PublicSiteHeader';
import { createPublicSiteHeaderNavItems } from '../components/public/publicSiteNav';

const HOME_FONT_FAMILY = '"Poppins", sans-serif';
const PAGE_WIDTH = 1400;


const CONTENT_WIDTH = 1320;
const DEFAULT_COURSE_IMAGE = '/image-001.png';

const publicHeaderNavItems = createPublicSiteHeaderNavItems();

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

const CourseDetailSkeleton = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: { xs: 4, md: 6.5 },
      alignItems: 'flex-start',
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Skeleton
        variant="text"
        width="70%"
        sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, transform: 'none' }}
      />
      <Skeleton
        variant="text"
        width="90%"
        sx={{ fontSize: { xs: '0.95rem', md: '1rem' }, mt: 1, transform: 'none' }}
      />
      <Skeleton
        variant="rectangular"
        sx={{
          width: '100%',
          mt: { xs: 2.5, md: 3 },
          height: { xs: 280, sm: 340, md: 440 },
          borderRadius: '2px',
        }}
      />
    </Box>

    <Box sx={{ flex: 1, minWidth: 0, pt: { md: 0.25 } }}>
      <Skeleton
        variant="text"
        width="60%"
        sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, transform: 'none' }}
      />

      <Box sx={{ mt: { xs: 2, md: 3 } }}>
        {[1, 2].map((paragraphIndex) => (
          <Stack key={`skeleton-paragraph-${paragraphIndex}`} spacing={0.75} sx={{ mb: { xs: 2.25, md: 3 } }}>
            <Skeleton variant="text" width="100%" sx={{ fontSize: '1.04rem', transform: 'none' }} />
            <Skeleton variant="text" width="100%" sx={{ fontSize: '1.04rem', transform: 'none' }} />
            <Skeleton variant="text" width="75%" sx={{ fontSize: '1.04rem', transform: 'none' }} />
          </Stack>
        ))}
      </Box>

      <Box sx={{ mt: { xs: 3, md: 4 } }}>
        <Skeleton variant="text" width="45%" sx={{ fontSize: '1.04rem', mb: 1.25, transform: 'none' }} />
        <Stack spacing={0.75} sx={{ pl: '1.3rem' }}>
          {[1, 2, 3].map((pointIndex) => (
            <Skeleton
              key={`skeleton-point-${pointIndex}`}
              variant="text"
              width={`${80 - pointIndex * 10}%`}
              sx={{ fontSize: '1rem', transform: 'none' }}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  </Box>
);

const CourseNotFound = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
    <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, color: '#2f3545' }}>
      We couldn't find that course
    </Typography>
    <Typography sx={{ color: '#7b8190', textAlign: 'center', maxWidth: 420 }}>
      The course you're looking for may have moved or no longer exists. Try browsing all
      available courses instead.
    </Typography>
    <Button component={RouterLink} to="/course-details" variant="outlined" sx={{ mt: 1 }}>
      View all courses
    </Button>
  </Box>
);

const HomeCourseDetails = () => {
  const { courseId } = useParams();
  const [dynamicCourse, setDynamicCourse] = useState(null);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchDynamicCourse = async () => {
      if (!courseId) {
        setDynamicCourse(null);
        setFetchFailed(false);
        return;
      }

      setIsCourseLoading(true);
      setFetchFailed(false);
      try {
        const response = await api.get(`/courses/${courseId}/`);
        if (isMounted) {
          setDynamicCourse(toDynamicCourseDetails(response.data));
        }
      } catch (error) {
        console.error('Error fetching public course detail:', error);
        if (isMounted) {
          setDynamicCourse(null);
          setFetchFailed(true);
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
  }, [courseId]);

  // Resolve which course(s) to render, with an explicit "not found" state
  // instead of silently falling back to an unrelated course or dumping every course.
  let selectedCourse = null;
  let courseNotFound = false;

  if (courseId) {
    if (dynamicCourse) {
      selectedCourse = dynamicCourse;
    } else if (fetchFailed && !isCourseLoading) {
      courseNotFound = true;
    }
  }

  const coursesToRender = selectedCourse ? [selectedCourse] : [];

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
          <CourseDetailSkeleton />
        ) : courseNotFound ? (
          <CourseNotFound />
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
                key={`${course.title}-${idx}`}
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
                        {coursePoints.map((point, pointIndex) => (
                          <Typography
                            key={`${course.title}-point-${pointIndex}`}
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