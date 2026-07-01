import os
from django.conf import settings
from django.db.models import Avg, Count
from datetime import datetime
from .models import Enrollment, QuizAttempt, VideoProgress

# OTP Utility Functions
import random
import string
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from .models import OTP, User

def file_field_exists(file_field):
    name = str(getattr(file_field, 'name', '') or '').strip()
    if not name:
        return False

    normalized = name.replace('\\', '/').lstrip('/')
    media_root = getattr(settings, 'MEDIA_ROOT', '')
    if not media_root:
        return bool(name)

    return os.path.exists(os.path.join(media_root, normalized.replace('/', os.sep)))


def video_has_accessible_media(video):
    return bool(
        (getattr(video, 'video_file', None) and file_field_exists(video.video_file))
        or (getattr(video, 'pdf_file', None) and file_field_exists(video.pdf_file))
    )

def calculate_course_progress(user, course):
    """Calculate progress: treat each video and each quiz (including final) as separate lessons."""
    total_lessons = 0
    completed_lessons = 0

    for video in course.videos.filter(is_deleted=False):
        if not video_has_accessible_media(video):
            continue

        vp = VideoProgress.objects.filter(user=user, video=video).first()
        watched = vp.watched if vp else False
        total_lessons += 1
        if watched:
            completed_lessons += 1

        quiz = course.quizzes.filter(video=video).first()
        if quiz:
            quiz_passed = QuizAttempt.objects.filter(
                user=user,
                quiz=quiz,
                is_passed=True
            ).exists()
            total_lessons += 1
            if quiz_passed:
                completed_lessons += 1

    final_quiz = course.quizzes.filter(is_final=True).first()
    if final_quiz:
        total_lessons += 1
        final_quiz_passed = QuizAttempt.objects.filter(
            user=user,
            quiz=final_quiz,
            is_passed=True
        ).exists()
        if final_quiz_passed:
            completed_lessons += 1

    return (completed_lessons / total_lessons * 100) if total_lessons else 0


def get_user_analytics(user):
    """Get comprehensive analytics for a user"""
    enrollments = Enrollment.objects.filter(user=user)
    
    return {
        'total_courses_enrolled': enrollments.count(),
        'courses_completed': enrollments.filter(progress='COMPLETED').count(),
        'courses_in_progress': enrollments.filter(progress='IN_PROGRESS').count(),
        'average_quiz_score': QuizAttempt.objects.filter(user=user).aggregate(
            Avg('score')
        )['score__avg'] or 0,
    }


def get_course_analytics(course):
    """Get comprehensive analytics for a course"""
    return {
        'total_enrollments': Enrollment.objects.filter(course=course).count(),
        'completed_count': Enrollment.objects.filter(
            course=course,
            progress='COMPLETED'
        ).count(),
        'in_progress_count': Enrollment.objects.filter(
            course=course,
            progress='IN_PROGRESS'
        ).count(),
        'average_quiz_score': QuizAttempt.objects.filter(
            quiz__course=course
        ).aggregate(Avg('score'))['score__avg'] or 0,
    }

def get_team_analytics(team):
    """Get comprehensive analytics for a team"""
    team_users = team.user_set.all()
    
    return {
        'member_count': team_users.count(),
        'total_enrollments': Enrollment.objects.filter(
            user__in=team_users
        ).count(),
        'total_completions': Enrollment.objects.filter(
            user__in=team_users,
            progress='COMPLETED'
        ).count(),
        'average_quiz_score': QuizAttempt.objects.filter(
            user__in=team_users
        ).aggregate(Avg('score'))['score__avg'] or 0,
    }

def check_course_completion(user, course):
    """Check if user has completed all video and quiz lessons (including final quiz)."""
    total_lessons = 0
    completed_lessons = 0

    for video in course.videos.filter(is_deleted=False):
        if not video_has_accessible_media(video):
            continue

        vp = VideoProgress.objects.filter(user=user, video=video).first()
        watched = vp.watched if vp else False
        total_lessons += 1
        if watched:
            completed_lessons += 1

        quiz = course.quizzes.filter(video=video).first()
        if quiz:
            quiz_passed = QuizAttempt.objects.filter(
                user=user,
                quiz=quiz,
                is_passed=True
            ).exists()
            total_lessons += 1
            if quiz_passed:
                completed_lessons += 1

    final_quiz = course.quizzes.filter(is_final=True).first()
    if final_quiz:
        total_lessons += 1
        final_quiz_passed = QuizAttempt.objects.filter(
            user=user,
            quiz=final_quiz,
            is_passed=True
        ).exists()
        if final_quiz_passed:
            completed_lessons += 1

    return total_lessons > 0 and total_lessons == completed_lessons

