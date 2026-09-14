/* ==========================================================================
   IO ASSISTANT — CENTRALIZED API HELPER
   File: static/js/api.js

   Purpose:
   - Centralized Fetch API wrapper
   - Generic GET / POST support
   - JSON and FormData requests
   - Safe JSON parsing
   - Consistent HTTP error handling
   - CSRF token support
   ========================================================================== */

(function (window) {
    "use strict";

    const IOApi = {
        /**
         * Read the CSRF token from a Django-rendered page.
         *
         * Supported sources:
         * 1. <input name="csrfmiddlewaretoken" value="...">
         * 2. <meta name="csrf-token" content="...">
         * 3. <body data-csrf-token="...">
         */
        getCsrfToken: function () {
            const input = document.querySelector(
                'input[name="csrfmiddlewaretoken"]'
            );

            if (input && input.value) {
                return input.value;
            }

            const meta = document.querySelector(
                'meta[name="csrf-token"]'
            );

            if (meta && meta.content) {
                return meta.content;
            }

            const body = document.body;

            if (body && body.dataset && body.dataset.csrfToken) {
                return body.dataset.csrfToken;
            }

            return "";
        },

        /**
         * Build request headers.
         *
         * FormData requests intentionally do not receive a
         * Content-Type header. The browser must set it automatically
         * so that the multipart boundary is generated correctly.
         */
        buildHeaders: function (options) {
            const headers = new Headers(options.headers || {});

            const method = String(options.method || "GET").toUpperCase();
            const body = options.body;

            if (
                method !== "GET" &&
                method !== "HEAD" &&
                options.csrf !== false
            ) {
                const csrfToken = this.getCsrfToken();

                if (csrfToken && !headers.has("X-CSRFToken")) {
                    headers.set("X-CSRFToken", csrfToken);
                }
            }

            if (
                body &&
                !(body instanceof FormData) &&
                !headers.has("Content-Type")
            ) {
                headers.set("Content-Type", "application/json");
            }

            headers.set("Accept", "application/json");

            return headers;
        },

        /**
         * Safely parse a Fetch Response.
         *
         * Returns:
         * {
         *     data: parsed JSON or null,
         *     text: raw response text
         * }
         */
        parseResponse: async function (response) {
            const text = await response.text();

            if (!text) {
                return {
                    data: null,
                    text: ""
                };
            }

            const contentType = (
                response.headers.get("content-type") || ""
            ).toLowerCase();

            if (contentType.includes("application/json")) {
                try {
                    return {
                        data: JSON.parse(text),
                        text: text
                    };
                } catch (error) {
                    return {
                        data: null,
                        text: text
                    };
                }
            }

            /*
             * Some Django/API endpoints may return JSON without a
             * correct Content-Type header. Try JSON parsing once more.
             */
            try {
                return {
                    data: JSON.parse(text),
                    text: text
                };
            } catch (error) {
                return {
                    data: null,
                    text: text
                };
            }
        },

        /**
         * Convert arbitrary request input into a Fetch-compatible body.
         *
         * Objects are JSON encoded.
         * FormData, strings, blobs, etc. are passed through unchanged.
         */
        prepareBody: function (body) {
            if (
                body === undefined ||
                body === null ||
                body instanceof FormData ||
                typeof body === "string" ||
                body instanceof Blob ||
                body instanceof URLSearchParams ||
                body instanceof ArrayBuffer
            ) {
                return body;
            }

            if (
                typeof body === "object"
            ) {
                return JSON.stringify(body);
            }

            return body;
        },

        /**
         * Normalize an API/HTTP error into a predictable Error object.
         */
        createError: function (response, parsed) {
            const payload = parsed && parsed.data;

            let message = "";

            if (payload && typeof payload === "object") {
                message =
                    payload.message ||
                    payload.detail ||
                    payload.error ||
                    payload.non_field_errors?.[0] ||
                    "";
            }

            if (!message && parsed && parsed.text) {
                message = parsed.text;
            }

            if (!message) {
                message = response.statusText || "Request failed.";
            }

            const error = new Error(message);

            error.name = "IOApiError";
            error.status = response.status;
            error.statusText = response.statusText;
            error.url = response.url;
            error.data = payload;
            error.response = response;

            return error;
        },

        /**
         * Perform a generic HTTP request.
         *
         * Resolves with:
         * {
         *     data,
         *     status,
         *     ok,
         *     headers,
         *     response
         * }
         *
         * Rejects with:
         * IOApiError for non-2xx responses
         * TypeError for network/fetch failures
         */
        request: async function (url, options) {
            if (!url) {
                return Promise.reject(
                    new TypeError("API request URL is required.")
                );
            }

            const requestOptions = Object.assign(
                {
                    method: "GET",
                    credentials: "same-origin",
                    csrf: true
                },
                options || {}
            );

            const method = String(
                requestOptions.method || "GET"
            ).toUpperCase();

            const body = this.prepareBody(requestOptions.body);

            const headers = this.buildHeaders({
                headers: requestOptions.headers,
                method: method,
                body: body,
                csrf: requestOptions.csrf
            });

            const fetchOptions = Object.assign({}, requestOptions, {
                method: method,
                headers: headers,
                body: body
            });

            delete fetchOptions.csrf;

            let response;

            try {
                response = await fetch(url, fetchOptions);
            } catch (error) {
                const networkError = new Error(
                    error && error.message
                        ? error.message
                        : "Unable to connect to the server."
                );

                networkError.name = "IOApiNetworkError";
                networkError.originalError = error;
                networkError.url = url;

                throw networkError;
            }

            const parsed = await this.parseResponse(response);

            if (!response.ok) {
                throw this.createError(response, parsed);
            }

            return {
                data: parsed.data,
                status: response.status,
                ok: response.ok,
                headers: response.headers,
                response: response
            };
        },

        /**
         * Generic GET request.
         *
         * Example:
         * IOApi.get("/api/cases/")
         */
        get: function (url, options) {
            return this.request(
                url,
                Object.assign({}, options || {}, {
                    method: "GET"
                })
            );
        },

        /**
         * Generic POST request.
         *
         * Supports:
         * - Plain JavaScript objects
         * - JSON strings
         * - FormData
         * - Other Fetch-compatible body types
         *
         * Example:
         * IOApi.post("/api/cases/", {
         *     title: "Example Case"
         * });
         *
         * Evidence upload:
         * const formData = new FormData(form);
         * IOApi.post("/api/evidence/upload/", formData);
         */
        post: function (url, body, options) {
            const requestOptions = Object.assign(
                {},
                options || {},
                {
                    method: "POST",
                    body: body
                }
            );

            return this.request(url, requestOptions);
        },

        /**
         * Convenience helper specifically for FormData.
         */
        postFormData: function (url, formData, options) {
            if (!(formData instanceof FormData)) {
                return Promise.reject(
                    new TypeError(
                        "postFormData() requires a FormData instance."
                    )
                );
            }

            return this.post(
                url,
                formData,
                options
            );
        },

        /**
         * Build a URL with query parameters.
         *
         * Example:
         * IOApi.buildUrl("/api/cases/", {
         *     status: "open",
         *     page: 2
         * });
         */
        buildUrl: function (url, params) {
            if (!params || typeof params !== "object") {
                return url;
            }

            const query = new URLSearchParams();

            Object.keys(params).forEach(function (key) {
                const value = params[key];

                if (
                    value === undefined ||
                    value === null ||
                    value === ""
                ) {
                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach(function (item) {
                        if (
                            item !== undefined &&
                            item !== null &&
                            item !== ""
                        ) {
                            query.append(key, item);
                        }
                    });

                    return;
                }

                query.append(key, value);
            });

            const queryString = query.toString();

            if (!queryString) {
                return url;
            }

            return (
                url +
                (url.includes("?") ? "&" : "?") +
                queryString
            );
        }
    };

    /*
     * Expose the helper globally so existing page scripts can use:
     *
     * IOApi.get(...)
     * IOApi.post(...)
     * IOApi.postFormData(...)
     */
    window.IOApi = IOApi;

    /*
     * Backward-compatible shorter alias.
     */
    window.api = IOApi;

})(window);