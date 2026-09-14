import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q, Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render

from .models import (
    Case,
    Person,
    Evidence,
    TimelineEvent,
    LegalResult,
    GeneratedDocument,
)


# ==========================================================================
# PAGE VIEWS
# ==========================================================================


@login_required
def dashboard(request):
    cases = Case.objects.all()

    context = {
        "active_case_count": cases.filter(
            status__in=["open", "investigation"]
        ).count(),

        "evidence_count": Evidence.objects.count(),

        "entity_count": Person.objects.count(),

        "timeline_event_count": TimelineEvent.objects.count(),

        "recent_cases": cases[:5],

        "recent_evidence": Evidence.objects.select_related(
            "case"
        )[:5],

        "pending_actions": [],

    }

    return render(
        request,
        "chatbot/dashboard.html",
        context,
    )


@login_required
def case_list(request):
    cases = Case.objects.all()

    search = request.GET.get("search", "").strip()
    status = request.GET.get("status", "").strip()

    if search:
        cases = cases.filter(
            Q(case_number__icontains=search)
            | Q(title__icontains=search)
            | Q(summary__icontains=search)
        )

    if status:
        cases = cases.filter(status=status)

    paginator = Paginator(cases, 20)

    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    context = {
        "cases": page_obj.object_list,
        "case_count": paginator.count,
        "page_obj": page_obj,
        "is_paginated": page_obj.has_other_pages(),
        "status_choices": Case.STATUS_CHOICES,
    }

    return render(
        request,
        "chatbot/case_list.html",
        context,
    )


@login_required
def case_create(request):
    if request.method == "POST":
        case_number = request.POST.get(
            "case_number",
            "",
        ).strip()

        title = request.POST.get(
            "title",
            "",
        ).strip()

        status = request.POST.get(
            "status",
            "open",
        )

        summary = request.POST.get(
            "summary",
            "",
        ).strip()

        incident_datetime = request.POST.get(
            "incident_datetime",
            "",
        )

        location = request.POST.get(
            "location",
            "",
        ).strip()

        initial_facts = request.POST.get(
            "initial_facts",
            "",
        ).strip()

        if not case_number or not title:
            messages.error(
                request,
                "Case number and case title are required.",
            )

            return render(
                request,
                "chatbot/new_case.html",
            )

        if Case.objects.filter(
            case_number=case_number
        ).exists():
            messages.error(
                request,
                "A case with this case number already exists.",
            )

            return render(
                request,
                "chatbot/new_case.html",
            )

        case_data = {
            "case_number": case_number,
            "title": title,
            "status": status,
            "summary": summary,
            "location": location,
            "initial_facts": initial_facts,
        }

        if incident_datetime:
            case_data["incident_datetime"] = incident_datetime

        case = Case.objects.create(**case_data)

        messages.success(
            request,
            "Case created successfully.",
        )

        return redirect(
            "case_detail",
            case_id=case.id,
        )

    return render(
        request,
        "chatbot/new_case.html",
    )


