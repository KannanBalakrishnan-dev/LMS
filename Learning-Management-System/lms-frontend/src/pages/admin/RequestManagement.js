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
  Grid,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
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
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

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
  const [dateFilter, setDateFilter] = useState('');
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

  const getRequestTypeColor = (type) => {
    if (!type) return '#312E81';
    if (type.includes('STUDENT')) return '#312E81';
    if (type.includes('COURSE')) return '#312E81';
    if (type.includes('CERTIFICATE')) return '#312E81';
    if (type.includes('DELETE')) return '#F44336';
    return '#312E81';
  };

  const formatRequestType = (type) => {
    if (!type) return '';
    if (type.startsWith('DELETE_')) return type.replace('DELETE_', '');
    return type.replaceAll('_', ' ');
  };

  const StatCard = ({ title, value, icon: IconComponent, bgColor, trend, thisMonth }) => (
    <Paper
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e0e0e0',
        height: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <IconComponent sx={{ color: bgColor, fontSize: 32 }} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#555', fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111', lineHeight: 1.2 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: trend.color, fontWeight: 500 }}>
        {trend.text}
      </Typography>
      <Typography variant="caption" sx={{ color: '#888', mt: 0.5 }}>
        This month: <strong>{thisMonth}</strong>
      </Typography>
    </Paper>
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getFilteredRequests = () => {
    return requests.filter(request => {
      const matchesSearch = !searchQuery || 
        request.object_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requested_by?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesType = !requestTypeFilter || request.request_type === requestTypeFilter;
      const matchesDate = !dateFilter || (
        request.created_at &&
        new Date(request.created_at).toISOString().slice(0, 10) === dateFilter
      );
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  };

  const filteredRequests = getFilteredRequests();
  const paginatedRequests = filteredRequests.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

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

      console.log('Creating request with payload:', payload);
      
      await api.post('/requests/', payload);

      showSnackbar('Request created successfully', 'success');
      handleCloseNewRequestDialog();
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      
      // Better error handling
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
      {/* Search Bar - Top */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <TextField
          fullWidth
          placeholder="Search requests by object, user, or type..."
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
            '& .MuiOutlinedInput-root': { borderRadius: '8px' }
          }}
        />
      </Paper>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
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
                bgcolor: '#312E81',
                borderRadius: '8px',
                '&:hover': { bgcolor: '#23206b' }
              }}
            >
              New Request
            </Button>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Requests"
            value={requests.length}
            icon={DocumentIcon}
            bgColor="#2196F3"
            trend={{ text: 'All requests', color: '#4CAF50' }}
            thisMonth={requests.filter(r => {
              const d = new Date(r.created_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Requests"
            value={requests.filter(r => r.status === 'PENDING').length}
            icon={ClockIcon}
            bgColor="#FF9800"
            trend={{ text: 'Awaiting review', color: '#FF9800' }}
            thisMonth={requests.filter(r => {
              const d = new Date(r.created_at);
              const now = new Date();
              return r.status === 'PENDING' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved Requests"
            value={requests.filter(r => r.status === 'APPROVED').length}
            icon={CheckIcon}
            bgColor="#4CAF50"
            trend={{ text: 'Successfully approved', color: '#4CAF50' }}
            thisMonth={requests.filter(r => {
              const d = new Date(r.created_at);
              const now = new Date();
              return r.status === 'APPROVED' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rejected Requests"
            value={requests.filter(r => r.status === 'REJECTED').length}
            icon={XCircleIcon}
            bgColor="#F44336"
            trend={{ text: 'Declined requests', color: '#F44336' }}
            thisMonth={requests.filter(r => {
              const d = new Date(r.created_at);
              const now = new Date();
              return r.status === 'REJECTED' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          />
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'white', borderRadius: 2, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Search Input - Left side with flex:1 */}
          <TextField
            placeholder="Search Requests..."
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
              flex: 1,
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

          <FormControl size="small" sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
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
              <MenuItem value="CERTIFICATE">Certificate</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': { borderRadius: '8px' }
            }}
          />
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
                paginatedRequests.map((request) => (
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
                          bgcolor: getRequestTypeColor(request.request_type),
                          color: 'white',
                          fontWeight: 500
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{request.object_title}</TableCell>
                    <TableCell>{request.requested_by}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor:
                              request.status === 'PENDING'
                                ? '#FF9800'
                                : request.status === 'APPROVED'
                                ? '#4CAF50'
                                : '#F44336'
                          }}
                        />
                        <span>{request.status}</span>
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
                          sx={{ color: '#F44336' }}
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this request?')) {
                              try {
                                console.log('Attempting to delete request:', request.id);
                                await api.delete(`/requests/${request.id}/delete/`);
                                showSnackbar('Request deleted successfully', 'success');
                                await fetchRequests();
                              } catch (error) {
                                console.error('Error deleting request:', error);
                                console.error('Error response:', error.response);
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Table Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Showing {filteredRequests.length === 0 ? 0 : page * rowsPerPage + 1} to{' '}
            {Math.min((page + 1) * rowsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
              >
                <MenuItem value={10}>10/page</MenuItem>
                <MenuItem value={25}>25/page</MenuItem>
                <MenuItem value={50}>50/page</MenuItem>
              </Select>
            </FormControl>
            <TablePagination
              rowsPerPageOptions={[]}
              component="div"
              count={filteredRequests.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  p: 0,
                  minHeight: 'auto'
                }
              }}
            />
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
                <strong>Object:</strong> {selectedRequest.object_title}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Requested By:</strong> {selectedRequest.requested_by}
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
                <strong>Object:</strong> {selectedRequest.object_title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Requested By:</strong> {selectedRequest.requested_by}
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
                <MenuItem value="CERTIFICATE">Certificate</MenuItem>
                <MenuItem value="DELETE_COURSE">Delete Course</MenuItem>
                <MenuItem value="DELETE_VIDEO">Delete Video</MenuItem>
                <MenuItem value="DELETE_QUIZ">Delete Quiz</MenuItem>
                <MenuItem value="DELETE_USER">Delete User</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Object Title *"
              value={newRequest.object_title}
              onChange={(e) => setNewRequest({ ...newRequest, object_title: e.target.value })}
              placeholder="Enter object title (e.g., Course name, Video title)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Object ID (Optional)"
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
            sx={{ bgcolor: '#312E81', borderRadius: '8px', '&:hover': { bgcolor: '#23206b' } }}
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
