from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
import os
from .models import (
    Team, Category, Course, Video, Quiz, Question,
    Enrollment, QuizAttempt, VideoProgress, Certificate, Notification, Feedback, CourseAssignment
)
from .utils import (
    calculate_course_progress, get_user_analytics,
    get_team_analytics
)

User = get_user_model()

# ============================
# Team Serializers
# ============================
class TeamSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'members_count', 'created_at', 'is_active')
        read_only_fields = ('created_at',)
    
    def get_members_count(self, obj):
        return obj.user_set.count()

class TeamDetailSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()
    course_ids = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), many=True, write_only=True, source='courses', required=False)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ('id', 'name', 'description', 'members', 'members_count', 'courses', 'course_ids', 'created_at', 'is_active')
        read_only_fields = ('created_at',)

    def get_members(self, obj):
        users = obj.user_set.all()
        return UserSerializer(users, many=True).data

    def get_courses(self, obj):
        return CourseSerializer(obj.courses.all(), many=True).data

    def get_members_count(self, obj):
        return obj.user_set.count()

# ============================
# Category Serializer
# ============================
class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'created_at', 'course_count')
        read_only_fields = ('created_at',)
        extra_kwargs = {
            'name': {'validators': []},
        }

    def get_course_count(self, obj):
        return obj.courses.count()

    def validate_name(self, value):
        queryset = Category.objects.filter(name=value, is_deleted=False)
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if queryset.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return value

    def create(self, validated_data):
        name = validated_data.get('name')
        existing_deleted = Category.objects.filter(name=name, is_deleted=True).first()
        if existing_deleted:
            existing_deleted.is_deleted = False
            existing_deleted.description = validated_data.get('description', existing_deleted.description)
            existing_deleted.save()
            return existing_deleted
        return super().create(validated_data)

