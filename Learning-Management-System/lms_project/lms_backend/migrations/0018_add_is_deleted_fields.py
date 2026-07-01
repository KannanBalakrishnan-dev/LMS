# Generated manually for soft delete functionality

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms_backend', '0017_alter_request_request_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
        migrations.AddField(
            model_name='user',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
        migrations.AddField(
            model_name='category',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
        migrations.AddField(
            model_name='course',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
        migrations.AddField(
            model_name='video',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
        migrations.AddField(
            model_name='quiz',
            name='is_deleted',
            field=models.BooleanField(default=False, help_text='Soft delete flag'),
        ),
    ] 