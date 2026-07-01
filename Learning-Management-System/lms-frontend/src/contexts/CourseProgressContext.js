import React, { createContext, useContext, useState } from 'react';

const CourseProgressContext = createContext();

export const useCourseProgress = () => useContext(CourseProgressContext);

export const CourseProgressProvider = ({ children }) => {
  const [courseProgress, setCourseProgress] = useState(0);

  return (
    <CourseProgressContext.Provider value={{ courseProgress, setCourseProgress }}>
      {children}
    </CourseProgressContext.Provider>
  );
}; 