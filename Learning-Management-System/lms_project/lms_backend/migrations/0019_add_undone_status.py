# Generated manually for undo functionality

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms_backend', '0018_add_is_deleted_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='request',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                    ('UNDONE', 'Undone')
                ],
                default='PENDING',
                max_length=10
            ),
        ),
    ] 