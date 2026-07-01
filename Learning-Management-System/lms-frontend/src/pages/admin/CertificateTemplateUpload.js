import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import api from '../../api';

const parseUploadError = (err) => {
  const data = err?.response?.data || {};
  if (err?.response?.status === 403) {
    return data.error || data.detail || 'You need an admin or staff account to upload certificate templates.';
  }
  if (Array.isArray(data.missing_placeholders) && data.missing_placeholders.length) {
    return `Your template is missing these placeholders:\n${data.missing_placeholders
      .map((placeholder) => `  - ${placeholder}`)
      .join('\n')}`;
  }
  return data.error || 'Upload failed. Make sure the file is a valid .docx with all required placeholders.';
};

const CourseTemplatesTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingCourseId, setViewingCourseId] = useState(null);
  const [uploadingCourseId, setUploadingCourseId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fileInputRef = useRef(null);
  const uploadCourseIdRef = useRef(null);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, statusRes] = await Promise.allSettled([
        api.get('/courses/'),
        api.get('/certificate-template/courses/'),
      ]);

      const baseCourses =
        coursesRes.status === 'fulfilled'
          ? Array.isArray(coursesRes.value?.data)
            ? coursesRes.value.data
            : Array.isArray(coursesRes.value?.data?.results)
              ? coursesRes.value.data.results
              : []
          : [];

      const statusMap = new Map();
      if (statusRes.status === 'fulfilled') {
        (statusRes.value?.data?.courses || []).forEach((item) => {
          statusMap.set(String(item.course_id ?? item.id), item);
        });
      }

      const merged = baseCourses
        .filter((course) => course?.id && course?.title)
        .map((course) => {
          const status = statusMap.get(String(course.id));
          return {
            course_id: course.id,
            course_name: course.title,
            has_template: status?.has_template ?? false,
          };
        })
        .sort((a, b) => a.course_name.localeCompare(b.course_name));

      setRows(merged);
    } catch {
      showSnackbar('Failed to load courses.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? rows.filter((row) => row.course_name.toLowerCase().includes(query)) : rows;
  }, [rows, search]);

  const handleView = async (row) => {
    if (!row.has_template) {
      showSnackbar('No template uploaded for this course yet.', 'info');
      return;
    }

    setViewingCourseId(String(row.course_id));
    try {
      const res = await api.get(`/certificate-template/courses/${row.course_id}/file/`, {
        responseType: 'blob',
      });
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], {
              type: res.headers?.['content-type'] || 'application/octet-stream',
            });
      const url = window.URL.createObjectURL(blob);
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${row.course_name}_template.docx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'Failed to open template.', 'error');
    } finally {
      setViewingCourseId(null);
    }
  };

  const handleUploadClick = (courseId) => {
    uploadCourseIdRef.current = String(courseId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    const courseId = uploadCourseIdRef.current;
    event.target.value = '';

    if (!file || !courseId) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      showSnackbar('Only Word (.docx) files are allowed.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('template', file);

    setUploadingCourseId(courseId);
    try {
      await api.post('/upload_certificate_template/', formData);
      showSnackbar('Template uploaded successfully.', 'success');
      await fetchCourses();
    } catch (err) {
      showSnackbar(parseUploadError(err), 'error');
    } finally {
      setUploadingCourseId(null);
      uploadCourseIdRef.current = null;
    }
  };

  const busy = Boolean(uploadingCourseId) || Boolean(viewingCourseId);

  return (
    <Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={10000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
          borderColor: 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Course-Specific Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use this only when a particular course needs a different certificate design.
        </Typography>
        <TextField
          size="small"
          placeholder="Search course..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <input ref={fileInputRef} type="file" accept=".docx" hidden onChange={handleFileChange} />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Course Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 90 }}>
                View
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 90 }}>
                Upload
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    {search ? 'No courses match your search.' : 'No courses found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const isViewing = String(viewingCourseId) === String(row.course_id);
                const isUploading = String(uploadingCourseId) === String(row.course_id);

                return (
                  <TableRow key={row.course_id} hover>
                    <TableCell>{row.course_name}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={row.has_template ? 'View uploaded template' : 'No template uploaded yet'}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!row.has_template || busy}
                            onClick={() => handleView(row)}
                          >
                            {isViewing ? <CircularProgress size={18} /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Upload Word template (.docx)">
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={busy}
                            onClick={() => handleUploadClick(row.course_id)}
                          >
                            {isUploading ? <CircularProgress size={18} /> : <UploadIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const AllCoursesTemplateTab = () => {
  const [hasTemplate, setHasTemplate] = useState(false);
  const [checking, setChecking] = useState(true);
  const [viewing, setViewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fileInputRef = useRef(null);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const checkCommonTemplate = async () => {
    setChecking(true);
    try {
      await api.get('/certificate-template/common/file/', { responseType: 'blob' });
      setHasTemplate(true);
    } catch {
      setHasTemplate(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkCommonTemplate();
  }, []);

  const handleView = async () => {
    setViewing(true);
    try {
      const res = await api.get('/certificate-template/common/file/', {
        responseType: 'blob',
      });
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], {
              type: res.headers?.['content-type'] || 'application/octet-stream',
            });
      const url = window.URL.createObjectURL(blob);
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'common_certificate_template.docx';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      showSnackbar('Failed to open current template.', 'error');
    } finally {
      setViewing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      showSnackbar('Only Word (.docx) files are allowed.', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('template', selectedFile);

    setUploading(true);
    try {
      await api.post('/upload_certificate_template/', formData);
      showSnackbar('Template uploaded successfully for all courses.', 'success');
      setSelectedFile(null);
      setHasTemplate(true);
    } catch (err) {
      showSnackbar(parseUploadError(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={10000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ whiteSpace: 'pre-wrap', maxWidth: 420 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          maxWidth: 760,
          borderRadius: 4,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
          borderColor: 'rgba(15, 23, 42, 0.08)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Certificate Template For All Courses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload one certificate template to use across all courses. Individual courses can still have their own template when needed.
        </Typography>

        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            bgcolor: '#f8fafc',
            border: '1px solid rgba(15, 23, 42, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {checking ? (
            <CircularProgress size={18} />
          ) : (
            <>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 2,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: hasTemplate ? '#dcfce7' : '#f3f4f6',
                  color: hasTemplate ? '#166534' : '#6b7280',
                }}
              >
                {hasTemplate ? 'Active template available' : 'No template uploaded'}
              </Box>
              {hasTemplate && (
                <Tooltip title="View current template">
                  <span>
                    <IconButton size="small" color="primary" onClick={handleView} disabled={viewing}>
                      {viewing ? <CircularProgress size={18} /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </>
          )}
        </Box>

        <input ref={fileInputRef} type="file" accept=".docx" hidden onChange={handleFileSelect} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            disabled={uploading}
          >
            {selectedFile ? selectedFile.name : 'Choose Template'}
          </Button>
          {selectedFile && (
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
            >
              {hasTemplate ? 'Replace For All Courses' : 'Upload For All Courses'}
            </Button>
          )}
          {selectedFile && (
            <Button size="small" color="error" onClick={() => setSelectedFile(null)} disabled={uploading}>
              Clear
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

const CertificateTemplateUpload = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        Certificate Templates
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="All Courses" />
        <Tab label="Individual Courses" />
      </Tabs>

      {tab === 0 && <AllCoursesTemplateTab />}
      {tab === 1 && <CourseTemplatesTab />}
    </Box>
  );
};

export default CertificateTemplateUpload;
