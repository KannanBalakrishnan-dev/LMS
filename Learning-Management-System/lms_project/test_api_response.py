#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from rest_framework.test import APIClient
from lms_backend.models import User

u = User.objects.filter(is_deleted=False).first()
c = APIClient()
c.force_authenticate(user=u)

print('=== Checking API Response Format ===')
r = c.get('/api/courses/')
if r.status_code == 200 and r.data:
    course = r.data[0]
    print(f'cover_image raw value: {course.get("cover_image")}')
    print(f'thumbnail raw value: {course.get("thumbnail")}')
    cover = course.get("cover_image") or ""
    print(f'Expected resolved URL: http://localhost:8000{cover}')
    print(f'\nFrontend resolution test:')
    api_url = "http://localhost:8000/api"
    api_origin = api_url.replace('/api', '')
    resolved = f'{api_origin}{cover.startswith("/") and "" or "/"}{cover}'
    print(f'Resolved URL: {resolved}')
