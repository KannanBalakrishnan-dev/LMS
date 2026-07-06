# settings.py
import os
import sys
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse

import os
from dotenv import load_dotenv

load_dotenv()
from decouple import config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
BASE_DIR = Path(__file__).resolve().parent.parent
IS_TESTING = 'test' in sys.argv

# Environment helpers
def env_bool(name, default=False, extra_truthy=None, extra_falsy=None):
    raw_value = config(name, default=default)
    if isinstance(raw_value, bool):
        return raw_value

    normalized = str(raw_value).strip().lower()
    truthy_values = {'1', 'true', 't', 'yes', 'y', 'on'}
    falsy_values = {'0', 'false', 'f', 'no', 'n', 'off'}

    if extra_truthy:
        truthy_values.update({str(value).strip().lower() for value in extra_truthy})
    if extra_falsy:
        falsy_values.update({str(value).strip().lower() for value in extra_falsy})

    if normalized in truthy_values:
        return True
    if normalized in falsy_values:
        return False

    return bool(default)

# Secret & debug
SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-5l%ku+0k$!dabai!b#y$d7j+80y!wg)=^-28un@_lmwr#xw%)('
)
DEBUG = env_bool(
    'DEBUG',
    default=True,
    extra_truthy={'debug', 'development', 'dev', 'local'},
    extra_falsy={'release', 'production', 'prod', 'staging'},
)

if (
    env_bool('ENFORCE_STRONG_SECRET_KEY', default=False)
    and not DEBUG
    and SECRET_KEY.startswith('django-insecure-')
):
    raise RuntimeError('Set a strong SECRET_KEY before running with DEBUG=False.')

# ALLOWED_HOSTS behavior:
# - Quick dev workaround: if DEBUG is True, allow all hosts (['*']) to avoid DisallowedHost errors.
# - If DEBUG is False, read ALLOWED_HOSTS from env (comma-separated) or use sane defaults.
if DEBUG:
    # WARNING: insecure — only for development/debugging
    ALLOWED_HOSTS = ['*']
else:
    _default_allowed = "localhost,127.0.0.1,vdart-lms.netlify.app"
    env_allowed = config('ALLOWED_HOSTS', default=_default_allowed)
    ALLOWED_HOSTS = [h.strip() for h in env_allowed.split(',') if h.strip()]

# If running on Render, Render sets RENDER_EXTERNAL_URL (optional) — add host to ALLOWED_HOSTS when not DEBUG.
render_external = os.getenv('RENDER_EXTERNAL_URL') or os.getenv('RENDER_SERVICE_URL')
if render_external and not DEBUG:
    try:
        parsed = urlparse(render_external)
        host = parsed.hostname
        if host and host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(host)
    except Exception:
        pass

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # third party
    'rest_framework',
    'corsheaders',

    # local
    'lms_backend',

    "ai_assistant",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'lms_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'lms_project.wsgi.application'

# Database (sqlite for development)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# Custom user model
AUTH_USER_MODEL = 'lms_backend.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static / media
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# Google OAuth
_default_google_client_ids = config(
    'REACT_APP_GOOGLE_CLIENT_ID',
    default='145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com',
)
_google_client_ids_raw = config('GOOGLE_OAUTH_CLIENT_IDS', default=_default_google_client_ids)
GOOGLE_OAUTH_CLIENT_IDS = [
    client_id.strip() for client_id in _google_client_ids_raw.split(',') if client_id.strip()
]

# ---- CORS & CSRF ----
# When credentials are used, keep CORS_ALLOW_ALL_ORIGINS = False and supply explicit origins.
# ---- CORS & CSRF ----
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "https://vdart-lms.netlify.app",
    "https://learning-management-system-4i6f.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

# If Render external URL is present and DEBUG is False, add its origin to allowed lists
if render_external and not DEBUG:
    origin = render_external.rstrip('/')
    if not origin.startswith("http"):
        origin = f"https://{origin}"
    if origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(origin)

CORS_ALLOWED_METHODS = [
    'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
]

CORS_ALLOWED_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt', 'origin',
    'user-agent', 'x-csrftoken', 'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = [
    "https://vdart-lms.netlify.app",
    "https://learning-management-system-4i6f.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

if render_external and not DEBUG:
    try:
        parsed = urlparse(render_external)
        if parsed.hostname:
            scheme = parsed.scheme or "https"
            origin = f"{scheme}://{parsed.hostname}"
            if origin not in CSRF_TRUSTED_ORIGINS:
                CSRF_TRUSTED_ORIGINS.append(origin)
    except Exception:
        pass

CSRF_EXEMPT_URLS = [
    '/api/send-otp/',
    '/api/verify-otp/',
    '/api/token/',
    '/api/users/',
]

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = env_bool('CSRF_COOKIE_HTTPONLY', default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = config('SECURE_REFERRER_POLICY', default='same-origin')
X_FRAME_OPTIONS = config('X_FRAME_OPTIONS', default='DENY')

SECURE_SSL_REDIRECT = env_bool(
    'SECURE_SSL_REDIRECT',
    default=not DEBUG and not IS_TESTING and bool(render_external),
)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', default=not DEBUG and not IS_TESTING)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', default=not DEBUG and not IS_TESTING)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0 if DEBUG or IS_TESTING else 31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=not DEBUG and not IS_TESTING)
SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', default=False)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Email settings (decouple; fallback to console)
try:
    EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
    EMAIL_HOST = config('EMAIL_HOST', default='')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', default=True)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@lms.com')

    if not EMAIL_HOST or not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
        EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
        print("Warning: SMTP settings not configured. Using console email backend.")
