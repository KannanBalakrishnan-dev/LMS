from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from typing import Any, cast
from .models import (
    User, Team, Category, Course, Video, Quiz,
    Question, Enrollment, QuizAttempt, VideoProgress,
    CertificateEnrollment, OTP, Notification, Request, CertificateTemplate
)


def has_user_type(request, *user_types):
    return getattr(request.user, 'user_type', None) in user_types


# Base class to restrict delete for staff
class BaseRestrictedAdmin(admin.ModelAdmin):
    """Restrict delete for staff users."""
    def has_delete_permission(self, request, obj=None):
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)

@admin.register(User)
class CustomUserAdmin(UserAdmin, BaseRestrictedAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'team', 'is_deleted')
    list_filter = ('user_type', 'team', 'is_deleted')
    fieldsets = cast(Any, tuple(UserAdmin.fieldsets or ())) + (
        ('Additional Info', {'fields': ('user_type', 'team', 'is_deleted')}),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if 'is_deleted__exact' in request.GET:
            return queryset
        return queryset.filter(is_deleted=False)
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete users permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Always perform permanent deletion from Django admin."""
        obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Always perform permanent bulk deletion from Django admin."""
        queryset.delete()

@admin.register(Team)
class TeamAdmin(BaseRestrictedAdmin):
    list_display = ('name', 'get_member_count', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('name',)

    @admin.display(description='Members')
    def get_member_count(self, obj):
        return obj.user_set.count()
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete teams permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Always perform permanent deletion from Django admin."""
        obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Always perform permanent bulk deletion from Django admin."""
        queryset.delete()

@admin.register(Category)
class CategoryAdmin(BaseRestrictedAdmin):
    list_display = ('name', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('name',)
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete categories permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Always perform permanent deletion from Django admin."""
        obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Always perform permanent bulk deletion from Django admin."""
        queryset.delete()

@admin.register(Course)
class CourseAdmin(BaseRestrictedAdmin):
    list_display = ('title', 'get_categories', 'created_by', 'created_on', 'is_active', 'is_deleted')
    list_filter = ('category', 'is_active', 'is_deleted', 'created_on')
    search_fields = ('title', 'description')
    fields = ('title', 'description', 'category', 'created_by', 'is_active', 'is_deleted', 'certificate')

    @admin.display(description='Categories')
    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.category.all()])
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete courses permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Always perform permanent deletion from Django admin."""
        obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Always perform permanent bulk deletion from Django admin."""
        queryset.delete()

@admin.register(Video)
class VideoAdmin(BaseRestrictedAdmin):
    list_display = ('title', 'course', 'order', 'duration', 'created_at', 'is_deleted')
    list_filter = ('course', 'is_deleted', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('course', 'order')
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete videos permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Always perform permanent deletion from Django admin."""
        obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Always perform permanent bulk deletion from Django admin."""
        queryset.delete()

@admin.register(Quiz)
class QuizAdmin(BaseRestrictedAdmin):
    list_display = ('title', 'course', 'video', 'is_final', 'passing_score', 'is_deleted')
    list_filter = ('course', 'is_final', 'is_deleted')
    search_fields = ('title', 'description')
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete quizzes permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Override to handle permanent deletion"""
        if has_user_type(request, 'ADMIN'):
            # For admins, delete permanently
            obj.delete()
        else:
            # For others, use soft delete
            obj.is_deleted = True
            obj.save()
    
    def delete_queryset(self, request, queryset):
        """Override to handle bulk deletion"""
        if has_user_type(request, 'ADMIN'):
            # For admins, delete permanently
            queryset.delete()
        else:
            # For others, use soft delete
            queryset.update(is_deleted=True)

@admin.register(Question)
class QuestionAdmin(BaseRestrictedAdmin):
    list_display = ('quiz', 'question_text', 'created_at')
    list_filter = ('quiz', 'created_at')
    search_fields = ('question_text',)
    
    def has_delete_permission(self, request, obj=None):
        # Allow admins to delete questions permanently
        if has_user_type(request, 'ADMIN'):
            return True
        # Staff cannot delete
        if has_user_type(request, 'STAFF'):
            return False
        return super().has_delete_permission(request, obj)
    
    def delete_model(self, request, obj):
        """Override to handle permanent deletion"""
        if has_user_type(request, 'ADMIN'):
            # For admins, delete permanently
            obj.delete()
        else:
            # For others, use soft delete (if Question had is_deleted field)
            # Since Question doesn't have is_deleted, just delete permanently
            obj.delete()
    
    def delete_queryset(self, request, queryset):
        """Override to handle bulk deletion"""
        if has_user_type(request, 'ADMIN'):
            # For admins, delete permanently
            queryset.delete()
        else:
            # For others, delete permanently since Question doesn't have is_deleted
            queryset.delete()

@admin.register(Enrollment)
class EnrollmentAdmin(BaseRestrictedAdmin):
    list_display = ('user', 'course', 'progress', 'enrolled_on', 'completed_on')
    list_filter = ('progress', 'enrolled_on', 'completed_on')
    search_fields = ('user__username', 'course__title')

@admin.register(QuizAttempt)
class QuizAttemptAdmin(BaseRestrictedAdmin):
    list_display = ('user', 'quiz', 'score', 'is_passed', 'attempted_on')
    list_filter = ('is_passed', 'attempted_on')
    search_fields = ('user__username', 'quiz__title')

@admin.register(VideoProgress)
class VideoProgressAdmin(BaseRestrictedAdmin):
    list_display = ('user', 'video', 'watched', 'quiz_completed', 'watched_duration', 'last_watched')
    list_filter = ('watched', 'quiz_completed', 'last_watched')
    search_fields = ('user__username', 'video__title')

@admin.register(CertificateEnrollment)
class CertificateEnrollmentAdmin(BaseRestrictedAdmin):
    list_display = ('user', 'course', 'completed_on', 'view_certificate_link')
    list_filter = ('course',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'course__title')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(progress='COMPLETED', course__certificate__isnull=False)

    @admin.display(description='Certificate')
    def view_certificate_link(self, obj):
        from django.utils.html import format_html
        return format_html(
            '<a href="/api/courses/{}/generate_certificate/?user_id={}" target="_blank">View Certificate</a>',
            obj.course.id, obj.user.id
        )

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp_code', 'is_verified', 'created_at', 'expires_at', 'is_expired')
    list_filter = ('is_verified', 'created_at', 'expires_at')
    search_fields = ('email', 'otp_code')
    readonly_fields = ('created_at', 'expires_at')
    ordering = ('-created_at',)

    @admin.display(boolean=True, description='Expired')
    def is_expired(self, obj):
        return obj.is_expired()


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ('request_type', 'object_title', 'requested_by', 'status', 'created_at')
    list_filter = ('request_type', 'status', 'created_at')
    search_fields = ('object_title', 'requested_by__username', 'message')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        # Only staff users can create requests
        return has_user_type(request, 'STAFF')
    
    def has_change_permission(self, request, obj=None):
        # Only admins can change requests
        return has_user_type(request, 'ADMIN')
    
    def has_delete_permission(self, request, obj=None):
        # Only admins can delete requests
        return has_user_type(request, 'ADMIN')


@admin.register(CertificateTemplate)
class CertificateTemplateAdmin(admin.ModelAdmin):
    list_display = ('template_file', 'uploaded_at', 'get_font_info')
    list_filter = ('uploaded_at',)
    readonly_fields = ('uploaded_at',)
    fieldsets = (
        ('Template File', {
            'fields': ('template_file',)
        }),
        ('Position Settings', {
            'fields': (
                'name_x', 'name_y',
                'course_x', 'course_y',
                'uuid_x', 'uuid_y',
                'signature_x', 'signature_y',
                'staff_signature_x', 'staff_signature_y',
            ),
            'description': 'Set the X and Y coordinates for text placement on the certificate'
        }),
        ('Font Settings', {
            'fields': (
                'name_font', 'name_font_size',
                'course_font', 'course_font_size', 
                'uuid_font', 'uuid_font_size',
                'signature_font', 'signature_font_size',
                'staff_signature_font', 'staff_signature_font_size',
            ),
            'description': 'Configure fonts and sizes for different text elements on the certificate'
        }),
        ('Signature Settings', {
            'fields': ('signature_text', 'staff_signature_text'),
            'description': 'Static signature texts shown on generated certificates'
        }),
    )
    
    @admin.display(description='Font Configuration')
    def get_font_info(self, obj):
        return (
            f"Name: {obj.name_font}({obj.name_font_size}), "
            f"Course: {obj.course_font}({obj.course_font_size}), "
            f"Signature: {obj.signature_font}({obj.signature_font_size}), "
            f"Staff Signature: {obj.staff_signature_font}({obj.staff_signature_font_size})"
        )
