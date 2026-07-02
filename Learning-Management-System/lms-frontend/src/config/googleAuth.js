const DEFAULT_CLIENT_ID =
  '145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://vdart-lms.netlify.app',
  'https://learning-management-system-4i6f.onrender.com',
];

const splitEnvList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin.replace(/\/$/, '');
};

export const getGoogleClientId = () => {
  return (
    process.env.REACT_APP_GOOGLE_CLIENT_ID?.trim() ||
    DEFAULT_CLIENT_ID
  );
};

export const getGoogleAuthAvailability = ({ isOnline = true } = {}) => {
  const disabled =
    String(process.env.REACT_APP_DISABLE_GOOGLE_AUTH || '').toLowerCase() ===
    'true';

  const clientId = getGoogleClientId();
  const currentOrigin = getCurrentOrigin();

  const configuredOrigins = splitEnvList(
    process.env.REACT_APP_GOOGLE_ALLOWED_ORIGINS
  );

  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : DEFAULT_ALLOWED_ORIGINS;

  // Google auth manually disabled
  if (disabled) {
    return {
      available: false,
      reason: 'disabled',
      message:
        'Google sign-in is currently disabled for this environment.',
    };
  }

  // No internet
  if (!isOnline) {
    return {
      available: false,
      reason: 'offline',
      message:
        'Google sign-in requires an internet connection. Please reconnect and try again.',
    };
  }

  // Missing client ID
  if (!clientId) {
    return {
      available: false,
      reason: 'missing_client_id',
      message:
        'Google sign-in is not configured. Add REACT_APP_GOOGLE_CLIENT_ID.',
    };
  }

  // Origin not allowed
  if (
    currentOrigin &&
    !allowedOrigins.some(
      (origin) =>
        origin.toLowerCase() === currentOrigin.toLowerCase()
    )
  ) {
    return {
      available: false,
      reason: 'origin_not_allowed',
      message: `Google sign-in is not enabled for this origin: ${currentOrigin}`,
    };
  }

  return {
    available: true,
    reason: 'available',
    message: '',
  };
};