from django.core.management.base import BaseCommand
from lms_backend.utils import verify_otp, get_user_by_email

class Command(BaseCommand):
    help = 'Test OTP verification'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address')
        parser.add_argument('otp', type=str, help='OTP code to verify')

    def handle(self, *args, **options):
        email = options['email']
        otp_code = options['otp']
        
        self.stdout.write(f'Testing OTP verification for {email}')
        self.stdout.write(f'OTP Code: {otp_code}')
        
        # Test OTP verification
        is_valid, message = verify_otp(email, otp_code)
        
        if is_valid:
            self.stdout.write(
                self.style.SUCCESS(f'OTP verification successful: {message}')
            )
            
            # Check if user exists
            user = get_user_by_email(email)
            if user:
                self.stdout.write(f'User found: {user.first_name} {user.last_name}')
            else:
                self.stdout.write(self.style.WARNING('User not found'))
        else:
            self.stdout.write(
                self.style.ERROR(f'OTP verification failed: {message}')
            ) 