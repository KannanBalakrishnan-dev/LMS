# Generated manually to align generated certificate records with service expectations.

import uuid
from django.db import migrations, models
from django.utils import timezone


def populate_certificate_metadata(apps, schema_editor):
    Certificate = apps.get_model('lms_backend', 'Certificate')
    for certificate in Certificate.objects.all().iterator():
        update_fields = []
        if not certificate.certificate_number:
            certificate.certificate_number = f"CERT-{timezone.now().year}-{uuid.uuid4().hex[:8].upper()}"
            update_fields.append('certificate_number')
        if not certificate.status:
            certificate.status = 'PENDING_APPROVAL'
            update_fields.append('status')
        if not certificate.completion_date and certificate.enrollment_id:
            enrollment = certificate.enrollment
            if enrollment.completed_on:
                certificate.completion_date = enrollment.completed_on
                update_fields.append('completion_date')
        if update_fields:
            certificate.save(update_fields=update_fields)


class Migration(migrations.Migration):

    dependencies = [
        ('lms_backend', '0034_certificatetemplate_course_uploaded_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='certificate_number',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='certificate',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING_APPROVAL', 'Pending Approval'),
                    ('GENERATED', 'Generated'),
                    ('ISSUED', 'Issued'),
                ],
                default='PENDING_APPROVAL',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='certificate',
            name='completion_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='certificate',
            name='template_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.RunPython(populate_certificate_metadata, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='certificate',
            name='certificate_number',
            field=models.CharField(blank=True, max_length=32, unique=True),
        ),
    ]
