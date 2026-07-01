from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid

class OTPModel(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def __str__(self):
        return f"{self.email} - {self.otp_code}"

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')
    is_active = models.BooleanField(default=True, help_text='Active/Inactive status')
    # ManyToManyField for courses (Teams enrolled in courses)
    courses = models.ManyToManyField('Course', related_name='teams', blank=True)

    def __str__(self):
        return self.name
class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
        ('STUDENT', 'Student'),
        ('EMPLOYEE', 'Employee'),
    )

    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    staff_id = models.CharField(max_length=20, blank=True, null=True, unique=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    profile_picture = models.URLField(blank=True, null=True)
    mobile = models.CharField(max_length=15, blank=True, null=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')

    def is_admin(self):
        return self.user_type == 'ADMIN'

    def is_student(self):
        return self.user_type == 'STUDENT'

    def save(self, *args, **kwargs):
        if self.user_type == 'STAFF' and not self.staff_id:
            last_staff = User.objects.filter(user_type='STAFF').order_by('-id').first()
            try:
                next_id = int(last_staff.staff_id.split('-')[-1]) + 1 if last_staff and last_staff.staff_id else 1001
            except (ValueError, AttributeError):
                next_id = 1001
            self.staff_id = f"STAFF-{next_id}"
        super().save(*args, **kwargs)

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['-created_at']  # Show newest categories first

    def __str__(self):
        return self.name

    def clean(self):
        if not self.name:
            raise ValidationError('Name is required')
        if Category.objects.filter(name=self.name).exclude(id=self.id).exists():
            raise ValidationError('A category with this name already exists')

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    category = models.ManyToManyField(Category, related_name="courses")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_on = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')
    certificate = models.FileField(
        upload_to='certificates/',
        null=True,
        blank=True,
        help_text='PDF certificate file for download after course completion.'
    )
    cover_image = models.ImageField(
        upload_to='course_covers/',
        null=True,
        blank=True,
        help_text='Cover image/thumbnail for the course'
    )
    enable_quizzes = models.BooleanField(default=True, help_text='If false, quizzes are hidden for this course.')
    credit_points = models.PositiveIntegerField(default=10, help_text='Credit points earned upon completing this course')
    certificate_uuid = models.UUIDField(editable=False, unique=True, null=True, blank=True, help_text='Unique UUID for this course certificate')

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Generate UUID only if it doesn't exist
        if not self.certificate_uuid:
            self.certificate_uuid = uuid.uuid4()
        super().save(*args, **kwargs)

    @property
    def average_rating(self):
        """Calculate the average rating for this course from feedback"""
        from django.db.models import Avg
        avg_rating = self.feedback.aggregate(avg=Avg('rating'))['avg']
        return round(avg_rating, 1) if avg_rating else 0
    
    @property
    def ratings_count(self):
        """Get the count of ratings for this course"""
        return self.feedback.count()
    
    @property
    def total_duration(self):
        """Calculate total duration of the course in minutes following the exact format:
        - Each video: use its actual video length
        - Each quiz: 15 seconds per quiz
        - Each PDF: 30 seconds per page
        After calculating, sum up the total time for the entire course and convert it into minutes.
        """
        try:
            total_seconds = 0
            
            # 1. Add video durations (use actual video length in seconds)
            for video in self.videos.filter(is_deleted=False):
                if video.duration and video.duration > 0:
                    total_seconds += video.duration
                # If no duration is set, skip this video (don't estimate)
            
            # 2. Add quiz time (15 seconds per quiz)
            quiz_count = self.quizzes.filter(is_deleted=False).count()
            total_seconds += quiz_count * 15
            
            # 3. Add PDF time (30 seconds per page)
            for video in self.videos.filter(is_deleted=False):
                if video.pdf_file:
                    try:
                        # Try to use PyPDF2 if available
                        from PyPDF2 import PdfReader
                        import os
                        from django.conf import settings
                        
                        pdf_path = os.path.join(settings.MEDIA_ROOT, str(video.pdf_file))
                        if os.path.exists(pdf_path):
                            with open(pdf_path, 'rb') as file:
                                pdf_reader = PdfReader(file)
                                page_count = len(pdf_reader.pages)
                                total_seconds += page_count * 30
                    except (ImportError, Exception):
                        # If PDF reading fails, skip this PDF (don't estimate)
                        continue
            
            # Convert total seconds to minutes and round to nearest minute
            total_minutes = max(1, int(total_seconds / 60 + 0.5))
            return total_minutes
        except Exception as e:
            print(f"Error calculating total duration for course {self.title}: {e}")
            return 1  # Return 1 minute as fallback
            # Add to your existing models.py

class CreditPoints(models.Model):
    """Track credit points earned by users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_points')
    points = models.IntegerField(default=0)
    source_type = models.CharField(max_length=50, choices=[
        ('COURSE_COMPLETION', 'Course Completion'),
        ('QUIZ_PERFORMANCE', 'Quiz Performance'),
        ('BONUS', 'Bonus Points'),
        ('ACHIEVEMENT', 'Achievement'),
    ])
    source_id = models.IntegerField(null=True, blank=True)  # ID of the source (course_id, quiz_id, etc.)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

class UserPointsSummary(models.Model):
    """Store total points and level for users"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='points_summary')
    total_points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    points_to_next_level = models.IntegerField(default=100)
    last_updated = models.DateTimeField(auto_now=True)
    
    def calculate_level(self):
        """Calculate level based on total points"""
        if self.total_points < 500:
            self.level = 1
            self.points_to_next_level = 500 - self.total_points
        elif self.total_points < 1200:
            self.level = 2
            self.points_to_next_level = 1200 - self.total_points
        elif self.total_points < 2100:
            self.level = 3
            self.points_to_next_level = 2100 - self.total_points
        elif self.total_points < 3200:
            self.level = 4
            self.points_to_next_level = 3200 - self.total_points
        elif self.total_points < 4500:
            self.level = 5
            self.points_to_next_level = 4500 - self.total_points
        else:
            self.level = 6 + (self.total_points - 4500) // 1500
            self.points_to_next_level = 1500 - ((self.total_points - 4500) % 1500)


import os

class Video(models.Model):
    course = models.ForeignKey(Course, related_name='videos', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    video_file = models.FileField(upload_to='course_videos/', null=True, blank=True)
    pdf_file = models.FileField(upload_to='pdfs/', null=True, blank=True)
    order = models.PositiveIntegerField()
    duration = models.PositiveIntegerField(null=True, blank=True, help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    def save(self, *args, **kwargs):
        if self.video_file and self.pdf_file:
            raise ValidationError("Upload either a video or a PDF, not both.")
        if not self.video_file and not self.pdf_file:
            raise ValidationError("Please upload a video or a PDF.")

        # Calculate duration if video file is present and duration is not set
        if self.video_file and not self.duration:
            self.duration = self.calculate_video_duration()

        super().save(*args, **kwargs)

    def calculate_video_duration(self):
        """Calculate video duration in seconds"""
        try:
            import os
            from django.conf import settings
            
            video_path = os.path.join(settings.MEDIA_ROOT, str(self.video_file))
            if os.path.exists(video_path):
                # For now, use a simple estimation based on file size
                # This is a rough estimate: 1MB ≈ 1 minute for typical video compression
                file_size = os.path.getsize(video_path)
                estimated_seconds = max(60, file_size // (1024 * 1024) * 60)
                return estimated_seconds
        except Exception as e:
            print(f"Error calculating duration for video {self.video_file}: {e}")
            # Return a default duration of 5 minutes (300 seconds) if calculation fails
            return 300
        return 300  # Default fallback


    def clean(self):
        if self.video_file and self.pdf_file:
            raise ValidationError("Upload either a video or a PDF, not both.")
        if not self.video_file and not self.pdf_file:
            raise ValidationError("Please upload a video or a PDF.")



class Quiz(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_final = models.BooleanField(default=False)
    passing_score = models.PositiveIntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag')

    class Meta:
        verbose_name_plural = "Quizzes"
        constraints = [
            models.UniqueConstraint(
                fields=['course', 'is_final'],
                condition=models.Q(is_final=True),
                name='unique_final_quiz_per_course'
            )
        ]

    def __str__(self):
        if self.is_final:
            return f"{self.course.title} - Final Quiz"
        elif self.video:
            return f"{self.course.title} - Video {self.video.order} Quiz"
        else:
            return f"{self.course.title} - Quiz"

    def clean(self):
        if self.is_final and self.video:
            raise ValidationError("Final quizzes cannot be associated with a video")
        if not self.is_final and not self.video:
            raise ValidationError("Non-final quizzes must be associated with a video")
        # Check for existing final quiz
        if self.is_final:
            existing = Quiz.objects.filter(
                course=self.course,
                is_final=True
            ).exclude(id=self.id).exists()
            if existing:
                raise ValidationError("A final quiz already exists for this course")

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    question_text = models.TextField()
    choices = models.JSONField()  # Format: [{\"text\": \"choice text\", \"is_correct\": boolean}]
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quiz.title} - Question {self.id}"

class Enrollment(models.Model):
    PROGRESS_CHOICES = (
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    enrolled_on = models.DateTimeField(auto_now_add=True)
    completed_on = models.DateTimeField(null=True, blank=True)
    progress = models.CharField(
        max_length=20,
        choices=PROGRESS_CHOICES,
        default='NOT_STARTED'
    )

    class Meta:
        unique_together = ['user', 'course']

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"

class QuizAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    score = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    answers = models.JSONField()  # Format: {\"question_id\": selected_choice_index}
    is_passed = models.BooleanField(default=False)
    attempted_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}%"

class VideoProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    watched = models.BooleanField(default=False)
    quiz_completed = models.BooleanField(default=False)
    watched_duration = models.PositiveIntegerField(default=0)  # in seconds
    locked_until_rewatch = models.BooleanField(default=False)  # ✅ ADD THIS
    last_watched = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'video']

    def __str__(self):
        return f"{self.user.username} - {self.video.title}"

class CertificateEnrollment(Enrollment):
    class Meta:
        proxy = True
        verbose_name = 'Generated Certificate'
        verbose_name_plural = 'Generated Certificates'

class Certificate(models.Model):
    """
    Model to store certificate information with unique UUIDs
    """
    STATUS_PENDING_APPROVAL = 'PENDING_APPROVAL'
    STATUS_GENERATED = 'GENERATED'
    LEGACY_STATUS_ISSUED = 'ISSUED'
    STATUS_CHOICES = [
        (STATUS_PENDING_APPROVAL, 'Pending Approval'),
        (STATUS_GENERATED, 'Generated'),
        (LEGACY_STATUS_ISSUED, 'Issued'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='certificates')
    generated_at = models.DateTimeField(auto_now_add=True)
    certificate_number = models.CharField(max_length=32, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING_APPROVAL)
    issue_date = models.DateTimeField(null=True, blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    template_name = models.CharField(max_length=255, blank=True, default='')
    certificate_file = models.FileField(
        upload_to='generated_certificates/',
        null=True,
        blank=True,
        help_text='Generated certificate PDF file'
    )

    class Meta:
        unique_together = ['user', 'course']
        verbose_name = 'Certificate'
        verbose_name_plural = 'Certificates'
        ordering = ['-generated_at']

    def __str__(self):
        return f"Certificate {self.id} - {self.user.username} - {self.course.title}"

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = self._generate_certificate_number()
        if not self.completion_date and self.enrollment_id:
            self.completion_date = self.enrollment.completed_on
        super().save(*args, **kwargs)

    def _generate_certificate_number(self):
        from django.utils import timezone

        year = timezone.now().year
        for _ in range(20):
            candidate = f"CERT-{year}-{uuid.uuid4().hex[:8].upper()}"
            if not Certificate.objects.filter(certificate_number=candidate).exists():
                return candidate
        return f"CERT-{year}-{uuid.uuid4().hex.upper()}"

    @property
    def certificate_uuid(self):
        """Return this certificate's UUID as a string for display and verification."""
        return str(self.id)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')  # NEW FIELD
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:50]}..."

class OTP(models.Model):
    email = models.EmailField(max_length=255)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email}"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at


class Request(models.Model):
    REQUEST_TYPE_CHOICES = [
        ('DELETE_COURSE', 'Delete Course'),
        ('DELETE_VIDEO', 'Delete Video'),
        ('DELETE_QUIZ', 'Delete Quiz'),
        ('DELETE_CATEGORY', 'Delete Category'),
        ('DELETE_TEAM', 'Delete Team'),
        ('DELETE_USER', 'Delete User'),
        ('STUDENT_REGISTRATION', 'Student Registration'),
        ('COURSE_ENROLLMENT', 'Course Enrollment'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('UNDONE', 'Undone'),
    ]

    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    object_id = models.IntegerField(help_text='ID of the object to be deleted')
    object_title = models.CharField(max_length=200, help_text='Title/name of the object to be deleted')
    message = models.TextField(blank=True, null=True, help_text='Optional message from the staff')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delete_requests')
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_requests')

    class Meta:
        verbose_name = 'Delete Request'
        verbose_name_plural = 'Delete Requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.request_type} - {self.object_title} - {self.status}"

class CertificateTemplate(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificate_templates', null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='uploaded_certificate_templates', null=True, blank=True)
    template_file = models.FileField(upload_to='certificate_templates/')
    name_x = models.IntegerField(default=420)
    name_y = models.IntegerField(default=310)
    course_x = models.IntegerField(default=420)
    course_y = models.IntegerField(default=255)
    uuid_x = models.IntegerField(default=420)
    uuid_y = models.IntegerField(default=200)
    signature_text = models.CharField(max_length=255, blank=True, default='')
    signature_x = models.IntegerField(default=420)
    signature_y = models.IntegerField(default=520)
    staff_signature_text = models.CharField(max_length=255, blank=True, default='')
    staff_signature_x = models.IntegerField(default=560)
    staff_signature_y = models.IntegerField(default=520)

    # Font settings for certificate text
    name_font = models.CharField(max_length=50, default='Helvetica-Bold', help_text='Font for student name')
    name_font_size = models.IntegerField(default=28, help_text='Font size for student name')
    course_font = models.CharField(max_length=50, default='Helvetica-Bold', help_text='Font for course name')
    course_font_size = models.IntegerField(default=14, help_text='Font size for course name')
    uuid_font = models.CharField(max_length=50, default='Helvetica', help_text='Font for certificate UUID')
    uuid_font_size = models.IntegerField(default=10, help_text='Font size for certificate UUID')
    signature_font = models.CharField(max_length=50, default='Times-Italic', help_text='Font for signature text')
    signature_font_size = models.IntegerField(default=22, help_text='Font size for signature text')
    staff_signature_font = models.CharField(max_length=50, default='Times-Italic', help_text='Font for staff signature text')
    staff_signature_font_size = models.IntegerField(default=22, help_text='Font size for staff signature text')

    # Store custom text elements added by staff (as JSON)
    custom_texts = models.JSONField(default=list, blank=True, null=True, help_text='Custom text elements added to certificate')

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Certificate Template - {self.uploaded_at.strftime('%Y-%m-%d %H:%M')}"


class Feedback(models.Model):
    """
    Model to store student feedback about courses
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback', null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='feedback', null=True, blank=True)
    message = models.TextField()
    rating = models.PositiveIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text='Rating from 1 to 5 stars',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False, help_text='Whether admin/staff has read this feedback')

    class Meta:
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback from {self.user.username if self.user else 'Anonymous'} - {self.created_at.strftime('%Y-%m-%d')}"

class CourseAssignment(models.Model):
    """
    Model to track when courses are assigned to teams or users
    Used for showing newly assigned courses in marquee for 24 hours
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assigned_courses", null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [
            ('user', 'course'),
            ('team', 'course'),
        ]
        ordering = ['-assigned_at']

    def __str__(self):
        if self.user:
            return f"{self.course.title} assigned to {self.user.username} at {self.assigned_at.strftime('%Y-%m-%d %H:%M')}"
        elif self.team:
            return f"{self.course.title} assigned to {self.team.name} at {self.assigned_at.strftime('%Y-%m-%d %H:%M')}"
        return f"{self.course.title} assigned at {self.assigned_at.strftime('%Y-%m-%d %H:%M')}"

    def is_within_24_hours(self):
        from django.utils import timezone
        from datetime import timedelta
        return self.assigned_at > timezone.now() - timedelta(hours=24)
