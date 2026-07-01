import io
import logging
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import xml.etree.ElementTree as ET
from contextlib import contextmanager
from zipfile import ZipFile

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

from .models import Certificate, CertificateTemplate, Enrollment
from .utils import check_course_completion

logger = logging.getLogger(__name__)

MASTER_CERTIFICATE_TEMPLATE_NAME = "Built-in Master Certificate"
DEFAULT_CERTIFICATE_STATEMENT = (
    "demonstrating a strong understanding of core concepts and practical applications, "
    "and meeting all the requirements of the program with distinction."
)
DEFAULT_CERTIFICATE_WISH = (
    "We congratulate you on this achievement and encourage you to continue learning, "
    "growing, and applying your skills with confidence in every new opportunity ahead."
)

WORD_TEMPLATE_EXTENSIONS = {".doc", ".docx"}
PDF_TEMPLATE_EXTENSIONS = {".pdf"}

CERTIFICATE_TEMPLATE_PLACEHOLDERS = {
    "{{STUDENT NAME}}": "student_name",
    "{{COURSE NAME}}": "course_name",
    "{{COMPLETION DATE}}": "completion_date_display",
    "{{CERTIFICATE ID}}": "certificate_number",
    "{{STAFF SIGN}}": "staff_sign",
    "{{HEAD OF INSTITUTION}}": "head_of_institution",
}

DOCX_STOP_WORDS = {
    "",
    "this is to certify that",
    "has successfully completed the course",
    "on",
    "completion date",
    "completed on",
    "certificate id",
    "certificate of completion",
}

DOCX_DYNAMIC_TEXT_ANCHORS = {
    "student_name": {"this is to certify that", "award to", "presented to"},
    "course_name": {"has successfully completed the course", "course", "program"},
}


def _normalize_certificate_text(text):
    return " ".join(str(text or "").replace("\xa0", " ").strip().lower().split())


def _safe_int(value, default):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def get_student_display_name(user):
    full_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    if full_name:
        return full_name
    return getattr(user, "username", "") or getattr(user, "email", "") or "Student"


def get_file_extension(file_name):
    return os.path.splitext(str(file_name or "").strip())[1].lower()


def get_template_file_extension(template):
    if not template or not getattr(template, "template_file", None):
        return ""
    return get_file_extension(getattr(template.template_file, "name", ""))


def _resolve_template_name(template):
    if not template or not getattr(template, "template_file", None):
        return MASTER_CERTIFICATE_TEMPLATE_NAME
    template_name = os.path.basename(str(getattr(template.template_file, "name", "") or "").strip())
    return template_name or MASTER_CERTIFICATE_TEMPLATE_NAME


def can_manage_any_student_certificates(user):
    if not user:
        return False
    return bool(
        getattr(user, "is_superuser", False)
        or getattr(user, "is_staff", False)
        or getattr(user, "user_type", None) in {"ADMIN", "STAFF"}
    )


def _file_exists_from_name(file_name):
    normalized = str(file_name or "").replace("\\", "/").lstrip("/")
    if not normalized:
        return False
    media_root = getattr(settings, "MEDIA_ROOT", "")
    if not media_root:
        return False
    return os.path.exists(os.path.join(media_root, normalized.replace("/", os.sep)))


def has_accessible_certificate_file(certificate):
    if not certificate or not getattr(certificate, "certificate_file", None):
        return False
    return _file_exists_from_name(getattr(certificate.certificate_file, "name", ""))


def _delete_file_field(file_field):
    file_name = str(getattr(file_field, "name", "") or "").strip()
    if not file_name:
        return False

    deleted = False
    try:
        file_field.delete(save=False)
        deleted = True
    except Exception:
        deleted = False

    normalized = file_name.replace("\\", "/").lstrip("/")
    media_root = getattr(settings, "MEDIA_ROOT", "")
    if media_root:
        file_path = os.path.join(media_root, normalized.replace("/", os.sep))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                deleted = True
            except Exception:
                pass

    return deleted


def delete_certificate_templates(templates):
    deleted_count = 0

    for template in templates or []:
        try:
            if getattr(template, "template_file", None):
                _delete_file_field(template.template_file)
        except Exception as exc:
            logger.warning(
                "Unable to delete certificate template file %s: %s",
                getattr(getattr(template, "template_file", None), "name", None),
                exc,
            )

        try:
            template.delete()
            deleted_count += 1
        except Exception as exc:
            logger.warning(
                "Unable to delete certificate template record %s: %s",
                getattr(template, "pk", None),
                exc,
            )

    return deleted_count


def cleanup_orphaned_certificate_template_files():
    template_dir = os.path.join(getattr(settings, "MEDIA_ROOT", ""), "certificate_templates")
    if not template_dir or not os.path.isdir(template_dir):
        return 0

    known_files = {
        os.path.normpath(str(file_name).replace("/", os.sep))
        for file_name in CertificateTemplate.objects.exclude(template_file="").values_list("template_file", flat=True)
    }

    removed_count = 0
    for entry_name in os.listdir(template_dir):
        entry_path = os.path.join(template_dir, entry_name)
        if not os.path.isfile(entry_path):
            continue

        relative_name = os.path.normpath(os.path.join("certificate_templates", entry_name))
        if relative_name in known_files:
            continue

        try:
            os.remove(entry_path)
            removed_count += 1
        except Exception as exc:
            logger.warning("Unable to remove orphaned certificate template file %s: %s", entry_path, exc)

    return removed_count


def invalidate_generated_certificate_files():
    invalidated = 0
    certificates = Certificate.objects.exclude(certificate_file="").exclude(certificate_file__isnull=True)

    for certificate in certificates:
        file_name = str(getattr(getattr(certificate, "certificate_file", None), "name", "") or "").strip()
        if not file_name:
            continue

        try:
            _delete_file_field(certificate.certificate_file)
        except Exception as exc:
            logger.warning(
                "Unable to delete generated certificate file %s for certificate=%s: %s",
                file_name,
                getattr(certificate, "certificate_number", None) or getattr(certificate, "pk", None),
                exc,
            )

        certificate.certificate_file = ""
        certificate.save(update_fields=["certificate_file"])
        invalidated += 1

    return invalidated


