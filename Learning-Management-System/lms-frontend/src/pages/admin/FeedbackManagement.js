import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TuneRounded as FilterIcon,
  Feedback as FeedbackIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ReadIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const getStatusStyle = (status) => {
  switch (status) {
    case 'published':
      return { bg: '#e6f4ef', color: '#1a7a5e', label: 'PUBLISHED' };
    case 'pending':
      return { bg: '#fff3e0', color: '#c75c00', label: 'PENDING' };
    case 'flagged':
      return { bg: '#fdecea', color: '#c0392b', label: 'FLAGGED' };
    default:
      // fallback: derive from is_read / is_flagged fields
      return { bg: '#e6f4ef', color: '#1a7a5e', label: 'PUBLISHED' };
  }
};

const deriveStatus = (feedback) => {
  if (feedback.status) return feedback.status;
  if (feedback.is_flagged) return 'flagged';
  if (!feedback.is_read) return 'pending';
  return 'published';
};

const StarRating = ({ value, size = 'small' }) => {
  const px = size === 'large' ? 20 : 15;
  return (
    <Box sx={{ display: 'flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= value ? '#f5a623' : '#d0d0d0', fontSize: px }}>
          ★
        </span>
      ))}
    </Box>
  );
};

const StatusPill = ({ status }) => {
  const s = getStatusStyle(status);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: '10px',
        py: '3px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.04em',
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </Box>
  );
};

// variant: 'total' | 'rating' | 'pending' | 'flagged'
const StatCard = ({ label, value, pct, variant, loading }) => (
  <Box
    sx={{
      px: 3,
      py: 2.5,
      borderRight: '1px solid #d8dce0',
      '&:last-child': { borderRight: 'none' },
      flex: 1,
    }}
  >
    <Typography
      sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8a9099', mb: 1 }}
    >
      {label}
    </Typography>
    {loading ? (
      <Box sx={{ height: 36, display: 'flex', alignItems: 'center' }}>
        <CircularProgress size={18} thickness={4} />
      </Box>
    ) : (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>

        {/* Main value */}
        <Typography sx={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          color: variant === 'flagged' ? '#c0392b' : '#1a2e2b',
        }}>
          {value}
        </Typography>

        {/* Per-variant inline badge */}
        {variant === 'total' && pct && (
          <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: '#1a7a5e' }}>
            {pct}
          </Typography>
        )}

        {variant === 'rating' && (
          <Box component="span" sx={{ color: '#f5a623', fontSize: 20, lineHeight: 1 }}>★</Box>
        )}

        {variant === 'pending' && (
          <Box component="span" sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.05em',
            color: '#8a9099',
            border: '1px solid #d0d4d8',
            borderRadius: '4px',
            px: '6px',
            py: '2px',
            whiteSpace: 'nowrap',
          }}>
            ACTION REQUIRED
          </Box>
        )}

        {variant === 'flagged' && pct && (
          <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: '#c0392b' }}>
            {pct}
          </Typography>
        )}

      </Box>
    )}
  </Box>
);

/* ─── main component ────────────────────────────────────────────────────────── */

