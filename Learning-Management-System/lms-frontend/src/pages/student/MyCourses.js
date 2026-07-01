import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    LinearProgress,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    Pagination,
} from '@mui/material';
import {
    Search as SearchIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { API_BASE_URL } from '../../api';
import { courseService } from '../../api/courses';

const pageButtonSx = {
    backgroundColor: '#FCD980',
    color: '#282938',
    borderColor: '#FCD980',
    '&:hover': {
        backgroundColor: '#FCD980',
        color: '#282938',
        borderColor: '#FCD980',
        opacity: 0.92,
    },
    '&.Mui-disabled': {
        backgroundColor: '#FCD980',
        color: '#282938',
        borderColor: '#FCD980',
        opacity: 0.6,
    },
};

const COURSES_PER_PAGE = 6;

const getLessonCount = (course) => {
    if (typeof course?.lessons_count === 'number') return course.lessons_count;
    if (typeof course?.videos_count === 'number') return course.videos_count;
    if (Array.isArray(course?.videos)) return course.videos.length;
    return 0;
};

const formatDuration = (rawDuration) => {
    const numericDuration = typeof rawDuration === 'number' ? rawDuration : Number(rawDuration);

    if (Number.isFinite(numericDuration) && numericDuration >= 0) {
        const totalMinutes = Math.round(numericDuration);
        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
        }
        return `${totalMinutes}m`;
    }

    if (typeof rawDuration === 'string' && rawDuration.trim()) {
        return rawDuration.trim();
    }

    return 'Self-paced';
};

