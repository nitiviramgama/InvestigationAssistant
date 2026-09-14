from django.urls import path
from . import views


urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("dashboard/", views.dashboard, name="dashboard_page"),

    path("cases/", views.case_list, name="case_list"),
    path("cases/new/", views.case_create, name="case_create"),
    path(
        "cases/<int:case_id>/",
        views.case_detail,
        name="case_detail",
    ),
    path(
        "cases/<int:case_id>/edit/",
        views.case_edit,
        name="case_edit",
    ),

    path("evidence/", views.evidence, name="evidence"),
    path(
        "cases/<int:case_id>/evidence/",
        views.evidence,
        name="case_evidence",
    ),

    path("timeline/", views.timeline, name="timeline"),
    path(
        "cases/<int:case_id>/timeline/",
        views.timeline,
        name="case_timeline",
    ),

    path("graph/", views.graph, name="graph"),
    path(
        "cases/<int:case_id>/graph/",
        views.graph,
        name="case_graph",
    ),

    path(
        "legal/",
        views.legal_intelligence,
        name="legal_intelligence",
    ),
    path(
        "cases/<int:case_id>/legal/",
        views.legal_intelligence,
        name="case_legal_intelligence",
    ),

    path("reports/", views.reports, name="reports"),
    path(
        "cases/<int:case_id>/reports/",
        views.reports,
        name="case_reports",
    ),

    # API endpoints
    path(
        "api/cases/",
        views.api_cases,
        name="api_cases",
    ),
    path(
        "api/cases/<int:case_id>/",
        views.api_case_detail,
        name="api_case_detail",
    ),
    path(
        "api/cases/<int:case_id>/evidence/upload/",
        views.api_evidence_upload,
        name="api_evidence_upload",
    ),
    path(
        "api/cases/<int:case_id>/timeline/",
        views.api_timeline,
        name="api_timeline",
    ),
    path(
        "api/cases/<int:case_id>/graph/",
        views.api_graph,
        name="api_graph",
    ),
    path(
        "api/cases/<int:case_id>/legal/",
        views.api_legal_intelligence,
        name="api_legal_intelligence",
    ),
    path(
        "api/cases/<int:case_id>/reports/",
        views.api_reports,
        name="api_reports",
    ),
    path(
        "api/cases/<int:case_id>/reports/generate/",
        views.api_generate_document,
        name="api_generate_document",
    ),
    path(
        "api/cases/<int:case_id>/reports/review/",
        views.api_document_review,
        name="api_document_review",
    ),
]