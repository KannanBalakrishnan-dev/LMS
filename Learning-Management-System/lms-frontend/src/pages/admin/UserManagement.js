import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
    Card,
    CardContent,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Checkbox,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MarkEmailUnread as MarkEmailUnreadIcon,
    PersonAdd as PersonAddIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext'; // ✅ Added

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTypeTab, setUserTypeTab] = useState('ALL');
    const [openDialog, setOpenDialog] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        team: '',
        password: '',
        password2: '',
        user_type: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [teamFilter, setTeamFilter] = useState('ALL');
    const { user } = useAuth(); // ✅ Current logged-in user
    const currentUserType = String(user?.user_type || '').toUpperCase();
    const isStaffUser = currentUserType === 'STAFF';
    const isAdminUser = currentUserType === 'ADMIN';

    // Request dialog state
    const [openRequestDialog, setOpenRequestDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [requestMessage, setRequestMessage] = useState('');

    // Register Staff dialog state
    const [openRegisterStaffDialog, setOpenRegisterStaffDialog] = useState(false);
    const [registerStaffData, setRegisterStaffData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });
    const [registerStaffErrors, setRegisterStaffErrors] = useState({});
    const [registerStaffSubmitting, setRegisterStaffSubmitting] = useState(false);

    // ✅ Assign Courses dialog state (added)
    const [openAssignDialog, setOpenAssignDialog] = useState(false);
    const [assigningUser, setAssigningUser] = useState(null);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);

    useEffect(() => {
        if (user?.user_type === 'ADMIN') {
            setUserTypeTab('ALL');
            return;
        }
        if (user?.user_type === 'STAFF') {
            setUserTypeTab('ALL');
            return;
        }
        setUserTypeTab('STUDENT');
    }, [user?.user_type]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showSnackbar('Failed to fetch users', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTeams = useCallback(async () => {
        try {
            const response = await api.get('/teams/');
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
            showSnackbar('Failed to fetch teams', 'error');
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchTeams();
    }, [fetchUsers, fetchTeams]);

    const handleOpenDialog = (user = null) => {
        if (user && !isAdminUser) {
            showSnackbar('Only admin can edit users', 'warning');
            return;
        }

        if (user) {
            setEditUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                team: user.team && user.team.id ? String(user.team.id) : '',
                password: '',
                password2: '',
                user_type: user.user_type || '',
            });
        } else {
            setEditUser(null);
            setFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                team: '',
                password: '',
                password2: '',
                user_type: '',
            });
        }
        setFormErrors({});
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditUser(null);
        setFormErrors({});
    };

    // Request dialog handlers
    const handleOpenRequestDialog = (row) => {
        setSelectedItem(row);
        setRequestMessage('');
        setOpenRequestDialog(true);
    };

    const handleCloseRequestDialog = () => {
        setOpenRequestDialog(false);
        setSelectedItem(null);
        setRequestMessage('');
    };

    // Register Staff dialog handlers
    const handleOpenRegisterStaffDialog = () => {
        setRegisterStaffData({
            first_name: '',
            last_name: '',
            email: ''
        });
        setRegisterStaffErrors({});
        setOpenRegisterStaffDialog(true);
    };

    const handleCloseRegisterStaffDialog = () => {
        if (registerStaffSubmitting) return;
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setOpenRegisterStaffDialog(false);
        setRegisterStaffData({
            first_name: '',
            last_name: '',
            email: ''
        });
        setRegisterStaffErrors({});
    };

    const handleRegisterStaff = async (e) => {
        e.preventDefault();
        setRegisterStaffErrors({});

        const payload = {
            first_name: String(registerStaffData.first_name || '').trim(),
            last_name: String(registerStaffData.last_name || '').trim(),
            email: String(registerStaffData.email || '').trim().toLowerCase(),
        };

        // Validate form
        const errors = {};
        if (!payload.first_name) errors.first_name = 'First name is required';
        if (!payload.last_name) errors.last_name = 'Last name is required';
        if (!payload.email) errors.email = 'Email is required';
        
        if (Object.keys(errors).length > 0) {
            setRegisterStaffErrors(errors);
            return;
        }

        try {
            setRegisterStaffSubmitting(true);
            setRegisterStaffData(payload);
            const response = await api.post('/admin/register-staff/', payload);
            showSnackbar(
                buildStaffRegistrationMessage(response.data, payload.email),
                'success'
            );
            handleCloseRegisterStaffDialog();
            fetchUsers(); // Refresh the users list
        } catch (error) {
            console.error('Error registering staff:', error);
            const data = error.response?.data;
            const errorMessage =
                (typeof data === 'string' && data) ||
                data?.error ||
                (Array.isArray(data?.email) ? data.email[0] : data?.email) ||
                (Array.isArray(data?.first_name) ? data.first_name[0] : data?.first_name) ||
                (Array.isArray(data?.last_name) ? data.last_name[0] : data?.last_name) ||
                'Failed to register staff';
            showSnackbar(errorMessage, 'error');
            if (data && typeof data === 'object') {
                setRegisterStaffErrors({
                    first_name: Array.isArray(data.first_name) ? data.first_name[0] : data.first_name,
                    last_name: Array.isArray(data.last_name) ? data.last_name[0] : data.last_name,
                    email: Array.isArray(data.email) ? data.email[0] : data.email,
                });
            }
        } finally {
            setRegisterStaffSubmitting(false);
        }
    };

    const handleSubmitRequest = async () => {
        try {
            await api.post('/requests/', {
                request_type: 'DELETE_USER',
                object_id: selectedItem.id,
                object_title: selectedItem.username || selectedItem.first_name,
                message: requestMessage
            });
            showSnackbar('Delete request submitted successfully', 'success');
            handleCloseRequestDialog();
        } catch (error) {
            console.error('Error submitting request:', error);
            showSnackbar('Failed to submit delete request', 'error');
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.email) errors.email = 'Email is required';
        if (!formData.first_name) errors.first_name = 'First name is required';
        if (!formData.last_name) errors.last_name = 'Last name is required';
        if (!editUser && !formData.username) errors.username = 'Username is required';
        if (!editUser || (formData.password || formData.password2)) {
            if (!formData.password && formData.user_type !== 'STAFF') errors.password = 'Password is required';
            if (!formData.password2 && formData.user_type !== 'STAFF') errors.password2 = 'Password confirmation is required';
            if (formData.password !== formData.password2 && formData.user_type !== 'STAFF') {
                errors.password2 = 'Passwords do not match';
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (!editUser) {
                if (formData.user_type === 'STAFF') {
                    const response = await api.post('/admin/register-staff/', {
                        email: formData.email,
                        first_name: formData.first_name,
                        last_name: formData.last_name
                    });
                    showSnackbar(
                        buildStaffRegistrationMessage(response.data, formData.email),
                        'success'
                    );
                } else {
                    const apiData = {
                        email: formData.email,
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        username: formData.username,
                        user_type: formData.user_type,
                        password: formData.password,
                        password2: formData.password2,
                    };

                    if (isAdminUser) {
                        if (formData.team === '' || formData.team === null) {
                            apiData.team_id = null;
                        } else {
                            apiData.team_id = Number(formData.team);
                        }
                    }

                    await api.post('/users/', apiData);
                    showSnackbar('User created successfully', 'success');
                }
            } else {
                const apiData = {
                    email: formData.email,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    username: formData.username,
                    user_type: formData.user_type,
                };

                if (formData.password && formData.password2) {
                    apiData.password = formData.password;
                    apiData.password2 = formData.password2;
                }

                if (isAdminUser) {
                    if (formData.team === '' || formData.team === null) {
                        apiData.team_id = null;
                    } else {
                        apiData.team_id = Number(formData.team);
                    }
                }

                await api.put(`/users/${editUser.id}/`, apiData);
                showSnackbar('User updated successfully', 'success');
            }

            fetchUsers();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving user:', error);
            const errorMessage = error.response?.data
                ? Object.values(error.response.data).flat().join(', ')
                : 'An error occurred while saving the user';
            showSnackbar(errorMessage, 'error');
            if (error.response?.data) {
                setFormErrors(error.response.data);
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user? This will soft delete the user. Go to Approved Actions to permanently delete.')) {
            try {
                // Always use soft delete
                await api.delete(`/users/${id}/`);
                showSnackbar('User soft deleted successfully. Go to Approved Actions to permanently delete.', 'success');
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                showSnackbar('Failed to delete user', 'error');
            }
        }
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const buildStaffRegistrationMessage = (responseData, fallbackEmail) => {
        const staffId = responseData?.staff_id || responseData?.id;
        const email = responseData?.email || fallbackEmail;
        const password = responseData?.password;

        if (staffId && email && password) {
            return `Staff registered successfully! ID: ${staffId}, Email: ${email}, Password: ${password}`;
        }

        if (staffId && email) {
            return `Staff registered successfully! ID: ${staffId}, Email: ${email}. Credentials sent to email.`;
        }

        if (email) {
            return `Staff registered successfully! Email: ${email}. Credentials sent to email.`;
        }

        return responseData?.message || 'Staff registered successfully! Credentials sent to email.';
    };

    // ✅ Assign Courses: handlers (added)
    const handleOpenAssignDialog = async (selectedUser) => {
    setAssigningUser(selectedUser);
    setOpenAssignDialog(true);
    try {
        const [allResp, assignedResp] = await Promise.all([
            api.get('/courses/'), // all courses
            api.get(`/users/${selectedUser.id}/assigned_courses/`) // assigned ones
        ]);

        setAvailableCourses(allResp.data || []);
        setSelectedCourses((assignedResp.data || []).map(c => c.id)); // pre-check assigned
    } catch (err) {
        console.error('Error loading courses:', err);
        showSnackbar('Failed to load courses', 'error');
    }
};


    const handleToggleCourse = (courseId) => {
        setSelectedCourses((prev) =>
            prev.includes(courseId)
                ? prev.filter((id) => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleSaveAssign = async () => {
    if ((selectedCourses || []).length > 2) {
        showSnackbar('Please choose only 2 course', 'error');
        return;
    }
    try {
        await api.post(`/courses/assign_courses/`, {
            user_id: assigningUser.id,
            course_ids: selectedCourses,
        });
        showSnackbar('Courses updated successfully', 'success');
        setOpenAssignDialog(false);
        setAssigningUser(null);
        setSelectedCourses([]);
    } catch (err) {
        console.error('Error assigning courses:', err);
        const apiMessage = err?.response?.data?.error || err?.response?.data?.detail;
        if (apiMessage && apiMessage.toLowerCase().includes('only 2 courses')) {
            showSnackbar('Please choose only 2 course', 'error');
        } else {
            showSnackbar('Failed to update courses', 'error');
        }
    }
};


const columns = [
    { field: 'username', headerName: 'Username', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'first_name', headerName: 'First Name', flex: 1 },
    { field: 'last_name', headerName: 'Last Name', flex: 1 },
    { field: 'user_type', headerName: 'Type', flex: 1 },
    {
        field: 'team',
        headerName: 'Team',
        flex: 1,
        renderCell: (params) => {
            if (!params || !params.row) return 'Individual';
            if (params.row.team && typeof params.row.team === 'object') {
                return params.row.team.name || 'Individual';
            }
            return 'Individual';
        },
    },
    {
        field: 'assign_courses',
        headerName: 'Assign',
        flex: 0.5,
        renderCell: (params) => (
            params?.row?.user_type === 'STUDENT' && (
                <Tooltip title="Assign Courses">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignDialog(params.row);
                        }}
                    >
                        <PersonAddIcon />
                    </IconButton>
                </Tooltip>
            )
        ),
    },
    {
        field: 'actions',
        headerName: 'Actions',
        flex: 1,
        renderCell: (params) => (
            <Box>
                {isAdminUser && (
                    <Tooltip title="Edit">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleOpenDialog(params.row); }}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {isStaffUser && (
                    <Tooltip title="Request User Deletion">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleOpenRequestDialog(params.row); }}>
                            <MarkEmailUnreadIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {isAdminUser && (
                    <Tooltip title="Delete">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(params.row.id); }}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        ),
    },
];

    const visibleUsers = users.filter((u) =>
        (user?.user_type === 'ADMIN' || user?.user_type === 'STAFF')
            ? true
            : (u.user_type === 'STUDENT' || u.user_type === 'EMPLOYEE')
    );

    const tabUsers =
        userTypeTab === 'ALL' ? visibleUsers : visibleUsers.filter((u) => u.user_type === userTypeTab);

    const filteredUsers = tabUsers.filter((u) => {
        const query = searchQuery.trim().toLowerCase();
        const username = String(u.username || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const firstName = String(u.first_name || '').toLowerCase();
        const lastName = String(u.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        const matchesSearch =
            !query ||
            username.includes(query) ||
            email.includes(query) ||
            firstName.includes(query) ||
            lastName.includes(query) ||
            fullName.includes(query);

        const teamId = u?.team?.id ? String(u.team.id) : 'INDIVIDUAL';
        const matchesTeam = teamFilter === 'ALL' ? true : teamFilter === teamId;

        return matchesSearch && matchesTeam;
    });

    return (
        <Box sx={{ p: 3 }}>
            {/* Header Section */}
            <Card 
                elevation={0} 
                sx={{ 
                    mb: 3, 
                    bgcolor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.100'
                }}
            >
                <CardContent>
                    <Stack 
                        direction="row" 
                        justifyContent="space-between" 
                        alignItems="center"
                    >
                        <Box>
                            <Typography 
                                variant="h4" 
                                fontWeight="bold" 
                                color="primary.main"
                                gutterBottom
                            >
                                User Management
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Details
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            {user?.user_type === 'ADMIN' && (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={handleOpenRegisterStaffDialog}
                                    sx={{ 
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        px: 3,
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 'medium'
                                    }}
                                >
                                    Register Staff
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                                sx={{ 
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    px: 3,
                                    py: 1.5,
                                    fontSize: '1rem',
                                    fontWeight: 'medium'
                                }}
                            >
                                Add User
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                }}
            >
                <Tabs
                    value={userTypeTab}
                    onChange={(_, value) => setUserTypeTab(value)}
                    variant="fullWidth"
                    TabIndicatorProps={{
                        style: {
                            height: 3,
                            borderRadius: 999,
                        },
                    }}
                    sx={{
                        px: 1,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            minHeight: 48,
                        },
                        '& .MuiTab-root.Mui-selected': {
                            color: 'primary.main',
                        },
                    }}
                >
                    <Tab value="ALL" label="All" />
                    <Tab value="STUDENT" label="Students" />
                    <Tab value="STAFF" label="Staff" />
                    {(user?.user_type === 'ADMIN' || user?.user_type === 'STAFF') && (
                        <Tab value="ADMIN" label="Admins" />
                    )}
                </Tabs>
            </Paper>

            {/* Search and Filter */}
            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search by username, email, or name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
                        <InputLabel>Filter Team</InputLabel>
                        <Select
                            value={teamFilter}
                            label="Filter Team"
                            onChange={(e) => setTeamFilter(e.target.value)}
                            sx={{ borderRadius: '12px' }}
                        >
                            <MenuItem value="ALL">All Teams</MenuItem>
                            <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                            {teams.map((team) => (
                                <MenuItem key={team.id} value={String(team.id)}>
                                    {team.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* Data Grid */}
            <Paper 
                elevation={0}
                sx={{ 
                    height: 550, 
                    width: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    overflow: 'hidden'
                }}
            >
                <DataGrid
                    rows={filteredUsers}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    disableSelectionOnClick
                    loading={loading}
                    getRowId={(row) => row.id}
                    autoHeight={false}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            bgcolor: 'grey.50',
                            fontSize: '0.875rem',
                            fontWeight: 'medium'
                        },
                        '& .MuiDataGrid-row': {
                            '&:hover': {
                                bgcolor: 'action.hover'
                            }
                        },
                        '& .MuiDataGrid-cell': {
                            border: 'none',
                            py: 1
                        }
                    }}
                />
            </Paper>

            {/* ✅ Assign Courses Dialog (added) */}
            <Dialog 
                open={openAssignDialog} 
                onClose={() => setOpenAssignDialog(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" component="div" fontWeight="medium">
                        Assign Courses
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Assign courses to {assigningUser?.username}
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                        <List>
                            {availableCourses.map((course) => (
                            <ListItem
                                key={course.id}
                                disablePadding
                                disableGutters
                                sx={{ px: 1 }}
                            >
                                <ListItemButton onClick={() => handleToggleCourse(course.id)}>
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Checkbox checked={selectedCourses.includes(course.id)} />
                                    </ListItemIcon>
                                    <ListItemText primary={course.title || course.name} />
                                </ListItemButton>
                            </ListItem>
                            ))}
                            {availableCourses.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    No courses available.
                                </Typography>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={() => setOpenAssignDialog(false)}
                        variant="outlined"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveAssign} 
                        variant="contained"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog for Adding/Editing Users */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" component="div" fontWeight="medium">
                        {editUser ? 'Edit User' : 'Add New User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {editUser ? 'Update user details' : 'Add a new user to your organization'}
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Box component="form" noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={editUser}
                            error={!!formErrors.username}
                            helperText={formErrors.username}
                            InputProps={editUser ? { style: { backgroundColor: '#f5f5f5' } } : {}}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            disabled={editUser}
                            InputProps={editUser ? { style: { backgroundColor: '#f5f5f5' } } : {}}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            error={!!formErrors.first_name}
                            helperText={formErrors.first_name}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            error={!!formErrors.last_name}
                            helperText={formErrors.last_name}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        {!editUser && formData.user_type !== 'STAFF' && (
                            <>
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    label="Password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    error={!!formErrors.password}
                                    helperText={formErrors.password}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px'
                                        }
                                    }}
                                />
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    label="Confirm Password"
                                    name="password2"
                                    type="password"
                                    value={formData.password2}
                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                    error={!!formErrors.password2}
                                    helperText={formErrors.password2}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px'
                                        }
                                    }}
                                />
                            </>
                        )}
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Team</InputLabel>
                            <Select
                                value={formData.team}
                                label="Team"
                                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                                disabled={!isAdminUser}
                                sx={{
                                    borderRadius: '12px'
                                }}
                            >
                                {teams.map((team) => (
                                    <MenuItem key={team.id} value={String(team.id)}>
                                        {team.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>User Type</InputLabel>
                            <Select
                                value={formData.user_type}
                                label="User Type"
                                onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                                disabled={editUser}
                                sx={{
                                    borderRadius: '12px'
                                }}
                            >
                                <MenuItem value="STUDENT">Student</MenuItem>
                                {(user?.user_type === 'ADMIN' || user?.user_type === 'STAFF') && (
                                    <MenuItem value="STAFF">Staff</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={handleCloseDialog}
                        variant="outlined"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        variant="contained"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        {editUser ? 'Save Changes' : 'Add User'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request Dialog */}
            <Dialog open={openRequestDialog} onClose={handleCloseRequestDialog} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" component="div" fontWeight="medium">
                        Request to Delete User
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Send a deletion request to the admin
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body1" gutterBottom>
                            Requesting deletion for: <strong>{selectedItem?.username || selectedItem?.first_name}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            This will send a delete request to the admin. The user will only be deleted after admin approval.
                        </Typography>
                        <TextField
                            margin="normal"
                            fullWidth
                            label="Reason for Deletion (Optional)"
                            multiline
                            rows={4}
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            placeholder="Please provide a reason for requesting deletion of this user..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={handleCloseRequestDialog}
                        variant="outlined"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmitRequest} 
                        variant="contained" 
                        color="error"
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Submit Delete Request
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Register Staff Dialog */}
            <Dialog open={openRegisterStaffDialog} onClose={handleCloseRegisterStaffDialog} maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" component="div" fontWeight="medium">
                        Register Staff
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Add a new staff member to your organization
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Box component="form" noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="First Name"
                            name="first_name"
                            value={registerStaffData.first_name}
                            onChange={(e) => setRegisterStaffData({ ...registerStaffData, first_name: e.target.value })}
                            error={!!registerStaffErrors.first_name}
                            helperText={registerStaffErrors.first_name}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Last Name"
                            name="last_name"
                            value={registerStaffData.last_name}
                            onChange={(e) => setRegisterStaffData({ ...registerStaffData, last_name: e.target.value })}
                            error={!!registerStaffErrors.last_name}
                            helperText={registerStaffErrors.last_name}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={registerStaffData.email}
                            onChange={(e) => setRegisterStaffData({ ...registerStaffData, email: e.target.value })}
                            error={!!registerStaffErrors.email}
                            helperText={registerStaffErrors.email}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px'
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={handleCloseRegisterStaffDialog}
                        variant="outlined"
                        disabled={registerStaffSubmitting}
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleRegisterStaff} 
                        variant="contained" 
                        color="primary"
                        disabled={registerStaffSubmitting}
                        sx={{ 
                            borderRadius: '20px',
                            textTransform: 'none',
                            px: 3
                        }}
                    >
                        {registerStaffSubmitting ? 'Registering...' : 'Register'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManagement;
