import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  WorkspacePremium as CertificateIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { courseService } from '../../api/courses';

const Certificates = () => {
  const theme = useTheme();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await courseService.getUserCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (courseId) => {
    try {
      const response = await courseService.generateCertificate(courseId);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers
      let filename = 'certificate.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        filename = disposition
          .split('filename=')[1]
          .split(';')[0]
          .replace(/['"]/g, '');
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      let message = 'Failed to download certificate';
      const errorData = err?.response?.data;
      if (errorData instanceof Blob) {
        try {
          const text = await errorData.text();
          const parsed = JSON.parse(text);
          message = parsed?.error || parsed?.detail || message;
        } catch {
          // Keep generic fallback
        }
      } else {
        message = errorData?.error || errorData?.detail || message;
      }
      alert(message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Certificate UUID copied to clipboard');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <CertificateIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          My Certificates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and download your earned certificates
        </Typography>
      </Box>

      {certificates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CertificateIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Certificates Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete courses to earn certificates. Your certificates will appear here once you finish a course.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {certificates.map((certificate) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={certificate.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CertificateIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {certificate.course.title}
                    </Typography>
                    <Chip
                      icon={<VerifiedIcon />}
                      label="Verified"
                      color="success"
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Brisk Script' }}>
                    Awarded to: {certificate.user.first_name} {certificate.user.last_name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Completed on: {formatDate(certificate.completion_date || certificate.generated_at)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Issued on: {formatDate(certificate.issue_date || certificate.generated_at)}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Certificate ID:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'Brisk Script',
                          fontSize: '0.75rem',
                          color: theme.palette.text.secondary,
                          wordBreak: 'break-all'
                        }}
                      >
                        {certificate.certificate_number || certificate.certificate_uuid}
                      </Typography>
                      <Tooltip title="Copy certificate ID">
                        <IconButton 
                          size="small"
                          onClick={() => copyToClipboard(certificate.certificate_number || certificate.certificate_uuid)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadCertificate(certificate.course.id)}
                      sx={{ flexGrow: 1 }}
                    >
                      Download
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 4, p: 3, bgcolor: theme.palette.grey[50], borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          About Certificate Verification
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Each certificate has a unique certificate ID that can be used to verify its authenticity.
          You can share this ID with employers or institutions to verify your certificate.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          To verify a certificate, visit: <strong>your-domain.com/verify-certificate/[CERTIFICATE-ID]</strong>
        </Typography>
      </Box>
    </Box>
  );
};

export default Certificates;