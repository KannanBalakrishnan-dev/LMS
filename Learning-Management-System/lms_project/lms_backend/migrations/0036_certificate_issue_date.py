# Generated manually to persist certificate issue dates.

from django.db import migrations, models


def populate_issue_dates(apps, schema_editor):
    Certificate = apps.get_model('lms_backend', 'Certificate')
    for certificate in Certificate.objects.filter(issue_date__isnull=True).iterator():
        certificate.issue_date = certificate.generated_at
        certificate.save(update_fields=['issue_date'])


class Migration(migrations.Migration):

    dependencies = [
        ('lms_backend', '0035_certificate_status_metadata'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='issue_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(populate_issue_dates, migrations.RunPython.noop),
    ]
