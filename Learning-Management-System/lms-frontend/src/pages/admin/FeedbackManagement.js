import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Rating,
  Divider
} from '@mui/material';
import {
  Info as ViewIcon,
  CheckCircle as ReadIcon,
  Feedback as FeedbackIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const FeedbackManagement = () => {
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/feedback/');
      setFeedbackList(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      showSnackbar('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type === 'ADMIN' || user?.user_type === 'STAFF') {
      fetchFeedback();
    }
  }, [user, fetchFeedback]);

  const handleMarkAsRead = async (feedbackId) => {
    try {
      await api.put(`/feedback/${feedbackId}/mark-read/`);
      setFeedbackList(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, is_read: true }
            : feedback
        )
      );
      showSnackbar('Feedback marked as read', 'success');
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      showSnackbar('Failed to mark feedback as read', 'error');
    }
  };

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setViewDialogOpen(true);
    
    // Mark as read if not already read
    if (!feedback.is_read) {
      handleMarkAsRead(feedback.id);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'success';
    if (rating >= 3) return 'warning';
    return 'error';
  };

  const columns = [
    {
      field: 'user_profile_picture',
      headerName: 'Student',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={params.value || undefined}
            imgProps={{ referrerPolicy: 'no-referrer' }}
            sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
          >
            {params.row.user_username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="body2" noWrap>
            {params.row.user_username}
          </Typography>
        </Box>
      )
    },
    {
      field: 'course_title',
      headerName: 'Course',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={params.value}
            readOnly
            size="small"
            sx={{ '& .MuiRating-iconFilled': { color: getRatingColor(params.value) } }}
          />
          <Typography variant="body2" color="text.secondary">
            {params.value}/5
          </Typography>
        </Box>
      )
    },
    {
      field: 'message',
      headerName: 'Feedback',
      flex: 2,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value.length > 100 ? `${params.value.substring(0, 100)}...` : params.value}
        </Typography>
      )
    },
    {
      field: 'created_at',
      headerName: 'Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      )
    },
    {
      field: 'is_read',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Read' : 'New'} 
          color={params.value ? 'default' : 'primary'} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton
              onClick={() => handleViewFeedback(params.row)}
              color="base content"
              size="small"
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          {!params.row.is_read && (
            <Tooltip title="Mark as Read">
              <IconButton
                onClick={() => handleMarkAsRead(params.row.id)}
                color="success"
                size="small"
              >
                <ReadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  if (user?.user_type !== 'ADMIN' && user?.user_type !== 'STAFF') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Student Feedback
      </Typography>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={feedbackList}
          columns={columns}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          disableSelectionOnClick
          getRowId={(row) => row.id}
          disableColumnMenu
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
          }}
        />
      </Paper>

      {/* View Feedback Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FeedbackIcon color="primary" />
            Feedback Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ mt: 2 }}>
              {/* Student Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  src={selectedFeedback.user_profile_picture || undefined}
                  imgProps={{ referrerPolicy: 'no-referrer' }}
                  sx={{ width: 64, height: 64, fontSize: '1.5rem' }}
                >
                  {selectedFeedback.user_username?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedFeedback.user_username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Course: {selectedFeedback.course_title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submitted: {new Date(selectedFeedback.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Rating */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Rating
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating
                    value={selectedFeedback.rating}
                    readOnly
                    size="large"
                    sx={{ '& .MuiRating-iconFilled': { color: getRatingColor(selectedFeedback.rating) } }}
                  />
                  <Typography variant="body1" color="text.secondary">
                    {selectedFeedback.rating} out of 5 stars
                  </Typography>
                </Box>
              </Box>

              {/* Feedback Message */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Feedback Message
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedFeedback.message}
                  </Typography>
                </Paper>
              </Box>

              {/* Status */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Status: 
                  <Chip 
                    label={selectedFeedback.is_read ? 'Read' : 'New'} 
                    color={selectedFeedback.is_read ? 'default' : 'primary'} 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackManagement; 
