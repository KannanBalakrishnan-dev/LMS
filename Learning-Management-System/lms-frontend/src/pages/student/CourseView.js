import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  LinearProgress,
  IconButton, // <-- Add this import
} from '@mui/material';
import {
  PlayCircle as PlayIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  Quiz as QuizIcon,
  Block as BlockIcon,
  WorkspacePremium as CertificateIcon,
  ArrowBack as ArrowBackIcon // <-- Add this import
} from '@mui/icons-material';
import api from '../../api';
import { courseService } from '../../api/courses';
import { useCourseProgress } from '../../contexts/CourseProgressContext';
import Grow from '@mui/material/Grow';

// Minimal certificate badge icon matching the provided image silhouette
const DownloadCertificateIcon = ({ size = 20 }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Frame */}
      <rect x="6" y="10" width="44" height="32" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="10" y="14" width="36" height="24" rx="1" ry="1" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Text lines */}
      <rect x="14" y="18" width="22" height="3" fill="currentColor" />
      <rect x="14" y="25" width="16" height="3" fill="currentColor" />
      <rect x="14" y="32" width="26" height="3" fill="currentColor" />
      {/* Badge (rosette + ribbon) */}
      <circle cx="54" cy="30" r="6" fill="currentColor" />
      <path d="M52 36 L54 41 L56 36 L54 35 Z" fill="currentColor" />
    </svg>
  </Box>
);

const CourseView = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [effectiveProgressPercent, setEffectiveProgressPercent] = useState(0);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(null);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const playerRef = useRef(null);
  const quizDialogContentRef = useRef(null);
  const [maxSeekPerVideo, setMaxSeekPerVideo] = useState({});
  const lastPostedDuration = useRef({});
  const [isBlocked, setIsBlocked] = useState(false);
  const { setCourseProgress } = useCourseProgress();
  const location = useLocation();
  const initialProgress = location.state?.courseProgress ?? 0;
  const navigate = useNavigate();
  const [animatedProgress, setAnimatedProgress] = useState(0);
