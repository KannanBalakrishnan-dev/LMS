from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Add mobile number to an existing user for testing forgot password functionality'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username of the user to update')
        parser.add_argument('mobile', type=str, help='Mobile number to add (10 digits)')

    def handle(self, *args, **options):
        username = options['username']
        mobile = options['mobile']
        
        try:
            # Validate mobile number format
            if not mobile.isdigit() or len(mobile) != 10 or not mobile.startswith(('6', '7', '8', '9')):
                self.stdout.write(
                    self.style.ERROR(f'Invalid mobile number: {mobile}. Must be 10 digits starting with 6, 7, 8, or 9')
                )
                return
            
            # Find the user
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with username "{username}" does not exist')
                )
                return
            
            # Check if mobile number is already taken
            if User.objects.filter(mobile=mobile).exclude(username=username).exists():
                self.stdout.write(
                    self.style.ERROR(f'Mobile number {mobile} is already assigned to another user')
                )
                return
            
            # Update the user
            user.mobile = mobile
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated user "{username}" with mobile number: {mobile}'
                )
            )
            
            # Display user info
            self.stdout.write(f'User Details:')
            self.stdout.write(f'  Username: {user.username}')
            self.stdout.write(f'  Email: {user.email}')
            self.stdout.write(f'  First Name: {user.first_name}')
            self.stdout.write(f'  Last Name: {user.last_name}')
            self.stdout.write(f'  User Type: {user.user_type}')
            self.stdout.write(f'  Mobile: {user.mobile}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating user: {str(e)}')
            ) 