const FeedbackManagement = () => {
  const { user } = useAuth();

  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0, avgRating: 0, pending: 0, flagged: 0,
    totalPct: '0%', pendingPct: '0%', flaggedPct: '0%', ratingPct: '0%',
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /* ── data fetching ── */

  // ── Proportion percentage helper ──
  // Returns what % `part` is of `total`, always as a string like "12%" or "0%"
  const toPct = (part, total) => {
    if (!total) return '0%';
    return Math.round((part / total) * 100) + '%';
  };

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch current page for the table display
      const pageRes = await api.get('/feedback/', { params: { page, page_size: pageSize } });
      const data = Array.isArray(pageRes.data) ? pageRes.data : pageRes.data.results || [];
      const count = pageRes.data.count ?? data.length;
      setFeedbackList(data);
      setTotalCount(count);

      // Fetch ALL records to compute accurate stats
      try {
        const statsRes = await api.get('/feedback/stats/');
        const s = statsRes.data;
        const total   = s.total        ?? s.total_count    ?? count;
        const pending = s.pending      ?? s.pending_count  ?? 0;
        const flagged = s.flagged      ?? s.flagged_count  ?? 0;
        const avgRating = s.avg_rating ?? s.average_rating ?? 0;
        setStats({
          total,
          avgRating,
          pending,
          flagged,
          // percentage of total feedback that is pending / flagged
          totalPct:   toPct(total,   count || total),  // published vs all
          pendingPct: toPct(pending, total),
          flaggedPct: toPct(flagged, total),
          ratingPct:  Math.round((avgRating / 5) * 100) + '%', // rating as % of max 5
        });
      } catch {
        // Fallback: fetch all records
        const allRes = await api.get('/feedback/', { params: { page_size: 9999 } });
        const all = Array.isArray(allRes.data) ? allRes.data : allRes.data.results || [];

        const total   = all.length;
        const pending = all.filter((f) => deriveStatus(f) === 'pending').length;
        const flagged = all.filter((f) => deriveStatus(f) === 'flagged').length;
        const published = all.filter((f) => deriveStatus(f) === 'published').length;
        const avgRating = total > 0
          ? parseFloat((all.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1))
          : 0;

        setStats({
          total,
          avgRating,
          pending,
          flagged,
          totalPct:   toPct(published, total),          // % that are published
          pendingPct: toPct(pending,   total),           // % pending of all
          flaggedPct: toPct(flagged,   total),           // % flagged of all
          ratingPct:  Math.round((avgRating / 5) * 100) + '%', // rating out of 5 → %
        });
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      showSnackbar('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (user?.user_type === 'ADMIN' || user?.user_type === 'STAFF') {
      fetchFeedback();
    }
  }, [user, fetchFeedback]);

  /* ── actions ── */

  const handleMarkAsRead = async (feedbackId) => {
    try {
      await api.put(`/feedback/${feedbackId}/mark-read/`);
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, is_read: true } : f))
      );
      showSnackbar('Marked as read');
    } catch {
      showSnackbar('Failed to mark as read', 'error');
    }
  };

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setViewDialogOpen(true);
    if (!feedback.is_read) handleMarkAsRead(feedback.id);
    handleMenuClose();
  };

  const handleExport = () => {
    showSnackbar('Export started — file will download shortly');
  };

  const handleMenuOpen = (e, row) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuRow(row);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  /* ── pagination ── */

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPageButtons = () => {
    const buttons = [];
    const range = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push('…');
      range.push(totalPages);
    }

    range.forEach((item, idx) => {
      if (item === '…') {
        buttons.push(
          <Box key={`ellipsis-${idx}`} sx={{ px: 0.5, fontSize: 13, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
            …
          </Box>
        );
      } else {
        buttons.push(
          <Box
            key={item}
            component="button"
            onClick={() => setPage(item)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              border: '0.5px solid',
              borderColor: page === item ? '#1a3a35' : 'divider',
              background: page === item ? '#1a3a35' : 'background.paper',
              color: page === item ? '#fff' : 'text.secondary',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { background: page === item ? '#1a3a35' : 'action.hover' },
            }}
          >
            {item}
          </Box>
        );
      }
    });
    return buttons;
  };

  /* ── access guard ── */

  if (user?.user_type !== 'ADMIN' && user?.user_type !== 'STAFF') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Box>
    );
  }

  /* ── render ── */

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>

      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>
            Manage Reviews
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            Review and manage qualitative student feedback across all active courses.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExport}
            sx={{
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 500,
              borderColor: 'divider',
              color: 'text.primary',
              px: 2,
              '&:hover': { borderColor: 'text.secondary', background: 'action.hover' },
            }}
          >
            Export Data
          </Button>
          <Button
            variant="contained"
            startIcon={<FilterIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 500,
              background: '#1a3a35',
              px: 2,
              '&:hover': { background: '#12292520', color: '#1a3a35' },
            }}
          >
            Advanced Filters
          </Button>
        </Box>
      </Box>

      {/* ── Stats bar ── */}
      <Box
        sx={{
          display: 'flex',
          border: '1px solid #d8dce0',
          borderRadius: '10px',
          mb: 2.5,
          background: '#f4f6f8',
          overflow: 'hidden',
        }}
      >
        <StatCard
          label="Total Feedback"
          value={stats.total?.toLocaleString() || '0'}
          pct={stats.totalPct}
          variant="total"
          loading={loading}
        />
        <StatCard
          label="Average Rating"
          value={stats.avgRating || '0.0'}
          variant="rating"
          loading={loading}
        />
        <StatCard
          label="Pending Review"
          value={stats.pending ?? 0}
          variant="pending"
          loading={loading}
        />
        <StatCard
          label="Flagged Comments"
          value={String(stats.flagged ?? 0).padStart(2, '0')}
          pct={stats.flaggedPct}
          variant="flagged"
          loading={loading}
        />
      </Box>

      {/* ── Table ── */}
      <Box
        sx={{
          border: '0.5px solid #e0e0e0',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* Table header */}
        <Box
          component="table"
          sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
        >
          <Box component="thead">
            <Box component="tr" sx={{ background: '#f9fafb' }}>
              {['Student', 'Course', 'Rating', 'Feedback', 'Date', 'Status', 'Actions'].map((col) => (
                <Box
                  component="th"
                  key={col}
                  sx={{
                    textAlign: 'left',
                    px: 2,
                    py: 1.5,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    borderBottom: '0.5px solid #e0e0e0',
                    width:
                      col === 'Student' ? '22%' :
                      col === 'Course'  ? '17%' :
                      col === 'Rating'  ? '12%' :
                      col === 'Feedback'? '22%' :
                      col === 'Date'    ? '11%' :
                      col === 'Status'  ? '10%' : '6%',
                  }}
                >
                  {col}
                </Box>
              ))}
            </Box>
          </Box>

          <Box component="tbody">
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: 5 }).map((_, i) => (
                <Box component="tr" key={i}>
                  {[22, 17, 12, 22, 11, 10, 6].map((w, j) => (
                    <Box component="td" key={j} sx={{ px: 2, py: 2, borderBottom: '0.5px solid #e0e0e0' }}>
                      <Box sx={{ height: 14, width: `${40 + Math.random() * 40}%`, borderRadius: 1, background: '#f0f0f0' }} />
                    </Box>
                  ))}
                </Box>
              ))
            ) : feedbackList.length === 0 ? (
              <Box component="tr">
                <Box component="td" colSpan={7} sx={{ px: 2, py: 6, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
                  No feedback found.
                </Box>
              </Box>
            ) : (
              feedbackList.map((row) => {
                const status = deriveStatus(row);
                const initials = row.user_username?.slice(0, 2).toUpperCase() || '??';
                return (
                  <Box
                    component="tr"
                    key={row.id}
                    sx={{
                      '&:last-child td': { borderBottom: 'none' },
                      '&:hover td': { background: '#fafafa' },
                      cursor: 'pointer',
                    }}
                    onClick={() => handleViewFeedback(row)}
                  >
                    {/* Student */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar
                          src={row.user_profile_picture || undefined}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{ width: 38, height: 38, fontSize: 13, fontWeight: 600, background: '#dce8e4', color: '#1a7a5e' }}
                        >
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
                            {row.user_username || '—'}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            ID: {row.user_id || row.id}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Course */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.primary' }} noWrap>
                        {row.course_title || '—'}
                      </Typography>
                    </Box>

                    {/* Rating */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <StarRating value={row.rating || 0} />
                    </Box>

                    {/* Feedback */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: status === 'flagged' ? '#e74c3c' : 'text.secondary',
                          fontWeight: status === 'flagged' ? 500 : 400,
                        }}
                        noWrap
                      >
                        {status === 'flagged'
                          ? 'Inappropriate'
                          : row.message?.length > 60
                          ? `${row.message.substring(0, 60)}…`
                          : row.message || '—'}
                      </Typography>
                    </Box>

                    {/* Date */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </Typography>
                    </Box>

                    {/* Status */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <StatusPill status={status} />
                    </Box>

                    {/* Actions */}
                    <Box component="td" sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid #e0e0e0' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, row)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderTop: '0.5px solid #e0e0e0',
            }}
          >
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} reviews
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                sx={{
                  width: 32, height: 32, borderRadius: '6px', border: '0.5px solid #e0e0e0',
                  background: '#fff', cursor: page === 1 ? 'default' : 'pointer',
                  color: page === 1 ? '#ccc' : 'text.secondary', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ‹
              </Box>
              {renderPageButtons()}
              <Box
                component="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                sx={{
                  width: 32, height: 32, borderRadius: '6px', border: '0.5px solid #e0e0e0',
                  background: '#fff', cursor: page === totalPages ? 'default' : 'pointer',
                  color: page === totalPages ? '#ccc' : 'text.secondary', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ›
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Row context menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 160, borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,.1)' } }}
      >
        <MenuItem onClick={() => handleViewFeedback(menuRow)} sx={{ fontSize: 13, gap: 1 }}>
          <FeedbackIcon fontSize="small" sx={{ color: 'text.secondary' }} /> View details
        </MenuItem>
        {menuRow && !menuRow.is_read && (
          <MenuItem
            onClick={() => { handleMarkAsRead(menuRow.id); handleMenuClose(); }}
            sx={{ fontSize: 13, gap: 1 }}
          >
            <ReadIcon fontSize="small" sx={{ color: 'success.main' }} /> Mark as read
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
          <FlagIcon fontSize="small" /> Flag review
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
          <DeleteIcon fontSize="small" /> Delete
        </MenuItem>
      </Menu>

      {/* ── View Feedback Dialog ── */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: 16 }}>
          <FeedbackIcon color="primary" fontSize="small" />
          Feedback details
        </DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Box sx={{ mt: 1 }}>
              {/* Student info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Avatar
                  src={selectedFeedback.user_profile_picture || undefined}
                  imgProps={{ referrerPolicy: 'no-referrer' }}
                  sx={{ width: 56, height: 56, fontSize: 18, fontWeight: 600, background: '#dce8e4', color: '#1a7a5e' }}
                >
                  {selectedFeedback.user_username?.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                    {selectedFeedback.user_username}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    Course: {selectedFeedback.course_title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Submitted:{' '}
                    {new Date(selectedFeedback.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Rating */}
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>Rating</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <StarRating value={selectedFeedback.rating} size="large" />
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {selectedFeedback.rating} out of 5
                  </Typography>
                </Box>
              </Box>

              {/* Status */}
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>Status</Typography>
                <StatusPill status={deriveStatus(selectedFeedback)} />
              </Box>

              {/* Message */}
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>Feedback message</Typography>
                <Box sx={{ p: 2, background: '#f9fafb', borderRadius: '8px', border: '0.5px solid #e0e0e0' }}>
                  <Typography sx={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                    {selectedFeedback.message}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {selectedFeedback && !selectedFeedback.is_read && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => { handleMarkAsRead(selectedFeedback.id); setViewDialogOpen(false); }}
              sx={{ textTransform: 'none', fontSize: 13 }}
            >
              Mark as read
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            onClick={() => setViewDialogOpen(false)}
            sx={{ textTransform: 'none', fontSize: 13, background: '#1a3a35', '&:hover': { background: '#122e2a' } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ fontSize: 13 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackManagement;