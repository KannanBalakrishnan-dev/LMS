from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'List all users in the system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--with-mobile',
            action='store_true',
            help='Show only users with mobile numbers',
        )

    def handle(self, *args, **options):
        if options['with_mobile']:
            users = User.objects.filter(mobile__isnull=False).exclude(mobile='')
            self.stdout.write(self.style.SUCCESS('Users with mobile numbers:'))
        else:
            users = User.objects.all()
            self.stdout.write(self.style.SUCCESS('All users:'))
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found.'))
            return
        
        for user in users:
            mobile_status = f"Mobile: {user.mobile}" if user.mobile else "Mobile: Not set"
            self.stdout.write(
                f'ID: {user.id} | Username: {user.username} | Email: {user.email} | '
                f'Name: {user.first_name} {user.last_name} | Type: {user.user_type} | {mobile_status}'
            ) 