def get_certificate_template_for_course(course=None):
    template = None

    if course is not None:
        template = CertificateTemplate.objects.filter(course=course).order_by("-uploaded_at").first()

    if not template:
        template = CertificateTemplate.objects.filter(course__isnull=True).order_by("-uploaded_at").first()

    if not template:
        template = CertificateTemplate.objects.order_by("-uploaded_at").first()

    if not template:
        raise CertificateTemplate.DoesNotExist("No certificate template found.")

    template_name = str(getattr(getattr(template, "template_file", None), "name", "") or "").strip()
    if not template_name:
        raise FileNotFoundError("Certificate template file is missing.")
    if not _file_exists_from_name(template_name):
        raise FileNotFoundError(f"Certificate template file not found: {template_name}")

    return template


def _current_effective_template_name(certificate=None, template=None):
    resolved_template = template
    if not resolved_template and certificate:
        try:
            resolved_template = get_certificate_template_for_course(certificate.course)
        except Exception:
            resolved_template = None

    if not resolved_template:
        return MASTER_CERTIFICATE_TEMPLATE_NAME

    extension = get_template_file_extension(resolved_template)
    if extension == ".pdf":
        details = inspect_certificate_pdf_template(resolved_template)
        if not details.get("use_as_background"):
            return MASTER_CERTIFICATE_TEMPLATE_NAME

    return _resolve_template_name(resolved_template)


def has_reusable_generated_certificate(certificate, template=None):
    if not certificate:
        return False
    if getattr(certificate, "status", None) not in {
        Certificate.STATUS_GENERATED,
        getattr(Certificate, "LEGACY_STATUS_ISSUED", "ISSUED"),
    }:
        return False
    if not has_accessible_certificate_file(certificate):
        return False

    active_template_name = _current_effective_template_name(certificate=certificate, template=template)
    if active_template_name and getattr(certificate, "template_name", "") != active_template_name:
        return False

    active_template = template
    if not active_template and certificate:
        try:
            active_template = get_certificate_template_for_course(certificate.course)
        except Exception:
            active_template = None

    if active_template and getattr(active_template, "uploaded_at", None) and getattr(certificate, "issue_date", None):
        if certificate.issue_date < active_template.uploaded_at:
            return False

    return True


def inspect_certificate_pdf_bytes(pdf_bytes):
    details = {
        "pdf_bytes": pdf_bytes,
        "text": "",
        "normalized_text": "",
        "has_placeholders": False,
        "has_intro_text": False,
        "has_course_text": False,
        "has_statement_text": False,
        "has_motivation_text": False,
        "has_completion_date_label": False,
        "has_certificate_id_label": False,
        "use_as_background": False,
    }

    if not pdf_bytes:
        return details

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text_content = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            if extracted:
                text_content.append(extracted)
        text = "\n".join(text_content)
    except Exception:
        text = ""

    normalized_text = _normalize_certificate_text(text)
    raw_lower = text.lower()
    placeholder_tokens = [
        "{{student name}}",
        "{{course name}}",
        "{{completion date}}",
        "{{certificate id}}",
        "{{staff sign}}",
        "{{head of institution}}",
    ]

    details.update(
        {
            "text": text,
            "normalized_text": normalized_text,
            "has_placeholders": any(token in raw_lower for token in placeholder_tokens),
            "has_intro_text": "this is to certify that" in normalized_text,
            "has_course_text": "has successfully completed the course" in normalized_text,
            "has_statement_text": _normalize_certificate_text(
                "demonstrating a strong understanding of core concepts"
            )
            in normalized_text,
            "has_motivation_text": _normalize_certificate_text("we congratulate you on this achievement")
            in normalized_text,
            "has_completion_date_label": "completion date" in normalized_text,
            "has_certificate_id_label": "certificate id" in normalized_text,
        }
    )
    details["use_as_background"] = not details["has_placeholders"]
    return details


def inspect_certificate_pdf_template(template):
    details = {
        "pdf_bytes": b"",
        "text": "",
        "normalized_text": "",
        "has_placeholders": False,
        "has_intro_text": False,
        "has_course_text": False,
        "has_statement_text": False,
        "has_motivation_text": False,
        "has_completion_date_label": False,
        "has_certificate_id_label": False,
        "use_as_background": False,
    }

    if not template or get_template_file_extension(template) != ".pdf":
        return details

    with template.template_file.open("rb") as template_file:
        pdf_bytes = template_file.read()
    return inspect_certificate_pdf_bytes(pdf_bytes)


def get_certificate_file_extension(certificate):
    if not certificate or not getattr(certificate, "certificate_file", None):
        return ""
    return get_file_extension(getattr(certificate.certificate_file, "name", ""))


def build_certificate_download_filename(certificate, extension=None):
    resolved_extension = extension or get_certificate_file_extension(certificate) or ".pdf"
    safe_course_title = re.sub(r"[^A-Za-z0-9._-]+", "_", str(certificate.course.title or "").strip())
    safe_username = re.sub(r"[^A-Za-z0-9._-]+", "_", str(certificate.user.username or "").strip())
    return f"certificate_{safe_course_title}_{safe_username}_{certificate.certificate_number}{resolved_extension}"


def get_certificate_content_type(certificate, extension=None):
    resolved_extension = extension or get_certificate_file_extension(certificate) or ".pdf"
    content_type, _ = mimetypes.guess_type(f"certificate{resolved_extension}")
    return content_type or "application/octet-stream"


def get_certificate_temp_root():
    candidate_roots = [
        os.path.join(str(getattr(settings, "BASE_DIR", os.getcwd())), "tmp_certificate_generation"),
        os.path.join(tempfile.gettempdir(), "lms_tmp_certificate_generation"),
    ]

    for temp_root in candidate_roots:
        try:
            os.makedirs(temp_root, exist_ok=True)
            return temp_root
        except Exception:
            continue

    fallback_root = os.path.join(tempfile.gettempdir(), "lms_tmp_certificate_generation_fallback")
    os.makedirs(fallback_root, exist_ok=True)
    return fallback_root


