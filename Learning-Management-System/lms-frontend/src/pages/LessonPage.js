import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  CircularProgress,
  Button,
  DialogActions,
  TextField,
  Rating,
  Alert,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/CheckCircle';
import FeedbackIcon from '@mui/icons-material/Feedback';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactPlayer from 'react-player';
import api, { API_BASE_URL } from '../api';
import QuizViewer from '../pages/QuizViewer';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { useTheme } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

// Small stopwatch-style quiz icon to match the provided reference
const QuizStopwatchIcon = ({ size = 18 }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="#4a4a4a" />
      <rect x="28" y="6" width="8" height="8" rx="2" fill="#ffffff" />
      <circle cx="32" cy="34" r="18" fill="none" stroke="#ffffff" strokeWidth="4" />
      <line x1="32" y1="34" x2="32" y2="20" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="34" x2="42" y2="28" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </Box>
);

// Graduation hat fused with stopwatch icon (theme-aware colors)
const GraduationStopwatchIcon = ({ size = 26 }) => {
  const theme = useTheme();
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="grad-hat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.palette.mode === 'dark' ? '#908484' : '#666666'}/>
            <stop offset="100%" stopColor={theme.palette.mode === 'dark' ? '#565454ff' : '#333333'}/>
          </linearGradient>
          <linearGradient id="grad-ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.palette.mode === 'dark' ? '#8b8b8b' : '#666666'}/>
            <stop offset="100%" stopColor={theme.palette.mode === 'dark' ? '#615e5eff' : '#333333'}/>
          </linearGradient>
        </defs>
        {/* Hat */}
        <path d="M6 18 L32 6 L58 18 L32 30 Z" fill="url(#grad-hat)"/>
        <rect x="26" y="18" width="12" height="6" fill="url(#grad-hat)" />
        {/* Tassel */}
        <circle cx="14" cy="22" r="2" fill={theme.palette.mode === 'dark' ? '#7f7a7aff' : '#555555'}/>
        <path d="M14 22 L14 30" stroke={theme.palette.mode === 'dark' ? '#676565ff' : '#444444'} strokeWidth="2"/>
        <circle cx="14" cy="31.5" r="2" fill={theme.palette.mode === 'dark' ? '#605b5bff' : '#333333'}/>
        {/* Clock ring */}
        <circle cx="32" cy="42" r="18" fill="none" stroke="url(#grad-ring)" strokeWidth="4"/>
        {/* Clock marks */}
        <g stroke={theme.palette.mode === 'dark' ? '#747272' : '#888888'} strokeWidth="3" strokeLinecap="round">
          <line x1="32" y1="26" x2="32" y2="29"/>
          <line x1="32" y1="55" x2="32" y2="58"/>
          <line x1="18" y1="42" x2="21" y2="42"/>
          <line x1="43" y1="42" x2="46" y2="42"/>
        </g>
        {/* Clock hands */}
        <circle cx="32" cy="42" r="2" fill={theme.palette.mode === 'dark' ? '#343434' : '#666666'}/>
        <line x1="32" y1="42" x2="43" y2="38" stroke={theme.palette.mode === 'dark' ? '#666666' : '#888888'} strokeWidth="3" strokeLinecap="round"/>
        <line x1="32" y1="42" x2="28" y2="31" stroke={theme.palette.mode === 'dark' ? '#504e4eff' : '#666666'} strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </Box>
  );
};

