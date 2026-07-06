import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';

const ChatHistory = () => (
  <Box sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>
    <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
      Chat History
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Your past conversations with the AI Tutor and Study Assistant.
    </Typography>
    <Paper
      variant="outlined"
      sx={{ p: 5, borderRadius: 3, textAlign: 'center', borderStyle: 'dashed' }}
    >
      <HistoryIcon sx={{ fontSize: 36, color: '#1E3A6B', mb: 1.5 }} />
      <Typography variant="body1" fontWeight={600}>No conversations yet</Typography>
      <Typography variant="body2" color="text.secondary">
        Start a chat in AI Tutor and it will show up here.
      </Typography>
    </Paper>
  </Box>
);

export default ChatHistory;