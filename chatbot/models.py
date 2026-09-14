from django.db import models


class Case(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("investigation", "Under Investigation"),
        ("pending", "Pending"),
        ("closed", "Closed"),
        ("archived", "Archived"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    case_number = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="open",
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium",
    )

    summary = models.TextField(blank=True)
    incident_datetime = models.DateTimeField(
        null=True,
        blank=True,
    )

    location = models.CharField(
        max_length=255,
        blank=True,
    )

    initial_facts = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.case_number} - {self.title}"


class Person(models.Model):
    ROLE_CHOICES = [
        ("complainant", "Complainant"),
        ("victim", "Victim"),
        ("accused", "Accused"),
        ("witness", "Witness"),
        ("officer", "Officer"),
        ("other", "Other"),
    ]

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="persons",
    )

    name = models.CharField(max_length=255)

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default="other",
    )

    phone = models.CharField(
        max_length=50,
        blank=True,
    )

    address = models.TextField(blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Evidence(models.Model):
    EVIDENCE_TYPES = [
        ("document", "Document"),
        ("image", "Image"),
        ("video", "Video"),
        ("audio", "Audio"),
        ("digital", "Digital Evidence"),
        ("physical", "Physical Evidence"),
        ("other", "Other"),
    ]

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="evidence",
    )

    evidence_type = models.CharField(
        max_length=30,
        choices=EVIDENCE_TYPES,
        default="document",
    )

    name = models.CharField(
        max_length=255,
        blank=True,
    )

    file = models.FileField(
        upload_to="evidence/%Y/%m/%d/",
        blank=True,
        null=True,
    )

    source_reference = models.CharField(
        max_length=500,
        blank=True,
    )

    description = models.TextField(blank=True)

    extracted_text = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name or f"Evidence #{self.pk}"


class TimelineEvent(models.Model):
    EVENT_TYPES = [
        ("major", "Major Event"),
        ("investigation", "Investigation"),
        ("evidence", "Evidence"),
        ("procedural", "Procedural"),
        ("court", "Court"),
        ("other", "Other"),
    ]

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="timeline_events",
    )

    title = models.CharField(max_length=255)

    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPES,
        default="investigation",
    )

    datetime = models.DateTimeField()

    description = models.TextField(blank=True)

    location = models.CharField(
        max_length=255,
        blank=True,
    )

    officer = models.CharField(
        max_length=255,
        blank=True,
    )

    source_reference = models.CharField(
        max_length=500,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["datetime"]

    def __str__(self):
        return self.title


class LegalResult(models.Model):
    BODY_CHOICES = [
        ("bns", "BNS"),
        ("bnss", "BNSS"),
        ("bsa", "BSA"),
        ("judgment", "Judgment"),
    ]

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="legal_results",
    )

    body = models.CharField(
        max_length=20,
        choices=BODY_CHOICES,
    )

    title = models.CharField(max_length=500)

    provision = models.CharField(
        max_length=255,
        blank=True,
    )

    explanation = models.TextField(blank=True)

    source_name = models.CharField(
        max_length=500,
        blank=True,
    )

    source_reference = models.CharField(
        max_length=500,
        blank=True,
    )

    confidence = models.CharField(
        max_length=20,
        blank=True,
    )

    verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class GeneratedDocument(models.Model):
    DOCUMENT_TYPES = [
        ("purvanichargesheet", "Purvani Chargesheet"),
        ("medicaltreatmentletter", "Medical Treatment Letter"),
        (
            "policecustodyremandrequest",
            "Police Custody Remand Request",
        ),
        ("seizurereceipt", "Seizure Receipt"),
        ("courtcustodyletter", "Court Custody Letter"),
        ("accusedpanchanama", "Accused Panchanama"),
        (
            "accusedfaceidentificationform",
            "Accused Face Identification Form",
        ),
    ]

    STATUS_CHOICES = [
        ("generated", "Generated"),
        ("under_review", "Under Review"),
        ("reviewed", "Reviewed"),
        ("revision_requested", "Revision Requested"),
    ]

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="generated_documents",
    )

    document_type = models.CharField(
        max_length=100,
        choices=DOCUMENT_TYPES,
    )

    title = models.CharField(max_length=500)

    version = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="generated",
    )

    file = models.FileField(
        upload_to="generated_documents/%Y/%m/%d/",
        blank=True,
        null=True,
    )

    generated_by = models.CharField(
        max_length=255,
        blank=True,
    )

    review_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title