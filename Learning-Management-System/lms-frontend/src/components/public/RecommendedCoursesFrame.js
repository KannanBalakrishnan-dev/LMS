import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ExpandMore } from '@mui/icons-material';
import {
    Box,
    Button,
    Container,
    Grid,
    Stack,
    Typography,
} from '@mui/material';

function CourseShowcaseCard({ brand, course }) {
    return (
        <Box
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.14)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                boxShadow: '0 22px 40px rgba(5, 8, 28, 0.24)',
                backdropFilter: 'blur(4px)',
                height: '100%',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    height: { xs: 220, md: 262 },
                    overflow: 'hidden',
                }}
            >
                <Box
                    component="img"
                    src={course.image}
                    alt={course.title}
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(180deg, rgba(4,8,28,0.06) 0%, rgba(4,8,28,0.26) 58%, rgba(4,8,28,0.62) 100%)',
                    }}
                />
            </Box>

            <Box
                sx={{
                    position: 'relative',
                    p: { xs: 2.1, md: 2.4 },
                    minHeight: { xs: 170, md: 196 },
                    background:
                        'linear-gradient(165deg, rgba(183,188,224,0.42), rgba(73,79,130,0.76))',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(circle at 12% 100%, rgba(255,255,255,0.2), transparent 56%), radial-gradient(circle at 94% 96%, rgba(255,255,255,0.14), transparent 58%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Typography
                    sx={{
                        position: 'relative',
                        color: brand.white,
                        fontWeight: 700,
                        fontSize: { xs: '1.7rem', md: '2.1rem' },
                        lineHeight: 1.05,
                    }}
                >
                    {course.title}
                </Typography>
                <Typography
                    sx={{
                        position: 'relative',
                        color: 'rgba(255,255,255,0.78)',
                        mt: 1.1,
                        fontSize: { xs: '0.98rem', md: '1.08rem' },
                        lineHeight: 1.48,
                        maxWidth: 310,
                    }}
                >
                    {course.subtitle}
                </Typography>
            </Box>
        </Box>
    );
}

export default function RecommendedCoursesFrame({
    brand,
    headingSx,
    maxWidth = 1440,
    courses = [],
}) {
    return (
        <Box
            id="courses"
            sx={{
                backgroundColor: brand.navy,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <Container
                maxWidth={false}
                disableGutters
                sx={{
                    width: '100%',
                    maxWidth: `${maxWidth}px !important`,
                    px: { xs: 2, sm: 3, md: 7 },
                    py: { xs: 4, md: 5.1 },
                    boxSizing: 'border-box',
                }}
            >
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                    sx={{ gap: { xs: 2, md: 0 } }}
                >
                    <Typography
                        sx={{
                            color: brand.white,
                            ...headingSx,
                        }}
                    >
                        Recommended Courses
                        <br />
                        For You
                    </Typography>

                    <Stack direction="row" spacing={1.8} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Button
                            endIcon={<ExpandMore />}
                            sx={{
                                color: brand.white,
                                textTransform: 'none',
                                fontSize: { xs: '1rem', md: '1.18rem' },
                                fontWeight: 500,
                                minWidth: 0,
                                px: 0,
                                '&:hover': { backgroundColor: 'transparent' },
                            }}
                        >
                            Category
                        </Button>

                        <Button
                            component={RouterLink}
                            to="/courses"
                            sx={{
                                backgroundColor: brand.yellow,
                                color: '#202020',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: { xs: '1rem', md: '1.16rem' },
                                borderRadius: 1.4,
                                minWidth: { xs: 110, md: 138 },
                                height: { xs: 42, md: 50 },
                                px: { xs: 2.4, md: 3.1 },
                                boxShadow: 'none',
                                '&:hover': { backgroundColor: '#e9c353', boxShadow: 'none' },
                            }}
                        >
                            See all
                        </Button>
                    </Stack>
                </Stack>

                <Box sx={{ mt: { xs: 2, md: 2.5 }, borderTop: '2px solid rgba(255,255,255,0.82)' }} />

                <Grid container spacing={{ xs: 2.5, md: 3.2 }} sx={{ mt: { xs: 1.2, md: 4 } }}>
                    {courses.map((course) => (
                        <Grid key={course.title} size={{ xs: 12, md: 4 }}>
                            <CourseShowcaseCard brand={brand} course={course} />
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
