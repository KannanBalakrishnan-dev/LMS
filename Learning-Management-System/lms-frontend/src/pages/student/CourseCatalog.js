import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaStar } from "react-icons/fa";
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Typography,
    Button,
    IconButton,
    Tooltip,
    TextField,
    FormControl,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider,
    InputAdornment,
    Rating,
    LinearProgress,
    Snackbar,
    Pagination,
} from '@mui/material';
import {
    Search as SearchIcon,
    School as SchoolIcon,
    PlayArrow as PlayArrowIcon,
    Quiz as QuizIcon,
    ArrowBack as ArrowBackIcon,
    AccessTimeOutlined as AccessTimeOutlinedIcon,
    PlayCircleOutline as PlayCircleOutlineIcon,
    StarRounded as StarRoundedIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { API_BASE_URL } from '../../api';

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

const catalogSecondaryButtonSx = {
    py: 1.25,
    fontWeight: 600,
    borderRadius: '18px',
    backgroundColor: '#CBD5E1',
    color: '#1E293B',
    boxShadow: 'none',
    textTransform: 'none',
    '&:hover': {
        backgroundColor: '#B8C6D3',
        boxShadow: 'none',
    },
};

const catalogPrimaryButtonSx = {
    py: 0.7,
    minHeight: 40,
    fontWeight: 700,
    borderRadius: '18px',
    backgroundColor: '#FCD980',
    color: '#111827',
    boxShadow: 'none',
    textTransform: 'none',
    '&:hover': {
        backgroundColor: '#F8C24E',
        boxShadow: 'none',
    },
};

const catalogDisabledButtonSx = {
    py: 0.7,
    minHeight: 40,
    fontWeight: 700,
    borderRadius: '18px',
    backgroundColor: '#D7DEE7',
    color: '#4B5563',
    boxShadow: 'none',
    textTransform: 'none',
};

const catalogPendingButtonSx = {
    py: 1.25,
    fontWeight: 700,
    borderRadius: '18px',
    backgroundColor: '#FDE68A',
    color: '#92400E',
    boxShadow: 'none',
    textTransform: 'none',
};

const formatCourseDuration = (rawDuration) => {
    if (typeof rawDuration === 'number' && Number.isFinite(rawDuration)) {
        if (rawDuration >= 60) {
            const hours = Math.floor(rawDuration / 60);
            const minutes = rawDuration % 60;
            return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
        }
        return `${rawDuration}m`;
    }

    if (typeof rawDuration === 'string' && rawDuration.trim()) {
        return rawDuration.trim();
    }

    return 'Self-paced';
};

const getCourseCategoryLabel = (course) => {
    if (course?.category?.name) return String(course.category.name);
    if (Array.isArray(course?.categories) && course.categories.length > 0) {
        const firstCategory = course.categories[0];
        if (firstCategory?.name) return String(firstCategory.name);
        if (typeof firstCategory === 'string') return firstCategory;
    }
    return 'general';
};

const getCourseLessonCount = (course) => {
    if (typeof course?.lessons_count === 'number') return course.lessons_count;
    if (typeof course?.videos_count === 'number') return course.videos_count;
    if (Array.isArray(course?.videos)) return course.videos.length;
    return 0;
};

const formatEnrollmentCount = (count) => {
    const numericCount = typeof count === 'number' ? count : Number(count);
    if (!Number.isFinite(numericCount) || numericCount < 0) return null;
    if (numericCount >= 1000) {
        const compact = numericCount >= 10000
            ? `${Math.round(numericCount / 1000)}k`
            : `${(numericCount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        return compact;
    }
    return String(numericCount);
};

const CourseStars = ({ rating }) => {
  // Handle undefined, null, or 0 ratings
  const validRating = rating && typeof rating === 'number' && rating > 0 ? rating : 0;
 
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {validRating > 0 ? (
        // Show stars with rating
        [1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            size={16} // uniform size for all stars
            color={star <= validRating ? '#FFD700' : '#E0E0E0'} // gold filled, gray empty
          />
        ))
      ) : (
        // Show empty stars with "No ratings yet" text
        <>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
              size={16}
              color="#E0E0E0" // gray empty stars
        />
      ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: '0.75rem' }}>
            No ratings yet
          </Typography>
        </>
      )}
    </Box>
  );
};

// Lightweight feedback list component for the dialog bottom
const CourseFeedbackList = ({ courseId }) => {
  const [feedback, setFeedback] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/feedback/student/', { params: { course_id: courseId } });
        if (isMounted) setFeedback(res.data.slice(0, 5));
      } catch (e) {
        if (isMounted) setError('Unable to load feedback');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (courseId) load();
    return () => { isMounted = false; };
  }, [courseId]);

  if (loading) return (
    <Box sx={{ py: 2 }}>
      <CircularProgress size={20} />
    </Box>
  );
  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!feedback.length) return (
    <Typography variant="body2" color="text.secondary">No feedback yet.</Typography>
  );

  return (
    <List sx={{ pt: 0 }}>
      {feedback.map(item => (
        <ListItem key={item.id} alignItems="flex-start" sx={{ px: 0 }}>
          <Box sx={{
            width: '100%', p: 2, borderRadius: 2, boxShadow: 1,
            bgcolor: (theme)=> theme.palette.mode==='dark' ? 'rgba(255,255,255,0.03)' : '#fff',
            border: (theme)=>`1px solid ${theme.palette.divider}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%',
                background: (theme) => theme.palette.primary.main, color: (theme) => theme.palette.primary.contrastText,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 400
              }}>
                {item.user_username?.[0]?.toUpperCase() || 'S'}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 400 }}>{item.user_username || 'Student'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {item.course_title}
              </Typography>
            </Box>

            <Divider sx={{ my: 1.25 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Rating
                value={item.rating}
                readOnly
                size="small"
                sx={{ '& .MuiRating-iconFilled': { color: (theme) => theme.palette.warning.main }, '& .MuiRating-iconEmpty': { color: (theme) => theme.palette.warning.light } }}
              />
              <Chip label={`${item.rating}/5`} size="small" variant="outlined" sx={{ fontWeight: 400, color: (theme) => theme.palette.warning.dark, borderColor: (theme) => theme.palette.warning.light }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              {item.message}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <span className="material-icons" style={{ fontSize: 16, color: 'gray' }}>schedule</span>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        sort: 'newest',
    });
    const [searchInput, setSearchInput] = useState('');
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [enrollmentStatus, setEnrollmentStatus] = useState({});
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedCourseFull, setSelectedCourseFull] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isLoadingFromDashboard, setIsLoadingFromDashboard] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showOnlyDetails, setShowOnlyDetails] = useState(false);
    const [unassignedDialogOpen, setUnassignedDialogOpen] = useState(false);
    const [enrollmentLimitDialogOpen, setEnrollmentLimitDialogOpen] = useState(false);
    const [confirmEnroll, setConfirmEnroll] = useState(null); // { course, onSuccess }
    const [enrollSuccessMessage, setEnrollSuccessMessage] = useState('');
    const [enrollMessageSeverity, setEnrollMessageSeverity] = useState('success');
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 6;
    const THIRD_ENROLLMENT_MESSAGE = 'Admin needs to accept the request for your 3rd course enrollment. You can enroll in 2 courses at a time. After completing 1 of your 2 enrolled courses, you can enroll in another course.';

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const resolveMediaUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        // If already an absolute URL, return as-is
        if (/^https?:\/\//i.test(url)) return url;
        // For relative paths like /media/..., prepend the backend origin
        const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
        // Ensure single slash between origin and path
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${apiOrigin}${encodeURI(path)}`;
    };

    const getCourseCoverImage = (course) => {
        if (!course) return null;
        const raw = course.cover_image || course.thumbnail || null;
        return resolveMediaUrl(raw);
    };

  // Build star row from average rating: floor for full stars, half-star if decimal >= 0.5
//   const renderStars = (avg) => {
//     const average = typeof avg === 'number' ? avg : 0;
//     const full = Math.min(5, Math.max(0, Math.floor(average)));
//     const hasHalf = average - full >= 0.5 && full < 5;
//     const empty = 5 - full - (hasHalf ? 1 : 0);
//     const halfChar = '⯨'; // fallback half-star character; rendering may vary by platform
//     const stars = `${'⭐'.repeat(full)}${hasHalf ? halfChar : ''}${'☆'.repeat(empty)}`;
//     return (
//       <Typography component="div" sx={{ fontSize: 18, lineHeight: 1, letterSpacing: 1 }}>
//         {stars.split('').join(' ')}
//       </Typography>
//     );
//   };

    // Function to generate random gradient colors
    const getRandomGradient = (courseId) => {
        const gradients = [
             // 'linear-gradient(180deg, #FF8A65 0%, #FF6F00 100%)', // Orange to Gold
            'linear-gradient(180deg, #2682a6ff 0%, #006964ff 100%)', // Teal to Dark Green
            // 'linear-gradient(180deg, #AB47BC 0%, #7B1FA2 100%)', // Purple to Dark Purple
            // 'linear-gradient(180deg, #42A5F5 0%, #1976D2 100%)', // Blue to Dark Blue
            // 'linear-gradient(180deg, #66BB6A 0%, #388E3C 100%)', // Green to Dark Green
            // 'linear-gradient(180deg, #FF7043 0%, #D84315 100%)', // Deep Orange to Dark

        ];
       
        // Use courseId to ensure consistent colors for the same course
        const index = courseId % gradients.length;
        return gradients[index];
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const isInitialLoadRef = useRef(true);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        const run = async () => {
            // Prevent duplicate calls in React 18 StrictMode/dev re-mount
            if (hasFetchedRef.current) return;
            hasFetchedRef.current = true;
            const showSpinner = isInitialLoadRef.current;
            if (!showSpinner) setSearching(true);
            await fetchCourses({ showSpinner });
            if (isMounted) setSearching(false);
            isInitialLoadRef.current = false;
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setSearchInput(filters.search);
    }, [filters.search]);

    const extractCourseCategoryIds = (course) => {
        const categoriesFromField = course?.categories ?? course?.category;
        if (Array.isArray(categoriesFromField)) {
            return categoriesFromField
                .map((item) => {
                    if (item && typeof item === 'object') return String(item.id ?? '').trim();
                    return String(item ?? '').trim();
                })
                .filter(Boolean);
        }

        if (categoriesFromField && typeof categoriesFromField === 'object') {
            const id = String(categoriesFromField.id ?? '').trim();
            return id ? [id] : [];
        }

        if (categoriesFromField !== undefined && categoriesFromField !== null) {
            const id = String(categoriesFromField).trim();
            return id ? [id] : [];
        }

        return [];
    };

    // Live, client-side filtering and category-first sorting
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const term = (searchInput || '').trim().toLowerCase();
            let next = Array.isArray(courses) ? courses : [];

            if (term) {
                next = next.filter(c => c.title?.toLowerCase().includes(term));
            }

            if (filters.category) {
                const catId = String(filters.category);
                next = next.filter((course) => extractCourseCategoryIds(course).includes(catId));
            }

            const categoryNameById = new Map(
                (categories || []).map((cat) => [String(cat.id), String(cat.name || '').trim().toLowerCase()])
            );

            next = [...next].sort((a, b) => {
                const aCategoryIds = extractCourseCategoryIds(a);
                const bCategoryIds = extractCourseCategoryIds(b);

                const aCategoryName = aCategoryIds
                    .map((id) => categoryNameById.get(id))
                    .find(Boolean) || '';
                const bCategoryName = bCategoryIds
                    .map((id) => categoryNameById.get(id))
                    .find(Boolean) || '';

                if (aCategoryName !== bCategoryName) {
                    return aCategoryName.localeCompare(bCategoryName);
                }

                return String(a?.title || '').localeCompare(String(b?.title || ''));
            });

            setFilteredCourses(next);
            setPage(1);
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [searchInput, courses, filters.category, categories]);

    const fetchCourses = async ({ showSpinner = false } = {}) => {
        if (showSpinner) setLoading(true);
        try {
            // Fetch once; filter on client
            const response = await api.get('/courses/');
            const rawCourseList = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.results)
                    ? response.data.results
                    : [];

            const courseList = rawCourseList.map((course) => {
                if (!course) return course;
                const image = getCourseCoverImage(course);
                return {
                    ...course,
                    cover_image: image || null,
                    thumbnail: image || null,
                };
            });

            setCourses(courseList);
            setFilteredCourses(courseList);

            // Deduplicate course IDs to avoid multiple requests per course
            const uniqueIds = Array.from(new Set((courseList || []).map(c => c.id)));
            const enrollmentPromises = uniqueIds.map(courseId =>
                api.get(`/courses/${courseId}/enrollment_status/`)
            );
            const enrollmentResponses = await Promise.all(enrollmentPromises);
            const statusMap = {};
            enrollmentResponses.forEach((res, index) => {
                statusMap[uniqueIds[index]] = res.data;
            });
            setEnrollmentStatus(statusMap);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories/');
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const getStatusPercent = (status) => {
        if (!status) return 0;
        const raw =
            status.progress_percent ??
            status.progressPercent ??
            status.overall_progress ??
            status.overallProgress ??
            0;
        const parsed = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const isCompletedEnrollment = (status) => {
        if (!status) return false;
        const enrollmentState = String(status.enrollment_status ?? '').trim().toUpperCase();
        const progressState = String(status.progress ?? '').trim().toUpperCase();
        if (enrollmentState === 'COMPLETED') return true;
        if (progressState === 'COMPLETED') return true;
        if (Boolean(status.completed_on || status.completedOn)) return true;
        if (getStatusPercent(status) >= 100) return true;
        return false;
   
    };

    const isEnrolledEnrollment = (status) => {
        if (!status) return false;
        if (typeof status.approval_pending === 'boolean' && status.approval_pending) return false;
        if (typeof status.is_enrolled === 'boolean') return status.is_enrolled;
        const enrollmentValue = String(status.enrollment_status ?? '').trim().toUpperCase();
        if (enrollmentValue) return !['NOT_ENROLLED', 'NOT_ASSIGNED'].includes(enrollmentValue);
        const progressValue = String(status.progress ?? '').trim().toUpperCase();
        if (progressValue) return !['NOT_ENROLLED', 'NOT_ASSIGNED', 'PENDING_APPROVAL'].includes(progressValue);
        if (typeof status.progress_percent === 'number') return status.progress_percent > 0;
        if (typeof status.overall_progress === 'number') return status.overall_progress > 0;
        if (Boolean(status.completed_on)) return true;
        return false;
    };

    const isApprovalPending = (status) => {
        if (!status) return false;
        if (typeof status.approval_pending === 'boolean') return status.approval_pending;
        return String(status.progress ?? '').trim().toUpperCase() === 'PENDING_APPROVAL';
    };

    const isActiveSelectionEnrollment = (status) => {
        if (!status) return false;
        return isEnrolledEnrollment(status) && !isCompletedEnrollment(status);
    };

    const activeEnrollmentCount = useMemo(() => {
        return (courses || []).filter((course) => {
            if (!course) return false;
            const status = enrollmentStatus[course.id];
            if (!isActiveSelectionEnrollment(status)) return false;
            if (isCompletedEnrollment(status)) return false;
            return true;
        }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courses, enrollmentStatus]);

    const selectedStatus = selectedCourse ? enrollmentStatus[selectedCourse.id] : null;
    const selectedIsCompleted = isCompletedEnrollment(selectedStatus);
    const selectedIsEnrolled = isEnrolledEnrollment(selectedStatus);
    const selectedIsApprovalPending = isApprovalPending(selectedStatus);
    const selectedIsStarted =
        selectedCourse &&
        selectedStatus &&
        (selectedStatus.progress === 'IN_PROGRESS' ||
            (typeof selectedStatus.progress_percent === 'number' && selectedStatus.progress_percent > 0) ||
            (typeof selectedStatus.overall_progress === 'number' && selectedStatus.overall_progress > 0));

    const orderedCourses = useMemo(() => filteredCourses || [], [filteredCourses]);
    const categoryNameLookup = useMemo(() => {
        const map = new Map();
        (categories || []).forEach((category) => {
            const id = String(category?.id ?? '').trim();
            const name = String(category?.name ?? '').trim();
            if (id && name) {
                map.set(id, name);
            }
        });
        return map;
    }, [categories]);

    const handleEnroll = async (courseId) => {
        const selected = (courses || []).find((course) => course?.id === courseId);
        try {
            const selectedStatus = enrollmentStatus[courseId];
            const selectedIsAlreadyEnrolled = isEnrolledEnrollment(selectedStatus);
            const selectedIsAlreadyCompleted = isCompletedEnrollment(selectedStatus);
            const selectedIsAlreadyPending = isApprovalPending(selectedStatus);

            if (
                activeEnrollmentCount >= 2 &&
                !selectedIsAlreadyEnrolled &&
                !selectedIsAlreadyCompleted &&
                !selectedIsAlreadyPending
            ) {
                setEnrollmentLimitDialogOpen(true);
                return { ok: false, pending: false };
            }
           
            // Proceed with enrollment
            const enrollResponse = await api.post(`/courses/${courseId}/enroll/`);
            const approvalRequired = Boolean(enrollResponse?.data?.approval_required);

            if (approvalRequired) {
                const pendingStatusResponse = await api.get(`/courses/${courseId}/enrollment_status/`);
                setEnrollmentStatus(prev => ({
                    ...prev,
                    [courseId]: pendingStatusResponse.data
                }));
                setEnrollMessageSeverity('info');
                setEnrollSuccessMessage('Enrollment request sent. Please wait for admin approval to start learning.');
                return { ok: true, pending: true };
            }
           

            const response = await api.get(`/courses/${courseId}/enrollment_status/`);
            setEnrollmentStatus(prev => ({
                ...prev,
                [courseId]: response.data
            }));
            return { ok: true, pending: false };
        } catch (error) {
            if (error.response?.status === 403) {
                // Not assigned / not allowed: treat as a UX flow, not a crash.
                if (selected) setSelectedCourse(selected);
                setUnassignedDialogOpen(true);
                return { ok: false, pending: false };
            }

            console.error('Error enrolling in course:', error);
            if (error.response?.status === 400) {
                const serverMessage = error.response?.data?.error;
                if (
                    typeof serverMessage === 'string' &&
                    (
                        serverMessage.toLowerCase().includes('2 course') ||
                        serverMessage.toLowerCase().includes('2 courses') ||
                        serverMessage.toLowerCase().includes('another course')
                    )
                ) {
                    setEnrollmentLimitDialogOpen(true);
                } else {
                    alert(serverMessage || THIRD_ENROLLMENT_MESSAGE);
                }
            }
            return { ok: false, pending: false };
        }
    };

    const openEnrollConfirmation = (course, onSuccess) => {
        if (!course) return;
        setConfirmEnroll({ course, onSuccess });
    };

    const handleConfirmEnroll = async () => {
        if (!confirmEnroll?.course) {
            setConfirmEnroll(null);
            return;
        }
        const result = await handleEnroll(confirmEnroll.course.id);
        if (result.ok && !result.pending) {
            setEnrollMessageSeverity('success');
            setEnrollSuccessMessage(`You have successfully enrolled in ${confirmEnroll.course.title}.`);
        }
        setConfirmEnroll(null);
    };

    const enterCourse = async (courseId, navigateState = undefined) => {
        try {
            const markStartedResp = await api.post(`/courses/${courseId}/mark_started/`);
            const enrollmentData = markStartedResp.data?.enrollment || {};
            setEnrollmentStatus((prev) => ({
                ...prev,
                [courseId]: {
                    ...enrollmentData,
                    is_enrolled: true,
                    progress: 'IN_PROGRESS',
                    enrollment_status: 'IN_PROGRESS',
                },
            }));
        } catch (error) {
            console.error('Error marking course as started:', error);
            // Keep navigation resilient even if start-state API call fails.
        }

        if (navigateState) {
            navigate(`/course/${courseId}`, { state: navigateState });
            return;
        }
        navigate(`/course/${courseId}`);
    };

    const openDetails = async (course) => {
        setSelectedCourse(course);
        setDetailsLoading(true);
        setDetailsOpen(true);
        try {
            const response = await api.get(`/courses/${course.id}/`);
            const image = getCourseCoverImage(response.data);
            const resolvedVideos = Array.isArray(response.data?.videos)
                ? response.data.videos.map((video) => ({
                    ...video,
                    video_file: resolveMediaUrl(video?.video_file) || video?.video_file,
                }))
                : [];

            setSelectedCourseFull({
                ...response.data,
                cover_image: image || null,
                thumbnail: image || null,
                videos: resolvedVideos,
            });
        } catch (error) {
            setSelectedCourseFull(null);
        } finally {
            setDetailsLoading(false);
            // Clear the loading from dashboard state once data is loaded
            if (isLoadingFromDashboard) {
                setIsLoadingFromDashboard(false);
            }
        }
    };

    // Handle courseId query parameter to automatically open course details
    useEffect(() => {
        const courseId = searchParams.get('courseId');
        if (courseId && courses.length > 0 && !detailsOpen && !isClosing) {
            const course = courses.find(c => String(c.id) === String(courseId));
            if (course) {
                setShowOnlyDetails(true);
                setIsLoadingFromDashboard(true);
                openDetails(course);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, courses, detailsOpen, isClosing]);

    // Cleanup effect to ensure clean state when component unmounts
    useEffect(() => {
        return () => {
            // Clean up any pending state when component unmounts
            setDetailsOpen(false);
            setSelectedCourse(null);
            setSelectedCourseFull(null);
            setIsLoadingFromDashboard(false);
            setIsClosing(false);
            setShowOnlyDetails(false);
        };
    }, []);

    const closeDetails = () => {
        // Set closing flag to prevent useEffect interference
        setIsClosing(true);
       
        // Clear the courseId from URL first to prevent race conditions
        if (searchParams.get('courseId')) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('courseId');
            // Navigate immediately to clear the URL parameter
            navigate(`/catalog?${newSearchParams.toString()}`, { replace: true });
        }
       
        // Clear all state immediately
        setDetailsOpen(false);
        setSelectedCourse(null);
        setSelectedCourseFull(null);
        setIsLoadingFromDashboard(false);
        setShowOnlyDetails(false);
       
        // Reset closing flag after a short delay
        setTimeout(() => {
            setIsClosing(false);
        }, 100);
    };

    const handleDialogBack = () => {
        // Prevent multiple rapid clicks
        if (isClosing) return;
       
        // Immediately close the dialog and return to catalog
        // This ensures consistent behavior regardless of how user arrived at details
        closeDetails();
    };

    const CourseDetailsDialog = ({ course }) => (
        <>
        <Dialog
            open={detailsOpen}
            onClose={closeDetails}
            fullScreen
            transitionDuration={300}
            PaperProps={{
                sx: {
                    borderRadius: 0,
                    transition: 'all 0.3s ease-in-out'
                }
            }}
        >
            <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', borderBottom: (theme)=>`1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Back to Catalog">
                        <IconButton
                            size="small"
                            onClick={handleDialogBack}
                            disabled={isClosing}
                            sx={{
                                ...pageButtonSx,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    backgroundColor: '#FCD980',
                                    color: '#282938',
                                    borderColor: '#FCD980',
                                    transform: 'scale(1.1)',
                                    opacity: 0.92,
                                },
                                '&:disabled': {
                                    backgroundColor: '#FCD980',
                                    color: '#282938',
                                    borderColor: '#FCD980',
                                    opacity: 0.6,
                                    transform: 'scale(0.95)',
                                }
                            }}
                        >
                            {isClosing ? (
                                <CircularProgress size={20} />
                            ) : (
                                <ArrowBackIcon />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h6" sx={{ fontWeight: 400 }}>
                        {selectedCourseFull ? selectedCourseFull.title : 'Course Details'}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent dividers={false} sx={{ pb: 0 }}>
                {detailsLoading && (
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        sx={{
                            height: '50vh',
                            gap: 3
                        }}
                    >
                        <CircularProgress
                            size={60}
                            thickness={4}
                            sx={{
                                color: (theme) => theme.palette.mode === 'dark' ? '#10b981' : '#059669',
                                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                            }}
                        />
                        <Typography
                            variant="h6"
                            sx={{
                                color: (theme) => theme.palette.text.primary,
                                fontWeight: 500,
                                textAlign: 'center',
                            }}
                        >
                            Loading Course Details...
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: (theme) => theme.palette.text.secondary,
                                textAlign: 'center',
                                maxWidth: 300,
                            }}
                        >
                            Preparing the course information for you
                        </Typography>
                    </Box>
                )}
                {!detailsLoading && selectedCourseFull && (
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 1100,
                            mx: 'auto',
                            px: { xs: 2, sm: 3, md: 4 },
                            py: { xs: 1, md: 2 },
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2.5,
                        }}
                    >
                        {/* Cover Image */}
                        {(selectedCourseFull.cover_image || selectedCourseFull.thumbnail) && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <img
                                    src={selectedCourseFull.cover_image || selectedCourseFull.thumbnail}
                                    alt="Course cover"
                                    style={{
                                        width: '100%',
                                        maxWidth: 540,
                                        height: 'auto',
                                        borderRadius: 14,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                        )}

                        <Typography
                            variant="body1"
                            color="text.primary"
                            sx={{ textAlign: 'justify', lineHeight: 1.7 }}
                        >
                            {selectedCourseFull.description}
                        </Typography>

                        <Divider />

                        <Typography variant="h6" color="text.primary" sx={{ mt: 1, mb: 0.5 }}>
                            Course Content
                        </Typography>
                        <List dense disablePadding sx={{ pl: 1 }}>
                            {selectedCourseFull.videos && selectedCourseFull.videos.map((video, i) => (
                                <ListItem key={video.id} sx={{ px: 0, py: 0.75, alignItems: 'flex-start' }}>
                                    <PlayArrowIcon sx={{ mr: 1, mt: '4px' }} color="action" />
                                    <ListItemText
                                        primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                                        secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.25 } }}
                                        primary={video.title}
                                        secondary={video.description}
                                    />
                                    {video.quiz && <QuizIcon sx={{ ml: 2, mt: '2px' }} color="primary" />}
                                </ListItem>
                            ))}
                        </List>

                        <Divider />
                        {selectedCourseFull.final_quiz && (
                            <>
                                <Typography variant="h6" mt={1} color="text.primary">
                                    Final Quiz
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {selectedCourseFull.final_quiz.title}: {selectedCourseFull.final_quiz.description}
                                </Typography>
                            </>
                        )}

                        {/* Student Feedback Preview for this course */}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                          What students say
                        </Typography>
                        <CourseFeedbackList courseId={selectedCourseFull.id} />
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 1, bgcolor: 'background.paper', borderTop: (theme)=>`1px solid ${theme.palette.divider}` }}>
                <Button onClick={closeDetails} sx={pageButtonSx}>Close</Button>
                {selectedCourse && selectedIsCompleted ? (
                    <Button variant="contained" disabled sx={pageButtonSx}>
                        Completed
                    </Button>
                ) : selectedCourse && selectedIsApprovalPending ? (
                    <Button variant="contained" color="warning" disabled sx={pageButtonSx}>
                        Pending Approval
                    </Button>
                ) : selectedCourse && selectedIsEnrolled ? (
                    <Button
                        variant="contained"
                        sx={pageButtonSx}
                        onClick={() => {
                            if (selectedIsStarted) {
                                navigate(`/course/${selectedCourse.id}`);
                                return;
                            }
                            enterCourse(selectedCourse.id);
                        }}
                    >
                        Start Learning
                    </Button>
                ) : selectedCourse && !selectedIsEnrolled && !selectedIsApprovalPending ? (
                    <Button
                        variant="contained"
                        sx={pageButtonSx}
                        onClick={async () => {
                            openEnrollConfirmation(selectedCourse);
                        }}
                    >
                        Enroll
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
        {/* Unassigned course popup */}
        <Dialog open={unassignedDialogOpen} onClose={() => setUnassignedDialogOpen(false)}>
          <DialogTitle>Course Access</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              This course is not assigned to your account. Please contact your administrator to get access.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnassignedDialogOpen(false)} sx={pageButtonSx}>OK</Button>
          </DialogActions>
        </Dialog>
        {/* Enrollment limit popup */}
        <Dialog open={enrollmentLimitDialogOpen} onClose={() => setEnrollmentLimitDialogOpen(false)}>
          <DialogTitle>Course Access</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              {THIRD_ENROLLMENT_MESSAGE}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEnrollmentLimitDialogOpen(false)} sx={pageButtonSx}>OK</Button>
          </DialogActions>
        </Dialog>

                <Dialog
                        open={Boolean(confirmEnroll)}
                        onClose={() => setConfirmEnroll(null)}
                >
                        <DialogTitle>Confirm Enrollment</DialogTitle>
                        <DialogContent dividers>
                                <Typography variant="body1">
                                        Are you sure you want to enroll in "{confirmEnroll?.course?.title}"?
                                </Typography>
                        </DialogContent>
                        <DialogActions>
                                <Button onClick={() => setConfirmEnroll(null)}>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmEnroll}>
                                        Yes, Enroll
                                </Button>
                        </DialogActions>
                </Dialog>
        </>
    );

