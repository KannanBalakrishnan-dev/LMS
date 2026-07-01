import React from 'react';
import {
    Box,
    Button,
    Container,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import aboutTeamIllustration from '../../assets/unsplash_vbxyFxlgpjM.jpg';

export default function AboutUsDesktop({
    brand,
    headingSx,
    maxWidth = 1440,
}) {
    return (
        <Box
            id="about-us"
            sx={{
                backgroundColor: '#c8d6e5',
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
                    py: { xs: 4, md: 5.4 },
                    boxSizing: 'border-box',
                }}
            >
                <Grid container spacing={{ xs: 3.2, md: 5.5 }} alignItems="center">
                    <Grid size={{ xs: 12, md: 5.5 }}>
                        <Stack spacing={{ xs: 1.5, md: 2.1 }} sx={{ maxWidth: 620 }}>
                            <Typography
                                sx={{
                                    color: '#3c4353',
                                    fontSize: { xs: '1.4rem', md: '2.2rem' },
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                }}
                            >
                                About Us
                            </Typography>

                            <Typography
                                sx={{
                                    ...headingSx,
                                    color: '#232b3f',
                                    maxWidth: 560,
                                }}
                            >
                                Everything you need to help you grow
                            </Typography>

                            <Typography
                                sx={{
                                    color: '#4e5562',
                                    fontSize: { xs: '1.02rem', md: '1.34rem' },
                                    lineHeight: 1.5,
                                    maxWidth: 560,
                                }}
                            >
                                Powerful tools designed to help you create, manage, and scale your
                                online education business without the technical headaches.
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6.5 }}>
                        <Box
                            component="img"
                            src={aboutTeamIllustration}
                            alt="Team collaboration"
                            sx={{
                                width: '100%',
                                height: { xs: 280, md: 408 },
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: 0,
                                boxShadow: '0 18px 38px rgba(15, 23, 42, 0.12)',
                            }}
                        />
                    </Grid>
                </Grid>

                <Box
                    sx={{
                        mt: { xs: 3, md: 3.6 },
                        display: 'flex',
                        justifyContent: { xs: 'center', md: 'flex-start' },
                    }}
                >
                    <Button
                        variant="contained"
                        sx={{
                            minWidth: { xs: 148, md: 132 },
                            py: { xs: 0.95, md: 0.85 },
                            px: { xs: 2.4, md: 2.8 },
                            borderRadius: 999,
                            backgroundColor: brand.yellow,
                            color: '#161616',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: { xs: '0.95rem', md: '0.96rem' },
                            lineHeight: 1.05,
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: '#e9c353',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        Read More
                    </Button>
                </Box>
            </Container>
        </Box>
    );
}
