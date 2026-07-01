import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  History as HistoryIcon,
  OndemandVideo as VideoIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import api from '../../api';

const CRITERIA = [
  { key: 'watching_videos',  label: 'Watching Videos',  max: 30, icon: <VideoIcon fontSize="small" /> },
  { key: 'quiz_completion',  label: 'Quiz Completion',  max: 30, icon: <QuizIcon fontSize="small" /> },
  { key: 'assignment',       label: 'Assignment',       max: 20, icon: <AssignmentIcon fontSize="small" /> },
  { key: 'final_completion', label: 'Final Completion', max: 20, icon: <CheckCircleIcon fontSize="small" /> },
];

const toDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const rankColor = (rank) => {
  if (rank === 1) return { bg: '#ffd700', color: '#7b5b00' };
  if (rank === 2) return { bg: '#e0e0e0', color: '#444' };
  if (rank === 3) return { bg: '#cd7f32', color: '#fff' };
  return { bg: '#f3f4f6', color: '#374151' };
};

const CreditPoints = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total_credit_points: 0, courses: [] });
  const [others, setOthers] = useState([]);
  const [myName, setMyName] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);

  const openHistoryDialog = (event) => {
    event.currentTarget.blur();
    setHistoryOpen(true);
  };

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      api.get('/student/credit-points/'),
      api.get('/student/credit-points/others/'),
      api.get('/users/me/'),
    ]).then(([myRes, othersRes, meRes]) => {
      if (!alive) return;
      if (myRes.status === 'fulfilled') setData(myRes.value.data || {});
      if (othersRes.status === 'fulfilled') setOthers(Array.isArray(othersRes.value.data?.others) ? othersRes.value.data.others : []);
      if (meRes.status === 'fulfilled') {
        const u = meRes.value.data;
        setMyName(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'You');
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const courses = Array.isArray(data.courses) ? data.courses : [];
  const total = Number(data.total_credit_points) || 0;
  const completedCount = courses.filter((c) => c.is_completed).length;

  // Build full leaderboard: merge current user + others, sort desc
  const leaderboard = [
    { id: 'me', name: myName || 'You', credit_points: total, isMe: true },
    ...others.map((o) => ({ ...o, isMe: false })),
  ]
    .sort((a, b) => b.credit_points - a.credit_points || a.name.localeCompare(b.name))
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // History: one row per course per activity that earned > 0 points
  const history = [];
  courses.forEach((course) => {
    const bd = course.breakdown || {};
    CRITERIA.forEach((c) => {
      const pts = Number(bd[c.key]) || 0;
      if (pts > 0) {
        history.push({
          course: course.title,
          activity: c.label,
          icon: c.icon,
          points: pts,
          max: c.max,
          date: course.completed_on,
        });
      }
    });
  });

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e7eefb, #c7d7eb)', px: { xs: 2, sm: 3, md: 6 }, py: { xs: 2, md: 3 } }}>

      {/* ── Header card ── */}
      <Card sx={{ borderRadius: { xs: '16px', md: '28px' }, background: '#1f3570', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', px: { xs: 2, sm: 3, md: 5 }, py: { xs: 2, md: 3 }, mb: 3, position: 'relative' }}>

        {/* History button — top right corner */}
        <IconButton
          onClick={openHistoryDialog}
          size="small"
          sx={{ position: 'absolute', top: { xs: 12, md: 20 }, right: { xs: 12, md: 20 }, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
        >
          <Tooltip title="View Points History" arrow>
            <HistoryIcon fontSize="small" />
          </Tooltip>
        </IconButton>

        <Typography fontSize={{ xs: 22, md: 32 }} fontWeight={700}>Credit Points</Typography>
        <Typography fontSize={{ xs: 13, md: 15 }} color="#c7d2fe" mt={0.5}>
          Points are earned per course based on 4 activities (max 100 per course).
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mt={3}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography fontSize={{ xs: 42, md: 64 }} fontWeight={700} lineHeight={1}>{loading ? '…' : total}</Typography>
            <Typography fontSize={{ xs: 16, md: 18 }} fontWeight={600}>Total points</Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', background: '#e5e7eb', color: '#1f3570', px: 2, py: 0.8, borderRadius: '30px', fontWeight: 600, gap: 1 }}>
            <TrophyIcon fontSize="small" />
            {completedCount} course{completedCount !== 1 ? 's' : ''} completed
          </Box>
        </Stack>

      </Card>

      {/* ── History Dialog ── */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}>
        <DialogTitle sx={{ bgcolor: '#1f3570', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ fontSize: 20 }} />
            <Typography fontWeight={700} fontSize={16}>Points History</Typography>
          </Box>
          <IconButton size="small" onClick={() => setHistoryOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1f3570' }}>
                  <TableCell sx={{ color: '#c7d2fe', fontWeight: 700, minWidth: 160, pl: 3 }}>Course</TableCell>
                  {CRITERIA.map((c) => (
                    <Tooltip key={c.key} title={`${c.label} (max ${c.max} pts)`} arrow>
                      <TableCell align="center" sx={{ color: '#c7d2fe', fontWeight: 700, minWidth: 80, cursor: 'default' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                          {c.icon}
                          <Typography variant="caption" sx={{ color: '#a5b4fc', fontSize: 11, lineHeight: 1 }}>{c.max} pts</Typography>
                        </Box>
                      </TableCell>
                    </Tooltip>
                  ))}
                  <TableCell align="center" sx={{ color: '#c7d2fe', fontWeight: 700, minWidth: 90 }}>Total</TableCell>
                  <TableCell align="center" sx={{ color: '#c7d2fe', fontWeight: 700, minWidth: 100 }}>Status</TableCell>
                  <TableCell align="right" sx={{ color: '#c7d2fe', fontWeight: 700, minWidth: 110, pr: 3 }}>Completed On</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} sx={{ py: 4 }}><LinearProgress /></TableCell></TableRow>
                ) : courses.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No courses enrolled yet.</TableCell></TableRow>
                ) : courses.map((course, idx) => {
                  const bd = course.breakdown || {};
                  const courseTotal = Number(course.credit_points) || 0;
                  return (
                    <TableRow key={course.id ?? idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, pl: 3 }}>{course.title}</TableCell>
                      {CRITERIA.map((c) => {
                        const earned = Number(bd[c.key]) || 0;
                        const pct = Math.round((earned / c.max) * 100);
                        return (
                          <TableCell key={c.key} align="center">
                            <Tooltip title={`${earned} / ${c.max} pts`}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{earned}</Typography>
                                <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 3, mt: 0.3, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: pct === 100 ? '#22c55e' : pct > 0 ? '#3b82f6' : '#e5e7eb' } }} />
                              </Box>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                      <TableCell align="center">
                        <Chip label={`${courseTotal} pts`} size="small" sx={{ fontWeight: 700, bgcolor: courseTotal >= 100 ? '#dcfce7' : courseTotal > 0 ? '#dbeafe' : '#f3f4f6', color: courseTotal >= 100 ? '#166534' : courseTotal > 0 ? '#1e40af' : '#6b7280' }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={course.is_completed ? 'Completed' : 'In Progress'} size="small" color={course.is_completed ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 13, pr: 3 }}>{toDate(course.completed_on)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Leaderboard ── */}
      <Card sx={{ borderRadius: '20px', overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#1f3570', px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontWeight={700} color="#fff" fontSize={16}>Student Leaderboard</Typography>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 50 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Student</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} sx={{ py: 3 }}><LinearProgress /></TableCell></TableRow>
                ) : leaderboard.length === 0 ? (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: 13 }}>No data yet.</TableCell></TableRow>
                ) : leaderboard.map((entry) => {
                  const rc = rankColor(entry.rank);
                  return (
                    <TableRow key={entry.id} hover sx={{ bgcolor: entry.isMe ? 'rgba(31,53,112,0.06)' : 'transparent' }}>
                      <TableCell>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: rc.bg, color: rc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                          {entry.rank}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={entry.isMe ? 700 : 400}>
                          {entry.name}{entry.isMe ? ' (You)' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${entry.credit_points} pts`}
                          size="small"
                          sx={{ bgcolor: entry.isMe ? '#f6e3a3' : '#f3f4f6', color: entry.isMe ? '#7b5b00' : '#374151', fontWeight: 700, fontSize: 12 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Card>

    </Box>
  );
};

export default CreditPoints;
