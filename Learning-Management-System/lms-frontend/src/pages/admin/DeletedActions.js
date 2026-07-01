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
  Button
} from '@mui/material';
import {
  Info as ViewIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const DeletedActions = () => {
  const { user } = useAuth();
  const [deletedActions, setDeletedActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoRequest, setUndoRequest] = useState(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [permanentDeleteRequest, setPermanentDeleteRequest] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const fetchDeletedActions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/requests/deleted-actions/');
      setDeletedActions(response.data);
    } catch (error) {
      console.error('Error fetching deleted actions:', error);
      showSnackbar('Failed to fetch deleted actions', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type === 'ADMIN') {
      fetchDeletedActions();
    }
  }, [user, fetchDeletedActions]);

  const handleUndoRequest = async () => {
    try {
      await api.put(`/requests/${undoRequest.object_id}/undo/`);
      showSnackbar('Object restored successfully', 'success');
      setUndoDialogOpen(false);
      setUndoRequest(null);
      fetchDeletedActions();
    } catch (error) {
      console.error('Error undoing request:', error);
      showSnackbar('Failed to restore object', 'error');
    }
  };

  const handleUndoClick = (request) => {
    setUndoRequest(request);
    setUndoDialogOpen(true);
  };

  const handlePermanentDelete = async () => {
    try {
      await api.delete(`/requests/${permanentDeleteRequest.object_id}/permanent-delete/`);
      showSnackbar('Object permanently deleted successfully', 'success');
      setPermanentDeleteDialogOpen(false);
      setPermanentDeleteRequest(null);
      fetchDeletedActions();
    } catch (error) {
      console.error('Error permanently deleting object:', error);
      const errorMessage = error.response?.data?.error || 'Failed to permanently delete object';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handlePermanentDeleteClick = (request) => {
    setPermanentDeleteRequest(request);
    setPermanentDeleteDialogOpen(true);
  };

  const handlePermanentDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${user.title}"? This action cannot be undone!`)) {
      try {
        await api.delete(`/users/${user.object_id}/permanent-delete/`);
        showSnackbar('User permanently deleted successfully', 'success');
        fetchDeletedActions();
      } catch (error) {
        console.error('Error permanently deleting user:', error);
        showSnackbar('Failed to permanently delete user', 'error');
      }
    }
  };

  const handlePermanentDeleteCourse = async (course) => {
    if (window.confirm(`Are you sure you want to permanently delete course "${course.title}"? This action cannot be undone!`)) {
      try {
        await api.delete(`/courses/${course.object_id}/permanent-delete/`);
        showSnackbar('Course permanently deleted successfully', 'success');
        fetchDeletedActions();
      } catch (error) {
        console.error('Error permanently deleting course:', error);
        showSnackbar('Failed to permanently delete course', 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'UNDONE': return 'info';
      default: return 'default';
    }
  };

  const columns = [
    {
      field: 'type',
      headerName: 'Action Type',
      flex: 1,
      renderCell: (params) => {
        const type = params.value;
        let label = type;
        let color = 'primary';
        
        if (type === 'USER') {
          label = 'User';
          color = 'error';
        } else if (type === 'COURSE') {
          label = 'Course';
          color = 'warning';
        } else if (type === 'REQUEST') {
          label = params.row.request_type?.replace('DELETE_', '') || 'Request';
          color = 'info';
        }
        
        return (
          <Chip 
            label={label} 
            color={color} 
            size="small" 
          />
        );
      }
    },
    {
      field: 'title',
      headerName: 'Object',
      flex: 1
    },
    {
      field: 'requested_by',
      headerName: 'Requested By',
      flex: 1,
      renderCell: (params) => {
        if (params.row.type === 'USER') {
          return params.row.username || 'N/A';
        } else if (params.row.type === 'COURSE') {
          return params.row.created_by || 'N/A';
        } else {
          return params.value || 'N/A';
        }
      }
    },
    {
      field: 'resolved_by',
      headerName: 'Approved By',
      flex: 1,
      renderCell: (params) => {
        if (params.row.type === 'USER' || params.row.type === 'COURSE') {
          return 'Admin';
        } else {
          return params.value || 'N/A';
        }
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => {
        if (params.row.type === 'USER' || params.row.type === 'COURSE') {
          return (
            <Chip 
              label="SOFT DELETED" 
              color="warning" 
              size="small" 
            />
          );
        } else {
          return (
            <Chip 
              label={params.value} 
              color={getStatusColor(params.value)} 
              size="small" 
            />
          );
        }
      }
    },
    {
      field: 'deleted_at',
      headerName: 'Deleted On',
      flex: 1,
      renderCell: (params) => {
        const date = params.value || params.row.resolved_at || params.row.created_at;
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box>
          {params.row.type === 'USER' && (
            <Tooltip title="Permanently Delete User">
              <IconButton
                onClick={() => handlePermanentDeleteUser(params.row)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          {params.row.type === 'COURSE' && (
            <Tooltip title="Permanently Delete Course">
              <IconButton
                onClick={() => handlePermanentDeleteCourse(params.row)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          {params.row.type === 'REQUEST' && params.row.status === 'APPROVED' && (
            <>
              <Tooltip title="Restore Object">
                <IconButton
                  onClick={() => handleUndoClick(params.row)}
                  color="primary"
                >
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Permanently Delete">
                <IconButton
                  onClick={() => handlePermanentDeleteClick(params.row)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="View Details">
            <IconButton
              onClick={() => {
                setSelectedAction(params.row);
                setViewDialogOpen(true);
              }}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  if (user?.user_type !== 'ADMIN') {
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
        Approved Actions History
      </Typography>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={deletedActions}
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

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            Approved Action Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAction && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                {selectedAction.type === 'USER' ? 'User' : 
                 selectedAction.type === 'COURSE' ? 'Course' : 
                 selectedAction.request_type?.replace('DELETE_', '') || 'Object'} Details
              </Typography>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Object:</strong> {selectedAction.title}
                </Typography>
                {selectedAction.type === 'USER' && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      <strong>Username:</strong> {selectedAction.username}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Email:</strong> {selectedAction.email}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>User Type:</strong> {selectedAction.user_type}
                    </Typography>
                  </>
                )}
                {selectedAction.type === 'COURSE' && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      <strong>Description:</strong> {selectedAction.description || 'No description'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Created By:</strong> {selectedAction.created_by}
                    </Typography>
                  </>
                )}
                {selectedAction.type === 'REQUEST' && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      <strong>Requested By:</strong> {selectedAction.requested_by}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Approved By:</strong> {selectedAction.resolved_by}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Requested On:</strong> {new Date(selectedAction.created_at).toLocaleString()}
                    </Typography>
                  </>
                )}
                <Typography variant="body1" gutterBottom>
                  <strong>Status:</strong> 
                  <Chip 
                    label={selectedAction.type === 'USER' || selectedAction.type === 'COURSE' ? 'SOFT DELETED' : selectedAction.status} 
                    color={selectedAction.type === 'USER' || selectedAction.type === 'COURSE' ? 'warning' : getStatusColor(selectedAction.status)} 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Deleted On:</strong> {
                    selectedAction.deleted_at ? new Date(selectedAction.deleted_at).toLocaleString() :
                    selectedAction.resolved_at ? new Date(selectedAction.resolved_at).toLocaleString() : 'N/A'
                  }
                </Typography>
              </Box>

              {selectedAction.type === 'REQUEST' && selectedAction.message && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Staff Message
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
                    {selectedAction.message}
                  </Typography>
                </Box>
              )}

              {selectedAction.type === 'REQUEST' && selectedAction.admin_message && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Admin Response
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'green.50', borderRadius: 1 }}>
                    {selectedAction.admin_message}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Undo Confirmation Dialog */}
      <Dialog 
        open={undoDialogOpen} 
        onClose={() => setUndoDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Confirm Restore
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to restore this {undoRequest?.request_type?.replace('DELETE_', '').toLowerCase()}?
          </Typography>
          {undoRequest && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Request Type:</strong> {undoRequest.request_type.replace('DELETE_', '')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Object:</strong> {undoRequest.object_title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Requested By:</strong> {undoRequest.requested_by}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {undoRequest.status}
              </Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Note:</strong> This will make the {undoRequest?.request_type?.replace('DELETE_', '').toLowerCase()} visible again to users.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUndoRequest} 
            variant="contained"
            color="primary"
          >
            Yes, Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog 
        open={permanentDeleteDialogOpen} 
        onClose={() => setPermanentDeleteDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Confirm Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to <strong>permanently delete</strong> this {permanentDeleteRequest?.request_type?.replace('DELETE_', '').toLowerCase()}?
          </Typography>
          {permanentDeleteRequest && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Request Type:</strong> {permanentDeleteRequest.request_type.replace('DELETE_', '')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Object:</strong> {permanentDeleteRequest.object_title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Requested By:</strong> {permanentDeleteRequest.requested_by}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {permanentDeleteRequest.status}
              </Typography>
            </Box>
          )}
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>Warning:</strong> This action will <strong>permanently delete</strong> the {permanentDeleteRequest?.request_type?.replace('DELETE_', '').toLowerCase()} from the database. This action cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePermanentDelete} 
            variant="contained"
            color="error"
          >
            Yes, Permanently Delete
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

export default DeletedActions; 
