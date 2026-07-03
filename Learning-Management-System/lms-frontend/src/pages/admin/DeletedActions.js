// Requires: npm install react-countup
// (all other imports already exist in your project)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CountUp from 'react-countup';
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
  Card,
  Tabs,
  Tab,
  Skeleton,
  Fade,
  Grow,
  Slide,
  Stack
} from '@mui/material';
import {
  Info as ViewIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Undo as UndoIcon,
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarMonthIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Inventory2 as AllRecordsIcon,
  Schedule as RecentIcon,
  Star as RegistrationsIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

// ---------- small helpers ----------

const msToDuration = (ms) => {
  if (!ms || ms < 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}hr ${minutes}m`;
};

const isSameMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const isWithinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d >= cutoff;
};

// ---------- animated stat card ----------

const StatCard = ({ icon, label, value, decimals = 0, suffix = '', prefix = '', formattingFn, trend, trendLabel, color, loading }) => {
  if (loading) {
    return (
      <Card
        variant="outlined"
        sx={{ flex: 1, p: 2.5, borderRadius: 3, minWidth: 200 }}
      >
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="45%" height={40} sx={{ my: 0.5 }} />
        <Skeleton variant="text" width="70%" height={16} />
      </Card>
    );
  }

  return (
    <Grow in timeout={500}>
      <Card
        variant="outlined"
        sx={{
          flex: 1,
          p: 2.5,
          borderRadius: 3,
          minWidth: 200,
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}.50`,
              color: `${color}.main`
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>

        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2, my: 0.5 }}>
          <CountUp
            end={value}
            decimals={decimals}
            duration={1.4}
            prefix={prefix}
            suffix={suffix}
            separator=","
            formattingFn={formattingFn}
          />
        </Typography>

        {trend !== undefined && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {trend >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: trend >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}
            >
              {Math.abs(trend)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trendLabel}
            </Typography>
          </Stack>
        )}
      </Card>
    </Grow>
  );
};

// ---------- skeleton table row (shown while loading, matches column widths) ----------

