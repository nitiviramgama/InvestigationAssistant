(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Cases JavaScript
     *
     * File:
     * static/js/cases.js
     *
     * Responsibilities:
     * - Load case list from Django JSON API
     * - Search cases
     * - Filter by status and date
     * - Sort cases
     * - Render table/mobile case cards
     * - Handle pagination
     * - Handle loading, empty and error states
     * - Preserve clear, stable DOM selectors
     *
     * Shared API helper:
     * static/js/api.js
     */

    const Cases = {
        elements: {},
        state: {
            cases: [],
            loading: false,
            error: null,
            page: 1,
            pageSize: 20,
            total: 0,
            filters: {
                search: "",
                status: "",
                dateFrom: "",
                dateTo: "",
                sort: ""
            }
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.readInitialFilters();
            this.bindEvents();
            this.loadCases();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector(".case-list-page") ||
                document.querySelector("[data-case-list-page]");

            this.elements.search =
                document.querySelector("[data-case-search]");

            this.elements.status =
                document.querySelector("[data-case-status-filter]");

            this.elements.dateFrom =
                document.querySelector("[data-case-date-from]");

            this.elements.dateTo =
                document.querySelector("[data-case-date-to]");

            this.elements.sort =
                document.querySelector("[data-case-sort]");

            this.elements.reset =
                document.querySelector(
                    "[data-case-filter-reset]"
                ) ||
                document.querySelector(
                    "[data-action='reset-case-filters']"
                );

            this.elements.refresh =
                document.querySelector(
                    "[data-case-refresh]"
                ) ||
                document.querySelector(
                    "[data-action='refresh-cases']"
                );

            this.elements.loading =
                document.querySelector(".case-list-loading");

            this.elements.error =
                document.querySelector(".case-list-error");

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                        "[data-error-message]"
                    )
                    : null;

            this.elements.empty =
                document.querySelector(".case-list-empty");

            this.elements.tableWrapper =
                document.querySelector(
                    "[data-case-table-wrapper]"
                ) ||
                document.querySelector(".case-table-wrapper");

            this.elements.tableBody =
                document.querySelector(
                    "[data-case-table-body]"
                ) ||
                document.querySelector(
                    ".case-table tbody"
                );

            this.elements.mobileList =
                document.querySelector(
                    "[data-case-mobile-list]"
                ) ||
                document.querySelector(
                    ".case-mobile-list"
                );

            this.elements.resultsSummary =
                document.querySelector(
                    "[data-case-results-summary]"
                );

            this.elements.resultsCount =
                document.querySelector(
                    "[data-case-results-count]"
                );

            this.elements.resultsMeta =
                document.querySelector(
                    "[data-case-results-meta]"
                );

            this.elements.pagination =
                document.querySelector(
                    "[data-case-pagination]"
                ) ||
                document.querySelector(
                    ".case-pagination"
                );

            this.elements.paginationInfo =
                document.querySelector(
                    "[data-case-pagination-info]"
                ) ||
                document.querySelector(
                    ".case-pagination-info"
                );

            this.elements.paginationControls =
                document.querySelector(
                    "[data-case-pagination-controls]"
                ) ||
                document.querySelector(
                    ".case-pagination-controls"
                );

            this.elements.message =
                document.querySelector(
                    "[data-case-message]"
                );
        },

        bindEvents() {
            if (this.elements.search) {
                const handleSearch =
                    this.debounce(() => {
                        this.state.page = 1;
                        this.state.filters.search =
                            this.elements.search.value.trim();

                        this.loadCases();
                    }, 350);

                this.elements.search.addEventListener(
                    "input",
                    handleSearch
                );

                this.elements.search.addEventListener(
                    "keydown",
                    (event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();

                            this.state.page = 1;
                            this.state.filters.search =
                                this.elements.search.value.trim();

                            this.loadCases();
                        }
                    }
                );
            }

            if (this.elements.status) {
                this.elements.status.addEventListener(
                    "change",
                    () => {
                        this.state.page = 1;
                        this.state.filters.status =
                            this.elements.status.value;

                        this.loadCases();
                    }
                );
            }

            if (this.elements.dateFrom) {
                this.elements.dateFrom.addEventListener(
                    "change",
                    () => {
                        this.state.page = 1;
                        this.state.filters.dateFrom =
                            this.elements.dateFrom.value;

                        this.loadCases();
                    }
                );
            }

            if (this.elements.dateTo) {
                this.elements.dateTo.addEventListener(
                    "change",
                    () => {
                        this.state.page = 1;
                        this.state.filters.dateTo =
                            this.elements.dateTo.value;

                        this.loadCases();
                    }
                );
            }

            if (this.elements.sort) {
                this.elements.sort.addEventListener(
                    "change",
                    () => {
                        this.state.page = 1;
                        this.state.filters.sort =
                            this.elements.sort.value;

                        this.loadCases();
                    }
                );
            }

            if (this.elements.reset) {
                this.elements.reset.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.resetFilters();
                    }
                );
            }

            if (this.elements.refresh) {
                this.elements.refresh.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.loadCases();
                    }
                );
            }

            if (this.elements.paginationControls) {
                this.elements.paginationControls.addEventListener(
                    "click",
                    (event) => {
                        const button =
                            event.target.closest(
                                "[data-page]"
                            );

                        if (!button) {
                            return;
                        }

                        event.preventDefault();

                        const page = Number(
                            button.dataset.page
                        );

                        if (
                            Number.isInteger(page) &&
                            page > 0 &&
                            page !== this.state.page
                        ) {
                            this.state.page = page;
                            this.loadCases();
                        }
                    }
                );
            }
        },

        readInitialFilters() {
            if (this.elements.search) {
                this.state.filters.search =
                    this.elements.search.value.trim();
            }

            if (this.elements.status) {
                this.state.filters.status =
                    this.elements.status.value;
            }

            if (this.elements.dateFrom) {
                this.state.filters.dateFrom =
                    this.elements.dateFrom.value;
            }

            if (this.elements.dateTo) {
                this.state.filters.dateTo =
                    this.elements.dateTo.value;
            }

            if (this.elements.sort) {
                this.state.filters.sort =
                    this.elements.sort.value;
            }

            const page = Number(
                this.elements.page.dataset.currentPage
            );

            if (Number.isInteger(page) && page > 0) {
                this.state.page = page;
            }

            const pageSize = Number(
                this.elements.page.dataset.pageSize
            );

            if (
                Number.isInteger(pageSize) &&
                pageSize > 0
            ) {
                this.state.pageSize = pageSize;
            }
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.casesEndpoint ||
                this.elements.page.dataset.apiEndpoint ||
                "/api/cases/"
            );
        },

        async loadCases() {
            const endpoint = this.getEndpoint();

            if (!endpoint) {
                this.showError(
                    "Cases API endpoint is not configured."
                );
                return;
            }

            this.state.loading = true;
            this.state.error = null;

            this.showLoading();
            this.clearError();

            try {
                const params = this.buildQueryParams();
                const url = this.buildUrl(
                    endpoint,
                    params
                );

                const api =
                    window.IOApi ||
                    window.api;

                let response;

                if (
                    api &&
                    typeof api.get === "function"
                ) {
                    response = await api.get(url);
                } else {
                    response = await this.fetchJson(url);
                }

                const data =
                    response && Object.prototype.hasOwnProperty.call(response, "data")
                        ? response.data
                        : response;

                const normalized =
                    this.normalizeResponse(data);

                this.state.cases =
                    normalized.items;

                this.state.total =
                    normalized.total;

                if (
                    normalized.page &&
                    normalized.page > 0
                ) {
                    this.state.page =
                        normalized.page;
                }

                if (
                    normalized.pageSize &&
                    normalized.pageSize > 0
                ) {
                    this.state.pageSize =
                        normalized.pageSize;
                }

                this.state.loading = false;

                this.renderCases();
                this.renderPagination();
                this.updateResultsSummary();

                this.showLoadedState();

                if (!this.state.cases.length) {
                    this.showEmpty();
                }

            } catch (error) {
                this.state.loading = false;
                this.state.error = error;

                this.showError(
                    error && error.message
                        ? error.message
                        : "Unable to load cases. Please try again."
                );

                console.error(
                    "IO Assistant cases error:",
                    error
                );
            }
        },

        buildQueryParams() {
            const params = {
                page: this.state.page,
                page_size: this.state.pageSize
            };

            const filters =
                this.state.filters;

            if (filters.search) {
                params.search =
                    filters.search;
            }

            if (filters.status) {
                params.status =
                    filters.status;
            }

            if (filters.dateFrom) {
                params.date_from =
                    filters.dateFrom;
            }

            if (filters.dateTo) {
                params.date_to =
                    filters.dateTo;
            }

            if (filters.sort) {
                params.sort =
                    filters.sort;
            }

            return params;
        },

        normalizeResponse(data) {
            if (Array.isArray(data)) {
                return {
                    items: data,
                    total: data.length,
                    page: 1,
                    pageSize: data.length || this.state.pageSize
                };
            }

            if (
                !data ||
                typeof data !== "object"
            ) {
                return {
                    items: [],
                    total: 0,
                    page: 1,
                    pageSize: this.state.pageSize
                };
            }

            let items = [];

            if (Array.isArray(data.results)) {
                items = data.results;
            } else if (
                Array.isArray(data.items)
            ) {
                items = data.items;
            } else if (
                Array.isArray(data.cases)
            ) {
                items = data.cases;
            } else if (
                data.data &&
                Array.isArray(data.data)
            ) {
                items = data.data;
            } else if (
                data.data &&
                Array.isArray(data.data.results)
            ) {
                items = data.data.results;
            } else if (
                data.data &&
                Array.isArray(data.data.cases)
            ) {
                items = data.data.cases;
            }

            const pagination =
                data.pagination ||
                (
                    data.data &&
                    typeof data.data === "object" &&
                    !Array.isArray(data.data)
                        ? data.data.pagination
                        : null
                ) ||
                {};

            const total =
                this.firstDefined([
                    data.count,
                    data.total,
                    data.total_count,
                    pagination.count,
                    pagination.total,
                    items.length
                ]);

            const page =
                this.firstDefined([
                    data.page,
                    pagination.page,
                    this.state.page
                ]);

            const pageSize =
                this.firstDefined([
                    data.page_size,
                    data.pageSize,
                    pagination.page_size,
                    pagination.pageSize,
                    this.state.pageSize
                ]);

            return {
                items: items,
                total: Number(total) || 0,
                page: Number(page) || 1,
                pageSize:
                    Number(pageSize) ||
                    this.state.pageSize
            };
        },

        renderCases() {
            if (this.elements.tableBody) {
                this.elements.tableBody.innerHTML =
                    this.state.cases
                        .map((caseItem) =>
                            this.renderTableRow(
                                caseItem
                            )
                        )
                        .join("");
            }

            if (this.elements.mobileList) {
                this.elements.mobileList.innerHTML =
                    this.state.cases
                        .map((caseItem) =>
                            this.renderMobileCard(
                                caseItem
                            )
                        )
                        .join("");
            }

            /*
             * Handle event delegation for dynamically rendered
             * case links/actions.
             */
            this.bindCaseLinks();
        },

        renderTableRow(caseItem) {
            const id =
                this.getValue(
                    caseItem,
                    ["id", "case_id"],
                    ""
                );

            const caseNumber =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "case_number",
                            "caseNumber",
                            "number"
                        ],
                        "—"
                    )
                );

            const title =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "title",
                            "name"
                        ],
                        "Untitled Case"
                    )
                );

            const description =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "description",
                            "summary"
                        ],
                        ""
                    )
                );

            const status =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "status",
                            "case_status"
                        ],
                        "Unknown"
                    )
                );

            const priority =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        ["priority"],
                        ""
                    )
                );

            const createdAt =
                this.getValue(
                    caseItem,
                    [
                        "created_at",
                        "created",
                        "date"
                    ],
                    ""
                );

            const updatedAt =
                this.getValue(
                    caseItem,
                    [
                        "updated_at",
                        "modified_at"
                    ],
                    ""
                );

            const url =
                this.getCaseUrl(
                    caseItem
                );

            return `
                <tr class="case-row"
                    data-case-row
                    data-case-id="${this.escapeAttribute(id)}">

                    <td class="case-number-cell">
                        <span class="case-number">
                            ${caseNumber}
                        </span>
                    </td>

                    <td class="case-title-cell">
                        ${
                            url
                                ? `
                                    <a class="case-title-link"
                                       href="${this.escapeAttribute(url)}">
                                        ${title}
                                    </a>
                                `
                                : `
                                    <span class="case-title-link">
                                        ${title}
                                    </span>
                                `
                        }

                        ${
                            description
                                ? `
                                    <p class="case-description">
                                        ${description}
                                    </p>
                                `
                                : ""
                        }
                    </td>

                    <td>
                        <span class="case-status
                                     case-status--${this.slugify(status)}">
                            ${status}
                        </span>
                    </td>

                    <td>
                        ${
                            priority
                                ? `
                                    <span class="case-priority
                                                 case-priority--${this.slugify(priority)}">
                                        ${priority}
                                    </span>
                                `
                                : "—"
                        }
                    </td>

                    <td>
                        <span class="case-date">
                            ${
                                createdAt
                                    ? this.escapeHtml(
                                        this.formatDate(
                                            createdAt
                                        )
                                    )
                                    : "—"
                            }
                        </span>
                    </td>

                    <td>
                        <span class="case-date">
                            ${
                                updatedAt
                                    ? this.escapeHtml(
                                        this.formatDate(
                                            updatedAt
                                        )
                                    )
                                    : "—"
                            }
                        </span>
                    </td>

                    <td class="case-actions-cell">
                        <div class="case-row-actions">
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
                        </div>
                    </td>
                </tr>
            `;
        },

        renderMobileCard(caseItem) {
            const id =
                this.getValue(
                    caseItem,
                    ["id", "case_id"],
                    ""
                );

            const caseNumber =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "case_number",
                            "caseNumber",
                            "number"
                        ],
                        "—"
                    )
                );

            const title =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "title",
                            "name"
                        ],
                        "Untitled Case"
                    )
                );

            const description =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "description",
                            "summary"
                        ],
                        ""
                    )
                );

            const status =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        [
                            "status",
                            "case_status"
                        ],
                        "Unknown"
                    )
                );

            const priority =
                this.escapeHtml(
                    this.getValue(
                        caseItem,
                        ["priority"],
                        ""
                    )
                );

            const createdAt =
                this.getValue(
                    caseItem,
                    [
                        "created_at",
                        "created",
                        "date"
                    ],
                    ""
                );

            const updatedAt =
                this.getValue(
                    caseItem,
                    [
                        "updated_at",
                        "modified_at"
                    ],
                    ""
                );

            const url =
                this.getCaseUrl(
                    caseItem
                );

            return `
                <article class="case-mobile-card"
                         data-case-card
                         data-case-id="${this.escapeAttribute(id)}">

                    <div class="case-mobile-card-header">
                        <div>
                            ${
                                url
                                    ? `
                                        <a class="case-mobile-card-title"
                                           href="${this.escapeAttribute(url)}">
                                            ${title}
                                        </a>
                                    `
                                    : `
                                        <h3 class="case-mobile-card-title">
                                            ${title}
                                        </h3>
                                    `
                            }

                            <span class="case-mobile-card-number">
                                ${caseNumber}
                            </span>
                        </div>

                        <span class="case-status
                                     case-status--${this.slugify(status)}">
                            ${status}
                        </span>
                    </div>

                    ${
                        description
                            ? `
                                <p class="case-mobile-card-description">
                                    ${description}
                                </p>
                            `
                            : ""
                    }

                    <div class="case-mobile-card-meta">
                        <div class="case-mobile-meta-item">
                            <span class="case-mobile-meta-label">
                                Created
                            </span>

                            <span class="case-mobile-meta-value">
                                ${
                                    createdAt
                                        ? this.escapeHtml(
                                            this.formatDate(
                                                createdAt
                                            )
                                        )
                                        : "—"
                                }
                            </span>
                        </div>

                        <div class="case-mobile-meta-item">
                            <span class="case-mobile-meta-label">
                                Updated
                            </span>

                            <span class="case-mobile-meta-value">
                                ${
                                    updatedAt
                                        ? this.escapeHtml(
                                            this.formatDate(
                                                updatedAt
                                            )
                                        )
                                        : "—"
                                }
                            </span>
                        </div>

                        ${
                            priority
                                ? `
                                    <div class="case-mobile-meta-item">
                                        <span class="case-mobile-meta-label">
                                            Priority
                                        </span>

                                        <span class="case-mobile-meta-value">
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
                                <div class="case-mobile-card-actions">
                                    <a class="btn btn--secondary"
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

        renderPagination() {
            if (
                !this.elements.paginationControls
            ) {
                return;
            }

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        this.state.total /
                        this.state.pageSize
                    )
                );

            if (
                this.state.total <=
                this.state.pageSize
            ) {
                this.elements.paginationControls.innerHTML =
                    "";
                this.elements.pagination.hidden =
                    true;
                return;
            }

            this.elements.pagination.hidden =
                false;

            const currentPage =
                Math.min(
                    Math.max(
                        this.state.page,
                        1
                    ),
                    totalPages
                );

            const buttons = [];

            if (currentPage > 1) {
                buttons.push(`
                    <button type="button"
                            class="btn btn--secondary btn--small"
                            data-page="${currentPage - 1}"
                            aria-label="Go to previous page">
                        Previous
                    </button>
                `);
            }

            const startPage =
                Math.max(
                    1,
                    currentPage - 2
                );

            const endPage =
                Math.min(
                    totalPages,
                    currentPage + 2
                );

            for (
                let page = startPage;
                page <= endPage;
                page += 1
            ) {
                buttons.push(`
                    <button type="button"
                            class="btn ${
                                page === currentPage
                                    ? "btn--primary"
                                    : "btn--secondary"
                            } btn--small"
                            data-page="${page}"
                            ${
                                page === currentPage
                                    ? 'aria-current="page"'
                                    : ""
                            }>
                        ${page}
                    </button>
                `);
            }

            if (currentPage < totalPages) {
                buttons.push(`
                    <button type="button"
                            class="btn btn--secondary btn--small"
                            data-page="${currentPage + 1}"
                            aria-label="Go to next page">
                        Next
                    </button>
                `);
            }

            this.elements.paginationControls.innerHTML =
                buttons.join("");

            if (this.elements.paginationInfo) {
                const start =
                    this.state.total === 0
                        ? 0
                        : (
                            (currentPage - 1) *
                            this.state.pageSize
                        ) + 1;

                const end =
                    Math.min(
                        currentPage *
                        this.state.pageSize,
                        this.state.total
                    );

                this.elements.paginationInfo.textContent =
                    `Showing ${start}–${end} of ${this.state.total} cases`;
            }
        },

        updateResultsSummary() {
            if (this.elements.resultsCount) {
                this.elements.resultsCount.textContent =
                    this.formatNumber(
                        this.state.total
                    );
            }

            if (this.elements.resultsMeta) {
                const activeFilters =
                    this.getActiveFilterCount();

                this.elements.resultsMeta.textContent =
                    activeFilters
                        ? `${activeFilters} filter${
                            activeFilters === 1
                                ? ""
                                : "s"
                        } applied`
                        : "";
            }

            if (
                this.elements.resultsSummary
            ) {
                this.elements.resultsSummary.hidden =
                    false;
            }
        },

        getActiveFilterCount() {
            let count = 0;

            Object.values(
                this.state.filters
            ).forEach((value) => {
                if (value) {
                    count += 1;
                }
            });

            return count;
        },

        resetFilters() {
            this.state.page = 1;

            this.state.filters = {
                search: "",
                status: "",
                dateFrom: "",
                dateTo: "",
                sort: ""
            };

            if (this.elements.search) {
                this.elements.search.value = "";
            }

            if (this.elements.status) {
                this.elements.status.value = "";
            }

            if (this.elements.dateFrom) {
                this.elements.dateFrom.value = "";
            }

            if (this.elements.dateTo) {
                this.elements.dateTo.value = "";
            }

            if (this.elements.sort) {
                this.elements.sort.value = "";
            }

            this.loadCases();
        },

        bindCaseLinks() {
            /*
             * Event delegation is intentionally light here.
             * Normal anchor navigation remains controlled by Django URLs.
             */
            const containers = [
                this.elements.tableBody,
                this.elements.mobileList
            ].filter(Boolean);

            containers.forEach((container) => {
                if (
                    container.dataset.caseLinksBound
                ) {
                    return;
                }

                container.dataset.caseLinksBound =
                    "true";

                container.addEventListener(
                    "click",
                    (event) => {
                        const link =
                            event.target.closest(
                                "a[data-case-url]"
                            );

                        if (!link) {
                            return;
                        }

                        const url =
                            link.dataset.caseUrl;

                        if (!url) {
                            event.preventDefault();
                        }
                    }
                );
            });
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

            if (this.elements.empty) {
                this.elements.empty.hidden =
                    true;
            }

            if (this.elements.tableWrapper) {
                this.elements.tableWrapper.setAttribute(
                    "aria-busy",
                    "true"
                );
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

            if (this.elements.tableWrapper) {
                this.elements.tableWrapper.setAttribute(
                    "aria-busy",
                    "false"
                );
            }

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;

                this.elements.refresh.removeAttribute(
                    "aria-busy"
                );
            }
        },

        showEmpty() {
            if (this.elements.empty) {
                this.elements.empty.hidden =
                    false;
            }

            if (this.elements.tableWrapper) {
                this.elements.tableWrapper.hidden =
                    true;
            }

            if (this.elements.mobileList) {
                this.elements.mobileList.hidden =
                    true;
            }
        },

        showError(message) {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.empty) {
                this.elements.empty.hidden =
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

            if (this.elements.tableWrapper) {
                this.elements.tableWrapper.hidden =
                    true;
            }

            if (this.elements.mobileList) {
                this.elements.mobileList.hidden =
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

        clearError() {
            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent =
                    "";
            }

            if (this.elements.tableWrapper) {
                this.elements.tableWrapper.hidden =
                    false;
            }

            if (this.elements.mobileList) {
                this.elements.mobileList.hidden =
                    false;
            }
        },

        getCaseUrl(caseItem) {
            const directUrl =
                this.getValue(
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

            const id =
                this.getValue(
                    caseItem,
                    [
                        "id",
                        "case_id"
                    ],
                    ""
                );

            if (!id) {
                return "";
            }

            /*
             * Prefer a URL supplied by Django.
             * This fallback follows the project's conventional route.
             */
            return `/cases/${encodeURIComponent(id)}/`;
        },

        async fetchJson(url) {
            const headers = {
                Accept: "application/json"
            };

            const response =
                await fetch(url, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: headers
                });

            const text =
                await response.text();

            let data = null;

            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (error) {
                    data = text;
                }
            }

            if (!response.ok) {
                throw new Error(
                    this.getErrorMessage(data) ||
                    response.statusText ||
                    "Unable to load cases."
                );
            }

            return {
                data: data,
                status: response.status,
                ok: response.ok,
                response: response
            };
        },

        buildUrl(url, params) {
            if (!url) {
                return "";
            }

            const urlObject =
                new URL(
                    url,
                    window.location.origin
                );

            Object.entries(
                params || {}
            ).forEach(([key, value]) => {
                if (
                    value === null ||
                    value === undefined ||
                    value === ""
                ) {
                    return;
                }

                urlObject.searchParams.set(
                    key,
                    String(value)
                );
            });

            return urlObject.toString();
        },

        firstDefined(values) {
            for (const value of values) {
                if (
                    value !== undefined &&
                    value !== null
                ) {
                    return value;
                }
            }

            return null;
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
        },

        debounce(callback, delay) {
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

    function initializeCases() {
        Cases.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeCases,
            {
                once: true
            }
        );
    } else {
        initializeCases();
    }

    window.IOCases = Cases;

})(window, document);