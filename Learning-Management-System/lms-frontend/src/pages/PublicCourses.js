import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Card,
    Container,
    IconButton,
    InputBase,
    Stack,
    Typography,
} from '@mui/material';
import { Facebook, Instagram, LinkedIn, YouTube } from '@mui/icons-material';
import PublicSiteHeader, { PUBLIC_SITE_HEADER_HEIGHT } from '../components/public/PublicSiteHeader';
import { createPublicSiteHeaderNavItems } from '../components/public/publicSiteNav';

import logoImage from '../assets/vdartacademylogo1 3.png';
import courseImage3 from '../assets/pexels-olya-kobruseva-5561923 1 - Copy.png';
import courseImage4 from '../assets/pexels-shane-aldendorff-924676 1.png';
import courseImage5 from '../assets/pexels-brett-sayles-2881232 1.png';
import courseImage6 from '../assets/pexels-picjumbocom-196645 (1) 1.png';

const courseImage1 = '/image-001.png';
const courseImage2 = '/image-002.png';

const HOME_FONT_FAMILY = '"Poppins", "Inter", "Segoe UI", sans-serif';
const PAGE_WIDTH = 1400;
const SEARCH_FIELD_WIDTH_DESKTOP = 800;
const CARD_HEIGHT_DESKTOP = 400;
const CARD_IMAGE_HEIGHT_DESKTOP = 215;
const CARD_MAX_WIDTH = 385;

const palette = {
    page: '#ffffff',
    stripe: '#f0f4fa',
    footer: '#DCEBF9',
    text: '#1a1f2e',
    muted: '#5a6275',
    border: '#e2e6ec',
    lightBg: '#f9fafc',
};

const publicHeaderNavItems = createPublicSiteHeaderNavItems();

const courseCards = [
    {
        title: 'Full Stack',
        subtitle: 'Master End-to-End Web Application Development',
        image: courseImage1,
    },
    {
        title: 'Digital Marketing',
        subtitle: 'Build High-Impact Campaigns with Digital Strategies',
        image: courseImage2,
    },
    {
        title: 'Data Analytics',
        subtitle: 'Turn Data into Actionable Business insights and Drive smarter Business Decisions',
        image: courseImage3,
    },
    {
        title: 'AI/ML',
        subtitle: 'Build Intelligent Systems Using AI and Machine Learning',
        image: courseImage4,
    },
    {
        title: 'Cloud Computing',
        subtitle: 'Learn to Build, Deploy, and Scale Applications on the Cloud',
        image: courseImage5,
    },
    {
        title: 'UI/UX Design',
        subtitle: 'Create User-Centered Designs and Seamless Experiences in the world of UI/UX design',
        image: courseImage6,
    },
];

const socialButtonSx = {
    width: { xs: 55, md: 60 },
    height: { xs: 55, md: 60 },
    border: '1px solid rgba(26, 31, 46, 0.15)',
    color: '#1a1f2e',
    backgroundColor: 'transparent',
    '&:hover': {
        backgroundColor: 'rgba(28, 30, 83, 0.05)',
        borderColor: '#1c1e53',
    },
};

const socialLinks = {
    Facebook: 'https://www.facebook.com/VDartAcademy',
    Instagram: 'https://www.instagram.com/vdart_academy',
    LinkedIn: 'https://www.linkedin.com/company/vdart-academy',
    YouTube: 'https://youtube.com/@vdartacademy',
};

const PublicCourses = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCourses = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return courseCards;
        return courseCards.filter((course) => {
            const title = course.title.toLowerCase();
            const subtitle = course.subtitle.toLowerCase();
            return title.includes(term) || subtitle.includes(term);
        });
    }, [searchTerm]);

    return (
        <Box
            sx={{
                bgcolor: palette.page,
                minHeight: '100vh',
                pt: `${PUBLIC_SITE_HEADER_HEIGHT}px`,
                color: palette.text,
                fontFamily: HOME_FONT_FAMILY,
                overflowX: 'hidden',
                '& .MuiTypography-root': {
                    fontFamily: HOME_FONT_FAMILY,
                    letterSpacing: '0.01em',
                },
                '& .MuiButton-root, & .MuiInputBase-root, & .MuiInputBase-input': {
                    fontFamily: HOME_FONT_FAMILY,
                },
            }}
        >
            <PublicSiteHeader navItems={publicHeaderNavItems} activeItemId="courses" />

            {/* Breadcrumb */}
            <Box
                sx={{
                    bgcolor: palette.stripe,
                    borderBottom: '1px solid #e2e8f0',
                }}
            >
                <Container
                    maxWidth={false}
                    sx={{
                        maxWidth: `${PAGE_WIDTH}px !important`,
                        px: { xs: 3, sm: 4, md: 5 },
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={4}
                        sx={{
                            minHeight: { xs: 50, md: 55 },
                            }}
                    >
                        <Typography
                            component={RouterLink}
                            to="/home"
                            sx={{
                                color: '#2f3746',
                                textDecoration: 'none',
                                fontSize: { xs: '1rem', md: '1.2rem' },
                                fontWeight: 600,
                                '&:hover': { color: '#1c1e53' },
                            }}
                        >
                            ← Home
                        </Typography>
                        <Typography
                            sx={{
                                color: '#5b6473',
                                fontSize: { xs: '1rem', md: '1.2rem' },
                                fontWeight: 600,
                            }}
                        >
                            Courses ›
                        </Typography>
                    </Stack>
                </Container>
            </Box>

            {/* Main Content */}
            <Container
                maxWidth={false}
                sx={{
                    maxWidth: `${PAGE_WIDTH}px !important`,
                    px: { xs: 3, sm: 4, md: 5 },
                    pt: { xs: 2, md: 2.5 },
                    pb: { xs: 5, md: 6 },
                }}
            >
                {/* Search Bar */}
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: { xs: '100%', md: SEARCH_FIELD_WIDTH_DESKTOP },
                        mx: 'auto',
                        mb: { xs: 5, md: 6 },
                    }}
                >
                    <Box
                        sx={{

                            minHeight: 48,
                            border: '1px solid #d0d7e5',
                            borderRadius: '12px',
                            bgcolor: palette.lightBg,
                            px: 3,
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        }}
                    >
                        <InputBase
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search for Courses..."
                            inputProps={{ 'aria-label': 'Search courses' }}
                            sx={{
                                width: '100%',
                                fontSize: '1rem',
                                color: '#2d3748',
                                '& input::placeholder': {
                                    color: '#7f8aa3',
                                    opacity: 0.8,
                                    fontSize: '0.95rem',
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Course Grid */}
                {filteredCourses.length === 0 ? (
                    <Box
                        sx={{
                            border: '1px dashed #cbd5e0',
                            borderRadius: '16px',
                            p: 3,
                            textAlign: 'center',
                            maxWidth: 350,
                            mx: 'auto',
                            bgcolor: palette.lightBg,
                        }}
                    >
                        <Typography sx={{ fontSize: '1.2rem', color: '#4a5568', fontWeight: 500 }}>
                            No courses found for "{searchTerm}".
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                            },
                            justifyContent: 'center',
                            gap: { xs: 2.5, sm: 3, md: 3.5 },
                        }}
                    >
                        {filteredCourses.map((course) => (
                            <Card
                                key={course.title}
                                component={RouterLink}
                                to={`/home/details?course=${encodeURIComponent(course.title)}`}
                                sx={{
                                    textDecoration: 'none',
                                    width: '100%',
                                    maxWidth: `${CARD_MAX_WIDTH}px`,
                                    mx: 'auto',
                                    borderRadius: '22px',
                                    overflow: 'hidden',
                                    border: '1px solid #d1d1d1',
                                    boxShadow: '0 4px 12px rgba(188, 18, 18, 0.03)',
                                    bgcolor: '#ffffff',

                                    transition: 'all 0.25s ease',
                                    height: { xs: 360, sm: 380, md: CARD_HEIGHT_DESKTOP },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 16px 26px -12px rgba(0,0,0,0.08)',
                                        borderColor: 'rgba(28, 30, 83, 0.28)',
                                    },
                                }}
                            >
                                <Box
                                    component="img"
                                    src={course.image}
                                    alt={course.title}
                                    sx={{
                                        width: '100%',
                                        height: { xs: 185, sm: 200, md: CARD_IMAGE_HEIGHT_DESKTOP },
                                        objectFit: 'cover',
                                        bgcolor: '#f0f4fa',
                                        borderTopLeftRadius: '22px',
                                        borderTopRightRadius: '22px',
                                    }}
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/400x240?text=Course+Image';
                                    }}
                                />
                                <Box
                                    sx={{
                                        p: { xs: 2.25, md: 2.5 },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                        flexGrow: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                          fontFamily: 'Poppins',
                                          color: '#2d2f39',
                                          fontSize: { xs: '1.35rem', md: '1.5rem' }, // 👈 bigger
                                           fontWeight: 600,
                                           lineHeight: 1.3,
                                          letterSpacing: '0.3px',
                                          minHeight: { xs: 30, md: 32 },
                                          mb: 0,
                                    }}
                                    >
                                        {course.title}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Poppins',
                                            color: '#7a8194',              // 👈 lighter gray
                                            fontSize: { xs: '1rem', md: '1rem' },
                                            lineHeight: 1.6,
                                            letterSpacing: '0.5px',        // 👈 spaced text
                                            wordSpacing: '2px',
                                            textAlign: 'left',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {course.subtitle}
                                    </Typography>
                                </Box>
                            </Card>
                        ))}
                    </Box>
                )}
            </Container>

          {/* Footer */}
            <Box
                sx={{
                    bgcolor: palette.footer,
                    width: '100%',
                    mt: { xs: 6, md: 8 },
                    opacity: 1,
                }}
            >
                <Container
                    maxWidth={false}
                    sx={{
                        maxWidth: `${PAGE_WIDTH}px !important`,
                        px: { xs: 3, sm: 4, md: 10, lg: 12 },
                        py: { xs: 4, md: 5 },
                        position: 'relative',
                    }}
                >
                    <Stack spacing={{ xs: 4, md: 2 }}>
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            spacing={{ xs: 3, md: 2}}
                        >
                            <Box
                                component="img"
                                src={logoImage}
                                alt="VDart Academy"
                                sx={{
                                    width: { xs: 300, sm: 260, md: 200 },
                                    height: 'auto',
                                    position: { xs: 'static', md: 'relative' },
                                    top: { md: 0 },
                                    ml: { md: 6 },
                                }}
                            />

                            <Stack
                               direction="row"
                               spacing={2}
                               sx={{
                               mt: { xs: 2, md: 0 },
  justifyContent: { xs: 'flex-start', md: 'flex-end' },          // 👈 adjust horizontal
                }}