@contextmanager
def temporary_certificate_dir(prefix="certificate"):
    temp_dir = os.path.join(get_certificate_temp_root(), f"{prefix}_{uuid.uuid4().hex}")
    os.makedirs(temp_dir, exist_ok=True)
    try:
        yield temp_dir
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


def get_certificate_eligibility(user, course, enrollment=None):
    reasons = []
    existing_certificate = (
        Certificate.objects.select_related("enrollment", "course", "user")
        .filter(user=user, course=course)
        .first()
    )

    if not enrollment and user and course:
        enrollment = Enrollment.objects.filter(user=user, course=course).first()

    if not enrollment:
        reasons.append("You are not enrolled in this course.")
        return {
            "eligible": False,
            "status": "NOT_ELIGIBLE",
            "reasons": reasons,
            "enrollment": None,
            "certificate": existing_certificate,
            "can_generate": False,
            "can_download": False,
            "completion_date": None,
        }

    is_completed = enrollment.progress == "COMPLETED"
    if not is_completed:
        try:
            is_completed = check_course_completion(user, course)
        except Exception:
            is_completed = False

    if not is_completed:
        reasons.append("Complete the course to unlock your certificate.")

    can_download = bool(existing_certificate and has_reusable_generated_certificate(existing_certificate))

    if not is_completed:
        status = "NOT_ELIGIBLE"
    elif can_download:
        status = Certificate.STATUS_GENERATED
    elif existing_certificate and existing_certificate.status == Certificate.STATUS_PENDING_APPROVAL:
        status = Certificate.STATUS_PENDING_APPROVAL
    else:
        status = "ELIGIBLE"

    return {
        "eligible": is_completed,
        "status": status,
        "reasons": reasons,
        "enrollment": enrollment,
        "certificate": existing_certificate,
        "can_generate": is_completed and not can_download,
        "can_download": can_download,
        "completion_date": getattr(enrollment, "completed_on", None),
    }


def prepare_certificate_record(user, course, enrollment=None, template=None):
    eligibility = get_certificate_eligibility(user, course, enrollment)
    if not eligibility["eligible"]:
        reason = eligibility["reasons"][0] if eligibility["reasons"] else "Certificate is not eligible."
        raise ValueError(reason)

    enrollment = eligibility["enrollment"]
    certificate = eligibility["certificate"]
    resolved_template = template
    if not resolved_template and course is not None:
        try:
            resolved_template = get_certificate_template_for_course(course)
        except Exception:
            resolved_template = None

    template_name = _current_effective_template_name(template=resolved_template)

    if certificate:
        updated_fields = []
        if certificate.enrollment_id != enrollment.id:
            certificate.enrollment = enrollment
            updated_fields.append("enrollment")
        if certificate.completion_date != enrollment.completed_on:
            certificate.completion_date = enrollment.completed_on
            updated_fields.append("completion_date")
        if certificate.status not in {
            Certificate.STATUS_PENDING_APPROVAL,
            Certificate.STATUS_GENERATED,
            getattr(Certificate, "LEGACY_STATUS_ISSUED", "ISSUED"),
        }:
            certificate.status = Certificate.STATUS_PENDING_APPROVAL
            updated_fields.append("status")
        if updated_fields:
            certificate.save(update_fields=updated_fields)
        return certificate, eligibility

    certificate = Certificate.objects.create(
        user=user,
        course=course,
        enrollment=enrollment,
        status=Certificate.STATUS_PENDING_APPROVAL,
        completion_date=enrollment.completed_on,
        template_name=template_name,
    )
    return certificate, eligibility


def build_certificate_payload(certificate, template=None, preview=False):
    resolved_template = template
    if not resolved_template and certificate and getattr(certificate, "course", None):
        try:
            resolved_template = get_certificate_template_for_course(certificate.course)
        except Exception:
            resolved_template = None

    template_name = _current_effective_template_name(certificate=certificate, template=resolved_template)
    completion_date = certificate.completion_date or getattr(certificate.enrollment, "completed_on", None)
    issue_date = certificate.issue_date or timezone.now()

    staff_sign = (getattr(resolved_template, "staff_signature_text", "") or "").strip()
    head_of_institution = (getattr(resolved_template, "signature_text", "") or "").strip()

    return {
        "student_name": get_student_display_name(certificate.user),
        "course_name": certificate.course.title,
        "completion_date": completion_date,
        "completion_date_display": completion_date.strftime("%B %d, %Y") if completion_date else "Pending completion",
        "certificate_number": certificate.certificate_number or certificate.certificate_uuid,
        "certificate_uuid": certificate.certificate_uuid,
        "issue_date": issue_date,
        "issue_date_display": issue_date.strftime("%B %d, %Y"),
        "template_name": template_name,
        "completion_statement": DEFAULT_CERTIFICATE_STATEMENT,
        "motivation_text": DEFAULT_CERTIFICATE_WISH,
        "staff_sign": staff_sign,
        "head_of_institution": head_of_institution,
        "preview": preview,
    }


def _build_docx_placeholder_values(payload, blank_dynamic_values=False):
    values = {}
    for placeholder, payload_key in CERTIFICATE_TEMPLATE_PLACEHOLDERS.items():
        value = str(payload.get(payload_key, "") or "")
        values[placeholder] = " " if blank_dynamic_values else value
    return values


def _normalize_docx_text_value(text):
    return " ".join(str(text or "").replace("\xa0", " ").strip().split())


def _looks_like_docx_date(text):
    normalized = _normalize_docx_text_value(text)
    if not normalized:
        return False

    return bool(
        re.fullmatch(
            r"(January|February|March|April|May|June|July|August|September|October|November|December)"
            r"\s+\d{1,2},\s+\d{4}",
            normalized,
        )
    )


def _looks_like_docx_certificate_id(text):
    return bool(re.fullmatch(r"CERT-\d{4}-\d{4,}", _normalize_docx_text_value(text)))


