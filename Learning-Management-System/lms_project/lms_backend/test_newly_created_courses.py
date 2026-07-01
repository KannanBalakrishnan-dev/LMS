#!/usr/bin/env python3
"""
Test script for the newly created courses endpoint
"""

import requests
import json
from datetime import datetime, timezone, timedelta

def test_newly_created_courses():
    # Base URL for the API
    base_url = "http://learning-management-system-4i6f.onrender.com/api"
    
    # Test the endpoint
    endpoint = f"{base_url}/student/newly-created-courses/"
    
    print(f"Testing endpoint: {endpoint}")
    print("=" * 50)
    
    try:
        # Make the request
        response = requests.get(endpoint)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2, default=str)}")
            
            # Check if we have newly created courses
            if data.get('has_newly_created'):
                print(f"\n✅ Found {data.get('count', 0)} newly created courses!")
                for course in data.get('newly_created_courses', []):
                    print(f"  - {course.get('title')} (ID: {course.get('id')})")
            else:
                print("\nℹ️ No newly created courses found")
                
        else:
            print(f"❌ Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the Django server is running on learning-management-system-4i6f.onrender.com")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_newly_created_courses()