//  const [course, setCourse] = useState(null);

  const clampPercent = useCallback((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  }, []);

  const computeLocalProgressPercent = useCallback((courseData, progressData) => {
    const videos = courseData?.videos || [];
    const hasFinalQuiz = Boolean(courseData?.final_quiz);
    const totalItems = videos.length + (hasFinalQuiz ? 1 : 0);
    if (totalItems <= 0) return 0;

    const videoProgress = progressData?.video_progress || {};
    const completedVideos = videos.reduce((count, video) => {
      const vp = videoProgress?.[video.id];
      const isComplete = vp?.watched && (!vp?.has_quiz || vp?.quiz_completed);
      return count + (isComplete ? 1 : 0);
    }, 0);

    const completedFinal = progressData?.final_quiz_passed ? 1 : 0;
    return clampPercent(((completedVideos + completedFinal) / totalItems) * 100);
  }, [clampPercent]);

  const isTrulyFreshEnrollment = useCallback((courseData, progressData) => {
    const videos = courseData?.videos || [];
    const vpMap = progressData?.video_progress;

    if (!videos.length) return true;
    if (!vpMap || Object.keys(vpMap).length === 0) return true;
    if (progressData?.final_quiz_passed) return false;

    return !Object.values(vpMap).some((vp) => {
      if (!vp) return false;
      if (vp.watched) return true;
      if (vp.quiz_completed) return true;
      return (vp.watched_duration || 0) > 0;
    });
  }, []);

  const getEffectiveProgressPercent = useCallback((courseData, progressData) => {
    const serverRaw =
      typeof progressData?.overall_progress === 'number'
        ? progressData.overall_progress
        : typeof progressData?.progress_percent === 'number'
          ? progressData.progress_percent
          : null;

    const serverPercent = serverRaw === null ? null : clampPercent(serverRaw);
    const localPercent = computeLocalProgressPercent(courseData, progressData);

    if (progressData?.enrollment_status === 'COMPLETED') return 100;
    if (serverPercent === null) return localPercent;

    if (serverPercent === 100 && isTrulyFreshEnrollment(courseData, progressData)) {
      return 0;
    }

    return serverPercent;
  }, [clampPercent, computeLocalProgressPercent, isTrulyFreshEnrollment]);


  const getMaxSeek = useCallback(
    (videoId) => {
      const serverDuration = progress?.video_progress?.[videoId]?.watched_duration || 0;
      const localMax = maxSeekPerVideo[videoId] || 0;
      return Math.max(serverDuration, localMax);
    },
    [maxSeekPerVideo, progress]
  );

  const getTotalQuizCount = useCallback(() => {
    if (!course?.videos) return 0;
    const videoQuizzes = course.videos.filter((v) => v.has_quiz).length;
    const finalQuiz = course.final_quiz ? 1 : 0;
    return videoQuizzes + finalQuiz;
  }, [course]);

  const getPassedQuizCount = useCallback(() => {
    if (!progress?.video_progress) return 0;
    const passedVideos = Object.values(progress.video_progress).filter(
      (v) => v.has_quiz && v.quiz_completed
    ).length;
    const finalPassed = progress.final_quiz_passed ? 1 : 0;
    return passedVideos + finalPassed;
  }, [progress]);

  const canTakeFinalQuiz = useCallback(() => {
    if (!course?.videos || !progress?.video_progress) return false;
    return course.videos.every((video) => {
      const vp = progress.video_progress?.[video.id];
      return vp?.watched && (!vp?.has_quiz || vp?.quiz_completed);
    });
  }, [course, progress]);

  const fetchCourseData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, progressRes] = await Promise.all([
        api.get(`/courses/${id}/`),
        api.get(`/courses/${id}/detailed_progress/`),
      ]);

      let courseData = courseRes.data;

      // Some backends don't embed videos in /courses/:id/. Fall back to /courses/:id/videos/ so students can learn.
      let videos = Array.isArray(courseData?.videos) ? courseData.videos : null;
      if (!videos || videos.length === 0) {
        try {
          const videosRes = await api.get(`/courses/${id}/videos/`);
          if (Array.isArray(videosRes.data)) {
            videos = [...videosRes.data].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
          }
        } catch (e) {
          // Keep going; course may legitimately have no videos yet.
        }
      }

      if (videos) {
        courseData = { ...courseData, videos };
      }

      setCourse(courseData);
      setProgress(progressRes.data);
      console.log('Fetched progressRes.data:', progressRes.data);

      const effective = getEffectiveProgressPercent(courseData, progressRes.data);
      setEffectiveProgressPercent(effective);
      setCourseProgress(effective);

      if (progressRes.data.enrollment_status === 'BLOCKED') {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }

      if (courseData.videos) {
        const tempMaxSeek = {};
        courseData.videos.forEach((video) => {
          const watched = progressRes.data?.video_progress?.[video.id]?.watched_duration || 0;
          tempMaxSeek[video.id] = watched;
        });
        setMaxSeekPerVideo(tempMaxSeek);
      }
    } catch (error) {
      console.error('Error Fetching course data:', error);
    } finally {
      setLoading(false);
    }
  }, [getEffectiveProgressPercent, id, setCourseProgress]);


  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Set initial progress from navigation state
  useEffect(() => {
    const initial = clampPercent(initialProgress);
    if (initial > 0 && initial < 100) {
      setCourseProgress(initial);
    }
    return () => setCourseProgress(0); // Reset on unmount
  }, [clampPercent, initialProgress, setCourseProgress]);

  // Animate progress bar from 0 to current progress
  useEffect(() => {
    let raf;
    if (typeof effectiveProgressPercent === 'number') {
      const end = clampPercent(effectiveProgressPercent);
      const duration = 900; // ms
      const startTime = performance.now();
      const animate = (now) => {
        const elapsed = now - startTime;
        const percent = Math.min(elapsed / duration, 1);
        setAnimatedProgress(Math.round(percent * end));
        if (percent < 1) {
          raf = requestAnimationFrame(animate);
        }
      };
      raf = requestAnimationFrame(animate);
    }
    return () => raf && cancelAnimationFrame(raf);
  }, [clampPercent, effectiveProgressPercent]);

  const postWatchedDuration = useCallback(async (videoId, watched_duration) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      const response = await fetch(
  `${process.env.REACT_APP_BACKEND_URL || 'http://learning-management-system-4i6f.onrender.com'}/api/videos/${videoId}/watch/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            watched_duration: Math.floor(watched_duration),
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error posting watch duration:', error);
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleVideoProgress = useCallback(
    (progressObj) => {
      if (!course?.videos?.[currentVideoIdx]) return;
      const videoId = course.videos[currentVideoIdx].id;
      const played = progressObj.playedSeconds || 0;
      const allowed = getMaxSeek(videoId);

      if (played > allowed + 1.2) {
        if (playerRef.current) {
          playerRef.current.seekTo(allowed, 'seconds');
        }
        return;
      }

      setMaxSeekPerVideo((prev) => {
        const backendWatched = progress?.video_progress?.[videoId]?.watched_duration || 0;
        const prevMax = Math.max(prev[videoId] || 0, backendWatched);
        if (played > prevMax) {
          if (!lastPostedDuration.current[videoId] || played - lastPostedDuration.current[videoId] >= 1) {
            lastPostedDuration.current[videoId] = played;
            postWatchedDuration(videoId, played);
          }
          return { ...prev, [videoId]: played };
        }
        return prev;
      });
    },
    [course, currentVideoIdx, progress, postWatchedDuration, getMaxSeek]
  );

  const downloadGeneratedCertificate = async (courseId) => {
    try {
      const response = await courseService.generateCertificate(courseId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename = 'certificate.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        filename = disposition
          .split('filename=')[1]
          .split(';')[0]
          .replace(/['"]/g, '');
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      let message = 'Unable to download certificate.';
      const errorData = error?.response?.data;
      if (errorData instanceof Blob) {
        try {
          const text = await errorData.text();
          const parsed = JSON.parse(text);
          message = parsed?.error || parsed?.detail || message;
        } catch {
          // Keep generic fallback
        }
      } else {
        message = errorData?.error || errorData?.detail || message;
      }
      alert(message);
    }
  };

    // eslint-disable-next-line no-unused-vars
    const downloadCertificate = async (courseId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(
  `${process.env.REACT_APP_BACKEND_URL || 'http://learning-management-system-4i6f.onrender.com'}/api/courses/${courseId}/download_certificate/`,
        {
            method: 'GET',
            headers: {
            'Authorization': `Bearer ${token}`,
            },
        }
        );

        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/pdf")) {
        const text = await response.text();
        console.error("Certificate download error:", text);
        alert("Unable to download certificate.");
        return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // extract filename
        let filename = 'certificate.pdf';
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
        filename = disposition
            .split('filename=')[1]
            .split(';')[0]
            .replace(/['"]/g, '');
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download error:", error);
        alert("Unable to download certificate.");
    }
    };



  // eslint-disable-next-line no-unused-vars
  const onSeek = (seconds) => {
    if (!course?.videos?.[currentVideoIdx]) return;
    const videoId = course.videos[currentVideoIdx].id;
    const maxAllowed = getMaxSeek(videoId);
    if (seconds > maxAllowed + 0.5) {
      if (playerRef.current) {
        playerRef.current.seekTo(maxAllowed, 'seconds');
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleVideoEnd = async () => {
    if (!course?.videos?.[currentVideoIdx]) return;
    const video = course.videos[currentVideoIdx];
    try {
      const res = await api.post(`/videos/${video.id}/mark_complete/`);
      if (res.data.has_quiz) {
        const canAttempt = await api.get(`/quizzes/${res.data.quiz_id}/can_attempt/`);
        if (canAttempt.data.can_attempt) {
          const quizRes = await api.get(`/quizzes/${res.data.quiz_id}/`);
          setCurrentQuiz({
            ...quizRes.data,
            title: `Quiz for ${video.title}`,
          });
          setShowQuizDialog(true);
        }
      } else {
        await handleVideoCompletion();
      }
    } catch (error) {
      console.error('Error handling video end:', error);
    }
  };

  const handleVideoCompletion = async () => {
    const isLastVideo = currentVideoIdx === course.videos.length - 1;
    const allComplete = canTakeFinalQuiz();

    if (isLastVideo && allComplete && course.final_quiz && !progress.final_quiz_passed) {
      try {
        const canAttempt = await api.get(`/quizzes/${course.final_quiz.id}/can_attempt/`);
        if (canAttempt.data.can_attempt) {
          const quizRes = await api.get(`/quizzes/${course.final_quiz.id}/`);
          setCurrentQuiz({
            ...quizRes.data,
            is_final: true,
          });
          setShowQuizDialog(true);
        }
      } catch (error) {
        console.error('Error launching final quiz:', error);
      }
    } else if (!isLastVideo) {
      setCurrentVideoIdx((prev) => prev + 1);
    }
    await fetchCourseData();
  };

  const handleStartFinalQuiz = async () => {
    if (isBlocked) {
      alert(
        'Access Denied. You have been blocked from this course due to exceeding the maximum quiz attempts.'
      );
      return;
    }
    try {
      const canAttempt = await api.get(`/quizzes/${course.final_quiz.id}/can_attempt/`);
      if (canAttempt.data.can_attempt) {
        const quizRes = await api.get(`/quizzes/${course.final_quiz.id}/`);
        setCurrentQuiz({
          ...quizRes.data,
          is_final: true,
        });
        setShowQuizDialog(true);
      }
    } catch (error) {
      console.error('Error starting final quiz:', error);
    }
  };

  const handleQuizSubmit = async () => {
    if (!currentQuiz) return;
    try {
      const res = await api.post(`/quizzes/${currentQuiz.id}/attempt/`, {
        answers: quizAnswers,
      });
      setQuizResult(res.data);
      if (res.data.is_passed) {
        await fetchCourseData();

        const statusRes = await api.get(`/courses/${course.id}/enrollment_status/`);
        if (statusRes.data.progress === 'BLOCKED') {
          alert('Access Denied: You have been blocked from this course.');
          window.location.reload();
        } else {
          closeQuizDialog();
        }
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data?.error?.includes('blocked')
      ) {
        alert('Access Denied: You have been blocked from this course.');
        window.location.reload();
      } else {
        console.error('Error submitting quiz:', error);
      }
    }
  };

  const closeQuizDialog = () => {
    setShowQuizDialog(false);
    setQuizAnswers({});
    setCurrentQuiz(null);
    setQuizResult(null);
  };

  const handleQuizAnswerChange = (questionId, selectedValue) => {
    const contentEl = quizDialogContentRef.current;
    const prevScrollTop = contentEl ? contentEl.scrollTop : null;

    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: parseInt(selectedValue, 10),
    }));

    if (contentEl && prevScrollTop !== null) {
      requestAnimationFrame(() => {
        contentEl.scrollTop = prevScrollTop;
      });
    }
  };

  const canAccessVideo = useCallback(
    (index) => {
      if (isBlocked) return false;
      if (index === 0) return true;
      const prevVid = course?.videos?.[index - 1];
      const prevProg = progress?.video_progress?.[prevVid?.id];
      return prevProg?.watched && (!prevProg?.has_quiz || prevProg?.quiz_completed);
    },
    [course, progress, isBlocked]
  );

  // eslint-disable-next-line no-unused-vars
  const handleVideoSelect = useCallback(
    (idx) => {
      if (canAccessVideo(idx)) {
        setCurrentVideoIdx(idx);
      }
    },
    [canAccessVideo]
  );

  // Helper to get the lesson index for a given video index (counting only videos)
  const getLessonIndexForVideo = (videoIdx) => {
    // This logic should match how LessonPage builds its lessonList
    // We'll fetch the course and progress data, and reconstruct the lesson list
    if (!course?.videos) return videoIdx;
    const quizzesEnabled = course?.enable_quizzes !== false;
    let lessonIndex = 0;
    for (let i = 0; i < course.videos.length; i++) {
      if (i === videoIdx) return lessonIndex;
      lessonIndex++; // for the video
      if (quizzesEnabled && course.videos[i].has_quiz && course.videos[i].quiz_id) {
        lessonIndex++; // for the quiz after this video
      }
    }
    return lessonIndex;
  };

  const QuizDialog = () => (
    <Dialog open={showQuizDialog} maxWidth="md" fullWidth disableEscapeKeyDown>
      <DialogTitle>
        {currentQuiz?.is_final ? 'Final Course Quiz' : 'Video Quiz'}
      </DialogTitle>
      <DialogContent ref={quizDialogContentRef}>
        {quizResult && (
          <Alert severity={quizResult.is_passed ? 'success' : 'error'} sx={{ mb: 2 }}>
            {quizResult.is_passed
              ? `Congratulations! You passed with ${quizResult.score}%`
              : `You scored ${quizResult.score}%. Required: ${quizResult.passing_score}%`}
          </Alert>
        )}
        {currentQuiz?.questions.map((q, i) => (
          <Box key={q.id} mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              {i + 1}. {q.question_text}
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={quizAnswers[q.id]?.toString() || ''}
                onChange={(e) => handleQuizAnswerChange(q.id, e.target.value)}
              >
                {q.choices.map((choice, idx) => (
                  <FormControlLabel
                    key={idx}
                    value={idx.toString()}
                    control={<Radio />}
                    label={choice.text}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        {!currentQuiz?.is_final && <Button onClick={closeQuizDialog}>Review Video</Button>}
        <Button
          variant="contained"
          onClick={handleQuizSubmit}
          disabled={
            !currentQuiz?.questions ||
            Object.keys(quizAnswers).length !== currentQuiz.questions.length
          }
        >
          Submit Quiz
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading || !course) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // HERO SECTION (matches screenshot)
  // Navigation handler for Continue Learning
  const handleContinue = () => {
    if (!course?.videos || course.videos.length === 0) return;
    const firstAccessibleIndex = course.videos.findIndex((_, idx) => canAccessVideo(idx));
    const nextIndex = firstAccessibleIndex >= 0 ? firstAccessibleIndex : 0;
    const lessonIndex = getLessonIndexForVideo(nextIndex);
    navigate(`/course/${course.id}/lesson/${lessonIndex}`);
  };

  const completedVideosCount = Object.values(progress.video_progress || {}).filter((v) => v.watched).length;
  const totalVideosCount = course?.videos?.length || 0;
  const passedQuizCount = getPassedQuizCount();
  const totalQuizCount = getTotalQuizCount();
  const overallProgress = clampPercent(effectiveProgressPercent);
  const shortDescription = (course?.description || '').slice(0, 130);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #d7e9f7 0%, #dbeaf5 100%)',
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 3fr) minmax(250px, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          <Paper
            sx={{
              position: 'relative',
              borderRadius: '28px',
              p: { xs: 2.5, md: 3.2 },
              background: 'linear-gradient(135deg, #4a4699 0%, #3f438f 100%)',
              color: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                color: 'rgba(255,255,255,0.9)',
                background: 'rgba(255,255,255,0.14)',
                '&:hover': { background: 'rgba(255,255,255,0.24)' },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>

            <Typography sx={{ fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', opacity: 0.9, mb: 1 }}>
              Ongoing Specialization
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.06, mb: 1.2 }}>
              {course?.title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 900, mb: 3, lineHeight: 1.35 }}>
              {shortDescription || 'Continue your learning journey with structured lessons and assessments designed for practical skills.'}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 2.2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 17, color: 'rgba(255,255,255,0.86)', mb: 0.8 }}>Overall Progress</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={animatedProgress}
                    sx={{
                      flex: 1,
                      height: 9,
                      borderRadius: 99,
                      backgroundColor: 'rgba(255,255,255,0.28)',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#9dc2ff' },
                    }}
                  />
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{animatedProgress}%</Typography>
                </Box>
              </Box>

              <Button
                onClick={handleContinue}
                variant="contained"
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'center' },
                  minWidth: 170,
                  py: 1.35,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  color: '#292b70',
                  '&:hover': { backgroundColor: '#eef2ff' },
                }}
              >
                Continue Learning
              </Button>
            </Box>
          </Paper>

          <Paper
            sx={{
              borderRadius: '30px',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.84)',
            }}
          >
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#ffe9ab', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.6 }}>
              <CertificateIcon sx={{ fontSize: 18, color: '#d19000' }} />
            </Box>
            <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, mb: 0.8 }}>
              Course Certificate
            </Typography>
            <Typography sx={{ color: '#4d5672', fontSize: 14, mb: progress?.enrollment_status === 'COMPLETED' ? 1.4 : 0 }}>
              Complete all modules and assignments to earn your verifiable professional certificate.
            </Typography>
            {progress?.enrollment_status === 'COMPLETED' && (
              <Button
                variant="contained"
                startIcon={<DownloadCertificateIcon size={18} />}
                onClick={() => downloadGeneratedCertificate(course.id)}
                sx={{
                  mt: 0.6,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: '#2d3179',
                  '&:hover': { backgroundColor: '#21245f' },
                }}
              >
                Download
              </Button>
            )}
          </Paper>
        </Box>

        {isBlocked && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
            <BlockIcon sx={{ mr: 1 }} /> You have been blocked from this course after exceeding maximum quiz attempts.
          </Alert>
        )}

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '26px', mb: 3.2, backgroundColor: 'rgba(255,255,255,0.76)' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2a44', mb: 2.5 }}>
            Course Content
          </Typography>

          {(progress.final_quiz_passed || overallProgress >= 100) && (
            <Alert severity="success" sx={{ mb: 2.2, borderRadius: 2.2 }}>
              You have completed the course successfully.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
            {(!course.videos || course.videos.length === 0) && (
              <Alert severity="info">
                This course does not have lessons yet.
              </Alert>
            )}

            {course.videos?.map((video, idx) => {
              const videoProgress = progress.video_progress?.[video.id];
              const isLocked = !canAccessVideo(idx);
              const isCompleted = videoProgress?.watched && (!videoProgress?.has_quiz || videoProgress?.quiz_completed);
              const isCurrent = idx === currentVideoIdx;
              const lessonIndex = getLessonIndexForVideo(idx);
              const duration = video?.duration || video?.video_duration || null;

              return (
                <Grow in={true} timeout={250 + idx * 75} key={video.id}>
                  <Paper
                    onClick={() => {
                      if (isLocked) return;
                      navigate(`/course/${id}/lesson/${lessonIndex}`, { state: { courseId: id } });
                    }}
                    sx={{
                      p: { xs: 1.3, md: 1.6 },
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.4,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.45 : 1,
                      transition: 'all 0.22s ease',
                      background: isCurrent ? '#e9f1ff' : '#ffffff',
                      border: isCurrent ? '1px solid #9bb6e8' : '1px solid #e4ebf5',
                      '&:hover': !isLocked
                        ? {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 10px 26px rgba(39,54,96,0.08)',
                            borderColor: '#bfd0eb',
                          }
                        : undefined,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.4,
                          backgroundColor: isCompleted ? '#dff7ec' : isLocked ? '#eceff3' : '#dce8ff',
                          color: isCompleted ? '#1c9e5f' : isLocked ? '#97a1b3' : '#4662b5',
                        }}
                      >
                        {isCompleted ? <CheckIcon fontSize="small" /> : isLocked ? <LockIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, color: '#1f2a44', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {video.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: '#7e89a3' }}>
                          Video {idx + 1}{duration ? `  •  ${duration} mins` : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isCompleted ? (
                        <Box sx={{ px: 1.4, py: 0.45, borderRadius: 999, backgroundColor: '#dce8ff', color: '#2d4d95', fontSize: 10.5, fontWeight: 800 }}>
                          COMPLETED
                        </Box>
                      ) : isLocked ? (
                        <Typography sx={{ fontSize: 11, color: '#9aa5b8' }}>Next Module</Typography>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          sx={{
                            minWidth: 76,
                            borderRadius: 999,
                            textTransform: 'none',
                            fontWeight: 700,
                            backgroundColor: '#2d3179',
                            '&:hover': { backgroundColor: '#20235b' },
                          }}
                        >
                          Resume
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Grow>
              );
            })}
          </Box>

          {course.final_quiz && !progress.final_quiz_passed && canTakeFinalQuiz() && !isBlocked && (
            <Box sx={{ mt: 2.6 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<QuizIcon />}
                onClick={handleStartFinalQuiz}
                sx={{
                  borderRadius: 2,
                  py: 1.15,
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: '#2d3179',
                  '&:hover': { backgroundColor: '#20235b' },
                }}
              >
                Take Final Course Quiz
              </Button>
            </Box>
          )}
        </Paper>

        <Paper sx={{ borderRadius: '26px', p: { xs: 2, md: 3 }, backgroundColor: 'rgba(244,245,249,0.9)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2a44' }}>Your Progress</Typography>
            <Typography sx={{ fontWeight: 800, color: '#2d3179', fontSize: 15 }}>{overallProgress}% Total</Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2.6, boxShadow: 'none', border: '1px solid #e2e7ef' }}>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7f8798', mb: 1 }}>Videos Completed</Typography>
              <Typography sx={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, color: '#1f2a44', mb: 1 }}>{completedVideosCount} / {totalVideosCount}</Typography>
              <LinearProgress
                variant="determinate"
                value={totalVideosCount > 0 ? (completedVideosCount / totalVideosCount) * 100 : 0}
                sx={{ height: 4, borderRadius: 99, backgroundColor: '#d9dce4', '& .MuiLinearProgress-bar': { backgroundColor: '#2d3179' } }}
              />
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 2.6, boxShadow: 'none', border: '1px solid #e2e7ef' }}>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: '#7f8798', mb: 1 }}>Quizzes Passed</Typography>
              <Typography sx={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, color: '#1f2a44', mb: 1 }}>{passedQuizCount} / {totalQuizCount}</Typography>
              <LinearProgress
                variant="determinate"
                value={totalQuizCount > 0 ? (passedQuizCount / totalQuizCount) * 100 : 0}
                sx={{ height: 4, borderRadius: 99, backgroundColor: '#d9dce4', '& .MuiLinearProgress-bar': { backgroundColor: '#2d3179' } }}
              />
            </Paper>
          </Box>
        </Paper>

        <QuizDialog />
      </Box>
    </Box>
  );
};

export default CourseView;