def _is_meaningful_docx_candidate(text):
    normalized = _normalize_docx_text_value(text)
    if not normalized:
        return False
    if _normalize_certificate_text(normalized) in DOCX_STOP_WORDS:
        return False
    return True


def _find_docx_text_after_anchor(text_nodes, anchor_texts, validator=None):
    normalized_anchors = {_normalize_certificate_text(anchor_text) for anchor_text in anchor_texts}

    for index, text_node in enumerate(text_nodes):
        if _normalize_certificate_text(text_node["text"]) not in normalized_anchors:
            continue

        for candidate in text_nodes[index + 1 :]:
            candidate_text = candidate["text"]
            if not _is_meaningful_docx_candidate(candidate_text):
                continue
            if validator and not validator(candidate_text):
                continue
            return candidate_text

    return ""


def _extract_docx_text_nodes(xml_bytes):
    try:
        xml_root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []

    text_nodes = []
    for text_element in xml_root.iter():
        if not text_element.tag.endswith("}t"):
            continue

        raw_text = "".join(text_element.itertext())
        normalized_text = _normalize_docx_text_value(raw_text)
        if not normalized_text:
            continue

        text_nodes.append({"element": text_element, "text": normalized_text})

    return text_nodes


def _infer_docx_dynamic_replacements(document_bytes, payload, blank_dynamic_values=False):
    document_xml_bytes = b""
    try:
        with ZipFile(io.BytesIO(document_bytes), "r") as document_archive:
            document_xml_bytes = document_archive.read("word/document.xml")
    except Exception:
        document_xml_bytes = b""

    replacements = _build_docx_placeholder_values(payload, blank_dynamic_values=blank_dynamic_values)
    if any(placeholder.encode("utf-8") in document_xml_bytes for placeholder in CERTIFICATE_TEMPLATE_PLACEHOLDERS):
        return replacements

    text_nodes = _extract_docx_text_nodes(document_xml_bytes)
    if not text_nodes:
        return replacements

    replacement_value = lambda key: " " if blank_dynamic_values else str(payload.get(key, "") or "")

    student_name_source = _find_docx_text_after_anchor(
        text_nodes,
        DOCX_DYNAMIC_TEXT_ANCHORS["student_name"],
        validator=lambda text: not _looks_like_docx_date(text) and not _looks_like_docx_certificate_id(text),
    )
    if student_name_source:
        replacements[student_name_source] = replacement_value("student_name")

    course_name_source = _find_docx_text_after_anchor(
        text_nodes,
        DOCX_DYNAMIC_TEXT_ANCHORS["course_name"],
        validator=lambda text: not _looks_like_docx_date(text) and not _looks_like_docx_certificate_id(text),
    )
    if course_name_source:
        replacements[course_name_source] = replacement_value("course_name")

    completion_date_value = replacement_value("completion_date_display")
    certificate_number_value = replacement_value("certificate_number")

    for index, text_node in enumerate(text_nodes):
        normalized_text = _normalize_certificate_text(text_node["text"])
        if normalized_text not in {"on", "completion date", "completed on"}:
            continue

        for candidate in text_nodes[index + 1 :]:
            if _looks_like_docx_date(candidate["text"]):
                replacements[candidate["text"]] = completion_date_value
                break

    for text_node in text_nodes:
        if _looks_like_docx_certificate_id(text_node["text"]):
            replacements[text_node["text"]] = certificate_number_value

    return replacements


def _replace_docx_placeholders(document_bytes, replacements):
    source_stream = io.BytesIO(document_bytes)
    rendered_stream = io.BytesIO()

    with ZipFile(source_stream, "r") as source_zip, ZipFile(rendered_stream, "w") as rendered_zip:
        for zip_info in source_zip.infolist():
            file_bytes = source_zip.read(zip_info.filename)
            if zip_info.filename.startswith("word/") and zip_info.filename.endswith(".xml"):
                try:
                    xml_text = file_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    rendered_zip.writestr(zip_info, file_bytes)
                    continue

                for placeholder, value in replacements.items():
                    xml_text = xml_text.replace(placeholder, value)
                file_bytes = xml_text.encode("utf-8")

            rendered_zip.writestr(zip_info, file_bytes)

    rendered_stream.seek(0)
    return rendered_stream.getvalue()


def _convert_docx_bytes_to_pdf_bytes(docx_bytes, output_stem="certificate"):
    with temporary_certificate_dir(prefix="render") as temp_dir:
        input_path = os.path.join(temp_dir, f"{output_stem}.docx")
        output_path = os.path.join(temp_dir, f"{output_stem}.pdf")

        with open(input_path, "wb") as input_file:
            input_file.write(docx_bytes)

        conversion_errors = []

        try:
            from docx2pdf import convert as docx2pdf_convert

            pythoncom = None
            com_initialized = False
            if os.name == "nt":
                try:
                    import pythoncom as _pythoncom
                    pythoncom = _pythoncom
                    pythoncom.CoInitialize()
                    com_initialized = True
                except Exception:
                    pythoncom = None
                    com_initialized = False

            try:
                docx2pdf_convert(input_path, output_path)
            finally:
                if com_initialized and pythoncom is not None:
                    try:
                        pythoncom.CoUninitialize()
                    except Exception:
                        pass
        except Exception as exc:
            conversion_errors.append(f"docx2pdf failed: {exc}")

        if not os.path.exists(output_path):
            office_binary = shutil.which("soffice") or shutil.which("libreoffice")
            if office_binary:
                result = subprocess.run(
                    [
                        office_binary,
                        "--headless",
                        "--convert-to",
                        "pdf",
                        "--outdir",
                        temp_dir,
                        input_path,
                    ],
                    capture_output=True,
                    text=True,
                )
                generated_pdf = os.path.join(temp_dir, f"{os.path.splitext(os.path.basename(input_path))[0]}.pdf")
                if result.returncode == 0 and os.path.exists(generated_pdf):
                    if generated_pdf != output_path:
                        os.replace(generated_pdf, output_path)
                else:
                    stderr = (result.stderr or "").strip()
                    conversion_errors.append(f"LibreOffice conversion failed: {stderr or 'unknown error'}")
            else:
                conversion_errors.append("No Word-to-PDF converter found (docx2pdf/LibreOffice).")

        if not os.path.exists(output_path):
            details = "; ".join(conversion_errors) or "conversion failed"
            raise RuntimeError(details)

        with open(output_path, "rb") as output_file:
            return output_file.read()


def render_certificate_docx(certificate, template=None, preview=False, blank_dynamic_values=False):
    template = template or get_certificate_template_for_course(certificate.course)
    payload = build_certificate_payload(certificate, template=template, preview=preview)

    with template.template_file.open("rb") as template_file:
        template_bytes = template_file.read()

    replacements = _infer_docx_dynamic_replacements(
        template_bytes,
        payload,
        blank_dynamic_values=blank_dynamic_values,
    )
    rendered_bytes = _replace_docx_placeholders(template_bytes, replacements)
    return rendered_bytes, payload


def _read_pdf_page_size_from_bytes(pdf_bytes):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    first_page = reader.pages[0]
    return float(first_page.mediabox.width), float(first_page.mediabox.height)


def _read_template_page_size(template=None, background_pdf_bytes=None):
    if background_pdf_bytes:
        try:
            return _read_pdf_page_size_from_bytes(background_pdf_bytes)
        except Exception:
            pass

    if template and get_template_file_extension(template) == ".pdf":
        try:
            with template.template_file.open("rb") as template_file:
                return _read_pdf_page_size_from_bytes(template_file.read())
        except Exception:
            pass

    return landscape(A4)


def _get_certificate_layout(template, width, height):
    template = template or CertificateTemplate()
    return {
        "name_x": _safe_int(getattr(template, "name_x", None), int(width / 2)),
        "name_y": _safe_int(getattr(template, "name_y", None), int(height * 0.56)),
        "course_x": _safe_int(getattr(template, "course_x", None), int(width / 2)),
        "course_y": _safe_int(getattr(template, "course_y", None), int(height * 0.44)),
        "uuid_x": _safe_int(getattr(template, "uuid_x", None), int(width * 0.72)),
        "uuid_y": _safe_int(getattr(template, "uuid_y", None), int(height * 0.17)),
        "completion_date_x": _safe_int(getattr(template, "completion_date_x", None), int(width * 0.72)),
        "completion_date_y": _safe_int(getattr(template, "completion_date_y", None), int(height * 0.12)),
        "signature_x": _safe_int(getattr(template, "signature_x", None), int(width * 0.27)),
        "signature_y": _safe_int(getattr(template, "signature_y", None), int(height * 0.80)),
        "staff_signature_x": _safe_int(getattr(template, "staff_signature_x", None), int(width * 0.73)),
        "staff_signature_y": _safe_int(getattr(template, "staff_signature_y", None), int(height * 0.80)),
    }


def _set_font_safe(pdf_canvas, font_name, font_size, fallback="Helvetica"):
    try:
        pdf_canvas.setFont(font_name, font_size)
        return font_name
    except Exception:
        pdf_canvas.setFont(fallback, font_size)
        return fallback


def _fit_text_lines(text, font_name, font_size, max_width, min_font_size=12, max_lines=2):
    if not text:
        return font_name, int(font_size or min_font_size), [""]

    default_font_size = int(font_size or min_font_size)
    text_length = len(text.strip())

    if text_length <= 28:
        font_size = default_font_size
    elif text_length <= 52:
        font_size = max(default_font_size - 2, int(min_font_size or default_font_size))
    else:
        font_size = max(default_font_size - 4, int(min_font_size or default_font_size))

    min_font_size = min(font_size, int(min_font_size or font_size))

    for size in range(font_size, min_font_size - 1, -1):
        lines = simpleSplit(text, font_name, size, max_width)
        if len(lines) <= max_lines:
            return font_name, size, lines

    lines = simpleSplit(text, font_name, min_font_size, max_width)
    if len(lines) > max_lines:
        visible_lines = lines[:max_lines]
        visible_lines[-1] = visible_lines[-1].rstrip(". ")
        if not visible_lines[-1].endswith("..."):
            visible_lines[-1] = f"{visible_lines[-1]}..."
        lines = visible_lines

    return font_name, min_font_size, lines


def _draw_centered_text_block(pdf_canvas, x, y, text, font_name, font_size, max_width, min_font_size=12):
    usable_font = _set_font_safe(pdf_canvas, font_name, font_size)
    usable_font, fitted_size, lines = _fit_text_lines(
        text,
        usable_font,
        font_size,
        max_width=max_width,
        min_font_size=min_font_size,
        max_lines=2,
    )
    _set_font_safe(pdf_canvas, usable_font, fitted_size)

    line_height = max(fitted_size + 4, int(fitted_size * 1.2))
    total_height = line_height * max(len(lines), 1)
    start_y = y + (total_height / 2) - line_height

    for index, line in enumerate(lines):
        pdf_canvas.drawCentredString(x, start_y - (index * line_height), line)


def _draw_wrapped_paragraph(pdf_canvas, x, y, text, font_name, font_size, max_width, line_height=None):
    usable_font = _set_font_safe(pdf_canvas, font_name, font_size)
    usable_font, fitted_size, lines = _fit_text_lines(
        text,
        usable_font,
        font_size,
        max_width=max_width,
        min_font_size=max(10, int(font_size or 12) - 4),
        max_lines=4,
    )
    _set_font_safe(pdf_canvas, usable_font, fitted_size)

    effective_line_height = line_height or max(fitted_size + 3, int(fitted_size * 1.25))
    for index, line in enumerate(lines):
        pdf_canvas.drawCentredString(x, y - (index * effective_line_height), line)


def _draw_fixed_text(pdf_canvas, x, y, text, font_name, font_size, fallback="Helvetica"):
    _set_font_safe(pdf_canvas, font_name, int(font_size or 12), fallback=fallback)
    pdf_canvas.drawString(x, y, text)


