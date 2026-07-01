import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Rating,
  Chip,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Alert,
  Divider
} from '@mui/material';
import {
  Feedback as FeedbackIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import api from '../../api';

const StudentFeedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/feedback/student/');
      setFeedbackList(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setError('Failed to fetch feedback. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          Student Feedback
        </Typography>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ ml: 2, flexGrow: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          Student Feedback
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      background: (theme) => theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #0a1929 0%, #132f4c 50%, #1e3a5f 100%)'
        : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)',
      minHeight: '100vh'
    }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          <FeedbackIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Student Feedback
        </Typography>
        <Typography variant="body1" color="text.secondary">
          See what other students are saying about their learning experience
        </Typography>
      </Box>

      {feedbackList.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FeedbackIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No feedback available yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Be the first to share your thoughts about a course!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {feedbackList.map((feedback) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={feedback.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  {/* Student Profile Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={feedback.user_profile_picture || undefined}
                      imgProps={{ referrerPolicy: 'no-referrer' }}
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        fontSize: '1.2rem',
                        bgcolor: 'primary.main'
                      }}
                    >
                      {feedback.user_username?.[0]?.toUpperCase() || <PersonIcon />}
                    </Avatar>
                    <Box sx={{ ml: 2, flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {feedback.user_username || 'Anonymous'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {feedback.course_title || 'General Feedback'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Rating */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Rating
                      value={feedback.rating}
                      readOnly
                      size="small"
                      sx={{
                        '& .MuiRating-iconFilled': { color: '#ff9800' },
                        '& .MuiRating-iconEmpty': { color: '#ffe0b2' }
                      }}
                    />
                    <Chip
                      label={`${feedback.rating}/5`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        color: '#ef6c00',
                        borderColor: '#ffcc80',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'transparent' : '#fff'
                      }}
                    />
                  </Box>

                  {/* Feedback Message */}
                  <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                    {feedback.message}
                  </Typography>

                  {/* Timestamp */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(feedback.created_at)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default StudentFeedback;
