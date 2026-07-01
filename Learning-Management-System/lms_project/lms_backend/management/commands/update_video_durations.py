from django.core.management.base import BaseCommand
from lms_backend.models import Video
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Update video durations for all existing videos'

    def handle(self, *args, **options):
        videos = Video.objects.filter(is_deleted=False, video_file__isnull=False)
        updated_count = 0
        
        for video in videos:
            try:
                video_path = os.path.join(settings.MEDIA_ROOT, str(video.video_file))
                if os.path.exists(video_path):
                    # Use file size estimation: 1MB ≈ 1 minute for typical video compression
                    file_size = os.path.getsize(video_path)
                    estimated_seconds = max(60, file_size // (1024 * 1024) * 60)
                    
                    if video.duration != estimated_seconds:
                        video.duration = estimated_seconds
                        video.save()
                        updated_count += 1
                        self.stdout.write(f"Updated duration for {video.title}: {estimated_seconds} seconds")
            except Exception as e:
                self.stdout.write(f"Error updating duration for {video.title}: {e}")
        
        self.stdout.write(f"Updated {updated_count} videos")
