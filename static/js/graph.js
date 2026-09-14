(function (window, document) {
    "use strict";

    const EvidenceGraph = {

        elements: {},

        state: {
            nodes: [],
            edges: [],
            filteredNodes: [],
            filteredEdges: [],
            selectedNode: null,
            loading: false,
            error: null,
            zoom: 1,
            panX: 0,
            panY: 0,

            filters: {
                search: "",
                nodeTypes: new Set(),
                relationship: ""
            }
        },


        /* ==========================================================
           INITIALIZATION
        ========================================================== */

        init() {
            this.cacheElements();

            if (!this.elements.page) {
                return;
            }

            this.readInitialFilters();
            this.bindEvents();
            this.updateSearchClear();

            this.loadGraph();
        },


        /* ==========================================================
           ELEMENT CACHE
        ========================================================== */

        cacheElements() {

            this.elements.page =
                document.querySelector("#graphPage") ||
                document.querySelector(".graph-page") ||
                document.querySelector("[data-graph-page]");


            this.elements.search =
                document.querySelector("[data-entity-search]") ||
                document.querySelector("#entitySearch");


            this.elements.searchClear =
                document.querySelector("[data-clear-entity-search]") ||
                document.querySelector("#clearEntitySearch");


            this.elements.nodeTypeFilters =
                Array.from(
                    document.querySelectorAll("[data-node-type]")
                );


            this.elements.relationship =
                document.querySelector("[data-relationship-filter]");


            this.elements.reset =
                document.querySelector("[data-reset-graph-filters]") ||
                document.querySelector("#resetGraphFilters");


            this.elements.refresh =
                document.querySelector("[data-refresh-graph]") ||
                document.querySelector("#refreshGraphButton");


            this.elements.retry =
                document.querySelector("[data-graph-retry]") ||
                document.querySelector("#graphRetryButton");


            this.elements.container =
                document.querySelector("[data-graph-container]") ||
                document.querySelector("#evidenceGraph");


            this.elements.loading =
                document.querySelector("#graphLoadingState") ||
                document.querySelector(".graph-loading-state");


            this.elements.error =
                document.querySelector("#graphErrorState") ||
                document.querySelector(".graph-error-state");


            this.elements.errorMessage =
                document.querySelector("#graphErrorMessage");


            this.elements.empty =
                document.querySelector("#graphEmptyState") ||
                document.querySelector(".graph-empty-state");


            this.elements.resultSummary =
                document.querySelector("#graphResultSummary");


            this.elements.selectedPanel =
                document.querySelector("#selectedNodePanel");


            this.elements.selectedEmpty =
                document.querySelector("#selectedNodeEmpty");


            this.elements.selectedDetails =
                document.querySelector("#selectedNodeDetails");


            this.elements.selectedClose =
                document.querySelector("[data-close-selected-node]") ||
                document.querySelector("#closeSelectedNode");


            this.elements.selectedTypeIcon =
                document.querySelector("#selectedNodeTypeIcon");


            this.elements.selectedType =
                document.querySelector("#selectedNodeType");


            this.elements.selectedName =
                document.querySelector("#selectedNodeName");


            this.elements.selectedPropertyType =
                document.querySelector("#selectedNodePropertyType");


            this.elements.selectedReferenceRow =
                document.querySelector("#selectedNodeReferenceRow");


            this.elements.selectedReference =
                document.querySelector("#selectedNodeReference");


            this.elements.selectedStatusRow =
                document.querySelector("#selectedNodeStatusRow");


            this.elements.selectedStatus =
                document.querySelector("#selectedNodeStatus");


            this.elements.selectedDescriptionRow =
                document.querySelector("#selectedNodeDescriptionRow");


            this.elements.selectedDescription =
                document.querySelector("#selectedNodeDescription");


            this.elements.selectedConnections =
                document.querySelector("[data-selected-node-connections]") ||
                document.querySelector("#selectedNodeConnections");


            this.elements.zoomIn =
                document.querySelector("[data-graph-zoom-in]");


            this.elements.zoomOut =
                document.querySelector("[data-graph-zoom-out]");


            this.elements.fit =
                document.querySelector("[data-graph-fit]");


            this.elements.liveRegion =
                document.querySelector("#graphLiveRegion");
        },


        /* ==========================================================
           FILTER INITIALIZATION
        ========================================================== */

        readInitialFilters() {

            if (this.elements.search) {
                this.state.filters.search =
                    this.elements.search.value
                        .trim()
                        .toLowerCase();
            }


            this.state.filters.nodeTypes =
                new Set(
                    this.elements.nodeTypeFilters
                        .filter(
                            (checkbox) => checkbox.checked
                        )
                        .map(
                            (checkbox) =>
                                String(
                                    checkbox.dataset.nodeType
                                )
                                    .trim()
                                    .toLowerCase()
                        )
                );


            if (this.elements.relationship) {
                this.state.filters.relationship =
                    this.elements.relationship.value
                        .trim()
                        .toLowerCase();
            }
        },


        /* ==========================================================
           EVENT BINDING
        ========================================================== */

        bindEvents() {

            if (this.elements.search) {

                this.elements.search.addEventListener(
                    "input",
                    () => {

                        this.state.filters.search =
                            this.elements.search.value
                                .trim()
                                .toLowerCase();

                        this.updateSearchClear();
                        this.applyFilters();
                    }
                );
            }


            if (this.elements.searchClear) {

                this.elements.searchClear.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.clearSearch();
                    }
                );
            }


            this.elements.nodeTypeFilters.forEach(
                (checkbox) => {

                    checkbox.addEventListener(
                        "change",
                        () => {

                            this.updateNodeTypeFilters();
                            this.applyFilters();
                        }
                    );
                }
            );


            if (this.elements.relationship) {

                this.elements.relationship.addEventListener(
                    "change",
                    () => {

                        this.state.filters.relationship =
                            this.elements.relationship.value
                                .trim()
                                .toLowerCase();

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

                        this.loadGraph();
                    }
                );
            }


            if (this.elements.retry) {

                this.elements.retry.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.loadGraph();
                    }
                );
            }


            if (this.elements.selectedClose) {

                this.elements.selectedClose.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.clearSelectedNode();
                    }
                );
            }


            if (this.elements.zoomIn) {

                this.elements.zoomIn.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.zoomGraph(0.15);
                    }
                );
            }


            if (this.elements.zoomOut) {

                this.elements.zoomOut.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.zoomGraph(-0.15);
                    }
                );
            }


            if (this.elements.fit) {

                this.elements.fit.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        this.fitGraph();
                    }
                );
            }
        },


        /* ==========================================================
           API
        ========================================================== */

        getEndpoint() {

            if (!this.elements.page) {
                return "";
            }

            return (
                this.elements.page.dataset.graphEndpoint ||
                ""
            );
        },


        async loadGraph() {

            const endpoint =
                this.getEndpoint();


            const caseId =
                this.elements.page
                    ? this.elements.page.dataset.caseId
                    : "";


            /*
             * IMPORTANT:
             * /graph/ may be opened without a case.
             *
             * Do NOT call the API in that situation.
             */

            if (!caseId || !endpoint) {

                this.state.nodes = [];
                this.state.edges = [];
                this.state.filteredNodes = [];
                this.state.filteredEdges = [];
                this.state.selectedNode = null;
                this.state.loading = false;
                this.state.error = null;

                this.clearError();
                this.clearRenderedGraph();
                this.clearSelectedNode();
                this.updateSummary();

                this.showEmpty(
                    "Select a case to view its evidence graph."
                );

                return;
            }


            this.state.loading = true;
            this.state.error = null;

            this.showLoading();


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


                const graph =
                    this.normalizeGraphData(data);


                this.state.nodes =
                    graph.nodes;


                this.state.edges =
                    graph.edges;


                this.state.filteredNodes =
                    [...this.state.nodes];


                this.state.filteredEdges =
                    [...this.state.edges];


                this.state.selectedNode =
                    null;


                this.resetZoom();


                this.state.loading =
                    false;


                this.clearError();
                this.clearSelectedNode();


                if (!this.state.nodes.length) {

                    this.clearRenderedGraph();
                    this.updateSummary();

                    this.showEmpty(
                        "No evidence graph data is available for this case yet."
                    );

                    return;
                }


                this.renderGraph();
                this.updateSummary();
                this.showLoadedState();


                this.announce(
                    `${this.state.nodes.length} graph nodes loaded.`
                );

            } catch (error) {

                this.state.loading =
                    false;

                this.state.error =
                    error;


                this.clearRenderedGraph();


                this.showError(
                    error && error.message
                        ? error.message
                        : "Unable to load the evidence graph."
                );


                console.error(
                    "Evidence graph error:",
                    error
                );
            }
        },


        async fetchJson(url) {

            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        credentials: "same-origin",
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
                        JSON.parse(text);

                } catch (error) {

                    data =
                        text;
                }
            }


            if (!response.ok) {

                throw new Error(
                    this.getErrorMessage(data) ||
                    response.statusText ||
                    "Unable to load the evidence graph."
                );
            }


            return data;
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


        normalizeGraphData(data) {

            const graph =
                data &&
                data.graph
                    ? data.graph
                    : data;


            if (
                !graph ||
                typeof graph !== "object"
            ) {

                return {
                    nodes: [],
                    edges: []
                };
            }


            const rawNodes =
                Array.isArray(graph.nodes)
                    ? graph.nodes
                    : [];


            const rawEdges =
                Array.isArray(graph.edges)
                    ? graph.edges
                    : [];


            const nodes =
                rawNodes.map(
                    (node, index) =>
                        this.normalizeNode(
                            node,
                            index
                        )
                );


            const nodeIds =
                new Set(
                    nodes.map(
                        (node) =>
                            String(node.id)
                    )
                );


            const edges =
                rawEdges
                    .map(
                        (edge, index) =>
                            this.normalizeEdge(
                                edge,
                                index
                            )
                    )
                    .filter(
                        (edge) =>
                            nodeIds.has(
                                String(edge.source)
                            ) &&
                            nodeIds.has(
                                String(edge.target)
                            )
                    );


            return {
                nodes,
                edges
            };
        },


        normalizeNode(node, index) {

            const id =
                this.getValue(
                    node,
                    [
                        "id",
                        "node_id",
                        "entity_id"
                    ],
                    `node-${index + 1}`
                );


            const label =
                this.getValue(
                    node,
                    [
                        "label",
                        "name",
                        "title"
                    ],
                    `Entity ${index + 1}`
                );


            const type =
                this.getValue(
                    node,
                    [
                        "type",
                        "entity_type",
                        "node_type",
                        "category"
                    ],
                    "unknown"
                );


            const properties =
                node &&
                typeof node.properties === "object"
                    ? node.properties
                    : {};


            return {
                id: String(id),
                label: String(label),
                type:
                    String(type)
                        .trim()
                        .toLowerCase(),
                properties
            };
        },


        normalizeEdge(edge, index) {

            const source =
                this.getValue(
                    edge,
                    [
                        "source",
                        "source_id",
                        "from"
                    ],
                    ""
                );


            const target =
                this.getValue(
                    edge,
                    [
                        "target",
                        "target_id",
                        "to"
                    ],
                    ""
                );


            const relationship =
                this.getValue(
                    edge,
                    [
                        "relationship",
                        "relation",
                        "label",
                        "type"
                    ],
                    "Related"
                );


            return {
                id:
                    String(
                        this.getValue(
                            edge,
                            [
                                "id",
                                "edge_id"
                            ],
                            `edge-${index + 1}`
                        )
                    ),

                source:
                    String(source),

                target:
                    String(target),

                relationship:
                    String(relationship)
            };
        },


        /* ==========================================================
           FILTERING
        ========================================================== */

        updateNodeTypeFilters() {

            this.state.filters.nodeTypes =
                new Set(
                    this.elements.nodeTypeFilters
                        .filter(
                            (checkbox) =>
                                checkbox.checked
                        )
                        .map(
                            (checkbox) =>
                                String(
                                    checkbox.dataset.nodeType
                                )
                                    .trim()
                                    .toLowerCase()
                        )
                );
        },


        applyFilters() {

            const search =
                this.state.filters.search;


            const selectedTypes =
                this.state.filters.nodeTypes;


            const relationship =
                this.state.filters.relationship;


            this.state.filteredNodes =
                this.state.nodes.filter(
                    (node) => {

                        const matchesSearch =
                            !search ||
                            node.label
                                .toLowerCase()
                                .includes(search);


                        const matchesType =
                            selectedTypes.has(
                                node.type
                            );


                        return (
                            matchesSearch &&
                            matchesType
                        );
                    }
                );


            /*
             * When searching for an entity, keep directly
             * connected entities visible.
             */

            if (search) {

                const matchingIds =
                    new Set(
                        this.state.filteredNodes.map(
                            (node) =>
                                String(node.id)
                        )
                    );


                this.state.edges.forEach(
                    (edge) => {

                        let connectedId =
                            null;


                        if (
                            matchingIds.has(
                                String(edge.source)
                            )
                        ) {

                            connectedId =
                                edge.target;

                        } else if (
                            matchingIds.has(
                                String(edge.target)
                            )
                        ) {

                            connectedId =
                                edge.source;
                        }


                        if (!connectedId) {
                            return;
                        }


                        const connectedNode =
                            this.state.nodes.find(
                                (node) =>
                                    String(node.id) ===
                                    String(connectedId)
                            );


                        if (
                            connectedNode &&
                            selectedTypes.has(
                                connectedNode.type
                            )
                        ) {

                            this.state.filteredNodes.push(
                                connectedNode
                            );
                        }
                    }
                );


                const unique =
                    new Map();


                this.state.filteredNodes.forEach(
                    (node) => {

                        unique.set(
                            String(node.id),
                            node
                        );
                    }
                );


                this.state.filteredNodes =
                    Array.from(
                        unique.values()
                    );
            }


            const visibleIds =
                new Set(
                    this.state.filteredNodes.map(
                        (node) =>
                            String(node.id)
                    )
                );


            this.state.filteredEdges =
                this.state.edges.filter(
                    (edge) => {

                        const connected =
                            visibleIds.has(
                                String(edge.source)
                            ) &&
                            visibleIds.has(
                                String(edge.target)
                            );


                        const matchesRelationship =
                            !relationship ||
                            edge.relationship
                                .trim()
                                .toLowerCase() ===
                                relationship;


                        return (
                            connected &&
                            matchesRelationship
                        );
                    }
                );


            if (
                this.state.selectedNode &&
                !visibleIds.has(
                    String(
                        this.state.selectedNode.id
                    )
                )
            ) {

                this.clearSelectedNode();
            }


            this.renderGraph();
            this.updateSummary();
            this.updateSearchHighlight();
            this.updateEmptyState();
            this.announceFilterResult();
        },


        resetFilters() {

            if (this.elements.search) {
                this.elements.search.value = "";
            }


            if (this.elements.relationship) {
                this.elements.relationship.value = "";
            }


            this.elements.nodeTypeFilters.forEach(
                (checkbox) => {
                    checkbox.checked = true;
                }
            );


            this.state.filters.search = "";
            this.state.filters.relationship = "";


            this.updateNodeTypeFilters();
            this.updateSearchClear();
            this.clearSelectedNode();
            this.applyFilters();
        },


        clearSearch() {

            if (!this.elements.search) {
                return;
            }


            this.elements.search.value = "";


            this.state.filters.search = "";


            this.updateSearchClear();
            this.applyFilters();


            this.elements.search.focus();
        },


        updateSearchClear() {

            if (!this.elements.searchClear) {
                return;
            }


            this.elements.searchClear.hidden =
                !(
                    this.elements.search &&
                    this.elements.search.value.trim()
                );
        },


        updateSearchHighlight() {

            if (!this.elements.container) {
                return;
            }


            const search =
                this.state.filters.search;


            this.elements.container
                .querySelectorAll(".graph-node")
                .forEach(
                    (nodeElement) => {

                        const nodeId =
                            nodeElement.dataset.nodeId;


                        const node =
                            this.state.nodes.find(
                                (item) =>
                                    String(item.id) ===
                                    String(nodeId)
                            );


                        const matches =
                            Boolean(
                                search &&
                                node &&
                                node.label
                                    .toLowerCase()
                                    .includes(search)
                            );


                        nodeElement.classList.toggle(
                            "is-search-match",
                            matches
                        );
                    }
                );
        },


        /* ==========================================================
           GRAPH RENDERING
        ========================================================== */

        renderGraph() {

            if (!this.elements.container) {
                return;
            }


            this.clearRenderedGraph();


            if (
                !this.state.filteredNodes.length
            ) {
                return;
            }


            const width =
                Math.max(
                    this.elements.container.clientWidth || 800,
                    600
                );


            const height =
                Math.max(
                    this.elements.container.clientHeight || 570,
                    500
                );


            const svg =
                this.createSvgElement("svg");


            svg.classList.add("graph-svg");


            svg.setAttribute(
                "viewBox",
                `0 0 ${width} ${height}`
            );


            svg.setAttribute(
                "aria-hidden",
                "true"
            );


            const defs =
                this.createSvgElement("defs");


            const marker =
                this.createSvgElement("marker");


            marker.setAttribute(
                "id",
                "graph-arrow"
            );


            marker.setAttribute(
                "markerWidth",
                "8"
            );


            marker.setAttribute(
                "markerHeight",
                "8"
            );


            marker.setAttribute(
                "refX",
                "7"
            );


            marker.setAttribute(
                "refY",
                "3"
            );


            marker.setAttribute(
                "orient",
                "auto"
            );


            const arrow =
                this.createSvgElement("path");


            arrow.setAttribute(
                "d",
                "M0,0 L0,6 L7,3 z"
            );


            arrow.setAttribute(
                "fill",
                "#a8b4c3"
            );


            marker.appendChild(arrow);
            defs.appendChild(marker);
            svg.appendChild(defs);


            const edgeLayer =
                this.createSvgElement("g");


            edgeLayer.classList.add(
                "graph-edge-layer"
            );


            const nodeLayer =
                this.createSvgElement("g");


            nodeLayer.classList.add(
                "graph-node-layer"
            );


            svg.appendChild(edgeLayer);
            svg.appendChild(nodeLayer);


            this.elements.container.appendChild(
                svg
            );


            const positions =
                this.calculatePositions(
                    this.state.filteredNodes,
                    width,
                    height
                );


            const positionMap =
                new Map();


            positions.forEach(
                (position) => {

                    positionMap.set(
                        String(position.node.id),
                        position
                    );
                }
            );


            /*
             * Render relationships.
             */

            this.state.filteredEdges.forEach(
                (edge) => {

                    const source =
                        positionMap.get(
                            String(edge.source)
                        );


                    const target =
                        positionMap.get(
                            String(edge.target)
                        );


                    if (!source || !target) {
                        return;
                    }


                    const line =
                        this.createSvgElement("line");


                    line.classList.add(
                        "graph-edge"
                    );


                    line.setAttribute(
                        "x1",
                        source.x
                    );


                    line.setAttribute(
                        "y1",
                        source.y
                    );


                    line.setAttribute(
                        "x2",
                        target.x
                    );


                    line.setAttribute(
                        "y2",
                        target.y
                    );


                    line.setAttribute(
                        "marker-end",
                        "url(#graph-arrow)"
                    );


                    edgeLayer.appendChild(line);


                    const label =
                        this.createSvgElement("text");


                    label.classList.add(
                        "graph-edge-label"
                    );


                    label.setAttribute(
                        "x",
                        (source.x + target.x) / 2
                    );


                    label.setAttribute(
                        "y",
                        (source.y + target.y) / 2 - 6
                    );


                    label.textContent =
                        this.truncate(
                            edge.relationship,
                            22
                        );


                    edgeLayer.appendChild(label);
                }
            );


            /*
             * Render nodes.
             */

            positions.forEach(
                (position) => {

                    this.renderNode(
                        nodeLayer,
                        position.node,
                        position.x,
                        position.y
                    );
                }
            );


            this.updateSearchHighlight();
            this.highlightSelectedNode();
            this.applyZoomTransform();
        },


        calculatePositions(
            nodes,
            width,
            height
        ) {

            const centerX =
                width / 2;


            const centerY =
                height / 2;


            if (nodes.length === 1) {

                return [
                    {
                        node: nodes[0],
                        x: centerX,
                        y: centerY
                    }
                ];
            }


            const radius =
                Math.min(width, height) *
                0.32;


            return nodes.map(
                (node, index) => {

                    const angle =
                        (
                            index /
                            nodes.length
                        ) *
                        Math.PI *
                        2 -
                        Math.PI / 2;


                    return {
                        node,

                        x:
                            centerX +
                            Math.cos(angle) *
                            radius,

                        y:
                            centerY +
                            Math.sin(angle) *
                            radius
                    };
                }
            );
        },


        renderNode(
            layer,
            node,
            x,
            y
        ) {

            const group =
                this.createSvgElement("g");


            group.classList.add(
                "graph-node"
            );


            group.classList.add(
                `graph-node--${this.safeClassName(
                    node.type
                )}`
            );


            group.dataset.nodeId =
                node.id;


            group.setAttribute(
                "tabindex",
                "0"
            );


            group.setAttribute(
                "role",
                "button"
            );


            group.setAttribute(
                "aria-label",
                `${node.label}, ${this.formatType(node.type)}`
            );


            group.setAttribute(
                "transform",
                `translate(${x}, ${y})`
            );


            const circle =
                this.createSvgElement("circle");


            circle.classList.add(
                "graph-node-circle"
            );


            circle.setAttribute(
                "r",
                "28"
            );


            group.appendChild(circle);


            const label =
                this.createSvgElement("text");


            label.classList.add(
                "graph-node-label"
            );


            label.setAttribute(
                "text-anchor",
                "middle"
            );


            label.setAttribute(
                "dy",
                "4"
            );


            label.textContent =
                this.truncate(
                    node.label,
                    17
                );


            group.appendChild(label);


            const type =
                this.createSvgElement("text");


            type.classList.add(
                "graph-node-type"
            );


            type.setAttribute(
                "text-anchor",
                "middle"
            );


            type.setAttribute(
                "dy",
                "48"
            );


            type.textContent =
                this.formatType(
                    node.type
                );


            group.appendChild(type);


            layer.appendChild(group);


            group.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    this.selectNode(
                        node.id
                    );
                }
            );


            group.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        this.selectNode(
                            node.id
                        );
                    }
                }
            );
        },


        /* ==========================================================
           SELECTED ENTITY
        ========================================================== */

        selectNode(nodeId) {

            const node =
                this.state.nodes.find(
                    (item) =>
                        String(item.id) ===
                        String(nodeId)
                );


            if (!node) {
                return;
            }


            this.state.selectedNode =
                node;


            this.highlightSelectedNode();
            this.renderSelectedNode();


            this.announce(
                `${node.label} selected.`
            );
        },


        highlightSelectedNode() {

            if (!this.elements.container) {
                return;
            }


            const selectedId =
                this.state.selectedNode
                    ? String(
                        this.state.selectedNode.id
                    )
                    : "";


            this.elements.container
                .querySelectorAll(".graph-node")
                .forEach(
                    (element) => {

                        element.classList.toggle(
                            "is-selected",
                            String(
                                element.dataset.nodeId
                            ) === selectedId
                        );
                    }
                );
        },


        renderSelectedNode() {

            const node =
                this.state.selectedNode;


            if (!node) {
                return;
            }


            if (this.elements.selectedEmpty) {
                this.elements.selectedEmpty.hidden =
                    true;
            }


            if (this.elements.selectedDetails) {
                this.elements.selectedDetails.hidden =
                    false;
            }


            if (this.elements.selectedClose) {
                this.elements.selectedClose.hidden =
                    false;
            }


            if (this.elements.selectedType) {
                this.elements.selectedType.textContent =
                    this.formatType(node.type);
            }


            if (this.elements.selectedName) {
                this.elements.selectedName.textContent =
                    node.label;
            }


            if (this.elements.selectedPropertyType) {
                this.elements.selectedPropertyType.textContent =
                    this.formatType(node.type);
            }


            if (this.elements.selectedTypeIcon) {
                this.elements.selectedTypeIcon.textContent =
                    this.getTypeInitial(node.type);
            }


            this.renderProperty(
                this.elements.selectedReferenceRow,
                this.elements.selectedReference,
                this.getProperty(
                    node,
                    [
                        "source_reference",
                        "reference"
                    ]
                )
            );


            this.renderProperty(
                this.elements.selectedStatusRow,
                this.elements.selectedStatus,
                this.getProperty(
                    node,
                    ["status"]
                )
            );


            this.renderProperty(
                this.elements.selectedDescriptionRow,
                this.elements.selectedDescription,
                this.getProperty(
                    node,
                    ["description"]
                )
            );


            this.renderConnections(node);
        },


        renderProperty(
            row,
            valueElement,
            value
        ) {

            if (!row || !valueElement) {
                return;
            }


            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {

                row.hidden = true;
                valueElement.textContent = "—";

                return;
            }


            row.hidden = false;


            valueElement.textContent =
                this.formatValue(value);
        },


        renderConnections(node) {

            if (!this.elements.selectedConnections) {
                return;
            }


            const connections =
                this.getConnections(node.id);


            if (!connections.length) {

                this.elements.selectedConnections.innerHTML =
                    `
                        <p class="selected-node-no-connections">
                            No connection details available.
                        </p>
                    `;

                return;
            }


            this.elements.selectedConnections.innerHTML =
                "";


            const list =
                document.createElement("ul");


            list.className =
                "graph-connections";


            connections.forEach(
                (connection) => {

                    const item =
                        document.createElement("li");


                    item.className =
                        "graph-connection";


                    const button =
                        document.createElement("button");


                    button.type =
                        "button";


                    button.className =
                        "graph-connection-link";


                    button.dataset.nodeId =
                        connection.node.id;


                    const name =
                        document.createElement("span");


                    name.className =
                        "graph-connection-name";


                    name.textContent =
                        connection.node.label;


                    const type =
                        document.createElement("span");


                    type.className =
                        "graph-connection-type";


                    type.textContent =
                        this.formatType(
                            connection.node.type
                        );


                    button.appendChild(name);
                    button.appendChild(type);


                    button.addEventListener(
                        "click",
                        () => {

                            this.selectNode(
                                connection.node.id
                            );

                            this.scrollNodeIntoView(
                                connection.node.id
                            );
                        }
                    );


                    item.appendChild(button);
                    list.appendChild(item);
                }
            );


            this.elements.selectedConnections.appendChild(
                list
            );
        },


        getConnections(nodeId) {

            const connections = [];


            this.state.edges.forEach(
                (edge) => {

                    let connectedId = null;


                    if (
                        String(edge.source) ===
                        String(nodeId)
                    ) {

                        connectedId =
                            edge.target;

                    } else if (
                        String(edge.target) ===
                        String(nodeId)
                    ) {

                        connectedId =
                            edge.source;
                    }


                    if (!connectedId) {
                        return;
                    }


                    const connectedNode =
                        this.state.nodes.find(
                            (node) =>
                                String(node.id) ===
                                String(connectedId)
                        );


                    if (!connectedNode) {
                        return;
                    }


                    connections.push({
                        node:
                            connectedNode,

                        relationship:
                            edge.relationship
                    });
                }
            );


            return connections;
        },


        clearSelectedNode() {

            this.state.selectedNode =
                null;


            if (this.elements.selectedEmpty) {
                this.elements.selectedEmpty.hidden =
                    false;
            }


            if (this.elements.selectedDetails) {
                this.elements.selectedDetails.hidden =
                    true;
            }


            if (this.elements.selectedClose) {
                this.elements.selectedClose.hidden =
                    true;
            }


            if (this.elements.container) {

                this.elements.container
                    .querySelectorAll(
                        ".graph-node.is-selected"
                    )
                    .forEach(
                        (node) => {

                            node.classList.remove(
                                "is-selected"
                            );
                        }
                    );
            }
        },


        scrollNodeIntoView(nodeId) {

            if (!this.elements.container) {
                return;
            }


            const selector =
                `[data-node-id="${CSS.escape(
                    String(nodeId)
                )}"]`;


            const node =
                this.elements.container.querySelector(
                    selector
                );


            if (node) {

                node.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center"
                });
            }
        },


        /* ==========================================================
           ZOOM
        ========================================================== */

        zoomGraph(amount) {

            this.state.zoom =
                Math.min(
                    2.5,
                    Math.max(
                        0.5,
                        this.state.zoom + amount
                    )
                );


            this.applyZoomTransform();
        },


        resetZoom() {

            this.state.zoom =
                1;

            this.state.panX =
                0;

            this.state.panY =
                0;

            this.applyZoomTransform();
        },


        fitGraph() {

            if (!this.state.filteredNodes.length) {
                this.resetZoom();
                return;
            }


            this.state.zoom =
                0.9;

            this.state.panX =
                0;

            this.state.panY =
                0;


            this.applyZoomTransform();
        },


        applyZoomTransform() {

            if (!this.elements.container) {
                return;
            }


            const svg =
                this.elements.container.querySelector(
                    "svg.graph-svg"
                );


            if (!svg) {
                return;
            }


            const groups =
                svg.querySelectorAll(
                    ".graph-edge-layer, .graph-node-layer"
                );


            const width =
                this.elements.container.clientWidth ||
                800;


            const height =
                this.elements.container.clientHeight ||
                570;


            const centerX =
                width / 2;


            const centerY =
                height / 2;


            const transform =
                `translate(${centerX + this.state.panX} ${centerY + this.state.panY}) scale(${this.state.zoom}) translate(${-centerX} ${-centerY})`;


            groups.forEach(
                (group) => {

                    group.setAttribute(
                        "transform",
                        transform
                    );
                }
            );
        },


        /* ==========================================================
           UI STATES
        ========================================================== */

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


            if (this.elements.empty) {
                this.elements.empty.hidden =
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


        showEmpty(message) {

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


                const paragraph =
                    this.elements.empty.querySelector(
                        "p"
                    );


                if (paragraph && message) {
                    paragraph.textContent =
                        message;
                }
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


        updateEmptyState() {

            if (!this.elements.empty) {
                return;
            }


            if (this.state.filteredNodes.length) {

                this.elements.empty.hidden =
                    true;

                return;
            }


            this.showEmpty(
                "No entities match the selected filters."
            );
        },


        /* ==========================================================
           SUMMARY
        ========================================================== */

        updateSummary() {

            if (!this.elements.resultSummary) {
                return;
            }


            const nodeCount =
                this.state.filteredNodes.length;


            const edgeCount =
                this.state.filteredEdges.length;


            this.elements.resultSummary.textContent =
                `${nodeCount} node${
                    nodeCount === 1 ? "" : "s"
                } · ${edgeCount} relationship${
                    edgeCount === 1 ? "" : "s"
                }`;
        },


        announceFilterResult() {

            this.announce(
                `${this.state.filteredNodes.length} nodes and ${this.state.filteredEdges.length} relationships shown.`
            );
        },


        announce(message) {

            if (!this.elements.liveRegion) {
                return;
            }


            this.elements.liveRegion.textContent =
                "";


            window.setTimeout(
                () => {

                    this.elements.liveRegion.textContent =
                        message;
                },
                20
            );
        },


        /* ==========================================================
           HELPERS
        ========================================================== */

        getProperty(node, keys) {

            if (
                !node ||
                !node.properties
            ) {
                return undefined;
            }


            for (const key of keys) {

                if (
                    node.properties[key] !==
                        undefined &&
                    node.properties[key] !==
                        null &&
                    node.properties[key] !== ""
                ) {

                    return node.properties[key];
                }
            }


            return undefined;
        },


        getValue(
            object,
            keys,
            fallback
        ) {

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


        formatType(type) {

            return String(
                type || "Unknown"
            )
                .replace(
                    /[_-]+/g,
                    " "
                )
                .replace(
                    /\b\w/g,
                    (character) =>
                        character.toUpperCase()
                );
        },


        getTypeInitial(type) {

            return this.formatType(type)
                .charAt(0)
                .toUpperCase();
        },


        formatValue(value) {

            if (
                typeof value === "object"
            ) {

                try {
                    return JSON.stringify(value);
                } catch (error) {
                    return String(value);
                }
            }


            return String(value);
        },


        truncate(
            value,
            maxLength
        ) {

            const text =
                String(value || "");


            if (
                text.length <= maxLength
            ) {
                return text;
            }


            return (
                text.slice(
                    0,
                    maxLength - 1
                ) +
                "…"
            );
        },


        safeClassName(value) {

            return String(
                value || "unknown"
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9_-]+/g,
                    "-"
                );
        },


        createSvgElement(tag) {

            return document.createElementNS(
                "http://www.w3.org/2000/svg",
                tag
            );
        },


        clearRenderedGraph() {

            if (!this.elements.container) {
                return;
            }


            const svg =
                this.elements.container.querySelector(
                    "svg.graph-svg"
                );


            if (svg) {
                svg.remove();
            }
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
                typeof data.message === "string"
            ) {
                return data.message;
            }


            if (
                typeof data.detail === "string"
            ) {
                return data.detail;
            }


            if (
                typeof data.error === "string"
            ) {
                return data.error;
            }


            return "";
        }
    };


    /* ==============================================================
       START
    ============================================================== */

    function initializeGraph() {
        EvidenceGraph.init();
    }


    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeGraph,
            {
                once: true
            }
        );

    } else {

        initializeGraph();
    }


    window.IOEvidenceGraph =
        EvidenceGraph;

})(window, document);