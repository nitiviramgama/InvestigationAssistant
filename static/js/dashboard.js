(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Dashboard JavaScript
     *
     * The dashboard data is currently rendered server-side by Django.
     *
     * Responsibilities:
     * - Handle dashboard refresh
     * - Handle retry
     * - Keep dashboard UI interactions working
     *
     * No dashboard API request is made here.
     */

    const Dashboard = {
        elements: {},

        init() {
            this.cacheElements();
            this.bindEvents();

            if (!this.elements.page) {
                return;
            }

            this.syncServerRenderedState();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector(".dashboard-page") ||
                document.querySelector("[data-dashboard-page]");

            this.elements.loading =
                document.querySelector(".dashboard-loading");

            this.elements.error =
                document.querySelector(".dashboard-error");

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
        },

        bindEvents() {
            this.elements.refreshButtons.forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.refreshPage(button);
                });
            });

            this.elements.retryButtons.forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.refreshPage(button);
                });
            });
        },

        syncServerRenderedState() {
            /*
             * Django has already rendered the dashboard data.
             * Hide loading/error states when the page loads normally.
             */

            if (this.elements.loading) {
                this.elements.loading.hidden = true;
            }

            if (this.elements.error) {
                this.elements.error.hidden = true;
            }

            this.elements.refreshButtons.forEach((button) => {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            });
        },

        refreshPage(button) {
            if (button) {
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
            }

            if (this.elements.loading) {
                this.elements.loading.hidden = false;
            }

            /*
             * Reload the Django dashboard page.
             * This gets fresh values directly from the dashboard view.
             */
            window.location.reload();
        }
    };

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

    window.IODashboard = Dashboard;

})(window, document);