def update_enrollment_progress(enrollment):
    """Update enrollment progress based on user's activity"""
    progress = calculate_course_progress(enrollment.user, enrollment.course)
    
    if progress == 0:
        enrollment.progress = 'NOT_STARTED'
    elif progress == 100 and check_course_completion(enrollment.user, enrollment.course):
        enrollment.progress = 'COMPLETED'
        enrollment.completed_on = datetime.now()
    else:
        enrollment.progress = 'IN_PROGRESS'
    
    enrollment.save()

def generate_otp(length=6):
    """Generate a random OTP of specified length"""
    return ''.join(random.choices(string.digits, k=length))

def create_otp_for_email(email, expiry_minutes=5):
    """Create and save OTP for email"""
    # Delete any existing OTPs for this email
    OTP.objects.filter(email=email).delete()
    
    # Generate new OTP
    otp_code = generate_otp(settings.OTP_LENGTH)
    expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
    
    # Create OTP record
    otp = OTP.objects.create(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at
    )
    
    return otp

def send_otp_email(email, otp_code, user_name=None):
    """Send OTP via email"""
    subject = "🔐 LMS Password Reset OTP - Action Required"
    message = f"""
Dear {user_name or 'User'},

You have requested to reset your password for your LMS account.

🔢 Your OTP Code: {otp_code}

⏰ This OTP will expire in {settings.OTP_EXPIRY_MINUTES} minutes.

⚠️  IMPORTANT:
- Do not share this OTP with anyone
- If you didn't request this password reset, please ignore this email
- This OTP can only be used once

🔒 For security reasons, this OTP will expire automatically.

Best regards,
LMS Team

---
This is an automated message. Please do not reply to this email.
"""
    
    try:
        print(f"Attempting to send email to: {email}")
        print(f"From email: {settings.DEFAULT_FROM_EMAIL}")
        print(f"SMTP settings: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        print(f"Email sent successfully to {email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {email}: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False

def verify_otp(email, otp_code, for_password_reset=False):
    """Verify OTP for email"""
    try:
        print(f"Looking for OTP for email: {email}")
        
        # If it's for password reset, we can use either unverified or verified OTPs
        # that were created recently (within the last 5 minutes)
        if for_password_reset:
            from django.utils import timezone
            from datetime import timedelta
            
            otp = OTP.objects.filter(
                email=email,
                created_at__gte=timezone.now() - timedelta(minutes=5)
            ).order_by('-created_at').first()
        else:
            otp = OTP.objects.filter(
                email=email,
                is_verified=False
            ).first()
        
        if not otp:
            print(f"No valid OTP found for email: {email}")
            return False, "No OTP found for this email"
        
        print(f"Found OTP: {otp.otp_code}, Expires: {otp.expires_at}, Verified: {otp.is_verified}")
        
        if otp.is_expired():
            print(f"OTP has expired. Current time: {timezone.now()}")
            return False, "OTP has expired"
        
        print(f"Comparing OTP: Input={otp_code}, Stored={otp.otp_code}")
        
        if otp.otp_code != otp_code:
            print(f"OTP mismatch: Input={otp_code}, Stored={otp.otp_code}")
            return False, "Invalid OTP"
        
        # Mark OTP as verified (only if not already verified)
        if not otp.is_verified:
            print("OTP is valid, marking as verified...")
            otp.is_verified = True
            otp.save()
        
        print("OTP verification successful")
        return True, "OTP verified successfully"
        
    except Exception as e:
        print(f"Error in verify_otp: {str(e)}")
        return False, f"Error verifying OTP: {str(e)}"

def get_user_by_email(email):
    """Get user by email address"""
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None