const SkeletonRow = ({ delay = 0 }) => (
  <Fade in timeout={400} style={{ transitionDelay: `${delay}ms` }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.75,
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Skeleton variant="rounded" width={110} height={24} sx={{ flex: 1 }} />
      <Skeleton variant="text" width="100%" height={20} sx={{ flex: 1 }} />
      <Skeleton variant="text" width="100%" height={20} sx={{ flex: 1 }} />
      <Skeleton variant="text" width="100%" height={20} sx={{ flex: 1 }} />
      <Skeleton variant="rounded" width={90} height={24} sx={{ flex: 1 }} />
      <Skeleton variant="text" width="80%" height={20} sx={{ flex: 1 }} />
      <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
        <Skeleton variant="circular" width={28} height={28} />
        <Skeleton variant="circular" width={28} height={28} />
      </Stack>
    </Box>
  </Fade>
);

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
  const [activeTab, setActiveTab] = useState('all');
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
      // small delay so the skeleton-to-content transition reads as intentional
      // rather than a flash, even on fast connections
      setTimeout(() => setLoading(false), 350);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type === 'ADMIN') {
      fetchDeletedActions();
    }
  }, [user, fetchDeletedActions]);

  // ---------- derived stats ----------

  const stats = useMemo(() => {
    const totalApproved = deletedActions.length;

    const thisMonth = deletedActions.filter((row) =>
      isSameMonth(row.deleted_at || row.resolved_at || row.created_at)
    ).length;

    const last7Days = deletedActions.filter((row) =>
      isWithinDays(row.deleted_at || row.resolved_at || row.created_at, 7)
    ).length;

    const approvalDurations = deletedActions
      .filter((row) => row.type === 'REQUEST' && row.created_at && row.resolved_at)
      .map((row) => new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime())
      .filter((ms) => ms > 0);

    const avgApprovalMs =
      approvalDurations.length > 0
        ? approvalDurations.reduce((a, b) => a + b, 0) / approvalDurations.length
        : 0;

    return {
      totalApproved,
      thisMonth,
      last7Days,
      avgApprovalMinutes: Math.round(avgApprovalMs / 60000)
    };
  }, [deletedActions]);

  // ---------- tab filtering ----------

  const filteredActions = useMemo(() => {
    if (activeTab === 'recent') {
      return deletedActions.filter((row) =>
        isWithinDays(row.deleted_at || row.resolved_at || row.created_at, 7)
      );
    }
    if (activeTab === 'registrations') {
      return deletedActions.filter(
        (row) => row.type === 'USER' || row.request_type === 'DELETE_USER'
      );
    }
    return deletedActions;
  }, [deletedActions, activeTab]);

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
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'UNDONE':
        return 'info';
      default:
        return 'default';
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

        return <Chip label={label} color={color} size="small" sx={{ fontWeight: 600 }} />;
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
          return <Chip label="SOFT DELETED" color="warning" size="small" sx={{ fontWeight: 600 }} />;
        } else {
          return (
            <Chip
              label={params.value}
              color={getStatusColor(params.value)}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          );
        }
      }
    },
    {
      field: 'deleted_at',
      headerName: 'Approved On',
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
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ '& .MuiIconButton-root': { transition: 'transform 0.15s ease' }, '& .MuiIconButton-root:hover': { transform: 'scale(1.15)' } }}>
          {params.row.type === 'USER' && (
            <Tooltip title="Permanently Delete User">
              <IconButton onClick={() => handlePermanentDeleteUser(params.row)} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          {params.row.type === 'COURSE' && (
            <Tooltip title="Permanently Delete Course">
              <IconButton onClick={() => handlePermanentDeleteCourse(params.row)} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          {params.row.type === 'REQUEST' && params.row.status === 'APPROVED' && (
            <>
              <Tooltip title="Restore Object">
                <IconButton onClick={() => handleUndoClick(params.row)} color="primary">
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Permanently Delete">
                <IconButton onClick={() => handlePermanentDeleteClick(params.row)} color="error">
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
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Box>
    );
  }

  // row stagger animation, keyed to each row's position on the current page
  const rowAnimationSx = {
    '& .MuiDataGrid-row': {
      opacity: 0,
      animation: 'fadeInUp 0.35s ease forwards'
    },
    '@keyframes fadeInUp': {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' }
    },
    ...Object.fromEntries(
      Array.from({ length: 25 }).map((_, i) => [
        `& .MuiDataGrid-row:nth-of-type(${i + 1})`,
        { animationDelay: `${i * 35}ms` }
      ])
    )
  };

  return (
    <Box sx={{ p: 3 }}>
      <Fade in timeout={400}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            Audit Trail
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Approved Action History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track, review, and manage all approved system actions in one place
          </Typography>
        </Box>
      </Fade>

      {/* Animated stat cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <StatCard
          loading={loading}
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          label="Total Approved"
          value={stats.totalApproved}
          color="success"
          trend={12.5}
          trendLabel="vs last 7 days"
        />
        <StatCard
          loading={loading}
          icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
          label="This Month"
          value={stats.thisMonth}
          color="info"
          trend={8.4}
          trendLabel="vs last month"
        />
        <StatCard
          loading={loading}
          icon={<TimerIcon sx={{ fontSize: 16 }} />}
          label="Avg Approval Time"
          value={stats.avgApprovalMinutes}
          color="warning"
          formattingFn={(minutes) => msToDuration(minutes * 60000)}
        />
      </Stack>

      {/* Filter tabs */}
      <Fade in timeout={500}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            mb: 2,
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              mr: 1,
              transition: 'background-color 0.2s ease'
            },
            '& .MuiTabs-indicator': { display: 'none' },
            '& .Mui-selected': { bgcolor: 'primary.main', color: '#fff !important', borderRadius: 2 }
          }}
        >
          <Tab icon={<AllRecordsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="All Records" value="all" />
          <Tab icon={<RecentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Recent" value="recent" />
          <Tab icon={<RegistrationsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Registrations" value="registrations" />
        </Tabs>
      </Fade>

      <Paper sx={{ height: 600, width: '100%', overflow: 'hidden', borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', gap: 2, px: 2, py: 2, bgcolor: '#f5f5f5' }}>
              {['Action Type', 'Object', 'Requested By', 'Approved By', 'Status', 'Approved On', 'Actions'].map(
                (h) => (
                  <Typography key={h} variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'text.secondary' }}>
                    {h}
                  </Typography>
                )
              )}
            </Box>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} delay={i * 60} />
            ))}
          </Box>
        ) : (
          <Fade in timeout={400}>
            <Box sx={{ height: '100%' }}>
              <DataGrid
                rows={filteredActions}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
                disableSelectionOnClick
                getRowId={(row) => row.id}
                disableColumnMenu
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #e0e0e0'
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #e0e0e0'
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'action.hover'
                  },
                  ...rowAnimationSx
                }}
              />
            </Box>
          </Fade>
        )}
      </Paper>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Grow}
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
                {selectedAction.type === 'USER'
                  ? 'User'
                  : selectedAction.type === 'COURSE'
                  ? 'Course'
                  : selectedAction.request_type?.replace('DELETE_', '') || 'Object'}{' '}
                Details
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
                    label={
                      selectedAction.type === 'USER' || selectedAction.type === 'COURSE'
                        ? 'SOFT DELETED'
                        : selectedAction.status
                    }
                    color={
                      selectedAction.type === 'USER' || selectedAction.type === 'COURSE'
                        ? 'warning'
                        : getStatusColor(selectedAction.status)
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Approved On:</strong>{' '}
                  {selectedAction.deleted_at
                    ? new Date(selectedAction.deleted_at).toLocaleString()
                    : selectedAction.resolved_at
                    ? new Date(selectedAction.resolved_at).toLocaleString()
                    : 'N/A'}
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
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Undo Confirmation Dialog */}
      <Dialog open={undoDialogOpen} onClose={() => setUndoDialogOpen(false)} maxWidth="sm" fullWidth TransitionComponent={Grow}>
        <DialogTitle>Confirm Restore</DialogTitle>
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
            <strong>Note:</strong> This will make the {undoRequest?.request_type?.replace('DELETE_', '').toLowerCase()} visible
            again to users.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUndoRequest} variant="contained" color="primary">
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
        TransitionComponent={Grow}
      >
        <DialogTitle>Confirm Permanent Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to <strong>permanently delete</strong> this{' '}
            {permanentDeleteRequest?.request_type?.replace('DELETE_', '').toLowerCase()}?
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
            <strong>Warning:</strong> This action will <strong>permanently delete</strong> the{' '}
            {permanentDeleteRequest?.request_type?.replace('DELETE_', '').toLowerCase()} from the database. This action
            cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePermanentDelete} variant="contained" color="error">
            Yes, Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeletedActions;