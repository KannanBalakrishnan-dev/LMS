import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Button,
  Stack,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  WorkspacePremium as CertificateIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarMonthIcon,
  MenuBook as MenuBookIcon,
  RestartAlt as RestartAltIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { courseService } from '../api/courses';

const BLANK_UUID_MESSAGE = 'Paste a certificate ID to start verification.';
const INVALID_UUID_MESSAGE = 'Certificate not found or invalid. Please check the certificate ID and try again.';

const CertificateVerification = () => {
  const theme = useTheme();
  const { certificateUuid } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uuidInput, setUuidInput] = useState(certificateUuid || '');
  const [copyStatus, setCopyStatus] = useState('');
  const [lastCheckedUuid, setLastCheckedUuid] = useState('');

  const accentPalette = useMemo(
    () =>
      theme.palette.mode === 'dark'
        ? {
            bgStart: '#031420',
            bgEnd: '#20120a',
            heroSurface: 'rgba(9, 20, 33, 0.78)',
            cardSurface: 'rgba(15, 23, 42, 0.82)',
            border: 'rgba(148, 163, 184, 0.25)',
            primary: '#22d3ee',
            primarySoft: '#67e8f9',
            success: '#34d399',
            error: '#fda4af',
            textPrimary: '#f8fafc',
            textSecondary: '#cbd5e1',
            glow: 'rgba(34, 211, 238, 0.30)',
            shadow: '0 28px 55px rgba(2, 6, 23, 0.55)',
            inputSurface: 'rgba(15, 23, 42, 0.75)'
          }
        : {
            bgStart: '#ecfeff',
            bgEnd: '#fff7ed',
            heroSurface: 'rgba(255, 255, 255, 0.84)',
            cardSurface: '#ffffff',
            border: 'rgba(15, 23, 42, 0.10)',
            primary: '#0f766e',
            primarySoft: '#14b8a6',
            success: '#10b981',
            error: '#dc2626',
            textPrimary: '#0f172a',
            textSecondary: '#475569',
            glow: 'rgba(20, 184, 166, 0.30)',
            shadow: '0 24px 50px rgba(15, 23, 42, 0.12)',
            inputSurface: 'rgba(255, 255, 255, 0.94)'
          },
    [theme.palette.mode]
  );

  const verifyCertificate = useCallback(async (uuid) => {
    const normalizedUuid = (uuid || '').trim();
    if (!normalizedUuid) {
      setCertificate(null);
      setError(BLANK_UUID_MESSAGE);
      setLastCheckedUuid('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastCheckedUuid(normalizedUuid);
      const data = await courseService.verifyCertificate(normalizedUuid);
      setCertificate(data.certificate);
    } catch (err) {
      console.error('Error verifying certificate:', err);
      setCertificate(null);
      setError(INVALID_UUID_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUuidInput(certificateUuid || '');
    if (certificateUuid) {
      verifyCertificate(certificateUuid);
    }
  }, [certificateUuid, verifyCertificate]);

  useEffect(() => {
    if (!copyStatus) return undefined;
    const timeout = setTimeout(() => setCopyStatus(''), 2200);
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const handleVerify = (event) => {
    event.preventDefault();
    verifyCertificate(uuidInput);
  };

  const handleReset = () => {
    setCertificate(null);
    setError(null);
    setUuidInput('');
    setCopyStatus('');
  };

  const handleCopyUuid = async () => {
    const certificateId = certificate?.certificate_number || certificate?.uuid;
    if (!certificateId) return;
    try {
      await navigator.clipboard.writeText(certificateId);
      setCopyStatus('Certificate ID copied to clipboard');
    } catch {
      setCopyStatus('Could not copy. Please copy manually.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box
      sx={{
        '--cv-bg-start': accentPalette.bgStart,
        '--cv-bg-end': accentPalette.bgEnd,
        '--cv-primary': accentPalette.primary,
        '--cv-primary-soft': accentPalette.primarySoft,
        '--cv-success': accentPalette.success,
        '--cv-error': accentPalette.error,
        '--cv-surface': accentPalette.heroSurface,
        '--cv-card': accentPalette.cardSurface,
        '--cv-border': accentPalette.border,
        '--cv-text': accentPalette.textPrimary,
        '--cv-muted': accentPalette.textSecondary,
        '--cv-glow': accentPalette.glow,
        '--cv-shadow': accentPalette.shadow,
        '--cv-input': accentPalette.inputSurface,
        minHeight: '100vh',
        py: { xs: 3, md: 6 },
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(1200px 400px at -5% 10%, rgba(45, 212, 191, 0.20), transparent 60%), radial-gradient(1200px 350px at 105% 20%, rgba(251, 146, 60, 0.14), transparent 65%), linear-gradient(145deg, var(--cv-bg-start), var(--cv-bg-end))',
        fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
        '@keyframes floatBlob': {
          '0%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-16px) translateX(12px)' },
          '100%': { transform: 'translateY(0px) translateX(0px)' }
        },
        '@keyframes riseIn': {
          '0%': { opacity: 0, transform: 'translateY(14px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          width: { xs: 220, md: 300 },
          height: { xs: 220, md: 300 },
          top: { xs: -60, md: -80 },
          left: { xs: -80, md: -90 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.35), rgba(20, 184, 166, 0))',
          filter: 'blur(8px)',
          animation: 'floatBlob 9s ease-in-out infinite'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: { xs: 280, md: 340 },
          height: { xs: 280, md: 340 },
          bottom: { xs: -130, md: -160 },
          right: { xs: -130, md: -160 },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 146, 60, 0.30), rgba(251, 146, 60, 0))',
          filter: 'blur(12px)',
          animation: 'floatBlob 12s ease-in-out infinite reverse'
        }
      }}
    >
      <Box sx={{ maxWidth: 980, mx: 'auto', position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4.5 },
            borderRadius: 4,
            mb: 3,
            border: '1px solid var(--cv-border)',
            background: 'linear-gradient(160deg, var(--cv-surface), rgba(255,255,255,0.06))',
            backdropFilter: 'blur(10px)',
            boxShadow: 'var(--cv-shadow)',
            animation: 'riseIn 380ms ease-out both'
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: '20px',
                display: 'grid',
                placeItems: 'center',
                color: 'white',
                background: 'linear-gradient(150deg, var(--cv-primary), var(--cv-primary-soft))',
                boxShadow: '0 12px 30px var(--cv-glow)'
              }}
            >
              <CertificateIcon sx={{ fontSize: 34 }} />
            </Box>
            <Box>
              <Typography sx={{ color: 'var(--cv-primary)', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', fontSize: 12 }}>
                Trust Center
              </Typography>
              <Typography variant="h3" component="h1" sx={{ color: 'var(--cv-text)', fontSize: { xs: '1.9rem', md: '2.35rem' }, fontWeight: 700, lineHeight: 1.15 }}>
                Certificate Verification
              </Typography>
              <Typography sx={{ color: 'var(--cv-muted)', mt: 1.1, fontSize: { xs: '.95rem', md: '1rem' } }}>
                Validate certificates instantly and confirm that achievements were issued by this LMS.
              </Typography>
            </Box>
          </Stack>

          <Box component="form" onSubmit={handleVerify} sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
            <TextField
              fullWidth
              value={uuidInput}
              onChange={(event) => setUuidInput(event.target.value)}
              placeholder="Paste certificate ID"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--cv-primary)' }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 99,
                  backgroundColor: 'var(--cv-input)',
                  '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.36)' },
                  '&:hover fieldset': { borderColor: 'var(--cv-primary)' }
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                minWidth: { xs: '100%', sm: 170 },
                borderRadius: 99,
                px: 3,
                fontWeight: 700,
                background: 'linear-gradient(140deg, var(--cv-primary), var(--cv-primary-soft))',
                boxShadow: '0 14px 30px var(--cv-glow)',
                '&:hover': {
                  background: 'linear-gradient(140deg, var(--cv-primary), var(--cv-primary-soft))',
                  filter: 'brightness(1.06)'
                }
              }}
            >
              {loading ? 'Checking...' : 'Verify Now'}
            </Button>
          </Box>
        </Paper>

        <Card
          sx={{
            borderRadius: 4,
            border: '1px solid var(--cv-border)',
            mb: 3,
            backgroundColor: 'var(--cv-card)',
            boxShadow: 'var(--cv-shadow)',
            animation: 'riseIn 440ms ease-out both'
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {loading && (
              <Box sx={{ textAlign: 'center', py: 2.5 }}>
                <CircularProgress size={56} sx={{ color: 'var(--cv-primary)', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'var(--cv-text)', fontWeight: 700 }}>
                  Verifying certificate...
                </Typography>
                <Typography sx={{ color: 'var(--cv-muted)', mt: 0.8 }}>
                  Please wait while we validate this certificate ID against issued records.
                </Typography>
              </Box>
            )}

            {!loading && error && (
              <Box sx={{ textAlign: 'center', py: 1.5 }}>
                <ErrorIcon sx={{ fontSize: 56, color: 'var(--cv-error)', mb: 1.5 }} />
                <Typography variant="h5" sx={{ color: 'var(--cv-text)', fontWeight: 700, mb: 0.8 }}>
                  Unable to verify certificate
                </Typography>
                <Typography sx={{ color: 'var(--cv-muted)', mb: 0.8 }}>
                  {error}
                </Typography>
                {lastCheckedUuid && (
                  <Typography sx={{ color: 'var(--cv-muted)', fontSize: '.9rem' }}>
                    Certificate ID: <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{lastCheckedUuid}</Box>
                  </Typography>
                )}
              </Box>
            )}

            {!loading && !error && !certificate && (
              <Box sx={{ textAlign: 'center', py: 1.5 }}>
                <CertificateIcon sx={{ fontSize: 56, color: 'var(--cv-primary)', mb: 1.5 }} />
                <Typography variant="h5" sx={{ color: 'var(--cv-text)', fontWeight: 700, mb: 0.8 }}>
                  Ready to verify
                </Typography>
                <Typography sx={{ color: 'var(--cv-muted)' }}>
                  Enter any certificate ID above to confirm authenticity.
                </Typography>
              </Box>
            )}

            {!loading && certificate && (
              <Box sx={{ py: 0.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon sx={{ color: 'var(--cv-success)', fontSize: 34 }} />
                      <Typography variant="h5" sx={{ color: 'var(--cv-text)', fontWeight: 700 }}>
                        Certificate Verified
                      </Typography>
                    </Stack>
                    <Typography sx={{ color: 'var(--cv-muted)', mt: 0.8 }}>
                      This certificate is authentic and exists in our official issuance records.
                    </Typography>
                  </Box>
                  <Chip
                    icon={<VerifiedIcon />}
                    label="Authentic"
                    sx={{
                      fontWeight: 700,
                      height: 36,
                      color: '#064e3b',
                      background: 'linear-gradient(140deg, #6ee7b7, #34d399)'
                    }}
                  />
                </Stack>

                <Divider sx={{ my: 2.8 }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'var(--cv-border)', bgcolor: 'transparent' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                        <VerifiedIcon sx={{ color: 'var(--cv-primary)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--cv-muted)', fontWeight: 600 }}>
                          Certificate ID
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", "Consolas", monospace', color: 'var(--cv-text)', fontSize: '.95rem', wordBreak: 'break-all' }}>
                        {certificate.certificate_number || certificate.uuid}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'var(--cv-border)', bgcolor: 'transparent' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                        <CalendarMonthIcon sx={{ color: 'var(--cv-primary)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--cv-muted)', fontWeight: 600 }}>
                          Issue Date
                        </Typography>
                      </Stack>
                      <Typography sx={{ color: 'var(--cv-text)', fontWeight: 600 }}>
                        {formatDate(certificate.issue_date || certificate.generated_at)}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'var(--cv-border)', bgcolor: 'transparent' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                        <PersonIcon sx={{ color: 'var(--cv-primary)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--cv-muted)', fontWeight: 600 }}>
                          Awarded To
                        </Typography>
                      </Stack>
                      <Typography sx={{ color: 'var(--cv-text)', fontWeight: 600 }}>
                        {certificate.user_name || 'Not available'}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'var(--cv-border)', bgcolor: 'transparent' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                        <MenuBookIcon sx={{ color: 'var(--cv-primary)' }} />
                        <Typography variant="body2" sx={{ color: 'var(--cv-muted)', fontWeight: 600 }}>
                          Course Title
                        </Typography>
                      </Stack>
                      <Typography sx={{ color: 'var(--cv-text)', fontWeight: 600 }}>
                        {certificate.course_title || 'Not available'}
                      </Typography>
                    </Paper>
                  </Grid>

                  {certificate.course_description && (
                    <Grid size={{ xs: 12 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: 'var(--cv-border)', bgcolor: 'transparent' }}>
                        <Typography variant="body2" sx={{ color: 'var(--cv-muted)', fontWeight: 600, mb: 0.8 }}>
                          Course Description
                        </Typography>
                        <Typography sx={{ color: 'var(--cv-text)' }}>
                          {certificate.course_description}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.8 }}>
                  <Button
                    onClick={handleCopyUuid}
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    sx={{ borderRadius: 99, borderColor: 'var(--cv-border)', color: 'var(--cv-text)' }}
                  >
                    Copy certificate ID
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="text"
                    startIcon={<RestartAltIcon />}
                    sx={{ borderRadius: 99, color: 'var(--cv-primary)', fontWeight: 700 }}
                  >
                    Verify Another
                  </Button>
                  {copyStatus && (
                    <Typography sx={{ color: 'var(--cv-muted)', fontSize: '.92rem', alignSelf: 'center' }}>
                      {copyStatus}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            border: '1px solid var(--cv-border)',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.16))',
            animation: 'riseIn 520ms ease-out both'
          }}
        >
          <Typography variant="h6" sx={{ color: 'var(--cv-text)', fontWeight: 700, mb: 0.8 }}>
            Why this page matters
          </Typography>
          <Typography sx={{ color: 'var(--cv-muted)', mb: 0.8 }}>
            Every issued certificate includes a unique certificate ID. This page confirms that the ID exists in trusted records and belongs to a real course completion.
          </Typography>
          <Typography sx={{ color: 'var(--cv-muted)' }}>
            For hiring, admissions, or audits, share both the certificate file and this verification check for stronger proof.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default CertificateVerification; 