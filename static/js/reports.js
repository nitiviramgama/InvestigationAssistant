(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Reports & Documents JavaScript
     *
     * File:
     * static/js/reports.js
     *
     * Responsibilities:
     * - Load generated document history
     * - Search/filter document history
     * - Request document generation
     * - Open generated documents
     * - Download generated documents
     * - Handle officer review actions
     * - Render loading, empty, success and error states
     *
     * IMPORTANT:
     * - Document generation is performed by the Django backend.
     * - This file only communicates with configured backend endpoints.
     * - No document-generation logic or legal content is generated here.
     */

    const Reports = {
        elements: {},

        state: {
            loading: false,
            actionLoading: false,
            error: null,
            search: "",
            selectedDocument: null,
            generatedDocuments: [],
            documentStatuses: {},
            reviewStatus: "",
            reviewNotes: ""
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.bindEvents();
            this.initializeExistingHistory();

            if (this.getEndpoint()) {
                this.loadReports();
            } else {
                this.showInitialState();
            }
        },

        cacheElements() {
            this.elements.page =
                document.querySelector("#reportsPage") ||
                document.querySelector(".reports-page") ||
                document.querySelector("[data-reports-page]");

            this.elements.search =
                document.querySelector("[data-document-search]") ||
                document.querySelector("[data-reports-search]") ||
                document.querySelector(
                    ".reports-header input[type='search']"
                );

            this.elements.documentList =
                document.querySelector("[data-document-list]") ||
                document.querySelector(".document-grid");

            this.elements.historyTable =
                document.querySelector("[data-history-table]") ||
                document.querySelector(".history-table tbody");

            this.elements.historyMobile =
                document.querySelector(".history-mobile");

            this.elements.review =
                document.querySelector("[data-document-review]") ||
                document.querySelector(".document-review");

            this.elements.selectedDocument =
                document.querySelector("[data-selected-document]") ||
                document.querySelector(".selected-document");

            this.elements.reviewStatus =
                document.querySelector("[data-review-status]") ||
                document.querySelector(
                    ".review-status"
                );

            this.elements.reviewNotes =
                document.querySelector("[data-review-notes]") ||
                document.querySelector(
                    ".review-notes textarea"
                );

            this.elements.openDocument =
                document.querySelector(
                    "[data-action='open-document']"
                );

            this.elements.requestRevision =
                document.querySelector(
                    "[data-action='request-revision']"
                );

            this.elements.markReviewed =
                document.querySelector(
                    "[data-action='mark-reviewed']"
                );

            this.elements.loading =
                document.querySelector(".reports-loading");

            this.elements.empty =
                document.querySelector(".reports-empty-state");

            this.elements.noDocuments =
                document.querySelector(".no-generated-documents");

            this.elements.error =
                document.querySelector(".reports-error") ||
                document.querySelector(".reports-error-state");

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                          "[data-error-message]"
                      )
                    : null;

            this.elements.actionError =
                document.querySelector(".action-error");

            this.elements.actionErrorMessage =
                this.elements.actionError
                    ? this.elements.actionError.querySelector(
                          "[data-error-message]"
                      )
                    : null;

            this.elements.success =
                document.querySelector(".reports-success") ||
                document.querySelector(".reports-success-state");

            this.elements.successMessage =
                this.elements.success
                    ? this.elements.success.querySelector(
                          "[data-success-message]"
                      )
                    : null;

            this.elements.message =
                document.querySelector("[data-reports-message]");

            this.elements.documentCards =
                document.querySelectorAll(
                    "[data-document-type]"
                );

            this.elements.generateButtons =
                document.querySelectorAll(
                    "[data-action='generate-document']"
                );

            this.elements.historySearch =
                document.querySelector(
                    "[data-history-search]"
                );
        },

        bindEvents() {
            if (this.elements.search) {
                this.elements.search.addEventListener(
                    "input",
                    this.debounce(() => {
                        this.state.search =
                            this.elements.search.value.trim();

                        this.filterHistory();
                    }, 250)
                );
            }

            if (this.elements.historySearch) {
                this.elements.historySearch.addEventListener(
                    "input",
                    this.debounce(() => {
                        this.state.search =
                            this.elements.historySearch.value.trim();

                        this.filterHistory();
                    }, 250)
                );
            }

            this.elements.generateButtons.forEach(
                (button) => {
                    button.addEventListener(
                        "click",
                        (event) => {
                            event.preventDefault();

                            const type =
                                button.dataset.documentType ||
                                button.closest(
                                    "[data-document-type]"
                                )?.dataset.documentType ||
                                "";

                            if (type) {
                                this.generateDocument(
                                    type,
                                    button
                                );
                            }
                        }
                    );
                }
            );

            this.elements.documentCards.forEach(
                (card) => {
                    const generateButton =
                        card.querySelector(
                            "[data-action='generate-document']"
                        );

                    const viewButton =
                        card.querySelector(
                            "[data-action='view-document']"
                        );

                    const downloadButton =
                        card.querySelector(
                            "[data-action='download-document']"
                        );

                    const type =
                        card.dataset.documentType || "";

                    if (generateButton) {
                        generateButton.addEventListener(
                            "click",
                            (event) => {
                                event.preventDefault();

                                this.generateDocument(
                                    type,
                                    generateButton
                                );
                            }
                        );
                    }

                    if (viewButton) {
                        viewButton.addEventListener(
                            "click",
                            (event) => {
                                event.preventDefault();

                                this.openDocumentFromElement(
                                    viewButton
                                );
                            }
                        );
                    }

                    if (downloadButton) {
                        downloadButton.addEventListener(
                            "click",
                            (event) => {
                                event.preventDefault();

                                this.downloadDocumentFromElement(
                                    downloadButton
                                );
                            }
                        );
                    }
                }
            );

            if (this.elements.openDocument) {
                this.elements.openDocument.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.openSelectedDocument();
                    }
                );
            }

            if (this.elements.requestRevision) {
                this.elements.requestRevision.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.requestRevision();
                    }
                );
            }

            if (this.elements.markReviewed) {
                this.elements.markReviewed.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.markReviewed();
                    }
                );
            }

            this.bindHistoryActions();

            document.addEventListener(
                "io:reports-refresh",
                () => {
                    this.loadReports();
                }
            );
        },

        async loadReports() {
            const endpoint = this.getEndpoint();

            if (!endpoint) {
                this.showInitialState();
                return;
            }

            this.state.loading = true;

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

                const normalized =
                    this.normalizeReportsData(data);

                this.state.generatedDocuments =
                    normalized.generatedDocuments;

                this.state.documentStatuses =
                    normalized.documentStatuses;

                this.state.loading = false;

                this.renderDocumentStatuses();
                this.renderHistory();
                this.bindHistoryActions();

                this.showLoadedState();

                if (
                    !this.state.generatedDocuments.length
                ) {
                    this.showNoDocuments();
                }
            } catch (error) {
                this.state.loading = false;
                this.state.error = error;

                this.showError(
                    error?.message ||
                        "Unable to load reports and documents."
                );

                console.error(
                    "IO Assistant reports error:",
                    error
                );
            }
        },

        normalizeReportsData(data) {
            if (!data) {
                return {
                    generatedDocuments: [],
                    documentStatuses: {}
                };
            }

            if (
                data.reports &&
                typeof data.reports === "object"
            ) {
                data = data.reports;
            }

            const documents =
                data.generated_documents ||
                data.documents ||
                data.history ||
                data.results ||
                [];

            const statuses =
                data.document_statuses ||
                data.statuses ||
                {};

            const normalizedDocuments =
                Array.isArray(documents)
                    ? documents.map(
                          (documentItem, index) =>
                              this.normalizeDocument(
                                  documentItem,
                                  index
                              )
                      )
                    : [];

            return {
                generatedDocuments:
                    normalizedDocuments,
                documentStatuses:
                    this.normalizeStatuses(
                        statuses,
                        normalizedDocuments
                    )
            };
        },

        normalizeDocument(
            documentItem,
            index
        ) {
            if (
                typeof documentItem === "string"
            ) {
                return {
                    id: `document-${index}`,
                    document_type: "document",
                    title: documentItem,
                    generated_at: "",
                    generated_by: "",
                    version: "",
                    status: "Generated",
                    view_url: "",
                    download_url: ""
                };
            }

            const id =
                this.getValue(
                    documentItem,
                    ["id", "document_id", "uuid"],
                    `document-${index}`
                );

            const type =
                this.getValue(
                    documentItem,
                    [
                        "document_type",
                        "type",
                        "category"
                    ],
                    "document"
                );

            return {
                ...documentItem,

                id: String(id),

                document_type:
                    String(type),

                title:
                    this.getValue(
                        documentItem,
                        [
                            "title",
                            "name",
                            "document_name"
                        ],
                        this.getDocumentLabel(
                            type
                        )
                    ),

                generated_at:
                    this.getValue(
                        documentItem,
                        [
                            "generated_at",
                            "created_at",
                            "date"
                        ],
                        ""
                    ),

                generated_by:
                    this.getValue(
                        documentItem,
                        [
                            "generated_by",
                            "created_by",
                            "officer"
                        ],
                        ""
                    ),

                version:
                    this.getValue(
                        documentItem,
                        [
                            "version",
                            "revision"
                        ],
                        ""
                    ),

                status:
                    this.getValue(
                        documentItem,
                        [
                            "status",
                            "review_status"
                        ],
                        "Generated"
                    ),

                view_url:
                    this.getValue(
                        documentItem,
                        [
                            "view_url",
                            "url",
                            "document_url"
                        ],
                        ""
                    ),

                download_url:
                    this.getValue(
                        documentItem,
                        [
                            "download_url",
                            "file_url"
                        ],
                        ""
                    )
            };
        },

        normalizeStatuses(
            statuses,
            documents
        ) {
            const normalized = {};

            if (
                statuses &&
                typeof statuses === "object" &&
                !Array.isArray(statuses)
            ) {
                Object.keys(statuses).forEach(
                    (key) => {
                        const value =
                            statuses[key];

                        if (
                            typeof value === "string"
                        ) {
                            normalized[key] =
                                {
                                    status: value
                                };
                        } else {
                            normalized[key] =
                                value || {};
                        }
                    }
                );
            }

            documents.forEach(
                (documentItem) => {
                    const type =
                        documentItem.document_type;

                    if (!normalized[type]) {
                        normalized[type] = {
                            status:
                                documentItem.status ||
                                "Generated",
                            document:
                                documentItem
                        };
                    }
                }
            );

            return normalized;
        },

        renderDocumentStatuses() {
            this.elements.documentCards.forEach(
                (card) => {
                    const type =
                        card.dataset.documentType || "";

                    if (!type) {
                        return;
                    }

                    const statusData =
                        this.findStatusForType(
                            type
                        );

                    this.updateDocumentCard(
                        card,
                        statusData
                    );
                }
            );
        },

        findStatusForType(type) {
            const direct =
                this.state.documentStatuses[type];

            if (direct) {
                return direct;
            }

            const normalizedType =
                this.normalizeType(type);

            const key =
                Object.keys(
                    this.state.documentStatuses
                ).find(
                    (candidate) =>
                        this.normalizeType(
                            candidate
                        ) === normalizedType
                );

            if (key) {
                return this.state.documentStatuses[
                    key
                ];
            }

            const document =
                this.state.generatedDocuments.find(
                    (item) =>
                        this.normalizeType(
                            item.document_type
                        ) === normalizedType
                );

            return document
                ? {
                      status:
                          document.status,
                      document
                  }
                : null;
        },

        updateDocumentCard(
            card,
            statusData
        ) {
            if (!statusData) {
                return;
            }

            const document =
                statusData.document ||
                this.findLatestDocument(
                    card.dataset.documentType
                );

            const status =
                statusData.status ||
                document?.status ||
                "Generated";

            const statusElement =
                card.querySelector(
                    ".document-status"
                );

            if (statusElement) {
                statusElement.textContent =
                    this.humanizeStatus(
                        status
                    );

                statusElement.className =
                    `document-status ${this.getStatusClass(
                        status
                    )}`;
            }

            const viewButton =
                card.querySelector(
                    "[data-action='view-document']"
                );

            const downloadButton =
                card.querySelector(
                    "[data-action='download-document']"
                );

            if (document) {
                if (viewButton) {
                    this.configureActionButton(
                        viewButton,
                        document.view_url ||
                            document.url,
                        document.id
                    );
                }

                if (downloadButton) {
                    this.configureActionButton(
                        downloadButton,
                        document.download_url ||
                            document.file_url,
                        document.id
                    );
                }
            }
        },

        findLatestDocument(type) {
            const normalizedType =
                this.normalizeType(type);

            const matching =
                this.state.generatedDocuments
                    .filter(
                        (documentItem) =>
                            this.normalizeType(
                                documentItem.document_type
                            ) === normalizedType
                    )
                    .sort(
                        (a, b) =>
                            this.parseDate(
                                b.generated_at
                            ) -
                            this.parseDate(
                                a.generated_at
                            )
                    );

            return matching[0] || null;
        },

        configureActionButton(
            button,
            url,
            documentId
        ) {
            if (!button) {
                return;
            }

            if (url) {
                button.disabled = false;
                button.dataset.documentUrl =
                    url;
            } else if (documentId) {
                button.disabled = false;
                button.dataset.documentId =
                    documentId;
            } else {
                button.disabled = true;
            }
        },

        renderHistory() {
            const documents =
                this.getFilteredHistory();

            if (this.elements.historyTable) {
                this.renderHistoryTable(
                    documents
                );
            }

            if (this.elements.historyMobile) {
                this.renderHistoryMobile(
                    documents
                );
            }

            if (
                this.elements.noDocuments
            ) {
                this.elements.noDocuments.hidden =
                    documents.length !== 0;
            }
        },

        renderHistoryTable(
            documents
        ) {
            const tbody =
                this.elements.historyTable;

            if (!tbody) {
                return;
            }

            if (!documents.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="reports-empty-history">
                                No generated documents match your search.
                            </div>
                        </td>
                    </tr>
                `;

                return;
            }

            tbody.innerHTML =
                documents
                    .map(
                        (documentItem) =>
                            this.renderHistoryRow(
                                documentItem
                            )
                    )
                    .join("");
        },

        renderHistoryRow(
            documentItem
        ) {
            const statusClass =
                this.getStatusClass(
                    documentItem.status
                );

            return `
                <tr
                    data-history-document
                    data-document-id="${this.escapeAttribute(
                        documentItem.id
                    )}"
                >
                    <td>
                        <span class="history-document-name">
                            ${this.escapeHtml(
                                documentItem.title
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="history-generated-date">
                            ${this.escapeHtml(
                                this.formatDate(
                                    documentItem.generated_at
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="history-generated-by">
                            ${this.escapeHtml(
                                documentItem.generated_by ||
                                    "—"
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="history-version">
                            ${this.escapeHtml(
                                documentItem.version ||
                                    "—"
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="history-status ${statusClass}">
                            ${this.escapeHtml(
                                this.humanizeStatus(
                                    documentItem.status
                                )
                            )}
                        </span>
                    </td>

                    <td>
                        <div class="history-actions">
                            <button
                                type="button"
                                class="btn btn-sm btn-secondary"
                                data-action="view-history-document"
                                data-document-id="${this.escapeAttribute(
                                    documentItem.id
                                )}"
                                ${
                                    documentItem.view_url
                                        ? `data-document-url="${this.escapeAttribute(
                                              documentItem.view_url
                                          )}"`
                                        : ""
                                }
                            >
                                View
                            </button>

                            <button
                                type="button"
                                class="btn btn-sm btn-secondary"
                                data-action="download-history-document"
                                data-document-id="${this.escapeAttribute(
                                    documentItem.id
                                )}"
                                ${
                                    documentItem.download_url
                                        ? `data-document-url="${this.escapeAttribute(
                                              documentItem.download_url
                                          )}"`
                                        : ""
                                }
                            >
                                Download
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        },

        renderHistoryMobile(
            documents
        ) {
            const container =
                this.elements.historyMobile;

            if (!container) {
                return;
            }

            if (!documents.length) {
                container.innerHTML = "";
                return;
            }

            container.innerHTML =
                documents
                    .map(
                        (documentItem) =>
                            `
                                <article
                                    class="history-mobile-card"
                                    data-history-document
                                    data-document-id="${this.escapeAttribute(
                                        documentItem.id
                                    )}"
                                >
                                    <div class="history-mobile-card-header">
                                        <h4 class="history-mobile-card-title">
                                            ${this.escapeHtml(
                                                documentItem.title
                                            )}
                                        </h4>

                                        <span class="history-status ${this.getStatusClass(
                                            documentItem.status
                                        )}">
                                            ${this.escapeHtml(
                                                this.humanizeStatus(
                                                    documentItem.status
                                                )
                                            )}
                                        </span>
                                    </div>

                                    <div class="history-mobile-card-meta">
                                        <div class="history-mobile-meta-item">
                                            <span class="history-mobile-meta-label">
                                                Generated
                                            </span>
                                            <span class="history-mobile-meta-value">
                                                ${this.escapeHtml(
                                                    this.formatDate(
                                                        documentItem.generated_at
                                                    )
                                                )}
                                            </span>
                                        </div>

                                        <div class="history-mobile-meta-item">
                                            <span class="history-mobile-meta-label">
                                                Generated by
                                            </span>
                                            <span class="history-mobile-meta-value">
                                                ${this.escapeHtml(
                                                    documentItem.generated_by ||
                                                        "—"
                                                )}
                                            </span>
                                        </div>

                                        <div class="history-mobile-meta-item">
                                            <span class="history-mobile-meta-label">
                                                Version
                                            </span>
                                            <span class="history-mobile-meta-value">
                                                ${this.escapeHtml(
                                                    documentItem.version ||
                                                        "—"
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="history-mobile-card-actions">
                                        <button
                                            type="button"
                                            class="btn btn-sm btn-secondary"
                                            data-action="view-history-document"
                                            data-document-id="${this.escapeAttribute(
                                                documentItem.id
                                            )}"
                                            ${
                                                documentItem.view_url
                                                    ? `data-document-url="${this.escapeAttribute(
                                                          documentItem.view_url
                                                      )}"`
                                                    : ""
                                            }
                                        >
                                            View
                                        </button>

                                        <button
                                            type="button"
                                            class="btn btn-sm btn-secondary"
                                            data-action="download-history-document"
                                            data-document-id="${this.escapeAttribute(
                                                documentItem.id
                                            )}"
                                            ${
                                                documentItem.download_url
                                                    ? `data-document-url="${this.escapeAttribute(
                                                          documentItem.download_url
                                                      )}"`
                                                    : ""
                                            }
                                        >
                                            Download
                                        </button>
                                    </div>
                                </article>
                            `
                    )
                    .join("");
        },

        bindHistoryActions() {
            document
                .querySelectorAll(
                    "[data-action='view-history-document']"
                )
                .forEach(
                    (button) => {
                        if (
                            button.dataset.bound ===
                            "true"
                        ) {
                            return;
                        }

                        button.dataset.bound =
                            "true";

                        button.addEventListener(
                            "click",
                            (event) => {
                                event.preventDefault();

                                this.openDocumentFromElement(
                                    button
                                );
                            }
                        );
                    }
                );

            document
                .querySelectorAll(
                    "[data-action='download-history-document']"
                )
                .forEach(
                    (button) => {
                        if (
                            button.dataset.bound ===
                            "true"
                        ) {
                            return;
                        }

                        button.dataset.bound =
                            "true";

                        button.addEventListener(
                            "click",
                            (event) => {
                                event.preventDefault();

                                this.downloadDocumentFromElement(
                                    button
                                );
                            }
                        );
                    }
                );
        },

        filterHistory() {
            this.renderHistory();
            this.bindHistoryActions();
        },

        getFilteredHistory() {
            const search =
                this.state.search.toLowerCase();

            if (!search) {
                return [
                    ...this.state.generatedDocuments
                ];
            }

            return this.state.generatedDocuments.filter(
                (documentItem) => {
                    const searchable =
                        [
                            documentItem.title,
                            documentItem.document_type,
                            documentItem.generated_by,
                            documentItem.status,
                            documentItem.version
                        ]
                            .join(" ")
                            .toLowerCase();

                    return searchable.includes(
                        search
                    );
                }
            );
        },

        async generateDocument(
            documentType,
            button
        ) {
            const endpoint =
                this.getGenerateEndpoint();

            if (!endpoint) {
                this.showActionError(
                    "Document generation API endpoint is not configured."
                );
                return;
            }

            if (
                this.state.actionLoading
            ) {
                return;
            }

            this.state.actionLoading =
                true;

            this.setButtonLoading(
                button,
                true,
                "Generating…"
            );

            this.clearActionError();

            try {
                const caseId =
                    this.elements.page.dataset.caseId ||
                    "";

                const payload = {
                    document_type:
                        documentType
                };

                if (caseId) {
                    payload.case_id =
                        caseId;
                }

                const api =
                    window.IOApi ||
                    window.api;

                let response;

                if (
                    api &&
                    typeof api.post ===
                        "function"
                ) {
                    response =
                        await api.post(
                            endpoint,
                            payload
                        );
                } else {
                    response =
                        await this.postJson(
                            endpoint,
                            payload
                        );
                }

                const data =
                    this.unwrapResponse(
                        response
                    );

                const documentItem =
                    this.normalizeDocument(
                        data.document ||
                            data.result ||
                            data,
                        this.state
                            .generatedDocuments
                            .length
                    );

                if (
                    documentItem &&
                    (
                        documentItem.id ||
                        documentItem.title
                    )
                ) {
                    this.upsertDocument(
                        documentItem
                    );
                }

                this.renderDocumentStatuses();
                this.renderHistory();
                this.bindHistoryActions();

                this.showSuccess(
                    data.message ||
                        `${this.getDocumentLabel(
                            documentType
                        )} generation request completed.`
                );

                if (
                    data.view_url ||
                    data.download_url
                ) {
                    this.openGeneratedDocumentActions(
                        data
                    );
                }
            } catch (error) {
                this.showActionError(
                    error?.message ||
                        "Unable to generate the document."
                );

                console.error(
                    "IO Assistant document generation error:",
                    error
                );
            } finally {
                this.state.actionLoading =
                    false;

                this.setButtonLoading(
                    button,
                    false
                );
            }
        },

        openGeneratedDocumentActions(
            data
        ) {
            const url =
                data.view_url ||
                data.url ||
                "";

            if (
                url &&
                this.isSafeHttpUrl(
                    url
                )
            ) {
                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );
            }
        },

        openDocumentFromElement(
            element
        ) {
            if (!element) {
                return;
            }

            const url =
                element.dataset.documentUrl ||
                "";

            const documentId =
                element.dataset.documentId ||
                "";

            if (url) {
                this.openUrl(
                    url
                );

                return;
            }

            const documentItem =
                this.findDocumentById(
                    documentId
                );

            if (
                documentItem?.view_url
            ) {
                this.openUrl(
                    documentItem.view_url
                );

                return;
            }

            this.selectDocument(
                documentId
            );

            this.showActionError(
                "A view link is not available for this document."
            );
        },

        downloadDocumentFromElement(
            element
        ) {
            if (!element) {
                return;
            }

            const url =
                element.dataset.documentUrl ||
                "";

            const documentId =
                element.dataset.documentId ||
                "";

            if (url) {
                this.downloadUrl(
                    url
                );

                return;
            }

            const documentItem =
                this.findDocumentById(
                    documentId
                );

            if (
                documentItem?.download_url
            ) {
                this.downloadUrl(
                    documentItem.download_url
                );

                return;
            }

            this.selectDocument(
                documentId
            );

            this.showActionError(
                "A download link is not available for this document."
            );
        },

        openSelectedDocument() {
            const documentItem =
                this.state.selectedDocument;

            if (!documentItem) {
                this.showActionError(
                    "Select a generated document first."
                );
                return;
            }

            if (
                documentItem.view_url
            ) {
                this.openUrl(
                    documentItem.view_url
                );
                return;
            }

            const endpoint =
                this.getDocumentActionEndpoint(
                    "view"
                );

            if (!endpoint) {
                this.showActionError(
                    "A document view endpoint is not configured."
                );
                return;
            }

            this.openDocumentViaApi(
                endpoint,
                documentItem.id
            );
        },

        async openDocumentViaApi(
            endpoint,
            documentId
        ) {
            try {
                const url =
                    this.buildDocumentEndpoint(
                        endpoint,
                        documentId
                    );

                const api =
                    window.IOApi ||
                    window.api;

                const response =
                    api &&
                    typeof api.get ===
                        "function"
                        ? await api.get(url)
                        : await this.fetchJson(
                              url
                          );

                const data =
                    this.unwrapResponse(
                        response
                    );

                const target =
                    data.view_url ||
                    data.url ||
                    data.document_url ||
                    "";

                if (
                    target &&
                    this.isSafeHttpUrl(
                        target
                    )
                ) {
                    this.openUrl(
                        target
                    );
                } else {
                    this.showActionError(
                        "The server did not return a valid document view URL."
                    );
                }
            } catch (error) {
                this.showActionError(
                    error?.message ||
                        "Unable to open the document."
                );
            }
        },

        async requestRevision() {
            const documentItem =
                this.state.selectedDocument;

            if (!documentItem) {
                this.showActionError(
                    "Select a generated document before requesting revision."
                );
                return;
            }

            const endpoint =
                this.getReviewEndpoint();

            if (!endpoint) {
                this.showActionError(
                    "Document review API endpoint is not configured."
                );
                return;
            }

            const notes =
                this.elements.reviewNotes
                    ? this.elements.reviewNotes.value.trim()
                    : "";

            if (!notes) {
                this.showActionError(
                    "Enter review notes before requesting a revision."
                );

                if (
                    this.elements.reviewNotes
                ) {
                    this.elements.reviewNotes.focus();
                }

                return;
            }

            await this.submitReviewAction(
                endpoint,
                {
                    document_id:
                        documentItem.id,
                    action:
                        "revision_requested",
                    review_notes:
                        notes
                },
                "Revision request submitted."
            );
        },

        async markReviewed() {
            const documentItem =
                this.state.selectedDocument;

            if (!documentItem) {
                this.showActionError(
                    "Select a generated document before marking it as reviewed."
                );
                return;
            }

            const endpoint =
                this.getReviewEndpoint();

            if (!endpoint) {
                this.showActionError(
                    "Document review API endpoint is not configured."
                );
                return;
            }

            const notes =
                this.elements.reviewNotes
                    ? this.elements.reviewNotes.value.trim()
                    : "";

            await this.submitReviewAction(
                endpoint,
                {
                    document_id:
                        documentItem.id,
                    action:
                        "reviewed",
                    review_notes:
                        notes
                },
                "Document marked as reviewed."
            );
        },

        async submitReviewAction(
            endpoint,
            payload,
            successMessage
        ) {
            try {
                this.setReviewLoading(
                    true
                );

                const api =
                    window.IOApi ||
                    window.api;

                let response;

                if (
                    api &&
                    typeof api.post ===
                        "function"
                ) {
                    response =
                        await api.post(
                            endpoint,
                            payload
                        );
                } else {
                    response =
                        await this.postJson(
                            endpoint,
                            payload
                        );
                }

                const data =
                    this.unwrapResponse(
                        response
                    );

                if (
                    this.state.selectedDocument
                ) {
                    this.state.selectedDocument.status =
                        data.status ||
                        (
                            payload.action ===
                            "reviewed"
                                ? "Reviewed"
                                : "Revision Requested"
                        );
                }

                this.renderHistory();
                this.renderDocumentStatuses();
                this.bindHistoryActions();

                this.showSuccess(
                    data.message ||
                        successMessage
                );
            } catch (error) {
                this.showActionError(
                    error?.message ||
                        "Unable to save the document review."
                );

                console.error(
                    "IO Assistant document review error:",
                    error
                );
            } finally {
                this.setReviewLoading(
                    false
                );
            }
        },

        selectDocument(
            documentId
        ) {
            const documentItem =
                this.findDocumentById(
                    documentId
                );

            if (!documentItem) {
                return;
            }

            this.state.selectedDocument =
                documentItem;

            if (
                this.elements.review
            ) {
                this.elements.review.hidden =
                    false;
            }

            if (
                this.elements.selectedDocument
            ) {
                this.elements.selectedDocument.innerHTML = `
                    <div class="selected-document-icon"
                         aria-hidden="true">
                        DOC
                    </div>

                    <div class="selected-document-information">
                        <h4 class="selected-document-title">
                            ${this.escapeHtml(
                                documentItem.title
                            )}
                        </h4>

                        <div class="selected-document-meta">
                            <span class="selected-document-meta-item">
                                ${this.escapeHtml(
                                    this.humanizeStatus(
                                        documentItem.status
                                    )
                                )}
                            </span>

                            <span class="selected-document-meta-item">
                                ${this.escapeHtml(
                                    this.formatDate(
                                        documentItem.generated_at
                                    )
                                )}
                            </span>
                        </div>
                    </div>
                `;
            }

            if (
                this.elements.reviewStatus
            ) {
                this.elements.reviewStatus.textContent =
                    this.humanizeStatus(
                        documentItem.status
                    );

                this.elements.reviewStatus.className =
                    `review-status ${this.getStatusClass(
                        documentItem.status
                    )}`;
            }
        },

        findDocumentById(
            documentId
        ) {
            return this.state.generatedDocuments.find(
                (documentItem) =>
                    String(
                        documentItem.id
                    ) ===
                    String(
                        documentId
                    )
            );
        },

        upsertDocument(
            documentItem
        ) {
            if (!documentItem) {
                return;
            }

            const existingIndex =
                this.state.generatedDocuments.findIndex(
                    (item) =>
                        String(
                            item.id
                        ) ===
                        String(
                            documentItem.id
                        )
                );

            if (
                existingIndex >= 0
            ) {
                this.state.generatedDocuments[
                    existingIndex
                ] = {
                    ...this.state
                        .generatedDocuments[
                        existingIndex
                    ],
                    ...documentItem
                };
            } else {
                this.state.generatedDocuments.unshift(
                    documentItem
                );
            }
        },

        setReviewLoading(
            loading
        ) {
            [
                this.elements.requestRevision,
                this.elements.markReviewed
            ].forEach(
                (button) => {
                    if (!button) {
                        return;
                    }

                    button.disabled =
                        loading;

                    button.setAttribute(
                        "aria-busy",
                        loading
                            ? "true"
                            : "false"
                    );
                }
            );
        },

        setButtonLoading(
            button,
            loading,
            text
        ) {
            if (!button) {
                return;
            }

            if (loading) {
                button.dataset.originalText =
                    button.textContent;

                button.disabled =
                    true;

                button.setAttribute(
                    "aria-busy",
                    "true"
                );

                if (text) {
                    button.textContent =
                        text;
                }
            } else {
                button.disabled =
                    false;

                button.removeAttribute(
                    "aria-busy"
                );

                if (
                    button.dataset.originalText
                ) {
                    button.textContent =
                        button.dataset.originalText;

                    delete button.dataset
                        .originalText;
                }
            }
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset
                    .reportsEndpoint ||
                this.elements.page.dataset
                    .apiEndpoint ||
                ""
            );
        },

        getGenerateEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset
                    .generateEndpoint ||
                this.elements.page.dataset
                    .documentGenerateEndpoint ||
                ""
            );
        },

        getReviewEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset
                    .reviewEndpoint ||
                this.elements.page.dataset
                    .documentReviewEndpoint ||
                ""
            );
        },

        getDocumentActionEndpoint(
            action
        ) {
            if (!this.elements.page) {
                return "";
            }

            if (action === "view") {
                return (
                    this.elements.page.dataset
                        .documentViewEndpoint ||
                    ""
                );
            }

            if (action === "download") {
                return (
                    this.elements.page.dataset
                        .documentDownloadEndpoint ||
                    ""
                );
            }

            return "";
        },

        buildDocumentEndpoint(
            endpoint,
            documentId
        ) {
            const encodedId =
                encodeURIComponent(
                    documentId
                );

            if (
                endpoint.includes(
                    "{id}"
                )
            ) {
                return endpoint.replace(
                    "{id}",
                    encodedId
                );
            }

            if (
                endpoint.endsWith("/")
            ) {
                return (
                    endpoint +
                    encodedId +
                    "/"
                );
            }

            return (
                endpoint +
                "/" +
                encodedId +
                "/"
            );
        },

        getDocumentLabel(
            type
        ) {
            const normalized =
                this.normalizeType(
                    type
                );

            const labels = {
                purvanichargesheet:
                    "Purvani Chargesheet",

                medicaltreatmentletter:
                    "Medical Treatment Letter",

                policecustodyremandrequest:
                    "Police Custody Remand Request",

                seizurereceipt:
                    "Seizure Receipt",

                courtcustodyletter:
                    "Court Custody Letter",

                accusedpanchanama:
                    "Accused Panchanama",

                accusedfaceidentificationform:
                    "Accused Face Identification Form"
            };

            return (
                labels[normalized] ||
                this.humanize(
                    type
                ) ||
                "Document"
            );
        },

        humanizeStatus(
            status
        ) {
            if (!status) {
                return "Not Generated";
            }

            return String(status)
                .replace(
                    /[_-]+/g,
                    " "
                )
                .replace(
                    /\b\w/g,
                    (letter) =>
                        letter.toUpperCase()
                );
        },

        getStatusClass(
            status
        ) {
            const normalized =
                this.normalizeType(
                    status
                );

            if (
                normalized.includes(
                    "review"
                ) &&
                !normalized.includes(
                    "revision"
                )
            ) {
                return "document-status--reviewed";
            }

            if (
                normalized.includes(
                    "revision"
                ) ||
                normalized.includes(
                    "reject"
                )
            ) {
                return "document-status--revision";
            }

            if (
                normalized.includes(
                    "pending"
                ) ||
                normalized.includes(
                    "generating"
                )
            ) {
                return "document-status--pending";
            }

            if (
                normalized.includes(
                    "error"
                ) ||
                normalized.includes(
                    "failed"
                )
            ) {
                return "document-status--error";
            }

            if (
                normalized.includes(
                    "generated"
                ) ||
                normalized.includes(
                    "complete"
                ) ||
                normalized.includes(
                    "ready"
                )
            ) {
                return "document-status--generated";
            }

            return "document-status--neutral";
        },

        normalizeType(
            value
        ) {
            return String(
                value || ""
            )
                .toLowerCase()
                .trim()
                .replace(
                    /[\s_-]+/g,
                    ""
                );
        },

        formatDate(
            value
        ) {
            if (!value) {
                return "—";
            }

            const date =
                this.parseDate(
                    value
                );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(
                    value
                );
            }

            return new Intl.DateTimeFormat(
                undefined,
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            ).format(date);
        },

        parseDate(
            value
        ) {
            if (!value) {
                return new Date(
                    0
                );
            }

            const date =
                new Date(
                    value
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {
                return date;
            }

            return new Date(
                0
            );
        },

        openUrl(
            url
        ) {
            if (
                !this.isSafeHttpUrl(
                    url
                )
            ) {
                this.showActionError(
                    "The document URL is not valid."
                );
                return;
            }

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        },

        downloadUrl(
            url
        ) {
            if (
                !this.isSafeHttpUrl(
                    url
                )
            ) {
                this.showActionError(
                    "The document download URL is not valid."
                );
                return;
            }

            const anchor =
                document.createElement(
                    "a"
                );

            anchor.href =
                url;

            anchor.target =
                "_blank";

            anchor.rel =
                "noopener noreferrer";

            anchor.download =
                "";

            document.body.appendChild(
                anchor
            );

            anchor.click();

            anchor.remove();
        },

        isSafeHttpUrl(
            value
        ) {
            try {
                const url =
                    new URL(
                        value,
                        window.location.origin
                    );

                return (
                    url.protocol ===
                        "http:" ||
                    url.protocol ===
                        "https:"
                );
            } catch (error) {
                return false;
            }
        },

        showInitialState() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }
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

            if (this.elements.noDocuments) {
                this.elements.noDocuments.hidden =
                    true;
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
        },

        showNoDocuments() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.noDocuments) {
                this.elements.noDocuments.hidden =
                    false;
            }
        },

        showError(
            message
        ) {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    false;
            }

            if (
                this.elements.errorMessage
            ) {
                this.elements.errorMessage.textContent =
                    message;
            }

            this.showActionError(
                message
            );
        },

        clearError() {
            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (
                this.elements.errorMessage
            ) {
                this.elements.errorMessage.textContent =
                    "";
            }
        },

        showSuccess(
            message
        ) {
            if (this.elements.success) {
                this.elements.success.hidden =
                    false;

                if (
                    this.elements.successMessage
                ) {
                    this.elements.successMessage.textContent =
                        message;
                }
            }

            if (this.elements.message) {
                this.elements.message.hidden =
                    false;

                this.elements.message.textContent =
                    message;

                this.elements.message.dataset.messageType =
                    "success";
            }
        },

        showActionError(
            message
        ) {
            if (this.elements.actionError) {
                this.elements.actionError.hidden =
                    false;

                if (
                    this.elements.actionErrorMessage
                ) {
                    this.elements.actionErrorMessage.textContent =
                        message;
                }
            }

            if (this.elements.message) {
                this.elements.message.hidden =
                    false;

                this.elements.message.textContent =
                    message;

                this.elements.message.dataset.messageType =
                    "error";
            }
        },

        clearActionError() {
            if (this.elements.actionError) {
                this.elements.actionError.hidden =
                    true;
            }

            if (
                this.elements.actionErrorMessage
            ) {
                this.elements.actionErrorMessage.textContent =
                    "";
            }
        },

        async fetchJson(
            url
        ) {
            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        credentials:
                            "same-origin",
                        headers: {
                            Accept:
                                "application/json"
                        }
                    }
                );

            const text =
                await response.text();

            let data = null;

            if (text) {
                try {
                    data =
                        JSON.parse(
                            text
                        );
                } catch (error) {
                    data =
                        text;
                }
            }

            if (!response.ok) {
                throw new Error(
                    this.getErrorMessage(
                        data
                    ) ||
                        response.statusText ||
                        "Request failed."
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

        async postJson(
            url,
            payload
        ) {
            const csrfToken =
                this.getCsrfToken();

            const headers = {
                "Content-Type":
                    "application/json",
                Accept:
                    "application/json"
            };

            if (csrfToken) {
                headers[
                    "X-CSRFToken"
                ] = csrfToken;
            }

            const response =
                await fetch(
                    url,
                    {
                        method:
                            "POST",
                        credentials:
                            "same-origin",
                        headers,
                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );

            const text =
                await response.text();

            let data = null;

            if (text) {
                try {
                    data =
                        JSON.parse(
                            text
                        );
                } catch (error) {
                    data =
                        text;
                }
            }

            if (!response.ok) {
                throw new Error(
                    this.getErrorMessage(
                        data
                    ) ||
                        response.statusText ||
                        "Request failed."
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

        getCsrfToken() {
            const input =
                document.querySelector(
                    "input[name='csrfmiddlewaretoken']"
                );

            if (
                input &&
                input.value
            ) {
                return input.value;
            }

            const meta =
                document.querySelector(
                    "meta[name='csrf-token']"
                );

            if (
                meta &&
                meta.content
            ) {
                return meta.content;
            }

            return (
                document.body.dataset
                    .csrfToken ||
                ""
            );
        },

        unwrapResponse(
            response
        ) {
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

        getValue(
            object,
            keys,
            fallback = ""
        ) {
            if (
                !object ||
                typeof object !==
                    "object"
            ) {
                return fallback;
            }

            for (const key of keys) {
                if (
                    object[key] !==
                        undefined &&
                    object[key] !==
                        null &&
                    object[key] !==
                        ""
                ) {
                    return object[key];
                }
            }

            return fallback;
        },

        getErrorMessage(
            data
        ) {
            if (!data) {
                return "";
            }

            if (
                typeof data ===
                "string"
            ) {
                return data;
            }

            if (
                typeof data !==
                "object"
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
                    Array.isArray(
                        value
                    ) &&
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
        },

        escapeHtml(
            value
        ) {
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

        escapeAttribute(
            value
        ) {
            return this.escapeHtml(
                value
            )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#39;"
                );
        },

        debounce(
            callback,
            delay = 250
        ) {
            let timer = null;

            return function (...args) {
                window.clearTimeout(
                    timer
                );

                timer =
                    window.setTimeout(
                        () => {
                            callback.apply(
                                this,
                                args
                            );
                        },
                        delay
                    );
            };
        }
    };

    function initializeReports() {
        Reports.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeReports,
            {
                once: true
            }
        );
    } else {
        initializeReports();
    }

    window.IOReports = Reports;

})(window, document);