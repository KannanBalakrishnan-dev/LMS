from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from lms_backend.utils import create_otp_for_email, send_otp_email, verify_otp

User = get_user_model()

class Command(BaseCommand):
    help = 'Test OTP functionality'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to test OTP')
        parser.add_argument('--send', action='store_true', help='Send OTP to email')
        parser.add_argument('--verify', type=str, help='Verify OTP code')

    def handle(self, *args, **options):
        email = options['email']
        
        # Check if user exists
        try:
            user = User.objects.get(email=email)
            self.stdout.write(
                self.style.SUCCESS(f'User found: {user.first_name} {user.last_name}')
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'No user found with email: {email}')
            )
            return

        if options['send']:
            # Send OTP
            try:
                otp = create_otp_for_email(email)
                email_sent = send_otp_email(email, otp.otp_code, user.first_name or user.username)
                
                if email_sent:
                    self.stdout.write(
                        self.style.SUCCESS(f'OTP sent successfully to {email}')
                    )
                    self.stdout.write(f'OTP Code: {otp.otp_code}')
                else:
                    self.stdout.write(
                        self.style.ERROR('Failed to send email')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error sending OTP: {str(e)}')
                )

        if options['verify']:
            # Verify OTP
            otp_code = options['verify']
            is_valid, message = verify_otp(email, otp_code)
            
            if is_valid:
                self.stdout.write(
                    self.style.SUCCESS(f'OTP verified successfully: {message}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'OTP verification failed: {message}')
                ) 