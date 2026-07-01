from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from lms_backend.views import upload_certificate_template
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from lms_backend.views import (
    student_dashboard,
    newly_created_courses,
    UserViewSet,
    TeamViewSet,
    CategoryViewSet,
    CourseViewSet,
    VideoViewSet,
    QuizViewSet,
    EnrollmentViewSet,
    CertificateViewSet,
    UserAnalyticsView,
    admin_dashboard_stats,
    add_team_member,
    remove_team_member,
    assign_courses_team,
    user_analytics,
    course_analytics,
    team_analytics,
    student_performance,
    google_login,
    download_certificate,
    download_generated_certificate,
    preview_generated_certificate,
    list_certificate_share_courses,
    list_completed_students_for_course,
    share_certificate_to_students,
    course_certificate_template_status,
    save_certificate_template_settings,
    view_certificate_template_file,
    view_common_certificate_template_file,
    download_sample_certificate_template,
    verify_certificate,               
    send_otp,                          
    verify_otp_view,
    register_staff,                          
    get_notifications,                 
    mark_notification_read,            
    mark_all_notifications_read,        
    live_notifications,                
    create_request,                     
    list_requests,                      
    resolve_request,                    
    undo_request,                      
    deleted_actions,                    
    permanent_delete_request,           
    permanent_delete_user,              
    permanent_delete_course,            
    permanent_delete_team,           
    permanent_delete_category,        
    permanent_delete_video,             
    permanent_delete_quiz,              
    update_profile_picture,             
    submit_feedback,                        
    get_feedback,                       
    mark_feedback_read,                     
    get_student_feedback,               
    student_credit_points,            
    other_students_credit_points_ascending,
    CustomTokenObtainPairView,         
)

# Initialize the router
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'teams', TeamViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'videos', VideoViewSet)
router.register(r'quizzes', QuizViewSet)
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'certificates', CertificateViewSet, basename='certificate')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/student/dashboard/', student_dashboard, name='student-dashboard'),
    path('api/student/newly-created-courses/', newly_created_courses, name='newly-created-courses'),

    path(
        'api/token/',
        csrf_exempt(CustomTokenObtainPairView.as_view(permission_classes=[AllowAny])),
        name='token_obtain_pair'
    ),
    path(
        'api/token/refresh/',
        csrf_exempt(TokenRefreshView.as_view(permission_classes=[AllowAny])),
        name='token_refresh'
    ),

    path('api/analytics/users/<int:user_id>/', UserAnalyticsView.as_view(), name='user-analytics'),
    path('api/admin/dashboard-stats/', admin_dashboard_stats),

    path('api/teams/<int:team_id>/members/', add_team_member, name='add_team_member'),
    path('api/teams/<int:team_id>/members/<int:user_id>/', remove_team_member, name='remove_team_member'),
    path('api/teams/<int:team_id>/assign_courses/', assign_courses_team, name='assign_courses_to_team'),

    path('api/analytics/users/', user_analytics),
    path('api/analytics/courses/', course_analytics),
    path('api/analytics/teams/', team_analytics),

    path('api/student/performance/', student_performance, name='student-performance'),
    path('api/student/credit-points/', student_credit_points, name='student-credit-points'),
    path('api/student/credit-points/others/', other_students_credit_points_ascending, name='other-students-credit-points-ascending'),

    path('api/google/login/', google_login, name='google_login'),

    # ✅ Certificate endpoints
    path(
        'api/courses/<int:course_id>/download_certificate/',
        download_certificate,
        name='download-certificate'
    ),
    path(
        'api/courses/<int:course_id>/generate_certificate/',
        download_generated_certificate,
        name='download-generated-certificate'
    ),
    path(
        'api/courses/<int:course_id>/preview_certificate/',
        preview_generated_certificate,
        name='preview-generated-certificate'
    ),
    path(
        'api/upload_certificate_template/',
        upload_certificate_template,
        name='upload-certificate-template'
    ),
    path(
        'api/certificate-template/courses/',
        course_certificate_template_status,
        name='certificate-template-course-status'
    ),
    path(
        'api/certificate-template/courses/<int:course_id>/file/',
        view_certificate_template_file,
        name='view-certificate-template-file'
    ),
    path(
        'api/certificate-template/common/file/',
        view_common_certificate_template_file,
        name='view-common-certificate-template-file'
    ),
    path('api/certificate-template/sample/', download_sample_certificate_template, name='download-sample-certificate-template'),
    path(
        'api/certificate-template/save-settings/',
        save_certificate_template_settings,
        name='save-certificate-template-settings'
    ),
    path('api/certificate-share/courses/', list_certificate_share_courses, name='certificate-share-courses'),
    path('api/certificate-share/courses/<int:course_id>/students/', list_completed_students_for_course, name='certificate-share-course-students'),
    path('api/certificate-share/courses/<int:course_id>/share/', share_certificate_to_students, name='certificate-share-send'),
    path(
        'api/verify-certificate/<str:certificate_identifier>/',
        verify_certificate,
        name='verify-certificate'
    ),

    # ✅ OTP Forgot Password endpoints
    path('api/send-otp/', send_otp, name='send-otp'),
    path('api/verify-otp/', verify_otp_view, name='verify-otp'),
    path('api/admin/register-staff/', register_staff, name='register-staff'),

    # ✅ Notification endpoints
    path('api/notifications/', get_notifications, name='get-notifications'),
    path('api/notifications/<int:notification_id>/mark-read/', mark_notification_read, name='mark-notification-read'),
    path('api/notifications/mark-all-read/', mark_all_notifications_read, name='mark-all-notifications-read'),
    path('api/notifications/live/', live_notifications, name='live-notifications'),

    # ✅ Request endpoints
    path('api/requests/', create_request, name='create-request'),
    path('api/requests/list/', list_requests, name='list-requests'),
    path('api/requests/<int:request_id>/resolve/', resolve_request, name='resolve-request'),
    path('api/requests/<int:request_id>/undo/', undo_request, name='undo-request'),
    path('api/requests/<int:request_id>/permanent-delete/', permanent_delete_request, name='permanent-delete-request'),
    path('api/requests/deleted-actions/', deleted_actions, name='deleted-actions'),

    # ✅ Permanent deletion endpoints
    path('api/users/<int:user_id>/permanent-delete/', permanent_delete_user, name='permanent-delete-user'),
    path('api/courses/<int:course_id>/permanent-delete/', permanent_delete_course, name='permanent-delete-course'),
    path('api/teams/<int:team_id>/permanent-delete/', permanent_delete_team, name='permanent-delete-team'),
    path('api/categories/<int:category_id>/permanent-delete/', permanent_delete_category, name='permanent-delete-category'),
    path('api/videos/<int:video_id>/permanent-delete/', permanent_delete_video, name='permanent-delete-video'),
    path('api/quizzes/<int:quiz_id>/permanent-delete/', permanent_delete_quiz, name='permanent-delete-quiz'),

    # ✅ Profile picture endpoint
    path('api/users/<int:user_id>/profile-picture/', update_profile_picture, name='update-profile-picture'),

    # ✅ Feedback endpoints
    path('api/feedback/submit/', submit_feedback, name='submit-feedback'),
    path('api/feedback/', get_feedback, name='get-feedback'),
    path('api/feedback/<int:feedback_id>/mark-read/', mark_feedback_read, name='mark-feedback-read'),
    path('api/feedback/student/', get_student_feedback, name='get-student-feedback'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

