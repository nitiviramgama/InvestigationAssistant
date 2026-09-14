(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Case Detail JavaScript
     *
     * File:
     * static/js/case.js
     *
     * Responsibilities:
     * - Load case details from Django JSON API
     * - Refresh case information
     * - Render case statistics and sections
     * - Handle Add Person / Add Event actions
     * - Handle loading, success, empty and error states
     * - Keep navigation and API handling modular
     *
     * Shared API helper:
     * static/js/api.js
     */

    const CaseDetail = {
        elements: {},

        state: {
            caseId: null,
            data: null,
            loading: false,
            error: null
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.state.caseId =
                this.elements.page.dataset.caseId ||
                null;

            this.bindEvents();

            /*
             * The template may already contain server-rendered case data.
             * Only call the API automatically when an endpoint is available.
             */
            if (this.getEndpoint()) {
                this.loadCase();
            }
        },

        cacheElements() {
            this.elements.page =
                document.querySelector(".case-detail-page") ||
                document.querySelector("[data-case-detail-page]");

            this.elements.loading =
                document.querySelector(".case-detail-loading");

            this.elements.error =
                document.querySelector(".case-detail-error");

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                        "[data-error-message]"
                    )
                    : null;

            this.elements.message =
                document.querySelector("[data-case-message]");

            this.elements.refresh =
                document.querySelector(
                    "[data-case-refresh]"
                ) ||
                document.querySelector(
                    "[data-action='refresh-case']"
                );

            this.elements.addPerson =
                document.querySelector(
                    "[data-action='add-person']"
                );

            this.elements.addEvent =
                document.querySelector(
                    "[data-action='add-event']"
                );

            this.elements.caseTitle =
                document.querySelector(
                    ".case-detail-title"
                );

            this.elements.caseNumber =
                document.querySelector(
                    ".case-detail-number"
                );

            this.elements.caseStatus =
                document.querySelector(
                    ".case-detail-status"
                );

            this.elements.caseSummary =
                document.querySelector(
                    "[data-case-summary]"
                ) ||
                document.querySelector(
                    ".case-summary-content"
                );

            this.elements.metadata =
                document.querySelector(
                    "[data-case-metadata]"
                );

            this.elements.personList =
                document.querySelector(
                    "[data-key-persons]"
                ) ||
                document.querySelector(
                    ".person-list"
                );

            this.elements.evidenceList =
                document.querySelector(
                    "[data-case-evidence]"
                ) ||
                document.querySelector(
                    ".case-evidence-list"
                );

            this.elements.eventList =
                document.querySelector(
                    "[data-case-events]"
                ) ||
                document.querySelector(
                    ".case-event-list"
                );

            this.elements.timelinePreview =
                document.querySelector(
                    "[data-timeline-preview]"
                ) ||
                document.querySelector(
                    ".timeline-preview-list"
                );

            this.elements.graphPreview =
                document.querySelector(
                    "#caseGraphPreview"
                );

            this.elements.legalSummary =
                document.querySelector(
                    "[data-legal-summary]"
                ) ||
                document.querySelector(
                    ".legal-summary-list"
                );

            this.elements.evidenceGaps =
                document.querySelector(
                    "[data-evidence-gaps]"
                ) ||
                document.querySelector(
                    ".evidence-gap-list"
                );

            this.elements.pendingActions =
                document.querySelector(
                    "[data-pending-actions]"
                ) ||
                document.querySelector(
                    ".pending-case-action-list"
                );

            this.elements.statCards =
                document.querySelectorAll(
                    "[data-case-stat]"
                );
        },

        bindEvents() {
            if (this.elements.refresh) {
                this.elements.refresh.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.loadCase();
                    }
                );
            }

            if (this.elements.addPerson) {
                this.elements.addPerson.addEventListener(
                    "click",
                    (event) => {
                        this.handleAddPerson(event);
                    }
                );
            }

            if (this.elements.addEvent) {
                this.elements.addEvent.addEventListener(
                    "click",
                    (event) => {
                        this.handleAddEvent(event);
                    }
                );
            }
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.caseEndpoint ||
                this.elements.page.dataset.apiEndpoint ||
                ""
            );
        },

        async loadCase() {
            const endpoint = this.getEndpoint();

            if (!endpoint) {
                return;
            }

            this.state.loading = true;
            this.state.error = null;

            this.showLoading();
            this.clearError();

            try {
                const api =
                    window.IOApi ||
                    window.api;

                let response;

                if (
                    api &&
                    typeof api.get === "function"
                ) {
                    response =
                        await api.get(endpoint);
                } else {
                    response =
                        await this.fetchJson(endpoint);
                }

                const data =
                    this.unwrapResponse(response);

                this.state.data =
                    this.normalizeCaseData(data);

                this.state.loading =
                    false;

                this.renderCase(
                    this.state.data
                );

                this.showLoadedState();

            } catch (error) {
                this.state.loading =
                    false;

                this.state.error =
                    error;

                this.showError(
                    error && error.message
                        ? error.message
                        : "Unable to load case details. Please try again."
                );

                console.error(
                    "IO Assistant case detail error:",
                    error
                );
            }
        },

        normalizeCaseData(data) {
            if (!data) {
                return {};
            }

            if (
                data.case &&
                typeof data.case === "object"
            ) {
                return {
                    ...data.case,
                    ...data
                };
            }

            return data;
        },

        renderCase(caseData) {
            this.renderIdentity(caseData);
            this.renderStatistics(caseData);
            this.renderSummary(caseData);
            this.renderMetadata(caseData);
            this.renderPersons(caseData);
            this.renderEvidence(caseData);
            this.renderEvents(caseData);
            this.renderTimelinePreview(caseData);
            this.renderLegalSummary(caseData);
            this.renderEvidenceGaps(caseData);
            this.renderPendingActions(caseData);
            this.renderGraphPreview(caseData);
        },

        renderIdentity(caseData) {
            const title =
                this.getValue(
                    caseData,
                    ["title", "name"],
                    "Untitled Case"
                );

            const number =
                this.getValue(
                    caseData,
                    [
                        "case_number",
                        "caseNumber",
                        "number"
                    ],
                    "—"
                );

            const status =
                this.getValue(
                    caseData,
                    [
                        "status",
                        "case_status"
                    ],
                    "Unknown"
                );

            this.setText(
                this.elements.caseTitle,
                title,
                "Untitled Case"
            );

            this.setText(
                this.elements.caseNumber,
                number,
                "—"
            );

            if (this.elements.caseStatus) {
                this.elements.caseStatus.textContent =
                    status;

                this.elements.caseStatus.className =
                    "case-detail-status " +
                    "case-detail-status--" +
                    this.slugify(status);
            }
        },

        renderStatistics(caseData) {
            const evidenceCount =
                this.getValue(
                    caseData,
                    [
                        "evidence_count",
                        "total_evidence"
                    ],
                    this.getCollection(
                        caseData,
                        ["evidence"]
                    ).length
                );

            const documents =
                this.getValue(
                    caseData,
                    [
                        "document_count",
                        "documents_count"
                    ],
                    this.getCollection(
                        caseData,
                        ["documents"]
                    ).length
                );

            const media =
                this.getValue(
                    caseData,
                    [
                        "media_count",
                        "media_files_count"
                    ],
                    this.getCollection(
                        caseData,
                        ["media"]
                    ).length
                );

            const events =
                this.getValue(
                    caseData,
                    [
                        "timeline_event_count",
                        "event_count"
                    ],
                    this.getCollection(
                        caseData,
                        [
                            "timeline_events",
                            "events"
                        ]
                    ).length
                );

            const persons =
                this.getValue(
                    caseData,
                    [
                        "person_count",
                        "people_count",
                        "entity_count"
                    ],
                    this.getCollection(
                        caseData,
                        [
                            "key_persons",
                            "persons",
                            "people"
                        ]
                    ).length
                );

            const stats = {
                evidence: evidenceCount,
                documents: documents,
                media: media,
                events: events,
                persons: persons
            };

            this.elements.statCards.forEach(
                (card) => {
                    const key =
                        card.dataset.caseStat;

                    if (!key) {
                        return;
                    }

                    const value =
                        stats[key];

                    if (value === undefined) {
                        return;
                    }

                    const valueElement =
                        card.querySelector(
                            "[data-stat-value]"
                        ) ||
                        card.querySelector(
                            ".case-detail-stat-value"
                        );

                    if (valueElement) {
                        valueElement.textContent =
                            this.formatNumber(
                                value
                            );
                    }
                }
            );

            this.setTextBySelector(
                "#evidenceCount",
                evidenceCount
            );

            this.setTextBySelector(
                "#documentCount",
                documents
            );

            this.setTextBySelector(
                "#mediaCount",
                media
            );

            this.setTextBySelector(
                "#timelineEventCount",
                events
            );

            this.setTextBySelector(
                "#personCount",
                persons
            );
        },

        renderSummary(caseData) {
            if (!this.elements.caseSummary) {
                return;
            }

            const summary =
                this.getValue(
                    caseData,
                    [
                        "summary",
                        "description",
                        "narrative"
                    ],
                    ""
                );

            if (!summary) {
                this.renderEmpty(
                    this.elements.caseSummary,
                    "No case summary available."
                );
                return;
            }

            this.elements.caseSummary.textContent =
                summary;
        },

        renderMetadata(caseData) {
            if (!this.elements.metadata) {
                return;
            }

            const metadata = [
                {
                    label: "Case Number",
                    value: this.getValue(
                        caseData,
                        [
                            "case_number",
                            "caseNumber",
                            "number"
                        ],
                        "—"
                    )
                },
                {
                    label: "Status",
                    value: this.getValue(
                        caseData,
                        [
                            "status",
                            "case_status"
                        ],
                        "—"
                    )
                },
                {
                    label: "Priority",
                    value: this.getValue(
                        caseData,
                        ["priority"],
                        "—"
                    )
                },
                {
                    label: "Incident Date",
                    value: this.getValue(
                        caseData,
                        [
                            "incident_datetime",
                            "incident_date",
                            "incidentDate"
                        ],
                        ""
                    )
                },
                {
                    label: "Location",
                    value: this.getValue(
                        caseData,
                        [
                            "location",
                            "incident_location"
                        ],
                        "—"
                    )
                },
                {
                    label: "Created",
                    value: this.getValue(
                        caseData,
                        [
                            "created_at",
                            "created"
                        ],
                        ""
                    )
                },
                {
                    label: "Last Updated",
                    value: this.getValue(
                        caseData,
                        [
                            "updated_at",
                            "modified_at"
                        ],
                        ""
                    )
                }
            ];

            this.elements.metadata.innerHTML =
                metadata
                    .map((item) => {
                        let value =
                            item.value;

                        if (
                            item.label.includes(
                                "Date"
                            ) ||
                            item.label ===
                                "Created" ||
                            item.label ===
                                "Last Updated"
                        ) {
                            value =
                                value
                                    ? this.formatDateTime(
                                        value
                                    )
                                    : "—";
                        }

                        return `
                            <div class="case-metadata-item">
                                <dt class="case-metadata-label">
                                    ${this.escapeHtml(
                                        item.label
                                    )}
                                </dt>

                                <dd class="case-metadata-value">
                                    ${this.escapeHtml(
                                        value || "—"
                                    )}
                                </dd>
                            </div>
                        `;
                    })
                    .join("");
        },

        renderPersons(caseData) {
            if (!this.elements.personList) {
                return;
            }

            const persons =
                this.getCollection(
                    caseData,
                    [
                        "key_persons",
                        "persons",
                        "people"
                    ]
                );

            if (!persons.length) {
                this.renderEmpty(
                    this.elements.personList,
                    "No key persons have been identified."
                );
                return;
            }

            this.elements.personList.innerHTML =
                persons
                    .map((person) => {
                        const name =
                            this.escapeHtml(
                                this.getValue(
                                    person,
                                    [
                                        "name",
                                        "full_name"
                                    ],
                                    "Unknown Person"
                                )
                            );

                        const role =
                            this.escapeHtml(
                                this.getValue(
                                    person,
                                    [
                                        "role",
                                        "type",
                                        "relationship"
                                    ],
                                    "Person"
                                )
                            );

                        const id =
                            this.escapeHtml(
                                this.getValue(
                                    person,
                                    [
                                        "id",
                                        "person_id"
                                    ],
                                    ""
                                )
                            );

                        const initials =
                            this.getInitials(
                                name
                            );

                        return `
                            <article class="person-card"
                                     data-person-id="${this.escapeAttribute(id)}">

                                <div class="person-avatar"
                                     aria-hidden="true">
                                    ${this.escapeHtml(
                                        initials
                                    )}
                                </div>

                                <div class="person-information">
                                    <h3 class="person-name">
                                        ${name}
                                    </h3>

                                    <p class="person-role">
                                        ${role}
                                    </p>
                                </div>
                            </article>
                        `;
                    })
                    .join("");
        },

        renderEvidence(caseData) {
            if (!this.elements.evidenceList) {
                return;
            }

            const evidence =
                this.getCollection(
                    caseData,
                    [
                        "evidence",
                        "recent_evidence"
                    ]
                );

            if (!evidence.length) {
                this.renderEmpty(
                    this.elements.evidenceList,
                    "No evidence has been added to this case."
                );
                return;
            }

            this.elements.evidenceList.innerHTML =
                evidence
                    .map((item) => {
                        const name =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "name",
                                        "title",
                                        "file_name",
                                        "filename"
                                    ],
                                    "Evidence"
                                )
                            );

                        const type =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "evidence_type",
                                        "type",
                                        "document_type"
                                    ],
                                    "Evidence"
                                )
                            );

                        const description =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "description",
                                        "notes",
                                        "summary"
                                    ],
                                    ""
                                )
                            );

                        const status =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "status",
                                        "processing_status"
                                    ],
                                    ""
                                )
                            );

                        const createdAt =
                            this.getValue(
                                item,
                                [
                                    "created_at",
                                    "uploaded_at",
                                    "date"
                                ],
                                ""
                            );

                        const url =
                            this.getValue(
                                item,
                                [
                                    "url",
                                    "detail_url",
                                    "evidence_url"
                                ],
                                ""
                            );

                        const content = `
                            <span class="case-evidence-icon"
                                  aria-hidden="true">
                                ${this.getEvidenceIcon(
                                    type
                                )}
                            </span>

                            <span class="case-evidence-content">
                                <span class="case-evidence-name">
                                    ${name}
                                </span>

                                ${
                                    description
                                        ? `
                                            <span class="case-evidence-description">
                                                ${description}
                                            </span>
                                        `
                                        : ""
                                }

                                <span class="case-evidence-meta">
                                    ${type}
                                    ${
                                        createdAt
                                            ? ` · ${this.escapeHtml(
                                                this.formatDate(
                                                    createdAt
                                                )
                                            )}`
                                            : ""
                                    }
                                </span>
                            </span>

                            ${
                                status
                                    ? `
                                        <span class="case-evidence-status
                                                     badge
                                                     badge--${this.slugify(status)}">
                                            ${status}
                                        </span>
                                    `
                                    : ""
                            }
                        `;

                        if (url) {
                            return `
                                <a class="case-evidence-item"
                                   href="${this.escapeAttribute(url)}">
                                    ${content}
                                </a>
                            `;
                        }

                        return `
                            <div class="case-evidence-item">
                                ${content}
                            </div>
                        `;
                    })
                    .join("");
        },

        renderEvents(caseData) {
            if (!this.elements.eventList) {
                return;
            }

            const events =
                this.getCollection(
                    caseData,
                    [
                        "recent_events",
                        "events"
                    ]
                );

            if (!events.length) {
                this.renderEmpty(
                    this.elements.eventList,
                    "No recent investigation events."
                );
                return;
            }

            this.elements.eventList.innerHTML =
                events
                    .map((event) =>
                        this.renderEvent(
                            event
                        )
                    )
                    .join("");
        },

        renderTimelinePreview(caseData) {
            if (
                !this.elements.timelinePreview
            ) {
                return;
            }

            const events =
                this.getCollection(
                    caseData,
                    [
                        "timeline_events",
                        "recent_events",
                        "events"
                    ]
                );

            if (!events.length) {
                this.renderEmpty(
                    this.elements.timelinePreview,
                    "No timeline events available."
                );
                return;
            }

            this.elements.timelinePreview.innerHTML =
                events
                    .slice(0, 8)
                    .map((event) => {
                        const date =
                            this.getValue(
                                event,
                                [
                                    "datetime",
                                    "date",
                                    "created_at"
                                ],
                                ""
                            );

                        const title =
                            this.escapeHtml(
                                this.getValue(
                                    event,
                                    [
                                        "title",
                                        "name"
                                    ],
                                    "Investigation Event"
                                )
                            );

                        const description =
                            this.escapeHtml(
                                this.getValue(
                                    event,
                                    [
                                        "description",
                                        "summary"
                                    ],
                                    ""
                                )
                            );

                        const type =
                            this.escapeHtml(
                                this.getValue(
                                    event,
                                    [
                                        "event_type",
                                        "type"
                                    ],
                                    ""
                                )
                            );

                        return `
                            <article class="timeline-preview-item">
                                <time class="timeline-preview-time">
                                    ${
                                        date
                                            ? this.escapeHtml(
                                                this.formatDateTime(
                                                    date
                                                )
                                            )
                                            : "Date unavailable"
                                    }
                                </time>

                                <div class="timeline-preview-content">
                                    <h3 class="timeline-preview-title">
                                        ${title}
                                    </h3>

                                    ${
                                        description
                                            ? `
                                                <p class="timeline-preview-description">
                                                    ${description}
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        type
                                            ? `
                                                <span class="case-event-type">
                                                    ${type}
                                                </span>
                                            `
                                            : ""
                                    }
                                </div>
                            </article>
                        `;
                    })
                    .join("");
        },

        renderEvent(event) {
            const date =
                this.getValue(
                    event,
                    [
                        "datetime",
                        "date",
                        "created_at"
                    ],
                    ""
                );

            const title =
                this.escapeHtml(
                    this.getValue(
                        event,
                        [
                            "title",
                            "name"
                        ],
                        "Investigation Event"
                    )
                );

            const description =
                this.escapeHtml(
                    this.getValue(
                        event,
                        [
                            "description",
                            "summary"
                        ],
                        ""
                    )
                );

            const type =
                this.escapeHtml(
                    this.getValue(
                        event,
                        [
                            "event_type",
                            "type"
                        ],
                        "Event"
                    )
                );

            const status =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["status"],
                        ""
                    )
                );

            return `
                <article class="case-event-item">
                    <div class="case-event-time">
                        ${
                            date
                                ? this.escapeHtml(
                                    this.formatDateTime(
                                        date
                                    )
                                )
                                : "Date unavailable"
                        }
                    </div>

                    <div class="case-event-content">
                        <div class="case-event-header">
                            <h3 class="case-event-title">
                                ${title}
                            </h3>

                            <span class="case-event-type">
                                ${type}
                            </span>
                        </div>

                        ${
                            description
                                ? `
                                    <p class="case-event-description">
                                        ${description}
                                    </p>
                                `
                                : ""
                        }

                        ${
                            status
                                ? `
                                    <span class="case-status
                                                 case-status--${this.slugify(status)}">
                                        ${status}
                                    </span>
                                `
                                : ""
                        }
                    </div>
                </article>
            `;
        },

        renderLegalSummary(caseData) {
            if (!this.elements.legalSummary) {
                return;
            }

            const legal =
                this.getCollection(
                    caseData,
                    [
                        "legal_intelligence",
                        "legal_summary",
                        "legal_results"
                    ]
                );

            if (!legal.length) {
                this.renderEmpty(
                    this.elements.legalSummary,
                    "No legal intelligence has been generated yet."
                );
                return;
            }

            this.elements.legalSummary.innerHTML =
                legal
                    .slice(0, 6)
                    .map((item) => {
                        const title =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "title",
                                        "provision",
                                        "section"
                                    ],
                                    "Legal Finding"
                                )
                            );

                        const description =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "explanation",
                                        "summary",
                                        "description"
                                    ],
                                    ""
                                )
                            );

                        const confidence =
                            this.escapeHtml(
                                this.getValue(
                                    item,
                                    [
                                        "confidence",
                                        "confidence_level"
                                    ],
                                    ""
                                )
                            );

                        return `
                            <article class="legal-summary-item">
                                <div>
                                    <h3 class="legal-summary-title">
                                        ${title}
                                    </h3>

                                    ${
                                        description
                                            ? `
                                                <p class="legal-summary-description">
                                                    ${description}
                                                </p>
                                            `
                                            : ""
                                    }
                                </div>

                                ${
                                    confidence
                                        ? `
                                            <span class="legal-confidence
                                                         legal-confidence--${this.slugify(confidence)}">
                                                ${confidence}
                                            </span>
                                        `
                                        : ""
                                }
                            </article>
                        `;
                    })
                    .join("");
        },

        renderEvidenceGaps(caseData) {
            if (!this.elements.evidenceGaps) {
                return;
            }

            const gaps =
                this.getCollection(
                    caseData,
                    [
                        "evidence_gaps",
                        "gaps",
                        "missing_evidence"
                    ]
                );

            if (!gaps.length) {
                this.renderEmpty(
                    this.elements.evidenceGaps,
                    "No evidence gaps have been identified."
                );
                return;
            }

            this.elements.evidenceGaps.innerHTML =
                gaps
                    .map((gap) => {
                        const title =
                            this.escapeHtml(
                                this.getValue(
                                    gap,
                                    [
                                        "title",
                                        "name"
                                    ],
                                    "Evidence Gap"
                                )
                            );

                        const description =
                            this.escapeHtml(
                                this.getValue(
                                    gap,
                                    [
                                        "description",
                                        "details",
                                        "summary"
                                    ],
                                    ""
                                )
                            );

                        const priority =
                            this.escapeHtml(
                                this.getValue(
                                    gap,
                                    [
                                        "priority",
                                        "severity"
                                    ],
                                    ""
                                )
                            );

                        return `
                            <article class="evidence-gap-item">
                                <span class="evidence-gap-indicator"
                                      aria-hidden="true"></span>

                                <div class="evidence-gap-content">
                                    <h3 class="evidence-gap-title">
                                        ${title}
                                    </h3>

                                    ${
                                        description
                                            ? `
                                                <p class="evidence-gap-description">
                                                    ${description}
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        priority
                                            ? `
                                                <span class="case-priority
                                                             case-priority--${this.slugify(priority)}">
                                                    ${priority}
                                                </span>
                                            `
                                            : ""
                                    }
                                </div>
                            </article>
                        `;
                    })
                    .join("");
        },

        renderPendingActions(caseData) {
            if (!this.elements.pendingActions) {
                return;
            }

            const actions =
                this.getCollection(
                    caseData,
                    [
                        "pending_actions",
                        "actions"
                    ]
                );

            if (!actions.length) {
                this.renderEmpty(
                    this.elements.pendingActions,
                    "No pending case actions."
                );
                return;
            }

            this.elements.pendingActions.innerHTML =
                actions
                    .map((action) => {
                        const title =
                            this.escapeHtml(
                                this.getValue(
                                    action,
                                    [
                                        "title",
                                        "name",
                                        "action"
                                    ],
                                    "Pending Action"
                                )
                            );

                        const description =
                            this.escapeHtml(
                                this.getValue(
                                    action,
                                    [
                                        "description",
                                        "details",
                                        "summary"
                                    ],
                                    ""
                                )
                            );

                        const dueDate =
                            this.getValue(
                                action,
                                [
                                    "due_date",
                                    "deadline"
                                ],
                                ""
                            );

                        return `
                            <article class="pending-case-action-item">
                                <span class="pending-action-indicator"
                                      aria-hidden="true"></span>

                                <div class="pending-case-action-content">
                                    <h3 class="pending-case-action-title">
                                        ${title}
                                    </h3>

                                    ${
                                        description
                                            ? `
                                                <p class="pending-case-action-description">
                                                    ${description}
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        dueDate
                                            ? `
                                                <span class="case-date">
                                                    Due ${this.escapeHtml(
                                                        this.formatDate(
                                                            dueDate
                                                        )
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }
                                </div>
                            </article>
                        `;
                    })
                    .join("");
        },

        renderGraphPreview(caseData) {
            if (!this.elements.graphPreview) {
                return;
            }

            const graph =
                caseData.graph_preview ||
                caseData.graph ||
                null;

            /*
             * graph.js is responsible for the full interactive graph.
             * Here we only display a simple preview state/data marker.
             */
            if (!graph) {
                this.elements.graphPreview.innerHTML = `
                    <div class="case-graph-preview-empty">
                        <p>
                            Evidence graph data is not available yet.
                        </p>
                    </div>
                `;
                return;
            }

            this.elements.graphPreview.dataset.graphData =
                this.safeJsonAttribute(
                    graph
                );

            /*
             * If graph.js is loaded, notify it that fresh preview data
             * is available.
             */
            try {
                this.elements.graphPreview.dispatchEvent(
                    new CustomEvent(
                        "io:case-graph-data",
                        {
                            detail: graph
                        }
                    )
                );
            } catch (error) {
                /*
                 * CustomEvent is supported by modern browsers.
                 * This fallback intentionally does nothing.
                 */
            }
        },

        async handleAddPerson(event) {
            event.preventDefault();

            const url =
                this.elements.addPerson.dataset.url ||
                this.elements.addPerson.dataset.actionUrl;

            if (url) {
                this.navigate(url);
                return;
            }

            /*
             * The actual person creation form is normally handled by Django.
             * If no URL was supplied, provide a clear message instead of
             * attempting to invent an API route.
             */
            this.showMessage(
                "Add Person form is not configured.",
                "error"
            );
        },

        async handleAddEvent(event) {
            event.preventDefault();

            const url =
                this.elements.addEvent.dataset.url ||
                this.elements.addEvent.dataset.actionUrl;

            if (url) {
                this.navigate(url);
                return;
            }

            this.showMessage(
                "Add Event form is not configured.",
                "error"
            );
        },

        showLoading() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    false;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    true;

                this.elements.refresh.setAttribute(
                    "aria-busy",
                    "true"
                );
            }
        },

        showLoadedState() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;

                this.elements.refresh.removeAttribute(
                    "aria-busy"
                );
            }
        },

        showError(message) {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    false;
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent =
                    message;
            }

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;

                this.elements.refresh.removeAttribute(
                    "aria-busy"
                );
            }

            this.showMessage(
                message,
                "error"
            );
        },

        clearError() {
            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent =
                    "";
            }
        },

        showMessage(message, type = "info") {
            if (!this.elements.message) {
                return;
            }

            this.elements.message.hidden =
                false;

            this.elements.message.textContent =
                message;

            this.elements.message.dataset.messageType =
                type;
        },

        renderEmpty(element, message) {
            if (!element) {
                return;
            }

            element.innerHTML = `
                <div class="case-detail-empty">
                    <p>${this.escapeHtml(
                        message
                    )}</p>
                </div>
            `;
        },

        getCollection(data, keys) {
            if (
                !data ||
                typeof data !== "object"
            ) {
                return [];
            }

            for (const key of keys) {
                if (Array.isArray(data[key])) {
                    return data[key];
                }
            }

            if (
                data.data &&
                typeof data.data === "object" &&
                !Array.isArray(data.data)
            ) {
                for (const key of keys) {
                    if (
                        Array.isArray(
                            data.data[key]
                        )
                    ) {
                        return data.data[key];
                    }
                }
            }

            return [];
        },

        getValue(object, keys, fallback = "") {
            if (
                !object ||
                typeof object !== "object"
            ) {
                return fallback;
            }

            for (const key of keys) {
                if (
                    object[key] !== undefined &&
                    object[key] !== null &&
                    object[key] !== ""
                ) {
                    return object[key];
                }
            }

            return fallback;
        },

        setText(element, value, fallback = "—") {
            if (!element) {
                return;
            }

            element.textContent =
                value === null ||
                value === undefined ||
                value === ""
                    ? fallback
                    : String(value);
        },

        setTextBySelector(
            selector,
            value,
            fallback = "0"
        ) {
            const element =
                document.querySelector(
                    selector
                );

            this.setText(
                element,
                value,
                fallback
            );
        },

        formatNumber(value) {
            const number =
                Number(value);

            if (
                !Number.isFinite(number)
            ) {
                return String(
                    value ?? 0
                );
            }

            try {
                return new Intl.NumberFormat()
                    .format(number);
            } catch (error) {
                return String(number);
            }
        },

        formatDate(value) {
            if (!value) {
                return "—";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(value);
            }

            try {
                return new Intl.DateTimeFormat(
                    undefined,
                    {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                    }
                ).format(date);
            } catch (error) {
                return String(value);
            }
        },

        formatDateTime(value) {
            if (!value) {
                return "—";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(value);
            }

            try {
                return new Intl.DateTimeFormat(
                    undefined,
                    {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                ).format(date);
            } catch (error) {
                return String(value);
            }
        },

        getInitials(name) {
            const cleanName =
                String(name || "")
                    .replace(
                        /<[^>]*>/g,
                        ""
                    )
                    .trim();

            if (!cleanName) {
                return "?";
            }

            const parts =
                cleanName
                    .split(/\s+/)
                    .filter(Boolean);

            if (parts.length === 1) {
                return parts[0]
                    .slice(0, 2)
                    .toUpperCase();
            }

            return (
                parts[0][0] +
                parts[parts.length - 1][0]
            ).toUpperCase();
        },

        getEvidenceIcon(type) {
            const normalized =
                String(type || "")
                    .toLowerCase();

            if (
                normalized.includes("image") ||
                normalized.includes("photo")
            ) {
                return "IMG";
            }

            if (
                normalized.includes("video") ||
                normalized.includes("audio")
            ) {
                return "MEDIA";
            }

            if (
                normalized.includes("document") ||
                normalized.includes("pdf") ||
                normalized.includes("report")
            ) {
                return "DOC";
            }

            if (
                normalized.includes("statement") ||
                normalized.includes("witness")
            ) {
                return "ST";
            }

            return "EV";
        },

        slugify(value) {
            return String(
                value || ""
            )
                .toLowerCase()
                .trim()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    "");
        },

        safeJsonAttribute(value) {
            try {
                return JSON.stringify(
                    value
                )
                    .replace(
                        /&/g,
                        "&amp;"
                    )
                    .replace(
                        /"/g,
                        "&quot;"
                    )
                    .replace(
                        /</g,
                        "&lt;"
                    )
                    .replace(
                        />/g,
                        "&gt;"
                    );
            } catch (error) {
                return "";
            }
        },

        escapeHtml(value) {
            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            const element =
                document.createElement(
                    "div"
                );

            element.textContent =
                String(value);

            return element.innerHTML;
        },

        escapeAttribute(value) {
            return this.escapeHtml(value)
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#39;"
                );
        },

        navigate(url) {
            if (!url) {
                return;
            }

            window.location.href =
                url;
        },

        async fetchJson(url) {
            const response =
                await fetch(url, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        Accept:
                            "application/json"
                    }
                });

            const text =
                await response.text();

            let data = null;

            if (text) {
                try {
                    data =
                        JSON.parse(text);
                } catch (error) {
                    data = text;
                }
            }

            if (!response.ok) {
                throw new Error(
                    this.getErrorMessage(
                        data
                    ) ||
                    response.statusText ||
                    "Unable to load case details."
                );
            }

            return {
                data,
                status:
                    response.status,
                ok:
                    response.ok,
                response
            };
        },

        unwrapResponse(response) {
            if (
                response &&
                Object.prototype.hasOwnProperty.call(
                    response,
                    "data"
                )
            ) {
                return response.data;
            }

            return response;
        },

        getErrorMessage(data) {
            if (!data) {
                return "";
            }

            if (
                typeof data === "string"
            ) {
                return data;
            }

            if (
                typeof data !== "object"
            ) {
                return "";
            }

            if (
                typeof data.message ===
                "string"
            ) {
                return data.message;
            }

            if (
                typeof data.detail ===
                "string"
            ) {
                return data.detail;
            }

            if (
                typeof data.error ===
                "string"
            ) {
                return data.error;
            }

            if (
                Array.isArray(
                    data.non_field_errors
                )
            ) {
                return (
                    data.non_field_errors[0] ||
                    ""
                );
            }

            for (
                const key of
                Object.keys(data)
            ) {
                const value =
                    data[key];

                if (
                    Array.isArray(value) &&
                    value.length
                ) {
                    return String(
                        value[0]
                    );
                }

                if (
                    typeof value ===
                    "string"
                ) {
                    return value;
                }
            }

            return "";
        }
    };

    function initializeCaseDetail() {
        CaseDetail.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeCaseDetail,
            {
                once: true
            }
        );
    } else {
        initializeCaseDetail();
    }

    window.IOCaseDetail =
        CaseDetail;

})(window, document);