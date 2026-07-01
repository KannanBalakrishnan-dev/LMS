from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Test email configuration'

    def add_arguments(self, parser):
        parser.add_argument('to_email', type=str, help='Email address to send test email to')

    def handle(self, *args, **options):
        to_email = options['to_email']
        
        self.stdout.write('Testing email configuration...')
        self.stdout.write(f'EMAIL_HOST: {settings.EMAIL_HOST}')
        self.stdout.write(f'EMAIL_PORT: {settings.EMAIL_PORT}')
        self.stdout.write(f'EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}')
        
        try:
            # Send test email
            send_mail(
                subject='Test Email from LMS',
                message='This is a test email to verify email configuration.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'Test email sent successfully to {to_email}')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to send email: {str(e)}')
            )
            
            # Additional debugging info
            self.stdout.write('Common issues:')
            self.stdout.write('1. Gmail App Password might be incorrect')
            self.stdout.write('2. 2FA not enabled on Gmail account')
            self.stdout.write('3. Less secure app access not enabled')
            self.stdout.write('4. Gmail account security settings blocking the connection') 