except Exception as e:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    print(f"Warning: Email configuration error: {e}. Using console email backend.")

# OTP settings
OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}', 'style': '{',},
        'simple': {'format': '{levelname} {message}', 'style': '{',},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose',},
        'file': {'class': 'logging.FileHandler', 'filename': os.path.join(BASE_DIR, 'lms.log'), 'formatter': 'verbose',},
    },
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'INFO',},
        'lms_backend': {'handlers': ['console', 'file'], 'level': 'INFO',},
    },
}

# 
# 
# import os
# from pathlib import Path
# from datetime import timedelta
# from decouple import config

# # Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR = Path(__file__).resolve().parent.parent

# # SECURITY WARNING: keep the secret key used in production secret!
# SECRET_KEY = 'django-insecure-5l%ku+0k$!dabai!b#y$d7j+80y!wg)=^-28un@_lmwr#xw%)('

# # SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = True

# ALLOWED_HOSTS = ['localhost', '127.0.0.1']
# # ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='learning-management-system-4i6f.onrender.com,localhost,127.0.0.1').split(',')


# # Application definition
# INSTALLED_APPS = [
#     'django.contrib.admin',
#     'django.contrib.auth',
#     'django.contrib.contenttypes',
#     'django.contrib.sessions',
#     'django.contrib.messages',
#     'django.contrib.staticfiles',
#     'rest_framework',
#     'corsheaders',
#     'lms_backend',
# ]

# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'corsheaders.middleware.CorsMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
# ]

# ROOT_URLCONF = 'lms_project.urls'

# TEMPLATES = [
#     {
#         'BACKEND': 'django.template.backends.django.DjangoTemplates',
#         'DIRS': [],
#         'APP_DIRS': True,
#         'OPTIONS': {
#             'context_processors': [
#                 'django.template.context_processors.debug',
#                 'django.template.context_processors.request',
#                 'django.contrib.auth.context_processors.auth',
#                 'django.contrib.messages.context_processors.messages',
#             ],
#         },
#     },
# ]

# WSGI_APPLICATION = 'lms_project.wsgi.application'

# # Database
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# # Password validation
# AUTH_PASSWORD_VALIDATORS = [
#     {
#         'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
#     },
# ]

# # Custom user model
# AUTH_USER_MODEL = 'lms_backend.User'

# # Internationalization
# LANGUAGE_CODE = 'en-us'
# TIME_ZONE = 'UTC'
# USE_I18N = True
# USE_TZ = True

# # Static files (CSS, JavaScript, Images)
# STATIC_URL = 'static/'
# STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# # Media files
# MEDIA_URL = '/media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# # Default primary key field type
# DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# # REST Framework settings
# REST_FRAMEWORK = {
#     'DEFAULT_AUTHENTICATION_CLASSES': (
#         'rest_framework.authentication.SessionAuthentication',
#         'rest_framework_simplejwt.authentication.JWTAuthentication',
#     ),
#     'DEFAULT_PERMISSION_CLASSES': [
#         'rest_framework.permissions.AllowAny',  # Make sure this is set
#     ],
# }

# # JWT Settings
# SIMPLE_JWT = {
#     'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
#     'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
#     'ROTATE_REFRESH_TOKENS': True,
#     'AUTH_HEADER_TYPES': ('Bearer',),
#     'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
# }

# # CORS settings
# CORS_ALLOW_ALL_ORIGINS = True  # For development only
# CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000"
# ]
# CORS_ALLOWED_METHODS = [
#     'GET',
#     'POST',
#     'PUT',
#     'PATCH',
#     'DELETE',
#     'OPTIONS',
# ]
# CORS_ALLOWED_HEADERS = [
#     'accept',
#     'accept-encoding',
#     'authorization',
#     'content-type',
#     'dnt',
#     'origin',
#     'user-agent',
#     'x-csrftoken',
#     'x-requested-with',
# ]

# # CSRF settings
# CSRF_TRUSTED_ORIGINS = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]

# # Exempt API endpoints from CSRF protection
# CSRF_EXEMPT_URLS = [
#     '/api/send-otp/',
#     '/api/verify-otp/',
#     '/api/token/',
#     '/api/users/',
# ]

# # Email settings
# # For production: Use SMTP
# try:
#     EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
#     EMAIL_HOST = config('EMAIL_HOST', default='')
#     EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
#     EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
#     EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
#     EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
#     DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@lms.com')
    
#     # If SMTP settings are not properly configured, fall back to console backend
#     if not EMAIL_HOST or not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
#         EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
#         print("Warning: SMTP settings not properly configured. Using console email backend.")
        
# except Exception as e:
#     # Fallback to console backend if there are any configuration issues
#     EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
#     print(f"Warning: Email configuration error: {e}. Using console email backend.")
# # OTP Settings
# OTP_EXPIRY_MINUTES = 5  # OTP expires in 5 minutes
# OTP_LENGTH = 6  # 6-digit OTP

# # Logging Configuration
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'formatters': {
#         'verbose': {
#             'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
#             'style': '{',
#         },
#         'simple': {
#             'format': '{levelname} {message}',
#             'style': '{',
#         },
#     },
#     'handlers': {
#         'console': {
#             'class': 'logging.StreamHandler',
#             'formatter': 'verbose',
#         },
#         'file': {
#             'class': 'logging.FileHandler',
#             'filename': 'lms.log',
#             'formatter': 'verbose',
#         },
#     },
#     'loggers': {
#         'django': {
#             'handlers': ['console', 'file'],
#             'level': 'INFO',
#         },
#         'lms_backend': {
#             'handlers': ['console', 'file'],
#             'level': 'INFO',
#         },
#     },
# }