// eslint-disable-next-line no-unused-vars
const CourseCard = ({ course }) => {
    const courseImageUrl = getCourseCoverImage(course);
    const status = enrollmentStatus[course.id];
    const isCompleted = isCompletedEnrollment(status);
    const isEnrolled = isEnrolledEnrollment(status);
    const isAssigned = typeof status?.is_assigned === 'boolean' ? status.is_assigned : Boolean(course.is_assigned);
    const isPendingApproval = isApprovalPending(status);
    const isStarted =
      status &&
      (status.progress === 'IN_PROGRESS' ||
        (typeof status.progress_percent === 'number' && status.progress_percent > 0) ||
        (typeof status.overall_progress === 'number' && status.overall_progress > 0));
    const percent = isCompleted ? 100 : Math.max(0, Math.min(100, getStatusPercent(status)));
    const displayPercent = Math.round(percent);
        const descriptionText = typeof course?.description === 'string' ? course.description : '';

    return (
     <Card
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 280, // uniform height
                borderRadius: 2,
                boxShadow: (theme) => theme.palette.mode === 'dark' ? 8 : 3,
                background: (theme) => theme.palette.background.paper,
                color: 'text.primary',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                opacity: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                '&:hover': {
                    boxShadow: 15,
                    transform: 'translateY(-8px) scale(1.05)',
    background: getRandomGradient(course.id),
    color: 'white',
    '& .MuiTypography-root': {
        color: 'white !important',
    },
    '& .card-button': {  // <-- only affects buttons inside the card
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
        },
    },


                    '& .MuiCardActions-root': {
                        '& .MuiButton-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            },
                        },
                    },
                    '& .MuiSvgIcon-root': {
                        color: 'white !important',
                    },
                    '& .MuiCardMedia-root .MuiSvgIcon-root': {
                        color: 'rgba(98, 100, 100, 0.9) !important',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    },
                },
            }}
        >
            <CardMedia
                component="div"
                sx={{
                    pt: '80%',
                    position: 'relative',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
                    backgroundImage: courseImageUrl ? `url(${courseImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {!courseImageUrl && (
                    <SchoolIcon
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: 60,
                            color: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600],
                            transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 1,
                        }}
                    />
                )}
            </CardMedia>

            {/* Duration display in the red-marked area */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 1,
                px: 2,
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
            }}>
                <Typography variant="caption" color="text.secondary" sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}>
                    ⏱️ {(() => {
                        if (!course.total_duration) return '0 min';
                        const totalMinutes = course.total_duration; // Already in minutes from backend
                        if (totalMinutes >= 60) {
                            const hours = Math.floor(totalMinutes / 60);
                            const remainingMinutes = totalMinutes % 60;
                            if (remainingMinutes === 0) {
                                return `${hours} hr`;
                            } else {
                                return `${hours} hr ${remainingMinutes} min`;
                            }
                        } else {
                            return `${totalMinutes} min`;
                        }
                    })()}
                </Typography>
            </Box>

            <CardContent sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0, // Allow content to shrink
                overflow: 'hidden' // Prevent content from overflowing
            }}>
                <Typography
                    gutterBottom
                    variant="h6"
                    component="h2"
                    sx={{
                        cursor: 'pointer',
                        '&:hover': {
                            color: 'primary.main',
                            textDecoration: 'underline',
                        },
                    }}
                    onClick={() => openDetails(course)}
                >
                    {course.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    flexGrow: 1, // Allow description to take available space
                    minHeight: 0 // Allow it to shrink
                  }}
                >
                    {descriptionText ? `${descriptionText.slice(0, 100)}...` : 'No description available.'}
                </Typography>
                {/* Rating display: stars only, below title and description */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexShrink: 0 }}>
                  <CourseStars rating={course.average_rating} />
                  {course.credit_points && (
                    <Chip
                      label={`${course.credit_points} pts`}
                      size="small"
                      sx={{
                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(34, 197, 94, 0.15)',
                        color: (theme) => theme.palette.mode === 'dark'
                          ? '#22c55e'
                          : '#15803d',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 24,
                        border: (theme) => theme.palette.mode === 'dark'
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : '1px solid rgba(34, 197, 94, 0.2)',
                        ml: 'auto',
                      }}
                    />
                  )}
                </Box>

                {(isEnrolled || isCompleted) && (
                  <Box sx={{ mt: 0.5, mb: 0.5, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                                                {displayPercent}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          backgroundColor: (theme) =>
                            isCompleted ? theme.palette.success.main : theme.palette.primary.main,
                        },
                      }}
                    />
                  </Box>
                )}

                <Box display="flex" alignItems="center" flexWrap="wrap" mb={1} flexShrink={0}></Box>
            </CardContent>
<CardActions
  sx={{
    px: 2,
    pb: 2,
    pt: 0,
    flexShrink: 0,
    mt: 'auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 1,
    alignItems: 'center',
  }}
>
  <Button
    fullWidth
    variant="text"
        onClick={() => openDetails(course)}
        sx={{ fontWeight: 400, minHeight: 36, ...pageButtonSx }}
  >
    Details
  </Button>

  {/* ✅ New button logic */}
    {isCompleted ? (
    <Button
      fullWidth
      variant="contained"
      color="primary"
            disabled
            sx={{ fontWeight: 400, ...pageButtonSx }}
    >
            Completed
    </Button>
    ) : isPendingApproval ? (
                <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        disabled
                        sx={{ fontWeight: 400, ...pageButtonSx }}
                >
                        Pending Approval
                </Button>
    ) : isEnrolled ? (
        <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => {
                if (!isStarted) {
                    enterCourse(course.id);
                    return;
                }
                navigate(`/course/${course.id}`, {
                    state: {
                        courseTitle: course.title,
                        courseProgress: status?.progress_percent ?? 0,
                        courseId: course.id,
                    },
                });
            }}
            sx={{ fontWeight: 400, ...pageButtonSx }}
        >
            {isStarted ? 'Start Learning' : 'Start Learning'}
        </Button>
  ) : !isAssigned ? (
    <Button
      fullWidth
      variant="contained"
      color="primary"
            onClick={() => openDetails(course)}
            sx={{ fontWeight: 400, ...pageButtonSx }}
    >
      Enroll
    </Button>
   
    ) : !isEnrolled ? (
        <Button
          fullWidth
          variant="outlined"
          color="primary"
                    onClick={() => openDetails(course)}
                    sx={{ fontWeight: 400, ...pageButtonSx }}
        >
          Enroll
        </Button>
    ) : (
    <Button
      fullWidth
      variant="contained"
      color="primary"
      onClick={() =>
        navigate(`/course/${course.id}`, {
          state: {
            courseTitle: course.title,
            courseProgress: status?.progress_percent ?? 0,
            courseId: course.id,
          },
        })
      }
            sx={{ fontWeight: 400, ...pageButtonSx }}
    >
            Start Learning
    </Button>
  )}
</CardActions>
        </Card>
    );
};

    const UnifiedCourseCard = ({ course }) => {
        const courseImageUrl = getCourseCoverImage(course);
        const status = enrollmentStatus[course.id];
        const isCompleted = isCompletedEnrollment(status);
        const isEnrolled = isEnrolledEnrollment(status);
        const isAssigned = typeof status?.is_assigned === 'boolean' ? status.is_assigned : Boolean(course.is_assigned);
        const isPendingApproval = isApprovalPending(status);
        const isStarted =
            Boolean(status) &&
            (
                status.progress === 'IN_PROGRESS' ||
                (typeof status.progress_percent === 'number' && status.progress_percent > 0) ||
                (typeof status.overall_progress === 'number' && status.overall_progress > 0)
            );
        const percent = isCompleted ? 100 : Math.max(0, Math.min(100, getStatusPercent(status)));
        const displayPercent = Math.round(percent);
        const resolveCategoryLabel = () => {
            if (course?.category?.name) {
                return String(course.category.name);
            }

            if (course?.category && typeof course.category === 'object') {
                const idFromObject = String(course.category.id ?? '').trim();
                if (idFromObject && categoryNameLookup.has(idFromObject)) {
                    return categoryNameLookup.get(idFromObject);
                }
            }

            if (Array.isArray(course?.categories) && course.categories.length > 0) {
                for (const item of course.categories) {
                    if (item?.name) {
                        return String(item.name);
                    }
                    const idFromItem = String(item?.id ?? item ?? '').trim();
                    if (idFromItem && categoryNameLookup.has(idFromItem)) {
                        return categoryNameLookup.get(idFromItem);
                    }
                }
            }

            const categoryIds = extractCourseCategoryIds(course);
            for (const id of categoryIds) {
                if (categoryNameLookup.has(id)) {
                    return categoryNameLookup.get(id);
                }
            }

            const fallbackLabel = getCourseCategoryLabel(course);
            return fallbackLabel || 'General';
        };

        const categoryLabel = resolveCategoryLabel();
        const durationLabel = formatCourseDuration(course?.total_duration ?? course?.duration);
        const lessonCount = getCourseLessonCount(course);
        const hasRating = typeof course?.average_rating === 'number' && course.average_rating > 0;
        const displayRating = hasRating ? Number(course.average_rating).toFixed(1).replace(/\.0$/, '') : 'New';
        const levelLabel = String(course?.level || course?.difficulty || course?.skill_level || 'Available')
            .replace(/_/g, ' ')
            .toUpperCase();
        const enrollmentCount = formatEnrollmentCount(course?.enrolled_count);
        const navigateState = {
            courseTitle: course.title,
            courseProgress: status?.progress_percent ?? 0,
            courseId: course.id,
        };

        let badgeLabel = levelLabel;
        let badgeBackground = '#FFFFFF';
        let badgeColor = '#0369A1';
        let badgeBorder = '1px solid rgba(3, 105, 161, 0.18)';

        if (isCompleted) {
            badgeLabel = 'COMPLETED';
            badgeBackground = '#4CAF50';
            badgeColor = '#FFFFFF';
            badgeBorder = 'none';
        } else if (isPendingApproval) {
            badgeLabel = 'PENDING APPROVAL';
            badgeBackground = '#F59E0B';
            badgeColor = '#FFFFFF';
            badgeBorder = 'none';
        } else if (isEnrolled) {
            badgeLabel = isStarted ? 'IN PROGRESS' : 'ENROLLED';
            badgeBackground = '#1565C0';
            badgeColor = '#FFFFFF';
            badgeBorder = 'none';
        }

        const supportText = isCompleted
            ? 'Course completed successfully.'
            : isPendingApproval
                ? 'Waiting for admin approval before you can start.'
                : isEnrolled
                    ? (isStarted ? 'Resume your learning journey from where you stopped.' : 'You are enrolled and ready to begin.')
                    : enrollmentCount
                        ? `Enrollment: ${enrollmentCount} students`
                        : course?.credit_points
                            ? `Earn ${course.credit_points} credit points`
                            : 'Explore the course details before you enroll.';

        let primaryActionLabel = 'Enroll Now';
        let primaryActionHandler = () => openDetails(course);
        let primaryActionSx = catalogPrimaryButtonSx;
        let primaryActionDisabled = false;

        if (isCompleted) {
            primaryActionLabel = 'Completed';
            primaryActionDisabled = true;
            primaryActionSx = catalogDisabledButtonSx;
        } else if (isPendingApproval) {
            primaryActionLabel = 'Pending Approval';
            primaryActionDisabled = true;
            primaryActionSx = catalogPendingButtonSx;
        } else if (isEnrolled) {
            primaryActionLabel = isStarted ? 'Continue Learning' : 'Start Learning';
            primaryActionHandler = () => {
                if (!isStarted) {
                    enterCourse(course.id, navigateState);
                    return;
                }
                navigate(`/course/${course.id}`, { state: navigateState });
            };
        } else if (!isAssigned) {
            primaryActionLabel = 'Enroll Now';
            primaryActionHandler = () => openDetails(course);
        }

        return (
            <Card
                sx={{
                    height: 500,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFFFF',
                    boxShadow: 3,
                    border: '1px solid rgba(214, 228, 242, 0.95)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: 12,
                        transform: 'translateY(-4px)',
                    },
                }}
            >
                <Box
                    sx={{
                     
                        flex: '0 0 190px',
                        position: 'relative',
                        backgroundImage: courseImageUrl ? `url(${courseImageUrl})` : getRandomGradient(course.id),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#0f1c2e',
                    }}
                >
                    {!courseImageUrl && (
                        <SchoolIcon
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: 64,
                                color: 'rgba(255, 255, 255, 0.82)',
                                filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22))',
                            }}
                        />
                    )}

                    <Box
                        sx={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            maxWidth: 'calc(100% - 32px)',
                            backgroundColor: badgeBackground,
                            color: badgeColor,
                            border: badgeBorder,
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            px: 2.1,
                            py: 0.6,
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {badgeLabel}
                    </Box>
                </Box>

                <CardContent
                    sx={{
                       flex: '1 1 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 3,
                        pt: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            mb: 2.5,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#5B6770',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.09em',
                                minWidth: 0,
                                maxWidth: '100%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {categoryLabel}
                        </Typography>
                        {isEnrolled || isCompleted ? (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: isCompleted ? '#2E7D32' : '#0B63CE',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {displayPercent}% Completed
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: '#8A6500' }}>
                                <StarRoundedIcon sx={{ fontSize: 20 }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {displayRating}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Typography
                        variant="h5"
                        sx={{
                            mb: -4,
                            minHeight: 84,
                            lineHeight: 1.35,
                            fontWeight: 700,
                            color: '#36404A',
                            cursor: 'pointer',
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                        onClick={() => openDetails(course)}
                    >
                        {course.title}
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: 1.2,
                            color: '#5B6770',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                            <AccessTimeOutlinedIcon sx={{ fontSize: 21, color: '#5B6770' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.98rem', whiteSpace: 'nowrap' }}>
                                {durationLabel}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                            <PlayCircleOutlineIcon sx={{ fontSize: 21, color: '#5B6770' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.98rem', whiteSpace: 'nowrap' }}>
                                {lessonCount > 0 ? `${lessonCount} Lessons` : 'Self-paced'}
                            </Typography>
                        </Box>
                    </Box>

                    {(isEnrolled || isCompleted) && (
                        <Box sx={{ mb: 1.75 }}>
                            <LinearProgress
                                variant="determinate"
                                value={percent}
                                sx={{
                                    height: 8,
                                    borderRadius: 999,
                                    backgroundColor: '#D9E4F8',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 999,
                                        backgroundColor: isCompleted ? '#4CAF50' : '#1565C0',
                                    },
                                }}
                            />
                        </Box>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            color: '#5B6770',
                            mb: 1.25,
                            minHeight: 44,
                            display: '-webkit-box',
                            overflow: 'hidden',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {supportText}
                    </Typography>
                </CardContent>

                <CardActions
                    sx={{
                        px: 2.5,
                        pb: 2.5,
                        pt: 0,
                        mt: 'auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1.5,
                    }}
                >
                    <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        onClick={() => openDetails(course)}
                        sx={catalogSecondaryButtonSx}
                    >
                        Details
                    </Button>

                    <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        disabled={primaryActionDisabled}
                        onClick={primaryActionHandler}
                        sx={primaryActionSx}
                    >
                        {primaryActionLabel}
                    </Button>
                </CardActions>
            </Card>
        );
    };


    // If loading from dashboard with courseId, show only the details dialog
    if (showOnlyDetails && searchParams.get('courseId')) {
        return (
            <Box
                sx={{
                    background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0a1929 0%, #132f4c 50%, #1e3a5f 100%)'
                        : 'linear-gradient(135deg, #e3f2fd 0%, #b2c5d4ff 50%, #cfe7faff 100%)',
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {detailsLoading ? (
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        sx={{ gap: 3 }}
                    >
                        <CircularProgress
                            size={60}
                            thickness={4}
                            sx={{
                                color: (theme) => theme.palette.mode === 'dark' ? '#10b981' : '#059669',
                                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                            }}
                        />
                        <Typography
                            variant="h6"
                            sx={{
                                color: (theme) => theme.palette.text.primary,
                                fontWeight: 500,
                                textAlign: 'center',
                            }}
                        >
                            Loading Course Details...
                        </Typography>
                    </Box>
                ) : (
                    <CourseDetailsDialog />
                )}
            </Box>
        );
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                px: { xs: 1, md: 4 },
                py: 2,
                background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #0a1929 0%, #132f4c 50%, #1e3a5f 100%)'
                    : 'linear-gradient(135deg, #e3f2fd 0%, #b2c5d4ff 50%, #cfe7faff 100%)',
                minHeight: '100vh',
            }}
        >
            <Typography variant="h3" gutterBottom fontWeight={550} letterSpacing={-1} sx={{ mb: 3, color: '#0C4A6E' }}>
                Course Catalog
            </Typography>

            {/* Filters */}
            <Grid
                container
                spacing={2}
                mb={4}
                alignItems="center"
                sx={{
                    maxWidth: 1400,
                    mx: 'auto',
                    transition: 'max-width 0.4s cubic-bezier(.4,0,.2,1)',
                }}
            >
                <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                    <TextField
                        fullWidth
                        placeholder="Search Courses"
                        variant="outlined"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searching ? (
                                <InputAdornment position="end">
                                    <CircularProgress size={18} />
                                </InputAdornment>
                            ) : undefined,
                            sx: {
                                fontSize: '1.1rem',
                                height: 56,
                                color: (theme) => theme.palette.text.primary,
                            }
                        }}
                        sx={{
                                                       
                            '& .MuiOutlinedInput-root': {
                                height: 56,
                                borderRadius: '30px',
                                fontSize: '1.1rem',
                                color: (theme) => theme.palette.text.primary,
                            },
                            '& .MuiOutlinedInput-input::placeholder': {
                                color: '#0C4A6E',
                                opacity: 1,
                            },
                        }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 4 }}>
    <FormControl
        fullWidth
        variant="outlined"
        sx={{
            minWidth: 200, // ensures enough space
            background: (theme) => theme.palette.background.paper,
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
                height: 56,
                fontSize: '1.1rem',
                color: (theme) => theme.palette.text.primary,
            },
            '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
            },
        }}
    >
        <Select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
             sx={{
                borderRadius: '30px',  
                height: 56,
                '& .MuiOutlinedInput-notchedOutline': {
                borderRadius: '30px',
           },
    }}
            displayEmpty
            renderValue={(selected) => {
                if (!selected) {
                    return <span style={{ color: '#0C4A6E' }}>Category</span>;
                }
                const selectedCategory = categories.find((category) => String(category.id) === String(selected));
                return selectedCategory?.name || 'Category';
            }}
        >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                    {category.name}
                </MenuItem>
            ))}
        </Select>
    </FormControl>
</Grid>

                <Grid size={{ xs: 12, sm: 4, md: 4 }}>
                    <FormControl fullWidth variant="outlined"
                        sx={{
                            background: (theme) => theme.palette.background.paper,
                            borderRadius: 2,
                            '& .MuiOutlinedInput-root': {
                                height: 56,
                                fontSize: '1.1rem',
                                color: (theme) => theme.palette.text.primary,
                            }
                        }}
                    >
                        {/* Reserved for future filters */}
                    </FormControl>
                </Grid>
            </Grid>

            {/* Course Grid */}
           {(() => {
                const ordered = orderedCourses || [];
                const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
                const safePage = Math.min(page, totalPages);
                const start = (safePage - 1) * PAGE_SIZE;
                const visibleCourses = ordered.slice(start, start + PAGE_SIZE);

                if (!ordered.length) {
                    return (
                        <Alert severity="info">
                            No courses found matching your criteria. Try adjusting your filters.
                        </Alert>
                    );
                }

                                return (
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
    {visibleCourses.map((course) => (
    <UnifiedCourseCard key={course.id} course={course} />
  ))}
</Box>


                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination
                                        count={totalPages}
                                        page={safePage}
                                        onChange={(_, value) => setPage(value)}
                                        color="primary"
                                        shape="rounded"
                                        siblingCount={1}
                                        boundaryCount={1}
                                />
                        </Box>
             </>
                                );
                        })()}

            <Snackbar
                open={Boolean(enrollSuccessMessage)}
                autoHideDuration={2500}
                onClose={() => setEnrollSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setEnrollSuccessMessage('')} severity={enrollMessageSeverity} variant="filled" sx={{ width: '100%' }}>
                    {enrollSuccessMessage}
                </Alert>
            </Snackbar>

            <CourseDetailsDialog />
        </Box>
    );
};

export default CourseCatalog;
