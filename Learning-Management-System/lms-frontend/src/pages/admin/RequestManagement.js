import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as ExportIcon,
  Add as AddIcon,
  Description as DocumentIcon,
  Schedule as ClockIcon,
  CheckCircle as CheckIcon,
  Cancel as XCircleIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const INDIGO = '#312E81';

// ---- Helper: build the page-number list with ellipses, e.g. 1 2 3 4 5 ... 13
const buildPageNumbers = (current, total) => {
  const pages = [];
  const windowSize = 1; // pages shown around current

  const add = (p) => pages.push(p);

  add(1);
  if (current - windowSize > 2) add('...');
  for (let p = Math.max(2, current - windowSize); p <= Math.min(total - 1, current + windowSize); p++) {
    add(p);
  }
  if (current + windowSize < total - 1) add('...');
  if (total > 1) add(total);

  return pages;
};

const RequestManagement = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [action, setAction] = useState('');
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '', 'today', 'week', 'month'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [newRequestDialogOpen, setNewRequestDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: '',
    object_title: '',
    object_id: '',
    requested_by: user?.full_name || user?.username || '',
    message: ''
  });

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/requests/list/');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showSnackbar('Failed to fetch requests', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type === 'ADMIN') {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleResolveRequest = async () => {
    try {
      await api.put(`/requests/${selectedRequest.id}/resolve/`, {
        action: action,
        message: adminMessage
      });

      showSnackbar(`Request ${action}d successfully`, 'success');
      setResolveDialogOpen(false);
      setConfirmationDialogOpen(false);
      setSelectedRequest(null);
      setAdminMessage('');
      setAction('');
      fetchRequests();
    } catch (error) {
      console.error('Error resolving request:', error);
      showSnackbar('Failed to resolve request', 'error');
    }
  };

  const handleConfirmAction = () => {
    if (selectedRequest?.status !== 'PENDING') {
      showSnackbar('Only pending requests can be resolved', 'error');
      return;
    }
    setResolveDialogOpen(false);
    setConfirmationDialogOpen(true);
  };

  const handleCancelConfirmation = () => {
    setConfirmationDialogOpen(false);
    setResolveDialogOpen(true);
    setAction('');
  };

  const handleCloseResolveDialog = () => {
    setResolveDialogOpen(false);
    setSelectedRequest(null);
    setAdminMessage('');
    setAction('');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ---- Chip styling: soft background + matching text color, not solid fill
  const getRequestTypeStyle = (type) => {
    if (!type) return { bg: '#EEF2FF', color: INDIGO };
    if (type.startsWith('DELETE_')) return { bg: '#FEE2E2', color: '#DC2626' };
    if (type === 'COURSE_ENROLLMENT') return { bg: '#DBEAFE', color: '#1D4ED8' };
    if (type.includes('STUDENT')) return { bg: '#E0E7FF', color: INDIGO };
    if (type.includes('COURSE')) return { bg: '#E0E7FF', color: INDIGO };
    if (type.includes('CERTIFICATE')) return { bg: '#E0E7FF', color: INDIGO };
    return { bg: '#E0E7FF', color: INDIGO };
  };

  const getStatusColor = (status) => {
    if (status === 'PENDING') return '#F59E0B';
    if (status === 'APPROVED') return '#22A06B';
    if (status === 'REJECTED') return '#F44336';
    return '#666';
  };

  const formatRequestType = (type) => {
    if (!type) return '';
    if (type.startsWith('DELETE_')) return type.replace('DELETE_', '');
    if (type === 'COURSE_ENROLLMENT') return 'Course Enrollment';
    return type.replaceAll('_', ' ');
  };

  const StatCard = ({ title, value, icon: IconComponent, color, bg, trend }) => (
    <Paper
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'white',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #eef0f4',
        height: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: bg
          }}
        >
          <IconComponent sx={{ color, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#555', fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111', lineHeight: 1.2 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {trend.direction === 'up' ? (
          <ArrowUpIcon sx={{ fontSize: 14, color: trend.color }} />
        ) : (
          <ArrowDownIcon sx={{ fontSize: 14, color: trend.color }} />
        )}
        <Typography variant="caption" sx={{ color: trend.color, fontWeight: 600 }}>
          {trend.value} this month
        </Typography>
      </Box>
    </Paper>
  );

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const matchesDatePreset = (createdAt, preset) => {
    if (!preset) return true;
    if (!createdAt) return false;

    const created = new Date(createdAt);
    const now = new Date();

    if (preset === 'today') {
      return created.toDateString() === now.toDateString();
    }
    if (preset === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return created >= weekAgo && created <= now;
    }
    if (preset === 'month') {
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const getFilteredRequests = () => {
    return requests.filter(request => {
      const matchesSearch = !searchQuery ||
        request.object_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requested_by?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesType = !requestTypeFilter || request.request_type === requestTypeFilter;
      const matchesDate = matchesDatePreset(request.created_at, dateFilter);

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const paginatedRequests = filteredRequests.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pageNumbers = buildPageNumbers(page + 1, totalPages);

  const handleExport = () => {
    if (filteredRequests.length === 0) {
      showSnackbar('No requests to export', 'warning');
      return;
    }

    const headers = ['Request Type', 'Object', 'Requested By', 'Status', 'Created'];
    const rows = filteredRequests.map(req => [
      formatRequestType(req.request_type),
      req.object_title,
      req.requested_by,
      req.status,
      new Date(req.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'requests_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSnackbar(`Exported ${filteredRequests.length} requests successfully`, 'success');
  };

  const handleOpenNewRequestDialog = () => {
    setNewRequest({
      request_type: '',
      object_title: '',
      object_id: '',
      requested_by: user?.full_name || user?.username || '',
      message: ''
    });
    setNewRequestDialogOpen(true);
  };

  const handleCloseNewRequestDialog = () => {
    setNewRequestDialogOpen(false);
    setNewRequest({
      request_type: '',
      object_title: '',
      object_id: '',
      requested_by: user?.full_name || user?.username || '',
      message: ''
    });
  };

  const handleCreateRequest = async () => {
    if (!newRequest.request_type || !newRequest.object_title) {
      showSnackbar('Please fill in Request Type and Object Title', 'error');
      return;
    }

    try {
      const payload = {
        request_type: newRequest.request_type,
        object_title: newRequest.object_title,
        object_id: newRequest.object_id || '',
        message: newRequest.message || ''
      };

      await api.post('/requests/', payload);

      showSnackbar('Request created successfully', 'success');
      handleCloseNewRequestDialog();
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);

      if (error.response?.data?.error) {
        showSnackbar(error.response.data.error, 'error');
      } else if (error.response?.status === 403) {
        showSnackbar('You do not have permission to create requests', 'error');
      } else {
        showSnackbar(error.message || 'Failed to create request', 'error');
      }
    }
  };

  if (user?.user_type !== 'ADMIN') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Only admin users can access request management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F8F9FC', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Request Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Review and manage all incoming requests
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              sx={{
                textTransform: 'none',
                borderColor: '#ddd',
                color: '#333',
                borderRadius: '8px',
                '&:hover': { borderColor: '#999' }
              }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenNewRequestDialog}
              sx={{
                textTransform: 'none',
                bgcolor: INDIGO,
                borderRadius: '8px',
                '&:hover': { bgcolor: '#23206b' }
              }}
            >
              New Request
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <StatCard
            title="Total Requests"
            value={requests.length}
            icon={DocumentIcon}
            color="#4F46E5"
            bg="#EEF2FF"
            trend={{
              value: '12.5%',
              direction: 'up',
              color: '#22A06B'
            }}
          />
        </Box>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <StatCard
            title="Pending Requests"
            value={requests.filter(r => r.status === 'PENDING').length}
            icon={ClockIcon}
            color="#F59E0B"
            bg="#FEF3E2"
            trend={{
              value: '8.5%',
              direction: 'up',
              color: '#F59E0B'
            }}
          />
        </Box>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <StatCard
            title="Approved Requests"
            value={requests.filter(r => r.status === 'APPROVED').length}
            icon={CheckIcon}
            color="#22A06B"
            bg="#E7F7EF"
            trend={{
              value: '5.7%',
              direction: 'up',
              color: '#22A06B'
            }}
          />
        </Box>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <StatCard
            title="Rejected Requests"
            value={String(requests.filter(r => r.status === 'REJECTED').length).padStart(2, '0')}
            icon={XCircleIcon}
            color="#F44336"
            bg="#FDEBEC"
            trend={{
              value: '2.1%',
              direction: 'down',
              color: '#F44336'
            }}
          />
        </Box>
      </Box>

      {/* Filter Bar — single search + filters row */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input - Left side with flex:1 */}
          <TextField
            placeholder="Search Requests.."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#999' }} />
                </InputAdornment>
              )
            }}
            size="small"
            sx={{
              flex: '1 1 220px',
              minWidth: 200,
              '& .MuiOutlinedInput-root': { borderRadius: '8px' }
            }}
          />

          {/* Filters - Right side, fixed width */}
          <FormControl size="small" sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
            <InputLabel>All Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              label="All Status"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
            <InputLabel>All Request Types</InputLabel>
            <Select
              value={requestTypeFilter}
              onChange={(e) => {
                setRequestTypeFilter(e.target.value);
                setPage(0);
              }}
              label="All Request Types"
            >
              <MenuItem value="">All Request Types</MenuItem>
              <MenuItem value="STUDENT_REGISTRATION">Student Registration</MenuItem>
              <MenuItem value="COURSE">Course</MenuItem>
              <MenuItem value="COURSE_ENROLLMENT">Course Enrollment</MenuItem>
              <MenuItem value="CERTIFICATE">Certificate</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
            <InputLabel>All Dates</InputLabel>
            <Select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(0);
              }}
              label="All Dates"
            >
              <MenuItem value="">All Dates</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2 }}>Request Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2 }}>Object</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2 }}>Requested By</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#333', py: 2, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#999' }}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, color: '#999' }}>
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRequests.map((request) => {
                  const typeStyle = getRequestTypeStyle(request.request_type);
                  const statusColor = getStatusColor(request.status);

                  return (
                    <TableRow
                      key={request.id}
                      sx={{
                        borderBottom: '1px solid #e0e0e0',
                        '&:hover': { bgcolor: '#f9f9f9' }
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={formatRequestType(request.request_type)}
                          sx={{
                            bgcolor: typeStyle.bg,
                            color: typeStyle.color,
                            fontWeight: 700,
                            fontSize: 12
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{request.object_title}</TableCell>
                      <TableCell>{request.requested_by}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: statusColor,
                              flexShrink: 0
                            }}
                          />
                          <Typography variant="body2" sx={{ color: statusColor, fontWeight: 700 }}>
                            {request.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAdminMessage('');
                              setAction('');
                              setResolveDialogOpen(true);
                            }}
                            sx={{ color: '#2196F3' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            sx={{ color: 'white', bgcolor: '#F44336', ml: 0.5, '&:hover': { bgcolor: '#d32f2f' } }}
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this request?')) {
                                try {
                                  await api.delete(`/requests/${request.id}/delete/`);
                                  showSnackbar('Request deleted successfully', 'success');
                                  await fetchRequests();
                                } catch (error) {
                                  console.error('Error deleting request:', error);
                                  const errorMsg = error.response?.data?.error || error.message || 'Failed to delete request';
                                  showSnackbar(errorMsg, 'error');
                                }
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Table Footer */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderTop: '1px solid #e0e0e0',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {filteredRequests.length === 0 ? 0 : page * rowsPerPage + 1} to{' '}
            {Math.min((page + 1) * rowsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <Select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
                <MenuItem value={10}>10/page</MenuItem>
                <MenuItem value={25}>25/page</MenuItem>
                <MenuItem value={50}>50/page</MenuItem>
              </Select>
            </FormControl>

            {/* Custom numbered pagination */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                disabled={page === 0}
                onClick={() => handleChangePage(page - 1)}
                sx={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>

              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <Typography key={`ellipsis-${idx}`} sx={{ px: 1, color: '#999' }}>
                    …
                  </Typography>
                ) : (
                  <Box
                    key={p}
                    onClick={() => handleChangePage(p - 1)}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 14,
                      border: p === page + 1 ? 'none' : '1px solid #e0e0e0',
                      bgcolor: p === page + 1 ? INDIGO : 'white',
                      color: p === page + 1 ? 'white' : '#333',
                      '&:hover': {
                        bgcolor: p === page + 1 ? INDIGO : '#f5f5f5'
                      }
                    }}
                  >
                    {p}
                  </Box>
                )
              )}

              <IconButton
                size="small"
                disabled={page >= totalPages - 1}
                onClick={() => handleChangePage(page + 1)}
                sx={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Dialog
        open={resolveDialogOpen}
        onClose={handleCloseResolveDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {action === 'approve' ? 'Approve Request' : action === 'reject' ? 'Reject Request' : 'Request Details'}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Request Type:</strong> {formatRequestType(selectedRequest.request_type)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>{selectedRequest.request_type === 'COURSE_ENROLLMENT' ? 'Course' : 'Object'}:</strong> {selectedRequest.object_title}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>{selectedRequest.request_type === 'COURSE_ENROLLMENT' ? 'Student' : 'Requested By'}:</strong> {selectedRequest.requested_by}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> {selectedRequest.status}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Created:</strong> {new Date(selectedRequest.created_at).toLocaleString()}
              </Typography>
              {selectedRequest.message && (
                <Typography variant="body1" gutterBottom>
                  <strong>Message:</strong> {selectedRequest.message}
                </Typography>
              )}
              {selectedRequest.resolved_by && (
                <Typography variant="body1" gutterBottom>
                  <strong>Resolved By:</strong> {selectedRequest.resolved_by}
                </Typography>
              )}
              {selectedRequest.resolved_at && (
                <Typography variant="body1" gutterBottom>
                  <strong>Resolved At:</strong> {new Date(selectedRequest.resolved_at).toLocaleString()}
                </Typography>
              )}

              {selectedRequest.request_type === 'COURSE_ENROLLMENT' && selectedRequest.status === 'PENDING' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Approving this will enroll the student in the course immediately. Rejecting it will notify the student that their enrollment request was declined.
                </Alert>
              )}

              {selectedRequest.status === 'PENDING' && (action === 'approve' || action === 'reject') && (
                <TextField
                  margin="normal"
                  fullWidth
                  label="Admin Response (Optional)"
                  multiline
                  rows={4}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Add a response message..."
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResolveDialog}>
            Cancel
          </Button>
          {selectedRequest?.status === 'PENDING' && !action && (
            <>
              <Tooltip title="Approve" arrow>
                <IconButton
                  onClick={() => {
                    setAdminMessage('');
                    setAction('approve');
                  }}
                  color="success"
                >
                  <ApproveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject" arrow>
                <IconButton
                  onClick={() => {
                    setAdminMessage('');
                    setAction('reject');
                  }}
                  color="error"
                >
                  <RejectIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          {selectedRequest?.status === 'PENDING' && (action === 'approve' || action === 'reject') && (
            <Button
              onClick={() => {
                setAdminMessage('');
                setAction('');
              }}
              variant="text"
            >
              Back
            </Button>
          )}
          {selectedRequest?.status === 'PENDING' && (action === 'approve' || action === 'reject') && (
            <Button
              onClick={handleConfirmAction}
              variant="contained"
              color={action === 'approve' ? 'success' : 'error'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialogOpen}
        onClose={handleCancelConfirmation}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {action === 'approve' ? 'approve' : 'reject'} this request?
          </Typography>
          {selectedRequest && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Request Type:</strong> {formatRequestType(selectedRequest.request_type)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{selectedRequest.request_type === 'COURSE_ENROLLMENT' ? 'Course' : 'Object'}:</strong> {selectedRequest.object_title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>{selectedRequest.request_type === 'COURSE_ENROLLMENT' ? 'Student' : 'Requested By'}:</strong> {selectedRequest.requested_by}
              </Typography>
              {adminMessage && (
                <Typography variant="body2" gutterBottom>
                  <strong>Your Response:</strong> {adminMessage}
                </Typography>
              )}
            </Box>
          )}
          {action === 'approve' && selectedRequest?.request_type?.startsWith('DELETE_') && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Warning:</strong> This action will get hide from the user {selectedRequest?.request_type?.replace('DELETE_', '').toLowerCase()}.
            </Alert>
          )}
          {action === 'approve' && selectedRequest?.request_type === 'COURSE_ENROLLMENT' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The student will be enrolled in "{selectedRequest?.object_title}" and notified right away.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirmation}>
            Cancel
          </Button>
          <Button
            onClick={handleResolveRequest}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
          >
            {action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog
        open={newRequestDialogOpen}
        onClose={handleCloseNewRequestDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Request Type *</InputLabel>
              <Select
                value={newRequest.request_type}
                onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value })}
                label="Request Type *"
              >
                <MenuItem value="">Select Request Type</MenuItem>
                <MenuItem value="STUDENT_REGISTRATION">Student Registration</MenuItem>
                <MenuItem value="COURSE">Course</MenuItem>
                <MenuItem value="COURSE_ENROLLMENT">Course Enrollment</MenuItem>
                <MenuItem value="CERTIFICATE">Certificate</MenuItem>
                <MenuItem value="DELETE_COURSE">Delete Course</MenuItem>
                <MenuItem value="DELETE_VIDEO">Delete Video</MenuItem>
                <MenuItem value="DELETE_QUIZ">Delete Quiz</MenuItem>
                <MenuItem value="DELETE_USER">Delete User</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={newRequest.request_type === 'COURSE_ENROLLMENT' ? 'Course Title *' : 'Object Title *'}
              value={newRequest.object_title}
              onChange={(e) => setNewRequest({ ...newRequest, object_title: e.target.value })}
              placeholder="Enter object title (e.g., Course name, Video title)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label={newRequest.request_type === 'COURSE_ENROLLMENT' ? 'Course ID (Optional)' : 'Object ID (Optional)'}
              value={newRequest.object_id}
              onChange={(e) => setNewRequest({ ...newRequest, object_id: e.target.value })}
              placeholder="Enter object ID if applicable"
              type="number"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Message (Optional)"
              value={newRequest.message}
              onChange={(e) => setNewRequest({ ...newRequest, message: e.target.value })}
              placeholder="Add any additional message or details"
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Requested By"
              value={newRequest.requested_by}
              onChange={(e) => setNewRequest({ ...newRequest, requested_by: e.target.value })}
              placeholder="Requester name"
              disabled
              helperText="Auto-filled with your name"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewRequestDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateRequest}
            variant="contained"
            sx={{ bgcolor: INDIGO, borderRadius: '8px', '&:hover': { bgcolor: '#23206b' } }}
          >
            Create Request
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

export default RequestManagement;