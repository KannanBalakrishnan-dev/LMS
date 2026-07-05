import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { AutoAwesome as StudyIcon } from '@mui/icons-material';

const StudyAssistant = () => (
  <Box sx={{ p: 3, maxWidth: 760, mx: 'auto' }}>
    <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
      Study Assistant
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Generate summaries, flashcards, and practice questions from your course content.
    </Typography>
    <Paper
      variant="outlined"
      sx={{ p: 5, borderRadius: 3, textAlign: 'center', borderStyle: 'dashed' }}
    >
      <StudyIcon sx={{ fontSize: 36, color: '#1E3A6B', mb: 1.5 }} />
      <Typography variant="body1" fontWeight={600}>Coming soon</Typography>
      <Typography variant="body2" color="text.secondary">
        This feature is on the roadmap.
      </Typography>
    </Paper>
  </Box>
);

export default StudyAssistant;