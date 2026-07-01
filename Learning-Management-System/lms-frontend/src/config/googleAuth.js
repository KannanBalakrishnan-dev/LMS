const DEFAULT_CLIENT_ID = '145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://vdart-lms.netlify.app',
  'https://learning-management-system-4i6f.onrender.com',
];

const splitEnvList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
};

export const getGoogleClientId = () =>
  (process.env.REACT_APP_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID).trim();

export const getGoogleAuthAvailability = ({ isOnline = true } = {}) => {
  const disabled = String(process.env.REACT_APP_DISABLE_GOOGLE_AUTH || '').toLowerCase() === 'true';
  const clientId = getGoogleClientId();
  const currentOrigin = getCurrentOrigin();
  const configuredOrigins = splitEnvList(process.env.REACT_APP_GOOGLE_ALLOWED_ORIGINS);
  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;

  if (disabled) {
    return {
      available: false,
      reason: 'disabled',
      message: 'Google sign-in is currently disabled for this environment.',
    };
  }

  if (!isOnline) {
    return {
      available: false,
      reason: 'offline',
      message: 'Google sign-in needs an internet connection. Please reconnect and try again.',
    };
  }

  if (!clientId) {
    return {
      available: false,
      reason: 'missing_client_id',
      message: 'Google sign-in is not configured yet. Add REACT_APP_GOOGLE_CLIENT_ID to enable it.',
    };
  }

  if (
    currentOrigin &&
    !allowedOrigins.includes(currentOrigin)
  ) {
    return {
      available: false,
      reason: 'origin_not_allowed',
      message: 'Google sign-in is not enabled for this site origin. Use username/password or add this origin in Google Cloud and REACT_APP_GOOGLE_ALLOWED_ORIGINS.',
    };
  }

  return {
    available: true,
    reason: 'available',
    message: '',
  };
};
