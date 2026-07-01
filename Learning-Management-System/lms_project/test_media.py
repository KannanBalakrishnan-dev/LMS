#!/usr/bin/env python
import requests
import sys

try:
    r = requests.get('http://localhost:8000/media/course_covers/img1.avif')
    print(f'Status: {r.status_code}')
    print(f'Content-Type: {r.headers.get("content-type")}')
    if r.status_code == 200:
        print(f'Content Length: {len(r.content)}')
        print('SUCCESS: Media file served correctly')
    else:
        print(f'ERROR Response: {r.text[:300]}')
except Exception as e:
    print(f'Connection Error: {e}')
    sys.exit(1)
