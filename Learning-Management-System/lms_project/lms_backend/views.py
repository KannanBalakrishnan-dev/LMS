from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q, F, Max, Min, Sum
from django.db.models.functions import TruncMonth, TruncDate
from django.utils.timezone import now, timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction
from moviepy import VideoFileClip
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication
from google.oauth2 import id_token
from google.auth.transport import requests
import os
import shutil
import subprocess
import tempfile
from tempfile import NamedTemporaryFile
from django.http import FileResponse, Http404
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from PyPDF2 import PdfReader, PdfWriter


from .models import Course, Enrollment
from django.conf import settings
from rest_framework import status

from django.core.mail import send_mail, EmailMessage, get_connection
from django.core.files.base import ContentFile
import random, string
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from django.utils.crypto import get_random_string
import logging
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError


logger = logging.getLogger(__name__)


def _is_admin_or_staff_user(user):
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'is_superuser', False)
            or getattr(user, 'is_staff', False)
            or getattr(user, 'user_type', None) in ['ADMIN', 'STAFF']
        )
    )


def _convert_word_template_to_pdf_bytes(template_file):
    """Convert an uploaded Word file to PDF bytes for certificate rendering."""
    _, ext = os.path.splitext(template_file.name or '')
    ext = ext.lower()
    if ext not in ['.docx', '.doc']:
        raise ValueError('Unsupported certificate template format.')

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, f'certificate_template{ext}')
        output_path = os.path.join(tmp_dir, 'certificate_template.pdf')

        with open(input_path, 'wb') as input_file:
            for chunk in template_file.chunks():
                input_file.write(chunk)

        conversion_errors = []

        if ext == '.docx':
            try:
                from docx2pdf import convert as docx2pdf_convert
                docx2pdf_convert(input_path, output_path)
            except Exception as exc:
                conversion_errors.append(f'docx2pdf failed: {exc}')

        if not os.path.exists(output_path):
            office_binary = shutil.which('soffice') or shutil.which('libreoffice')
            if office_binary:
                result = subprocess.run(
                    [
                        office_binary,
                        '--headless',
                        '--convert-to',
                        'pdf',
                        '--outdir',
                        tmp_dir,
                        input_path,
                    ],
                    capture_output=True,
                    text=True,
                )
                generated_pdf = os.path.join(
                    tmp_dir,
                    f"{os.path.splitext(os.path.basename(input_path))[0]}.pdf",
                )
                if result.returncode == 0 and os.path.exists(generated_pdf):
                    if generated_pdf != output_path:
                        os.replace(generated_pdf, output_path)
                else:
                    stderr = (result.stderr or '').strip()
                    conversion_errors.append(f'LibreOffice conversion failed: {stderr or "unknown error"}')
            else:
                conversion_errors.append('No Word-to-PDF converter found (docx2pdf/LibreOffice).')

        if not os.path.exists(output_path):
            details = '; '.join(conversion_errors) or 'conversion failed'
            raise RuntimeError(details)

        with open(output_path, 'rb') as output_file:
            return output_file.read()


def _extract_video_duration_seconds(video_file):
    """Best-effort duration extraction for uploaded videos."""
    if not video_file:
        return 0

    temp_file_path = None
    try:
        suffix = '.' + video_file.name.split('.')[-1] if '.' in video_file.name else '.tmp'
        with NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
            for chunk in video_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name

        video_clip = VideoFileClip(temp_file_path)
        duration = int(video_clip.duration or 0)
        video_clip.close()
        return max(duration, 0)
    except Exception as exc:
        logger.warning("Video duration extraction failed for %s: %s", getattr(video_file, 'name', 'unknown'), exc)
        return 0
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

from .models import User

from .models import (
    User, Team, Category, Course, Video, Quiz, Question,
    Enrollment, QuizAttempt, VideoProgress, Certificate, OTP, Notification, Request, Feedback, CourseAssignment, CertificateTemplate,
    CreditPoints, UserPointsSummary
)
from .serializers import (
    UserSerializer, TeamSerializer, CategorySerializer,
    CourseSerializer, VideoSerializer, QuizSerializer,
    QuestionSerializer, EnrollmentSerializer, QuizAttemptSerializer,
    VideoProgressSerializer, CertificateSerializer, CourseListSerializer, TeamDetailSerializer, StudentDashboardSerializer, AdminDashboardSerializer, NotificationSerializer, FeedbackSerializer
)
from .utils import (
    calculate_course_progress, get_user_analytics,
    get_course_analytics, get_team_analytics,
    check_course_completion, update_enrollment_progress,
    verify_otp, get_user_by_email, create_otp_for_email, send_otp_email,
    video_has_accessible_media,
)
from .certificate_service import (
    get_certificate_eligibility,
    get_certificate_template_for_course,
    has_reusable_generated_certificate,
    issue_certificate,
    prepare_certificate_record,
    render_certificate_file,
)

User = get_user_model()


def _award_student_login_reward(user, points=2):
    if not user or getattr(user, 'user_type', None) != 'STUDENT':
        return

    first_credit_activity_at = _get_first_credit_activity_at(user)
    if not first_credit_activity_at:
        return

    reward_points = int(points or 0)
    if reward_points <= 0:
        return

    CreditPoints.objects.create(
        user=user,
        points=reward_points,
        source_type='BONUS',
        description='Student login reward',
    )

    summary, _ = UserPointsSummary.objects.get_or_create(user=user)
    summary.total_points = int(summary.total_points or 0) + reward_points
    summary.calculate_level()
    summary.save(update_fields=['total_points', 'level', 'points_to_next_level', 'last_updated'])


def _get_login_reward_points_total(user, since=None):
    if not user:
        return 0

    if not since:
        return 0

    total = (
        CreditPoints.objects.filter(
            user=user,
            source_type='BONUS',
            description='Student login reward',
        )
        .filter(created_at__gte=since)
        .aggregate(total=Sum('points'))
        .get('total')
    )
    return int(total or 0)


def _get_login_reward_activity_days(user, since=None):
    if not user:
        return set()

    rewards = CreditPoints.objects.filter(
        user=user,
        source_type='BONUS',
        description='Student login reward',
    )
    if since:
        rewards = rewards.filter(created_at__gte=since)

    return set(
        rewards.annotate(activity_day=TruncDate('created_at'))
        .values_list('activity_day', flat=True)
    )


def _get_first_credit_activity_at(user):
    if not user:
        return None

    activity_timestamps = []

    first_completed_on = (
        Enrollment.objects.filter(
            user=user,
            progress='COMPLETED',
            completed_on__isnull=False,
            course__is_deleted=False,
        )
        .aggregate(first_completed_on=Min('completed_on'))
        .get('first_completed_on')
    )
    if first_completed_on:
        activity_timestamps.append(first_completed_on)

    first_video_activity = (
        VideoProgress.objects.filter(
            user=user,
        )
        .filter(Q(watched_duration__gt=0) | Q(watched=True) | Q(quiz_completed=True))
        .aggregate(first_video_activity=Min('last_watched'))
        .get('first_video_activity')
    )
    if first_video_activity:
        activity_timestamps.append(first_video_activity)

    first_quiz_attempt = (
        QuizAttempt.objects.filter(
            user=user,
            attempted_on__isnull=False,
            quiz__is_deleted=False,
        )
        .aggregate(first_quiz_attempt=Min('attempted_on'))
        .get('first_quiz_attempt')
    )
    if first_quiz_attempt:
        activity_timestamps.append(first_quiz_attempt)

    return min(activity_timestamps) if activity_timestamps else None


def _build_credit_activity_days(completed_enrollments, video_activity_qs, quiz_attempts_qs):
    activity_days = set()

    for enrollment in completed_enrollments:
        if enrollment.completed_on:
            activity_days.add(enrollment.completed_on.date())

    for video_progress in video_activity_qs:
        if video_progress.last_watched:
            activity_days.add(video_progress.last_watched.date())

    for quiz_attempt in quiz_attempts_qs:
        if quiz_attempt.attempted_on:
            activity_days.add(quiz_attempt.attempted_on.date())

    return activity_days

# ==================== Email Helper Functions ====================

def send_html_email(subject, html_content, recipient_list, from_email=None):
    try:
        from_email = from_email or settings.DEFAULT_FROM_EMAIL
        email = EmailMessage(
            subject=subject,
            body=html_content,
            from_email=from_email,
            to=recipient_list,
        )
        email.content_subtype = "html"
        email.send(fail_silently=False)
        return True, "Email sent successfully"
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        return False, str(e)

def generate_welcome_email_staff(first_name, email, password, site_url):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .credentials {{ background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }}
            .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to LMS!</h1>
                <p>Learning Management System</p>
            </div>
            <div class="content">
                <h2>Hello {first_name},</h2>
                <p>Your staff account has been successfully created in the Learning Management System.</p>
                <div class="credentials">
                    <h3>Login Credentials:</h3>
                    <p><strong>Username/Email:</strong> {email}</p>
                    <p><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 3px 6px; border-radius: 3px;">{password}</code></p>
                </div>
                <div class="warning">
                    <strong>⚠️ Important Instructions:</strong>
                    <ul>
                        <li>Use the credentials above to log in to your account</li>
                        <li>For security reasons, please change your password immediately after your first login</li>
                        <li>You can access the system at: <a href="{site_url}">{site_url}</a></li>
                        <li>If you have any issues, contact the system administrator</li>
                    </ul>
                </div>
                <p>Best regards,<br><strong>LMS Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 Learning Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

def generate_otp_email(user_name, otp_code):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .otp-code {{ font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 8px; letter-spacing: 8px; font-family: monospace; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }}
            .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello {user_name},</h2>
                <p>We received a request to reset your password for your LMS account.</p>
                <p>Use the following OTP code to verify your identity and reset your password:</p>
                <div class="otp-code">{otp_code}</div>
                <div class="warning">
                    <strong>⚠️ Note:</strong> This OTP is valid for <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong>.
                    If you didn't request this, please ignore this email.
                </div>
                <p>If you have any issues, please contact our support team.</p>
                <p>Best regards,<br><strong>LMS Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 Learning Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

