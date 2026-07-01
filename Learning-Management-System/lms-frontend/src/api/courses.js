import api from './index';

export const courseService = {
    getAllCourses: async () => {
        const response = await api.get('/courses/');
        return response.data;
    },

    getCourse: async (id) => {
        const response = await api.get(`/courses/${id}/`);
        return response.data;
    },

    createCourse: async (courseData) => {
        const response = await api.post('/courses/', courseData);
        return response.data;
    },

    updateCourse: async (id, courseData) => {
        const response = await api.put(`/courses/${id}/`, courseData);
        return response.data;
    },

    deleteCourse: async (id) => {
        await api.delete(`/courses/${id}/`);
    },

    enrollCourse: async (courseId) => {
        const response = await api.post(`/courses/${courseId}/enroll/`);
        return response.data;
    },

    getCourseAnalytics: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/analytics/`);
        return response.data;
    },

    // Certificate related functions
    downloadCertificate: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/download_certificate/`, {
            responseType: 'blob'
        });
        return response;
    },

    generateCertificate: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/generate_certificate/`, {
            responseType: 'blob'
        });
        return response;
    },

    verifyCertificate: async (certificateUuid) => {
        const response = await api.get(`/verify-certificate/${certificateUuid}/`);
        return response.data;
    },

    getUserCertificates: async () => {
        const response = await api.get('/certificates/');
        return response.data;
    }
};