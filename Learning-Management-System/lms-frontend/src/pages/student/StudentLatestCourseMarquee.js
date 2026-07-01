import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import api from '../../api';

const marqueeStyle = {
  width: '320px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  position: 'relative',
  borderRadius: 8,
  background: '#f3f6fa',
  border: '1px solid #e0e0e0',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  height: 38,
  display: 'flex',
  alignItems: 'center',
};

const scrollTextStyle = {
  display: 'inline-block',
  paddingLeft: '100%',
  animation: 'scroll-left 12s linear infinite',
  fontWeight: 600,
  color: '#1565c0',
  fontSize: 16,
};

const keyframes = `
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
`;

function StudentLatestCourseMarquee() {
  const [lastCourse, setLastCourse] = useState(null);

  useEffect(() => {
    const fetchLastAssignedCourse = async () => {
      try {
        const response = await api.get('/enrollments/');
        const courses = Array.isArray(response.data) ? response.data : [];
        // Sort by enrollment date descending (assuming 'enrolled_at' exists, else fallback to id)
        courses.sort((a, b) => {
          const dateA = new Date(a.enrolled_at || a.created_at || 0);
          const dateB = new Date(b.enrolled_at || b.created_at || 0);
          return dateB - dateA;
        });
        if (courses.length > 0) {
          setLastCourse(courses[0]);
        }
      } catch (err) {
        setLastCourse(null);
      }
    };
    fetchLastAssignedCourse();
  }, []);

  if (!lastCourse || !lastCourse.course) return null;

  return (
    <Box sx={marqueeStyle}>
      <style>{keyframes}</style>
      <Typography component="span" sx={scrollTextStyle}>
        {`Last assigned course: ${lastCourse.course.title}`}
      </Typography>
    </Box>
  );
}

export default StudentLatestCourseMarquee;