@login_required
def case_detail(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    evidence = case.evidence.all()
    persons = case.persons.all()
    timeline_events = case.timeline_events.all()

    context = {
        "case": case,

        "key_persons": persons[:10],

        "evidence": evidence[:10],

        "evidence_count": evidence.count(),

        "document_count": evidence.filter(
            evidence_type="document"
        ).count(),

        "media_count": evidence.filter(
            evidence_type__in=["image", "video", "audio"]
        ).count(),

        "recent_events": timeline_events[:5],

        "timeline_events": timeline_events[:10],

        "graph_preview": {
            "nodes": [],
            "edges": [],
        },

        "legal_intelligence": [],

        "evidence_gaps": [],

        "pending_actions": [],
    }

    return render(
        request,
        "chatbot/case_detail.html",
        context,
    )


@login_required
def case_edit(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    if request.method == "POST":
        case.case_number = request.POST.get(
            "case_number",
            case.case_number,
        )

        case.title = request.POST.get(
            "title",
            case.title,
        )

        case.status = request.POST.get(
            "status",
            case.status,
        )

        case.summary = request.POST.get(
            "summary",
            case.summary,
        )

        case.location = request.POST.get(
            "location",
            case.location,
        )

        case.initial_facts = request.POST.get(
            "initial_facts",
            case.initial_facts,
        )

        case.save()

        messages.success(
            request,
            "Case updated successfully.",
        )

        return redirect(
            "case_detail",
            case_id=case.id,
        )

    return render(
        request,
        "chatbot/new_case.html",
        {
            "case": case,
        },
    )


@login_required
def evidence(request, case_id=None):
    case = None

    if case_id:
        case = get_object_or_404(
            Case,
            id=case_id,
        )

    return render(
        request,
        "chatbot/evidence_upload.html",
        {
            "case": case,
            "evidence_types": Evidence.EVIDENCE_TYPES,
        },
    )


@login_required
def timeline(request, case_id=None):
    case = None
    timeline_events = TimelineEvent.objects.none()

    if case_id:
        case = get_object_or_404(
            Case,
            id=case_id,
        )

        timeline_events = case.timeline_events.all()

    return render(
        request,
        "chatbot/timeline.html",
        {
            "case": case,
            "timeline_events": timeline_events,
        },
    )


@login_required
def graph(request, case_id=None):
    case = None

    if case_id:
        case = get_object_or_404(
            Case,
            id=case_id,
        )

    return render(
        request,
        "chatbot/graph.html",
        {
            "case": case,
        },
    )


@login_required
def legal_intelligence(request, case_id=None):
    case = None

    if not case_id:
        case_id = request.GET.get("case")

    if case_id:
        case = get_object_or_404(
            Case,
            id=case_id,
        )

    legal_results = []

    if case:
        legal_results = case.legal_results.all()

    context = {
        "case": case,
        "bns_results": (
            legal_results.filter(body="bns")
            if case else []
        ),
        "bnss_results": (
            legal_results.filter(body="bnss")
            if case else []
        ),
        "bsa_results": (
            legal_results.filter(body="bsa")
            if case else []
        ),
        "judgments": (
            legal_results.filter(body="judgment")
            if case else []
        ),
    }

    return render(
        request,
        "chatbot/legal.html",
        context,
    )


@login_required
def reports(request, case_id=None):
    case = None
    documents = GeneratedDocument.objects.none()

    if case_id:
        case = get_object_or_404(
            Case,
            id=case_id,
        )

        documents = case.generated_documents.all()

    return render(
        request,
        "chatbot/reports.html",
        {
            "case": case,
            "generated_documents": documents,
        },
    )


# ==========================================================================
# API — CASES
# ==========================================================================


@login_required
def api_cases(request):
    if request.method != "GET":
        return JsonResponse(
            {
                "error": "Method not allowed."
            },
            status=405,
        )

    cases = Case.objects.all()

    search = request.GET.get(
        "search",
        "",
    ).strip()

    status = request.GET.get(
        "status",
        "",
    ).strip()

    if search:
        cases = cases.filter(
            Q(case_number__icontains=search)
            | Q(title__icontains=search)
        )

    if status:
        cases = cases.filter(
            status=status
        )

    data = []

    for case in cases:
        data.append(
            {
                "id": case.id,
                "case_number": case.case_number,
                "title": case.title,
                "status": case.status,
                "priority": case.priority,
                "summary": case.summary,
                "created_at": case.created_at.isoformat(),
                "updated_at": case.updated_at.isoformat(),
                "url": f"/cases/{case.id}/",
            }
        )

    return JsonResponse(
        {
            "results": data,
            "count": len(data),
        }
    )


# ==========================================================================
# API — CASE DETAIL
# ==========================================================================


@login_required
def api_case_detail(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    persons = case.persons.all()
    evidence = case.evidence.all()
    events = case.timeline_events.all()

    data = {
        "case": {
            "id": case.id,
            "case_number": case.case_number,
            "title": case.title,
            "status": case.status,
            "priority": case.priority,
            "summary": case.summary,
            "location": case.location,
            "initial_facts": case.initial_facts,
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
        },

        "stats": {
            "evidence_count": evidence.count(),
            "person_count": persons.count(),
            "event_count": events.count(),
        },

        "persons": [
            {
                "id": person.id,
                "name": person.name,
                "role": person.role,
                "phone": person.phone,
                "address": person.address,
                "notes": person.notes,
            }
            for person in persons
        ],

        "evidence": [
            {
                "id": item.id,
                "name": item.name,
                "evidence_type": item.evidence_type,
                "description": item.description,
                "source_reference": item.source_reference,
                "created_at": item.created_at.isoformat(),
            }
            for item in evidence
        ],

        "timeline_events": [
            {
                "id": event.id,
                "title": event.title,
                "event_type": event.event_type,
                "datetime": event.datetime.isoformat(),
                "description": event.description,
                "location": event.location,
                "officer": event.officer,
                "source_reference": event.source_reference,
            }
            for event in events
        ],

        "graph_preview": {
            "nodes": [],
            "edges": [],
        },

        "legal_intelligence": [],

        "evidence_gaps": [],

        "pending_actions": [],
    }

    return JsonResponse(data)


# ==========================================================================
# API — EVIDENCE UPLOAD
# ==========================================================================


@login_required
def api_evidence_upload(request, case_id):
    if request.method != "POST":
        return JsonResponse(
            {
                "error": "Method not allowed."
            },
            status=405,
        )

    case = get_object_or_404(
        Case,
        id=case_id,
    )

    uploaded_file = request.FILES.get(
        "file"
    )

    evidence_type = request.POST.get(
        "evidence_type",
        "document",
    )

    source_reference = request.POST.get(
        "source_reference",
        "",
    )

    description = request.POST.get(
        "description",
        "",
    )

    if not uploaded_file:
        return JsonResponse(
            {
                "error": "Please select a file."
            },
            status=400,
        )

    evidence = Evidence.objects.create(
        case=case,
        evidence_type=evidence_type,
        name=uploaded_file.name,
        file=uploaded_file,
        source_reference=source_reference,
        description=description,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Evidence uploaded successfully.",
            "evidence": {
                "id": evidence.id,
                "name": evidence.name,
                "evidence_type": evidence.evidence_type,
            },
        },
        status=201,
    )


# ==========================================================================
# API — TIMELINE
# ==========================================================================


@login_required
def api_timeline(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    events = case.timeline_events.all()

    event_type = request.GET.get(
        "event_type",
        "",
    )

    if event_type:
        events = events.filter(
            event_type=event_type
        )

    data = [
        {
            "id": event.id,
            "title": event.title,
            "event_type": event.event_type,
            "datetime": event.datetime.isoformat(),
            "description": event.description,
            "location": event.location,
            "officer": event.officer,
            "source_reference": event.source_reference,
        }
        for event in events
    ]

    return JsonResponse(
        {
            "results": data,
            "count": len(data),
        }
    )


# ==========================================================================
# API — GRAPH
# ==========================================================================


@login_required
def api_graph(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    nodes = []
    edges = []

    for person in case.persons.all():
        nodes.append(
            {
                "id": f"person-{person.id}",
                "type": "person",
                "label": person.name,
                "properties": {
                    "role": person.role,
                    "phone": person.phone,
                },
            }
        )

    for evidence in case.evidence.all():
        nodes.append(
            {
                "id": f"evidence-{evidence.id}",
                "type": "evidence",
                "label": evidence.name,
                "properties": {
                    "evidence_type": evidence.evidence_type,
                    "source_reference": evidence.source_reference,
                },
            }
        )

    return JsonResponse(
        {
            "graph": {
                "nodes": nodes,
                "edges": edges,
            }
        }
    )


# ==========================================================================
# API — LEGAL INTELLIGENCE
# ==========================================================================


@login_required
def api_legal_intelligence(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    if request.method != "POST":
        return JsonResponse(
            {
                "error": "Method not allowed."
            },
            status=405,
        )

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    narrative = payload.get(
        "narrative",
        "",
    )

    query = payload.get(
        "query",
        "",
    )

    # AI/legal analysis should be connected here.
    # The frontend expects structured results.

    results = [
        {
            "body": "bns",
            "title": "No legal analysis generated yet",
            "provision": "",
            "explanation": (
                "Connect the legal intelligence service "
                "to generate BNS analysis."
            ),
            "source_name": "",
            "source_reference": "",
            "confidence": "low",
            "verified": False,
        }
    ]

    return JsonResponse(
        {
            "results": results,
            "narrative": narrative,
            "query": query,
        }
    )


# ==========================================================================
# API — REPORTS / DOCUMENTS
# ==========================================================================


@login_required
def api_reports(request, case_id):
    case = get_object_or_404(
        Case,
        id=case_id,
    )

    documents = case.generated_documents.all()

    data = []

    for document in documents:
        data.append(
            {
                "id": document.id,
                "document_type": document.document_type,
                "title": document.title,
                "version": document.version,
                "status": document.status,
                "generated_by": document.generated_by,
                "created_at": document.created_at.isoformat(),
                "updated_at": document.updated_at.isoformat(),
                "download_url": (
                    document.file.url
                    if document.file
                    else None
                ),
            }
        )

    return JsonResponse(
        {
            "results": data,
            "count": len(data),
        }
    )


@login_required
def api_generate_document(request, case_id):
    if request.method != "POST":
        return JsonResponse(
            {
                "error": "Method not allowed."
            },
            status=405,
        )

    case = get_object_or_404(
        Case,
        id=case_id,
    )

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    document_type = payload.get(
        "document_type"
    )

    if not document_type:
        return JsonResponse(
            {
                "error": "document_type is required."
            },
            status=400,
        )

    title = dict(
        GeneratedDocument.DOCUMENT_TYPES
    ).get(
        document_type,
        document_type,
    )

    document = GeneratedDocument.objects.create(
        case=case,
        document_type=document_type,
        title=title,
        generated_by=(
            request.user.get_username()
            if request.user.is_authenticated
            else ""
        ),
        status="generated",
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Document generation request created.",
            "document": {
                "id": document.id,
                "document_type": document.document_type,
                "title": document.title,
                "status": document.status,
            },
        },
        status=201,
    )


# ==========================================================================
# API — DOCUMENT REVIEW
# ==========================================================================


@login_required
def api_document_review(request, case_id):
    if request.method != "POST":
        return JsonResponse(
            {
                "error": "Method not allowed."
            },
            status=405,
        )

    case = get_object_or_404(
        Case,
        id=case_id,
    )

    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    document_id = payload.get(
        "document_id"
    )

    action = payload.get(
        "action"
    )

    review_notes = payload.get(
        "review_notes",
        "",
    )

    document = get_object_or_404(
        GeneratedDocument,
        id=document_id,
        case=case,
    )

    document.review_notes = review_notes

    if action == "review":
        document.status = "reviewed"

    elif action == "revision":
        document.status = "revision_requested"

    else:
        return JsonResponse(
            {
                "error": "Invalid review action."
            },
            status=400,
        )

    document.save()

    return JsonResponse(
        {
            "success": True,
            "message": "Document review updated.",
            "document": {
                "id": document.id,
                "status": document.status,
                "review_notes": document.review_notes,
            },
        }
    )