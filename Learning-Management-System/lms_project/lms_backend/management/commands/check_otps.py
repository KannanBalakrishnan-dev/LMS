from django.core.management.base import BaseCommand
from lms_backend.models import OTP
from django.utils import timezone

class Command(BaseCommand):
    help = 'Check existing OTPs in the database'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Filter by email address')

    def handle(self, *args, **options):
        email_filter = options.get('email')
        
        if email_filter:
            otps = OTP.objects.filter(email=email_filter)
        else:
            otps = OTP.objects.all()
        
        if not otps.exists():
            self.stdout.write(self.style.WARNING('No OTPs found in database.'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Found {otps.count()} OTP(s):'))
        self.stdout.write('=' * 60)
        
        for otp in otps:
            status = "EXPIRED" if otp.is_expired() else "ACTIVE"
            verified = "YES" if otp.is_verified else "NO"
            
            self.stdout.write(f'Email: {otp.email}')
            self.stdout.write(f'OTP Code: {otp.otp_code}')
            self.stdout.write(f'Status: {status}')
            self.stdout.write(f'Verified: {verified}')
            self.stdout.write(f'Created: {otp.created_at}')
            self.stdout.write(f'Expires: {otp.expires_at}')
            self.stdout.write('-' * 40) 