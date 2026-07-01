import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  RadioGroup,
  Radio,
  FormControlLabel,
  MobileStepper,
  useTheme,
} from '@mui/material';
import api from '../api';
import { ThumbUpAlt, ThumbDownAlt } from '@mui/icons-material';
// Remove: import { useNavigate } from 'react-router-dom';

const QuizViewer = ({ quizId, quizData, onQuizPassed, onSpecialRedirect, lessonIndex, courseId, lessonList = [], navigate, isFinalQuiz = false }) => {
  const theme = useTheme();
  const finalQuizStartKey = `final_quiz_started_${quizId}`;
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(
    quizData?.type === 'result'
      ? {
          is_passed: quizData.passed,
          attempted_on: null,
          score: quizData.passed ? 100 : 0,
          reason: quizData.reason || null,
        }
      : null
  );

  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasConfirmedStart, setHasConfirmedStart] = useState(false);

  // Timer state: total quiz time = number_of_questions * 15 seconds
  const [remainingTime, setRemainingTime] = useState(null);
  const timerIntervalRef = useRef(null);
  const quizEndTimeRef = useRef(null);
  const hasTimedOutRef = useRef(false);

  const getNotReadyBackLessonIndex = () => {
    if (!Array.isArray(lessonList) || lessonList.length === 0) return null;

    const currentItem = lessonList[lessonIndex];
    const linkedVideoId = currentItem?.videoId;

    // If this quiz is attached to a specific video, jump back to that exact video lesson.
    if (linkedVideoId) {
      const linkedVideoIdx = lessonList.findIndex(
        (item) => item?.type === 'video' && item?.video?.id === linkedVideoId
      );
      if (linkedVideoIdx >= 0) return linkedVideoIdx;
    }

    // Otherwise, walk backward to the nearest video lesson.
    for (let idx = Math.max(lessonIndex - 1, 0); idx >= 0; idx -= 1) {
      if (lessonList[idx]?.type === 'video') return idx;
    }

    return null;
  };

  const handleNotReadyGoBack = () => {
    const targetLessonIndex = getNotReadyBackLessonIndex();
    if (targetLessonIndex !== null) {
      navigate(`/course/${courseId}/lesson/${targetLessonIndex}`, { state: { courseId } });
      return;
    }

    navigate(`/course/${courseId}`, { state: { courseId } });
  };

  // Remove: const navigate = useNavigate();
  // Remove: const courseId = quizData?.course_id;
  // Remove: const lessonIndex = quizData?.lesson_index;

  useEffect(() => {

    if (quizData?.type === 'result') {
      return;
    }

    const load = async () => {
      try {
        const res = await api.get(`/quizzes/${quizId}/`);
        setQuiz(res.data);
      } catch (err) {
        console.error('Failed to load quiz', err);
        alert('Failed to load quiz. Please refresh or try again.');
      }
    };

    load();
  }, [quizId, quizData]);

  useEffect(() => {
    if (!isFinalQuiz || quizData?.type === 'result' || !quiz) {
      setHasConfirmedStart(true);
      return;
    }

    const alreadyStarted = localStorage.getItem(finalQuizStartKey) === 'true';
    setHasConfirmedStart(alreadyStarted);
  }, [isFinalQuiz, quizData?.type, quiz, finalQuizStartKey]);

  const handleSelect = (questionId, choiceIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceIndex }));
  };

  const handleSubmit = async () => {
    const allAnswered =
      quiz?.questions?.every((q) => answers[q.id] !== undefined) || false;

    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${quizId}/attempt/`, {
        answers,
        timed_out: false,
      });
      setResult(res.data);

      if (res.data.is_passed) {
        onQuizPassed?.();
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        const data = err.response.data;

        if (data.reset_course) {
          if (onSpecialRedirect) {
            onSpecialRedirect({
              type: "RESET_COURSE",
              redirectLessonIndex: data.redirect_lesson_index || 0,
            });
          }
          return;
        }

        if (data.redirect_to_video && data.video_id) {
          if (onSpecialRedirect) {
            onSpecialRedirect({
              type: "REDIRECT_TO_VIDEO",
              videoId: data.video_id,
            });
          }
          return;
        }

        if (data.locked) {
          alert("This quiz is locked until you rewatch the video.");
          return;
        }
      }

      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert("Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = useCallback(async ({ timedOut }) => {
    const allAnswered = quiz?.questions?.every((q) => answers[q.id] !== undefined) || false;

    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${quizId}/attempt/`, {
        answers,
        timed_out: !!timedOut,
      });

      if (timedOut && !allAnswered) {
        // Force fail due to timeout on UI even if backend score passes
        setResult({ ...res.data, is_passed: false, reason: 'TIMEOUT' });
        return;
      }

      setResult(res.data);
      if (res.data.is_passed) {
        onQuizPassed?.();
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        const data = err.response.data;

        if (data.reset_course) {
          if (onSpecialRedirect) {
            onSpecialRedirect({
              type: "RESET_COURSE",
              redirectLessonIndex: data.redirect_lesson_index || 0,
            });
          }
          return;
        }

        if (data.redirect_to_video && data.video_id) {
          if (onSpecialRedirect) {
            onSpecialRedirect({
              type: "REDIRECT_TO_VIDEO",
              videoId: data.video_id,
            });
          }
          return;
        }

        if (data.locked) {
          alert("This quiz is locked until you rewatch the video.");
          return;
        }
      }

      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert("Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, onQuizPassed, onSpecialRedirect, quiz?.questions, quizId]);

  const handleTimeExpired = useCallback(() => {
    // When time expires, auto-submit. If not all answered, enforce fail due to timeout on UI
    if (!quiz || result) return;
    handleAutoSubmit({ timedOut: true });
  }, [handleAutoSubmit, quiz, result]);

  // Initialize and run countdown when quiz data is loaded
  useEffect(() => {
    if (!quiz || result) {
      // Stop any running timer if results are shown or quiz not yet loaded
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // Set total time = number_of_questions * 15 seconds
    const totalSeconds = (quiz?.questions?.length || 0) * 15;
    const endAt = Date.now() + totalSeconds * 1000;
    quizEndTimeRef.current = endAt;
    hasTimedOutRef.current = false;

    setRemainingTime(totalSeconds);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((quizEndTimeRef.current - Date.now()) / 1000));
      setRemainingTime(secondsLeft);
      if (secondsLeft <= 0 && !hasTimedOutRef.current) {
        hasTimedOutRef.current = true;
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        handleTimeExpired();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [handleTimeExpired, quiz, result]);

  const formatTime = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleRetry = () => {
    // Remove quiz from failed list
    const failedQuizzes = JSON.parse(localStorage.getItem('failedQuizzes') || '[]');
    localStorage.setItem(
      'failedQuizzes',
      JSON.stringify(failedQuizzes.filter((id) => id !== quizId))
    );

    setResult(null);
    setAnswers({});
    setStep(0);
  };

  const handleStartFinalQuiz = () => {
    localStorage.setItem(finalQuizStartKey, 'true');
    setHasConfirmedStart(true);
  };

  const handleCancelFinalQuiz = () => {
    if (lessonIndex > 0) {
      navigate(`/course/${courseId}/lesson/${lessonIndex - 1}`, { state: { courseId } });
      return;
    }
    navigate('/my-courses');
  };

   if (!quiz && !result) return <CircularProgress />;

  // Handle "not_ready" state - when quiz prerequisites aren't met
  if (quizData?.type === 'not_ready') {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: {
            xs: 'none',
            md: theme.palette.mode === 'dark' ? 'rgba(41, 40, 40, 0.3)' : 'rgba(216, 215, 215, 0.1)'
          },
          backdropFilter: {
            md: 'blur(2px)'
          },
          py: 6,
        }}
      >
        <Box
          sx={{
            background: theme.palette.background.paper,
            borderRadius: 3,
            boxShadow: 6,
            minWidth: 340,
            maxWidth: 480,
            width: '100%',
            p: { xs: 2, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ mb: 2, textAlign: 'center', color: theme.palette.text.primary }}>
            Start Learning
          </Typography>
          <Box
            sx={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <ThumbUpAlt sx={{ color: '#fff', fontSize: 64 }} />
          </Box>
          <Typography sx={{ color: theme.palette.text.secondary, mb: 2, textAlign: 'center', fontSize: '16px' }}>
            {quizData?.cannot_attempt_reason || 'You need to complete the previous content before attempting this quiz.'}
          </Typography>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNotReadyGoBack}
              sx={{ minWidth: 150 }}
            >
              Go Back
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  if (result) {
    const timedOut = result.reason === 'TIMEOUT';
    // Example values for demonstration; replace with real values if available
    
    const userScore = result.score ?? 0;
    
    const isPassed = result.is_passed;

    return (
      <Box
        sx={{
          minHeight: '70vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: {
            xs: 'none',
            md: theme.palette.mode === 'dark' ? 'rgba(41, 40, 40, 0.3)' : 'rgba(216, 215, 215, 0.1)'
          },
          backdropFilter: {
            md: 'blur(2px)'
          },
          py: 6,
        }}
      >
        <Box
          sx={{
            background: theme.palette.background.paper,
            borderRadius: 3,
            boxShadow: 6,
            minWidth: 340,
            maxWidth: 480,
            width: '100%',
            p: { xs: 2, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} sx={{ mb: 1, textAlign: 'center', color: theme.palette.text.primary }}>
            Quiz Results
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, mb: 2, textAlign: 'center' }}>
            {timedOut ? 'Your quiz ended due to time running out.' : 'Here are your quiz results.'}
          </Typography>
          <Box
            sx={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: isPassed
                ? (theme.palette.mode === 'dark' ? theme.palette.success.dark : '#6fcf97')
                : (theme.palette.mode === 'dark' ? theme.palette.error.dark : '#eb5757'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            {isPassed ? (
              <ThumbUpAlt sx={{ color: '#fff', fontSize: 64 }} />
            ) : (
              <ThumbDownAlt sx={{ color: '#fff', fontSize: 64 }} />
            )}
          </Box>
          <Typography sx={{ color: theme.palette.text.secondary, mb: 2, textAlign: 'center' }}>
            If you didn't pass the quiz, please review your incorrect choices and retake the quiz when you're ready.<br />
            If you passed the quiz, please continue to the next module.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
              mb: 1,
              borderTop: `1px solid ${theme.palette.divider}`,
              borderBottom: `1px solid ${theme.palette.divider}`,
              py: 2,
            }}
          >
            
           
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: theme.palette.text.primary }}>{userScore}%</Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>Your Score</Typography>
            </Box>
            
          </Box>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }}>
            {isPassed ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/course/${courseId}/lesson/${lessonIndex + 1}`, { state: { courseId } })}
                sx={{ minWidth: 120}}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleRetry}
                sx={{ minWidth: 120 }}
              >
                Try Again
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  if (isFinalQuiz && !hasConfirmedStart) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="40vh"
        px={2}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 520,
            borderRadius: 3,
            p: 3,
            border: `1px solid ${theme.palette.divider}`,
            background: theme.palette.background.paper,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 10px 30px rgba(0,0,0,0.35)'
              : '0 10px 30px rgba(16,24,40,0.08)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
            Start Final Quiz
          </Typography>
          <Typography>
            Are you sure you want to start the final quiz now?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            The final quiz is timed and has limited attempts.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={handleCancelFinalQuiz} color="inherit">Cancel</Button>
            <Button onClick={handleStartFinalQuiz} variant="contained">Start Quiz</Button>
          </Box>
        </Box>
      </Box>
    );
  }

  const currentQuestion = quiz?.questions?.[step];

  if (!quiz?.questions?.length || !currentQuestion) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="30vh"
      >
        <Typography color="text.secondary">
          No quiz questions available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Typography variant="h6" gutterBottom color="text.primary">
        {quiz.title}
      </Typography>
      {typeof remainingTime === 'number' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Box
            sx={{
              backgroundColor: remainingTime <= 10 ? (theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.main) : (theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.main),
              color: '#fff',
              px: 2,
              py: 1,
              borderRadius: 1.5,
              fontWeight: 700,
              transition: 'background-color 300ms ease',
            }}
          >
            Time Remaining: {formatTime(remainingTime)}
          </Box>
        </Box>
      )}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 3,
          mt: 2,
          background: theme.palette.background.paper,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="text.primary">
          {step + 1}/{quiz.questions.length}:{' '}
          {currentQuestion.question_text}
        </Typography>
        <RadioGroup
          value={answers[currentQuestion.id] ?? ''}
          onChange={(e) => handleSelect(currentQuestion.id, parseInt(e.target.value))}
        >
          {currentQuestion.choices.map((choice, idx) => (
            <FormControlLabel
              key={idx}
              value={idx}
              control={<Radio />}
              label={<span style={{ color: theme.palette.text.primary }}>{`${String.fromCharCode(97 + idx)}) ${choice.text}`}</span>}
            />
          ))}
        </RadioGroup>
        <Box display="flex" justifyContent="center" mt={4}>
          {step < quiz.questions.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => setStep(step + 1)}
              disabled={answers[currentQuestion.id] === undefined}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={
                submitting || answers[currentQuestion.id] === undefined
              }
            >
              Submit
            </Button>
          )}
        </Box>
      </Box>

      <MobileStepper
        variant="progress"
        steps={quiz.questions.length}
        position="static"
        activeStep={step}
        sx={{ mt: 3, background: 'transparent' }}
        nextButton={null}
        backButton={null}
      />
    </Box>
  );
};

export default QuizViewer;