def generate_certificate_email(student_name, course_title, certificate_id, custom_message=None):
    message = custom_message or f"""
    <p>Congratulations on completing <strong>{course_title}</strong>!</p>
    <p>Your certificate is attached to this email.</p>
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }}
            .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .certificate-info {{ background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }}
            .badge {{ display: inline-block; background-color: #28a745; color: white; padding: 5px 10px; border-radius: 5px; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 Certificate of Completion</h1>
            </div>
            <div class="content">
                <h2>Hello {student_name},</h2>
                {message}
                <div class="certificate-info">
                    <h3>Certificate Details:</h3>
                    <p><strong>Course:</strong> {course_title}</p>
                    <p><strong>Certificate ID:</strong> <code>{certificate_id}</code></p>
                    <span class="badge">Verified Certificate</span>
                </div>
                <p>Keep this certificate for your records. You can also share it on your professional profiles.</p>
                <p>Best regards,<br><strong>LMS Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 Learning Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

# ==================== Google Login ====================
@api_view(['POST'])
def google_login(request):
    credential = request.data.get('credential')
    if not credential:
        return Response({'error': 'No credential provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = id_token.verify_oauth2_token(credential, requests.Request(), "145540367220-r74qnsn2mdghon1i99f5rav9prhtiu3k.apps.googleusercontent.com")

        email = idinfo['email']
        given_name = idinfo.get('given_name', '')
        family_name = idinfo.get('family_name', '')
        picture = idinfo.get('picture', None)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': given_name,
                'last_name': family_name,
                'user_type': 'STUDENT',
                'profile_picture': picture,
            }
        )

        if user.is_deleted:
            return Response(
                {'error': 'Account has been deleted'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if picture and user.profile_picture != picture:
            user.profile_picture = picture
            user.save(update_fields=["profile_picture"])

        _award_student_login_reward(user, points=2)

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ==================== Analytics Endpoints ====================

# FIX 1: Added @permission_classes([IsAuthenticated]) to all three methods
@api_view(['GET', 'PUT', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def assign_courses_team(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TeamDetailSerializer(team, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        course_ids = request.data.get('course_ids', [])
        if not isinstance(course_ids, list):
            return Response({"detail": "course_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        courses = Course.objects.filter(id__in=course_ids)
        if courses.count() != len(course_ids):
            return Response({"detail": "Some courses not found."}, status=status.HTTP_400_BAD_REQUEST)

        old_course_ids = set(team.courses.values_list('id', flat=True))
        new_course_ids = set(course_ids)
        newly_assigned_course_ids = new_course_ids - old_course_ids
        newly_unassigned_course_ids = old_course_ids - new_course_ids

        team.courses.set(courses)
        team.save()

        for course_id in newly_assigned_course_ids:
            course = Course.objects.get(id=course_id)
            CourseAssignment.objects.get_or_create(
                team=team,
                course=course,
                defaults={'assigned_at': timezone.now()}
            )

        if newly_unassigned_course_ids:
            team_members = team.user_set.all()
            for member in team_members:
                Enrollment.objects.filter(
                    user=member,
                    course_id__in=newly_unassigned_course_ids
                ).delete()

        if newly_assigned_course_ids:
            team_members = team.user_set.all()
            for member in team_members:
                Notification.objects.create(
                    user=member,
                    message="You've been assigned a new course. Start learning now!",
                    is_read=False
                )

        return Response({"detail": "Courses assigned successfully."})

    elif request.method == 'POST':
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if not team.courses.filter(id=course_id).exists():
            team.courses.add(course)
            team.save()

            CourseAssignment.objects.get_or_create(
                team=team,
                course=course,
                defaults={'assigned_at': timezone.now()}
            )

            team_members = team.user_set.all()
            for member in team_members:
                Notification.objects.create(
                    user=member,
                    message="You've been assigned a new course. Start learning now!",
                    is_read=False
                )
        else:
            team.courses.add(course)
            team.save()

        return Response({"detail": f"Course {course.title} added to team."})

    elif request.method == 'DELETE':
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({"detail": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        team.courses.remove(course)
        team.save()

        CourseAssignment.objects.filter(team=team, course=course).delete()

        team_members = team.user_set.all()
        for member in team_members:
            Enrollment.objects.filter(
                user=member,
                course=course
            ).delete()

        return Response({"detail": f"Course {course.title} removed from team."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_newly_assigned_courses(request):
    user = request.user

    if not user.team:
        return Response({
            'has_newly_assigned': False,
            'newly_assigned_courses': []
        })

    cutoff_time = timezone.now() - timedelta(hours=24)
    newly_assigned = CourseAssignment.objects.filter(
        team=user.team,
        assigned_at__gte=cutoff_time
    ).select_related('course')

    newly_assigned_courses = []
    for assignment in newly_assigned:
        newly_assigned_courses.append({
            'id': assignment.course.id,
            'title': assignment.course.title,
            'assigned_at': assignment.assigned_at
        })

    return Response({
        'has_newly_assigned': len(newly_assigned_courses) > 0,
        'newly_assigned_courses': newly_assigned_courses
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_credit_points(request):
    user = request.user

    # FIX 3: Consistent reward constants (was 80 in leaderboard, now 50 everywhere)
    COURSE_COMPLETION_POINTS = 50
    QUIZ_BONUS_THRESHOLD = 90
    QUIZ_BONUS_POINTS = 20
    DAILY_LOGIN_BASE_POINTS = 5
    STREAK_BONUS_SHORT = 10
    STREAK_BONUS_LONG = 25
    VIDEO_COMPLETION_POINTS = 5

    completed_enrollments = Enrollment.objects.filter(
        user=user,
        progress='COMPLETED',
        course__is_deleted=False
    ).select_related('course')

    completed_course_ids = [en.course_id for en in completed_enrollments]

    best_score_by_course = {}
    if completed_course_ids:
        score_rows = (
            QuizAttempt.objects.filter(
                user=user,
                quiz__course_id__in=completed_course_ids,
                quiz__is_deleted=False,
            )
            .values('quiz__course_id')
            .annotate(best_score=Max('score'))
        )
        best_score_by_course = {
            row['quiz__course_id']: row['best_score'] for row in score_rows
        }

    total_credit_points = 0
    courses_data = []

    completion_points = 0
    quiz_bonus_points_total = 0

    for enrollment in completed_enrollments:
        course = enrollment.course

        base_completion_points = COURSE_COMPLETION_POINTS
        best_quiz_score = best_score_by_course.get(course.id)
        quiz_bonus = (
            QUIZ_BONUS_POINTS
            if best_quiz_score is not None and best_quiz_score >= QUIZ_BONUS_THRESHOLD
            else 0
        )
        performance_percent = int(best_quiz_score) if best_quiz_score is not None else None
        credit_points = base_completion_points + quiz_bonus

        completion_points += base_completion_points
        quiz_bonus_points_total += quiz_bonus

        courses_data.append({
            'id': course.id,
            'title': course.title,
            'credit_points': credit_points,
            'performance_percent': performance_percent,
            'completed_on': enrollment.completed_on,
        })

    video_activity_qs = VideoProgress.objects.filter(user=user).filter(
        Q(watched_duration__gt=0) | Q(watched=True) | Q(quiz_completed=True)
    )

    total_watched_seconds = (
        video_activity_qs
        .aggregate(total=Sum('watched_duration'))
        .get('total')
        or 0
    )
    video_watch_points = int(total_watched_seconds // 300)
    completed_videos_count = video_activity_qs.filter(watched=True).count()
    video_completion_points = completed_videos_count * VIDEO_COMPLETION_POINTS

    quiz_attempts_qs = QuizAttempt.objects.filter(user=user, quiz__is_deleted=False)
    quiz_attempts_count = quiz_attempts_qs.count()
    quiz_attendance_points = quiz_attempts_count * 2
    quiz_score_total = sum(int(a.score or 0) for a in quiz_attempts_qs)
    quiz_score_points = int(quiz_score_total // 20)

    first_credit_activity_at = _get_first_credit_activity_at(user)
    activity_days = _build_credit_activity_days(
        completed_enrollments,
        video_activity_qs,
        quiz_attempts_qs,
    )
    activity_days.update(_get_login_reward_activity_days(user, since=first_credit_activity_at))
    daily_login_points = len(activity_days) * DAILY_LOGIN_BASE_POINTS
    streak_days = 0
    today = now().date()
    while (today - timedelta(days=streak_days)) in activity_days:
        streak_days += 1
    streak_bonus_points = (
        STREAK_BONUS_LONG if streak_days >= 7 else STREAK_BONUS_SHORT if streak_days >= 3 else 0
    )
    login_reward_points = _get_login_reward_points_total(
        user,
        since=first_credit_activity_at,
    )

    total_credit_points = (
        completion_points
        + quiz_bonus_points_total
        + video_completion_points
        + video_watch_points
        + quiz_attendance_points
        + quiz_score_points
        + daily_login_points
        + streak_bonus_points
        + login_reward_points
    )

    return Response({
        'total_credit_points': total_credit_points,
        'current_streak_days': streak_days,
        'courses': courses_data,
        'breakdown': {
            'daily_login_points': daily_login_points,
            'login_reward_points': login_reward_points,
            'completion_points': completion_points,
            'quiz_bonus_points': quiz_bonus_points_total,
            'video_watch_points': video_watch_points,
            'video_completion_points': video_completion_points,
            'quiz_attendance_points': quiz_attendance_points,
            'quiz_score_points': quiz_score_points,
            'current_streak_days': streak_days,
            'streak_bonus_points': streak_bonus_points,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def other_students_credit_points_ascending(request):
    # FIX 3: Consistent constant (was 80, now matches student_credit_points = 50)
    COURSE_COMPLETION_POINTS = 50
    QUIZ_BONUS_THRESHOLD = 90
    QUIZ_BONUS_POINTS = 20
    DAILY_LOGIN_BASE_POINTS = 5
    STREAK_BONUS_SHORT = 10
    STREAK_BONUS_LONG = 25
    VIDEO_COMPLETION_POINTS = 5

    def calculate_total_points_for_user(target_user):
        completed_enrollments = Enrollment.objects.filter(
            user=target_user,
            progress='COMPLETED',
            course__is_deleted=False,
        ).select_related('course')

        completed_course_ids = [en.course_id for en in completed_enrollments]
        best_score_by_course = {}
        if completed_course_ids:
            score_rows = (
                QuizAttempt.objects.filter(
                    user=target_user,
                    quiz__course_id__in=completed_course_ids,
                    quiz__is_deleted=False,
                )
                .values('quiz__course_id')
                .annotate(best_score=Max('score'))
            )
            best_score_by_course = {
                row['quiz__course_id']: row['best_score'] for row in score_rows
            }

        completion_points = 0
        quiz_bonus_points_total = 0
        for enrollment in completed_enrollments:
            course = enrollment.course
            base_completion_points = COURSE_COMPLETION_POINTS
            best_score = best_score_by_course.get(course.id)
            quiz_bonus = (
                QUIZ_BONUS_POINTS
                if best_score is not None and best_score >= QUIZ_BONUS_THRESHOLD
                else 0
            )
            completion_points += base_completion_points
            quiz_bonus_points_total += quiz_bonus

        video_activity_qs = VideoProgress.objects.filter(user=target_user).filter(
            Q(watched_duration__gt=0) | Q(watched=True) | Q(quiz_completed=True)
        )

        total_watched_seconds = (
            video_activity_qs
            .aggregate(total=Sum('watched_duration'))
            .get('total')
            or 0
        )
        video_watch_points = int(total_watched_seconds // 300)
        completed_videos_count = video_activity_qs.filter(watched=True).count()
        video_completion_points = completed_videos_count * VIDEO_COMPLETION_POINTS

        quiz_attempts_qs = QuizAttempt.objects.filter(user=target_user, quiz__is_deleted=False)
        quiz_attempts_count = quiz_attempts_qs.count()
        quiz_attendance_points = quiz_attempts_count * 2
        quiz_score_total = sum(int(a.score or 0) for a in quiz_attempts_qs)
        quiz_score_points = int(quiz_score_total // 20)

        first_credit_activity_at = _get_first_credit_activity_at(target_user)
        activity_days = _build_credit_activity_days(
            completed_enrollments,
            video_activity_qs,
            quiz_attempts_qs,
        )
        activity_days.update(_get_login_reward_activity_days(target_user, since=first_credit_activity_at))

        # FIX 3: Was hardcoded to 0, now correctly calculated
        daily_login_points = len(activity_days) * DAILY_LOGIN_BASE_POINTS

        streak_days = 0
        today = now().date()
        while (today - timedelta(days=streak_days)) in activity_days:
            streak_days += 1
        streak_bonus_points = (
            STREAK_BONUS_LONG if streak_days >= 7 else STREAK_BONUS_SHORT if streak_days >= 3 else 0
        )
        login_reward_points = _get_login_reward_points_total(
            target_user,
            since=first_credit_activity_at,
        )

        return (
            completion_points
            + quiz_bonus_points_total
            + video_completion_points
            + video_watch_points
            + quiz_attendance_points
            + quiz_score_points
            + daily_login_points
            + streak_bonus_points
            + login_reward_points
        )

    students = User.objects.filter(user_type='STUDENT', is_deleted=False).exclude(id=request.user.id)
    results = []

    for student in students:
        total_points = calculate_total_points_for_user(student)
        display_name = f"{student.first_name} {student.last_name}".strip() or student.username
        results.append({
            'id': student.id,
            'name': display_name,
            'credit_points': total_points,
        })

    results.sort(key=lambda item: (-item['credit_points'], item['name'].lower()))

    return Response({
        'others': results,
        'count': len(results),
    })


@api_view(['GET'])
def user_analytics(request):
    today = now().date()
    last_30_days = today - timedelta(days=30)
    registration_trend = (
        User.objects.filter(
            date_joined__date__gte=last_30_days,
            is_deleted=False
        )
        .annotate(date=TruncDate('date_joined'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    data = {
        'registrationTrend': [
            {'date': item['date'].strftime('%Y-%m-%d'), 'count': item['count']}
            for item in registration_trend
        ],
        'adminCount': User.objects.filter(user_type='ADMIN', is_deleted=False).count(),
        'studentCount': User.objects.filter(user_type='STUDENT', is_deleted=False).count(),
    }
    return Response(data)


@api_view(['GET'])
def course_analytics(request):
    top_courses_qs = (
        Course.objects.filter(is_deleted=False).annotate(
            enrollments=Count('enrollment'),
            completions=Count('enrollment', filter=Q(enrollment__progress='COMPLETED'))
        )
        .order_by('-enrollments')[:5]
    )
    top_courses = [
        {
            'title': course.title,
            'enrollments': course.enrollments,
            'completions': course.completions,
        }
        for course in top_courses_qs
    ]

    completion_time = (
        Enrollment.objects.filter(
            progress='COMPLETED',
            completed_on__isnull=False,
            course__is_deleted=False
        )
        .annotate(month=TruncMonth('completed_on'))
        .values('month')
        .annotate(avgDays=Avg(F('completed_on') - F('enrolled_on')))
        .order_by('month')
    )
    completion_time_data = [
        {'month': item['month'].strftime('%Y-%m'), 'avgDays': item['avgDays'].days if item['avgDays'] else 0}
        for item in completion_time
    ]

    quiz_scores = QuizAttempt.objects.filter(
        quiz__course__is_deleted=False
    ).values_list('score', flat=True)
    quiz_stats = {
        'excellent': sum(1 for s in quiz_scores if s >= 90),
        'good': sum(1 for s in quiz_scores if 70 <= s < 90),
        'average': sum(1 for s in quiz_scores if 50 <= s < 70),
        'poor': sum(1 for s in quiz_scores if s < 50),
    }

    data = {
        'topCourses': top_courses,
        'completionTimeTrend': completion_time_data,
        'quizStats': quiz_stats,
    }
    return Response(data)


@api_view(['GET'])
def team_analytics(request):
    teams = Team.objects.filter(is_deleted=False)
    performance_data = []
    completion_rates = []

    for team in teams:
        users = team.user_set.filter(is_deleted=False)
        user_ids = users.values_list('id', flat=True)
        avg_score = QuizAttempt.objects.filter(
            user_id__in=user_ids,
            quiz__course__is_deleted=False
        ).aggregate(avg=Avg('score'))['avg'] or 0
        total_enrollments = Enrollment.objects.filter(
            user_id__in=user_ids,
            course__is_deleted=False
        ).count()
        completed = Enrollment.objects.filter(
            user_id__in=user_ids,
            progress='COMPLETED',
            course__is_deleted=False
        ).count()
        completion_rate = (completed / total_enrollments) * 100 if total_enrollments else 0

        performance_data.append({
            'name': team.name,
            'avgScore': round(avg_score, 2),
        })
        completion_rates.append({
            'name': team.name,
            'completionRate': round(completion_rate, 2),
        })

    return Response({
        'teamPerformance': performance_data,
        'completionRates': completion_rates,
    })

# ==================== User Views ====================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        team_id = request.data.get('team_id')
        can_assign_team = (
            request.user.is_authenticated
            and getattr(request.user, 'user_type', None) == 'ADMIN'
        )
        if team_id not in (None, '', 'null') and not can_assign_team:
            return Response({'error': 'Only admin can assign team.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user.user_type == 'STUDENT':
            user.is_active = True
            user.save(update_fields=['is_active'])

            admin_users = User.objects.filter(user_type='ADMIN', is_deleted=False)
            for admin in admin_users:
                Notification.objects.create(
                    user=admin,
                    sender=user,
                    message=f"New student registered: {user.username}",
                    is_read=False,
                )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        user_to_delete = self.get_object()

        if user_to_delete == request.user:
            return Response({'error': 'You cannot delete your own account'}, status=400)

        user_to_delete.is_deleted = True
        user_to_delete.save()
        return Response({'message': 'User soft deleted. Go to Approved Actions to permanently delete.'}, status=204)

    def update(self, request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user, 'user_type', None) != 'ADMIN':
            return Response({'error': 'Only admin can edit users.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_authenticated or getattr(request.user, 'user_type', None) != 'ADMIN':
            return Response({'error': 'Only admin can edit users.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def assign_courses(self, request, pk=None):
        user = self.get_object()

        if request.method == 'GET':
            courses = Course.objects.filter(is_deleted=False)
            serializer = CourseListSerializer(courses, many=True, context={'request': request})
            return Response(serializer.data)

        if request.method == 'POST':
            course_ids = request.data.get("course_ids", [])
            if not isinstance(course_ids, list):
                return Response({"error": "course_ids must be a list of integers"}, status=400)

            courses = Course.objects.filter(id__in=course_ids, is_deleted=False)
            if not courses.exists():
                return Response({"error": "No valid courses found."}, status=404)

            currently_assigned_course_ids = set(
                CourseAssignment.objects.filter(user=user).values_list('course_id', flat=True)
            )
            new_course_ids = set(course_ids)

            unassigned_course_ids = currently_assigned_course_ids - new_course_ids

            if unassigned_course_ids:
                Enrollment.objects.filter(
                    user=user,
                    course_id__in=unassigned_course_ids
                ).delete()

            created_count = 0
            for course in courses:
                _, created = CourseAssignment.objects.get_or_create(user=user, course=course)
                if created:
                    created_count += 1

            return Response({"message": f"{created_count} new courses assigned to {user.username}."}, status=200)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def assigned_courses(self, request, pk=None):
        user = self.get_object()
        assigned = CourseAssignment.objects.filter(user=user).select_related("course")
        serializer = CourseListSerializer([ca.course for ca in assigned], many=True, context={'request': request})
        return Response(serializer.data)

# ==================== Team Views ====================
class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.filter(is_deleted=False)
    serializer_class = TeamSerializer

    def get_serializer_class(self):
        if self.action in ['retrieve', 'list']:
            return TeamDetailSerializer
        return TeamSerializer

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        team = self.get_object()
        analytics = get_team_analytics(team)
        return Response(analytics)

    def destroy(self, request, *args, **kwargs):
        team_to_delete = self.get_object()
        team_to_delete.is_deleted = True
        team_to_delete.save()
        return Response({'message': 'Team soft deleted'}, status=204)


@api_view(['POST'])
def add_team_member(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)

    user_id = request.data.get('user_id')
    if not user_id:
        return Response({"detail": "User ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    user.team = team
    user.save()
    return Response({"detail": f"User {user.username} added to team {team.name}."}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
def remove_team_member(request, team_id, user_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({"detail": "Team not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if user.team_id != team.id:
        return Response({"detail": "User is not in this team."}, status=status.HTTP_400_BAD_REQUEST)

    user.team = None
    user.save()
    return Response({"detail": f"User {user.username} removed from team {team.name}."}, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
def update_team(request, team_id):
    try:
        team = Team.objects.get(pk=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=404)

    serializer = TeamDetailSerializer(team, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

# ==================== Category Views ====================
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_deleted=False)
    serializer_class = CategorySerializer

    def destroy(self, request, *args, **kwargs):
        category_to_delete = self.get_object()
        category_to_delete.is_deleted = True
        category_to_delete.save()
        return Response({'message': 'Category soft deleted'}, status=204)

# ==================== Course Views ====================
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.filter(is_deleted=False)
    serializer_class = CourseSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_queryset(self):
        user = self.request.user
        username = getattr(user, 'username', 'anonymous')
        user_id = getattr(user, 'id', None)
        user_type = getattr(user, 'user_type', 'UNKNOWN')
        logger.info(f"CourseViewSet.get_queryset called for user: {username} (ID: {user_id}), type: {user_type}")

        queryset = Course.objects.filter(is_deleted=False)
        logger.info(f"Initial non-deleted courses count: {queryset.count()}")

        if user.is_authenticated and hasattr(user, 'user_type') and user.user_type == 'STUDENT':
            logger.info(f"User {user.username} is a STUDENT. Showing all non-deleted courses.")
        else:
            logger.info(f"User {getattr(user, 'username', 'anonymous')} is NOT a STUDENT or not authenticated. Showing all non-deleted courses.")

        return queryset.distinct()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def assign_courses(self, request):
        user_id = request.data.get("user_id")
        course_ids = request.data.get("course_ids", [])

        if not user_id or not isinstance(course_ids, list):
            return Response({"error": "Invalid payload"}, status=400)

        try:
            user = User.objects.get(id=user_id, is_deleted=False)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        currently_assigned_course_ids = set(
            CourseAssignment.objects.filter(user=user).values_list('course_id', flat=True)
        )
        new_course_ids = set(course_ids)

        unassigned_course_ids = currently_assigned_course_ids - new_course_ids

        CourseAssignment.objects.filter(user=user).exclude(course_id__in=course_ids).delete()

        if unassigned_course_ids:
            Enrollment.objects.filter(
                user=user,
                course_id__in=unassigned_course_ids
            ).delete()

        for cid in course_ids:
            CourseAssignment.objects.get_or_create(user=user, course_id=cid)

        return Response({
            "message": f"Assignments updated for {user.username}",
            "assigned_courses": course_ids
        })

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated])
    def assign_users(self, request, pk=None):
        course = self.get_object()

        if request.method == 'GET':
            all_users = User.objects.filter(is_deleted=False)
            assigned_user_ids = CourseAssignment.objects.filter(course=course).values_list('user_id', flat=True)

            return Response({
                "all_users": UserSerializer(all_users, many=True).data,
                "assigned_user_ids": list(assigned_user_ids),
            })

        if request.method == 'POST':
            user_ids = request.data.get("user_ids", [])
            if not isinstance(user_ids, list):
                return Response({"error": "user_ids must be a list"}, status=400)

            currently_assigned_user_ids = set(
                CourseAssignment.objects.filter(course=course).values_list('user_id', flat=True)
            )
            new_user_ids = set(user_ids)

            newly_unassigned_user_ids = currently_assigned_user_ids - new_user_ids

            CourseAssignment.objects.filter(course=course).exclude(user_id__in=user_ids).delete()

            if newly_unassigned_user_ids:
                Enrollment.objects.filter(
                    user_id__in=newly_unassigned_user_ids,
                    course=course
                ).delete()

            for uid in user_ids:
                CourseAssignment.objects.get_or_create(course=course, user_id=uid)

            return Response({
                "message": f"Users assigned to course {course.title} updated.",
                "assigned_user_ids": user_ids,
            })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def enrollment_status(self, request, pk=None):
        course = self.get_object()
        user = request.user
        try:
            enrollment = Enrollment.objects.get(user=user, course=course)
            is_completed = check_course_completion(user, course)
            is_assigned = CourseAssignment.objects.filter(course=course).filter(Q(user=user) | Q(team=user.team)).exists()
            data = {
                'is_enrolled': True,
                'enrollment_id': enrollment.id,
                'progress': enrollment.progress,
                'enrolled_on': enrollment.enrolled_on,
                'completed_on': enrollment.completed_on,
                'course_progress': calculate_course_progress(user, course),
                'progress_percent': calculate_course_progress(user, course),
                'is_completed': is_completed,
                'is_assigned': is_assigned,
                'approval_pending': False,
            }
        except Enrollment.DoesNotExist:
            is_assigned = CourseAssignment.objects.filter(course=course).filter(Q(user=user) | Q(team=user.team)).exists()
            data = {
                'is_enrolled': False,
                'enrollment_id': None,
                'progress': None,
                'enrolled_on': None,
                'completed_on': None,
                'course_progress': 0,
                'progress_percent': 0,
                'is_completed': False,
                'is_assigned': is_assigned,
                'approval_pending': False,
            }
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_started(self, request, pk=None):
        course = self.get_object()
        user = request.user

        enrollment = Enrollment.objects.filter(user=user, course=course).first()
        if not enrollment:
            return Response(
                {'error': 'Please enroll in the course before starting it.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if enrollment.progress == 'NOT_STARTED':
            enrollment.progress = 'IN_PROGRESS'
            enrollment.save(update_fields=['progress'])

        serializer = EnrollmentSerializer(enrollment, context={'request': request})
        return Response({
            'message': 'Course marked as started.',
            'enrollment': serializer.data,
            'progress': enrollment.progress,
            'is_enrolled': True,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        course = self.get_object()
        user = request.user

        if hasattr(user, 'user_type') and user.user_type == 'STUDENT':
            has_any_assignments = CourseAssignment.objects.filter(course=course).exists()
            is_assigned = CourseAssignment.objects.filter(course=course).filter(
                Q(user=user) | Q(team=user.team)
            ).exists()

            if has_any_assignments and not is_assigned:
                return Response(
                    {'error': 'You are not allowed to enroll in this course.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            existing = Enrollment.objects.filter(user=user, course=course).first()
            if existing:
                serializer = EnrollmentSerializer(existing, context={'request': request})
                return Response({'message': 'Already enrolled', 'enrollment': serializer.data}, status=status.HTTP_200_OK)

            user_enrollments = Enrollment.objects.filter(user=user).select_related('course')
            active_enrollment_count = 0

            for existing_enrollment in user_enrollments:
                if existing_enrollment.progress != 'COMPLETED' and check_course_completion(user, existing_enrollment.course):
                    update_enrollment_progress(existing_enrollment)

                if existing_enrollment.progress != 'COMPLETED':
                    active_enrollment_count += 1

            if active_enrollment_count >= 2:
                return Response({
                    'error': 'You can enroll in only 2 courses at a time. Complete one of your current courses to enroll in another.'
                }, status=status.HTTP_400_BAD_REQUEST)

        enrollment, created = Enrollment.objects.get_or_create(
            user=user,
            course=course,
            defaults={'progress': 'NOT_STARTED'}
        )

        serializer = EnrollmentSerializer(enrollment, context={'request': request})

        if created:
            return Response({
                'message': 'Enrolled successfully',
                'enrollment': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'message': 'Already enrolled',
            'enrollment': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        course = self.get_object()
        analytics = get_course_analytics(course)
        return Response(analytics)

    @action(detail=True, methods=['get'])
    def videos(self, request, pk=None):
        course = self.get_object()
        videos = course.videos.filter(is_deleted=False).order_by('order')
        serializer = VideoSerializer(videos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def progress(self, request, pk=None):
        course = self.get_object()
        user = request.user

        progress_data = {}
        total_lessons = 0
        completed_lessons = 0

        for video in course.videos.filter(is_deleted=False):
            if not video_has_accessible_media(video):
                continue

            vp = VideoProgress.objects.filter(user=user, video=video).first()
            watched = vp.watched if vp else False

            progress_data[video.id] = {
                "watched": watched,
                "quiz_completed": False,
            }

            total_lessons += 1
            if watched:
                completed_lessons += 1

            quiz = Quiz.objects.filter(video=video).first()
            if quiz:
                quiz_passed = QuizAttempt.objects.filter(
                    user=user,
                    quiz=quiz,
                    is_passed=True
                ).exists()
                progress_data[video.id]["quiz_completed"] = quiz_passed
                total_lessons += 1
                if quiz_passed:
                    completed_lessons += 1

        final_quiz = course.quizzes.filter(is_final=True).first()
        if final_quiz:
            final_quiz_passed = QuizAttempt.objects.filter(
                user=user,
                quiz=final_quiz,
                is_passed=True
            ).exists()
            progress_data['final'] = {"quiz_completed": final_quiz_passed}
            total_lessons += 1
            if final_quiz_passed:
                completed_lessons += 1

        return Response({
            'progress_data': progress_data,
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def detailed_progress(self, request, pk=None):
        course = self.get_object()
        enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
        enrollment_status = enrollment.progress if enrollment else None
        completion_date = enrollment.completed_on if enrollment else None
        video_progress = {}
        for video in course.videos.filter(is_deleted=False):
            if not video_has_accessible_media(video):
                continue

            video_quiz = Quiz.objects.filter(video=video).first()
            progress = VideoProgress.objects.filter(
                user=request.user,
                video=video
            ).first()
            quiz_completed = False
            if video_quiz:
                quiz_completed = QuizAttempt.objects.filter(
                    user=request.user,
                    quiz=video_quiz,
                    is_passed=True
                ).exists()
            video_progress[video.id] = {
                'watched': progress.watched if progress else False,
                'watched_duration': progress.watched_duration if progress else 0,
                'has_quiz': bool(video_quiz),
                'quiz_id': video_quiz.id if video_quiz else None,
                'quiz_completed': quiz_completed
            }
        final_quiz = Quiz.objects.filter(course=course, is_final=True).first()
        final_quiz_passed = False
        if final_quiz:
            final_quiz_passed = QuizAttempt.objects.filter(
                user=request.user,
                quiz=final_quiz,
                is_passed=True
            ).exists()
        return Response({
            'is_enrolled': bool(enrollment),
            'enrollment_status': enrollment_status,
            'completion_date': completion_date,
            'video_progress': video_progress,
            'overall_progress': calculate_course_progress(request.user, course) if enrollment else 0,
            'final_quiz_passed': final_quiz_passed,
            'has_final_quiz': bool(final_quiz),
            'total_video_quizzes': Quiz.objects.filter(video__course=course).count(),
            'passed_video_quizzes': QuizAttempt.objects.filter(
                user=request.user,
                quiz__video__course=course,
                is_passed=True
            ).count()
        })

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated],
        parser_classes=[MultiPartParser],
    )
    def upload_certificate(self, request, pk=None):
        course = self.get_object()

        file = request.FILES.get('certificate')
        if not file:
            return Response(
                {"error": "No certificate file uploaded."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file.name.lower().endswith('.pdf'):
            return Response(
                {"error": "Certificate must be a PDF file."},
                status=status.HTTP_400_BAD_REQUEST
            )

        course.certificate = file
        course.save()

        return Response({
            "message": "Certificate uploaded successfully.",
            "certificate_url": course.certificate.url
        })

    def destroy(self, request, *args, **kwargs):
        course_to_delete = self.get_object()
        course_to_delete.is_deleted = True
        course_to_delete.save()
        return Response({'message': 'Course soft deleted. Go to Approved Actions to permanently delete.'}, status=204)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.filter(is_deleted=False)
    serializer_class = VideoSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.filter(course__is_deleted=False)
        return queryset

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        video_file = request.FILES.get('video_file')
        payload['duration'] = _extract_video_duration_seconds(video_file)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        payload = request.data.copy()

        video_file = request.FILES.get('video_file')
        if video_file:
            payload['duration'] = _extract_video_duration_seconds(video_file)
        else:
            payload.setdefault('duration', instance.duration or 0)

        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='watch', permission_classes=[IsAuthenticated])
    def watch(self, request, pk=None):
        video = self.get_object()
        watched_duration = int(request.data.get('watched_duration', 0))
        progress, created = VideoProgress.objects.get_or_create(
            user=request.user,
            video=video
        )
        if watched_duration > progress.watched_duration:
            progress.watched_duration = watched_duration
            progress.save()
        return Response({'watched_duration': progress.watched_duration}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        video = self.get_object()
        progress = VideoProgress.objects.filter(
            user=request.user,
            video=video
        ).first()
        return Response({
            'watched': getattr(progress, 'watched', False),
            'watched_duration': getattr(progress, 'watched_duration', 0),
            'quiz_completed': getattr(progress, 'quiz_completed', False),
            'locked_until_rewatch': getattr(progress, 'locked_until_rewatch', False)
        })

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, pk=None):
        video = self.get_object()

        progress, created = VideoProgress.objects.get_or_create(
            user=request.user,
            video=video,
            defaults={
                "watched": True,
                "watched_duration": video.duration or 0,
                "quiz_completed": False,
                "locked_until_rewatch": False,
            }
        )

        if not created:
            progress.watched = True
            progress.watched_duration = video.duration or 0
            progress.locked_until_rewatch = False
            progress.save()

        quiz = Quiz.objects.filter(video=video).first()
        if quiz:
            if progress.locked_until_rewatch:
                QuizAttempt.objects.filter(
                    user=request.user,
                    quiz=quiz
                ).delete()

        enrollment = Enrollment.objects.filter(user=request.user, course=video.course).first()
        if enrollment:
            update_enrollment_progress(enrollment)

        return Response({
            'watched': True,
            'has_quiz': bool(quiz),
            'quiz_id': quiz.id if quiz else None,
            'quiz_completed': progress.quiz_completed
        })

    def destroy(self, request, *args, **kwargs):
        video_to_delete = self.get_object()
        video_to_delete.is_deleted = True
        video_to_delete.save()
        return Response({'message': 'Video soft deleted'}, status=204)

# ==================== Quiz Views ====================
class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.filter(is_deleted=False)
    serializer_class = QuizSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course', None)
        if course_id is not None:
            queryset = queryset.filter(course_id=course_id)
        queryset = queryset.filter(course__is_deleted=False)
        return queryset

    @action(detail=True, methods=['get'])
    def can_attempt(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if quiz.video:
            progress = VideoProgress.objects.filter(
                user=user,
                video=quiz.video,
                watched=True
            ).first()
            if not progress or progress.locked_until_rewatch:
                return Response({
                    'can_attempt': False,
                    'reason': 'Must watch or rewatch the video first'
                })

        if quiz.is_final:
            all_videos = [
                video
                for video in quiz.course.videos.filter(is_deleted=False)
                if video_has_accessible_media(video)
            ]
            completed_count = 0

            for video in all_videos:
                progress = VideoProgress.objects.filter(user=user, video=video, watched=True).first()
                has_quiz = Quiz.objects.filter(video=video, is_deleted=False).exists()

                if has_quiz:
                    if progress and progress.quiz_completed:
                        completed_count += 1
                else:
                    if progress and progress.watched:
                        completed_count += 1

            if completed_count < len(all_videos):
                return Response({
                    'can_attempt': False,
                    'reason': 'Must complete all videos and quizzes first'
                })

        return Response({'can_attempt': True})

    @action(detail=True, methods=['post'])
    def attempt(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        course = quiz.course

        attempt_count = QuizAttempt.objects.filter(user=user, quiz=quiz).count()

        if attempt_count >= 3:
            if quiz.is_final:
                with transaction.atomic():
                    VideoProgress.objects.filter(
                        user=user,
                        video__course=course
                    ).delete()
                    QuizAttempt.objects.filter(
                        user=user,
                        quiz__course=course
                    ).delete()
                    enrollment = Enrollment.objects.filter(
                        user=user,
                        course=course
                    ).first()
                    if enrollment:
                        enrollment.progress = 'NOT_STARTED'
                        enrollment.completed_on = None
                        enrollment.save()

                return Response({
                    "error": "You have failed the final quiz 3 times. "
                             "Your entire course progress has been reset. "
                             "Please start over from the beginning.",
                    "reset_course": True,
                    "redirect_lesson_index": 0
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                if quiz.video:
                    progress, created = VideoProgress.objects.get_or_create(
                        user=user,
                        video=quiz.video
                    )
                    progress.locked_until_rewatch = True
                    progress.save()

                    QuizAttempt.objects.filter(
                        user=user,
                        quiz=quiz
                    ).delete()

                    return Response({
                        "error": "You have failed this quiz 3 times. "
                                 "You must rewatch the video before trying again.",
                        "video_id": quiz.video.id,
                        "locked": True,
                        "redirect_to_video": True
                    }, status=status.HTTP_403_FORBIDDEN)

        answers = request.data.get('answers', {})
        total_questions = quiz.questions.count()
        correct_answers = 0

        for question_id, selected_choice in answers.items():
            question = quiz.questions.get(id=question_id)
            if question.choices[selected_choice].get('is_correct', False):
                correct_answers += 1

        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        is_passed = score >= quiz.passing_score

        attempt = QuizAttempt.objects.create(
            user=user,
            quiz=quiz,
            score=score,
            answers=answers,
            is_passed=is_passed
        )

        if quiz.video and is_passed:
            progress, _ = VideoProgress.objects.get_or_create(
                user=user,
                video=quiz.video
            )
            progress.quiz_completed = True
            progress.locked_until_rewatch = False
            progress.save()

        if quiz.is_final and is_passed:
            enrollment = Enrollment.objects.filter(user=user, course=course).first()
            if enrollment:
                enrollment.progress = 'COMPLETED'
                enrollment.completed_on = now()
                enrollment.save()
        else:
            enrollment = Enrollment.objects.filter(user=user, course=course).first()
            if enrollment:
                update_enrollment_progress(enrollment)

        return Response({
            'score': score,
            'is_passed': is_passed,
            'passing_score': quiz.passing_score,
            'attempted_on': attempt.attempted_on.isoformat(),
            'attempt_id': attempt.id,
            'attempt_count': attempt_count + 1
        })

    def destroy(self, request, *args, **kwargs):
        quiz_to_delete = self.get_object()
        quiz_to_delete.is_deleted = True
        quiz_to_delete.save()
        return Response({'message': 'Quiz soft deleted'}, status=204)

# ==================== Enrollment Views ====================
# FIX 2: Changed ReadOnlyModelViewSet → ModelViewSet so destroy() is actually registered
class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Enrollment.objects.none()
        return Enrollment.objects.filter(
            user=user,
            course__is_deleted=False
        ).select_related('course', 'user')

    def destroy(self, request, *args, **kwargs):
        if request.user.user_type == 'STAFF':
            return Response({'error': 'Staff cannot delete records'}, status=403)

        enrollment_to_delete = self.get_object()

        if request.user.user_type == 'ADMIN':
            enrollment_to_delete.delete()
            return Response({'message': 'Enrollment permanently deleted'}, status=204)

        if enrollment_to_delete.user != request.user:
            return Response({'error': 'You can only delete your own enrollments'}, status=403)

        enrollment_to_delete.delete()
        return Response({'message': 'Enrollment deleted'}, status=204)


class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(
            user=self.request.user,
            course__is_deleted=False
        )

    def destroy(self, request, *args, **kwargs):
        if request.user.user_type == 'STAFF':
            return Response({'error': 'Staff cannot delete records'}, status=403)

        certificate_to_delete = self.get_object()

        if request.user.user_type == 'ADMIN':
            certificate_to_delete.delete()
            return Response({'message': 'Certificate permanently deleted'}, status=204)

        if certificate_to_delete.user != request.user:
            return Response({'error': 'You can only delete your own certificates'}, status=403)

        certificate_to_delete.delete()
        return Response({'message': 'Certificate deleted'}, status=204)

# ==================== Dashboard / Stats Views ====================
class UserAnalyticsView(generics.RetrieveAPIView):
    def get(self, request, *args, **kwargs):
        user_id = self.kwargs.get('user_id')
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        analytics = get_user_analytics(user)
        return Response(analytics)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request):
    serializer = StudentDashboardSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def newly_created_courses(request):
    twenty_four_hours_ago = timezone.now() - timedelta(hours=24)

    new_courses = Course.objects.filter(
        created_on__gte=twenty_four_hours_ago,
        is_active=True,
        is_deleted=False
    ).select_related('created_by').prefetch_related('category').order_by('-created_on')

    serialized_courses = CourseListSerializer(new_courses, many=True).data

    return Response({
        'has_newly_created': new_courses.exists(),
        'newly_created_courses': serialized_courses,
        'count': new_courses.count(),
        'timestamp': timezone.now().isoformat()
    })


@api_view(['GET'])
def admin_dashboard_stats(request):
    data = {
        "totalUsers": User.objects.filter(is_deleted=False).count(),
        "activeCourses": Course.objects.filter(is_active=True, is_deleted=False).count(),
        "totalTeams": Team.objects.filter(is_deleted=False).count(),
        "totalEnrollments": Enrollment.objects.filter(course__is_deleted=False).count(),
        "recentEnrollments": [
            {
                "id": e.id,
                "user": {"username": e.user.username},
                "course": {"title": e.course.title},
                "enrolled_on": e.enrolled_on,
            }
            for e in Enrollment.objects.filter(course__is_deleted=False)
              .select_related('user', 'course')
              .order_by('-enrolled_on')[:5]
        ],
        "recentCompletions": [
            {
                "id": e.id,
                "user": {"username": e.user.username},
                "course": {"title": e.course.title},
                "completed_on": e.completed_on,
            }
            for e in Enrollment.objects.filter(
                progress='COMPLETED',
                completed_on__isnull=False,
                course__is_deleted=False
            )
              .select_related('user', 'course')
              .order_by('-completed_on')[:5]
        ],
    }
    return Response(data)

# ==================== Student Performance ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_performance(request):
    user = request.user
    enrollments = Enrollment.objects.filter(
        user=user,
        course__is_deleted=False
    )

    def get_progress(e):
        if e.progress == "COMPLETED":
            return 100
        elif e.progress == "IN_PROGRESS":
            try:
                return calculate_course_progress(user, e.course)
            except:
                return 0
        return 0

    overall_progress = (
        sum(get_progress(e) for e in enrollments) / enrollments.count()
        if enrollments.exists() else 0
    )

    avg_quiz_score = (
        QuizAttempt.objects.filter(
            user=user,
            quiz__course__is_deleted=False
        ).aggregate(avg=Avg("score"))["avg"] or 0
    )

    completed_courses_count = enrollments.filter(progress="COMPLETED").count()

    progress_history = []
    for i in range(30, -1, -1):
        day = now().date() - timedelta(days=i)
        daily_enrollments = enrollments.filter(enrolled_on__date=day)
        progress = (
            sum(get_progress(e) for e in daily_enrollments) / daily_enrollments.count()
            if daily_enrollments.exists() else 0
        )
        progress_history.append({"date": str(day), "progress": progress})

    quiz_attempts = QuizAttempt.objects.filter(
        user=user,
        quiz__course__is_deleted=False
    )
    quiz_stats = {
        "excellent": quiz_attempts.filter(score__gte=90).count(),
        "good": quiz_attempts.filter(score__gte=70, score__lt=90).count(),
        "average": quiz_attempts.filter(score__gte=50, score__lt=70).count(),
        "poor": quiz_attempts.filter(score__lt=50).count(),
    }

    recent_quizzes = [
        {
            "id": qa.id,
            "title": qa.quiz.title if qa.quiz else "",
            "score": qa.score,
            "passed": qa.is_passed,
            "date": qa.attempted_on,
        }
        for qa in quiz_attempts.order_by("-attempted_on")[:5]
    ]

    course_progress = [
        {
            "title": e.course.title,
            "progress": get_progress(e),
        }
        for e in enrollments.select_related("course")
    ]

    course_details = []
    for e in enrollments.select_related("course"):
        course = e.course
        videos = course.videos.all()
        total_videos = videos.count()
        videos_completed = VideoProgress.objects.filter(
            user=user, video__in=videos, watched=True
        ).count()
        quizzes = course.quiz_set.all()
        total_quizzes = quizzes.count()
        quizzes_passed = QuizAttempt.objects.filter(
            user=user, quiz__in=quizzes, is_passed=True
        ).count()
        start_date = e.enrolled_on
        last_activity = (
            VideoProgress.objects.filter(user=user, video__in=videos)
            .aggregate(last=Max("last_watched"))["last"]
            or e.enrolled_on
        )
        course_details.append(
            {
                "id": course.id,
                "title": course.title,
                "progress": get_progress(e),
                "videos_completed": videos_completed,
                "total_videos": total_videos,
                "quizzes_passed": quizzes_passed,
                "total_quizzes": total_quizzes,
                "start_date": start_date,
                "last_activity": last_activity,
            }
        )

    return Response(
        {
            "overall_progress": overall_progress,
            "average_quiz_score": avg_quiz_score,
            "completed_courses_count": completed_courses_count,
            "progress_history": progress_history,
            "quiz_stats": quiz_stats,
            "recent_quizzes": recent_quizzes,
            "course_progress": course_progress,
            "course_details": course_details,
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_certificate(request, course_id):
    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        raise Http404("Course not found.")

    if not course.certificate:
        raise Http404("No certificate uploaded for this course.")

    enrollment = Enrollment.objects.filter(
        user=request.user,
        course=course,
        progress="COMPLETED"
    ).first()

    if not enrollment:
        return Response(
            {"error": "You must complete the course to download the certificate."},
            status=403
        )

    file_path = course.certificate.path
    filename = f"{course.title}_certificate{os.path.splitext(file_path)[-1]}"

    return FileResponse(
        open(file_path, 'rb'),
        as_attachment=True,
        filename=filename,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_generated_certificate(request, course_id):
    def can_manage_any_student_certificates(current_user):
        return current_user.is_superuser or current_user.is_staff or current_user.user_type in ['ADMIN', 'STAFF']

    def generate_and_store_certificate_file(target_user, target_course, target_enrollment):
        eligibility = get_certificate_eligibility(target_user, target_course, target_enrollment)
        if not eligibility.get('eligible'):
            raise PermissionError('; '.join(eligibility.get('reasons') or ['Certificate is not available.']))
        certificate, eligibility = prepare_certificate_record(
            target_user,
            target_course,
            enrollment=target_enrollment,
        )
        latest_template = get_certificate_template_for_course(target_course)
        template_path = getattr(latest_template.template_file, 'path', None)
        if not latest_template.template_file or (template_path and not os.path.exists(template_path)):
            raise FileNotFoundError('Certificate template not found.')

        if not has_reusable_generated_certificate(certificate, template=latest_template):
            file_bytes, certificate, _ = issue_certificate(
                certificate,
                generated_by=request.user,
                template=latest_template,
            )
        else:
            with certificate.certificate_file.open('rb') as certificate_file:
                file_bytes = certificate_file.read()

        output_extension = os.path.splitext(certificate.certificate_file.name or '')[1] or '.pdf'
        content_type = (
            'application/pdf'
            if output_extension.lower() == '.pdf'
            else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        return file_bytes, certificate, output_extension, content_type

    user = request.user

    if can_manage_any_student_certificates(user):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "As an admin, you must provide user_id."}, status=400)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        raise Http404("Course not found.")

    enrollment = Enrollment.objects.filter(
        user=user,
        course=course,
    ).first()

    if enrollment and enrollment.progress != 'COMPLETED' and check_course_completion(user, course):
        enrollment.progress = 'COMPLETED'
        enrollment.completed_on = enrollment.completed_on or timezone.now()
        enrollment.save(update_fields=['progress', 'completed_on'])

    if enrollment and enrollment.progress != 'COMPLETED':
        update_enrollment_progress(enrollment)
        enrollment.refresh_from_db()

    if enrollment and enrollment.progress == 'COMPLETED' and not enrollment.completed_on:
        enrollment.completed_on = timezone.now()
        enrollment.save(update_fields=['completed_on'])

    if not enrollment:
        return Response(
            {"error": "You are not enrolled in this course."},
            status=403
        )

    if enrollment.progress != 'COMPLETED':
        return Response(
            {"error": "Complete this course before downloading the certificate."},
            status=403
        )

    try:
        file_bytes, certificate, output_extension, content_type = generate_and_store_certificate_file(user, course, enrollment)
    except CertificateTemplate.DoesNotExist:
        return Response({"error": "No certificate template found."}, status=500)
    except FileNotFoundError:
        return Response({"error": "Certificate template not found."}, status=500)
    except PermissionError as exc:
        return Response({"error": str(exc)}, status=403)
    except Exception as exc:
        logger.error("Certificate generation failed for user=%s course=%s: %s", user.id, course.id, exc)
        return Response({"error": "Unable to generate certificate."}, status=500)

    filename = f"certificate_{course.title}_{user.username}_{certificate.certificate_uuid}{output_extension}"
    response = FileResponse(io.BytesIO(file_bytes), as_attachment=True, filename=filename)
    response['Content-Type'] = content_type
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_generated_certificate(request, course_id):
    response = download_generated_certificate(request, course_id)

    if isinstance(response, FileResponse):
        filename = response.filename or 'certificate.pdf'
        response.as_attachment = False
        response.headers['Content-Disposition'] = f'inline; filename="{filename}"'

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_certificate_share_courses(request):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({"error": "Only admins/staff can access this endpoint."}, status=403)

    courses = (
        Course.objects.filter(is_deleted=False, enrollment__progress='COMPLETED')
        .annotate(completed_students=Count('enrollment', filter=Q(enrollment__progress='COMPLETED'), distinct=True))
        .values('id', 'title', 'completed_students')
        .order_by('title')
    )

    return Response({'courses': list(courses)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_completed_students_for_course(request, course_id):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({"error": "Only admins/staff can access this endpoint."}, status=403)

    course = get_object_or_404(Course, pk=course_id, is_deleted=False)

    enrollments = (
        Enrollment.objects.select_related('user')
        .filter(course=course, progress='COMPLETED', user__is_deleted=False)
        .order_by('user__first_name', 'user__username')
    )

    students = []
    for enrollment in enrollments:
        student = enrollment.user
        completed_courses = list(
            Enrollment.objects.filter(user=student, progress='COMPLETED')
            .select_related('course')
            .values_list('course__title', flat=True)
        )

        students.append({
            'id': student.id,
            'name': f"{student.first_name} {student.last_name}".strip() or student.username,
            'email': student.email,
            'completed_courses': completed_courses,
            'completed_on': enrollment.completed_on,
        })

    return Response({
        'course': {'id': course.id, 'title': course.title},
        'students': students,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_certificate_to_students(request, course_id):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({"error": "Only admins/staff can share certificates."}, status=403)

    course = get_object_or_404(Course, pk=course_id, is_deleted=False)
    student_ids = request.data.get('student_ids', [])

    if not isinstance(student_ids, list) or not student_ids:
        return Response({"error": "student_ids must be a non-empty list."}, status=400)

    subject = request.data.get('subject') or f"Your certificate for {course.title}"
    custom_message = request.data.get('message', '').strip()

    enrollments = (
        Enrollment.objects.select_related('user')
        .filter(course=course, progress='COMPLETED', user_id__in=student_ids)
    )

    sent = []
    failed = []
    skipped = []

    for enrollment in enrollments:
        student = enrollment.user

        if not student.email:
            skipped.append({'id': student.id, 'name': student.username, 'reason': 'Missing email'})
            continue

        try:
            certificate, _ = Certificate.objects.get_or_create(
                user=student,
                course=course,
                defaults={'enrollment': enrollment}
            )

            if certificate.enrollment_id != enrollment.id:
                certificate.enrollment = enrollment

            latest_template = get_certificate_template_for_course(course)
            if not latest_template.template_file or not os.path.exists(latest_template.template_file.path):
                raise ValueError('Certificate template not found.')

            certificate_bytes, payload, output_extension, content_type = render_certificate_file(
                certificate,
                template=latest_template,
                preview=False,
                require_pdf=False,
            )
            certificate.certificate_file.save(
                f"certificate_{certificate.certificate_uuid}{output_extension}",
                ContentFile(certificate_bytes),
                save=True,
            )

            student_name = f"{student.first_name} {student.last_name}".strip() or student.username

            email_content = generate_certificate_email(
                student_name,
                course.title,
                certificate.certificate_uuid,
                custom_message
            )

            email = EmailMessage(
                subject=subject,
                body=email_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email],
            )
            email.content_subtype = "html"

            filename = f"certificate_{course.title}_{student.username}_{certificate.certificate_uuid}{output_extension}"
            email.attach(filename, certificate_bytes, content_type)
            email.send(fail_silently=False)

            sent.append({'id': student.id, 'name': student_name, 'email': student.email})

        except Exception as exc:
            logger.error(f"Failed to send certificate to {student.email}: {str(exc)}")
            failed.append({
                'id': student.id,
                'name': student.username,
                'email': student.email,
                'reason': str(exc),
            })

    selected_ids = set(int(sid) for sid in student_ids if str(sid).isdigit())
    processed_ids = {item['id'] for item in sent} | {item['id'] for item in failed} | {item['id'] for item in skipped}
    not_completed_ids = list(selected_ids - processed_ids)

    return Response({
        'course_id': course.id,
        'course_title': course.title,
        'sent_count': len(sent),
        'failed_count': len(failed),
        'skipped_count': len(skipped),
        'not_completed_count': len(not_completed_ids),
        'sent': sent,
        'failed': failed,
        'skipped': skipped,
        'not_completed_ids': not_completed_ids,
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_certificate_template(request):
    import os

    if not _is_admin_or_staff_user(request.user):
        return Response(
            {'error': 'Only admins or staff can upload certificate templates.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    template_file = request.FILES.get('template')
    if not template_file:
        return Response({'error': 'No file provided.'}, status=400)

    course = None
    course_id = request.data.get('course_id')
    if course_id:
        course = get_object_or_404(Course, pk=course_id, is_deleted=False)

    name_x = request.data.get('name_x', 412)
    name_y = request.data.get('name_y', 231)
    course_x = request.data.get('course_x', 406)
    course_y = request.data.get('course_y', 272)
    uuid_x = request.data.get('uuid_x', 411)
    uuid_y = request.data.get('uuid_y', 306)

    name_font = request.data.get('name_font', 'Helvetica-Bold')
    name_font_size = request.data.get('name_font_size', 28)
    course_font = request.data.get('course_font', 'Helvetica-Bold')
    course_font_size = request.data.get('course_font_size', 14)
    uuid_font = request.data.get('uuid_font', 'Helvetica')
    uuid_font_size = request.data.get('uuid_font_size', 10)
    signature_text = request.data.get('signature_text', '')
    signature_x = request.data.get('signature_x', 420)
    signature_y = request.data.get('signature_y', 520)
    signature_font = request.data.get('signature_font', 'Times-Italic')
    signature_font_size = request.data.get('signature_font_size', 22)
    staff_signature_text = request.data.get('staff_signature_text', '')
    staff_signature_x = request.data.get('staff_signature_x', 560)
    staff_signature_y = request.data.get('staff_signature_y', 520)
    staff_signature_font = request.data.get('staff_signature_font', 'Times-Italic')
    staff_signature_font_size = request.data.get('staff_signature_font_size', 22)

    custom_texts = []
    custom_texts_str = request.data.get('custom_texts', '')
    if custom_texts_str:
        try:
            import json
            custom_texts = json.loads(custom_texts_str)
        except (json.JSONDecodeError, TypeError):
            custom_texts = []

    file_name = (template_file.name or '').lower()
    if not file_name.endswith('.docx'):
        return Response({'error': 'Only Word .docx template files are allowed.'}, status=400)

    certificates_to_invalidate = Certificate.objects.filter(
        status=Certificate.STATUS_GENERATED,
        certificate_file__isnull=False,
    )
    if course:
        certificates_to_invalidate = certificates_to_invalidate.filter(course=course)

    invalidated_certificates = 0
    for certificate in certificates_to_invalidate:
        if not certificate.certificate_file:
            continue
        try:
            if os.path.exists(certificate.certificate_file.path):
                os.remove(certificate.certificate_file.path)
        except Exception:
            logger.warning("Unable to remove stale certificate file for certificate=%s", certificate.pk)
        certificate.certificate_file = ''
        certificate.status = Certificate.STATUS_PENDING_APPROVAL
        certificate.save(update_fields=['certificate_file', 'status'])
        invalidated_certificates += 1

    old_templates = CertificateTemplate.objects.filter(course=course)
    for old in old_templates:
        if old.template_file and os.path.exists(old.template_file.path):
            os.remove(old.template_file.path)
    old_templates.delete()

    template = CertificateTemplate.objects.create(
        course=course,
        uploaded_by=request.user,
        template_file=template_file,
        name_x=name_x,
        name_y=name_y,
        course_x=course_x,
        course_y=course_y,
        uuid_x=uuid_x,
        uuid_y=uuid_y,
        name_font=name_font,
        name_font_size=name_font_size,
        course_font=course_font,
        course_font_size=course_font_size,
        uuid_font=uuid_font,
        uuid_font_size=uuid_font_size,
        signature_text=signature_text,
        signature_x=signature_x,
        signature_y=signature_y,
        signature_font=signature_font,
        signature_font_size=signature_font_size,
        staff_signature_text=staff_signature_text,
        staff_signature_x=staff_signature_x,
        staff_signature_y=staff_signature_y,
        staff_signature_font=staff_signature_font,
        staff_signature_font_size=staff_signature_font_size,
        custom_texts=custom_texts,
    )

    return Response({
        'message': 'Template uploaded successfully.',
        'template_url': template.template_file.url,
        'invalidated_certificates': invalidated_certificates,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_certificate_template_status(request):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({'error': 'Only admins/staff can access certificate template status.'}, status=403)

    common_template = CertificateTemplate.objects.filter(course__isnull=True).order_by('-uploaded_at').first()
    courses = Course.objects.filter(is_deleted=False).values('id', 'title').order_by('title')
    course_template_map = {}
    for template in CertificateTemplate.objects.filter(course__isnull=False).order_by('course_id', '-uploaded_at'):
        if template.course_id not in course_template_map:
            course_template_map[template.course_id] = template

    return Response({
        'has_template': bool(common_template and common_template.template_file),
        'template_uploaded_at': common_template.uploaded_at if common_template else None,
        'courses': [
            {
                'course_id': course['id'],
                'course_name': course['title'],
                'has_template': bool(course_template_map.get(course['id']) and course_template_map[course['id']].template_file),
                'last_updated': course_template_map[course['id']].uploaded_at if course_template_map.get(course['id']) else None,
                'updated_by': (
                    course_template_map[course['id']].uploaded_by.username
                    if course_template_map.get(course['id']) and course_template_map[course['id']].uploaded_by
                    else None
                ),
            }
            for course in courses
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_certificate_template_file(request, course_id):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({'error': 'Only admins/staff can view certificate templates.'}, status=403)

    course = get_object_or_404(Course, pk=course_id, is_deleted=False)
    latest_template = CertificateTemplate.objects.filter(course=course).order_by('-uploaded_at').first()
    if not latest_template or not latest_template.template_file:
        raise Http404('Certificate template not found.')

    return FileResponse(
        latest_template.template_file.open('rb'),
        as_attachment=False,
        filename=os.path.basename(latest_template.template_file.name),
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_common_certificate_template_file(request):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({'error': 'Only admins/staff can view certificate templates.'}, status=403)

    latest_template = CertificateTemplate.objects.filter(course__isnull=True).order_by('-uploaded_at').first()
    if not latest_template or not latest_template.template_file:
        raise Http404('Certificate template not found.')

    return FileResponse(
        latest_template.template_file.open('rb'),
        as_attachment=False,
        filename=os.path.basename(latest_template.template_file.name),
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_sample_certificate_template(request):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({'error': 'Only admins/staff can download certificate templates.'}, status=403)

    latest_template = CertificateTemplate.objects.filter(course__isnull=True).order_by('-uploaded_at').first()
    if not latest_template or not latest_template.template_file:
        raise Http404('Certificate template not found.')

    return FileResponse(
        latest_template.template_file.open('rb'),
        as_attachment=True,
        filename=os.path.basename(latest_template.template_file.name),
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_certificate_template_settings(request):
    if not (request.user.is_superuser or request.user.is_staff or request.user.user_type in ['ADMIN', 'STAFF']):
        return Response({'error': 'Only admins/staff can update certificate settings.'}, status=403)

    course = None
    course_id = request.data.get('course_id')
    if course_id:
        course = get_object_or_404(Course, pk=course_id, is_deleted=False)

    latest_template = CertificateTemplate.objects.filter(course=course).order_by('-uploaded_at').first()
    if not latest_template:
        return Response({'error': 'No certificate template found. Upload a template first.'}, status=400)

    def to_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    latest_template.name_x = to_int(request.data.get('name_x'), latest_template.name_x)
    latest_template.name_y = to_int(request.data.get('name_y'), latest_template.name_y)
    latest_template.course_x = to_int(request.data.get('course_x'), latest_template.course_x)
    latest_template.course_y = to_int(request.data.get('course_y'), latest_template.course_y)
    latest_template.uuid_x = to_int(request.data.get('uuid_x'), latest_template.uuid_x)
    latest_template.uuid_y = to_int(request.data.get('uuid_y'), latest_template.uuid_y)
    latest_template.signature_x = to_int(request.data.get('signature_x'), latest_template.signature_x)
    latest_template.signature_y = to_int(request.data.get('signature_y'), latest_template.signature_y)
    latest_template.signature_text = request.data.get('signature_text', latest_template.signature_text)
    latest_template.staff_signature_x = to_int(request.data.get('staff_signature_x'), latest_template.staff_signature_x)
    latest_template.staff_signature_y = to_int(request.data.get('staff_signature_y'), latest_template.staff_signature_y)
    latest_template.staff_signature_text = request.data.get('staff_signature_text', latest_template.staff_signature_text)

    latest_template.name_font = request.data.get('name_font', latest_template.name_font)
    latest_template.name_font_size = to_int(request.data.get('name_font_size'), latest_template.name_font_size)
    latest_template.course_font = request.data.get('course_font', latest_template.course_font)
    latest_template.course_font_size = to_int(request.data.get('course_font_size'), latest_template.course_font_size)
    latest_template.uuid_font = request.data.get('uuid_font', latest_template.uuid_font)
    latest_template.uuid_font_size = to_int(request.data.get('uuid_font_size'), latest_template.uuid_font_size)
    latest_template.signature_font = request.data.get('signature_font', latest_template.signature_font)
    latest_template.signature_font_size = to_int(request.data.get('signature_font_size'), latest_template.signature_font_size)
    latest_template.staff_signature_font = request.data.get('staff_signature_font', latest_template.staff_signature_font)
    latest_template.staff_signature_font_size = to_int(request.data.get('staff_signature_font_size'), latest_template.staff_signature_font_size)

    if 'custom_texts' in request.data:
        custom_texts_data = request.data.get('custom_texts', [])
        if isinstance(custom_texts_data, str):
            try:
                import json
                custom_texts_data = json.loads(custom_texts_data)
            except (json.JSONDecodeError, TypeError):
                custom_texts_data = []
        latest_template.custom_texts = custom_texts_data

    latest_template.uploaded_at = timezone.now()
    latest_template.save()

    return Response({'message': 'Certificate template settings saved successfully.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_certificate(request, certificate_identifier):
    try:
        certificate = Certificate.objects.select_related('user', 'course').filter(
            certificate_number=certificate_identifier
        ).first()

        if certificate is None:
            certificate = Certificate.objects.select_related('user', 'course').get(id=certificate_identifier)

        course = certificate.course

        return Response({
            'valid': True,
            'certificate': {
                'uuid': certificate.certificate_uuid,
                'certificate_number': certificate.certificate_number,
                'user_name': f"{certificate.user.first_name} {certificate.user.last_name}".strip() or certificate.user.username,
                'course_title': course.title,
                'generated_at': certificate.generated_at,
                'course_description': course.description,
            }
        })
    except (Certificate.DoesNotExist, ValueError, ValidationError):
        return Response({
            'valid': False,
            'error': 'Certificate not found'
        }, status=status.HTTP_404_NOT_FOUND)

# ==================== OTP Forgot Password Endpoints ====================
import random
from django.utils import timezone
from datetime import timedelta
from .utils import create_otp_for_email, send_otp_email, verify_otp, get_user_by_email


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    print(f"=== OTP Request for email: {email} ===")

    if not email:
        print("No email provided in request.")
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    import re
    email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_regex.match(email):
        print(f"Invalid email format: {email}")
        return Response({'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = get_user_by_email(email)
        if not user:
            print(f"User not found for email: {email}")
            return Response({'error': 'No user found with this email address'}, status=status.HTTP_400_BAD_REQUEST)

        print(f"User found: {user.first_name} {user.last_name}")

        otp = create_otp_for_email(email, settings.OTP_EXPIRY_MINUTES)
        print(f"OTP created: {otp.otp_code} for {email}")

        try:
            user_name = user.first_name or user.username
            html_content = generate_otp_email(user_name, otp.otp_code)
            success, message = send_html_email(
                subject="Password Reset OTP - Learning Management System",
                html_content=html_content,
                recipient_list=[email]
            )

            if success:
                print(f"OTP email sent successfully to {email}")
                return Response({
                    'message': 'OTP sent successfully to your email'
                }, status=status.HTTP_200_OK)
            else:
                print(f"Failed to send OTP email to {email}: {message}")
                otp.delete()
                return Response({
                    'error': f'Failed to send email: {message}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as email_error:
            print(f"Email sending error: {str(email_error)}")
            otp.delete()
            return Response({
                'error': f'Email delivery failed: {str(email_error)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print(f"OTP creation error: {str(e)}")
        return Response({'error': 'Failed to send OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    print(f"=== OTP Verification Request ===")
    print(f"Request data: {request.data}")

    email = request.data.get('email')
    otp_code = request.data.get('otp')
    new_password = request.data.get('new_password')

    print(f"Email: {email}")
    print(f"OTP Code: {otp_code}")
    print(f"New Password: {'Provided' if new_password else 'Not provided'}")

    if not all([email, otp_code]):
        print("Missing email or OTP")
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        print("Attempting to verify OTP...")
        is_valid, message = verify_otp(email, otp_code, for_password_reset=True)
        print(f"OTP verification result: {is_valid}, Message: {message}")

        if not is_valid:
            print(f"OTP verification failed for email: {email} with code: {otp_code}")
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        print("Looking up user...")
        user = get_user_by_email(email)
        if not user:
            print(f"User not found for email: {email}")
            return Response({'error': 'No user found with this email'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password:
            print("Updating user password...")
            user.set_password(new_password)
            user.save()
            print("Password updated successfully")

            print("Generating JWT tokens...")
            refresh = RefreshToken.for_user(user)
            print("OTP verification and password reset completed successfully")

            return Response({
                'message': 'Password reset successfully',
                'token': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_200_OK)
        else:
            print("OTP verification completed successfully (no password reset)")
            return Response({
                'message': 'OTP verified successfully'
            }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in verify_otp_view: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Failed to verify OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_staff(request):
    if not request.user.is_superuser and request.user.user_type != 'ADMIN':
        return Response({"error": "Only admins can create staff."}, status=403)

    email = request.data.get('email')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')

    if not email or not first_name or not last_name:
        return Response({"error": "Email, first name, and last name are required."}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "User with this email already exists."}, status=400)

    password = get_random_string(length=10)

    user = User.objects.create(
        username=email,
        email=email,
        first_name=first_name,
        last_name=last_name,
        user_type='STAFF'
    )
    user.set_password(password)
    user.save()

    try:
        site_url = request.build_absolute_uri('/')
        html_content = generate_welcome_email_staff(first_name, email, password, site_url)
        success, message = send_html_email(
            subject="Welcome to LMS - Your Staff Account Credentials",
            html_content=html_content,
            recipient_list=[email]
        )

        if not success:
            logger.error(f"Failed to send welcome email to {email}: {message}")
            return Response({
                "message": "Staff created but email notification failed.",
                "email_error": message
            }, status=201)

    except Exception as e:
        logger.error(f"Email sending failed for {email}: {str(e)}")

    return Response({
        "message": "Staff created successfully. Credentials sent via email.",
        "email": email
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_staff(request):
    if not request.user.is_superuser and request.user.user_type != 'ADMIN':
        return Response({"error": "Only admins can register staff."}, status=403)

    email = str(request.data.get('email', '')).strip().lower()
    first_name = str(request.data.get('first_name', '')).strip()
    last_name = str(request.data.get('last_name', '')).strip()

    field_errors = {}
    if not first_name:
        field_errors['first_name'] = 'First name is required.'
    if not last_name:
        field_errors['last_name'] = 'Last name is required.'
    if not email:
        field_errors['email'] = 'Email is required.'
    else:
        try:
            validate_email(email)
        except ValidationError:
            field_errors['email'] = 'Enter a valid email address.'

    if field_errors:
        return Response(field_errors, status=400)

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return Response({"email": "User with this email already exists."}, status=400)

    password = get_random_string(length=10)

    existing_staff_ids = User.objects.filter(
        user_type='STAFF',
        staff_id__isnull=False
    ).values_list('staff_id', flat=True)

    max_staff_num = 1000
    for sid in existing_staff_ids:
        if not sid:
            continue
        sid_str = str(sid).strip()
        if sid_str.startswith("STAFF-"):
            suffix = sid_str.split("STAFF-", 1)[1]
            if suffix.isdigit():
                max_staff_num = max(max_staff_num, int(suffix))
    next_staff_num = max_staff_num + 1

    attempts = 0
    while attempts < 5:
        attempts += 1
        candidate_staff_id = f"STAFF-{next_staff_num}"
        try:
            user = User.objects.create(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                user_type='STAFF',
                staff_id=candidate_staff_id,
            )
            user.set_password(password)
            user.save(update_fields=['password'])
            break
        except IntegrityError:
            if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
                return Response({"email": "User with this email already exists."}, status=400)
            next_staff_num += 1
    else:
        return Response(
            {"error": "Unable to generate a unique staff ID. Please try again."},
            status=500
        )

    try:
        site_url = request.build_absolute_uri('/')
        html_content = generate_welcome_email_staff(first_name, email, password, site_url)
        success, message = send_html_email(
            subject="Welcome to LMS - Your Staff Account Credentials",
            html_content=html_content,
            recipient_list=[email]
        )

        if not success:
            logger.error(f"Failed to send welcome email to {email}: {message}")
            return Response({
                "message": "Staff registered successfully! (Email notification failed, but account is created)",
                "email_error": message
            }, status=status.HTTP_201_CREATED)

        logger.info(f"Staff account created successfully for {email}. Welcome email sent.")

    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {str(e)}")

    return Response({
        "message": "Staff registered successfully!"
    })

# ==================== Notification Views ====================
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"detail": "Notification marked as read."})
    except Notification.DoesNotExist:
        return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"detail": "All notifications marked as read."})


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def live_notifications(request):
    since = request.query_params.get('since')
    notifications_qs = Notification.objects.filter(user=request.user)

    if since:
        parsed = parse_datetime(since)
        if parsed:
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)
            notifications_qs = notifications_qs.filter(created_at__gt=parsed)

    notifications_qs = notifications_qs.order_by('-created_at')[:50]
    serializer = NotificationSerializer(notifications_qs, many=True)
    latest = notifications_qs[0].created_at if notifications_qs else None

    return Response({
        "notifications": serializer.data,
        "latest": latest,
        "unread_count": Notification.objects.filter(user=request.user, is_read=False).count(),
    })

# ==================== Request endpoints ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_request(request):
    if request.user.user_type != 'STAFF':
        return Response(
            {"error": "Only staff users can create delete requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    request_type = request.data.get('request_type')
    object_id = request.data.get('object_id')
    object_title = request.data.get('object_title')
    message = request.data.get('message', '')

    if not all([request_type, object_id, object_title]):
        return Response(
            {"error": "request_type, object_id, and object_title are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_types = ['DELETE_COURSE', 'DELETE_VIDEO', 'DELETE_QUIZ', 'DELETE_CATEGORY', 'DELETE_TEAM', 'DELETE_USER']
    if request_type not in valid_types:
        return Response(
            {"error": f"Invalid request_type. Must be one of: {valid_types}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        delete_request = Request.objects.create(
            request_type=request_type,
            object_id=object_id,
            object_title=object_title,
            message=message,
            requested_by=request.user
        )

        admin_users = User.objects.filter(user_type='ADMIN')
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                sender=request.user,
                message=f"New delete request: {request_type} for '{object_title}' by {request.user.username}"
            )

        return Response({
            "message": "Delete request created successfully",
            "request_id": delete_request.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {"error": f"Failed to create request: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_requests(request):
    if request.user.user_type == 'ADMIN':
        requests = Request.objects.all()
    elif request.user.user_type == 'STAFF':
        requests = Request.objects.filter(requested_by=request.user)
    else:
        return Response(
            {"error": "Only admin and staff users can view requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    requests_data = []
    for req in requests:
        requests_data.append({
            'id': req.id,
            'request_type': req.request_type,
            'object_id': req.object_id,
            'object_title': req.object_title,
            'message': req.message,
            'status': req.status,
            'created_at': req.created_at,
            'requested_by': req.requested_by.username,
            'resolved_by': req.resolved_by.username if req.resolved_by else None,
            'resolved_at': req.resolved_at
        })

    return Response(requests_data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def resolve_request(request, request_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can resolve requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        delete_request = Request.objects.get(id=request_id)
    except Request.DoesNotExist:
        return Response(
            {"error": "Request not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    action = request.data.get('action')
    admin_message = request.data.get('message', '')

    if action not in ['approve', 'reject']:
        return Response(
            {"error": "Action must be 'approve' or 'reject'"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if delete_request.status != 'PENDING':
        return Response(
            {"error": "Only pending requests can be resolved."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if action == 'approve':
        if delete_request.request_type == 'STUDENT_REGISTRATION':
            student = User.objects.filter(
                id=delete_request.object_id,
                user_type='STUDENT',
                is_deleted=False
            ).first()
            if not student:
                return Response(
                    {"error": "Student account not found for this registration request."},
                    status=status.HTTP_404_NOT_FOUND
                )
            student.is_active = True
            student.save(update_fields=['is_active'])

        elif delete_request.request_type == 'COURSE_ENROLLMENT':
            target_course = Course.objects.filter(id=delete_request.object_id, is_deleted=False).first()
            if not target_course:
                return Response(
                    {"error": "Course not found for this enrollment request."},
                    status=status.HTTP_404_NOT_FOUND
                )
            Enrollment.objects.get_or_create(
                user=delete_request.requested_by,
                course=target_course,
            )

        else:
            # FIX 4: Flattened the approve/reject structure to be explicit
            model_map = {
                'DELETE_COURSE': Course,
                'DELETE_VIDEO': Video,
                'DELETE_QUIZ': Quiz,
                'DELETE_CATEGORY': Category,
                'DELETE_TEAM': Team,
                'DELETE_USER': User,
            }
            model = model_map.get(delete_request.request_type)
            if not model:
                return Response(
                    {"error": "Unsupported request type."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            model.objects.filter(id=delete_request.object_id).update(is_deleted=True)

    else:
        # action == 'reject'
        # For STUDENT_REGISTRATION: deactivate the account
        if delete_request.request_type == 'STUDENT_REGISTRATION':
            User.objects.filter(
                id=delete_request.object_id,
                user_type='STUDENT',
                is_deleted=False
            ).update(is_active=False)
        # For DELETE_* types: no object action needed on reject, just update status below

    delete_request.status = 'APPROVED' if action == 'approve' else 'REJECTED'
    delete_request.resolved_by = request.user
    delete_request.resolved_at = now()
    delete_request.message = f"{delete_request.message}\n\nAdmin Response: {admin_message}" if admin_message else delete_request.message
    delete_request.save()

    if delete_request.request_type == 'STUDENT_REGISTRATION':
        notification_message = f"Your registration request has been {delete_request.status.lower()}"
    else:
        notification_message = f"Your {delete_request.request_type} request for '{delete_request.object_title}' has been {delete_request.status.lower()}"
    if admin_message:
        notification_message += f". Reason: {admin_message}"

    Notification.objects.create(
        user=delete_request.requested_by,
        sender=request.user,
        message=notification_message
    )

    return Response({
        "message": f"Request {action}d successfully",
        "status": delete_request.status
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def undo_request(request, request_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can undo requests"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        delete_request = Request.objects.get(id=request_id)
    except Request.DoesNotExist:
        return Response(
            {"error": "Request not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if delete_request.status != 'APPROVED':
        return Response(
            {"error": "Only approved requests can be undone"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        if delete_request.request_type == 'DELETE_COURSE':
            Course.objects.filter(id=delete_request.object_id).update(is_deleted=False)
        elif delete_request.request_type == 'DELETE_VIDEO':
            Video.objects.filter(id=delete_request.object_id).update(is_deleted=False)
        elif delete_request.request_type == 'DELETE_QUIZ':
            Quiz.objects.filter(id=delete_request.object_id).update(is_deleted=False)
        elif delete_request.request_type == 'DELETE_CATEGORY':
            Category.objects.filter(id=delete_request.object_id).update(is_deleted=False)
        elif delete_request.request_type == 'DELETE_TEAM':
            Team.objects.filter(id=delete_request.object_id).update(is_deleted=False)
        elif delete_request.request_type == 'DELETE_USER':
            User.objects.filter(id=delete_request.object_id).update(is_deleted=False)

        delete_request.status = 'UNDONE'
        delete_request.resolved_by = request.user
        delete_request.resolved_at = now()
        delete_request.save()

        Notification.objects.create(
            user=delete_request.requested_by,
            sender=request.user,
            message=f"Your {delete_request.request_type} request for '{delete_request.object_title}' has been undone by admin"
        )

        return Response({
            "message": "Object restored successfully",
            "status": delete_request.status
        })

    except Exception as e:
        return Response(
            {"error": f"Failed to restore object: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deleted_actions(request):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can view deleted actions"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        data = []

        try:
            soft_deleted_users = User.objects.filter(is_deleted=True)
            for user in soft_deleted_users:
                data.append({
                    'id': user.id,
                    'type': 'USER',
                    'title': f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.username,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user.user_type,
                    'deleted_at': getattr(user, 'updated_at', None) or user.date_joined,
                    'can_permanently_delete': True,
                    'object_id': user.id,
                })
        except Exception as e:
            print(f"Error processing soft-deleted users: {str(e)}")

        try:
            soft_deleted_courses = Course.objects.filter(is_deleted=True)
            for course in soft_deleted_courses:
                data.append({
                    'id': course.id,
                    'type': 'COURSE',
                    'title': course.title,
                    'description': course.description or '',
                    'created_by': course.created_by.username if course.created_by else 'Unknown',
                    'deleted_at': getattr(course, 'updated_at', None) or course.created_on,
                    'can_permanently_delete': True,
                    'object_id': course.id,
                })
        except Exception as e:
            print(f"Error processing soft-deleted courses: {str(e)}")

        try:
            # FIX 5: Include UNDONE requests too so they can be permanently deleted
            deleted_requests = Request.objects.filter(
                status__in=['APPROVED', 'UNDONE']
            ).select_related('requested_by', 'resolved_by').order_by('-created_at')

            for req in deleted_requests:
                data.append({
                    'id': f"req_{req.id}",
                    'type': 'REQUEST',
                    'request_type': req.request_type,
                    'title': req.object_title,
                    'requested_by': req.requested_by.username if req.requested_by else 'Unknown',
                    'resolved_by': req.resolved_by.username if req.resolved_by else 'Unknown',
                    'status': req.status,
                    'message': req.message or '',
                    'created_at': req.created_at,
                    'resolved_at': req.resolved_at,
                    'can_permanently_delete': True,
                    'object_id': req.id,
                })
        except Exception as e:
            print(f"Error processing deleted requests: {str(e)}")

        try:
            def get_sort_date(item):
                deleted_at = item.get('deleted_at')
                resolved_at = item.get('resolved_at')
                created_at = item.get('created_at')

                if deleted_at:
                    return deleted_at
                elif resolved_at:
                    return resolved_at
                elif created_at:
                    return created_at
                else:
                    return None

            data.sort(key=get_sort_date, reverse=True)
        except Exception as e:
            print(f"Error sorting data: {str(e)}")

        return Response(data)

    except Exception as e:
        return Response(
            {"error": f"Failed to fetch deleted actions: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_request(request, request_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete objects"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        delete_request = Request.objects.get(id=request_id)
    except Request.DoesNotExist:
        return Response(
            {"error": "Request not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # FIX 5: Allow permanent delete for both APPROVED and UNDONE statuses
    if delete_request.status not in ('APPROVED', 'UNDONE'):
        return Response(
            {"error": "Only approved or undone requests can be permanently deleted"},
            status=status.HTTP_400_BAD_REQUEST
        )

    model_map = {
        'DELETE_COURSE': Course,
        'DELETE_VIDEO': Video,
        'DELETE_QUIZ': Quiz,
        'DELETE_CATEGORY': Category,
        'DELETE_TEAM': Team,
        'DELETE_USER': User,
    }
    model = model_map.get(delete_request.request_type)

    if not model:
        return Response(
            {"error": "Unsupported request type."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        target = model.objects.filter(id=delete_request.object_id).first()
        if target:
            target.delete()

        delete_request.delete()

        return Response({
            "message": "Object permanently deleted successfully"
        })

    except ProtectedError:
        return Response(
            {"error": "Object cannot be permanently deleted because related records still exist."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to permanently delete object: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ==================== Custom Authentication View ====================
def _ensure_mandatory_course_enrollments(user):
    try:
        if getattr(user, "user_type", None) != "STUDENT":
            return

        from django.db.models import F
        from django.db.models.functions import Lower, Trim

        mandatory_titles = ("excel", "communication")
        base = (
            Course.objects.filter(is_deleted=False, is_active=True)
            .annotate(_norm_title=Lower(Trim(F("title"))))
        )

        resolved_courses = []
        for title in mandatory_titles:
            course = base.filter(_norm_title=title).first()
            if not course:
                course = base.filter(_norm_title__contains=title).order_by("created_on").first()
            if course:
                resolved_courses.append(course)

        for course in resolved_courses:
            CourseAssignment.objects.get_or_create(user=user, course=course)
            Enrollment.objects.get_or_create(user=user, course=course)
    except Exception as e:
        logger.exception("Mandatory auto-enroll failed for user_id=%s: %s", getattr(user, "id", None), e)


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if username and password:
            try:
                user = User.objects.get(username=username, is_deleted=False)
                if user.check_password(password):
                    if not user.is_active:
                        return Response(
                            {"detail": "Please contact your administrator to get access"},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                    _award_student_login_reward(user, points=2)
                    return super().post(request, *args, **kwargs)
                else:
                    return Response(
                        {"detail": "Invalid credentials"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            except User.DoesNotExist:
                return Response(
                    {"detail": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        return super().post(request, *args, **kwargs)

# ==================== Permanent Deletion Endpoints ====================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_user(request, user_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete users"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        user_to_delete = User.objects.get(id=user_id, is_deleted=True)
    except User.DoesNotExist:
        return Response(
            {"error": "Soft-deleted user not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if user_to_delete == request.user:
        return Response(
            {"error": "You cannot delete your own account"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user_to_delete.delete()
        return Response({
            "message": "User permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete user: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_course(request, course_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete courses"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        course_to_delete = Course.objects.get(id=course_id, is_deleted=True)
    except Course.DoesNotExist:
        return Response(
            {"error": "Soft-deleted course not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        course_to_delete.delete()
        return Response({
            "message": "Course permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete course: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_team(request, team_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete teams"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
       team_to_delete = Team.objects.get(
    id=team_id
)
    except Team.DoesNotExist:
        return Response(
            {"error": "Soft-deleted team not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        team_to_delete.delete()
        return Response({
            "message": "Team permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete team: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_category(request, category_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete categories"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        category_to_delete = Category.objects.get(id=category_id, is_deleted=True)
    except Category.DoesNotExist:
        return Response(
            {"error": "Soft-deleted category not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        category_to_delete.delete()
        return Response({
            "message": "Category permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete category: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_video(request, video_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete videos"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        video_to_delete = Video.objects.get(id=video_id, is_deleted=True)
    except Video.DoesNotExist:
        return Response(
            {"error": "Soft-deleted video not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        video_to_delete.delete()
        return Response({
            "message": "Video permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete video: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanent_delete_quiz(request, quiz_id):
    if request.user.user_type != 'ADMIN':
        return Response(
            {"error": "Only admin users can permanently delete quizzes"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        quiz_to_delete = Quiz.objects.get(id=quiz_id, is_deleted=True)
    except Quiz.DoesNotExist:
        return Response(
            {"error": "Soft-deleted quiz not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        quiz_to_delete.delete()
        return Response({
            "message": "Quiz permanently deleted successfully"
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to delete quiz: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_picture(request, user_id):
    if request.user.id != user_id and request.user.user_type != 'ADMIN':
        return Response(
            {"error": "You can only update your own profile picture"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    profile_picture_url = request.data.get('profile_picture')
    if not profile_picture_url:
        return Response(
            {"error": "profile_picture URL is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user.profile_picture = profile_picture_url
        user.save()
        return Response({
            "message": "Profile picture updated successfully",
            "profile_picture": user.profile_picture
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to update profile picture: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ============================
# Feedback API Views
# ============================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request):
    if request.user.user_type not in ['STUDENT', 'EMPLOYEE']:
        return Response(
            {"error": "Only students can submit feedback"},
            status=status.HTTP_403_FORBIDDEN
        )

    course_id = request.data.get('course_id')
    message = request.data.get('message')
    rating = request.data.get('rating')

    if not course_id or not message or not rating:
        return Response(
            {"error": "course_id, message, and rating are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response(
            {"error": "Course not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        feedback = Feedback.objects.create(
            user=request.user,
            course=course,
            message=message,
            rating=rating
        )

        admin_users = User.objects.filter(user_type='ADMIN')
        staff_users = User.objects.filter(user_type='STAFF')

        for user in list(admin_users) + list(staff_users):
            Notification.objects.create(
                user=user,
                sender=request.user,
                message=f"New feedback received from {request.user.username} for course '{course.title}': {message[:100]}..."
            )

        return Response({
            "message": "Feedback submitted successfully",
            "feedback_id": feedback.id
        })

    except Exception as e:
        return Response(
            {"error": f"Failed to submit feedback: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feedback(request):
    if request.user.user_type not in ['ADMIN', 'STAFF']:
        return Response(
            {"error": "Only admin and staff can view feedback"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        feedback_list = Feedback.objects.all().select_related('user', 'course').order_by('-created_at')
        serializer = FeedbackSerializer(feedback_list, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response(
            {"error": f"Failed to fetch feedback: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_feedback_read(request, feedback_id):
    if request.user.user_type not in ['ADMIN', 'STAFF']:
        return Response(
            {"error": "Only admin and staff can mark feedback as read"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        feedback = Feedback.objects.get(id=feedback_id)
    except Feedback.DoesNotExist:
        return Response(
            {"error": "Feedback not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        feedback.is_read = True
        feedback.save()
        return Response({
            "message": "Feedback marked as read"
        })

    except Exception as e:
        return Response(
            {"error": f"Failed to mark feedback as read: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_feedback(request):
    if request.user.user_type not in ['STUDENT', 'EMPLOYEE']:
        return Response(
            {"error": "Only students and employees can view this feedback"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        course_id = request.query_params.get('course_id')
        queryset = Feedback.objects.exclude(user=request.user)
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        feedback_list = queryset.select_related('user', 'course').order_by('-created_at')[:50]

        serializer = FeedbackSerializer(feedback_list, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response(
            {"error": f"Failed to fetch feedback: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )