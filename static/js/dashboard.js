(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Dashboard JavaScript
     *
     * File:
     * static/js/dashboard.js
     *
     * Responsibilities:
     * - Load dashboard data from Django JSON API
     * - Render summary statistics
     * - Render pending actions
     * - Render recent evidence
     * - Render recent cases
     * - Handle dashboard refresh
     * - Handle retry after API errors
     * - Handle navigation for dashboard actions
     *
     * Shared API helper:
     * static/js/api.js
     */

    const Dashboard = {
        elements: {},
        state: {
            data: null,
            loading: false,
            error: null
        },

        init() {
            this.cacheElements();
            this.bindEvents();

            if (!this.elements.page) {
                return;
            }

            this.loadDashboard();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector(".dashboard-page") ||
                document.querySelector("[data-dashboard-page]");

            this.elements.loading =
                document.querySelector(".dashboard-loading");

            this.elements.error =
                document.querySelector(".dashboard-error");

            this.elements.errorMessage =
                document.querySelector(".dashboard-error-message");

            this.elements.empty =
                document.querySelector(".dashboard-empty-state");

            this.elements.refreshButtons =
                document.querySelectorAll(
                    "[data-dashboard-refresh], [data-action='refresh-dashboard']"
                );

            this.elements.retryButtons =
                document.querySelectorAll(
                    "[data-dashboard-retry], [data-action='retry-dashboard']"
                );

            this.elements.statCards =
                document.querySelectorAll("[data-dashboard-stat]");

            this.elements.pendingActions =
                document.querySelector("[data-pending-actions]");

            this.elements.recentEvidence =
                document.querySelector("[data-recent-evidence]");

            this.elements.recentCases =
                document.querySelector("[data-recent-cases]");

            this.elements.messages =
                document.querySelector("[data-dashboard-message]");
        },

        bindEvents() {
            this.elements.refreshButtons.forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.loadDashboard();
                });
            });

            this.elements.retryButtons.forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.loadDashboard();
                });
            });
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.dashboardEndpoint ||
                this.elements.page.dataset.apiEndpoint ||
                "/api/dashboard/"
            );
        },

        async loadDashboard() {
            const endpoint = this.getEndpoint();

            if (!endpoint) {
                this.showError("Dashboard API endpoint is not configured.");
                return;
            }

            this.state.loading = true;
            this.state.error = null;

            this.showLoading();
            this.clearError();

            try {
                const api = window.IOApi || window.api;

                let response;

                if (api && typeof api.get === "function") {
                    response = await api.get(endpoint);
                } else {
                    response = await fetch(endpoint, {
                        method: "GET",
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json"
                        }
                    });

                    const responseText = await response.text();

                    let responseData = null;

                    if (responseText) {
                        try {
                            responseData = JSON.parse(responseText);
                        } catch (parseError) {
                            responseData = responseText;
                        }
                    }

                    if (!response.ok) {
                        throw new Error(
                            this.getErrorMessage(responseData) ||
                            response.statusText ||
                            "Unable to load dashboard data."
                        );
                    }

                    response = {
                        data: responseData,
                        status: response.status,
                        ok: response.ok
                    };
                }

                const data = this.unwrapResponse(response);

                this.state.data = data;
                this.state.loading = false;

                this.renderDashboard(data);
                this.showLoadedState();

            } catch (error) {
                this.state.loading = false;
                this.state.error = error;

                this.showError(
                    error && error.message
                        ? error.message
                        : "Unable to load dashboard data. Please try again."
                );

                console.error(
                    "IO Assistant dashboard error:",
                    error
                );
            }
        },

        unwrapResponse(response) {
            if (
                response &&
                Object.prototype.hasOwnProperty.call(response, "data")
            ) {
                return response.data;
            }

            return response;
        },

        normalizeData(data) {
            if (!data) {
                return {};
            }

            if (Array.isArray(data)) {
                return {
                    results: data
                };
            }

            return data;
        },

        renderDashboard(rawData) {
            const data = this.normalizeData(rawData);

            this.renderStatistics(data);
            this.renderPendingActions(data);
            this.renderRecentEvidence(data);
            this.renderRecentCases(data);
        },

        renderStatistics(data) {
            const statistics = {
                activeCases: this.getValue(data, [
                    "active_case_count",
                    "open_case_count",
                    "active_cases",
                    "open_cases"
                ], 0),

                evidence: this.getValue(data, [
                    "evidence_count",
                    "total_evidence",
                    "evidence"
                ], 0),

                entities: this.getValue(data, [
                    "entity_count",
                    "person_count",
                    "entities",
                    "people_count"
                ], 0),

                timelineEvents: this.getValue(data, [
                    "timeline_event_count",
                    "event_count",
                    "timeline_events",
                    "events_count"
                ], 0)
            };

            const mappings = {
                "active-cases": statistics.activeCases,
                "open-cases": statistics.activeCases,
                "evidence": statistics.evidence,
                "entities": statistics.entities,
                "persons": statistics.entities,
                "timeline-events": statistics.timelineEvents,
                "events": statistics.timelineEvents
            };

            this.elements.statCards.forEach((card) => {
                const key = card.dataset.dashboardStat;

                if (!key) {
                    return;
                }

                const value = mappings[key];

                if (value === undefined) {
                    return;
                }

                const valueElement =
                    card.querySelector(
                        "[data-stat-value]"
                    ) ||
                    card.querySelector(
                        ".dashboard-stat-value"
                    );

                if (valueElement) {
                    valueElement.textContent =
                        this.formatNumber(value);
                }
            });

            /*
             * Also support direct IDs/classes from dashboard.html.
             */
            this.setText(
                "#activeCaseCount",
                statistics.activeCases
            );

            this.setText(
                "#openCaseCount",
                statistics.activeCases
            );

            this.setText(
                "#evidenceCount",
                statistics.evidence
            );

            this.setText(
                "#entityCount",
                statistics.entities
            );

            this.setText(
                "#personCount",
                statistics.entities
            );

            this.setText(
                "#timelineEventCount",
                statistics.timelineEvents
            );

            this.setText(
                "#eventCount",
                statistics.timelineEvents
            );
        },

        renderPendingActions(data) {
            if (!this.elements.pendingActions) {
                return;
            }

            const actions = this.getCollection(
                data,
                [
                    "pending_actions",
                    "pendingActions",
                    "actions"
                ]
            );

            if (!actions.length) {
                this.renderCollectionEmpty(
                    this.elements.pendingActions,
                    "No pending actions."
                );
                return;
            }

            this.elements.pendingActions.innerHTML = actions
                .map((action) => {
                    const title = this.escapeHtml(
                        this.getValue(action, [
                            "title",
                            "name",
                            "action"
                        ], "Pending Action")
                    );

                    const description = this.escapeHtml(
                        this.getValue(action, [
                            "description",
                            "details",
                            "summary"
                        ], "")
                    );

                    const priority = this.escapeHtml(
                        this.getValue(action, [
                            "priority",
                            "severity"
                        ], "")
                    );

                    const dueDate = this.getValue(
                        action,
                        [
                            "due_date",
                            "dueDate",
                            "deadline"
                        ],
                        ""
                    );

                    const url = this.getValue(
                        action,
                        [
                            "url",
                            "link",
                            "detail_url"
                        ],
                        ""
                    );

                    const priorityMarkup = priority
                        ? `
                            <span class="dashboard-priority dashboard-priority--${this.slugify(priority)}">
                                ${priority}
                            </span>
                        `
                        : "";

                    const metaMarkup = dueDate
                        ? `
                            <span class="pending-action-meta">
                                Due ${this.escapeHtml(
                                    this.formatDate(dueDate)
                                )}
                            </span>
                        `
                        : "";

                    const actionContent = `
                        <div class="pending-action-indicator"></div>

                        <div class="pending-action-content">
                            <div class="pending-action-title-row">
                                <h3 class="pending-action-title">
                                    ${title}
                                </h3>
                                ${priorityMarkup}
                            </div>

                            ${
                                description
                                    ? `
                                        <p class="pending-action-description">
                                            ${description}
                                        </p>
                                    `
                                    : ""
                            }

                            ${metaMarkup}
                        </div>

                        ${
                            url
                                ? `
                                    <span class="pending-action-link"
                                          aria-hidden="true">
                                        →
                                    </span>
                                `
                                : ""
                        }
                    `;

                    if (url) {
                        return `
                            <a class="pending-action"
                               href="${this.escapeAttribute(url)}">
                                ${actionContent}
                            </a>
                        `;
                    }

                    return `
                        <div class="pending-action">
                            ${actionContent}
                        </div>
                    `;
                })
                .join("");
        },

        renderRecentEvidence(data) {
            if (!this.elements.recentEvidence) {
                return;
            }

            const evidence = this.getCollection(
                data,
                [
                    "recent_evidence",
                    "recentEvidence",
                    "evidence"
                ]
            );

            if (!evidence.length) {
                this.renderCollectionEmpty(
                    this.elements.recentEvidence,
                    "No recent evidence available."
                );
                return;
            }

            this.elements.recentEvidence.innerHTML = evidence
                .map((item) => {
                    const title = this.escapeHtml(
                        this.getValue(item, [
                            "title",
                            "name",
                            "file_name",
                            "filename"
                        ], "Evidence")
                    );

                    const description = this.escapeHtml(
                        this.getValue(item, [
                            "description",
                            "notes",
                            "summary"
                        ], "")
                    );

                    const evidenceType = this.escapeHtml(
                        this.getValue(item, [
                            "evidence_type",
                            "type",
                            "document_type"
                        ], "Evidence")
                    );

                    const status = this.escapeHtml(
                        this.getValue(item, [
                            "status",
                            "processing_status"
                        ], "")
                    );

                    const createdAt = this.getValue(
                        item,
                        [
                            "created_at",
                            "uploaded_at",
                            "date"
                        ],
                        ""
                    );

                    const url = this.getValue(
                        item,
                        [
                            "url",
                            "detail_url",
                            "evidence_url"
                        ],
                        ""
                    );

                    const content = `
                        <span class="evidence-type-icon"
                              aria-hidden="true">
                            ${this.getEvidenceIcon(evidenceType)}
                        </span>

                        <span class="recent-evidence-content">
                            <span class="recent-evidence-title">
                                ${title}
                            </span>

                            ${
                                description
                                    ? `
                                        <span class="recent-evidence-description">
                                            ${description}
                                        </span>
                                    `
                                    : ""
                            }

                            <span class="recent-evidence-meta">
                                ${evidenceType}
                                ${
                                    createdAt
                                        ? ` · ${this.escapeHtml(
                                            this.formatDate(createdAt)
                                        )}`
                                        : ""
                                }
                            </span>
                        </span>

                        ${
                            status
                                ? `
                                    <span class="recent-evidence-status
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
                            <a class="recent-evidence-item"
                               href="${this.escapeAttribute(url)}">
                                ${content}
                            </a>
                        `;
                    }

                    return `
                        <div class="recent-evidence-item">
                            ${content}
                        </div>
                    `;
                })
                .join("");
        },

        renderRecentCases(data) {
            if (!this.elements.recentCases) {
                return;
            }

            const cases = this.getCollection(
                data,
                [
                    "recent_cases",
                    "recentCases",
                    "cases"
                ]
            );

            if (!cases.length) {
                this.renderCollectionEmpty(
                    this.elements.recentCases,
                    "No recent cases available."
                );
                return;
            }

            /*
             * The dashboard HTML already contains table/mobile structures.
             * We render rows/cards into their designated containers when
             * available.
             */
            const tableBody =
                this.elements.recentCases.querySelector(
                    "[data-recent-cases-body]"
                ) ||
                this.elements.recentCases.querySelector(
                    "tbody"
                );

            const mobileContainer =
                this.elements.recentCases.querySelector(
                    "[data-recent-cases-mobile]"
                ) ||
                document.querySelector(
                    ".recent-cases-mobile"
                );

            if (tableBody) {
                tableBody.innerHTML = cases
                    .map((caseItem) =>
                        this.renderCaseTableRow(caseItem)
                    )
                    .join("");
            } else {
                this.elements.recentCases.innerHTML = cases
                    .map((caseItem) =>
                        this.renderCaseCard(caseItem)
                    )
                    .join("");
            }

            if (mobileContainer) {
                mobileContainer.innerHTML = cases
                    .map((caseItem) =>
                        this.renderCaseCard(caseItem)
                    )
                    .join("");
            }
        },

        renderCaseTableRow(caseItem) {
            const caseNumber = this.escapeHtml(
                this.getValue(caseItem, [
                    "case_number",
                    "caseNumber",
                    "number"
                ], "—")
            );

            const title = this.escapeHtml(
                this.getValue(caseItem, [
                    "title",
                    "name"
                ], "Untitled Case")
            );

            const status = this.escapeHtml(
                this.getValue(caseItem, [
                    "status",
                    "case_status"
                ], "Unknown")
            );

            const priority = this.escapeHtml(
                this.getValue(caseItem, [
                    "priority"
                ], "")
            );

            const updatedAt = this.getValue(
                caseItem,
                [
                    "updated_at",
                    "modified_at",
                    "created_at"
                ],
                ""
            );

            const url = this.getCaseUrl(caseItem);

            return `
                <tr class="recent-case-row">
                    <td>
                        ${
                            url
                                ? `
                                    <a class="recent-case-name"
                                       href="${this.escapeAttribute(url)}">
                                        ${title}
                                    </a>
                                `
                                : `
                                    <span class="recent-case-name">
                                        ${title}
                                    </span>
                                `
                        }

                        <span class="recent-case-number">
                            ${caseNumber}
                        </span>
                    </td>

                    <td>
                        <span class="dashboard-status">
                            ${status}
                        </span>
                    </td>

                    <td>
                        ${
                            priority
                                ? `
                                    <span class="dashboard-priority
                                                 dashboard-priority--${this.slugify(priority)}">
                                        ${priority}
                                    </span>
                                `
                                : "—"
                        }
                    </td>

                    <td>
                        <span class="recent-case-date">
                            ${
                                updatedAt
                                    ? this.escapeHtml(
                                        this.formatDate(updatedAt)
                                    )
                                    : "—"
                            }
                        </span>
                    </td>

                    <td class="recent-case-actions">
                        ${
                            url
                                ? `
                                    <a class="btn btn--secondary btn--small"
                                       href="${this.escapeAttribute(url)}">
                                        View
                                    </a>
                                `
                                : ""
                        }
                    </td>
                </tr>
            `;
        },

        renderCaseCard(caseItem) {
            const caseNumber = this.escapeHtml(
                this.getValue(caseItem, [
                    "case_number",
                    "caseNumber",
                    "number"
                ], "—")
            );

            const title = this.escapeHtml(
                this.getValue(caseItem, [
                    "title",
                    "name"
                ], "Untitled Case")
            );

            const description = this.escapeHtml(
                this.getValue(caseItem, [
                    "description",
                    "summary"
                ], "")
            );

            const status = this.escapeHtml(
                this.getValue(caseItem, [
                    "status",
                    "case_status"
                ], "Unknown")
            );

            const priority = this.escapeHtml(
                this.getValue(caseItem, [
                    "priority"
                ], "")
            );

            const createdAt = this.getValue(
                caseItem,
                [
                    "created_at",
                    "date"
                ],
                ""
            );

            const updatedAt = this.getValue(
                caseItem,
                [
                    "updated_at",
                    "modified_at"
                ],
                ""
            );

            const url = this.getCaseUrl(caseItem);

            return `
                <article class="recent-case-card">
                    <div class="recent-case-card-header">
                        <div>
                            ${
                                url
                                    ? `
                                        <a class="recent-case-card-title"
                                           href="${this.escapeAttribute(url)}">
                                            ${title}
                                        </a>
                                    `
                                    : `
                                        <h3 class="recent-case-card-title">
                                            ${title}
                                        </h3>
                                    `
                            }

                            <span class="recent-case-card-number">
                                ${caseNumber}
                            </span>
                        </div>

                        <span class="dashboard-status">
                            ${status}
                        </span>
                    </div>

                    ${
                        description
                            ? `
                                <p class="recent-case-card-description">
                                    ${description}
                                </p>
                            `
                            : ""
                    }

                    <div class="recent-case-card-meta">
                        ${
                            createdAt
                                ? `
                                    <div class="recent-case-card-meta-item">
                                        <span class="recent-case-card-meta-label">
                                            Created
                                        </span>
                                        <span class="recent-case-card-meta-value">
                                            ${this.escapeHtml(
                                                this.formatDate(createdAt)
                                            )}
                                        </span>
                                    </div>
                                `
                                : ""
                        }

                        ${
                            updatedAt
                                ? `
                                    <div class="recent-case-card-meta-item">
                                        <span class="recent-case-card-meta-label">
                                            Updated
                                        </span>
                                        <span class="recent-case-card-meta-value">
                                            ${this.escapeHtml(
                                                this.formatDate(updatedAt)
                                            )}
                                        </span>
                                    </div>
                                `
                                : ""
                        }

                        ${
                            priority
                                ? `
                                    <div class="recent-case-card-meta-item">
                                        <span class="recent-case-card-meta-label">
                                            Priority
                                        </span>
                                        <span class="recent-case-card-meta-value">
                                            ${priority}
                                        </span>
                                    </div>
                                `
                                : ""
                        }
                    </div>

                    ${
                        url
                            ? `
                                <div class="recent-case-card-actions">
                                    <a class="btn btn--secondary btn--small"
                                       href="${this.escapeAttribute(url)}">
                                        View Case
                                    </a>
                                </div>
                            `
                            : ""
                    }
                </article>
            `;
        },

        getCaseUrl(caseItem) {
            const directUrl = this.getValue(
                caseItem,
                [
                    "url",
                    "detail_url",
                    "case_url"
                ],
                ""
            );

            if (directUrl) {
                return directUrl;
            }

            const caseId = this.getValue(
                caseItem,
                [
                    "id",
                    "case_id"
                ],
                ""
            );

            if (!caseId) {
                return "";
            }

            /*
             * The backend can provide the URL directly. If it does not,
             * fall back to the project's conventional Django route.
             */
            return `/cases/${encodeURIComponent(caseId)}/`;
        },

        getCollection(data, keys) {
            if (!data || typeof data !== "object") {
                return [];
            }

            for (const key of keys) {
                if (Array.isArray(data[key])) {
                    return data[key];
                }
            }

            /*
             * Some APIs return:
             * { data: { cases: [...] } }
             */
            if (
                data.data &&
                typeof data.data === "object" &&
                !Array.isArray(data.data)
            ) {
                for (const key of keys) {
                    if (Array.isArray(data.data[key])) {
                        return data.data[key];
                    }
                }
            }

            return [];
        },

        getValue(object, keys, fallback = "") {
            if (!object || typeof object !== "object") {
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

        renderCollectionEmpty(container, message) {
            if (!container) {
                return;
            }

            container.innerHTML = `
                <div class="dashboard-empty-state">
                    <div class="dashboard-empty-state-icon"
                         aria-hidden="true">
                        —
                    </div>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
        },

        showLoading() {
            if (this.elements.loading) {
                this.elements.loading.hidden = false;
                this.elements.loading.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

            if (this.elements.error) {
                this.elements.error.hidden = true;
            }

            if (this.elements.empty) {
                this.elements.empty.hidden = true;
            }

            this.elements.refreshButtons.forEach((button) => {
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
            });
        },

        showLoadedState() {
            if (this.elements.loading) {
                this.elements.loading.hidden = true;
                this.elements.loading.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }

            if (this.elements.error) {
                this.elements.error.hidden = true;
            }

            this.elements.refreshButtons.forEach((button) => {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            });
        },

        showError(message) {
            if (this.elements.loading) {
                this.elements.loading.hidden = true;
            }

            if (this.elements.error) {
                this.elements.error.hidden = false;
                this.elements.error.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent = message;
            }

            this.elements.refreshButtons.forEach((button) => {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            });

            if (this.elements.messages) {
                this.elements.messages.textContent = message;
                this.elements.messages.dataset.messageType = "error";
            }
        },

        clearError() {
            if (this.elements.error) {
                this.elements.error.hidden = true;
                this.elements.error.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent = "";
            }

            if (this.elements.messages) {
                this.elements.messages.textContent = "";
                delete this.elements.messages.dataset.messageType;
            }
        },

        setText(selector, value, fallback = "0") {
            const element = document.querySelector(selector);

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

        formatNumber(value) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return String(value ?? 0);
            }

            try {
                return new Intl.NumberFormat().format(number);
            } catch (error) {
                return String(number);
            }
        },

        formatDate(value) {
            if (!value) {
                return "—";
            }

            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return String(value);
            }

            try {
                return new Intl.DateTimeFormat(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }).format(date);
            } catch (error) {
                return String(value);
            }
        },

        getEvidenceIcon(type) {
            const normalized = String(type || "")
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
            return String(value || "")
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        },

        escapeHtml(value) {
            if (value === null || value === undefined) {
                return "";
            }

            const element = document.createElement("div");
            element.textContent = String(value);

            return element.innerHTML;
        },

        escapeAttribute(value) {
            return this.escapeHtml(value)
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        },

        getErrorMessage(data) {
            if (!data) {
                return "";
            }

            if (typeof data === "string") {
                return data;
            }

            if (typeof data !== "object") {
                return "";
            }

            if (typeof data.message === "string") {
                return data.message;
            }

            if (typeof data.detail === "string") {
                return data.detail;
            }

            if (typeof data.error === "string") {
                return data.error;
            }

            if (Array.isArray(data.non_field_errors)) {
                return data.non_field_errors[0] || "";
            }

            for (const key of Object.keys(data)) {
                const value = data[key];

                if (Array.isArray(value) && value.length) {
                    return String(value[0]);
                }

                if (typeof value === "string") {
                    return value;
                }
            }

            return "";
        }
    };

    /*
     * Initialize after DOM is ready.
     */
    function initializeDashboard() {
        Dashboard.init();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard,
            { once: true }
        );
    } else {
        initializeDashboard();
    }

    /*
     * Expose the module for debugging and controlled reuse.
     */
    window.IODashboard = Dashboard;

})(window, document);