def _draw_master_certificate_background(pdf_canvas, width, height):
    base_bg = colors.HexColor("#fcf9f4")
    outer_border = colors.HexColor("#9d7b45")
    inner_border = colors.HexColor("#d9c7a7")
    navy = colors.HexColor("#123f67")
    gold = colors.HexColor("#b58b3a")
    soft_gold = colors.HexColor("#efe3cc")
    muted_text = colors.HexColor("#7b6a56")
    line_soft = colors.HexColor("#ccb793")

    pdf_canvas.setFillColor(base_bg)
    pdf_canvas.rect(0, 0, width, height, stroke=0, fill=1)
    pdf_canvas.setFillColor(colors.Color(0.94, 0.91, 0.86, alpha=0.85))
    pdf_canvas.roundRect(55, height - 150, width - 110, 82, 24, stroke=0, fill=1)
    pdf_canvas.setStrokeColor(outer_border)
    pdf_canvas.setLineWidth(2.2)
    pdf_canvas.roundRect(22, 22, width - 44, height - 44, 16, stroke=1, fill=0)
    pdf_canvas.setStrokeColor(inner_border)
    pdf_canvas.setLineWidth(1.0)
    pdf_canvas.roundRect(36, 36, width - 72, height - 72, 12, stroke=1, fill=0)

    ribbon_width = 340
    ribbon_height = 36
    ribbon_x = (width - ribbon_width) / 2
    ribbon_y = height - 78
    pdf_canvas.setFillColor(soft_gold)
    pdf_canvas.roundRect(ribbon_x, ribbon_y, ribbon_width, ribbon_height, 18, stroke=0, fill=1)
    pdf_canvas.setFillColor(muted_text)
    _set_font_safe(pdf_canvas, "Helvetica-Bold", 11)
    pdf_canvas.drawCentredString(width / 2, ribbon_y + 12, "CONGRATS")

    pdf_canvas.setFillColor(navy)
    _set_font_safe(pdf_canvas, "Times-Bold", 31)
    pdf_canvas.drawCentredString(width / 2, height - 110, "Certificate of Completion")

    pdf_canvas.setStrokeColor(gold)
    pdf_canvas.setLineWidth(1.5)
    pdf_canvas.line(width / 2 - 125, height - 124, width / 2 - 20, height - 124)
    pdf_canvas.line(width / 2 + 20, height - 124, width / 2 + 125, height - 124)

    pdf_canvas.setFillColor(colors.Color(0.91, 0.87, 0.80, alpha=0.25))
    pdf_canvas.roundRect(82, 58, width - 164, 52, 16, stroke=0, fill=1)
    pdf_canvas.setStrokeColor(line_soft)
    pdf_canvas.setLineWidth(1)
    pdf_canvas.line(width * 0.17, 96, width * 0.37, 96)
    pdf_canvas.line(width * 0.63, 96, width * 0.83, 96)
    pdf_canvas.setFillColor(muted_text)
    _set_font_safe(pdf_canvas, "Helvetica", 10)
    pdf_canvas.drawCentredString(width * 0.27, 78, "Authorized Signature")
    pdf_canvas.drawCentredString(width * 0.73, 78, "Head of Institution")


def _is_standard_template_text(text_content):
    normalized_text = _normalize_certificate_text(text_content)
    if not normalized_text:
        return True
    return normalized_text in {
        _normalize_certificate_text("Student Name"),
        _normalize_certificate_text("Course Title"),
        _normalize_certificate_text("Completion Date"),
        _normalize_certificate_text("Certificate ID"),
        _normalize_certificate_text("Authorized Signature"),
        _normalize_certificate_text("Head of Institution"),
    }


def _build_docx_background_pdf_bytes(certificate, template, preview=False):
    blank_docx_bytes, payload = render_certificate_docx(
        certificate,
        template=template,
        preview=preview,
        blank_dynamic_values=True,
    )
    output_stem = f"background_{certificate.certificate_number or certificate.certificate_uuid}"
    return _convert_docx_bytes_to_pdf_bytes(blank_docx_bytes, output_stem=output_stem), payload


