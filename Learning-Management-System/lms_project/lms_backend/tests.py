from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from zipfile import ZipFile
from PyPDF2 import PdfReader
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from datetime import datetime, timedelta
import io

from .certificate_service import (
    build_certificate_payload,
    MASTER_CERTIFICATE_TEMPLATE_NAME,
    ensure_generated_certificate_for_enrollment,
    issue_certificate,
    render_certificate_docx,
    render_certificate_file,
)
from .models import CertificateTemplate, Course, Enrollment, Certificate, Category, CreditPoints
import uuid

User = get_user_model()


def build_minimal_docx_template_bytes():
    buffer = io.BytesIO()
    with ZipFile(buffer, 'w') as archive:
        archive.writestr(
            '[Content_Types].xml',
            (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '</Types>'
            ),
        )
        archive.writestr(
            '_rels/.rels',
            (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                'Target="word/document.xml"/>'
                '</Relationships>'
            ),
        )
        archive.writestr(
            'word/document.xml',
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body>'
                '<w:p><w:r><w:t>{{STUDENT NAME}}</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>{{COURSE NAME}}</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>{{COMPLETION DATE}}</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>{{CERTIFICATE ID}}</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>{{STAFF SIGN}}</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>{{HEAD OF INSTITUTION}}</w:t></w:r></w:p>'
                '</w:body>'
                '</w:document>'
            ),
        )
    buffer.seek(0)
    return buffer.getvalue()


def build_sample_filled_docx_template_bytes():
    buffer = io.BytesIO()
    with ZipFile(buffer, 'w') as archive:
        archive.writestr(
            '[Content_Types].xml',
            (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '</Types>'
            ),
        )
        archive.writestr(
            '_rels/.rels',
            (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                'Target="word/document.xml"/>'
                '</Relationships>'
            ),
        )
        archive.writestr(
            'word/document.xml',
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body>'
                '<w:p><w:r><w:t>This is to certify that</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>Alicia Johnson</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>has successfully completed the course</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>Dementia Awareness and Care Excellence</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>on</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>April 08, 2026</w:t></w:r></w:p>'
                '<w:p><w:r><w:t>CERT-2026-0100</w:t></w:r></w:p>'
                '</w:body>'
                '</w:document>'
            ),
        )
    buffer.seek(0)
    return buffer.getvalue()


def build_minimal_pdf_template_bytes(lines=None):
    buffer = io.BytesIO()
    pdf_canvas = canvas.Canvas(buffer, pagesize=landscape(A4))

    y = 520
    for line in lines or []:
        pdf_canvas.drawString(72, y, line)
        y -= 24

    pdf_canvas.save()
    buffer.seek(0)
    return buffer.getvalue()

class CertificateModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='STUDENT'
        )
        self.category = Category.objects.create(name='Test Category')
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course description',
            created_by=self.user
        )
        self.course.category.add(self.category)
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course,
            progress='COMPLETED'
        )

    def test_certificate_creation(self):
        """Test that a certificate record gets a unique certificate number."""
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment
        )
       
        self.assertIsInstance(certificate.id, uuid.UUID)
        self.assertEqual(certificate.user, self.user)
        self.assertEqual(certificate.course, self.course)
        self.assertEqual(certificate.enrollment, self.enrollment)
        self.assertIsNotNone(certificate.generated_at)
        self.assertTrue(certificate.certificate_number.startswith('CERT-'))
        self.assertEqual(certificate.status, Certificate.STATUS_PENDING_APPROVAL)

    def test_certificate_uuid_property(self):
        """Test the certificate_uuid property returns the certificate UUID."""
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment
        )
       
        self.assertIsInstance(certificate.certificate_uuid, str)
        self.assertEqual(certificate.certificate_uuid, str(certificate.id))

    def test_same_course_certificates_have_distinct_uuids(self):
        """Test that certificates for the same course still have unique identities."""
        certificate1 = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment
        )
       
        # Create another user and certificate for the same course
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            first_name='Test2',
            last_name='User2',
            user_type='STUDENT'
        )
        enrollment2 = Enrollment.objects.create(
            user=user2,
            course=self.course,
            progress='COMPLETED'
        )
        certificate2 = Certificate.objects.create(
            user=user2,
            course=self.course,
            enrollment=enrollment2
        )
       
        self.assertNotEqual(certificate1.certificate_uuid, certificate2.certificate_uuid)
        self.assertNotEqual(certificate1.certificate_number, certificate2.certificate_number)

    def test_unique_user_course_constraint(self):
        """Test that only one certificate can exist per user-course combination"""
        Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment
        )
       
        # Try to create another certificate for the same user-course
        with self.assertRaises(Exception):
            Certificate.objects.create(
                user=self.user,
                course=self.course,
                enrollment=self.enrollment
            )

    def test_render_certificate_docx_replaces_word_placeholders(self):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        docx_bytes, payload = render_certificate_docx(certificate, template=template)

        with ZipFile(io.BytesIO(docx_bytes), 'r') as archive:
            document_xml = archive.read('word/document.xml').decode('utf-8')

        self.assertIn('Test User', document_xml)
        self.assertIn('Test Course', document_xml)
        self.assertIn(payload['completion_date_display'], document_xml)
        self.assertNotIn('{{STUDENT NAME}}', document_xml)
        self.assertNotIn('{{COURSE NAME}}', document_xml)
        self.assertNotIn('{{COMPLETION DATE}}', document_xml)

    def test_build_certificate_payload_uses_course_template_staff_signature_when_template_not_passed(self):
        CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'course-template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
            course=self.course,
            staff_signature_text='Course Staff Sign',
            signature_text='Course Head Sign',
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        payload = build_certificate_payload(certificate)

        self.assertEqual(payload['staff_sign'], 'Course Staff Sign')
        self.assertEqual(payload['head_of_institution'], 'Course Head Sign')

    def test_render_certificate_docx_replaces_sample_filled_word_design_values(self):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'sample-design.docx',
                build_sample_filled_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        docx_bytes, payload = render_certificate_docx(certificate, template=template)

        with ZipFile(io.BytesIO(docx_bytes), 'r') as archive:
            document_xml = archive.read('word/document.xml').decode('utf-8')

        self.assertIn('Test User', document_xml)
        self.assertIn('Test Course', document_xml)
        self.assertIn(payload['completion_date_display'], document_xml)
        self.assertIn(payload['certificate_number'], document_xml)
        self.assertNotIn('Alicia Johnson', document_xml)
        self.assertNotIn('Dementia Awareness and Care Excellence', document_xml)
        self.assertNotIn('April 08, 2026', document_xml)
        self.assertNotIn('CERT-2026-0100', document_xml)

    @patch(
        'lms_backend.certificate_service._convert_docx_bytes_to_pdf_bytes',
        side_effect=lambda *args, **kwargs: build_minimal_pdf_template_bytes(['Converted certificate output']),
    )
    def test_issue_certificate_from_docx_template_uses_uploaded_pdf_conversion(self, mocked_convert):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        file_bytes, issued_certificate, payload = issue_certificate(certificate, template=template)
        extracted_text = PdfReader(io.BytesIO(file_bytes)).pages[0].extract_text() or ''

        converted_docx_bytes = mocked_convert.call_args.args[0]
        with ZipFile(io.BytesIO(converted_docx_bytes), 'r') as archive:
            document_xml = archive.read('word/document.xml').decode('utf-8')

        self.assertTrue(issued_certificate.certificate_file.name.endswith('.pdf'))
        self.assertEqual(issued_certificate.status, Certificate.STATUS_GENERATED)
        self.assertTrue(issued_certificate.template_name.endswith('.docx'))
        self.assertEqual(payload['content_type'], 'application/pdf')
        self.assertTrue(payload['template_name'].endswith('.docx'))
        self.assertIn('Converted certificate output', extracted_text)
        self.assertIn('Test User', document_xml)
        self.assertIn('Test Course', document_xml)
        mocked_convert.assert_called_once()

    @patch('lms_backend.certificate_service._convert_docx_bytes_to_pdf_bytes', side_effect=RuntimeError('pdf unavailable'))
    def test_render_certificate_file_from_docx_template_falls_back_to_docx(self, mocked_convert):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        file_bytes, payload, output_extension, content_type = render_certificate_file(
            certificate,
            template=template,
        )

        self.assertTrue(len(file_bytes) > 0)
        self.assertEqual(output_extension, '.docx')
        self.assertEqual(content_type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        self.assertEqual(payload['content_type'], content_type)
        mocked_convert.assert_called_once()

    @patch(
        'lms_backend.certificate_service._convert_docx_bytes_to_pdf_bytes',
        side_effect=lambda *args, **kwargs: build_minimal_pdf_template_bytes(['Auto generated certificate']),
    )
    def test_ensure_generated_certificate_for_enrollment_uses_common_template_with_student_data(self, mocked_convert):
        CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'common-template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            )
        )

        certificate = ensure_generated_certificate_for_enrollment(self.enrollment)

        self.assertIsNotNone(certificate)
        self.assertEqual(Certificate.objects.filter(user=self.user, course=self.course).count(), 1)

        certificate.refresh_from_db()
        self.assertEqual(certificate.status, Certificate.STATUS_GENERATED)
        self.assertEqual(certificate.enrollment, self.enrollment)
        self.assertTrue(certificate.template_name.endswith('.docx'))
        self.assertTrue(certificate.certificate_file.name.endswith('.pdf'))

        converted_docx_bytes = mocked_convert.call_args.args[0]
        with ZipFile(io.BytesIO(converted_docx_bytes), 'r') as archive:
            document_xml = archive.read('word/document.xml').decode('utf-8')

        self.assertIn('Test User', document_xml)
        self.assertIn('Test Course', document_xml)
        self.assertIn(certificate.certificate_number, document_xml)

    def test_render_certificate_pdf_uses_uploaded_pdf_background_for_clean_pdf_template(self):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.pdf',
                build_minimal_pdf_template_bytes(['VDart Academy']),
                content_type='application/pdf',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        file_bytes, payload, output_extension, content_type = render_certificate_file(
            certificate,
            template=template,
            preview=True,
            require_pdf=True,
        )

        extracted_text = PdfReader(io.BytesIO(file_bytes)).pages[0].extract_text() or ''

        self.assertEqual(output_extension, '.pdf')
        self.assertEqual(content_type, 'application/pdf')
        self.assertTrue(payload['template_name'].endswith('.pdf'))
        self.assertIn('VDart Academy', extracted_text)
        self.assertIn('Test User', extracted_text)
        self.assertNotIn('CONGRATS', extracted_text)

    def test_render_certificate_pdf_ignores_placeholder_pdf_template_and_uses_master_layout(self):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.pdf',
                build_minimal_pdf_template_bytes(
                    ['This is to certify that', '{{STUDENT NAME}}', '{{COURSE NAME}}', '{{COMPLETION DATE}}']
                ),
                content_type='application/pdf',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            completion_date=self.enrollment.completed_on,
            issue_date=timezone.now(),
        )

        file_bytes, _, _, _ = render_certificate_file(
            certificate,
            template=template,
            preview=True,
            require_pdf=True,
        )

        extracted_text = PdfReader(io.BytesIO(file_bytes)).pages[0].extract_text() or ''

        self.assertIn('CONGRATS', extracted_text)
        self.assertIn('Test User', extracted_text)
        self.assertNotIn('[Recipient Name]', extracted_text)

class CertificateAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='STUDENT'
        )
        self.category = Category.objects.create(name='Test Category')
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course description',
            created_by=self.user
        )
        self.course.category.add(self.category)
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course,
            progress='COMPLETED'
        )
        self.enrollment.completed_on = timezone.now()
        self.enrollment.save(update_fields=['completed_on'])
        self.enrollment.completed_on = timezone.now()
        self.enrollment.save(update_fields=['completed_on'])
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            user_type='ADMIN',
            is_staff=True,
        )

    def test_verify_certificate_endpoint(self):
        """Test the certificate verification endpoint"""
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            status=Certificate.STATUS_GENERATED,
            issue_date=timezone.now(),
        )
       
        url = reverse('verify-certificate', kwargs={'certificate_identifier': certificate.certificate_number})
        response = self.client.get(url)
       
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['certificate']['uuid'], certificate.certificate_uuid)
        self.assertEqual(response.data['certificate']['certificate_number'], certificate.certificate_number)
        self.assertEqual(response.data['certificate']['user_name'], 'Test User')
        self.assertEqual(response.data['certificate']['course_title'], 'Test Course')

    def test_verify_nonexistent_certificate(self):
        """Test verification of a non-existent certificate"""
        fake_identifier = 'CERT-2099-9999'
        url = reverse('verify-certificate', kwargs={'certificate_identifier': fake_identifier})
        response = self.client.get(url)
       
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['valid'])
        self.assertIn('error', response.data)

    def test_deleted_actions_lists_directly_soft_deleted_user(self):
        self.user.is_deleted = True
        self.user.save(update_fields=['is_deleted'])

        self.client.force_authenticate(self.admin_user)
        response = self.client.get(reverse('deleted-actions'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        deleted_users = [row for row in response.data if row['type'] == 'USER']
        self.assertEqual(len(deleted_users), 1)
        self.assertEqual(deleted_users[0]['object_id'], self.user.id)
        self.assertEqual(deleted_users[0]['username'], self.user.username)

    def test_generate_certificate_rebuilds_missing_pdf_file(self):
        """Generated certificates should be rebuilt when the DB record exists but the PDF file is missing."""
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            status=Certificate.STATUS_GENERATED,
            issue_date=timezone.now(),
            completion_date=timezone.now(),
            certificate_file='generated_certificates/missing.pdf',
        )

        template_stub = type(
            'TemplateStub',
            (),
            {'template_file': type('TemplateFileStub', (), {'name': 'template.pdf'})()},
        )()

        def fake_issue_certificate(certificate, generated_by=None, template=None):
            certificate.certificate_file.name = 'generated_certificates/rebuilt.pdf'
            certificate.status = Certificate.STATUS_GENERATED
            certificate.save(update_fields=['certificate_file', 'status'])
            return b'%PDF-1.4 rebuilt certificate', certificate, {}

        self.client.force_authenticate(self.user)
        url = reverse('download-generated-certificate', kwargs={'course_id': self.course.id})
        eligibility_stub = {
            'certificate': certificate,
            'eligible': True,
            'can_download': False,
            'reasons': [],
            'enrollment': self.enrollment,
        }

        with patch('lms_backend.views.get_certificate_eligibility', return_value=eligibility_stub), patch(
            'lms_backend.views.prepare_certificate_record',
            return_value=(certificate, eligibility_stub),
        ), patch('lms_backend.views.get_certificate_template_for_course', return_value=template_stub), patch(
            'lms_backend.views.issue_certificate',
            side_effect=fake_issue_certificate,
        ) as mocked_issue:
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attachment;', response.get('Content-Disposition', ''))
        self.assertEqual(mocked_issue.call_count, 1)

        certificate.refresh_from_db()
        self.assertEqual(certificate.certificate_file.name, 'generated_certificates/rebuilt.pdf')

    def test_download_generated_certificate_rebuilds_uploaded_template_output(self):
        template = CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'template.pdf',
                build_minimal_pdf_template_bytes(['Uploaded certificate background']),
                content_type='application/pdf',
            )
        )
        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            status=Certificate.STATUS_GENERATED,
            issue_date=timezone.now(),
            completion_date=timezone.now(),
            template_name='legacy-uploaded-template.pdf',
        )
        certificate.certificate_file.save(
            'legacy-uploaded.pdf',
            ContentFile(build_minimal_pdf_template_bytes(['Legacy uploaded design'])),
            save=True,
        )

        self.client.force_authenticate(self.user)
        url = reverse('download-generated-certificate', kwargs={'course_id': self.course.id})
        with patch('lms_backend.certificate_service.check_course_completion', return_value=True):
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, getattr(response, 'data', None))
        response_bytes = (
            b''.join(response.streaming_content)
            if getattr(response, 'streaming', False)
            else response.content
        )
        extracted_text = PdfReader(io.BytesIO(response_bytes)).pages[0].extract_text() or ''

        self.assertIn('Uploaded certificate background', extracted_text)
        self.assertIn('Test User', extracted_text)
        self.assertNotIn('Legacy uploaded design', extracted_text)

        certificate.refresh_from_db()
        self.assertTrue(certificate.template_name.endswith('.pdf'))
        self.assertNotEqual(certificate.template_name, 'legacy-uploaded-template.pdf')
        self.assertTrue(certificate.certificate_file.name.endswith('.pdf'))

    def test_upload_certificate_template_keeps_docx_file(self):
        self.client.force_authenticate(self.admin_user)
        url = reverse('upload-certificate-template')
        template_file = SimpleUploadedFile(
            'default-template.docx',
            build_minimal_docx_template_bytes(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )

        response = self.client.post(url, {'course_id': self.course.id, 'template': template_file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        template = CertificateTemplate.objects.get(course=self.course)
        self.assertTrue(template.template_file.name.endswith('.docx'))
        self.assertEqual(template.uploaded_by, self.admin_user)

    def test_upload_certificate_template_rejects_non_docx_file(self):
        self.client.force_authenticate(self.admin_user)
        url = reverse('upload-certificate-template')
        template_file = SimpleUploadedFile(
            'template.pdf',
            build_minimal_pdf_template_bytes(['This is to certify that', '[Recipient Name]']),
            content_type='application/pdf',
        )

        response = self.client.post(url, {'template': template_file}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Only Word .docx template files are allowed.')

    def test_upload_certificate_template_invalidates_existing_generated_files(self):
        self.client.force_authenticate(self.admin_user)
        url = reverse('upload-certificate-template')

        certificate = Certificate.objects.create(
            user=self.user,
            course=self.course,
            enrollment=self.enrollment,
            status=Certificate.STATUS_GENERATED,
            issue_date=timezone.now(),
            completion_date=timezone.now(),
        )
        certificate.certificate_file.save(
            'existing.pdf',
            ContentFile(b'%PDF-1.4 existing certificate'),
            save=True,
        )
        old_certificate_path = certificate.certificate_file.path

        response = self.client.post(
            url,
            {
                'template': SimpleUploadedFile(
                    'template.docx',
                    build_minimal_docx_template_bytes(),
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                )
            },
            format='multipart',
        )

        certificate.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['invalidated_certificates'], 1)
        self.assertFalse(certificate.certificate_file.name)
        self.assertTrue(old_certificate_path.endswith('.pdf'))

    def test_upload_certificate_template_replaces_existing_course_template(self):
        self.client.force_authenticate(self.admin_user)
        url = reverse('upload-certificate-template')

        first_response = self.client.post(
            url,
            {
                'course_id': self.course.id,
                'template': SimpleUploadedFile(
                    'first-template.docx',
                    build_minimal_docx_template_bytes(),
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ),
            },
            format='multipart',
        )
        second_response = self.client.post(
            url,
            {
                'course_id': self.course.id,
                'template': SimpleUploadedFile(
                    'second-template.docx',
                    build_minimal_docx_template_bytes(),
                    content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ),
            },
            format='multipart',
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(CertificateTemplate.objects.filter(course=self.course).count(), 1)

        template = CertificateTemplate.objects.get(course=self.course)
        self.assertTrue(template.template_file.name.endswith('.docx'))
        self.assertEqual(template.uploaded_by, self.admin_user)

    def test_certificate_template_course_status_lists_active_courses(self):
        deleted_course = Course.objects.create(
            title='Deleted Course',
            description='Hidden course',
            created_by=self.admin_user,
            is_deleted=True,
        )
        deleted_course.category.add(self.category)

        self.client.force_authenticate(self.admin_user)
        response = self.client.get(reverse('certificate-template-course-status'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        course_names = [row['course_name'] for row in response.data['courses']]
        self.assertIn(self.course.title, course_names)
        self.assertNotIn(deleted_course.title, course_names)
        self.assertEqual(
            set(response.data['courses'][0].keys()),
            {'course_id', 'course_name', 'has_template', 'last_updated', 'updated_by'},
        )

    def test_view_certificate_template_file_returns_uploaded_course_template(self):
        template = CertificateTemplate.objects.create(
            course=self.course,
            template_file=SimpleUploadedFile(
                'course-template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
            uploaded_by=self.admin_user,
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.get(
            reverse('view-certificate-template-file', kwargs={'course_id': self.course.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.get('Content-Type'),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        content_disposition = response.get('Content-Disposition', '')
        self.assertIn('inline;', content_disposition)
        self.assertIn('.docx', content_disposition)
        self.assertTrue(template.template_file.name.endswith('.docx'))

    @patch(
        'lms_backend.certificate_service._convert_docx_bytes_to_pdf_bytes',
        side_effect=lambda *args, **kwargs: build_minimal_pdf_template_bytes(['Enrollment-triggered certificate']),
    )
    def test_completed_enrollment_list_auto_generates_certificate_from_common_template(self, mocked_convert):
        CertificateTemplate.objects.create(
            template_file=SimpleUploadedFile(
                'common-template.docx',
                build_minimal_docx_template_bytes(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
            uploaded_by=self.admin_user,
        )

        self.client.force_authenticate(self.user)
        enrollment_response = self.client.get(reverse('enrollment-list'))

        self.assertEqual(enrollment_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(enrollment_response.data), 1)

        certificate = Certificate.objects.get(user=self.user, course=self.course)
        self.assertEqual(certificate.status, Certificate.STATUS_GENERATED)
        self.assertTrue(certificate.template_name.endswith('.docx'))

        certificate_status = enrollment_response.data[0]['certificate']
        self.assertTrue(certificate_status['has_certificate_record'])
        self.assertEqual(certificate_status['status'], Certificate.STATUS_GENERATED)
        self.assertTrue(certificate_status['can_download'])

        certificates_response = self.client.get('/api/certificates/')
        self.assertEqual(certificates_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(certificates_response.data), 1)
        self.assertEqual(
            certificates_response.data[0]['certificate_number'],
            certificate.certificate_number,
        )
        mocked_convert.assert_called_once()


class CreditPointsRankingAPITest(APITestCase):
    def setUp(self):
        self.request_user = User.objects.create_user(
            username='request-student',
            email='request@example.com',
            password='testpass123',
            first_name='Request',
            last_name='Student',
            user_type='STUDENT',
        )
        self.top_student = User.objects.create_user(
            username='top-student',
            email='top@example.com',
            password='testpass123',
            first_name='Top',
            last_name='Student',
            user_type='STUDENT',
        )
        self.low_student = User.objects.create_user(
            username='low-student',
            email='low@example.com',
            password='testpass123',
            first_name='Low',
            last_name='Student',
            user_type='STUDENT',
        )

        self.course_one = Course.objects.create(
            title='Course One',
            description='First course',
            created_by=self.request_user,
        )
        self.course_two = Course.objects.create(
            title='Course Two',
            description='Second course',
            created_by=self.request_user,
        )

        Enrollment.objects.create(
            user=self.request_user,
            course=self.course_one,
            progress='COMPLETED',
            completed_on=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.top_student,
            course=self.course_one,
            progress='COMPLETED',
            completed_on=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.top_student,
            course=self.course_two,
            progress='COMPLETED',
            completed_on=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.low_student,
            course=self.course_one,
            progress='IN_PROGRESS',
        )

    def test_other_students_credit_points_endpoint_returns_ranked_students(self):
        self.client.force_authenticate(self.request_user)

        response = self.client.get('/api/student/credit-points/others/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual([item['name'] for item in response.data['others']], ['Top Student', 'Low Student'])
        self.assertEqual([item['credit_points'] for item in response.data['others']], [160, 0])
        self.assertNotIn(self.request_user.id, [item['id'] for item in response.data['others']])


class StudentCreditPointsStreakAPITest(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='streak-student',
            email='streak@example.com',
            password='testpass123',
            first_name='Streak',
            last_name='Student',
            user_type='STUDENT',
        )
        self.client.force_authenticate(self.student)

    def _create_login_reward(self, created_at, points=2):
        reward = CreditPoints.objects.create(
            user=self.student,
            points=points,
            source_type='BONUS',
            description='Student login reward',
        )
        CreditPoints.objects.filter(pk=reward.pk).update(created_at=created_at)

    @patch('lms_backend.views.now')
    def test_student_credit_points_counts_today_login_toward_streak(self, mocked_now):
        fixed_now = timezone.make_aware(datetime(2026, 4, 29, 9, 0, 0))
        mocked_now.return_value = fixed_now
        self._create_login_reward(fixed_now - timedelta(days=1))
        self._create_login_reward(fixed_now)

        response = self.client.get('/api/student/credit-points/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_streak_days'], 2)
        self.assertEqual(response.data['breakdown']['current_streak_days'], 2)

    @patch('lms_backend.views.now')
    def test_student_credit_points_resets_streak_after_missed_login_day(self, mocked_now):
        fixed_now = timezone.make_aware(datetime(2026, 4, 29, 9, 0, 0))
        mocked_now.return_value = fixed_now
        self._create_login_reward(fixed_now - timedelta(days=1))

        response = self.client.get('/api/student/credit-points/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_streak_days'], 0)
        self.assertEqual(response.data['breakdown']['current_streak_days'], 0)
        self.assertEqual(response.data['breakdown']['streak_bonus_points'], 0)
