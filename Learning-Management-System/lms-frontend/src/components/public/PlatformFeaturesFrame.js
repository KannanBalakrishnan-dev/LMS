import React from 'react';
import {
    AssignmentTurnedInOutlined,
    AutoGraph,
    Bolt,
    ForumOutlined,
    HowToRegOutlined,
    OndemandVideoOutlined,
    QuizOutlined,
} from '@mui/icons-material';
import {
    Box,
    Container,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import phoneHandFrame from '../../assets/Hand.jpg';

const cardSurfaceSx = {
    borderRadius: { xs: 3, md: 4 },
    border: '1px solid rgba(17, 24, 39, 0.08)',
    backgroundColor: '#ffffff',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
};

const builderPills = [
    { label: 'Video', icon: <OndemandVideoOutlined sx={{ fontSize: 16 }} /> },
    { label: 'Quizzes', icon: <QuizOutlined sx={{ fontSize: 16 }} /> },
    { label: 'Tasks', icon: <AssignmentTurnedInOutlined sx={{ fontSize: 16 }} /> },
];

const attendanceRows = [
    { label: 'Present', value: '92%', width: '92%', color: '#4835d8' },
    { label: 'On time', value: '87%', width: '87%', color: '#1f7a53' },
    { label: 'Follow-up', value: '64%', width: '64%', color: '#d7ac34' },
];

function FeatureCard({ accent, icon, title, description, minHeight, children }) {
    return (
        <Box
            sx={{
                ...cardSurfaceSx,
                minHeight,
                p: { xs: 2.2, md: 2.8 },
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    width: 58,
                    height: 58,
                    borderRadius: 2.4,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: accent.bg,
                    color: accent.fg,
                    mb: 2,
                    border: `1px solid ${accent.border}`,
                }}
            >
                {icon}
            </Box>
            <Typography
                sx={{
                    color: '#141a2a',
                    fontWeight: 700,
                    fontSize: { xs: '1.15rem', md: '1.18rem' },
                    lineHeight: 1.18,
                }}
            >
                {title}
            </Typography>
            <Typography
                sx={{
                    color: '#667085',
                    mt: 1.1,
                    fontSize: { xs: '0.96rem', md: '0.98rem' },
                    lineHeight: 1.6,
                    maxWidth: 320,
                }}
            >
                {description}
            </Typography>
            <Box sx={{ mt: 2.2 }}>
                {children}
            </Box>
        </Box>
    );
}

export default function PlatformFeaturesFrame({
    brand,
    headingSx,
    maxWidth = 1440,
}) {
    return (
        <Box
            id="details"
            sx={{
                backgroundColor: '#f3f4f6',
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
                    px: { xs: 2, sm: 3, md: 7.5 },
                    py: { xs: 4, md: 4.8 },
                    boxSizing: 'border-box',
                }}
            >
                <Typography
                    sx={{
                        ...headingSx,
                        color: '#3b3b41',
                    }}
                >
                    Platform Features
                </Typography>

                <Grid
                    container
                    spacing={{ xs: 2.2, md: 3.2 }}
                    alignItems="stretch"
                    sx={{ mt: { xs: 2.2, md: 3.2 } }}
                >
                    <Grid size={{ xs: 12, lg: 3.1 }}>
                        <Stack spacing={{ xs: 2, md: 3 }}>
                            <FeatureCard
                                accent={{
                                    bg: '#edf4ff',
                                    fg: '#205ec9',
                                    border: 'rgba(32, 94, 201, 0.12)',
                                }}
                                icon={<AutoGraph sx={{ fontSize: 28 }} />}
                                title="Advanced analytics"
                                description="Track student progress, engagement rates, and revenue with a dashboard designed for quick decisions."
                                minHeight={{ xs: 250, md: 284 }}
                            >
                                <Box
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: '#f6f9ff',
                                        border: '1px solid rgba(32, 94, 201, 0.08)',
                                        p: 1.6,
                                    }}
                                >
                                    <Typography sx={{ color: '#1d2a52', fontWeight: 700, fontSize: '0.82rem', mb: 1.2 }}>
                                        Monthly Progress
                                    </Typography>
                                    <Stack direction="row" alignItems="flex-end" spacing={0.9} sx={{ minHeight: 88 }}>
                                        {[36, 52, 44, 72, 66, 92].map((height, index) => (
                                            <Box
                                                key={height}
                                                sx={{
                                                    width: 16,
                                                    height,
                                                    borderRadius: '999px 999px 6px 6px',
                                                    bgcolor: index === 5 ? brand.yellow : '#cbd7f2',
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                                            <Typography key={month} sx={{ color: '#7d8799', fontSize: '0.72rem', fontWeight: 600 }}>
                                                {month}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            </FeatureCard>

                            <FeatureCard
                                accent={{
                                    bg: '#fff3d8',
                                    fg: '#8a6200',
                                    border: 'rgba(138, 98, 0, 0.12)',
                                }}
                                icon={<Bolt sx={{ fontSize: 28 }} />}
                                title="Instant course builder"
                                description="Drag-and-drop course creation with support for video lessons, quizzes, and assignment checkpoints."
                                minHeight={{ xs: 250, md: 284 }}
                            >
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {builderPills.map((pill) => (
                                        <Stack
                                            key={pill.label}
                                            direction="row"
                                            spacing={0.8}
                                            alignItems="center"
                                            sx={{
                                                px: 1.25,
                                                py: 0.8,
                                                borderRadius: 999,
                                                bgcolor: '#fff8e8',
                                                border: '1px solid rgba(138, 98, 0, 0.12)',
                                                color: '#6a4d00',
                                            }}
                                        >
                                            {pill.icon}
                                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                                                {pill.label}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </FeatureCard>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 5.8 }}>
                        <Box
                            sx={{
                                ...cardSurfaceSx,
                                minHeight: { xs: 480, md: 706 },
                                position: 'relative',
                                overflow: 'hidden',
                                background:
                                    'radial-gradient(circle at 20% 20%, rgba(241, 207, 106, 0.28), transparent 28%), radial-gradient(circle at 86% 22%, rgba(77, 142, 245, 0.22), transparent 32%), linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: { xs: 2.2, md: 3.2 },
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: { xs: 18, md: 32 },
                                    left: { xs: 18, md: 32 },
                                    width: { xs: 168, md: 232 },
                                    p: 1.6,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                    border: '1px solid rgba(17, 24, 39, 0.08)',
                                    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)',
                                    zIndex: 3,
                                }}
                            >
                                <Typography sx={{ color: '#22252f', fontWeight: 700, fontSize: '0.86rem' }}>
                                    Study activity
                                </Typography>
                                <Typography sx={{ color: '#7c8392', fontSize: '0.8rem', mt: 0.3 }}>
                                    7h 40m this week
                                </Typography>
                                <Stack spacing={0.9} sx={{ mt: 1.5 }}>
                                    {[74, 52, 88, 63].map((width, index) => (
                                        <Box
                                            key={width}
                                            sx={{
                                                height: 10,
                                                width: `${width}%`,
                                                borderRadius: 999,
                                                bgcolor: index === 2 ? brand.yellow : '#ccd7e6',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: { xs: 16, md: 28 },
                                    bottom: { xs: 24, md: 42 },
                                    width: { xs: 170, md: 220 },
                                    p: 1.7,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.94)',
                                    border: '1px solid rgba(17, 24, 39, 0.08)',
                                    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.09)',
                                    zIndex: 3,
                                }}
                            >
                                <Typography sx={{ color: '#22252f', fontWeight: 700, fontSize: '0.88rem' }}>
                                    Monthly Progress
                                </Typography>
                                <Box
                                    sx={{
                                        mt: 1.6,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(6, 1fr)',
                                        alignItems: 'end',
                                        gap: 0.9,
                                        minHeight: 92,
                                    }}
                                >
                                    {[42, 48, 66, 62, 82, 98].map((height, index) => (
                                        <Box
                                            key={height}
                                            sx={{
                                                height,
                                                borderRadius: '999px 999px 8px 8px',
                                                bgcolor: index >= 4 ? '#2d7ff0' : '#d4dceb',
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Box
                                    sx={{
                                        mt: 1.4,
                                        height: 9,
                                        borderRadius: 999,
                                        background: 'linear-gradient(90deg, #d4dceb 0%, #d4dceb 32%, #2d7ff0 32%, #2d7ff0 100%)',
                                    }}
                                />
                            </Box>

                            <Box
                                sx={{
                                    position: 'relative',
                                    width: { xs: 265, sm: 320, md: 405 },
                                    height: { xs: 440, sm: 525, md: 650 },
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: { xs: '30px 44px 48px', md: '42px 70px 70px' },
                                        borderRadius: { xs: '30px', md: '38px' },
                                        background:
                                            'linear-gradient(180deg, #f9fafb 0%, #eef2f7 52%, #e4ebf5 100%)',
                                        border: '1px solid rgba(17, 24, 39, 0.08)',
                                        overflow: 'hidden',
                                        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: { xs: 2, md: 2.6 },
                                            pt: { xs: 1.6, md: 2.2 },
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src="/vdart-logo.png"
                                            alt="VDart Academy"
                                            sx={{ width: { xs: 74, md: 92 }, height: 'auto' }}
                                        />
                                        <Stack direction="row" spacing={0.7}>
                                            {['#f1cf6a', '#7cdad1', '#ef8dad'].map((color) => (
                                                <Box
                                                    key={color}
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: color,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>

                                    <Box sx={{ px: { xs: 2, md: 2.6 }, pt: { xs: 2, md: 2.5 } }}>
                                        <Typography sx={{ color: '#1a2233', fontWeight: 700, fontSize: { xs: '0.82rem', md: '0.96rem' } }}>
                                            Course dashboard
                                        </Typography>
                                        <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                                            {[88, 52, 76, 34].map((width, index) => (
                                                <Box
                                                    key={width}
                                                    sx={{
                                                        height: index === 3 ? 42 : 10,
                                                        width: `${width}%`,
                                                        borderRadius: 999,
                                                        bgcolor: index === 1 ? brand.yellow : '#d3dce9',
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>

                                    <Box
                                        sx={{
                                            px: { xs: 2, md: 2.6 },
                                            mt: { xs: 2.2, md: 3 },
                                            display: 'grid',
                                            gridTemplateColumns: '1.1fr 1fr',
                                            gap: { xs: 1.4, md: 1.8 },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                borderRadius: 2.2,
                                                bgcolor: '#ffffff',
                                                border: '1px solid rgba(17, 24, 39, 0.08)',
                                                p: 1.3,
                                            }}
                                        >
                                            <Typography sx={{ color: '#1a2233', fontWeight: 700, fontSize: '0.76rem' }}>
                                                Revenue
                                            </Typography>
                                            <Stack direction="row" spacing={0.8} alignItems="flex-end" sx={{ mt: 1.2, minHeight: 64 }}>
                                                {[24, 36, 48, 30, 54].map((height, index) => (
                                                    <Box
                                                        key={height}
                                                        sx={{
                                                            flex: 1,
                                                            height,
                                                            borderRadius: '999px 999px 6px 6px',
                                                            bgcolor: index === 4 ? '#2d7ff0' : '#d5deea',
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>

                                        <Box
                                            sx={{
                                                borderRadius: 2.2,
                                                bgcolor: '#ffffff',
                                                border: '1px solid rgba(17, 24, 39, 0.08)',
                                                p: 1.3,
                                            }}
                                        >
                                            <Typography sx={{ color: '#1a2233', fontWeight: 700, fontSize: '0.76rem' }}>
                                                Engagement
                                            </Typography>
                                            <Stack spacing={0.9} sx={{ mt: 1.2 }}>
                                                {[80, 62, 92, 54].map((width) => (
                                                    <Box
                                                        key={width}
                                                        sx={{
                                                            height: 8,
                                                            width: `${width}%`,
                                                            borderRadius: 999,
                                                            bgcolor: '#d5deea',
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Box>
                                </Box>

                                <Box
                                    component="img"
                                    src={phoneHandFrame}
                                    alt="Phone in hand mockup"
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        zIndex: 2,
                                        pointerEvents: 'none',
                                    }}
                                />
                            </Box>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 3.1 }}>
                        <Stack spacing={{ xs: 2, md: 3 }}>
                            <FeatureCard
                                accent={{
                                    bg: '#ecfaf3',
                                    fg: '#1f7a53',
                                    border: 'rgba(31, 122, 83, 0.12)',
                                }}
                                icon={<ForumOutlined sx={{ fontSize: 28 }} />}
                                title="Community tools"
                                description="Built-in discussion forums and peer review systems keep collaborative learning moving."
                                minHeight={{ xs: 250, md: 284 }}
                            >
                                <Stack spacing={1}>
                                    {[
                                        { width: '78%', alignSelf: 'flex-start' },
                                        { width: '68%', alignSelf: 'flex-end' },
                                        { width: '84%', alignSelf: 'flex-start' },
                                    ].map((bubble, index) => (
                                        <Box
                                            key={`${bubble.width}-${index}`}
                                            sx={{
                                                width: bubble.width,
                                                alignSelf: bubble.alignSelf,
                                                bgcolor: index === 1 ? '#f5f7fb' : '#eef9f4',
                                                border: '1px solid rgba(17, 24, 39, 0.06)',
                                                borderRadius: 3,
                                                p: 1.15,
                                            }}
                                        >
                                            <Stack spacing={0.8}>
                                                {[72, 54].map((width) => (
                                                    <Box
                                                        key={width}
                                                        sx={{
                                                            height: 8,
                                                            width: `${width}%`,
                                                            borderRadius: 999,
                                                            bgcolor: '#c9d7e5',
                                                        }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            </FeatureCard>

                            <FeatureCard
                                accent={{
                                    bg: '#f2efff',
                                    fg: '#4835d8',
                                    border: 'rgba(72, 53, 216, 0.12)',
                                }}
                                icon={<HowToRegOutlined sx={{ fontSize: 28 }} />}
                                title="Easy attendance tracking"
                                description="Record, monitor, and manage student attendance without manual spreadsheets or disconnected tools."
                                minHeight={{ xs: 250, md: 284 }}
                            >
                                <Stack spacing={1.15}>
                                    {attendanceRows.map((row) => (
                                        <Box key={row.label}>
                                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.55 }}>
                                                <Typography sx={{ color: '#28303f', fontSize: '0.82rem', fontWeight: 700 }}>
                                                    {row.label}
                                                </Typography>
                                                <Typography sx={{ color: '#667085', fontSize: '0.82rem', fontWeight: 700 }}>
                                                    {row.value}
                                                </Typography>
                                            </Stack>
                                            <Box
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 999,
                                                    bgcolor: '#edf1f6',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: row.width,
                                                        borderRadius: 999,
                                                        bgcolor: row.color,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            </FeatureCard>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