def render_certificate_pdf(certificate, template=None, preview=False, allow_uploaded_background=True):
    template_extension = get_template_file_extension(template)
    background_pdf_bytes = None
    template_pdf_details = {}

    if allow_uploaded_background and template_extension == ".pdf":
        template_pdf_details = inspect_certificate_pdf_template(template)
        if template_pdf_details.get("use_as_background"):
            background_pdf_bytes = template_pdf_details.get("pdf_bytes")
    elif allow_uploaded_background and template_extension in WORD_TEMPLATE_EXTENSIONS:
        background_pdf_bytes, _ = _build_docx_background_pdf_bytes(certificate, template, preview=preview)
        template_pdf_details = inspect_certificate_pdf_bytes(background_pdf_bytes)
        template_pdf_details["use_as_background"] = True

    use_uploaded_background = bool(background_pdf_bytes)
    template_width, template_height = _read_template_page_size(template, background_pdf_bytes=background_pdf_bytes)
    layout = _get_certificate_layout(template, template_width, template_height)
    payload = build_certificate_payload(certificate, template=template, preview=preview)

    packet = io.BytesIO()
    pdf_canvas = canvas.Canvas(packet, pagesize=(template_width, template_height))
    flip_y = lambda value: template_height - float(value)

    if not use_uploaded_background:
        _draw_master_certificate_background(pdf_canvas, template_width, template_height)

    body_blue = colors.HexColor("#124e78")
    body_dark = colors.HexColor("#222222")
    soft_gray = colors.HexColor("#5b5b5b")
    intro_y = max(layout["name_y"] - 66, 120)
    accomplishment_y = layout["course_y"] - 42
    statement_y = layout["course_y"] + 54
    motivation_y = statement_y + 44

    if not (use_uploaded_background and template_pdf_details.get("has_intro_text")):
        pdf_canvas.setFillColor(body_blue)
        _draw_centered_text_block(
            pdf_canvas,
            layout["name_x"],
            flip_y(intro_y),
            "This is to certify that",
            "Helvetica-Bold",
            18,
            max_width=template_width * 0.62,
            min_font_size=16,
        )

    pdf_canvas.setFillColor(body_dark)
    _draw_centered_text_block(
        pdf_canvas,
        layout["name_x"],
        flip_y(layout["name_y"]),
        payload["student_name"],
        getattr(template, "name_font", "Helvetica-Bold") if template else "Helvetica-Bold",
        _safe_int(getattr(template, "name_font_size", None), 28) + 4,
        max_width=template_width * 0.68,
        min_font_size=22,
    )

    pdf_canvas.setStrokeColor(colors.Color(0.70, 0.56, 0.26, alpha=0.45))
    pdf_canvas.setLineWidth(1.2)
    pdf_canvas.line(
        layout["name_x"] - 105,
        flip_y(layout["name_y"] + 18),
        layout["name_x"] + 105,
        flip_y(layout["name_y"] + 18),
    )

    if not (use_uploaded_background and template_pdf_details.get("has_course_text")):
        pdf_canvas.setFillColor(body_blue)
        _draw_centered_text_block(
            pdf_canvas,
            layout["course_x"],
            flip_y(accomplishment_y),
            "has successfully completed the course",
            "Helvetica-Bold",
            16,
            max_width=template_width * 0.70,
            min_font_size=14,
        )

    pdf_canvas.setFillColor(body_dark)
    _draw_centered_text_block(
        pdf_canvas,
        layout["course_x"],
        flip_y(layout["course_y"]),
        payload["course_name"],
        getattr(template, "course_font", "Helvetica-Bold") if template else "Helvetica-Bold",
        _safe_int(getattr(template, "course_font_size", None), 14) + 8,
        max_width=template_width * 0.68,
        min_font_size=18,
    )

    if not (use_uploaded_background and template_pdf_details.get("has_statement_text")):
        pdf_canvas.setFillColor(body_blue)
        _draw_wrapped_paragraph(
            pdf_canvas,
            template_width / 2,
            flip_y(statement_y),
            payload["completion_statement"],
            "Helvetica",
            12,
            max_width=template_width * 0.74,
        )

    if not (use_uploaded_background and template_pdf_details.get("has_motivation_text")):
        pdf_canvas.setFillColor(soft_gray)
        _draw_wrapped_paragraph(
            pdf_canvas,
            template_width / 2,
            flip_y(motivation_y),
            payload["motivation_text"],
            "Helvetica-Oblique",
            10,
            max_width=template_width * 0.72,
        )

    pdf_canvas.setFillColor(body_dark)
    _draw_fixed_text(
        pdf_canvas,
        layout["uuid_x"],
        flip_y(layout["uuid_y"]),
        (
            payload["certificate_number"]
            if use_uploaded_background and template_pdf_details.get("has_certificate_id_label")
            else f"Certificate ID: {payload['certificate_number']}"
        ),
        getattr(template, "uuid_font", "Helvetica") if template else "Helvetica",
        _safe_int(getattr(template, "uuid_font_size", None), 10),
    )

    _draw_fixed_text(
        pdf_canvas,
        layout["completion_date_x"],
        flip_y(layout["completion_date_y"]),
        (
            payload["completion_date_display"]
            if use_uploaded_background and template_pdf_details.get("has_completion_date_label")
            else f"Completion Date: {payload['completion_date_display']}"
        ),
        getattr(template, "completion_date_font", "Helvetica") if template else "Helvetica",
        _safe_int(getattr(template, "completion_date_font_size", None), 12),
    )

    signature_text = (getattr(template, "signature_text", "") or "").strip()
    if signature_text:
        pdf_canvas.setFillColor(body_dark)
        _set_font_safe(
            pdf_canvas,
            getattr(template, "signature_font", "Times-Italic"),
            _safe_int(getattr(template, "signature_font_size", None), 22),
            fallback="Times-Italic",
        )
        pdf_canvas.drawCentredString(layout["signature_x"], flip_y(layout["signature_y"]), signature_text)

    staff_signature_text = (getattr(template, "staff_signature_text", "") or "").strip()
    if staff_signature_text:
        pdf_canvas.setFillColor(body_dark)
        _set_font_safe(
            pdf_canvas,
            getattr(template, "staff_signature_font", "Times-Italic"),
            _safe_int(getattr(template, "staff_signature_font_size", None), 22),
            fallback="Times-Italic",
        )
        pdf_canvas.drawCentredString(layout["staff_signature_x"], flip_y(layout["staff_signature_y"]), staff_signature_text)

    custom_texts = getattr(template, "custom_texts", None) or []
    for text_item in custom_texts:
        try:
            text_content = str(text_item.get("content", "") or "")
            if _is_standard_template_text(text_content):
                continue

            text_x = float(text_item.get("x", 0))
            text_y = float(text_item.get("y", 0))
            text_font = text_item.get("font", "Helvetica")
            text_font_size = int(text_item.get("fontSize", 14))
            text_color_hex = str(text_item.get("color", "#111111") or "#111111").lstrip("#")
            if len(text_color_hex) != 6:
                text_color_hex = "111111"

            red, green, blue = tuple(int(text_color_hex[index : index + 2], 16) / 255.0 for index in (0, 2, 4))
            pdf_canvas.setFillColor(colors.Color(red, green, blue))
            _set_font_safe(pdf_canvas, text_font, text_font_size)
            pdf_canvas.drawCentredString(int(text_x), flip_y(int(text_y)), text_content)
        except Exception:
            continue

    pdf_canvas.save()
    packet.seek(0)

    overlay_page = PdfReader(packet).pages[0]
    output_pdf = PdfWriter()

    if use_uploaded_background:
        background_page = PdfReader(io.BytesIO(background_pdf_bytes)).pages[0]
        background_page.merge_page(overlay_page)
        output_pdf.add_page(background_page)
        payload["template_name"] = _resolve_template_name(template)
    else:
        output_pdf.add_page(overlay_page)
        payload["template_name"] = MASTER_CERTIFICATE_TEMPLATE_NAME

    output_stream = io.BytesIO()
    output_pdf.write(output_stream)
    output_stream.seek(0)
    payload["output_extension"] = ".pdf"
    payload["content_type"] = "application/pdf"
    return output_stream.getvalue(), payload


