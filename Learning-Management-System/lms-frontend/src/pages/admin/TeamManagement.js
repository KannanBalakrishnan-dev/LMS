import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, FormControl, InputLabel, Select, MenuItem, Menu, OutlinedInput, Card,
  Divider, Stack, Avatar, Badge, Snackbar, Alert, Table, TableBody, TableCell, TableHead,
  TableRow, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon,
  PersonAdd as PersonAddIcon, PersonRemove as PersonRemoveIcon,
  School as SchoolIcon, Groups as GroupsIcon, Assignment as AssignmentIcon,
  Search as SearchIcon,
  NotificationsNone as NotificationsIcon,
  MoreVert as MoreVertIcon, FilterList as FilterListIcon,
  Sort as SortIcon, KeyboardArrowDown as KeyboardArrowDownIcon,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const AVATAR_COLORS = ['#e74c3c','#8e44ad','#2980b9','#27ae60','#e67e22','#16a085','#d35400','#6c3483'];

// Hoisted to module scope (previously re-created on every render inside the
// component even though the values never change).
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

// ---------------------------------------------------------------------------
// Real percentage-change calculation: previous month vs this month.
// Same concept used on the Admin Dashboard's stat cards.
//   prevMonthValue: total as of the end of last month (0 if no data exists for it)
//   thisMonthValue: current running total for this month
// Rules:
//   - normal case: standard % change formula
//   - previous month = 0, this month > 0  -> +100% (went from nothing to something)
//   - previous month = 0, this month = 0  -> 0% (no change, nothing to report)
// ---------------------------------------------------------------------------
const computeChange = (prevMonthValue, thisMonthValue) => {
  if (thisMonthValue === undefined || thisMonthValue === null) return null;

  const prev = prevMonthValue ?? 0;
  const current = thisMonthValue;

  if (prev === 0) {
    if (current === 0) return { pct: 0, label: '0.0%', isPositive: true };
    return { pct: 100, label: '+100.0%', isPositive: true };
  }

  const pct = ((current - prev) / prev) * 100;
  const sign = pct > 0 ? '+' : ''; // negative numbers already carry their own "-" from toFixed
  return {
    pct,
    label: `${sign}${pct.toFixed(1)}%`,
    isPositive: pct >= 0,
  };
};

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Notifications (placeholder until a real endpoint is wired up)
  const [unreadNotificationCount] = useState(0);

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

  // Per-row "..." actions menu (single shared instance, rendered once below)
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuTeam, setMenuTeam] = useState(null);

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
          (team.name || '').toLowerCase().includes(term) ||
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
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [teams, searchTerm, statusFilter, sortBy]);

  // Paginated teams
  const paginatedTeams = useMemo(() => {
    return filteredTeams.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredTeams, page, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(filteredTeams.length / rowsPerPage));

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1));
    }
  }, [pageCount, page]);

  // ---------------------------------------------------------------------------
  // Month-over-month stats for the 4 summary cards.
  //
  // "Total Teams" and "Active Teams" can be computed for real right now, because
  // each team has an `id` we can use as a rough proxy for creation order, and
  // (when the backend sends it) a `created_at` field lets us split teams into
  // "existed before this month" vs "exists now".
  //
  // "Total Members" and "Courses Assigned" are aggregates across teams
  // (members_count / courses.length) and the backend doesn't currently send a
  // join date per member or per course assignment, so there's no way to know
  // which of those were added last month vs this month. Until that data exists,
  // those two fall back to comparing against a 0 baseline — same convention as
  // the Admin Dashboard cards: nothing to compare against yet -> "+100%" if
  // there's any current activity, "0%" if there's none.
  //
  // Once the backend adds e.g. `created_at` on team-membership and course
  // assignment records, swap the `?? 0` fallbacks below for real prev-month
  // counts and everything downstream (computeChange, the arrows, the colors)
  // keeps working exactly as-is.
  // ---------------------------------------------------------------------------
  const teamStats = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const teamsBeforeThisMonth = teams.filter(
      (t) => t.created_at && new Date(t.created_at) < startOfThisMonth
    );
    // If no team has a created_at field yet, we have no real baseline — fall back to 0
    // (same "no data yet" convention as everywhere else), rather than silently miscounting.
    const hasCreatedAtData = teams.some((t) => !!t.created_at);

    const totalTeamsThisMonth = teams.length;
    const totalTeamsPrevMonth = hasCreatedAtData ? teamsBeforeThisMonth.length : 0;

    const activeTeamsThisMonth = teams.filter((t) => t.is_active === true || t.is_active === 1).length;
    const activeTeamsPrevMonth = hasCreatedAtData
      ? teamsBeforeThisMonth.filter((t) => t.is_active === true || t.is_active === 1).length
      : 0;

    const totalMembersThisMonth = teams.reduce((sum, t) => sum + (t.members_count || 0), 0);
    const coursesAssignedThisMonth = teams.reduce((sum, t) => sum + (t.courses?.length || 0), 0);

    return {
      totalTeams: { value: totalTeamsThisMonth, prevMonth: totalTeamsPrevMonth, thisMonth: totalTeamsThisMonth },
      totalMembers: { value: totalMembersThisMonth, prevMonth: 0, thisMonth: totalMembersThisMonth },
      coursesAssigned: { value: coursesAssignedThisMonth, prevMonth: 0, thisMonth: coursesAssignedThisMonth },
      activeTeams: { value: activeTeamsThisMonth, prevMonth: activeTeamsPrevMonth, thisMonth: activeTeamsThisMonth },
    };
  }, [teams]);

  // Updates a single team in local state without re-fetching (and re-hydrating)
  // the entire team list. Member/course mutations already return the full,
  // updated team from the API — there's no need to refetch everything else too.
  const patchTeamInList = (updatedTeam) => {
    setTeams(prev => prev.map(t => (t.id === updatedTeam.id ? updatedTeam : t)));
  };

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

  const handleOpenMemberDialog = async (team) => {
    try {
      const response = await api.get(`/teams/${team.id}/`);
      setEditTeam(response.data);
      setOpenMemberDialog(true);
    } catch (error) {
      console.error('Error fetching team details:', error);
    }
  };

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

      if (editTeam) {
        // Only this one team changed — patch it in place instead of
        // re-fetching (and re-hydrating with a detail call) every team.
        const refreshed = await api.get(`/teams/${teamId}/`);
        patchTeamInList(refreshed.data);
      } else {
        // A new team was created, so the list itself changed shape —
        // a full refetch is the simplest correct option here.
        fetchTeams();
      }
      showSnackbar(editTeam ? 'Team updated successfully' : 'Team created successfully', 'success');
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving team:', error);
      showSnackbar('Failed to save team', 'error');
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post(`/teams/${editTeam.id}/members/`, {
        user_id: selectedUser
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      patchTeamInList(response.data);
      setSelectedUser('');
    } catch (error) {
      console.error('Error adding member:', error);
      showSnackbar('Failed to add member', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/teams/${editTeam.id}/members/${userId}/`);
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      patchTeamInList(response.data);
    } catch (error) {
      console.error('Error removing member:', error);
      showSnackbar('Failed to remove member', 'error');
    }
  };

  const handleAssignCourses = async () => {
    try {
      await api.put(`/teams/${editTeam.id}/assign_courses/`, {
        course_ids: selectedCourses,
      });
      const response = await api.get(`/teams/${editTeam.id}/`);
      setEditTeam(response.data);
      patchTeamInList(response.data);
      handleCloseCourseDialog();
      showSnackbar('Courses assigned successfully', 'success');
    } catch (error) {
      console.error('Error assigning courses:', error);
      showSnackbar('Failed to assign courses', 'error');
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
      showSnackbar('Deletion request submitted', 'success');
    } catch (error) {
      console.error('Error submitting request:', error);
      showSnackbar('Failed to submit deletion request', 'error');
    }
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
              backgroundColor: '#312E81',
              '&:hover': { backgroundColor: '#27235f' }
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
          { label: 'Total Teams', ...teamStats.totalTeams, icon: GroupsIcon, iconColor: '#4f46e5', iconBg: '#ede9fe' },
          { label: 'Total Members', ...teamStats.totalMembers, icon: PersonAddIcon, iconColor: '#16a34a', iconBg: '#dcfce7' },
          { label: 'Courses Assigned', ...teamStats.coursesAssigned, icon: SchoolIcon, iconColor: '#2563eb', iconBg: '#dbeafe' },
          { label: 'Active Teams', ...teamStats.activeTeams, icon: AssignmentIcon, iconColor: '#d97706', iconBg: '#fef3c7' },
        ].map((stat, idx) => {
          const IconComponent = stat.icon;
          const change = computeChange(stat.prevMonth, stat.thisMonth);
          const trendColor = change ? (change.isPositive ? '#16a34a' : '#dc2626') : '#9ca3af';
          const TrendArrow = change && !change.isPositive ? ArrowDownwardIcon : ArrowUpwardIcon;
          return (
            <Card key={idx} elevation={0} sx={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px', p: 2, bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box sx={{ width: 64, height: 36, borderRadius: '999px', bgcolor: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconComponent sx={{ fontSize: 20, color: stat.iconColor }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>{stat.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <TrendArrow sx={{ fontSize: 13, color: trendColor }} />
                      <Typography sx={{ fontSize: '0.75rem', color: trendColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {change ? change.label : '0.0%'}
                      </Typography>
                    </Box>
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

      {/* FILTER & SORT ROW */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
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
            {loading && teams.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Loading teams…
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredTeams.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {teams.length === 0 ? 'No teams yet — create one to get started.' : 'No teams match your search or filters.'}
                </TableCell>
              </TableRow>
            )}
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
                    <Box
                      onClick={() => handleOpenMemberDialog(team)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
                    >
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
                          {team.team_lead?.username || team.team_lead || 'No lead assigned'}
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Single shared row-actions menu (was previously duplicated once per row) */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl && menuTeam)}
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

        {/* FOOTER - Pagination Info & Controls (inside the table card) */}
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

      {/* Team Dialog */}
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
                      try {
                        await api.delete(`/teams/${editTeam.id}/members/${member.id}/`);
                        const r = await api.get(`/teams/${editTeam.id}/`);
                        setEditTeam(r.data);
                        patchTeamInList(r.data);
                      } catch (error) {
                        console.error('Error removing member:', error);
                        showSnackbar('Failed to remove member', 'error');
                      }
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
                    try {
                      await api.post(`/teams/${editTeam.id}/members/`, { user_id: dialogSelectedUser });
                      const r = await api.get(`/teams/${editTeam.id}/`);
                      setEditTeam(r.data);
                      patchTeamInList(r.data);
                      setDialogSelectedUser('');
                    } catch (error) {
                      console.error('Error adding member:', error);
                      showSnackbar('Failed to add member', 'error');
                    }
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

      {/* Member Dialog */}
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
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.username}
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

      {/* Assign Courses Dialog */}
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
                        sx={{ borderRadius: '12px', '& .MuiChip-icon': { color: '#0000ff' } }}
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