const FinalScreen = ({ course }) => {
  const theme = useTheme();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSnackbar, setFeedbackSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) {
      setFeedbackSnackbar({
        open: true,
        message: 'Please enter your feedback message',
        severity: 'error'
      });
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await api.post('/feedback/submit/', {
        course_id: course.id,
        message: feedbackMessage,
        rating: feedbackRating
      });
      
      setFeedbackSnackbar({
        open: true,
        message: 'Thank you for your feedback!',
        severity: 'success'
      });
      
      setFeedbackDialogOpen(false);
      setFeedbackMessage('');
      setFeedbackRating(5);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFeedbackSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCloseFeedbackDialog = () => {
    setFeedbackDialogOpen(false);
    setFeedbackMessage('');
    setFeedbackRating(5);
  };
  
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="80vh"
      textAlign="center"
    >
      <Box
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#e6fff2',
          padding: 4,
          borderRadius: 4,
          maxWidth: 480,
          boxShadow: 3,
          border: theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none',
        }}
      >
        <Box mb={3}>
          <CheckIcon sx={{ fontSize: 60, color: theme.palette.success.main }} />
        </Box>
        <Typography variant="h4" gutterBottom color="text.primary">
          Congratulations!
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }} color="text.secondary">
          You have completed the course successfully. Well done!
        </Typography>
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          mb={3}
          px={2}
          py={1}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.success.dark : '#ccffea',
            borderRadius: 2,
          }}
        >
          <CheckIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
          <Typography fontWeight="bold" color="text.primary">Final quiz completed</Typography>
        </Box>
        <Typography variant="subtitle1" mb={2} color="text.primary">What to do next?</Typography>
        <Box display="flex" justifyContent="center" gap={2} mt={2}>
          <Button
            variant="outlined"
            onClick={() => window.location.href = "/catalog"}
            sx={{ minWidth: 160, textAlign: 'center' }}
          >
            Course Catalog
          </Button>
          <Button
            variant="contained"
            onClick={() => window.location.href = "/my-courses"}
            sx={{ minWidth: 160, textAlign: 'center' }}
          >
            My Courses
          </Button>
        </Box>
        
        {/* Feedback Button */}
        <Box display="flex" justifyContent="center" mt={3}>
          <Button
            variant="text"
            color="primary"
            onClick={() => setFeedbackDialogOpen(true)}
            startIcon={<FeedbackIcon />}
            sx={{ 
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Share Your Feedback
          </Button>
        </Box>
      </Box>
      
      {/* Feedback Dialog */}
      <Dialog 
        open={feedbackDialogOpen} 
        onClose={handleCloseFeedbackDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FeedbackIcon color="primary" />
            Share Your Feedback
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              How would you rate this course?
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Rating
                value={feedbackRating}
                onChange={(event, newValue) => setFeedbackRating(newValue)}
                size="large"
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {feedbackRating} star{feedbackRating !== 1 ? 's' : ''}
              </Typography>
            </Box>
            
            <Typography variant="body1" gutterBottom>
              Tell us about your experience:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Share your thoughts about the course content, difficulty level, what you learned, or any suggestions for improvement..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFeedbackDialog} disabled={feedbackSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleFeedbackSubmit} 
            variant="contained"
            disabled={feedbackSubmitting || !feedbackMessage.trim()}
          >
            {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={feedbackSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setFeedbackSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setFeedbackSnackbar(prev => ({ ...prev, open: false }))} 
          severity={feedbackSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {feedbackSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const LessonPage = () => {
  const { courseId: paramCourseId, lessonId } = useParams();
  const location = useLocation();
  const courseId = location.state?.courseId || paramCourseId;
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const theme = useTheme();

  const [course, setCourse] = useState(null);
  const [lessonList, setLessonList] = useState([]);
  const [quizData, setQuizData] = useState(location.state?.quizData || null);
  const [quizCheckLoading, setQuizCheckLoading] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [unlockedLessonIndex, setUnlockedLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, setPdfScrollProgress] = useState(0);
  const [visitedPages, setVisitedPages] = useState(new Set());
  const [totalPages, setTotalPages] = useState(0);
  const [videoSourceIndex, setVideoSourceIndex] = useState(0);
  const [videoLoadError, setVideoLoadError] = useState('');
  const attemptedVideoErrorUrls = useRef(new Set());
  const pdfMarked = useRef(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const maxWatchedSecondsRef = useRef(0);
  const lastWatchSyncRef = useRef(0);
  const isInternalSeekRef = useRef(false);

  const lessonIndex = Number.isNaN(parseInt(lessonId)) ? 0 : parseInt(lessonId, 10);
  const currentLesson = lessonList[lessonIndex];

  const getBackendOrigin = () => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return window.location.origin;
    }
  };

  const normalizeToCurrentProtocol = (url) => {
    if (!url) return url;
    const isHttpsPage = window.location.protocol === 'https:';
    if (!isHttpsPage) return url;

    try {
      const parsed = new URL(url);
      const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (parsed.protocol === 'http:' && !isLocal) {
        parsed.protocol = 'https:';
        return parsed.toString();
      }
      return url;
    } catch {
      return url;
    }
  };

  const buildMediaCandidates = (mediaPath) => {
    if (!mediaPath) return [];

    const isLocalFrontend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const productionBackendOrigin = 'https://learning-management-system-4i6f.onrender.com';

    const backendOrigins = [
      process.env.REACT_APP_BACKEND_URL,
      API_BASE_URL?.replace(/\/api\/?$/, ''),
      getBackendOrigin(),
      productionBackendOrigin,
    ].filter(Boolean);

    const preferredOrigins = isLocalFrontend
      ? backendOrigins
      : backendOrigins.filter((origin) => {
          try {
            const host = new URL(String(origin)).hostname;
            return host !== 'localhost' && host !== '127.0.0.1';
          } catch {
            return true;
          }
        });

    let normalizedPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      try {
        normalizedPath = new URL(mediaPath).pathname || normalizedPath;
      } catch {
        // Keep the original path fallback when URL parsing fails.
      }
    }

    const bareFileName = mediaPath.split('/').pop();
    const guessedPaths = [];
    if (bareFileName && bareFileName === mediaPath) {
      guessedPaths.push(`/media/course_videos/${bareFileName}`);
      guessedPaths.push(`/media/pdfs/${bareFileName}`);
    }

    const originsForGuess = preferredOrigins.length ? preferredOrigins : backendOrigins;

    const candidates = mediaPath.startsWith('http://') || mediaPath.startsWith('https://')
      ? [mediaPath, ...preferredOrigins.map((origin) => `${String(origin).replace(/\/$/, '')}${encodeURI(normalizedPath)}`)]
      : [
          ...preferredOrigins.map((origin) => `${String(origin).replace(/\/$/, '')}${encodeURI(normalizedPath)}`),
          ...originsForGuess.flatMap((origin) =>
            guessedPaths.map((path) => `${String(origin).replace(/\/$/, '')}${encodeURI(path)}`)
          ),
        ];

    return [...new Set(candidates.map(normalizeToCurrentProtocol).filter(Boolean))];
  };

  const videoUrlCandidates = useMemo(
    () => buildMediaCandidates(currentLesson?.video?.video_file || ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLesson?.video?.video_file]
  );

  const activeVideoUrl = videoUrlCandidates[videoSourceIndex] || '';

  const getVideoProgressSafe = async (videoId) => {
    if (!videoId) {
      return { watched: false, locked_until_rewatch: false, quiz_completed: false, watched_duration: 0 };
    }
    try {
      const res = await api.get(`/videos/${videoId}/progress/`);
      return res.data || { watched: false, locked_until_rewatch: false, quiz_completed: false, watched_duration: 0 };
    } catch (error) {
      if (error?.response?.status === 404) {
        console.warn(`Video progress not found for video ${videoId}. Using default progress.`);
        return { watched: false, locked_until_rewatch: false, quiz_completed: false, watched_duration: 0 };
      }
      throw error;
    }
  };

  const handlePdfComplete = async () => {
    if (pdfMarked.current || !currentLesson?.video) return;
    pdfMarked.current = true;

    try {
      await api.post(`/videos/${currentLesson.video.id}/mark_complete/`);
      setVideoCompleted(true);
      setUnlockedLessonIndex((prev) => Math.max(prev, lessonIndex + 1));
      console.log('✅ PDF marked as complete!');
    } catch (e) {
      console.error("Failed to mark PDF as complete", e);
    }
  };

  useEffect(() => {
    // Only mark complete if the user truly paged through everything
    if (
      totalPages > 0 &&
      visitedPages.size === totalPages &&
      !pdfMarked.current
    ) {
      setPdfScrollProgress(100);
      handlePdfComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitedPages, totalPages]);

  const handleVideoEnd = async () => {
    if (currentLesson?.video) {
      try {
        await api.post(`/videos/${currentLesson.video.id}/mark_complete/`);
        setVideoCompleted(true);
        setUnlockedLessonIndex((prev) => Math.max(prev, lessonIndex + 1));
      } catch (error) {
        console.error('Failed to mark video complete:', error);
      }
    }
  };

  const fetchProgressAndBuildLessons = async () => {
    const courseRes = await api.get(`/courses/${courseId}/`);
    const enableQuizzes = courseRes.data.enable_quizzes !== false;
    const videosRes = await api.get(`/courses/${courseId}/videos/`);
    const progressRes = await api.get(`/courses/${courseId}/detailed_progress/`);
    setEnrollmentStatus(progressRes.data.enrollment_status || null);

    const orderedVideos = (Array.isArray(videosRes.data) ? videosRes.data : [])
      .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    let highestUnlocked = -1;

    const expanded = orderedVideos.flatMap((v) => {
      const progress = progressRes.data.video_progress?.[v.id];
      const items = [{ type: 'video', video: v }];
      if (progress?.watched) highestUnlocked += 1;
      if (enableQuizzes && v.has_quiz && v.quiz_id) {
        items.push({
          type: 'quiz',
          quizId: v.quiz_id,
          videoTitle: v.title,
          videoId: v.id,
        });
        if (progress?.quiz_completed) highestUnlocked += 1;
      }
      return items;
    });

    if (courseRes.data.final_quiz?.id) {
      expanded.push({ type: 'final_quiz', quizId: courseRes.data.final_quiz.id });
      if (progressRes.data.final_quiz_passed) highestUnlocked += 1;
    }

    if (progressRes.data.final_quiz_passed) {
      expanded.push({ type: 'final_screen' });
    }

    setCourse(courseRes.data);
    setLessonList(expanded);
    setUnlockedLessonIndex(highestUnlocked + 1);
    setLoading(false);
  };

  useEffect(() => {
    fetchProgressAndBuildLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!lessonList.length) return;
    if (lessonIndex < 0 || lessonIndex >= lessonList.length) {
      navigate(`/course/${courseId}/lesson/0`, { replace: true, state: { courseId } });
    }
  }, [lessonIndex, lessonList, navigate, courseId]);

  useEffect(() => {
    pdfMarked.current = false;
    setVisitedPages(new Set());
    setPdfScrollProgress(0);
    setTotalPages(0);
  }, [currentLesson]);

  useEffect(() => {
    setVideoSourceIndex(0);
    setVideoLoadError('');
    attemptedVideoErrorUrls.current = new Set();
    maxWatchedSecondsRef.current = 0;
    lastWatchSyncRef.current = 0;
    isInternalSeekRef.current = false;
  }, [currentLesson?.video?.id]);

  useEffect(() => {
    const container = document.querySelector('#pdf-scroll-container');
    if (!container) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

      if (distanceToBottom <= 2 && !pdfMarked.current) {
        console.log('✅ User scrolled to bottom of PDF');
        setPdfScrollProgress(100);
        handlePdfComplete();
      }
    };

    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson]);

  useEffect(() => {
    const checkProgress = async () => {
      if (!currentLesson) return;
      setVideoCompleted(false);
      setQuizCheckLoading(true);
      try {
        if (currentLesson.type === 'video') {
          const progress = await getVideoProgressSafe(currentLesson?.video?.id);
          maxWatchedSecondsRef.current = Number(progress?.watched_duration || 0);
          if (progress.locked_until_rewatch) {
            navigate(`/course/${courseId}/lesson/${lessonIndex}`, {
              state: { courseId },
            });
            return;
          }
          setVideoCompleted(progress.watched || false);
        }

        if (currentLesson.type === 'quiz' || currentLesson.type === 'final_quiz') {
          const progressRes = await api.get(`/courses/${courseId}/detailed_progress/`);
          let quizPassed = false;
          if (currentLesson.type === 'final_quiz') {
            quizPassed = progressRes.data.final_quiz_passed;
          } else {
            const videoProgress = progressRes.data.video_progress?.[currentLesson.videoId];
            quizPassed = videoProgress?.quiz_completed || false;
          }
          if (quizPassed) {
            setQuizData({ type: 'result', passed: true });
          } else {
            const canAttemptRes = await api.get(`/quizzes/${currentLesson.quizId}/can_attempt/`);
            if (canAttemptRes.data.can_attempt) {
              const quizRes = await api.get(`/quizzes/${currentLesson.quizId}/`);
              setQuizData({ ...quizRes.data, already_passed: false });
            } else {
              // Don't show quiz result screen - instead show "Start Learning" message
              // Set quiz data to trigger "Start Learning" UI
              setQuizData({ 
                type: 'not_ready', 
                reason: canAttemptRes.data.reason,
                cannot_attempt_reason: canAttemptRes.data.reason
              });
            }
          }
        }
      } catch (error) {
        console.error('checkProgress failed:', error);
        if (currentLesson.type === 'video') {
          setVideoCompleted(false);
        }
      } finally {
        setQuizCheckLoading(false);
      }
    };
    checkProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson]);

  const handleSpecialRedirect = ({ type, videoId, redirectLessonIndex }) => {
    if (type === "REDIRECT_TO_VIDEO") {
      const idx = lessonList.findIndex(
        (l) => l.type === "video" && l.video.id === videoId
      );
      if (idx !== -1) {
        navigate(`/course/${courseId}/lesson/${idx}`, { state: { courseId } });
      }
    } else if (type === "RESET_COURSE") {
      localStorage.removeItem("failedQuizzes");
      setUnlockedLessonIndex(0);
      navigate(`/course/${courseId}/lesson/${redirectLessonIndex || 0}`, { state: { courseId } });
      fetchProgressAndBuildLessons();
    }
  };

  const handleQuizPassed = () => {
    setQuizData({ type: 'result', passed: true });
    setUnlockedLessonIndex((prev) => Math.max(prev, lessonIndex + 1));
    if (currentLesson?.type === 'final_quiz') fetchProgressAndBuildLessons();
  };

  const canGoNext = () => {
    if (currentLesson?.type === 'video') {
      // Progress should only move after the learner actually completes the lesson media.
      if (currentLesson.video.video_file) return videoCompleted;
      if (currentLesson.video.pdf_file) return videoCompleted;
      return false;
    }
    if (currentLesson?.type === 'quiz' || currentLesson?.type === 'final_quiz') {
      return quizData?.type === 'result' && quizData?.passed;
    }
    return true;
  };

  // Handler for when PDF document loads
  const handlePdfDocumentLoad = ({ doc }) => {
    setTotalPages(doc.numPages);
  };

  // Handler for when a PDF page is changed/visited
  const handlePdfPageChange = ({ currentPage }) => {
    setVisitedPages((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentPage);
      const percent = totalPages > 0 ? (newSet.size / totalPages) * 100 : 0;
      setPdfScrollProgress(percent);
      return newSet;
    });
  };

  return loading ? (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <CircularProgress />
    </Box>
  ) : enrollmentStatus === 'BLOCKED' ? (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" flexDirection="column">
      <Typography variant="h4" color="error" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        You have exceeded the maximum number of quiz attempts for this course.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/my-courses')}>
        Go to My Courses
      </Button>
    </Box>
  ) : (
    <>
      <AppBar position="fixed" sx={{ 
        bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : 1
      }}>
        <Toolbar>
          <Typography variant="h6" sx={{ 
            flexGrow: 1, 
            color: (theme) => theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.contrastText 
          }}>
            {course?.title || 'Course'}
          </Typography>
          
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', mt: '64px', height: 'calc(100vh - 64px)', bgcolor: theme.palette.background.default }}>
        <Box sx={{ 
          width: 300, 
          borderRight: (theme) => `1px solid ${theme.palette.divider}`, 
          p: 2, 
          bgcolor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.grey[50], 
          overflowY: 'auto', 
          height: '100%' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/my-courses')} 
              size="small" 
              sx={{ 
                mr: 1,
                color: (theme) => theme.palette.text.primary,
                '&:hover': {
                  bgcolor: (theme) => theme.palette.action.hover
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">Back</Typography>
          </Box>
          <List>
            {lessonList.map((item, idx) => {
              const isLocked = idx > unlockedLessonIndex;
              return (
                <ListItem
                  key={idx}
                  disablePadding
                  sx={{ mb: 1, borderRadius: 1, overflow: 'hidden' }}
                >
                  <ListItemButton
                    disabled={isLocked}
                    selected={idx === lessonIndex}
                    onClick={async () => {
                      if (item.type === "quiz" && item.videoId) {
                        const progress = await getVideoProgressSafe(item.videoId);
                        if (progress.locked_until_rewatch) {
                          alert("This quiz is locked until you rewatch the video.");
                          return;
                        }
                      }
                      navigate(`/course/${courseId}/lesson/${idx}`, { state: { courseId } });
                    }}
                    sx={{
                      bgcolor: idx === lessonIndex ? (theme) => theme.palette.action.selected : 'transparent',
                      borderRadius: 1,
                      opacity: isLocked ? 0.5 : 1,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      color: (theme) => theme.palette.text.primary,
                      '&:hover': {
                        bgcolor: (theme) => !isLocked ? theme.palette.action.hover : 'transparent'
                      },
                      '&.Mui-selected': {
                        bgcolor: (theme) => theme.palette.primary.main,
                        color: (theme) => theme.palette.primary.contrastText,
                        '&:hover': {
                          bgcolor: (theme) => theme.palette.primary.dark,
                        }
                      },
                      '&.Mui-disabled': {
                        opacity: 0.5,
                      }
                    }}
                  >
                  <ListItemText
                    primary={
                      item.type === 'video'
                        ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <OndemandVideoIcon fontSize="small" />
                            <span>{item.video.title}</span>
                          </Box>
                        )
                        : item.type === 'quiz'
                        ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <QuizStopwatchIcon />
                            <span>Quiz: {item.videoTitle}</span>
                          </Box>
                        )
                        : item.type === 'final_quiz'
                        ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GraduationStopwatchIcon />
                            <span>Final Quiz</span>
                          </Box>
                        )
                        : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: (theme) => theme.palette.success.main }}>
                              <svg width="18" height="18" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                <defs>
                                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="2" dy="2" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" floodOpacity="0.3"/>
                                  </filter>
                                </defs>
                                <circle cx="32" cy="32" r="28" fill="currentColor"/>
                                <path d="M24 33l6 6 12-12" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow)"/>
                              </svg>
                            </Box>
                            <span>Final Screen</span>
                          </Box>
                        )
                    }
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: 'inherit'
                      }
                    }}
                  />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: theme.palette.background.default }}>
          <Box sx={{ p: 2, bgcolor: theme.palette.background.default }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
              Course Content
            </Typography>
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Button
                variant="outlined"
                onClick={() =>
                  lessonIndex > 0 &&
                  navigate(`/course/${courseId}/lesson/${lessonIndex - 1}`, { state: { courseId } })
                }
                disabled={lessonIndex === 0}
                sx={{
                  color: (theme) => theme.palette.text.primary,
                  borderColor: (theme) => theme.palette.divider,
                  '&:hover': {
                    borderColor: (theme) => theme.palette.primary.main,
                    bgcolor: (theme) => theme.palette.action.hover
                  }
                }}
              >
                ← Back
              </Button>
              <Button
            variant="contained"
            color="primary"
            onClick={() =>
              lessonIndex < lessonList.length - 1 &&
              navigate(`/course/${courseId}/lesson/${lessonIndex + 1}`, { state: { courseId } })
            }
            disabled={lessonIndex >= lessonList.length - 1 || !canGoNext()}
            sx={{ 
              bgcolor: (theme) => theme.palette.primary.main,
              color: (theme) => theme.palette.primary.contrastText,
              '&:hover': {
                bgcolor: (theme) => theme.palette.primary.dark,
              }
            }}
          >
            Next →
          </Button>
            </Box>
          </Box>

          {currentLesson?.type === 'video' && (
            <>
              {currentLesson.video.video_file ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 900, mx: 'auto' }}>
                  {/* Video Title - Above the player */}
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    sx={{ 
                      width: '100%', 
                      textAlign: 'left', 
                      mb: 2,
                      fontSize: '1.25rem',
                      fontWeight: 700
                    }}
                  >
                    {currentLesson.video.title}
                  </Typography>
                  
                  {/* Video Player */}
                  <Box sx={{ 
                    width: '100%', 
                    maxWidth: 700, 
                    aspectRatio: '16/9', 
                    background: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f5f5f5', 
                    mb: 4,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: (theme) => `1px solid ${theme.palette.divider}`
                  }}>
                    <ReactPlayer
                      key={currentLesson.video.id}
                      ref={playerRef}
                      url={activeVideoUrl}
                      controls
                      width="100%"
                      height="100%"
                      config={{
                        file: {
                          attributes: {
                            controlsList: 'nodownload'
                          }
                        }
                      }}
                      onEnded={handleVideoEnd}
                      onProgress={({ playedSeconds }) => {
                        const current = Number(playedSeconds || 0);
                        if (!Number.isFinite(current)) return;

                        if (current > maxWatchedSecondsRef.current) {
                          maxWatchedSecondsRef.current = current;
                        }

                        const delta = current - lastWatchSyncRef.current;
                        if (delta >= 5 && currentLesson?.video?.id) {
                          lastWatchSyncRef.current = current;
                          api.post(`/videos/${currentLesson.video.id}/watch/`, {
                            watched_duration: Math.floor(maxWatchedSecondsRef.current),
                          }).catch(() => {});
                        }
                      }}
                      onSeek={(seekToSeconds) => {
                        if (isInternalSeekRef.current) {
                          isInternalSeekRef.current = false;
                          return;
                        }

                        const allowedForwardLimit = maxWatchedSecondsRef.current + 1.5;
                        if (seekToSeconds > allowedForwardLimit && playerRef.current) {
                          isInternalSeekRef.current = true;
                          playerRef.current.seekTo(maxWatchedSecondsRef.current, 'seconds');
                        }
                      }}
                      onError={(error) => {
                        const failedUrl = videoUrlCandidates[videoSourceIndex];

                        if (failedUrl && attemptedVideoErrorUrls.current.has(failedUrl)) {
                          return;
                        }

                        if (failedUrl) {
                          attemptedVideoErrorUrls.current.add(failedUrl);
                        }

                        if (process.env.NODE_ENV === 'development') {
                          console.warn('Video playback failed for source:', failedUrl, error);
                        }

                        if (videoSourceIndex < videoUrlCandidates.length - 1) {
                          setVideoSourceIndex((prev) => prev + 1);
                          return;
                        }

                        const fileName = (() => {
                          try {
                            return failedUrl ? decodeURIComponent(failedUrl.split('/').pop() || '') : '';
                          } catch {
                            return '';
                          }
                        })();

                        if (fileName) {
                          setVideoLoadError(`Unable to play video (${fileName}). The media file may be missing on the server or encoded in an unsupported format. Please re-upload this video.`);
                        } else {
                          setVideoLoadError('Unable to play this video. The media file may be missing on the server or encoded in an unsupported format. Please re-upload this video.');
                        }
                      }}
                    />
                  </Box>
                  {videoLoadError && (
                    <Alert severity="error" sx={{ width: '100%', maxWidth: 700, mt: -2, mb: 2 }}>
                      {videoLoadError}
                    </Alert>
                  )}
                  
                  {/* Video Description - Below the player */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      width: '100%', 
                      textAlign: 'left', 
                      mt: 2
                    }}
                  >
                    {currentLesson.video.description}
                  </Typography>
                </Box>
              ) : currentLesson.video.pdf_file ? (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 900, mx: 'auto' }}>
                    {/* PDF Title - Above the player */}
                    <Typography 
                      variant="h5" 
                      fontWeight="bold" 
                      sx={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        mb: 2,
                        fontSize: '1.25rem',
                        fontWeight: 700
                      }}
                    >
                      {currentLesson.video.title}
                    </Typography>
                    
                    {/* PDF Player */}
                    <Box
                      id="pdf-scroll-container"
                      sx={{
                        width: '100%',
                        maxWidth: 800,
                        height: '70vh',
                        minHeight: 500,
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 4,
                        background: (theme) => theme.palette.background.paper,
                        boxShadow: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                        mb: 4,
                        overflow: 'hidden'
                      }}
                      onClick={() => setPdfModalOpen(true)}
                    >
                      <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
                        <Viewer
                          fileUrl={buildMediaCandidates(currentLesson.video.pdf_file)[0] || ''}
                          defaultScale={SpecialZoomLevel.PageFit}
                          theme={theme.palette.mode}
                          onDocumentLoad={handlePdfDocumentLoad}
                          onPageChange={handlePdfPageChange}
                        />
                      </Worker>
                    </Box>
                    
                    {/* PDF Description - Below the player */}
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        mt: 2
                      }}
                    >
                      {currentLesson.video.description}
                    </Typography>
                  </Box>
                  <Dialog 
                    open={pdfModalOpen} 
                    onClose={() => setPdfModalOpen(false)} 
                    fullScreen
                    PaperProps={{
                      sx: {
                        bgcolor: (theme) => theme.palette.background.default,
                        color: (theme) => theme.palette.text.primary
                      }
                    }}
                  >
                    <Box sx={{ position: 'absolute', mt:7,top: 16, left: 16, zIndex: 1201 }}>
                      <IconButton 
                        aria-label="Close PDF" 
                        onClick={() => setPdfModalOpen(false)} 
                        sx={{ 
                          backgroundColor: (theme) => theme.palette.background.paper, 
                          boxShadow: 1, 
                          '&:hover': { 
                            background: (theme) => theme.palette.action.hover 
                          } 
                        }}
                      >
                        <ArrowBackIcon />
                      </IconButton>
                    </Box>
                    <DialogTitle sx={{ color: (theme) => theme.palette.text.primary }}>
                      {currentLesson.video.title}
                    </DialogTitle>
                    <DialogContent sx={{ p: 0, overflow: 'hidden', height: '100vh', maxHeight: '100vh' }}>
                      <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
                        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
                          <Button
                            variant="contained"
                            onClick={() =>
                              lessonIndex < lessonList.length - 1 &&
                              navigate(`/course/${courseId}/lesson/${lessonIndex + 1}`, { state: { courseId } })
                            }
                            disabled={lessonIndex >= lessonList.length - 1 || !canGoNext()}
                            sx={{
                              position: 'absolute',
                              right: 56,
                              top: '15%',
                              transform: 'translateY(-50%)',
                              zIndex: 1201,
                              minWidth: 44,
                              minHeight: 48,
                              borderRadius: '50%',
                              boxShadow: 3,
                              bgcolor: (theme) => theme.palette.primary.main,
                              color: (theme) => theme.palette.primary.contrastText,
                              '&:hover': {
                                bgcolor: (theme) => theme.palette.primary.dark,
                              }
                            }}
                          >
                            <ArrowForwardIcon/>
                          </Button>
                          <Viewer
                            fileUrl={buildMediaCandidates(currentLesson.video.pdf_file)[0] || ''}
                            defaultScale={SpecialZoomLevel.PageFit}
                            theme={theme.palette.mode}
                            onDocumentLoad={handlePdfDocumentLoad}
                            onPageChange={handlePdfPageChange}
                          />
                        </Worker>
                      </Box>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Box 
                  sx={{ 
                    width: '100%', 
                    maxWidth: 900, 
                    mx: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    sx={{ 
                      width: '100%', 
                      textAlign: 'left', 
                      mb: 2,
                      fontSize: '1.25rem',
                      fontWeight: 700
                    }}
                  >
                    {currentLesson.video.title}
                  </Typography>
                  
                  <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                      Media File Not Available
                    </Typography>
                    <Typography variant="body2">
                      This lesson does not have a video or PDF file uploaded yet. Please contact your instructor or check back later.
                    </Typography>
                  </Alert>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      width: '100%', 
                      textAlign: 'left', 
                      mt: 2
                    }}
                  >
                    {currentLesson.video.description}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {(currentLesson?.type === 'quiz' || currentLesson?.type === 'final_quiz') && currentLesson.quizId && (
            quizCheckLoading
              ? <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh"><CircularProgress /></Box>
              : <QuizViewer
                  quizId={currentLesson.quizId}
                  quizData={quizData}
                  onQuizPassed={handleQuizPassed}
                  onSpecialRedirect={handleSpecialRedirect}
                  lessonIndex={lessonIndex}
                  lessonList={lessonList}
                  courseId={courseId}
                  navigate={navigate}
                  isFinalQuiz={currentLesson?.type === 'final_quiz'}
                />
          )}

          {currentLesson?.type === 'final_screen' && (
            <FinalScreen course={course} />
          )}
        </Box>
      </Box>
    </>
  );
};

export default LessonPage;