def render_master_certificate_pdf(certificate, template=None, preview=False):
    pdf_bytes, payload = render_certificate_pdf(
        certificate,
        template=template,
        preview=preview,
        allow_uploaded_background=False,
    )
    payload["template_name"] = MASTER_CERTIFICATE_TEMPLATE_NAME
    payload["output_extension"] = ".pdf"
    payload["content_type"] = "application/pdf"
    return pdf_bytes, payload, ".pdf", "application/pdf"


def render_certificate_file(certificate, template=None, preview=False, require_pdf=False):
    try:
        template = template or get_certificate_template_for_course(certificate.course)
    except Exception:
        template = None

    template_extension = get_template_file_extension(template)

    if template_extension in WORD_TEMPLATE_EXTENSIONS:
        docx_bytes, payload = render_certificate_docx(certificate, template=template, preview=preview)

        try:
            pdf_bytes = _convert_docx_bytes_to_pdf_bytes(
                docx_bytes,
                output_stem=f"certificate_{certificate.certificate_number or certificate.certificate_uuid}",
            )
            payload["output_extension"] = ".pdf"
            payload["content_type"] = "application/pdf"
            return pdf_bytes, payload, ".pdf", "application/pdf"
        except Exception as exc:
            if require_pdf:
                raise RuntimeError(f"Unable to convert certificate to PDF: {exc}") from exc

            payload["output_extension"] = ".docx"
            payload["content_type"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            return (
                docx_bytes,
                payload,
                ".docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

    if template_extension == ".pdf":
        pdf_bytes, payload = render_certificate_pdf(
            certificate,
            template=template,
            preview=preview,
            allow_uploaded_background=True,
        )
        return pdf_bytes, payload, ".pdf", "application/pdf"

    return render_master_certificate_pdf(certificate, template=template, preview=preview)


@transaction.atomic
def issue_certificate(certificate, generated_by=None, template=None):
    template = template or get_certificate_template_for_course(certificate.course)
    updated_fields = []

    if not certificate.issue_date:
        certificate.issue_date = timezone.now()
        updated_fields.append("issue_date")
    if generated_by and can_manage_any_student_certificates(generated_by):
        if certificate.generated_by_id != generated_by.id:
            certificate.generated_by = generated_by
            updated_fields.append("generated_by")
    if updated_fields:
        certificate.save(update_fields=updated_fields)

    existing_file_name = str(getattr(getattr(certificate, "certificate_file", None), "name", "") or "").strip()
    if existing_file_name:
        try:
            _delete_file_field(certificate.certificate_file)
        except Exception as exc:
            logger.warning(
                "Unable to delete stale certificate file %s for certificate=%s: %s",
                existing_file_name,
                getattr(certificate, "certificate_number", None) or getattr(certificate, "pk", None),
                exc,
            )
        certificate.certificate_file = ""

    file_bytes, payload, output_extension, _ = render_certificate_file(
        certificate,
        template=template,
        preview=False,
        require_pdf=True,
    )
    certificate.certificate_file.save(
        f"certificate_{certificate.certificate_number}{output_extension}",
        ContentFile(file_bytes),
        save=False,
    )
    certificate.status = Certificate.STATUS_GENERATED
    certificate.template_name = payload.get("template_name", MASTER_CERTIFICATE_TEMPLATE_NAME)
    certificate.save(update_fields=["certificate_file", "status", "template_name"])
    return file_bytes, certificate, payload


def ensure_generated_certificate_for_enrollment(enrollment, generated_by=None, send_email=False):
    if not enrollment or getattr(enrollment, "progress", None) != "COMPLETED":
        return None

    user = getattr(enrollment, "user", None)
    course = getattr(enrollment, "course", None)
    if not user or not course:
        return None

    try:
        template = get_certificate_template_for_course(course)
    except CertificateTemplate.DoesNotExist:
        logger.info(
            "Skipping automatic certificate generation because no certificate template is available for user=%s course=%s",
            getattr(user, "id", None),
            getattr(course, "id", None),
        )
        return None
    except FileNotFoundError as exc:
        logger.warning(
            "Skipping automatic certificate generation because the template file is missing for user=%s course=%s: %s",
            getattr(user, "id", None),
            getattr(course, "id", None),
            exc,
        )
        return None

    try:
        certificate, _ = prepare_certificate_record(
            user,
            course,
            enrollment=enrollment,
            template=template,
        )
    except ValueError as exc:
        logger.info(
            "Skipping automatic certificate generation because enrollment is not eligible for user=%s course=%s: %s",
            getattr(user, "id", None),
            getattr(course, "id", None),
            exc,
        )
        return None

    if has_reusable_generated_certificate(certificate, template=template):
        return certificate

    try:
        _, certificate, _ = issue_certificate(
            certificate,
            generated_by=generated_by,
            template=template,
        )
        if send_email:
            logger.debug(
                "Automatic certificate email requested but email sending is not configured in certificate_service for user=%s course=%s",
                getattr(user, "id", None),
                getattr(course, "id", None),
            )
        return certificate
    except Exception as exc:
        logger.exception(
            "Automatic certificate generation failed for user=%s course=%s: %s",
            getattr(user, "id", None),
            getattr(course, "id", None),
            exc,
        )
        return None


def build_certificate_status_payload(user, course, enrollment=None):
    eligibility = get_certificate_eligibility(user, course, enrollment=enrollment)
    certificate = eligibility["certificate"]
    template_name = getattr(certificate, "template_name", "") or _current_effective_template_name(certificate=certificate)

    return {
        "status": eligibility["status"],
        "eligible": eligibility["eligible"],
        "can_download": eligibility["can_download"] or bool(
            eligibility["eligible"] and getattr(course, "certificate", None)
        ),
        "certificate_id": getattr(certificate, "certificate_number", None),
        "certificate_uuid": getattr(certificate, "certificate_uuid", None),
        "completion_date": eligibility["completion_date"],
        "issue_date": getattr(certificate, "issue_date", None),
        "template_name": template_name or MASTER_CERTIFICATE_TEMPLATE_NAME,
        "has_certificate_record": bool(certificate),
        "reasons": eligibility["reasons"],
    }