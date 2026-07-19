# LMS — Learning Management System

A full-stack Learning Management System with course management, video content, quizzes, certificates, team-based learning, analytics, and an integrated AI assistant.

## 🔗 Live Links

- 🌐 **Frontend:** [https://your-project.vercel.app](https://your-project.vercel.app)
- 🚀 **Backend API:** [https://lms-1-5q1a.onrender.com](https://lms-1-5q1a.onrender.com)

## 🧱 Tech Stack

**Backend**
- Django 4.2 + Django REST Framework
- JWT Authentication (`djangorestframework-simplejwt`)
- Google OAuth2 login
- SQLite (default) — swappable for PostgreSQL/MySQL
- Gunicorn (production WSGI server)
- Google Gemini / `google-genai` SDK (AI Assistant)
- ReportLab (PDF certificate generation)
- MoviePy / ImageIO (media processing)

**Frontend**
- React (Create React App)
- Axios (API client with auto token refresh)
- Material UI (MUI components)
- Google Identity Services (Sign in with Google)

**Deployment**
- Backend: Render
- Frontend: Vercel

---

## ✨ Features

### 👤 Authentication & Users
- JWT-based login with access/refresh tokens and auto-refresh interceptor
- Google OAuth login
- OTP-based password reset (email OTP, 6-digit, 5-minute expiry)
- Role-based access (Admin / Staff / Student)
- Profile management, profile picture upload
- Change password, sign out from all devices

### 📚 Courses & Content
- Course, category, video, and quiz management (full CRUD via DRF routers)
- Team-based course assignment
- Student enrollment tracking
- Student dashboard with newly assigned/created courses
- Student performance & credit points tracking, with leaderboard (ascending credit points across peers)

### 🏆 Certificates
- Auto-generated certificates (PDF) per completed course
- Custom certificate template upload (per-course or common template)
- Certificate preview before generation
- Certificate sharing to students via email
- Public certificate verification by unique identifier

### 🔔 Notifications & Requests
- In-app notifications with live polling and mark-as-read
- Request/approval workflow (create, list, resolve, undo)
- Soft-delete with recovery (deleted actions log) and permanent delete for users, courses, teams, categories, videos, quizzes

### 📊 Analytics
- Admin dashboard stats
- User, course, and team-level analytics
- Per-user analytics view

### 🤖 AI Assistant
- Integrated chat assistant powered by Google's Gemini API (`google-genai`)

### 💬 Feedback
- Student feedback submission and admin review

---

## 📁 Project Structure (Backend)

```
lms_project/
├── lms_project/         # Project settings, root urls.py, wsgi.py
├── lms_backend/         # Core app: models, views, serializers
├── ai_assistant/        # AI chat assistant app
├── manage.py
└── requirements.txt
```

---

## ⚙️ Environment Variables (Backend)

Create a `.env` file in the project root:

```env
SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=your-backend.onrender.com,localhost,127.0.0.1

# Database (optional — defaults to SQLite)
# DATABASE_URL=postgres://...

# Google OAuth
GOOGLE_OAUTH_CLIENT_IDS=your-google-client-id.apps.googleusercontent.com

# Google Gemini / AI Assistant
OPENAI_API_KEY=your-key-if-applicable
GEMINI_API_KEY=your-gemini-api-key

# Email (SMTP) — for OTP delivery
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@lms.com
```

## ⚙️ Environment Variables (Frontend)

Create a `.env` file in the frontend root:

```env
REACT_APP_API_URL=https://lms-1-5q1a.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 🚀 Running Locally

### Backend

```bash
git clone <backend-repo-url>
cd lms-backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
git clone <frontend-repo-url>
cd lms-frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`.

---

## 🌐 Deployment Notes

- **Backend (Render):** deployed via `gunicorn lms_project.wsgi:application`. Ensure `gunicorn` is in `requirements.txt` and `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` include your frontend's live domain.
- **Frontend (Vercel):** set `REACT_APP_API_URL` as an environment variable pointing to the live backend, and (if using CRA) set `CI=false` to avoid ESLint warnings failing the build.
- **Google Sign-In:** the frontend's deployed domain must be added under **Authorized JavaScript origins** in the Google Cloud Console credentials for the OAuth Client ID.

---

## 🔑 Key API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/token/` | Obtain JWT access & refresh tokens |
| `POST /api/token/refresh/` | Refresh JWT access token |
| `POST /api/google/login/` | Google OAuth login |
| `POST /api/send-otp/` / `POST /api/verify-otp/` | Password reset via OTP |
| `GET /api/student/dashboard/` | Student dashboard data |
| `GET /api/student/performance/` | Student performance metrics |
| `GET /api/student/credit-points/` | Student credit points |
| `POST /api/courses/<id>/generate_certificate/` | Generate course certificate |
| `GET /api/verify-certificate/<identifier>/` | Public certificate verification |
| `GET /api/notifications/` | Fetch notifications |
| `POST /api/feedback/submit/` | Submit feedback |
| `POST /api/ai/chat/` | AI assistant chat |

*(Full route list available in `lms_project/urls.py`.)*

---

## 📄 License

This project is proprietary/internal unless otherwise specified by the project owner.

## 🙋 Support

For issues or questions, open an issue in the repository or contact the project maintainer.
