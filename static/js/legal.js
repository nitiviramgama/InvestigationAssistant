(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Legal Intelligence JavaScript
     *
     * File:
     * static/js/legal.js
     *
     * Responsibilities:
     * - Load legal intelligence results from Django JSON API
     * - Search/analyze a case narrative
     * - Display BNS, BNSS, BSA and judgment results
     * - Handle result tabs
     * - Support officer verification
     * - Render loading, empty, error and success states
     *
     * Expected API response:
     *
     * {
     *   "bns_results": [],
     *   "bnss_results": [],
     *   "bsa_results": [],
     *   "judgments": []
     * }
     *
     * No legal conclusion is treated as final by this frontend.
     * Officer verification remains mandatory.
     */

    const Legal = {
        elements: {},

        state: {
            loading: false,
            error: null,
            activeTab: "bns",
            results: {
                bns_results: [],
                bnss_results: [],
                bsa_results: [],
                judgments: []
            },
            selectedResults: new Set(),
            analyzed: false
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.bindEvents();
            this.initializeTabs();
            this.initializeExistingResults();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector("#legalPage") ||
                document.querySelector(".legal-page") ||
                document.querySelector("[data-legal-page]");

            this.elements.narrative =
                document.querySelector("#legalNarrative") ||
                document.querySelector(
                    "textarea[name='narrative']"
                ) ||
                document.querySelector(
                    "[data-legal-narrative]"
                );

            this.elements.search =
                document.querySelector(
                    "[data-legal-search]"
                ) ||
                document.querySelector(
                    "[data-action='legal-search']"
                );

            this.elements.analyze =
                document.querySelector(
                    "[data-legal-analyze]"
                ) ||
                document.querySelector(
                    "[data-action='analyze-legal']"
                ) ||
                document.querySelector(
                    "[data-action='run-legal-analysis']"
                );

            this.elements.refresh =
                document.querySelector(
                    "[data-legal-refresh]"
                ) ||
                document.querySelector(
                    "[data-action='refresh-legal']"
                );

            this.elements.tabs =
                document.querySelectorAll(
                    "[data-legal-tab]"
                );

            this.elements.tabPanels =
                document.querySelectorAll(
                    "[data-legal-tab-panel]"
                );

            this.elements.bnsList =
                document.querySelector(
                    "[data-legal-results='bns']"
                ) ||
                document.querySelector(
                    "#bnsResults"
                ) ||
                document.querySelector(
                    ".legal-section[data-section='bns'] .legal-results-list"
                );

            this.elements.bnssList =
                document.querySelector(
                    "[data-legal-results='bnss']"
                ) ||
                document.querySelector(
                    "#bnssResults"
                ) ||
                document.querySelector(
                    ".legal-section[data-section='bnss'] .legal-results-list"
                );

            this.elements.bsaList =
                document.querySelector(
                    "[data-legal-results='bsa']"
                ) ||
                document.querySelector(
                    "#bsaResults"
                ) ||
                document.querySelector(
                    ".legal-section[data-section='bsa'] .legal-results-list"
                );

            this.elements.judgmentsList =
                document.querySelector(
                    "[data-legal-results='judgments']"
                ) ||
                document.querySelector(
                    "#judgmentsResults"
                ) ||
                document.querySelector(
                    ".legal-section[data-section='judgments'] .legal-results-list"
                );

            this.elements.verificationPanel =
                document.querySelector(
                    "[data-legal-verification]"
                ) ||
                document.querySelector(
                    ".legal-verification-panel"
                );

            this.elements.verificationSummary =
                document.querySelector(
                    "[data-verification-summary]"
                );

            this.elements.verifySelected =
                document.querySelector(
                    "[data-action='verify-selected']"
                ) ||
                document.querySelector(
                    "[data-verify-selected]"
                );

            this.elements.reviewNotes =
                document.querySelector(
                    "[data-legal-review-notes]"
                ) ||
                document.querySelector(
                    ".legal-review-notes textarea"
                );

            this.elements.loading =
                document.querySelector(
                    ".legal-loading"
                );

            this.elements.empty =
                document.querySelector(
                    ".legal-empty-state"
                );

            this.elements.error =
                document.querySelector(
                    ".legal-error"
                ) ||
                document.querySelector(
                    ".legal-error-state"
                );

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                        "[data-error-message]"
                    )
                    : null;

            this.elements.message =
                document.querySelector(
                    "[data-legal-message]"
                ) ||
                document.querySelector(
                    ".legal-success"
                );
        },

        bindEvents() {
            this.elements.tabs.forEach(
                (tab) => {
                    tab.addEventListener(
                        "click",
                        (event) => {
                            event.preventDefault();

                            const target =
                                tab.dataset.legalTab ||
                                tab.dataset.tab ||
                                tab.getAttribute(
                                    "aria-controls"
                                ) ||
                                "";

                            if (target) {
                                this.activateTab(
                                    target
                                );
                            }
                        }
                    );

                    tab.addEventListener(
                        "keydown",
                        (event) => {
                            if (
                                event.key !==
                                    "ArrowLeft" &&
                                event.key !==
                                    "ArrowRight"
                            ) {
                                return;
                            }

                            event.preventDefault();

                            const tabs =
                                Array.from(
                                    this.elements.tabs
                                );

                            const currentIndex =
                                tabs.indexOf(
                                    tab
                                );

                            if (
                                currentIndex ===
                                -1
                            ) {
                                return;
                            }

                            const direction =
                                event.key ===
                                "ArrowRight"
                                    ? 1
                                    : -1;

                            const nextIndex =
                                (
                                    currentIndex +
                                    direction +
                                    tabs.length
                                ) %
                                tabs.length;

                            tabs[nextIndex].focus();

                            const nextTarget =
                                tabs[nextIndex]
                                    .dataset
                                    .legalTab ||
                                tabs[nextIndex]
                                    .dataset
                                    .tab ||
                                tabs[nextIndex]
                                    .getAttribute(
                                        "aria-controls"
                                    );

                            if (nextTarget) {
                                this.activateTab(
                                    nextTarget
                                );
                            }
                        }
                    );
                }
            );

            if (this.elements.analyze) {
                this.elements.analyze.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.runAnalysis();
                    }
                );
            }

            if (this.elements.search) {
                this.elements.search.addEventListener(
                    "keydown",
                    (event) => {
                        if (
                            event.key ===
                            "Enter"
                        ) {
                            event.preventDefault();
                            this.runAnalysis();
                        }
                    }
                );
            }

            if (this.elements.refresh) {
                this.elements.refresh.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.runAnalysis();
                    }
                );
            }

            if (this.elements.verifySelected) {
                this.elements.verifySelected.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.verifySelectedResults();
                    }
                );
            }

            this.bindResultVerification();
        },

        initializeTabs() {
            let initialTab =
                this.state.activeTab;

            const activeTab =
                Array.from(
                    this.elements.tabs
                ).find(
                    (tab) =>
                        tab.classList.contains(
                            "is-active"
                        ) ||
                        tab.getAttribute(
                            "aria-selected"
                        ) === "true"
                );

            if (activeTab) {
                initialTab =
                    activeTab.dataset.legalTab ||
                    activeTab.dataset.tab ||
                    activeTab.getAttribute(
                        "aria-controls"
                    ) ||
                    initialTab;
            }

            this.activateTab(
                initialTab
            );
        },

        activateTab(tabName) {
            const normalized =
                this.normalizeTabName(
                    tabName
                );

            this.state.activeTab =
                normalized;

            this.elements.tabs.forEach(
                (tab) => {
                    const tabTarget =
                        this.normalizeTabName(
                            tab.dataset.legalTab ||
                            tab.dataset.tab ||
                            tab.getAttribute(
                                "aria-controls"
                            ) ||
                            ""
                        );

                    const isActive =
                        tabTarget ===
                        normalized;

                    tab.classList.toggle(
                        "is-active",
                        isActive
                    );

                    tab.setAttribute(
                        "aria-selected",
                        isActive
                            ? "true"
                            : "false"
                    );

                    if (isActive) {
                        tab.setAttribute(
                            "tabindex",
                            "0"
                        );
                    } else {
                        tab.setAttribute(
                            "tabindex",
                            "-1"
                        );
                    }
                }
            );

            this.elements.tabPanels.forEach(
                (panel) => {
                    const panelTarget =
                        this.normalizeTabName(
                            panel.dataset.legalTabPanel ||
                            panel.dataset.tabPanel ||
                            panel.id ||
                            ""
                        );

                    const isActive =
                        panelTarget ===
                        normalized ||
                        panelTarget ===
                        `${normalized}results`;

                    panel.hidden =
                        !isActive;

                    panel.classList.toggle(
                        "is-active",
                        isActive
                    );
                }
            );

            this.toggleKnownSections(
                normalized
            );
        },

        toggleKnownSections(tabName) {
            const sections =
                document.querySelectorAll(
                    ".legal-section[data-section]"
                );

            sections.forEach(
                (section) => {
                    const sectionName =
                        this.normalizeTabName(
                            section.dataset.section
                        );

                    if (!sectionName) {
                        return;
                    }

                    section.hidden =
                        sectionName !==
                        tabName;
                }
            );
        },

        initializeExistingResults() {
            const existing = {
                bns_results:
                    this.readExistingResults(
                        "bns"
                    ),
                bnss_results:
                    this.readExistingResults(
                        "bnss"
                    ),
                bsa_results:
                    this.readExistingResults(
                        "bsa"
                    ),
                judgments:
                    this.readExistingResults(
                        "judgments"
                    )
            };

            this.state.results =
                existing;

            this.bindResultVerification();
            this.updateVerificationSummary();
        },

        readExistingResults(type) {
            const list =
                this.getResultContainer(
                    type
                );

            if (!list) {
                return [];
            }

            const cards =
                list.querySelectorAll(
                    "[data-legal-result], .legal-result, .legal-result-card, .legal-judgment-card"
                );

            return Array.from(
                cards
            ).map(
                (card, index) => {
                    const checkbox =
                        card.querySelector(
                            "[data-verify-result]"
                        );

                    return {
                        id:
                            card.dataset.resultId ||
                            checkbox?.value ||
                            `${type}-${index}`,
                        title:
                            card.dataset.resultTitle ||
                            card.querySelector(
                                ".legal-result-title, .legal-judgment-name"
                            )?.textContent?.trim() ||
                            "Legal result",
                        type,
                        verified:
                            card.classList.contains(
                                "is-verified"
                            )
                    };
                }
            );
        },

        async runAnalysis() {
            const endpoint =
                this.getEndpoint();

            if (!endpoint) {
                this.showError(
                    "Legal intelligence API endpoint is not configured."
                );
                return;
            }

            const narrative =
                this.elements.narrative
                    ? this.elements.narrative.value.trim()
                    : "";

            const search =
                this.elements.search
                    ? this.elements.search.value.trim()
                    : "";

            if (!narrative && !search) {
                this.showError(
                    "Enter a case narrative or legal search query before running the analysis."
                );

                if (this.elements.narrative) {
                    this.elements.narrative.focus();
                }

                return;
            }

            this.state.loading = true;
            this.state.error = null;
            this.state.analyzed = true;

            this.showLoading();
            this.clearError();

            try {
                const payload = {
                    narrative,
                    query: search
                };

                const caseId =
                    this.elements.page.dataset.caseId;

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

                this.state.results =
                    this.normalizeResults(
                        data
                    );

                this.state.selectedResults.clear();

                this.renderResults();
                this.bindResultVerification();
                this.updateVerificationSummary();

                this.state.loading =
                    false;

                this.showLoadedState();

                if (
                    this.hasResults()
                ) {
                    this.showSuccess(
                        "Legal intelligence analysis completed. Please verify the results before relying on them."
                    );
                } else {
                    this.showEmpty();
                }
            } catch (error) {
                this.state.loading =
                    false;

                this.state.error =
                    error;

                this.showError(
                    error?.message ||
                    "Unable to complete legal intelligence analysis."
                );

                console.error(
                    "IO Assistant legal intelligence error:",
                    error
                );
            }
        },

        normalizeResults(data) {
            if (!data) {
                return {
                    bns_results: [],
                    bnss_results: [],
                    bsa_results: [],
                    judgments: []
                };
            }

            if (
                data.results &&
                typeof data.results ===
                    "object" &&
                !Array.isArray(
                    data.results
                )
            ) {
                data =
                    data.results;
            }

            const bns =
                data.bns_results ||
                data.bns ||
                data.bns_sections ||
                [];

            const bnss =
                data.bnss_results ||
                data.bnss ||
                data.bnss_sections ||
                [];

            const bsa =
                data.bsa_results ||
                data.bsa ||
                data.bsa_sections ||
                [];

            const judgments =
                data.judgments ||
                data.case_law ||
                data.court_judgments ||
                [];

            return {
                bns_results:
                    this.normalizeResultArray(
                        bns,
                        "bns"
                    ),

                bnss_results:
                    this.normalizeResultArray(
                        bnss,
                        "bnss"
                    ),

                bsa_results:
                    this.normalizeResultArray(
                        bsa,
                        "bsa"
                    ),

                judgments:
                    this.normalizeResultArray(
                        judgments,
                        "judgments"
                    )
            };
        },

        normalizeResultArray(
            results,
            type
        ) {
            if (!Array.isArray(results)) {
                return [];
            }

            return results.map(
                (result, index) => {
                    if (
                        typeof result ===
                        "string"
                    ) {
                        return {
                            id:
                                `${type}-${index}`,
                            type,
                            title:
                                result,
                            provision:
                                "",
                            explanation:
                                "",
                            summary:
                                "",
                            source_name:
                                "",
                            source_page:
                                "",
                            reference:
                                "",
                            confidence:
                                "",
                            verification_required:
                                true,
                            verified:
                                false
                        };
                    }

                    const id =
                        this.getValue(
                            result,
                            [
                                "id",
                                "result_id",
                                "uuid"
                            ],
                            `${type}-${index}`
                        );

                    return {
                        ...result,
                        id:
                            String(id),
                        type,
                        title:
                            this.getValue(
                                result,
                                [
                                    "title",
                                    "name",
                                    "section",
                                    "case_name"
                                ],
                                "Legal reference"
                            ),

                        provision:
                            this.getValue(
                                result,
                                [
                                    "provision",
                                    "section",
                                    "citation",
                                    "case_number"
                                ],
                                ""
                            ),

                        explanation:
                            this.getValue(
                                result,
                                [
                                    "explanation",
                                    "description",
                                    "details"
                                ],
                                ""
                            ),

                        summary:
                            this.getValue(
                                result,
                                [
                                    "summary",
                                    "reasoning"
                                ],
                                ""
                            ),

                        source_name:
                            this.getValue(
                                result,
                                [
                                    "source_name",
                                    "source",
                                    "act",
                                    "court"
                                ],
                                ""
                            ),

                        source_page:
                            this.getValue(
                                result,
                                [
                                    "source_page",
                                    "page"
                                ],
                                ""
                            ),

                        reference:
                            this.getValue(
                                result,
                                [
                                    "reference",
                                    "url",
                                    "source_url",
                                    "citation"
                                ],
                                ""
                            ),

                        confidence:
                            this.getValue(
                                result,
                                [
                                    "confidence",
                                    "score"
                                ],
                                ""
                            ),

                        verification_required:
                            result.verification_required !==
                            false,

                        verified:
                            result.verified ===
                            true
                    };
                }
            );
        },

        renderResults() {
            this.renderResultList(
                "bns",
                this.state.results
                    .bns_results
            );

            this.renderResultList(
                "bnss",
                this.state.results
                    .bnss_results
            );

            this.renderResultList(
                "bsa",
                this.state.results
                    .bsa_results
            );

            this.renderResultList(
                "judgments",
                this.state.results
                    .judgments
            );
        },

        renderResultList(
            type,
            results
        ) {
            const container =
                this.getResultContainer(
                    type
                );

            if (!container) {
                return;
            }

            if (!results.length) {
                container.innerHTML = `
                    <div class="legal-empty-result">
                        No relevant ${this.escapeHtml(
                            this.getTabLabel(
                                type
                            )
                        )} references found.
                    </div>
                `;

                return;
            }

            container.innerHTML =
                results
                    .map(
                        (result) =>
                            this.renderResultCard(
                                result,
                                type
                            )
                    )
                    .join("");
        },

        renderResultCard(
            result,
            type
        ) {
            const isJudgment =
                type ===
                "judgments";

            const verified =
                result.verified ===
                true;

            const confidenceClass =
                this.getConfidenceClass(
                    result.confidence
                );

            const verificationClass =
                verified
                    ? "legal-verification--verified"
                    : result.verification_required
                        ? "legal-verification--required"
                        : "legal-verification--review";

            return `
                <article
                    class="${
                        isJudgment
                            ? "legal-judgment-card"
                            : "legal-result-card"
                    } ${verified ? "is-verified" : ""}"
                    data-legal-result
                    data-result-id="${this.escapeAttribute(
                        result.id
                    )}"
                    data-result-type="${this.escapeAttribute(
                        type
                    )}"
                >
                    <div class="legal-result-header">
                        <div class="legal-result-heading">
                            <h4 class="${
                                isJudgment
                                    ? "legal-judgment-name"
                                    : "legal-result-title"
                            }">
                                ${this.escapeHtml(
                                    result.title
                                )}
                            </h4>

                            ${
                                result.provision
                                    ? `
                                        <span class="legal-result-provision">
                                            ${this.escapeHtml(
                                                result.provision
                                            )}
                                        </span>
                                    `
                                    : ""
                            }
                        </div>

                        ${
                            result.confidence !==
                            ""
                                ? `
                                    <span class="legal-result-confidence ${confidenceClass}">
                                        ${this.escapeHtml(
                                            this.formatConfidence(
                                                result.confidence
                                            )
                                        )}
                                    </span>
                                `
                                : ""
                        }
                    </div>

                    ${
                        result.explanation
                            ? `
                                <div class="legal-result-explanation">
                                    ${this.escapeHtml(
                                        result.explanation
                                    )}
                                </div>
                            `
                            : ""
                    }

                    ${
                        result.summary
                            ? `
                                <div class="legal-result-summary">
                                    ${this.escapeHtml(
                                        result.summary
                                    )}
                                </div>
                            `
                            : ""
                    }

                    ${
                        isJudgment &&
                        result.court
                            ? `
                                <div class="legal-judgment-court">
                                    ${this.escapeHtml(
                                        result.court
                                    )}
                                </div>
                            `
                            : ""
                    }

                    ${
                        result.source_name ||
                        result.source_page ||
                        result.reference
                            ? `
                                <div class="legal-result-source">
                                    ${
                                        result.source_name
                                            ? `
                                                <div class="legal-source-item">
                                                    <span class="legal-source-label">
                                                        Source
                                                    </span>
                                                    <span class="legal-source-value">
                                                        ${this.escapeHtml(
                                                            result.source_name
                                                        )}
                                                    </span>
                                                </div>
                                            `
                                            : ""
                                    }

                                    ${
                                        result.source_page
                                            ? `
                                                <div class="legal-source-item">
                                                    <span class="legal-source-label">
                                                        Page
                                                    </span>
                                                    <span class="legal-source-value">
                                                        ${this.escapeHtml(
                                                            result.source_page
                                                        )}
                                                    </span>
                                                </div>
                                            `
                                            : ""
                                    }

                                    ${
                                        result.reference
                                            ? `
                                                <div class="legal-source-item">
                                                    <span class="legal-source-label">
                                                        Reference
                                                    </span>

                                                    ${
                                                        this.isSafeHttpUrl(
                                                            result.reference
                                                        )
                                                            ? `
                                                                <a
                                                                    class="legal-source-link"
                                                                    href="${this.escapeAttribute(
                                                                        result.reference
                                                                    )}"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    Open source
                                                                </a>
                                                            `
                                                            : `
                                                                <span class="legal-source-reference">
                                                                    ${this.escapeHtml(
                                                                        result.reference
                                                                    )}
                                                                </span>
                                                            `
                                                    }
                                                </div>
                                            `
                                            : ""
                                    }
                                </div>
                            `
                            : ""
                    }

                    <div class="legal-result-verification">
                        <label class="legal-verification ${verificationClass}">
                            <input
                                type="checkbox"
                                value="${this.escapeAttribute(
                                    result.id
                                )}"
                                data-verify-result
                                ${
                                    verified
                                        ? "checked"
                                        : ""
                                }
                            />

                            <span>
                                ${
                                    verified
                                        ? "Verified by officer"
                                        : result.verification_required
                                            ? "Requires officer verification"
                                            : "Mark as verified"
                                }
                            </span>
                        </label>
                    </div>
                </article>
            `;
        },

        bindResultVerification() {
            document
                .querySelectorAll(
                    "[data-verify-result]"
                )
                .forEach(
                    (checkbox) => {
                        if (
                            checkbox.dataset.bound ===
                            "true"
                        ) {
                            return;
                        }

                        checkbox.dataset.bound =
                            "true";

                        checkbox.addEventListener(
                            "change",
                            () => {
                                const id =
                                    checkbox.value;

                                if (
                                    checkbox.checked
                                ) {
                                    this.state.selectedResults.add(
                                        String(id)
                                    );
                                } else {
                                    this.state.selectedResults.delete(
                                        String(id)
                                    );
                                }

                                this.updateVerificationSummary();

                                const card =
                                    checkbox.closest(
                                        "[data-legal-result], .legal-result-card, .legal-judgment-card"
                                    );

                                if (card) {
                                    card.classList.toggle(
                                        "is-selected",
                                        checkbox.checked
                                    );
                                }
                            }
                        );
                    }
                );
        },

        async verifySelectedResults() {
            const ids =
                Array.from(
                    this.state.selectedResults
                );

            if (!ids.length) {
                this.showError(
                    "Select at least one legal result to verify."
                );
                return;
            }

            const endpoint =
                this.getVerificationEndpoint();

            /*
             * If the backend exposes a verification endpoint, use it.
             * Otherwise keep verification state locally in the current UI.
             */
            if (!endpoint) {
                this.markResultsVerifiedLocally(
                    ids
                );

                this.showSuccess(
                    "Selected results have been marked as verified in this review session."
                );

                return;
            }

            const reviewNotes =
                this.elements.reviewNotes
                    ? this.elements.reviewNotes.value.trim()
                    : "";

            try {
                this.setVerificationLoading(
                    true
                );

                const payload = {
                    result_ids: ids,
                    verified: true,
                    review_notes:
                        reviewNotes
                };

                const api =
                    window.IOApi ||
                    window.api;

                if (
                    api &&
                    typeof api.post ===
                        "function"
                ) {
                    await api.post(
                        endpoint,
                        payload
                    );
                } else {
                    await this.postJson(
                        endpoint,
                        payload
                    );
                }

                this.markResultsVerifiedLocally(
                    ids
                );

                this.showSuccess(
                    "Selected legal results have been marked as verified."
                );
            } catch (error) {
                this.showError(
                    error?.message ||
                    "Unable to save legal verification."
                );

                console.error(
                    "IO Assistant legal verification error:",
                    error
                );
            } finally {
                this.setVerificationLoading(
                    false
                );
            }
        },

        markResultsVerifiedLocally(
            ids
        ) {
            const idSet =
                new Set(
                    ids.map(
                        String
                    )
                );

            Object.keys(
                this.state.results
            ).forEach(
                (type) => {
                    this.state.results[
                        type
                    ].forEach(
                        (result) => {
                            if (
                                idSet.has(
                                    String(
                                        result.id
                                    )
                                )
                            ) {
                                result.verified =
                                    true;
                                result.verification_required =
                                    false;
                            }
                        }
                    );
                }
            );

            this.state.selectedResults.clear();

            this.renderResults();
            this.bindResultVerification();
            this.updateVerificationSummary();
        },

        updateVerificationSummary() {
            if (
                !this.elements.verificationSummary
            ) {
                return;
            }

            const allResults =
                this.getAllResults();

            const total =
                allResults.length;

            const verified =
                allResults.filter(
                    (result) =>
                        result.verified ===
                        true
                ).length;

            const selected =
                this.state.selectedResults
                    .size;

            this.elements.verificationSummary.innerHTML = `
                <div class="legal-verification-summary">
                    <div class="legal-verification-stat">
                        <span class="legal-verification-stat-label">
                            Total references
                        </span>
                        <strong class="legal-verification-stat-value">
                            ${total}
                        </strong>
                    </div>

                    <div class="legal-verification-stat">
                        <span class="legal-verification-stat-label">
                            Verified
                        </span>
                        <strong class="legal-verification-stat-value">
                            ${verified}
                        </strong>
                    </div>

                    <div class="legal-verification-stat">
                        <span class="legal-verification-stat-label">
                            Selected
                        </span>
                        <strong class="legal-verification-stat-value">
                            ${selected}
                        </strong>
                    </div>
                </div>
            `;

            if (this.elements.verifySelected) {
                this.elements.verifySelected.disabled =
                    selected === 0;
            }
        },

        setVerificationLoading(
            loading
        ) {
            if (
                !this.elements.verifySelected
            ) {
                return;
            }

            this.elements.verifySelected.disabled =
                loading ||
                this.state.selectedResults
                    .size === 0;

            this.elements.verifySelected.setAttribute(
                "aria-busy",
                loading
                    ? "true"
                    : "false"
            );

            if (loading) {
                this.elements.verifySelected.dataset.originalText =
                    this.elements.verifySelected.textContent;

                this.elements.verifySelected.textContent =
                    "Saving…";
            } else if (
                this.elements.verifySelected
                    .dataset.originalText
            ) {
                this.elements.verifySelected.textContent =
                    this.elements.verifySelected
                        .dataset.originalText;

                delete this.elements
                    .verifySelected
                    .dataset
                    .originalText;
            }
        },

        getAllResults() {
            return [
                ...this.state.results
                    .bns_results,
                ...this.state.results
                    .bnss_results,
                ...this.state.results
                    .bsa_results,
                ...this.state.results
                    .judgments
            ];
        },

        hasResults() {
            return (
                this.getAllResults()
                    .length > 0
            );
        },

        getResultContainer(
            type
        ) {
            const map = {
                bns:
                    this.elements
                        .bnsList,

                bnss:
                    this.elements
                        .bnssList,

                bsa:
                    this.elements
                        .bsaList,

                judgments:
                    this.elements
                        .judgmentsList
            };

            return map[type] || null;
        },

        getEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset
                    .legalEndpoint ||
                this.elements.page.dataset
                    .analysisEndpoint ||
                this.elements.page.dataset
                    .apiEndpoint ||
                ""
            );
        },

        getVerificationEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset
                    .verificationEndpoint ||
                ""
            );
        },

        normalizeTabName(value) {
            return String(
                value || ""
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    ""
                )
                .replace(
                    /results$/,
                    ""
                );
        },

        getTabLabel(type) {
            const labels = {
                bns: "BNS",
                bnss: "BNSS",
                bsa: "BSA",
                judgments:
                    "judgment"
            };

            return (
                labels[type] ||
                type
            );
        },

        getConfidenceClass(
            value
        ) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "";
            }

            let number =
                parseFloat(
                    String(
                        value
                    ).replace(
                        "%",
                        ""
                    )
                );

            if (
                Number.isNaN(
                    number
                )
            ) {
                const normalized =
                    String(
                        value
                    ).toLowerCase();

                if (
                    normalized.includes(
                        "high"
                    )
                ) {
                    return "legal-confidence--high";
                }

                if (
                    normalized.includes(
                        "medium"
                    )
                ) {
                    return "legal-confidence--medium";
                }

                if (
                    normalized.includes(
                        "low"
                    )
                ) {
                    return "legal-confidence--low";
                }

                return "";
            }

            if (number <= 1) {
                number *= 100;
            }

            if (number >= 80) {
                return "legal-confidence--high";
            }

            if (number >= 50) {
                return "legal-confidence--medium";
            }

            return "legal-confidence--low";
        },

        formatConfidence(
            value
        ) {
            if (
                typeof value ===
                "number"
            ) {
                if (value <= 1) {
                    return `${Math.round(
                        value * 100
                    )}% confidence`;
                }

                return `${Math.round(
                    value
                )}% confidence`;
            }

            const text =
                String(
                    value
                );

            if (
                text.includes("%") ||
                /high|medium|low/i.test(
                    text
                )
            ) {
                return text;
            }

            return `${text} confidence`;
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
                    object[key] !== ""
                ) {
                    return object[key];
                }
            }

            return fallback;
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

        isSafeHttpUrl(value) {
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

            if (this.elements.analyze) {
                this.elements.analyze.disabled =
                    true;

                this.elements.analyze.setAttribute(
                    "aria-busy",
                    "true"
                );

                this.elements.analyze.dataset.originalText =
                    this.elements.analyze.textContent;

                this.elements.analyze.textContent =
                    "Analyzing…";
            }

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
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

            if (this.elements.empty) {
                this.elements.empty.hidden =
                    true;
            }

            this.restoreAnalyzeButton();

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;
            }
        },

        showEmpty() {
            if (this.elements.loading) {
                this.elements.loading.hidden =
                    true;
            }

            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.empty) {
                this.elements.empty.hidden =
                    false;
            }

            this.restoreAnalyzeButton();

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;
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

            if (
                this.elements.errorMessage
            ) {
                this.elements.errorMessage.textContent =
                    message;
            }

            this.restoreAnalyzeButton();

            if (this.elements.refresh) {
                this.elements.refresh.disabled =
                    false;
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

            if (
                this.elements.errorMessage
            ) {
                this.elements.errorMessage.textContent =
                    "";
            }
        },

        showSuccess(message) {
            this.showMessage(
                message,
                "success"
            );
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

        restoreAnalyzeButton() {
            if (!this.elements.analyze) {
                return;
            }

            this.elements.analyze.disabled =
                false;

            this.elements.analyze.removeAttribute(
                "aria-busy"
            );

            if (
                this.elements.analyze.dataset
                    .originalText
            ) {
                this.elements.analyze.textContent =
                    this.elements.analyze
                        .dataset
                        .originalText;

                delete this.elements.analyze
                    .dataset
                    .originalText;
            }
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
                    data = text;
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

    function initializeLegal() {
        Legal.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeLegal,
            {
                once: true
            }
        );
    } else {
        initializeLegal();
    }

    window.IOLegal = Legal;

})(window, document);