const isCourseCompleted = (enrollment) => {
    if (!enrollment) return false;
    const progressState = String(enrollment?.progress || '').toUpperCase();
    if (progressState === 'COMPLETED') return true;
    if (Boolean(enrollment?.completed_on || enrollment?.completedOn)) return true;
    const progressPercent = Number(enrollment?.progress_percent);
    return Number.isFinite(progressPercent) && progressPercent >= 100;
};

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [downloadingCourseId, setDownloadingCourseId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const resolveMediaUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        if (/^https?:\/\//i.test(url)) return url;
        const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${apiOrigin}${path}`;
    };

    const getCourseCoverImage = (course) => {
        if (!course) return null;
        const raw = course.cover_image || course.thumbnail || null;
        return resolveMediaUrl(raw);
    };

    const openCourseDetails = (courseId) => {
        if (!courseId) return;
        navigate(`/catalog?courseId=${courseId}`);
    };

    // Original random gradient function (unchanged)
    const getRandomGradient = (courseId) => {
        const gradients = [
            'linear-gradient(180deg, #2688a6ff 0%, #0377c5be 100%)',
        ];
        const index = courseId % gradients.length;
        return gradients[index];
    };

    useEffect(() => {
        fetchEnrolledCourses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (location.pathname === '/my-courses') {
            fetchEnrolledCourses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    useEffect(() => {
        if (searchInput.trim() === '') {
            setFilteredCourses(courses);
        } else {
            const filtered = courses.filter(enrollment =>
                enrollment.course.title.toLowerCase().includes(searchInput.toLowerCase())
            );
            setFilteredCourses(filtered);
        }
    }, [searchInput, courses]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchInput]);

    const fetchEnrolledCourses = async () => {
        try {
            const response = await api.get('/enrollments/');
            const progressOrder = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 };
            const enrolledCourses = (response.data || [])
                .filter((enrollment) => Boolean(enrollment?.course))
                .map((enrollment) => {
                    const course = enrollment.course || {};
                    const image = getCourseCoverImage(course);
                    return {
                        ...enrollment,
                        course: {
                            ...course,
                            cover_image: image || null,
                            thumbnail: image || null,
                        },
                    };
                });

            const sorted = [...enrolledCourses].sort((a, b) => {
                const aRank = progressOrder[a.progress] ?? 99;
                const bRank = progressOrder[b.progress] ?? 99;
                if (aRank !== bRank) return aRank - bRank;
                const aTime = a.enrolled_on ? new Date(a.enrolled_on).getTime() : 0;
                const bTime = b.enrolled_on ? new Date(b.enrolled_on).getTime() : 0;
                return bTime - aTime;
            });
            setCourses(sorted);
            setFilteredCourses(sorted);
        } catch (error) {
            console.error('Error fetching enrolled courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCertificate = async (courseId) => {
        if (!courseId) return;
        try {
            setDownloadingCourseId(courseId);
            const response = await courseService.generateCertificate(courseId);
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            let filename = 'certificate.pdf';
            const disposition = response.headers['content-disposition'];
            if (disposition && disposition.includes('filename=')) {
                filename = disposition
                    .split('filename=')[1]
                    .split(';')[0]
                    .replace(/["']/g, '');
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading certificate:', error);
            let message = 'Unable to download certificate.';
            const responseData = error?.response?.data;
            if (responseData instanceof Blob) {
                try {
                    const text = await responseData.text();
                    const parsed = JSON.parse(text);
                    if (parsed?.error) {
                        message = parsed.error;
                    }
                } catch {
                    // Keep default message when server response is not JSON.
                }
            } else if (typeof responseData?.error === 'string' && responseData.error.trim()) {
                message = responseData.error.trim();
            }
            alert(message);
        } finally {
            setDownloadingCourseId(null);
        }
    };

    const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * COURSES_PER_PAGE,
        currentPage * COURSES_PER_PAGE
    );

    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <Box sx={{ 
            px: { xs: 1, md: 4 }, 
            py: 2, 
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #0a1929 0%, #132f4c 50%, #1e3a5f 100%)'
              : 'linear-gradient(135deg, #e3f2fd 0%, #b2c5d4ff 50%, #cfe7faff 100%)',
            minHeight: '100vh' 
        }}>
            <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 } }}>
                <Typography
                    variant="h3"
                    gutterBottom
                    fontWeight={700}
                    letterSpacing={-1}
                    sx={{ mb: 3, color: '#0C4A6E' }}
                >
                    My Courses
                </Typography>
            </Box>

            {/* Search Bar - kept close to original */}
            <Grid container spacing={2} mb={4} alignItems="center" sx={{ maxWidth: 1400, mx: 'auto' }}>
                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                    <TextField
                        fullWidth
                        placeholder="Search my courses"
                        variant="outlined"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            background: (theme) => theme.palette.background.paper,
                            borderRadius: 6,
                            '& .MuiOutlinedInput-root': { height: 56 },
                            '& .MuiOutlinedInput-input::placeholder': {
                                color: '#0C4A6E',
                                opacity: 1,
                            },
                        }}
                    />
                </Grid>
            </Grid>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress />
                </Box>
            ) : courses.length === 0 ? (
                <Alert severity="info">
                    You haven't started any course yet.
                    <Button color="primary" onClick={() => navigate('/catalog')} sx={{ ml: 2, ...pageButtonSx }}>
                        Browse Courses
                    </Button>
                </Alert>
            ) : filteredCourses.length === 0 ? (
                <Alert severity="info">No courses found.</Alert>
            ) : (
                <>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                        gap: 4,
                        maxWidth: 1400,
                        mx: 'auto',
                        px: { xs: 2, md: 4 },
                    }}
                >
                    {paginatedCourses.map((enrollment) => {
                        const isCompleted = isCourseCompleted(enrollment);
                        const progressPercent = enrollment.progress_percent ?? 0;
                        const courseImageUrl = getCourseCoverImage(enrollment.course);
                        const lessonCount = getLessonCount(enrollment.course);
                        const progressState = String(enrollment.progress || '').toUpperCase();
                        const statusLabel = isCompleted
                            ? 'COMPLETED'
                            : progressState === 'NOT_STARTED'
                            ? 'NOT STARTED'
                            : 'IN PROGRESS';
                        const durationLabel = formatDuration(
                            enrollment.course.total_duration ?? enrollment.course.duration
                        );

                        return (
                            <Card
                                key={enrollment.id}
                                sx={{
                                    height: 450,
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    boxShadow: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: '#ffffff',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        boxShadow: 15,
                                        transform: 'translateY(-3px) scale(1.01)',
                                    },
                                }}
                            >
                                {/* Top Image Banner - Exact Match Style */}
                                <Box
                                    sx={{
                                        height: 250,
                                        position: 'relative',
                                        backgroundImage: courseImageUrl 
                                            ? `url(${courseImageUrl})` 
                                            : getRandomGradient(enrollment.course.id),
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: '#0f1c2e',
                                    }}
                                >
                                    {/* Status Badge */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 14,
                                            left: 14,
                                            backgroundColor: isCompleted ? '#4CAF50' : '#ffffff',
                                            color: '#0369A1',
                                            fontSize: '0.73rem',
                                            fontWeight: 600,
                                            px: 2.2,
                                            py: 0.5,
                                            borderRadius: '20px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.6px',
                                        }}
                                    >
                                        {statusLabel}
                                    </Box>

                                    
                                </Box>

                                {/* Bottom Content */}
                                <CardContent sx={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    p: 3, 
                                    pt: 2.5 
                                }}>
                                    <Typography 
                                        variant="h6" 
                                        fontWeight={600} 
                                        sx={{ mb: 0.5, lineHeight: 1.25 }}
                                        onClick={() => openCourseDetails(enrollment.course.id)}
                                    >
                                        {enrollment.course.title}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {enrollment.course.category?.name || ''}
                                    </Typography>

                                    {/* Lessons & Duration */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                                        {lessonCount} Lessons • {durationLabel}
                                    </Typography>

                                    {/* Progress Bar */}
                                    <Box sx={{ mt: 'auto', mb: 2 }}>
                                        <Box display="flex" justifyContent="space-between" mb={0.8}>
                                            <Typography variant="body2" color="text.secondary">PROGRESS</Typography>
                                            <Typography variant="body2" fontWeight={600}>{progressPercent}%</Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={progressPercent}
                                            sx={{
                                                height: 7,
                                                borderRadius: 4,
                                                backgroundColor: '#e0e0e0',
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: isCompleted ? '#4CAF50' : '#2196F3',
                                                },
                                            }}
                                        />
                                    </Box>

                                    {/* Bottom action area for each course card */}
                                    {isCompleted ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                disableElevation
                                                startIcon={<DownloadIcon />}
                                                onClick={() => handleDownloadCertificate(enrollment.course.id)}
                                                disabled={downloadingCourseId === enrollment.course.id}
                                                sx={{
                                                    py: 1.2,
                                                    fontWeight: 600,
                                                    backgroundColor: '#81D4FA',
                                                    color: '#000000',
                                                    boxShadow: 'none',
                                                    '&:hover': {
                                                        backgroundColor: '#4FC3F7',
                                                        boxShadow: 'none',
                                                    },
                                                    '&.Mui-disabled': {
                                                        boxShadow: 'none',
                                                    },
                                                }}
                                            >
                                                {downloadingCourseId === enrollment.course.id ? 'Downloading...' : 'Download Certificate'}
                                            </Button>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={() => {
                                                    navigate(`/course/${enrollment.course.id}`, {
                                                        state: {
                                                            courseTitle: enrollment.course.title,
                                                            courseProgress: progressPercent,
                                                            courseId: enrollment.course.id,
                                                        },
                                                    });
                                                }}
                                                sx={{
                                                    py: 1.2,
                                                    fontWeight: 600,
                                                    borderColor: '#81D4FA',
                                                    color: '#0C4A6E',
                                                }}
                                            >
                                                Review Course
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disableElevation
                                            onClick={() => {
                                                navigate(`/course/${enrollment.course.id}`, {
                                                    state: {
                                                        courseTitle: enrollment.course.title,
                                                        courseProgress: progressPercent,
                                                        courseId: enrollment.course.id,
                                                    },
                                                });
                                            }}
                                            sx={{
                                                py: 1.4,
                                                fontWeight: 600,
                                                backgroundColor: '#81D4FA',
                                                color: '#000000',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    backgroundColor: '#4FC3F7',
                                                    boxShadow: 'none',
                                                },
                                            }}
                                        >
                                            Continue Learning
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
                {totalPages > 1 && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            mt: 4,
                            pb: 2,
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(_, page) => setCurrentPage(page)}
                            color="primary"
                            shape="rounded"
                            showFirstButton
                            showLastButton
                        />
                    </Box>
                )}
                </>
            )}
        </Box>
    );
};


export default MyCourses;
