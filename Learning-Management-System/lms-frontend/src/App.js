// src/App.js
import React from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getTheme } from './theme';
import { CourseProgressProvider } from './contexts/CourseProgressContext';
import { GoogleOAuthProvider } from "@react-oauth/google";

// Layouts
import AdminLayout from './components/layouts/AdminLayout';
import StudentLayout from './components/layouts/StudentLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/Home';
import HomeCourseDetails from './pages/HomeCourseDetails';
import PublicCourses from './pages/PublicCourses';
import CertificateVerification from './pages/CertificateVerification';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseManagement from './pages/admin/CourseManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import TeamManagement from './pages/admin/TeamManagement';
import AdminAnalytics from './pages/admin/Analytics';

import CertificateTemplateUpload from './pages/admin/CertificateTemplateUpload';
import RequestManagement from './pages/admin/RequestManagement';
import DeletedActions from './pages/admin/DeletedActions';
import FeedbackManagement from './pages/admin/FeedbackManagement';


// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import CourseCatalog from './pages/student/CourseCatalog';
import MyCourses from './pages/student/MyCourses';
import CourseView from './pages/student/CourseView';
import StudentPerformance from './pages/student/Performance';
import StudentFeedback from './pages/student/StudentFeedback';
import CreditPoints from './pages/student/CreditPoints';

// Lesson Page (NO BLUE BOX)
import LessonPage from './pages/LessonPage';

const GOOGLE_CLIENT_ID = (
    process.env.REACT_APP_GOOGLE_CLIENT_ID ||
    '145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com'
).trim();

const getDashboardPathForUser = (user) => {
    if (user?.user_type === 'ADMIN' || user?.user_type === 'STAFF') {
        return '/admin';
    }

    if (user?.user_type === 'STUDENT' || user?.user_type === 'EMPLOYEE') {
        return '/userlogin';
    }

    return '/';
};


// ✅ Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    if (allowedRoles && !allowedRoles.includes(user.user_type)) {
        return <Navigate to={getDashboardPathForUser(user)} replace />;
    }

    return children;
};

const PublicHomeRoute = () => {
    const { user } = useAuth();
    const dashboardPath = getDashboardPathForUser(user);

    if (user && dashboardPath !== '/') {
        return <Navigate to={dashboardPath} replace />;
    }

    return <Home />;
};

function AppContent() {
    return (
        <ThemeProvider theme={getTheme()}>
            <CssBaseline />
            <CourseProgressProvider>
                <AuthProvider>
                    <Router>
                        <Routes>
                            {/* ✅ Auth Routes */}
                            <Route path="/" element={<PublicHomeRoute />} />
                            <Route path="/home" element={<Navigate to="/" replace />} />
                            <Route path="/courses" element={<PublicCourses />} />
                            <Route path="/home/details" element={<HomeCourseDetails />} />
                            <Route path="/verify-certificate" element={<CertificateVerification />} />
                            <Route path="/verify-certificate/:certificateUuid" element={<CertificateVerification />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />

                            {/* ✅ This LessonPage is OUTSIDE layout — No Blue Box */}
                            <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPage />} />

                            {/* ✅ Admin Routes */}
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>

                                        <AdminLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<AdminDashboard />} />
                                <Route path="users" element={<UserManagement />} />
                                <Route path="courses" element={<CourseManagement />} />
                                <Route path="categories" element={<CategoryManagement />} />
                                <Route path="teams" element={<TeamManagement />} />
                                <Route path="analytics" element={<AdminAnalytics />} />
                                <Route path="certificates" element={<CertificateTemplateUpload />} />
                                <Route path="CertificateTemplateUpload" element={<CertificateTemplateUpload />} />
                                <Route path="requests" element={<RequestManagement />} />
                                <Route path="deleted-actions" element={<DeletedActions />} />
                                <Route path="feedback" element={<FeedbackManagement />} />

                            </Route>

                            {/* ✅ Student Routes with StudentLayout (Blue Box) */}
                            <Route
                                path="/userlogin"
                                element={
                                    <ProtectedRoute allowedRoles={['STUDENT', 'EMPLOYEE']}>
                                        <StudentLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<StudentDashboard />} />
                            </Route>

                            <Route
                                element={
                                    <ProtectedRoute allowedRoles={['STUDENT', 'EMPLOYEE']}>
                                        <StudentLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route path="catalog" element={<CourseCatalog />} />
                                <Route path="my-courses" element={<MyCourses />} />
                                <Route path="credit-points" element={<CreditPoints />} />
                                <Route path="course/:id" element={<CourseView />} />
                                <Route path="performance" element={<StudentPerformance />} />
                                <Route path="feedback" element={<StudentFeedback />} />
                            </Route>

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Router>
                </AuthProvider>
            </CourseProgressProvider>
        </ThemeProvider>
    );
}

function App() {
    const appContent = <AppContent />;

    if (!GOOGLE_CLIENT_ID) {
        return appContent;
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {appContent}
        </GoogleOAuthProvider>
    );
}

export default App;
