import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  MailOutline as MailOutlineIcon,
  Public as PublicIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import api from '../../api';

// ---- Shared design tokens for this page ---------------------------------
const ACCENT = '#0f6b4f'; // deep emerald, echoes "certified / approved"
const ACCENT_DARK = '#0b5240';
const ACCENT_SOFT = '#e6f4ee';
const SURFACE = 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)';
const BORDER = 'rgba(15, 23, 42, 0.08)';

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

// ---- Individual course templates -----------------------------------------
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
          background: SURFACE,
          borderColor: BORDER,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Course-specific templates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use this only when a particular course needs its own certificate design. Courses without a
          custom template fall back to the design on the "All Courses" tab.
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

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 3, borderColor: BORDER, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 700 }}>Course name</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }}>Status</TableCell>
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
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
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
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.has_template ? 'Custom template' : 'Using default'}
                        sx={{
                          fontWeight: 600,
                          bgcolor: row.has_template ? ACCENT_SOFT : '#f1f5f9',
                          color: row.has_template ? ACCENT_DARK : '#64748b',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={row.has_template ? 'View uploaded template' : 'No template uploaded yet'}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!row.has_template || busy}
                            onClick={() => handleView(row)}
                            sx={{ color: ACCENT }}
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
                            disabled={busy}
                            onClick={() => handleUploadClick(row.course_id)}
                            sx={{ color: ACCENT_DARK }}
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

// ---- All-courses (global default) template --------------------------------
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

  const infoCards = [
    {
      icon: <ShieldIcon sx={{ color: ACCENT }} fontSize="small" />,
      title: 'Secure Verification',
      body: 'Every certificate includes a unique ID and blockchain-backed verification link.',
    },
    {
      icon: <MailOutlineIcon sx={{ color: ACCENT }} fontSize="small" />,
      title: 'Auto-Delivery',
      body: 'Certificates are automatically generated and emailed upon final exam passing.',
    },
  ];

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

      <input ref={fileInputRef} type="file" accept=".docx" hidden onChange={handleFileSelect} />

      <Box
        sx={{
          bgcolor: '#eef1f6',
          borderRadius: 5,
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {/* Left: upload zone + feature cards */}
        <Box
          sx={{
            flex: '1 1 520px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: selectedFile ? ACCENT : '#cbd5e1',
              background: '#ffffff',
              transition: 'border-color 0.2s ease',
            }}
          >
            {checking ? (
              <CircularProgress size={22} />
            ) : (
              <>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: hasTemplate || selectedFile ? ACCENT_SOFT : '#eef2f7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 30, color: hasTemplate || selectedFile ? ACCENT : '#94a3b8' }} />
                </Box>

                <Typography variant="h6" fontWeight={700}>
                  {selectedFile ? selectedFile.name : hasTemplate ? 'Template active for all courses' : 'No template uploaded'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3, maxWidth: 420, mx: 'auto' }}>
                  {selectedFile
                    ? 'Ready to upload. This will apply to every course without its own custom template.'
                    : 'Upload a high-resolution PDF or SVG file to use as the base for all your course certificates.'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                    sx={{
                      borderColor: ACCENT,
                      color: ACCENT_DARK,
                      fontWeight: 600,
                      '&:hover': { borderColor: ACCENT_DARK, bgcolor: ACCENT_SOFT },
                    }}
                  >
                    Choose Template
                  </Button>

                  {selectedFile && (
                    <>
                      <Button
                        variant="contained"
                        onClick={handleUpload}
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
                        sx={{ bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: ACCENT_DARK } }}
                      >
                        {hasTemplate ? 'Replace for all courses' : 'Upload for all courses'}
                      </Button>
                      <Button size="small" color="error" onClick={() => setSelectedFile(null)} disabled={uploading}>
                        Clear
                      </Button>
                    </>
                  )}
                </Box>
              </>
            )}
          </Paper>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 0.5, flex: 1 }}>
            {infoCards.map((card) => (
              <Paper
                key={card.title}
                variant="outlined"
                sx={{
                  flex: '1 1 240px',
                  minWidth: 0,
                  p: 2.5,
                  borderRadius: 3,
                  borderColor: '#e2e8f0',
                  background: '#ffffff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  {card.icon}
                  <Typography variant="subtitle2" fontWeight={700}>
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.body}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* Right: persistent status panel — always visible, content adapts to state */}
        <Box sx={{ flex: '1 1 360px', minWidth: 0, display: 'flex' }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              borderColor: '#e2e8f0',
              background: '#ffffff',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {checking ? (
              <CircularProgress size={20} />
            ) : (
              <>
                <Chip
                  size="small"
                  icon={
                    hasTemplate ? (
                      <CheckCircleIcon sx={{ fontSize: '16px !important', color: `${ACCENT} !important` }} />
                    ) : (
                      <PublicIcon sx={{ fontSize: '16px !important', color: `${ACCENT} !important` }} />
                    )
                  }
                  label={hasTemplate ? 'CUSTOM TEMPLATE' : 'GLOBAL SYSTEM DEFAULT'}
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: ACCENT_SOFT,
                    color: ACCENT_DARK,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: 0.4,
                    mb: 2,
                  }}
                />

                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
                  {hasTemplate ? 'Your uploaded certificate design' : 'Standard Accreditation Design'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  {hasTemplate
                    ? 'This is the template you uploaded. It\'s applied automatically to every course unless that course has its own design on the "Individual Courses" tab.'
                    : 'This template is automatically applied to all courses unless a course-specific design is explicitly uploaded. It ensures a professional, consistent brand experience across your entire LMS.'}
                </Typography>

                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, color: '#64748b' }}>
                  ACTIVE ELEMENTS
                </Typography>
                <Box sx={{ mt: 1.5, mb: 3, flex: 1 }}>
                  {[
                    'Dynamic Student Name',
                    'Course Title & Completion Date',
                    'Verification ID & QR Code',
                    'Digital Signature Placeholder',
                  ].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: ACCENT }} />
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ mt: 'auto', display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleView}
                    disabled={viewing || !hasTemplate}
                    sx={{ borderColor: BORDER, color: '#0f172a', fontWeight: 600 }}
                  >
                    {viewing ? <CircularProgress size={16} /> : 'View History'}
                  </Button>
                  <Tooltip title="Placeholder positions and styling — coming soon">
                    <span style={{ flex: 1 }}>
                      <Button
                        fullWidth
                        disabled
                        sx={{
                          bgcolor: '#e4e7fb',
                          color: '#4338ca',
                          fontWeight: 600,
                          '&.Mui-disabled': { bgcolor: '#e4e7fb', color: '#4338ca', opacity: 0.7 },
                        }}
                      >
                        Edit Overlay Logic
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      </Box>
      </Box>
    </Box>
  );
};

const CertificateTemplateUpload = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box p={3}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Certificate Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Design and manage credential designs for your automated certification workflows.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ bgcolor: ACCENT, fontWeight: 700, '&:hover': { bgcolor: ACCENT_DARK } }}
        >
          Create New
        </Button>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{
          mb: 3,
          mt: 2,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
          '& .Mui-selected': { color: `${ACCENT_DARK} !important` },
          '& .MuiTabs-indicator': { backgroundColor: ACCENT },
        }}
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