import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, FormControl, InputLabel, Select, MenuItem, Menu, OutlinedInput, Card,
  Divider, Stack, Avatar, Badge, Snackbar, Alert, Table, TableBody, TableCell, TableHead,
<<<<<<< HEAD
  TableRow
=======
  TableRow, ToggleButtonGroup, ToggleButton
>>>>>>> 5d54974 (team management changed)
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, // eslint-disable-next-line no-unused-vars
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon, PersonRemove as PersonRemoveIcon,
  School as SchoolIcon, Groups as GroupsIcon, Assignment as AssignmentIcon,
  // eslint-disable-next-line no-unused-vars
  MarkEmailUnread as MarkEmailUnreadIcon, Search as SearchIcon,
  NotificationsNone as NotificationsIcon,
  MoreVert as MoreVertIcon, FilterList as FilterListIcon,
  Sort as SortIcon, KeyboardArrowDown as KeyboardArrowDownIcon,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const AVATAR_COLORS = ['#e74c3c','#8e44ad','#2980b9','#27ae60','#e67e22','#16a085','#d35400','#6c3483'];

const getInitials = (name) => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Sort by: Newest' },
  { value: 'oldest', label: 'Sort by: Oldest' },
  { value: 'name', label: 'Sort by: Name (A-Z)' },
];

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Search, Filter, Sort, Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Pill filter/sort menu anchors
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [rowsMenuAnchor, setRowsMenuAnchor] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [openCourseDialog, setOpenCourseDialog] = useState(false);

  const [editTeam, setEditTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);

  const [formData, setFormData] = useState({ name: '', description: '', course_ids: [], is_active: true });
  const [dialogSelectedUser, setDialogSelectedUser] = useState('');

  // Request dialog state
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    fetchCourses();
  }, []);

  // Filtered and sorted teams
  const filteredTeams = useMemo(() => {
    let result = [...teams];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        team =>
          team.name.toLowerCase().includes(term) ||
          (team.description && team.description.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(team => {
        const active = team.is_active === true || team.is_active === 1;
        return active === isActive;
      });
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [teams, searchTerm, statusFilter, sortBy]);

  // Paginated teams
  const paginatedTeams = useMemo(() => {
    return filteredTeams.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredTeams, page, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(filteredTeams.length / rowsPerPage));

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams/');
      // Fetch full detail for each team to include courses array
      const detailed = await Promise.all(
        response.data.map(t => api.get(`/teams/${t.id}/`).then(r => r.data).catch(() => t))
      );
      setTeams(detailed);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/?user_type=STUDENT');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses/');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleOpenDialog = async (team = null) => {
    if (team) {
      setEditTeam(team);
      const res = await api.get(`/teams/${team.id}/`).catch(() => ({ data: team }));
      const full = res.data;
      setEditTeam(full);
      setFormData({
        name: full.name,
        description: full.description,
        course_ids: full.courses?.map(c => c.id) || [],
        is_active: full.is_active ?? true
      });
    } else {
      setEditTeam(null);
      setFormData({ name: '', description: '', course_ids: [], is_active: true });
    }
    setDialogSelectedUser('');
    setOpenDialog(true);
  };

  // const handleOpenMemberDialog = async (team) => {
  //   try {
  //     const response = await api.get(`/teams/${team.id}/`);
  //     setEditTeam(response.data);
  //     setOpenMemberDialog(true);
  //   } catch (error) {
  //     console.error('Error fetching team details:', error);
  //   }
  // };

  const handleOpenCourseDialog = async (team) => {
    try {
      const response = await api.get(`/teams/${team.id}/`);
      setEditTeam(response.data);
      setSelectedCourses(response.data.courses.map(c => c.id));
      setOpenCourseDialog(true);
    } catch (error) {
      console.error('Error fetching team courses:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditTeam(null);
  };

  const handleCloseMemberDialog = () => {
    setOpenMemberDialog(false);
    setSelectedUser('');
  };

  const handleCloseCourseDialog = () => {
    setOpenCourseDialog(false);
    setSelectedCourses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active
      };
      let teamId;
      if (editTeam) {
        await api.put(`/teams/${editTeam.id}/`, payload);
        teamId = editTeam.id;
      } else {
        const response = await api.post('/teams/', payload);
        teamId = response.data.id;
      }
      if (formData.course_ids?.length > 0 && teamId) {
        await api.put(`/teams/${teamId}/assign_courses/`, {
          course_ids: formData.course_ids,
        });
      }
      fetchTeams();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post(`/teams/${editTeam.id}/members/`, {
        user_id: selectedUser
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      fetchTeams();
      setSelectedUser('');
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/teams/${editTeam.id}/members/${userId}/`);
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      fetchTeams();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleAssignCourses = async () => {
    try {
      await api.put(`/teams/${editTeam.id}/assign_courses/`, {
        course_ids: selectedCourses,
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      console.log('Updated team after assigning courses:', response.data);
      setEditTeam(response.data);
      fetchTeams();
      handleCloseCourseDialog();
    } catch (error) {
      console.error('Error assigning courses:', error);
    }
  };

  const handleDelete = async (id) => {
  if (window.confirm('Are you sure you want to delete this team?')) {
    try {
      if (user?.user_type === 'ADMIN') {
        await api.delete(`/teams/${id}/permanent-delete/`);
        showSnackbar('Team permanently deleted successfully', 'success');
      } else {
       await api.delete(`/teams/${id}/`);
        showSnackbar('Team deleted successfully', 'success');
      }
      fetchTeams();
    } catch (error) {
      // console.error('Error deleting team:', error);
      showSnackbar('Failed to delete team', 'error');
    }
  }
};
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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

  const handleSubmitRequest = async () => {
    try {
      await api.post('/requests/', {
        request_type: 'DELETE_TEAM',
        object_id: selectedItem?.id,
        object_title: selectedItem?.name,
        message: requestMessage
      });
      handleCloseRequestDialog();
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuTeam, setMenuTeam] = useState(null);

  const COURSE_PALETTES = [
    { bg: '#fce4ec', color: '#c62828' },   // red/pink
    { bg: '#e3f2fd', color: '#1565c0' },   // blue
    { bg: '#e8f5e9', color: '#2e7d32' },   // green
    { bg: '#e0f7fa', color: '#00695c' },   // teal
    { bg: '#fff3e0', color: '#e65100' },   // orange
    { bg: '#f3e5f5', color: '#6a1b9a' },   // purple
    { bg: '#e8eaf6', color: '#283593' },   // indigo
    { bg: '#fff8e1', color: '#f57f17' },   // amber
    { bg: '#fbe9e7', color: '#bf360c' },   // deep orange
    { bg: '#e1f5fe', color: '#0277bd' },   // light blue
    { bg: '#f1f8e9', color: '#558b2f' },   // light green
    { bg: '#fce4ec', color: '#880e4f' },   // pink
    { bg: '#ede7f6', color: '#4527a0' },   // deep purple
    { bg: '#e8f5e9', color: '#1b5e20' },   // dark green
    { bg: '#e3f2fd', color: '#0d47a1' },   // dark blue
  ];

  const getCourseColor = (title) => {
    if (!title) return COURSE_PALETTES[0];
    const sum = title.trim().toLowerCase().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return COURSE_PALETTES[sum % COURSE_PALETTES.length];
  };

  const handleOpenMenu = (event, team) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuTeam(team);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuTeam(null);
  };

  const handleMenuEdit = () => {
    if (menuTeam) handleOpenDialog(menuTeam);
    handleCloseMenu();
  };

  const handleMenuDelete = () => {
    if (menuTeam) handleDelete(menuTeam.id);
    handleCloseMenu();
  };

  const handleMenuRequestDeletion = () => {
    if (menuTeam) handleOpenRequestDialog(menuTeam);
    handleCloseMenu();
  };

<<<<<<< HEAD
  const unreadNotificationCount = 0; // wire to real notification state if/when available
=======
  // eslint-disable-next-line no-unused-vars
  const columns = [
    { 
      field: 'name', 
      headerName: 'Team Name', 
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: '#1e40af',
              fontSize: '0.875rem'
            }}
          >
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      flex: 2,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {params.value || 'No description'}
        </Typography>
      )
    },
    {
      field: 'members_count',
      headerName: 'Members',
      flex: 1,
      renderCell: (params) => (
        <Badge 
          badgeContent={params.row.members_count} 
          color="primary"
          sx={{ cursor: 'pointer', '& .MuiBadge-badge': { backgroundColor: '#1e40af' } }}
          onClick={() => handleOpenMemberDialog(params.row)}
        >
          <Chip
            icon={<GroupsIcon />}
            label="Members"
            variant="outlined"
            size="small"
            clickable
            sx={{ 
              borderRadius: '8px',
              borderColor: '#1e40af',
              color: '#1e40af',
              '&:hover': {
                backgroundColor: '#f8fafc',
                borderColor: '#1e40af'
              }
            }}
          />
        </Badge>
      ),
    },
    {
      field: 'courses',
      headerName: 'Assigned Courses',
      flex: 3,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const assignedCourses = params.row.courses || [];
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              flexWrap: 'wrap',
              width: '100%',
              py: 1
            }}
          >
            {assignedCourses.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'nowrap', gap: 0.5, maxWidth: 220, overflow: 'hidden' }}>
                <Chip
                  key={assignedCourses[0].id}
                  label={assignedCourses[0].title}
                  icon={<SchoolIcon />}
                  size="small"
                  variant="filled"
                  color="secondary"
                  sx={{ 
                    maxWidth: 120,
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                />
                {assignedCourses.length > 1 && (
                  <Chip
                    label={`+${assignedCourses.length - 1} more`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderRadius: '8px',
                      fontSize: '0.7rem'
                    }}
                  />
                )}
              </Stack>
            )}
>>>>>>> 5d54974 (team management changed)

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'All Status';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort by: Newest';

  return (
    <Box sx={{ p: 3, bgcolor: '#ffffff', minHeight: '100vh' }}>
      {/* TOP BAR - Search & Notification */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          gap: 2
        }}
      >
        {/* Search Input */}
        <TextField
          placeholder="Search teams by name or description..."
          size="small"
          fullWidth
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{
            maxWidth: 400,
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb'
            }
          }}
        />

        {/* Right Side: Notification + Create Button */}
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <Badge badgeContent={unreadNotificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              px: 3,
<<<<<<< HEAD
              backgroundColor: '#111827',
              '&:hover': { backgroundColor: '#000000' }
=======
              backgroundColor: '#312E81',
              '&:hover': { backgroundColor: '#27235f' }
>>>>>>> 5d54974 (team management changed)
            }}
          >
            Create Team
          </Button>
        </Stack>
      </Box>

      {/* PAGE HEADER */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ mb: 0.5 }}
        >
          Team Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your teams, members and their course assignments
        </Typography>
      </Box>

      {/* STATS ROW - 4 Cards */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 4 }}>
        {[
          { label: 'Total Teams', value: teams.length, trend: '+14%', icon: GroupsIcon, iconColor: '#4f46e5', iconBg: '#ede9fe' },
          { label: 'Total Members', value: teams.reduce((sum, t) => sum + (t.members_count || 0), 0), trend: '+21%', icon: PersonAddIcon, iconColor: '#16a34a', iconBg: '#dcfce7' },
          { label: 'Courses Assigned', value: teams.reduce((sum, t) => sum + (t.courses?.length || 0), 0), trend: '+8%', icon: SchoolIcon, iconColor: '#2563eb', iconBg: '#dbeafe' },
          { label: 'Active Teams', value: teams.filter(t => t.is_active === true || t.is_active === 1).length, trend: '+12%', icon: AssignmentIcon, iconColor: '#d97706', iconBg: '#fef3c7' },
        ].map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
<<<<<<< HEAD
            <Card
              key={idx}
              elevation={0}
              sx={{
                flex: 1,
                border: '1px solid #e5e7eb',
                // borderRadius: 3,
                p: 2.5,
                bgcolor: '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: stat.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <IconComponent sx={{ fontSize: 26, color: stat.iconColor }} />
=======
            <Card key={idx} elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box sx={{ width: 64, height: 36, borderRadius: '999px', bgcolor: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconComponent sx={{ fontSize: 20, color: stat.iconColor }} />
>>>>>>> 5d54974 (team management changed)
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>{stat.label}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap' }}>{stat.trend} ↑</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mt: 0.25 }}>
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{stat.value}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>vs last month</Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>

<<<<<<< HEAD
      {/* FILTER & SORT ROW - pill button + menu */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
=======
            {/* FILTER & SORT ROW */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2,
>>>>>>> 5d54974 (team management changed)
          mb: 3,
          alignItems: 'center'
        }}
      >
        {/* Status Filter Pill */}
        <Button
          onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
          startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: '999px',
            textTransform: 'none',
            px: 2,
            py: 0.75,
            border: '1px solid #e5e7eb',
            color: 'text.primary',
            backgroundColor: '#ffffff',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#f8f9fc', borderColor: '#d1d5db' }
          }}
        >
          {statusLabel}
        </Button>
        <Menu
          anchorEl={statusMenuAnchor}
          open={Boolean(statusMenuAnchor)}
          onClose={() => setStatusMenuAnchor(null)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.value}
              selected={opt.value === statusFilter}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(0);
                setStatusMenuAnchor(null);
              }}
            >
              {opt.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Sort Pill */}
        <Button
          onClick={(e) => setSortMenuAnchor(e.currentTarget)}
          startIcon={<SortIcon sx={{ fontSize: 18 }} />}
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: '999px',
            textTransform: 'none',
            px: 2,
            py: 0.75,
            border: '1px solid #e5e7eb',
            color: 'text.primary',
            backgroundColor: '#ffffff',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#f8f9fc', borderColor: '#d1d5db' }
          }}
        >
          {sortLabel}
        </Button>
        <Menu
          anchorEl={sortMenuAnchor}
          open={Boolean(sortMenuAnchor)}
          onClose={() => setSortMenuAnchor(null)}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.value}
              selected={opt.value === sortBy}
              onClick={() => {
                setSortBy(opt.value);
                setSortMenuAnchor(null);
              }}
            >
              {opt.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* TABLE */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fc' }}>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>TEAM</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>DESCRIPTION</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>MEMBERS</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ASSIGNED COURSES</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTeams.map((team) => {
              const isActive = team.is_active === true || team.is_active === 1;
              return (
                <TableRow
                  key={team.id}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  {/* TEAM */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: getAvatarColor(team.name),
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          color: '#fff',
                          boxShadow: 'none',
                          border: 'none'
                        }}
                      >
                        {getInitials(team.name)}
                      </Avatar>
                      <Typography fontWeight="medium">{team.name}</Typography>
                    </Box>
                  </TableCell>

                  {/* DESCRIPTION */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200
                      }}
                    >
                      {team.description || 'No description'}
                    </Typography>
                  </TableCell>

                  {/* MEMBERS */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#312E81">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: '#111827' }}>
                          {team.members_count} Members
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {team.members?.[0]?.username || team.team_lead?.username || team.team_lead || 'N/A'} (Team Lead)
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* ASSIGNED COURSES */}
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                      {team.courses?.slice(0, 2).map((course) => {
                        const palette = getCourseColor(course.title);
                        return (
                          <Chip
                            key={course.id}
                            label={course.title}
                            size="small"
                            icon={
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '10px',
                                  bgcolor: palette.color,
                                  ml: 0.5,
                                }}
                              />
                            }
                            sx={{
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              color: palette.color,
                              backgroundColor: palette.bg,
                              border: 'none',
                              px: 1,
                              py: 0.5,
                              alignItems: 'center',
                              '& .MuiChip-icon': {
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '-4px',
                              }
                            }}
                          />
                        );
                      })}
                      {team.courses?.length > 2 && (
                        <Chip
                          label={`+${team.courses.length - 2}`}
                          size="small"
                          sx={{
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            border: 'none',
                            backgroundColor: '#f5f5f5',
                            px: 1,
                            py: 0.5
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        component="span"
                        sx={{
                          color: isActive ? 'success.main' : 'error.main',
                          fontSize: '1rem',
                          lineHeight: 1
                        }}
                      >
                        ●
                      </Typography>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ color: isActive ? 'success.main' : 'error.main', fontWeight: 'medium' }}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenCourseDialog(team)}
                        sx={{
                          borderColor: '#e5e7eb',
                          color: 'text.primary',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          '&:hover': { backgroundColor: '#f8f9fc', borderColor: '#d1d5db' }
                        }}
                      >
                        Manage
                      </Button>
                      <Tooltip title="Edit Team" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(team)}
                          sx={{
                            color: 'text.secondary'
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenMenu(event, team)}
                        sx={{
                          color: 'text.secondary'
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={Boolean(menuAnchorEl && menuTeam?.id === team.id)}
                      onClose={handleCloseMenu}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <MenuItem onClick={handleMenuEdit}>Edit</MenuItem>
                      <MenuItem onClick={handleMenuDelete} sx={{ color: 'error.main' }}>
                        Delete
                      </MenuItem>
                      {user?.user_type === 'STAFF' && (
                        <MenuItem onClick={handleMenuRequestDeletion} sx={{ color: 'warning.main' }}>
                          Request Deletion
                        </MenuItem>
                      )}
                    </Menu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* FOOTER - Pagination Info & Controls (inside the table card, matching mockup) */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2.5,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {filteredTeams.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredTeams.length)} of {filteredTeams.length} teams
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              size="small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: 'text.secondary',
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            {Array.from({ length: pageCount }, (_, i) => i).map((p) => (
              <Box
                key={p}
                onClick={() => setPage(p)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  bgcolor: p === page ? '#312e81' : 'transparent',
                  color: p === page ? '#ffffff' : 'text.secondary',
                  '&:hover': {
                    bgcolor: p === page ? '#312e81' : 'action.hover',
                  },
                }}
              >
                {p + 1}
              </Box>
            ))}

            <IconButton
              size="small"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: 'text.secondary',
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Rows per page:
            </Typography>
            <Button
              size="small"
              onClick={(e) => setRowsMenuAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: 'text.primary',
                textTransform: 'none',
                minWidth: 0,
                px: 1.25,
                py: 0.25,
                fontWeight: 500,
              }}
            >
              {rowsPerPage}
            </Button>
            <Menu
              anchorEl={rowsMenuAnchor}
              open={Boolean(rowsMenuAnchor)}
              onClose={() => setRowsMenuAnchor(null)}
            >
              {[5, 10, 25].map((n) => (
                <MenuItem
                  key={n}
                  selected={n === rowsPerPage}
                  onClick={() => {
                    setRowsPerPage(n);
                    setPage(0);
                    setRowsMenuAnchor(null);
                  }}
                >
                  {n}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </Box>
      </Paper>

<<<<<<< HEAD
=======
      {/* FOOTER - Pagination Info & Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1, py: 1.5, borderTop: '1px solid #e5e7eb' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          Showing {filteredTeams.length === 0 ? 0 : page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredTeams.length)} of {filteredTeams.length} teams
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Prev button */}
          <IconButton size="small" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            sx={{ width: 28, height: 28, border: '1px solid #e5e7eb', borderRadius: 1, color: page === 0 ? '#d1d5db' : '#374151' }}>
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1 }}>‹</Typography>
          </IconButton>
          {/* Page number buttons */}
          {Array.from({ length: Math.ceil(filteredTeams.length / rowsPerPage) }, (_, i) => (
            <IconButton key={i} size="small" onClick={() => setPage(i)}
              sx={{ width: 28, height: 28, borderRadius: 1, border: page === i ? 'none' : '1px solid #e5e7eb',
                bgcolor: page === i ? '#312E81' : '#fff', color: page === i ? '#fff' : '#374151',
                fontSize: '0.8rem', fontWeight: page === i ? 'bold' : 'normal',
                '&:hover': { bgcolor: page === i ? '#27235f' : '#f3f4f6' } }}>
              {i + 1}
            </IconButton>
          ))}
          {/* Next button */}
          <IconButton size="small" onClick={() => setPage(p => Math.min(Math.ceil(filteredTeams.length / rowsPerPage) - 1, p + 1))}
            disabled={page >= Math.ceil(filteredTeams.length / rowsPerPage) - 1}
            sx={{ width: 28, height: 28, border: '1px solid #e5e7eb', borderRadius: 1, color: page >= Math.ceil(filteredTeams.length / rowsPerPage) - 1 ? '#d1d5db' : '#374151' }}>
            <Typography sx={{ fontSize: '0.9rem', lineHeight: 1 }}>›</Typography>
          </IconButton>
          {/* Rows per page */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            <Typography variant="caption" color="text.secondary">Rows per page:</Typography>
            <Select value={rowsPerPage} onChange={e => { setRowsPerPage(+e.target.value); setPage(0); }} size="small"
              sx={{ height: 26, fontSize: '0.8rem', '.MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' }, minWidth: 52 }}>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
            </Select>
          </Box>
        </Box>
      </Box>

>>>>>>> 5d54974 (team management changed)
      {/* Team Dialog - Enhanced Material Design */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
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
            {editTeam ? 'Edit Team' : 'Create New Team'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {editTeam ? 'Update team details' : 'Add a new team to your organization'}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <TextField margin="normal" required fullWidth label="Team Name *" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
          <TextField margin="normal" fullWidth label="Description" multiline rows={3} value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />

          {/* MEMBERS - only when editing */}
          {editTeam && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Members</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5, minHeight: 32 }}>
                {editTeam.members?.map(member => (
                  <Chip key={member.id} label={member.username} size="small"
                    onDelete={async () => {
                      await api.delete(`/teams/${editTeam.id}/members/${member.id}/`);
                      const r = await api.get(`/teams/${editTeam.id}/`);
                      setEditTeam(r.data); fetchTeams();
                    }}
                    sx={{ borderRadius: '999px', bgcolor: '#f1f5f9', color: '#1e293b' }} />
                ))}
                {(!editTeam.members || editTeam.members.length === 0) && (
                  <Typography variant="caption" color="text.disabled">No members yet</Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <FormControl fullWidth size="small">
                  <InputLabel>Add Member</InputLabel>
                  <Select value={dialogSelectedUser} onChange={e => setDialogSelectedUser(e.target.value)}
                    input={<OutlinedInput label="Add Member" />} sx={{ borderRadius: '10px' }}>
                    {users.filter(u => !editTeam.members?.some(m => m.id === u.id)).map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" disabled={!dialogSelectedUser}
                  onClick={async () => {
                    await api.post(`/teams/${editTeam.id}/members/`, { user_id: dialogSelectedUser });
                    const r = await api.get(`/teams/${editTeam.id}/`);
                    setEditTeam(r.data); setDialogSelectedUser(''); fetchTeams();
                  }}
                  sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap', px: 2 }}>
                  Add
                </Button>
              </Stack>
            </Box>
          )}

          {/* ASSIGN COURSES */}
          <FormControl fullWidth margin="normal" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
            <InputLabel id="dialog-courses-label">Assign Courses</InputLabel>
            <Select labelId="dialog-courses-label" multiple value={formData.course_ids}
              onChange={(e) => setFormData({ ...formData, course_ids: e.target.value })}
              input={<OutlinedInput label="Assign Courses" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => {
                    const course = courses.find(c => c.id === id);
                    return course ? <Chip key={id} label={course.title} size="small" sx={{ borderRadius: '999px' }} /> : null;
                  })}
                </Box>
              )}>
              {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>)}
            </Select>
          </FormControl>

          {/* STATUS TOGGLE */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Status</Typography>
            <ToggleButtonGroup exclusive value={formData.is_active} size="small"
              onChange={(_, val) => { if (val !== null) setFormData({ ...formData, is_active: val }); }}>
              <ToggleButton value={true} sx={{
                borderRadius: '8px !important', textTransform: 'none', px: 3,
                '&.Mui-selected': { bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' } }
              }}>Active</ToggleButton>
              <ToggleButton value={false} sx={{
                borderRadius: '8px !important', textTransform: 'none', px: 3,
                '&.Mui-selected': { bgcolor: '#dc2626', color: '#fff', '&:hover': { bgcolor: '#b91c1c' } }
              }}>Inactive</ToggleButton>
            </ToggleButtonGroup>
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
            {editTeam ? 'Save Changes' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Dialog - Enhanced */}
      <Dialog
        open={openMemberDialog}
        onClose={handleCloseMemberDialog}
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
            Manage Team Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add or remove members from {editTeam?.name}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Current Members
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 200,
              overflow: 'auto',
              borderRadius: '12px'
            }}
          >
            <List dense>
              {editTeam?.members?.map((member) => (
                <ListItem key={member.id} divider>
                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={member.username}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Remove Member" arrow>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveMember(member.id)}
                        size="small"
                        sx={{ color: 'error.main' }}
                      >
                        <PersonRemoveIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {(!editTeam?.members || editTeam.members.length === 0) && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No members in this team yet
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="medium">
              Add New Member
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-end">
              <FormControl fullWidth>
                <InputLabel id="select-user-label">Select Student</InputLabel>
                <Select
                  labelId="select-user-label"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  input={<OutlinedInput label="Select Student" />}
                  sx={{
                    borderRadius: '12px'
                  }}
                >
                  {users
                    .filter((u) => !editTeam?.members?.some((m) => m.id === u.id))
                    .map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.username}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddMember}
                disabled={!selectedUser}
                startIcon={<PersonAddIcon />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  px: 3
                }}
              >
                Add
              </Button>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCloseMemberDialog}
            variant="contained"
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Courses Dialog - Enhanced */}
      <Dialog
        open={openCourseDialog}
        onClose={handleCloseCourseDialog}
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
            Select courses for {editTeam?.name}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="assign-courses-label">Select Courses</InputLabel>
            <Select
              labelId="assign-courses-label"
              multiple
              value={selectedCourses}
              onChange={(e) => setSelectedCourses(e.target.value)}
              input={<OutlinedInput label="Select Courses" />}
              sx={{
                borderRadius: '12px'
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((courseId) => {
                    const course = courses.find(c => c.id === courseId);
                    return course ? (
                      <Chip
                        key={course.id}
                        label={course.title}
                        icon={<SchoolIcon />}
                        size="small"
                        sx={{ borderRadius: '12px', '& .MuiChip-icon': {color: '#0000ff'}
                      }}
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon fontSize="small" />
                    {course.title}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCloseCourseDialog}
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
            variant="contained"
            onClick={handleAssignCourses}
            startIcon={<AssignmentIcon />}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              px: 3
            }}
          >
            Assign Courses
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={openRequestDialog} onClose={handleCloseRequestDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request to Delete Team</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" gutterBottom>
              Requesting deletion for: <strong>{selectedItem?.name}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              This will send a delete request to the admin. The team will only be deleted after admin approval.
            </Typography>
            <TextField
              margin="normal"
              fullWidth
              label="Reason for Deletion (Optional)"
              multiline
              rows={4}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Please provide a reason for requesting deletion of this team..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRequestDialog}>Cancel</Button>
          <Button onClick={handleSubmitRequest} variant="contained" color="error">
            Submit Delete Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
     <Snackbar
  open={snackbar.open}
  autoHideDuration={5000}
  onClose={handleCloseSnackbar}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
  <Alert
    onClose={handleCloseSnackbar}
    severity={snackbar.severity}
    // variant="filled"
    sx={{
      width: '100%',
      minWidth: 350,
      fontWeight: 600
    }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>
    </Box>
  );
};

export default TeamManagement;