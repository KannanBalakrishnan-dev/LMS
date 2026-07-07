from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

from .views import (
    send_otp,
    verify_otp_view,
    google_login,
    ai_chat
)


router = DefaultRouter()

router.register(r'users', views.UserViewSet)
router.register(r'teams', views.TeamViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'courses', views.CourseViewSet)
router.register(r'videos', views.VideoViewSet)
router.register(r'quizzes', views.QuizViewSet)
router.register(
    r'enrollments',
    views.EnrollmentViewSet,
    basename='enrollment'
)

router.register(
    r'certificates',
    views.CertificateViewSet,
    basename='certificate'
)



urlpatterns = [

    # =====================
    # Router APIs
    # =====================

    path(
        'api/',
        include(router.urls)
    ),


    # =====================
    # Gemini AI Assistant
    # =====================

    path(
        'api/ai/chat/',
        ai_chat,
        name='ai-chat'
    ),


    # =====================
    # Authentication
    # =====================

    path(
        'send-otp/',
        send_otp
    ),

    path(
        'verify-otp/',
        verify_otp_view
    ),

    path(
        'google-login/',
        google_login
    ),



    # =====================
    # Certificate
    # =====================

    path(
        'api/courses/<int:course_id>/download_certificate/',
        views.download_certificate,
        name='download-certificate'
    ),


    path(
        'api/courses/<int:course_id>/generate_certificate/',
        views.download_generated_certificate,
        name='download-generated-certificate'
    ),


    path(
        'api/verify-certificate/<str:certificate_identifier>/',
        views.verify_certificate,
        name='verify-certificate'
    ),



    # =====================
    # Requests
    # =====================

    path(
        'api/requests/',
        views.create_request,
        name='create-request'
    ),

    path(
        'api/requests/list/',
        views.list_requests,
        name='list-requests'
    ),

    path(
        'api/requests/<int:request_id>/resolve/',
        views.resolve_request,
        name='resolve-request'
    ),



    # =====================
    # Student APIs
    # =====================

    path(
        'api/student/newly-assigned-courses/',
        views.get_newly_assigned_courses,
        name='get-newly-assigned-courses'
    ),


    path(
        'api/student/credit-points/',
        views.student_credit_points,
        name='student-credit-points'
    ),



    # =====================
    # Permanent Delete APIs
    # =====================

    path(
        'api/users/<int:user_id>/permanent-delete/',
        views.permanent_delete_user,
        name='permanent-delete-user'
    ),


    path(
        'api/courses/<int:course_id>/permanent-delete/',
        views.permanent_delete_course,
        name='permanent-delete-course'
    ),


    path(
        'api/teams/<int:team_id>/permanent-delete/',
        views.permanent_delete_team,
        name='permanent-delete-team'
    ),


    path(
        'api/categories/<int:category_id>/permanent-delete/',
        views.permanent_delete_category,
        name='permanent-delete-category'
    ),


    path(
        'api/videos/<int:video_id>/permanent-delete/',
        views.permanent_delete_video,
        name='permanent-delete-video'
    ),


    path(
        'api/quizzes/<int:quiz_id>/permanent-delete/',
        views.permanent_delete_quiz,
        name='permanent-delete-quiz'
    ),



    # =====================
    # Profile Picture
    # =====================

    path(
        'api/users/<int:user_id>/profile-picture/',
        views.update_profile_picture,
        name='update-profile-picture'
    ),

]