# ============================
# User Serializer
# ============================
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False)
    team = TeamSerializer(read_only=True)
    team_id = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all(), allow_null=True, required=False, source='team', write_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'password', 'password2', 'email',
            'first_name', 'last_name', 'user_type', 'team', 'team_id',
            'profile_picture', 'mobile'
        )
        extra_kwargs = {
            'user_type': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')
        if password or password2:
            if password != password2:
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        team = validated_data.pop('team', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if team:
            user.team = team
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        if 'team' in validated_data or 'team' in self.initial_data:
            instance.team = validated_data.get('team', None)
        for attr, value in validated_data.items():
            if attr != 'team':
                setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

# ============================
# Question/Quiz Serializers
# ============================
class QuestionSerializer(serializers.ModelSerializer):
    choices = serializers.JSONField(required=True)

    class Meta:
        model = Question
        fields = ('id', 'question_text', 'choices')

    def validate_choices(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Choices must be a list.")
        for choice in value:
            if not isinstance(choice, dict) or 'text' not in choice or 'is_correct' not in choice:
                raise serializers.ValidationError("Each choice must have 'text' and 'is_correct' fields.")
        return value



class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = (
            'id', 'title', 'description', 'is_final', 'passing_score',
            'questions', 'created_at', 'course', 'video'
        )
        read_only_fields = ('created_at',)

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        for question_data in questions_data:
            Question.objects.create(quiz=quiz, **question_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.questions.all().delete()
        for question_data in questions_data:
            Question.objects.create(quiz=instance, **question_data)
        return instance

    def validate(self, data):
        if data.get('is_final') and data.get('video'):
            raise serializers.ValidationError(
                "Final quizzes cannot be associated with a video"
            )
        if not data.get('is_final') and not data.get('video'):
            raise serializers.ValidationError(
                "Non-final quizzes must be associated with a video"
            )
        # Validate unique final quiz per course
        if data.get('is_final'):
            existing = Quiz.objects.filter(
                course=data['course'],
                is_final=True
            )
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            if existing.exists():
                raise serializers.ValidationError(
                    "A final quiz already exists for this course"
                )
        return data

# ============================
# Video Serializer
# ============================
class VideoSerializer(serializers.ModelSerializer):
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    has_quiz = serializers.SerializerMethodField()
    quiz_id = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = (
            'id', 'title', 'description', 'video_file', 'pdf_file', 'order',
            'duration', 'has_quiz', 'quiz_id', 'created_at', 'course'
        )
        read_only_fields = ('created_at',)

    def get_has_quiz(self, obj):
        return Quiz.objects.filter(video=obj).exists()
    
    def get_quiz_id(self, obj):
        quiz = Quiz.objects.filter(video=obj).first()
        return quiz.id if quiz else None

    def _media_exists(self, file_field):
        name = str(getattr(file_field, 'name', '') or '').strip()
        if not name:
            return False

        normalized = name.replace('\\', '/').lstrip('/')
        media_root = getattr(settings, 'MEDIA_ROOT', '')
        if not media_root:
            return bool(name)

        absolute_path = os.path.join(media_root, normalized.replace('/', os.sep))
        return os.path.exists(absolute_path)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.video_file and instance.video_file.name and not self._media_exists(instance.video_file):
            data['video_file'] = None
        if instance.pdf_file and instance.pdf_file.name and not self._media_exists(instance.pdf_file):
            data['pdf_file'] = None

        return data

    @staticmethod
    def has_accessible_media(instance):
        serializer = VideoSerializer()
        return (
            bool(instance.video_file and instance.video_file.name and serializer._media_exists(instance.video_file))
            or bool(instance.pdf_file and instance.pdf_file.name and serializer._media_exists(instance.pdf_file))
        )
    
    def validate(self, data):
        video = data.get('video_file')
        pdf = data.get('pdf_file')

        if video and pdf:
            raise serializers.ValidationError("You can upload either a video or a PDF (lecture slides), not both.")
        if not video and not pdf:
            raise serializers.ValidationError("Please upload either a video or a PDF (lecture slides).")

        return data


# ============================
# Course Serializer
# ============================
class CourseSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    videos = VideoSerializer(many=True, read_only=True)
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True)
    created_by = UserSerializer(read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    final_quiz = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()
    certificate = serializers.FileField(required=False, allow_null=True)
    cover_image = serializers.ImageField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, allow_null=True, default=True)
    enable_quizzes = serializers.BooleanField(required=False, allow_null=True, default=True)
    certificate_uuid = serializers.CharField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    ratings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'description', 'category', 'created_by',
            'videos', 'enrolled_count', 'created_on', 'is_active', 'average_rating', 'ratings_count',
            'final_quiz', 'total_quizzes', 'certificate', 'cover_image', 'enable_quizzes', 'certificate_uuid'
        )
        read_only_fields = ('created_on', 'created_by', 'certificate_uuid')

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    def get_enrolled_count(self, obj):
        return obj.enrollment_set.count()

    def get_total_quizzes(self, obj):
        video_quizzes = Quiz.objects.filter(video__course=obj).count()
        final_quiz = Quiz.objects.filter(course=obj, is_final=True).exists()
        return video_quizzes + (1 if final_quiz else 0)

    def get_final_quiz(self, obj):
        final_quiz = obj.quizzes.filter(is_final=True).first()
        if final_quiz:
            return {
                'id': final_quiz.id,
                'title': final_quiz.title,
                'description': final_quiz.description
            }
        return None

class CourseListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True, many=True)
    enable_quizzes = serializers.BooleanField(required=False)
    average_rating = serializers.FloatField(read_only=True)
    ratings_count = serializers.IntegerField(read_only=True)
    total_duration = serializers.IntegerField(read_only=True)

    # ✅ Extra fields for catalog buttons
    is_assigned = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'description', 'category', 'created_on',
            'is_active', 'enable_quizzes', 'average_rating',
            'ratings_count', 'total_duration', 'cover_image',
            'is_assigned', 'is_enrolled', 'is_completed'  # ✅ added
        )

    def get_is_assigned(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated or user.user_type != "STUDENT":
            return False
        from django.db.models import Q
        return CourseAssignment.objects.filter(course=obj).filter(
            Q(user=user) | Q(team=user.team)
        ).exists()

    def get_is_enrolled(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated or user.user_type != "STUDENT":
            return False
        return Enrollment.objects.filter(user=user, course=obj).exists()

    def get_is_completed(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated or user.user_type != "STUDENT":
            return False
        return Enrollment.objects.filter(
            user=user, course=obj, progress="COMPLETED"
        ).exists()

# ============================
# Enrollment and Progress Serializers
# ============================
class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    progress_percent = serializers.SerializerMethodField()
    certificate = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = (
            'id', 'user', 'course', 'enrolled_on', 'completed_on',
            'progress', 'progress_percent', 'certificate'
        )
        read_only_fields = ('enrolled_on', 'completed_on')

    def get_progress_percent(self, obj):
        return round(calculate_course_progress(obj.user, obj.course))

    def get_certificate(self, obj):
        if obj.progress != 'COMPLETED':
            return {
                'has_certificate_record': False,
                'status': None,
                'can_download': False,
                'certificate_number': None,
                'certificate_uuid': None,
                'template_name': None,
            }

        try:
            from .certificate_service import build_certificate_status_payload, ensure_generated_certificate_for_enrollment

            ensure_generated_certificate_for_enrollment(obj)
            return build_certificate_status_payload(obj.user, obj.course, obj)
        except Exception:
            certificate = Certificate.objects.filter(user=obj.user, course=obj.course).first()
            return {
                'has_certificate_record': bool(certificate),
                'status': getattr(certificate, 'status', None),
                'can_download': bool(certificate and certificate.certificate_file),
                'certificate_number': getattr(certificate, 'certificate_number', None),
                'certificate_uuid': getattr(certificate, 'certificate_uuid', None),
                'template_name': getattr(certificate, 'template_name', None),
            }

class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ('id', 'user', 'quiz', 'score', 'answers', 'is_passed', 'attempted_on')
        read_only_fields = ('is_passed', 'attempted_on')

class VideoProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoProgress
        fields = ('id', 'user', 'video', 'watched', 'quiz_completed', 'watched_duration', 'last_watched', 'created_at')
        read_only_fields = ('last_watched', 'created_at')

class CertificateSerializer(serializers.ModelSerializer):
    certificate_uuid = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    
    class Meta:
        model = Certificate
        fields = (
            'id', 'certificate_uuid', 'certificate_number', 'user', 'course',
            'status', 'completion_date', 'template_name', 'generated_at',
            'certificate_file'
        )
        read_only_fields = fields

# ============================
# Dashboard Serializers
# ============================
class StudentDashboardSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    stats = serializers.SerializerMethodField()
    inProgressCourses = serializers.SerializerMethodField()
    recentActivity = serializers.SerializerMethodField()
    teamData = serializers.SerializerMethodField()

    def get_stats(self, obj):
        analytics = get_user_analytics(obj)
        return {
            'inProgressCount': analytics['courses_in_progress'],
            'completedCount': analytics['courses_completed'],
            'averageScore': analytics['average_quiz_score'],
            'totalEnrollments': analytics['total_courses_enrolled']
        }

    def get_inProgressCourses(self, obj):
        enrollments = Enrollment.objects.filter(
            user=obj,
            progress__in=['IN_PROGRESS', 'NOT_STARTED'],
            course__is_deleted=False
        ).select_related('course').prefetch_related('course__category')
        courses = []
        for enrollment in enrollments:
            progress = calculate_course_progress(obj, enrollment.course)
            course_data = CourseListSerializer(enrollment.course).data
            course_data['progress'] = progress
            course_data['progress_percent'] = progress
            courses.append(course_data)
        return courses

    def get_recentActivity(self, obj):
        recent_activities = []
        quiz_attempts = QuizAttempt.objects.filter(
            user=obj,
            quiz__course__is_deleted=False
        ).order_by('-attempted_on')[:5]
        for attempt in quiz_attempts:
            recent_activities.append({
                'id': f'quiz_{attempt.id}',
                'type': 'COMPLETED' if attempt.is_passed else 'ATTEMPTED',
                'description': f"Quiz attempt for {attempt.quiz.title}",
                'timestamp': attempt.attempted_on,
                'quiz_id': attempt.quiz.id,           # Added for frontend navigation
                'course_id': attempt.quiz.course.id,  # Added for frontend navigation
            })
        video_progress = VideoProgress.objects.filter(
            user=obj,
            video__course__is_deleted=False
        ).order_by('-last_watched')[:5]
        for progress in video_progress:
            recent_activities.append({
                'id': f'video_{progress.id}',
                'type': 'COMPLETED' if progress.watched else 'IN_PROGRESS',
                'description': f"Watched {progress.video.title}",
                'timestamp': progress.last_watched,
                'video_id': progress.video.id,        # Added for frontend navigation
                'course_id': progress.video.course.id # Added for frontend navigation
            })
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return recent_activities[:10]

    def get_teamData(self, obj):
        if not obj.team:
            return None
        team_analytics = get_team_analytics(obj.team)
        total_teams = Team.objects.count()
        # Calculate team ranking based on completion percentage
        all_teams = Team.objects.all()
        team_scores = []
        for team in all_teams:
            team_stats = get_team_analytics(team)
            completion_rate = (team_stats['total_completions'] / team_stats['total_enrollments']) if team_stats['total_enrollments'] > 0 else 0
            team_scores.append((team.id, completion_rate))
        team_scores.sort(key=lambda x: x[1], reverse=True)
        team_ranking = next(i for i, (team_id, _) in enumerate(team_scores, 1) if team_id == obj.team.id)
        return {
            'name': obj.team.name,
            'ranking': team_ranking,
            'totalTeams': total_teams,
            'completedCourses': team_analytics['total_completions'],
            'totalCourses': team_analytics['total_enrollments']
        }

class AdminDashboardSerializer(serializers.Serializer):
    total_users = serializers.SerializerMethodField()
    total_teams = serializers.SerializerMethodField()
    total_courses = serializers.SerializerMethodField()
    users_analytics = serializers.SerializerMethodField()

    def get_total_users(self, obj=None):
        return User.objects.count()

    def get_total_teams(self, obj=None):
        return Team.objects.count()

    def get_total_courses(self, obj=None):
        return Course.objects.count()

    def get_users_analytics(self, obj=None):
        return [
            {
                "id": user.id,
                "name": user.get_full_name(),
                "email": user.email,
                "team": user.team.name if user.team else None,
                "analytics": get_user_analytics(user)
            }
            for user in User.objects.all()
        ]

# ============================
# Notification Serializer
# ============================
class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    notification_type = serializers.SerializerMethodField()
    navigation_data = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'user', 'sender_username', 'sender_profile_picture', 'message', 'is_read', 'created_at', 'notification_type', 'navigation_data')
        read_only_fields = ('created_at',)

    def get_sender_username(self, obj):
        return obj.sender.username if obj.sender else None

    def get_sender_profile_picture(self, obj):
        return obj.sender.profile_picture if obj.sender else None

    def get_notification_type(self, obj):
        """Determine notification type based on message content"""
        message = obj.message.lower()
        
        if 'student registration request' in message:
            return 'STUDENT_REGISTRATION_REQUEST'
        if 'course enrollment request' in message:
            return 'COURSE_ENROLLMENT_REQUEST'
        if 'delete request' in message:
            if 'delete_course' in message:
                return 'DELETE_COURSE_REQUEST'
            elif 'delete_video' in message:
                return 'DELETE_VIDEO_REQUEST'
            elif 'delete_quiz' in message:
                return 'DELETE_QUIZ_REQUEST'
            elif 'delete_category' in message:
                return 'DELETE_CATEGORY_REQUEST'
            elif 'delete_team' in message:
                return 'DELETE_TEAM_REQUEST'
            elif 'delete_user' in message:
                return 'DELETE_USER_REQUEST'
            else:
                return 'DELETE_REQUEST'
        elif 'request has been approved' in message or 'request has been rejected' in message:
            return 'REQUEST_RESPONSE'
        elif 'request has been undone' in message:
            return 'REQUEST_UNDONE'
        elif 'enrolled in' in message:
            return 'COURSE_ENROLLMENT'
        elif 'completed' in message and 'course' in message:
            return 'COURSE_COMPLETION'
        elif 'assigned a new course' in message:
            return 'COURSE_ASSIGNMENT'
        else:
            return 'GENERAL'

    def get_navigation_data(self, obj):
        """Return navigation data based on notification type and user type"""
        notification_type = self.get_notification_type(obj)
        user_type = obj.user.user_type if obj.user else 'STUDENT'
        
        # Admin/Staff navigation paths
        if user_type in ['ADMIN', 'STAFF']:
            if notification_type in ['DELETE_COURSE_REQUEST', 'DELETE_VIDEO_REQUEST', 'DELETE_QUIZ_REQUEST', 'DELETE_CATEGORY_REQUEST', 'DELETE_TEAM_REQUEST', 'DELETE_USER_REQUEST', 'REQUEST_RESPONSE', 'REQUEST_UNDONE', 'STUDENT_REGISTRATION_REQUEST', 'COURSE_ENROLLMENT_REQUEST']:
                return {
                    'path': '/admin/requests',
                    'title': 'Approval Dashboard'
                }
            elif notification_type == 'COURSE_ENROLLMENT':
                return {
                    'path': '/admin/courses',
                    'title': 'Courses'
                }
            elif notification_type == 'COURSE_COMPLETION':
                return {
                    'path': '/admin/analytics',
                    'title': 'Analytics'
                }
            elif notification_type == 'COURSE_ASSIGNMENT':
                return {
                    'path': '/admin/teams',
                    'title': 'Teams'
                }
            else:
                return {
                    'path': '/admin',
                    'title': 'Dashboard'
                }
        # Student navigation paths
        else:
            if notification_type == 'COURSE_ENROLLMENT':
                return {
                    'path': '/my-courses',
                    'title': 'My Courses'
                }
            elif notification_type == 'COURSE_COMPLETION':
                return {
                    'path': '/my-courses',
                    'title': 'My Courses'
                }
            elif notification_type == 'COURSE_ASSIGNMENT':
                return {
                    'path': '/catalog',
                    'title': 'Course Catalog'
                }
            else:
                return {
                'path': '/',
                'title': 'Dashboard'
            }


# ============================
# Feedback Serializer
# ============================
class FeedbackSerializer(serializers.ModelSerializer):
    user_username = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = (
            'id', 'user', 'user_username', 'user_profile_picture', 
            'course', 'course_title', 'message', 'rating', 
            'created_at', 'is_read'
        )
        read_only_fields = ('created_at',)
    
    def get_user_username(self, obj):
        return obj.user.username if obj.user else None
    
    def get_user_profile_picture(self, obj):
        return obj.user.profile_picture if obj.user else None
    
    def get_course_title(self, obj):
        return obj.course.title if obj.course else None
