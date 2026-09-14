(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Timeline JavaScript
     *
     * File:
     * static/js/timeline.js
     *
     * Current mode:
     * - Works with server-rendered Django timeline events
     * - Client-side filtering by event type and date
     * - Refreshes the page when Refresh is clicked
     * - Handles loading, empty and error states
     * - Pagination UI is supported when server/API data is available
     *
     * Backend API can be connected later by adding:
     * data-timeline-endpoint="..."
     * to #timelinePage.
     */

    const Timeline = {
        elements: {},

        state: {
            events: [],
            filteredEvents: [],
            loading: false,
            error: null,
            page: 1,
            pageSize: 20,
            total: 0,
            hasNext: false,
            serverRendered: false,

            filters: {
                eventType: "",
                dateFrom: "",
                dateTo: ""
            }
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.readInitialState();
            this.readServerRenderedEvents();
            this.bindEvents();

            /*
             * If a real API endpoint is provided later,
             * use the API automatically.
             */
            if (this.getEndpoint()) {
                this.loadTimelineFromApi();
                return;
            }

            /*
             * Current project mode:
             * Django renders timeline events directly.
             */
            this.applyFilters();
            this.showLoadedState();
            this.renderPagination();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector("#timelinePage") ||
                document.querySelector(".timeline-page") ||
                document.querySelector("[data-timeline-page]");

            this.elements.eventType =
                document.querySelector("[data-event-type-filter]") ||
                document.querySelector("[data-timeline-event-type]");

            this.elements.dateFrom =
                document.querySelector("[data-timeline-date-from]");

            this.elements.dateTo =
                document.querySelector("[data-timeline-date-to]");

            this.elements.reset =
                document.querySelector("[data-timeline-filter-reset]") ||
                document.querySelector(
                    "[data-action='reset-timeline-filters']"
                );

            this.elements.refresh =
                document.querySelector("[data-timeline-refresh]") ||
                document.querySelector(
                    "[data-action='refresh-timeline']"
                );

            this.elements.list =
                document.querySelector("[data-timeline-list]") ||
                document.querySelector(".timeline-list");

            this.elements.loading =
                document.querySelector(".timeline-loading");

            this.elements.empty =
                document.querySelector(".timeline-empty-state");

            this.elements.error =
                document.querySelector(".timeline-error") ||
                document.querySelector(".timeline-error-state");

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                        "[data-error-message]"
                    )
                    : null;

            this.elements.message =
                document.querySelector("[data-timeline-message]");

            this.elements.loadMore =
                document.querySelector("[data-timeline-load-more]") ||
                document.querySelector(
                    "[data-action='load-more-timeline']"
                );

            this.elements.pagination =
                document.querySelector("[data-timeline-pagination]") ||
                document.querySelector(".timeline-pagination");

            this.elements.paginationInfo =
                document.querySelector(
                    "[data-timeline-pagination-info]"
                ) ||
                document.querySelector(".timeline-pagination-info");

            this.elements.paginationControls =
                document.querySelector(
                    "[data-timeline-pagination-controls]"
                ) ||
                document.querySelector(
                    ".timeline-pagination-controls"
                );
        },

        readInitialState() {
            if (this.elements.eventType) {
                this.state.filters.eventType =
                    this.elements.eventType.value || "";
            }

            if (this.elements.dateFrom) {
                this.state.filters.dateFrom =
                    this.elements.dateFrom.value || "";
            }

            if (this.elements.dateTo) {
                this.state.filters.dateTo =
                    this.elements.dateTo.value || "";
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

            if (Number.isInteger(pageSize) && pageSize > 0) {
                this.state.pageSize = pageSize;
            }
        },

        /*
         * Read the events already rendered by Django.
         */
        readServerRenderedEvents() {
            if (!this.elements.list) {
                return;
            }

            const eventElements =
                this.elements.list.querySelectorAll(
                    "[data-timeline-event]"
                );

            this.state.events = Array.from(
                eventElements
            ).map((element) => {
                return {
                    element,
                    type:
                        element.dataset.eventType ||
                        "",
                    date:
                        this.getEventDate(element)
                };
            });

            this.state.filteredEvents = [
                ...this.state.events
            ];

            this.state.total =
                this.state.events.length;

            this.state.serverRendered = true;
        },

        getEventDate(element) {
            const timeElement =
                element.querySelector(
                    "time[datetime]"
                );

            if (timeElement) {
                return (
                    timeElement.getAttribute(
                        "datetime"
                    ) || ""
                );
            }

            return (
                element.dataset.eventDate ||
                ""
            );
        },

        bindEvents() {
            if (this.elements.eventType) {
                this.elements.eventType.addEventListener(
                    "change",
                    () => {
                        this.state.filters.eventType =
                            this.elements.eventType.value || "";

                        this.state.page = 1;

                        this.applyFilters();
                    }
                );
            }

            if (this.elements.dateFrom) {
                this.elements.dateFrom.addEventListener(
                    "change",
                    () => {
                        this.state.filters.dateFrom =
                            this.elements.dateFrom.value || "";

                        this.state.page = 1;

                        this.applyFilters();
                    }
                );
            }

            if (this.elements.dateTo) {
                this.elements.dateTo.addEventListener(
                    "change",
                    () => {
                        this.state.filters.dateTo =
                            this.elements.dateTo.value || "";

                        this.state.page = 1;

                        this.applyFilters();
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

                        /*
                         * If an API exists, reload from API.
                         * Otherwise reload the Django page.
                         */
                        if (this.getEndpoint()) {
                            this.state.page = 1;
                            this.loadTimelineFromApi();
                        } else {
                            window.location.reload();
                        }
                    }
                );
            }

            if (this.elements.loadMore) {
                this.elements.loadMore.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();

                        if (
                            this.state.hasNext &&
                            !this.state.loading
                        ) {
                            this.loadMoreServerEvents();
                        }
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
                            !Number.isInteger(page) ||
                            page < 1 ||
                            page === this.state.page
                        ) {
                            return;
                        }

                        this.state.page = page;

                        if (this.getEndpoint()) {
                            this.loadTimelineFromApi();
                        } else {
                            this.renderServerPaginationPage();
                        }
                    }
                );
            }
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.timelineEndpoint ||
                this.elements.page.dataset.apiEndpoint ||
                ""
            );
        },

        /*
         * Client-side filtering for the current
         * Django-rendered events.
         */
        applyFilters() {
            if (!this.state.serverRendered) {
                return;
            }

            const {
                eventType,
                dateFrom,
                dateTo
            } = this.state.filters;

            const normalizedType =
                String(eventType || "")
                    .trim()
                    .toLowerCase();

            const fromDate =
                dateFrom
                    ? this.parseFilterDate(
                        dateFrom,
                        false
                    )
                    : null;

            const toDate =
                dateTo
                    ? this.parseFilterDate(
                        dateTo,
                        true
                    )
                    : null;

            this.state.filteredEvents =
                this.state.events.filter(
                    (event) => {
                        /*
                         * Event type filter
                         */
                        if (
                            normalizedType &&
                            String(event.type)
                                .trim()
                                .toLowerCase() !==
                                normalizedType
                        ) {
                            return false;
                        }

                        /*
                         * Date filter
                         */
                        if (
                            fromDate ||
                            toDate
                        ) {
                            const eventDate =
                                this.parseEventDate(
                                    event.date
                                );

                            if (!eventDate) {
                                return false;
                            }

                            if (
                                fromDate &&
                                eventDate < fromDate
                            ) {
                                return false;
                            }

                            if (
                                toDate &&
                                eventDate > toDate
                            ) {
                                return false;
                            }
                        }

                        return true;
                    }
                );

            this.state.total =
                this.state.filteredEvents.length;

            this.state.page = 1;

            this.renderFilteredEvents();
            this.renderPagination();

            if (
                this.state.filteredEvents.length === 0
            ) {
                this.showEmpty();
            } else {
                this.showLoadedState();
            }

            this.updateFilterMessage();
        },

        parseFilterDate(value, endOfDay) {
            if (!value) {
                return null;
            }

            const date = new Date(
                `${value}T${
                    endOfDay
                        ? "23:59:59"
                        : "00:00:00"
                }`
            );

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return null;
            }

            return date;
        },

        parseEventDate(value) {
            if (!value) {
                return null;
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return null;
            }

            return date;
        },

        /*
         * Show/hide existing server-rendered events.
         * No HTML is rebuilt, so Django content remains intact.
         */
        renderFilteredEvents() {
            if (!this.elements.list) {
                return;
            }

            const visibleEvents =
                new Set(
                    this.state.filteredEvents
                );

            this.state.events.forEach(
                (event) => {
                    if (!event.element) {
                        return;
                    }

                    event.element.hidden =
                        !visibleEvents.has(
                            event
                        );
                }
            );
        },

        /*
         * Current server-rendered mode does not fetch
         * additional events. Keep the button hidden.
         */
        loadMoreServerEvents() {
            if (this.getEndpoint()) {
                return;
            }

            this.state.hasNext = false;

            if (this.elements.loadMore) {
                this.elements.loadMore.hidden =
                    true;
            }
        },

        /*
         * API mode for future backend integration.
         */
        async loadTimelineFromApi(options = {}) {
            const endpoint =
                this.getEndpoint();

            if (!endpoint) {
                return;
            }

            const append =
                Boolean(options.append);

            this.state.loading = true;
            this.state.error = null;

            if (!append) {
                this.showLoading();
            }

            this.clearError();

            try {
                const url =
                    this.buildUrl();

                const api =
                    window.IOApi ||
                    window.api;

                let response;

                if (
                    api &&
                    typeof api.get ===
                    "function"
                ) {
                    response =
                        await api.get(url);
                } else {
                    response =
                        await this.fetchJson(
                            url
                        );
                }

                const data =
                    this.unwrapResponse(
                        response
                    );

                const normalized =
                    this.normalizeResponse(
                        data
                    );

                if (append) {
                    this.state.events = [
                        ...this.state.events,
                        ...normalized.events
                    ];
                } else {
                    this.state.events =
                        normalized.events;
                }

                this.state.total =
                    normalized.total;

                this.state.hasNext =
                    normalized.hasNext;

                this.state.page =
                    normalized.page;

                this.state.pageSize =
                    normalized.pageSize;

                this.state.serverRendered =
                    false;

                this.state.loading =
                    false;

                this.renderTimeline();
                this.renderPagination();
                this.showLoadedState();

                if (
                    !this.state.events.length
                ) {
                    this.showEmpty();
                }
            } catch (error) {
                this.state.loading =
                    false;

                this.state.error =
                    error;

                this.showError(
                    error &&
                    error.message
                        ? error.message
                        : "Unable to load the investigation timeline."
                );

                console.error(
                    "IO Assistant timeline error:",
                    error
                );
            }
        },

        buildUrl() {
            const endpoint =
                this.getEndpoint();

            if (!endpoint) {
                return "";
            }

            const url =
                new URL(
                    endpoint,
                    window.location.origin
                );

            const filters =
                this.state.filters;

            url.searchParams.set(
                "page",
                String(
                    this.state.page
                )
            );

            url.searchParams.set(
                "page_size",
                String(
                    this.state.pageSize
                )
            );

            if (filters.eventType) {
                url.searchParams.set(
                    "event_type",
                    filters.eventType
                );
            }

            if (filters.dateFrom) {
                url.searchParams.set(
                    "date_from",
                    filters.dateFrom
                );
            }

            if (filters.dateTo) {
                url.searchParams.set(
                    "date_to",
                    filters.dateTo
                );
            }

            return url.toString();
        },

        renderTimeline() {
            if (!this.elements.list) {
                return;
            }

            if (
                !this.state.events.length
            ) {
                this.elements.list.innerHTML =
                    "";
                return;
            }

            this.elements.list.innerHTML =
                this.state.events
                    .map((event) =>
                        this.renderEvent(
                            event
                        )
                    )
                    .join("");

            this.bindDynamicLinks();
        },

        renderFilteredEventsFromPage() {
            if (!this.state.serverRendered) {
                return;
            }

            this.renderFilteredEvents();
        },

        renderEvent(event) {
            const dateValue =
                this.getValue(
                    event,
                    [
                        "datetime",
                        "date"
                    ],
                    ""
                );

            const title =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["title"],
                        "Investigation Event"
                    )
                );

            const description =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["description"],
                        ""
                    )
                );

            const eventType =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["event_type"],
                        "Investigation"
                    )
                );

            const location =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["location"],
                        ""
                    )
                );

            const officer =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["officer"],
                        ""
                    )
                );

            const sourceReference =
                this.escapeHtml(
                    this.getValue(
                        event,
                        ["source_reference"],
                        ""
                    )
                );

            const dateParts =
                this.formatDateParts(
                    dateValue
                );

            return `
                <article
                    class="timeline-event"
                    data-timeline-event
                    data-event-type="${this.escapeAttribute(
                        eventType
                    )}"
                >
                    <div class="timeline-event-date">
                        <time
                            class="timeline-event-date-primary"
                            datetime="${this.escapeAttribute(
                                dateValue
                            )}"
                        >
                            ${this.escapeHtml(
                                dateParts.primary
                            )}
                        </time>

                        <span class="timeline-event-date-secondary">
                            ${this.escapeHtml(
                                dateParts.secondary
                            )}
                        </span>
                    </div>

                    <div class="timeline-event-marker-column">
                        <span
                            class="timeline-event-marker"
                            aria-hidden="true"
                        ></span>
                    </div>

                    <div class="timeline-event-card">
                        <div class="timeline-event-card-header">
                            <div class="timeline-event-card-heading">
                                <h3 class="timeline-event-title">
                                    ${title}
                                </h3>

                                <span class="timeline-event-type">
                                    ${eventType}
                                </span>
                            </div>
                        </div>

                        ${
                            description
                                ? `
                                    <p class="timeline-event-description">
                                        ${description}
                                    </p>
                                `
                                : ""
                        }

                        ${
                            location ||
                            officer
                                ? `
                                    <div class="timeline-event-meta">
                                        ${
                                            location
                                                ? `
                                                    <div class="timeline-event-meta-item">
                                                        <span class="timeline-event-meta-label">
                                                            Location
                                                        </span>
                                                        <span class="timeline-event-meta-value">
                                                            ${location}
                                                        </span>
                                                    </div>
                                                `
                                                : ""
                                        }

                                        ${
                                            officer
                                                ? `
                                                    <div class="timeline-event-meta-item">
                                                        <span class="timeline-event-meta-label">
                                                            Officer
                                                        </span>
                                                        <span class="timeline-event-meta-value">
                                                            ${officer}
                                                        </span>
                                                    </div>
                                                `
                                                : ""
                                        }
                                    </div>
                                `
                                : ""
                        }

                        ${
                            sourceReference
                                ? `
                                    <div class="timeline-event-source">
                                        <span class="timeline-event-source-label">
                                            Source
                                        </span>

                                        <span class="timeline-event-source-reference">
                                            ${sourceReference}
                                        </span>
                                    </div>
                                `
                                : ""
                        }
                    </div>
                </article>
            `;
        },

        renderPagination() {
            /*
             * Server-rendered Django events do not have
             * backend pagination yet.
             */
            if (
                this.state.serverRendered
            ) {
                if (this.elements.pagination) {
                    this.elements.pagination.hidden =
                        true;
                }

                if (this.elements.loadMore) {
                    this.elements.loadMore.hidden =
                        true;
                }

                return;
            }

            if (
                !this.elements.pagination
            ) {
                return;
            }

            if (
                this.state.total <=
                this.state.pageSize
            ) {
                this.elements.pagination.hidden =
                    true;

                return;
            }

            this.elements.pagination.hidden =
                false;

            if (
                this.elements.paginationInfo
            ) {
                const start =
                    this.state.events.length
                        ? (
                            (
                                this.state.page - 1
                            ) *
                            this.state.pageSize
                        ) + 1
                        : 0;

                const end =
                    Math.min(
                        this.state.page *
                            this.state.pageSize,
                        this.state.total
                    );

                this.elements.paginationInfo.textContent =
                    `Showing ${start}–${end} of ${this.state.total} events`;
            }

            if (
                this.elements.paginationControls
            ) {
                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            this.state.total /
                            this.state.pageSize
                        )
                    );

                const currentPage =
                    Math.min(
                        Math.max(
                            this.state.page,
                            1
                        ),
                        totalPages
                    );

                const buttons = [];

                if (
                    currentPage > 1
                ) {
                    buttons.push(`
                        <button
                            type="button"
                            class="btn btn-secondary btn-small"
                            data-page="${currentPage - 1}"
                        >
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
                        <button
                            type="button"
                            class="btn ${
                                page === currentPage
                                    ? "btn-primary"
                                    : "btn-secondary"
                            } btn-small"
                            data-page="${page}"
                            ${
                                page === currentPage
                                    ? 'aria-current="page"'
                                    : ""
                            }
                        >
                            ${page}
                        </button>
                    `);
                }

                if (
                    currentPage <
                    totalPages
                ) {
                    buttons.push(`
                        <button
                            type="button"
                            class="btn btn-secondary btn-small"
                            data-page="${currentPage + 1}"
                        >
                            Next
                        </button>
                    `);
                }

                this.elements.paginationControls.innerHTML =
                    buttons.join("");
            }
        },

        renderServerPaginationPage() {
            /*
             * Pagination is intentionally disabled for now because
             * the current Django view returns all timeline events.
             */
            this.applyFilters();
        },

        resetFilters() {
            this.state.page = 1;

            this.state.filters = {
                eventType: "",
                dateFrom: "",
                dateTo: ""
            };

            if (this.elements.eventType) {
                this.elements.eventType.value =
                    "";
            }

            if (this.elements.dateFrom) {
                this.elements.dateFrom.value =
                    "";
            }

            if (this.elements.dateTo) {
                this.elements.dateTo.value =
                    "";
            }

            if (this.getEndpoint()) {
                this.loadTimelineFromApi();
            } else {
                this.applyFilters();
            }
        },

        updateFilterMessage() {
            if (!this.elements.message) {
                return;
            }

            const hasFilters =
                Boolean(
                    this.state.filters.eventType ||
                    this.state.filters.dateFrom ||
                    this.state.filters.dateTo
                );

            if (!hasFilters) {
                this.elements.message.hidden =
                    true;

                return;
            }

            this.elements.message.hidden =
                false;

            this.elements.message.dataset.messageType =
                "info";

            this.elements.message.textContent =
                `Showing ${this.state.filteredEvents.length} of ${this.state.events.length} timeline events.`;
        },

        showLoading() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    false;
            }

            if (this.elements.empty) {
                this.elements.empty.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.list) {
                this.elements.list.setAttribute(
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

            if (this.elements.list) {
                this.elements.list.setAttribute(
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

            if (this.elements.list) {
                this.elements.list.setAttribute(
                    "aria-busy",
                    "false"
                );
            }

            if (this.elements.pagination) {
                this.elements.pagination.hidden =
                    true;
            }

            if (this.elements.loadMore) {
                this.elements.loadMore.hidden =
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
        },

        showMessage(
            message,
            type = "info"
        ) {
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

        bindDynamicLinks() {
            if (!this.elements.list) {
                return;
            }

            if (
                this.elements.list.dataset.linksBound
            ) {
                return;
            }

            this.elements.list.dataset.linksBound =
                "true";

            this.elements.list.addEventListener(
                "click",
                (event) => {
                    const eventElement =
                        event.target.closest(
                            "[data-timeline-event]"
                        );

                    if (!eventElement) {
                        return;
                    }

                    if (
                        event.target.closest("a")
                    ) {
                        return;
                    }
                }
            );
        },

        formatDateParts(value) {
            if (!value) {
                return {
                    primary:
                        "Date unavailable",
                    secondary: ""
                };
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return {
                    primary:
                        String(value),
                    secondary: ""
                };
            }

            try {
                return {
                    primary:
                        new Intl.DateTimeFormat(
                            undefined,
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        ).format(date),

                    secondary:
                        new Intl.DateTimeFormat(
                            undefined,
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        ).format(date)
                };
            } catch (error) {
                return {
                    primary:
                        String(value),
                    secondary: ""
                };
            }
        },

        async fetchJson(url) {
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
                    data = text;
                }
            }

            if (!response.ok) {
                throw new Error(
                    this.getErrorMessage(
                        data
                    ) ||
                    response.statusText ||
                    "Unable to load timeline."
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

        normalizeResponse(data) {
            if (Array.isArray(data)) {
                return {
                    events: data,
                    total:
                        data.length,
                    page: 1,
                    pageSize:
                        data.length ||
                        this.state.pageSize,
                    hasNext: false
                };
            }

            if (
                !data ||
                typeof data !==
                    "object"
            ) {
                return {
                    events: [],
                    total: 0,
                    page: 1,
                    pageSize:
                        this.state.pageSize,
                    hasNext: false
                };
            }

            let events = [];

            if (
                Array.isArray(
                    data.results
                )
            ) {
                events =
                    data.results;
            } else if (
                Array.isArray(
                    data.items
                )
            ) {
                events =
                    data.items;
            } else if (
                Array.isArray(
                    data.events
                )
            ) {
                events =
                    data.events;
            } else if (
                Array.isArray(
                    data.timeline_events
                )
            ) {
                events =
                    data.timeline_events;
            } else if (
                Array.isArray(
                    data.data
                )
            ) {
                events =
                    data.data;
            }

            const pagination =
                data.pagination ||
                {};

            const total =
                Number(
                    this.firstDefined([
                        data.count,
                        data.total,
                        data.total_count,
                        pagination.count,
                        pagination.total,
                        events.length
                    ])
                ) || 0;

            const page =
                Number(
                    this.firstDefined([
                        data.page,
                        pagination.page,
                        this.state.page
                    ])
                ) || 1;

            const pageSize =
                Number(
                    this.firstDefined([
                        data.page_size,
                        data.pageSize,
                        pagination.page_size,
                        pagination.pageSize,
                        this.state.pageSize
                    ])
                ) ||
                this.state.pageSize;

            let hasNext =
                Boolean(
                    this.firstDefined([
                        data.has_next,
                        data.hasNext,
                        pagination.has_next,
                        pagination.hasNext,
                        false
                    ])
                );

            if (
                data.next ||
                pagination.next
            ) {
                hasNext = true;
            }

            if (
                !hasNext &&
                total >
                    page *
                        pageSize
            ) {
                hasNext = true;
            }

            return {
                events,
                total,
                page,
                pageSize,
                hasNext
            };
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

            for (
                const key of keys
            ) {
                if (
                    object[key] !==
                        undefined &&
                    object[key] !==
                        null &&
                    object[key] !== ""
                ) {
                    return object[key];
                }
            }

            return fallback;
        },

        firstDefined(values) {
            for (
                const value of values
            ) {
                if (
                    value !==
                        undefined &&
                    value !== null
                ) {
                    return value;
                }
            }

            return null;
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

        getErrorMessage(data) {
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

            return "";
        }
    };

    function initializeTimeline() {
        Timeline.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeTimeline,
            { once: true }
        );
    } else {
        initializeTimeline();
    }

    window.IOTimeline =
        Timeline;

})(window, document);