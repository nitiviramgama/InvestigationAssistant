(function (window, document) {
    "use strict";

    /*
     * IO Assistant - Evidence Upload JavaScript
     *
     * File:
     * static/js/upload.js
     *
     * Responsibilities:
     * - Evidence file selection
     * - Drag-and-drop support
     * - File validation
     * - Selected-file preview
     * - Upload progress
     * - Django multipart/form-data upload
     * - Success and error states
     *
     * Shared API helper:
     * static/js/api.js
     */

    const EvidenceUpload = {
        elements: {},

        state: {
            selectedFile: null,
            uploading: false,
            uploaded: false,
            error: null,
            xhr: null
        },

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.bindEvents();
            this.updateFileState();
        },

        cacheElements() {
            this.elements.page =
                document.querySelector(".evidence-page") ||
                document.querySelector("[data-evidence-upload-page]");

            this.elements.form =
                document.querySelector("[data-file-upload]") ||
                document.querySelector(".evidence-form");

            this.elements.fileInput =
                document.querySelector("[data-evidence-file]") ||
                document.querySelector(
                    "input[type='file'][name='file']"
                );

            this.elements.dropzone =
                document.querySelector("[data-file-dropzone]") ||
                document.querySelector(".evidence-dropzone") ||
                document.querySelector(".file-upload-area");

            this.elements.selectedFile =
                document.querySelector("[data-selected-file]") ||
                document.querySelector(".selected-file");

            this.elements.selectedFileName =
                document.querySelector("[data-selected-file-name]") ||
                document.querySelector(".selected-file-name");

            this.elements.selectedFileSize =
                document.querySelector("[data-selected-file-size]") ||
                document.querySelector(".selected-file-size");

            this.elements.removeFile =
                document.querySelector("[data-remove-file]");

            this.elements.fileValidation =
                document.querySelector("[data-file-validation]") ||
                document.querySelector(".evidence-file-validation");

            this.elements.fileValidationMessage =
                document.querySelector(
                    "[data-file-validation-message]"
                );

            this.elements.submitButton =
                document.querySelector("[data-upload-submit]") ||
                (
                    this.elements.form
                        ? this.elements.form.querySelector(
                            "button[type='submit']"
                        )
                        : null
                );

            this.elements.progressSection =
                document.querySelector("#uploadProgressSection") ||
                document.querySelector("[data-upload-progress-section]");

            this.elements.progressBar =
                document.querySelector("[data-upload-progress]") ||
                document.querySelector(".upload-progress-bar");

            this.elements.progressPercentage =
                document.querySelector("[data-upload-percentage]") ||
                document.querySelector(".upload-progress-percentage");

            this.elements.progressStatus =
                document.querySelector("[data-upload-status]") ||
                document.querySelector(".upload-progress-status");

            this.elements.error =
                document.querySelector(".evidence-error-state") ||
                document.querySelector("[data-upload-error]");

            this.elements.errorMessage =
                this.elements.error
                    ? this.elements.error.querySelector(
                        "[data-error-message]"
                    )
                    : null;

            this.elements.success =
                document.querySelector(".evidence-success-state") ||
                document.querySelector("[data-upload-success]");

            this.elements.message =
                document.querySelector("[data-upload-message]");

            this.elements.cancelButton =
                document.querySelector("[data-upload-cancel]");
        },

        bindEvents() {
            if (this.elements.fileInput) {
                this.elements.fileInput.addEventListener(
                    "change",
                    (event) => {
                        const files = event.target.files;

                        if (files && files.length) {
                            this.setFile(files[0]);
                        } else {
                            this.clearFile();
                        }
                    }
                );
            }

            if (this.elements.dropzone) {
                this.bindDropzone();
            }

            if (this.elements.removeFile) {
                this.elements.removeFile.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        this.clearFile();
                    }
                );
            }

            if (this.elements.form) {
                this.elements.form.addEventListener(
                    "submit",
                    (event) => {
                        this.handleSubmit(event);
                    }
                );
            }

            if (this.elements.cancelButton) {
                this.elements.cancelButton.addEventListener(
                    "click",
                    (event) => {
                        const url =
                            this.elements.cancelButton.dataset.url;

                        if (!url) {
                            return;
                        }

                        event.preventDefault();
                        window.location.href = url;
                    }
                );
            }
        },

        bindDropzone() {
            this.elements.dropzone.addEventListener(
                "dragenter",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    this.elements.dropzone.classList.add(
                        "is-dragover"
                    );
                }
            );

            this.elements.dropzone.addEventListener(
                "dragover",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    this.elements.dropzone.classList.add(
                        "is-dragover"
                    );
                }
            );

            this.elements.dropzone.addEventListener(
                "dragleave",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        event.relatedTarget &&
                        this.elements.dropzone.contains(
                            event.relatedTarget
                        )
                    ) {
                        return;
                    }

                    this.elements.dropzone.classList.remove(
                        "is-dragover"
                    );
                }
            );

            this.elements.dropzone.addEventListener(
                "drop",
                (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    this.elements.dropzone.classList.remove(
                        "is-dragover"
                    );

                    const files =
                        event.dataTransfer &&
                        event.dataTransfer.files;

                    if (
                        files &&
                        files.length
                    ) {
                        this.setFile(files[0]);

                        if (this.elements.fileInput) {
                            try {
                                const dataTransfer =
                                    new DataTransfer();

                                dataTransfer.items.add(
                                    files[0]
                                );

                                this.elements.fileInput.files =
                                    dataTransfer.files;
                            } catch (error) {
                                /*
                                 * Some browsers do not allow
                                 * programmatic assignment to
                                 * input.files.
                                 */
                            }
                        }
                    }
                }
            );

            this.elements.dropzone.addEventListener(
                "click",
                (event) => {
                    if (
                        event.target.closest(
                            "[data-remove-file]"
                        )
                    ) {
                        return;
                    }

                    if (this.elements.fileInput) {
                        this.elements.fileInput.click();
                    }
                }
            );

            this.elements.dropzone.addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        if (this.elements.fileInput) {
                            this.elements.fileInput.click();
                        }
                    }
                }
            );
        },

        setFile(file) {
            if (!file) {
                this.clearFile();
                return;
            }

            this.clearError();

            const validation =
                this.validateFile(file);

            if (!validation.valid) {
                this.state.selectedFile = null;
                this.showFileValidation(
                    validation.message,
                    false
                );

                this.updateFileState();
                return;
            }

            this.state.selectedFile = file;

            this.showFileValidation(
                "File is ready to upload.",
                true
            );

            this.renderSelectedFile(file);
            this.updateFileState();
        },

        clearFile() {
            this.state.selectedFile = null;

            if (this.elements.fileInput) {
                this.elements.fileInput.value = "";
            }

            if (this.elements.selectedFile) {
                this.elements.selectedFile.hidden = true;
            }

            if (this.elements.selectedFileName) {
                this.elements.selectedFileName.textContent = "";
            }

            if (this.elements.selectedFileSize) {
                this.elements.selectedFileSize.textContent = "";
            }

            this.hideFileValidation();
            this.updateFileState();
        },

        validateFile(file) {
            const maxSize =
                this.getMaxUploadSize();

            if (
                maxSize &&
                file.size > maxSize
            ) {
                return {
                    valid: false,
                    message:
                        `File is too large. Maximum allowed size is ${this.formatFileSize(
                            maxSize
                        )}.`
                };
            }

            const allowedTypes =
                this.getAllowedTypes();

            if (
                allowedTypes.length &&
                !this.isAllowedFileType(
                    file,
                    allowedTypes
                )
            ) {
                return {
                    valid: false,
                    message:
                        "This file type is not supported."
                };
            }

            if (file.size === 0) {
                return {
                    valid: false,
                    message:
                        "The selected file is empty."
                };
            }

            return {
                valid: true,
                message:
                    "File is ready to upload."
            };
        },

        getMaxUploadSize() {
            if (!this.elements.page) {
                return 0;
            }

            const rawValue =
                this.elements.page.dataset.maxUploadSize ||
                this.elements.page.dataset.maxFileSize ||
                "";

            const parsed =
                Number(rawValue);

            return Number.isFinite(parsed) &&
                parsed > 0
                ? parsed
                : 0;
        },

        getAllowedTypes() {
            if (!this.elements.page) {
                return [];
            }

            const raw =
                this.elements.page.dataset.allowedFileTypes ||
                this.elements.page.dataset.allowedTypes ||
                "";

            if (!raw) {
                return [];
            }

            return raw
                .split(",")
                .map((type) =>
                    type.trim().toLowerCase()
                )
                .filter(Boolean);
        },

        isAllowedFileType(file, allowedTypes) {
            const fileName =
                String(file.name || "")
                    .toLowerCase();

            const mimeType =
                String(file.type || "")
                    .toLowerCase();

            return allowedTypes.some(
                (allowed) => {
                    if (
                        allowed === mimeType
                    ) {
                        return true;
                    }

                    if (
                        allowed.startsWith(".") &&
                        fileName.endsWith(allowed)
                    ) {
                        return true;
                    }

                    if (
                        allowed.endsWith("/*")
                    ) {
                        const prefix =
                            allowed.slice(0, -1);

                        return mimeType.startsWith(
                            prefix
                        );
                    }

                    return false;
                }
            );
        },

        renderSelectedFile(file) {
            if (this.elements.selectedFile) {
                this.elements.selectedFile.hidden =
                    false;
            }

            if (this.elements.selectedFileName) {
                this.elements.selectedFileName.textContent =
                    file.name;
            }

            if (this.elements.selectedFileSize) {
                this.elements.selectedFileSize.textContent =
                    this.formatFileSize(
                        file.size
                    );
            }
        },

        showFileValidation(message, valid) {
            if (!this.elements.fileValidation) {
                return;
            }

            this.elements.fileValidation.hidden =
                false;

            this.elements.fileValidation.classList.toggle(
                "is-valid",
                Boolean(valid)
            );

            this.elements.fileValidation.classList.toggle(
                "is-invalid",
                !valid
            );

            this.elements.fileValidation.dataset.validationState =
                valid
                    ? "valid"
                    : "invalid";

            if (this.elements.fileValidationMessage) {
                this.elements.fileValidationMessage.textContent =
                    message;
            } else {
                this.elements.fileValidation.textContent =
                    message;
            }
        },

        hideFileValidation() {
            if (!this.elements.fileValidation) {
                return;
            }

            this.elements.fileValidation.hidden =
                true;

            this.elements.fileValidation.classList.remove(
                "is-valid",
                "is-invalid"
            );
        },

        updateFileState() {
            const hasFile =
                Boolean(
                    this.state.selectedFile
                );

            if (this.elements.removeFile) {
                this.elements.removeFile.hidden =
                    !hasFile;
            }

            if (this.elements.submitButton) {
                this.elements.submitButton.disabled =
                    !hasFile ||
                    this.state.uploading;

                this.elements.submitButton.setAttribute(
                    "aria-disabled",
                    String(
                        !hasFile ||
                        this.state.uploading
                    )
                );
            }

            if (
                this.elements.dropzone
            ) {
                this.elements.dropzone.classList.toggle(
                    "has-file",
                    hasFile
                );
            }
        },

        async handleSubmit(event) {
            event.preventDefault();

            if (this.state.uploading) {
                return;
            }

            const file =
                this.state.selectedFile ||
                (
                    this.elements.fileInput &&
                    this.elements.fileInput.files &&
                    this.elements.fileInput.files[0]
                );

            if (!file) {
                this.showError(
                    "Please select an evidence file before uploading."
                );
                return;
            }

            const validation =
                this.validateFile(file);

            if (!validation.valid) {
                this.showError(
                    validation.message
                );
                return;
            }

            await this.uploadFile(file);
        },

        async uploadFile(file) {
            const endpoint =
                this.getUploadEndpoint();

            if (!endpoint) {
                this.showError(
                    "Evidence upload API endpoint is not configured."
                );
                return;
            }

            this.state.uploading = true;
            this.state.uploaded = false;
            this.state.error = null;

            this.clearError();
            this.hideSuccess();
            this.showProgress(0);
            this.setUploadingState(true);

            try {
                const formData =
                    this.buildFormData(file);

                /*
                 * Use XMLHttpRequest when progress reporting is required.
                 * This still uses the browser's standard Fetch/XHR APIs and
                 * avoids external dependencies.
                 */
                const response =
                    await this.uploadWithProgress(
                        endpoint,
                        formData
                    );

                this.state.uploading = false;
                this.state.uploaded = true;

                this.setUploadingState(false);
                this.showProgress(100);
                this.showSuccess(
                    this.getSuccessMessage(
                        response
                    )
                );

                this.handleUploadSuccess(
                    response
                );

            } catch (error) {
                this.state.uploading = false;
                this.state.uploaded = false;
                this.state.error = error;

                this.setUploadingState(false);

                this.showError(
                    error && error.message
                        ? error.message
                        : "Evidence upload failed. Please try again."
                );

                console.error(
                    "IO Assistant evidence upload error:",
                    error
                );
            }
        },

        buildFormData(file) {
            const formData =
                new FormData();

            /*
             * If the form exists, append all non-file fields.
             * This keeps the upload compatible with Django ModelForms.
             */
            if (this.elements.form) {
                const fields =
                    new FormData(
                        this.elements.form
                    );

                fields.forEach(
                    (value, key) => {
                        if (
                            value instanceof File
                        ) {
                            return;
                        }

                        formData.append(
                            key,
                            value
                        );
                    }
                );
            }

            const fileFieldName =
                this.elements.fileInput &&
                this.elements.fileInput.name
                    ? this.elements.fileInput.name
                    : "file";

            formData.delete(
                fileFieldName
            );

            formData.append(
                fileFieldName,
                file,
                file.name
            );

            return formData;
        },

        getUploadEndpoint() {
            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.uploadEndpoint ||
                this.elements.page.dataset.evidenceEndpoint ||
                this.elements.page.dataset.apiEndpoint ||
                ""
            );
        },

        uploadWithProgress(
            endpoint,
            formData
        ) {
            return new Promise(
                (resolve, reject) => {
                    const xhr =
                        new XMLHttpRequest();

                    this.state.xhr =
                        xhr;

                    xhr.open(
                        "POST",
                        endpoint,
                        true
                    );

                    xhr.withCredentials =
                        true;

                    xhr.setRequestHeader(
                        "Accept",
                        "application/json"
                    );

                    const csrfToken =
                        this.getCsrfToken();

                    if (csrfToken) {
                        xhr.setRequestHeader(
                            "X-CSRFToken",
                            csrfToken
                        );
                    }

                    xhr.upload.addEventListener(
                        "progress",
                        (event) => {
                            if (
                                !event.lengthComputable
                            ) {
                                return;
                            }

                            const percentage =
                                Math.round(
                                    (
                                        event.loaded /
                                        event.total
                                    ) * 100
                                );

                            this.showProgress(
                                percentage
                            );
                        }
                    );

                    xhr.addEventListener(
                        "load",
                        () => {
                            this.state.xhr =
                                null;

                            const data =
                                this.parseResponse(
                                    xhr
                                );

                            if (
                                xhr.status >= 200 &&
                                xhr.status < 300
                            ) {
                                resolve({
                                    data,
                                    status:
                                        xhr.status,
                                    ok: true,
                                    response:
                                        xhr
                                });

                                return;
                            }

                            const error =
                                new Error(
                                    this.getErrorMessage(
                                        data
                                    ) ||
                                    xhr.statusText ||
                                    "Evidence upload failed."
                                );

                            error.name =
                                "IOEvidenceUploadError";

                            error.status =
                                xhr.status;

                            error.statusText =
                                xhr.statusText;

                            error.data =
                                data;

                            reject(error);
                        }
                    );

                    xhr.addEventListener(
                        "error",
                        () => {
                            this.state.xhr =
                                null;

                            const error =
                                new Error(
                                    "Network error while uploading evidence."
                                );

                            error.name =
                                "IOEvidenceUploadNetworkError";

                            reject(error);
                        }
                    );

                    xhr.addEventListener(
                        "abort",
                        () => {
                            this.state.xhr =
                                null;

                            const error =
                                new Error(
                                    "Evidence upload was cancelled."
                                );

                            error.name =
                                "IOEvidenceUploadAbortError";

                            reject(error);
                        }
                    );

                    xhr.send(
                        formData
                    );
                }
            );
        },

        parseResponse(xhr) {
            const text =
                xhr.responseText || "";

            if (!text) {
                return null;
            }

            try {
                return JSON.parse(
                    text
                );
            } catch (error) {
                return text;
            }
        },

        setUploadingState(uploading) {
            if (this.elements.form) {
                this.elements.form.setAttribute(
                    "aria-busy",
                    String(uploading)
                );
            }

            if (this.elements.submitButton) {
                this.elements.submitButton.disabled =
                    uploading ||
                    !this.state.selectedFile;

                if (uploading) {
                    this.elements.submitButton.dataset.originalText =
                        this.elements.submitButton.textContent.trim();

                    this.elements.submitButton.textContent =
                        "Uploading…";
                } else if (
                    this.elements.submitButton.dataset.originalText
                ) {
                    this.elements.submitButton.textContent =
                        this.elements.submitButton.dataset.originalText;

                    delete this.elements.submitButton.dataset.originalText;
                }
            }

            if (this.elements.fileInput) {
                this.elements.fileInput.disabled =
                    uploading;
            }

            if (this.elements.removeFile) {
                this.elements.removeFile.disabled =
                    uploading;
            }
        },

        showProgress(percentage) {
            const safePercentage =
                Math.min(
                    100,
                    Math.max(
                        0,
                        Number(percentage) || 0
                    )
                );

            if (this.elements.progressSection) {
                this.elements.progressSection.hidden =
                    false;
            }

            if (this.elements.progressBar) {
                this.elements.progressBar.style.width =
                    `${safePercentage}%`;

                this.elements.progressBar.setAttribute(
                    "aria-valuenow",
                    String(
                        safePercentage
                    )
                );
            }

            if (this.elements.progressPercentage) {
                this.elements.progressPercentage.textContent =
                    `${safePercentage}%`;
            }

            if (this.elements.progressStatus) {
                if (
                    safePercentage >= 100
                ) {
                    this.elements.progressStatus.textContent =
                        "Upload complete.";
                } else if (
                    safePercentage > 0
                ) {
                    this.elements.progressStatus.textContent =
                        "Uploading evidence…";
                } else {
                    this.elements.progressStatus.textContent =
                        "Preparing upload…";
                }
            }
        },

        showSuccess(message) {
            if (this.elements.success) {
                this.elements.success.hidden =
                    false;

                const messageElement =
                    this.elements.success.querySelector(
                        "[data-success-message]"
                    );

                if (messageElement) {
                    messageElement.textContent =
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

        hideSuccess() {
            if (this.elements.success) {
                this.elements.success.hidden =
                    true;
            }
        },

        showError(message) {
            if (this.elements.error) {
                this.elements.error.hidden =
                    false;

                if (this.elements.errorMessage) {
                    this.elements.errorMessage.textContent =
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

        clearError() {
            if (this.elements.error) {
                this.elements.error.hidden =
                    true;
            }

            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent =
                    "";
            }

            if (this.elements.message) {
                this.elements.message.hidden =
                    true;

                this.elements.message.textContent =
                    "";

                delete this.elements.message.dataset.messageType;
            }
        },

        getSuccessMessage(response) {
            const data =
                response &&
                response.data;

            if (
                data &&
                typeof data === "object"
            ) {
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
            }

            return "Evidence uploaded successfully.";
        },

        handleUploadSuccess(response) {
            const data =
                response &&
                response.data;

            /*
             * Allow the Django backend to provide a redirect after upload.
             */
            const redirectUrl =
                data &&
                typeof data === "object"
                    ? (
                        data.redirect_url ||
                        data.redirect ||
                        ""
                    )
                    : "";

            if (
                redirectUrl &&
                this.elements.page.dataset.redirectAfterUpload ===
                    "true"
            ) {
                window.location.href =
                    redirectUrl;
                return;
            }

            /*
             * Keep the uploaded file selected so the officer can see
             * which evidence was submitted.
             */
            if (this.elements.form) {
                this.elements.form.dataset.uploaded =
                    "true";
            }
        },

        getCsrfToken() {
            const input =
                document.querySelector(
                    'input[name="csrfmiddlewaretoken"]'
                );

            if (
                input &&
                input.value
            ) {
                return input.value;
            }

            const meta =
                document.querySelector(
                    'meta[name="csrf-token"]'
                );

            if (
                meta &&
                meta.content
            ) {
                return meta.content;
            }

            if (
                document.body &&
                document.body.dataset &&
                document.body.dataset.csrfToken
            ) {
                return document.body.dataset.csrfToken;
            }

            return "";
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

        formatFileSize(bytes) {
            const size =
                Number(bytes);

            if (
                !Number.isFinite(size) ||
                size < 0
            ) {
                return "—";
            }

            if (size === 0) {
                return "0 Bytes";
            }

            const units = [
                "Bytes",
                "KB",
                "MB",
                "GB",
                "TB"
            ];

            const index =
                Math.min(
                    Math.floor(
                        Math.log(size) /
                        Math.log(1024)
                    ),
                    units.length - 1
                );

            const value =
                size /
                Math.pow(
                    1024,
                    index
                );

            return `${value.toFixed(
                index === 0 ? 0 : 1
            )} ${units[index]}`;
        }
    };

    function initializeEvidenceUpload() {
        EvidenceUpload.init();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeEvidenceUpload,
            {
                once: true
            }
        );
    } else {
        initializeEvidenceUpload();
    }

    window.IOEvidenceUpload =
        EvidenceUpload;

})(window, document);