>
                                <IconButton
                                    component="a"
                                    href={socialLinks.Facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={socialButtonSx}
                                    aria-label="Facebook"
                                >
                                    <Facebook sx={{ fontSize: { xs: 26, md: 30 } }} />
                                </IconButton>
                                <IconButton
                                    component="a"
                                    href={socialLinks.Instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={socialButtonSx}
                                    aria-label="Instagram"
                                >
                                    <Instagram sx={{ fontSize: { xs: 26, md: 30 } }} />
                                </IconButton>
                                <IconButton
                                    component="a"
                                    href={socialLinks.LinkedIn}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={socialButtonSx}
                                    aria-label="LinkedIn"
                                >
                                    <LinkedIn sx={{ fontSize: { xs: 26, md: 30 } }} />
                                </IconButton>
                                <IconButton
                                    component="a"
                                    href={socialLinks.YouTube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={socialButtonSx}
                                    aria-label="YouTube"
                                >
                                    <YouTube sx={{ fontSize: { xs: 26, md: 30 } }} />
                                </IconButton>
                            </Stack>
                        </Stack>

                        <Box sx={{ borderTop: '1px solid #cfd8e3' }} />

                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            spacing={{ xs: 1.5, md: 3 }}
                        >
                            <Typography
                                sx={{
                                    color: '#1f2836',
                                    fontSize: { xs: '1rem', md: '16px' },
                                    lineHeight: 1,
                                    fontWeight: 400,
                                    position: { xs: 'static', md: 'relative' },
                                    top: { md: 0 },
                                    left: { md: 30 },
                                }}
                            >
                                {'\u00A9'} 2026 VDart Academy. Empowering learners worldwide.
                            </Typography>

                        </Stack>
                    </Stack>
                </Container>
            </Box>

        </Box>
    );
};    




export default PublicCourses;

