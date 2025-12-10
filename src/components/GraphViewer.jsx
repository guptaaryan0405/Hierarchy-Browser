import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import cxtmenu from 'cytoscape-cxtmenu';
import { generateDynamicStyles } from '../styles/graphStyles';

cytoscape.use(fcose);
cytoscape.use(cxtmenu);

const GraphViewer = ({
    elements, threshold, viewMode, maxConnections, zoomToId, isolateId,
    curveStyle, endpointStyle, onIsolate, onCyReady, onSelect, onHover,
    nodeFontSize, edgeFontSize, gradientMin, gradientMax,
    widthDataMin, widthDataMax, thicknessMin, thicknessMax
}) => {
    const cyRef = useRef(null);
    const [layoutRunning, setLayoutRunning] = useState(false);

    const layoutOptions = {
        name: 'fcose',
        quality: 'proof', // 'default' or 'proof' (slower but better quality)
        randomize: false, // Deterministic layout
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 60,
        nodeDimensionsIncludeLabels: true,
        uniformNodeDimensions: false,
        packComponents: true, // Pack disconnected components tightly
        tile: true,           // Enable tiling to better organize disconnected nodes
        step: 'all',

        // Nesting options
        nestedNodeDimensions: true,

        // Gravity - Strong but balanced by separation
        gravity: 0.5,
        gravityRange: 3.8,
        gravityCompound: 5.0,     // Strong pull to center
        gravityRangeCompound: 2.0,
        numIter: 6000,            // MAX iterations to resolve constraints

        // Repulsion & Padding - 'Solid Walls' Algorithm
        nodeRepulsion: 2500000,   // Extreme repulsion to enforce "No Overlap" rule
        idealEdgeLength: 30,      // Slightly relaxed to allow arrangement
        edgeElasticity: 0.1,      // Weaker springs so they don't pull through walls
        nestingFactor: 0.1,

        // Tiling
        tilingPaddingVertical: 5,
        tilingPaddingHorizontal: 5,

        stop: () => {
            setLayoutRunning(false);
        }
    };


    useEffect(() => {
        if (cyRef.current) {
            // Update styles including new visual params
            cyRef.current.style(generateDynamicStyles(
                threshold, viewMode, maxConnections, curveStyle, endpointStyle,
                nodeFontSize, edgeFontSize, gradientMin, gradientMax,
                widthDataMin, widthDataMax, thicknessMin, thicknessMax
            ));
        }
    }, [threshold, viewMode, maxConnections, curveStyle, endpointStyle,
        nodeFontSize, edgeFontSize, gradientMin, gradientMax,
        widthDataMin, widthDataMax, thicknessMin, thicknessMax]);

    // Handle Zoom To
    useEffect(() => {
        if (cyRef.current && zoomToId) {
            const cy = cyRef.current;
            const node = cy.getElementById(zoomToId);

            if (node.length > 0) {
                // Clear previous highlights
                cy.elements().removeClass('highlighted');

                // Add highlight class
                node.addClass('highlighted');

                // Animate zoom (center and set reasonable zoom level)
                cy.animate({
                    center: { eles: node },
                    zoom: 2, // Fixed zoom level to avoid "too much" zoom
                    duration: 500
                });
            }
        }
    }, [zoomToId]);

    // Handle Isolate
    useEffect(() => {
        if (cyRef.current && isolateId) {
            const node = cyRef.current.getElementById(isolateId);
            if (node.length > 0) {
                const neighborhood = node.neighborhood().add(node);
                const parents = node.parents();
                const children = node.descendants();

                const toShow = neighborhood.add(parents).add(children);

                cyRef.current.elements().addClass('hidden');
                toShow.removeClass('hidden').addClass('isolated');
                toShow.parents().removeClass('hidden'); // Ensure parents are visible

                cyRef.current.animate({
                    fit: {
                        eles: toShow,
                        padding: 50
                    }
                });
            }
        } else if (cyRef.current && isolateId === null) {
            // Reset isolation if explicitly set to null (optional, or handle via tap)
            cyRef.current.elements().removeClass('hidden').removeClass('isolated');
        }
    }, [isolateId]);

    useEffect(() => {
        if (cyRef.current && elements.length > 0) {
            // Run layout when elements OR layout params change
            const layout = cyRef.current.layout(layoutOptions);
            layout.run();
        }
    }, [elements]);

    const [cyInstance, setCyInstance] = useState(null);

    // Refs for handlers to avoid stale closures in listeners
    const onSelectRef = useRef(onSelect);
    const onHoverRef = useRef(onHover);
    const onIsolateRef = useRef(onIsolate);

    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
    useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
    useEffect(() => { onIsolateRef.current = onIsolate; }, [onIsolate]);

    // Attach listeners when cyInstance is available
    useEffect(() => {
        const cy = cyInstance;
        if (!cy) return;

        // Cleanup old listeners to prevent duplicates
        cy.removeListener('tap');
        cy.removeListener('mouseover');
        cy.removeListener('mouseout');

        // Context Menu
        cy.cxtmenu({
            selector: 'node',
            commands: [
                {
                    content: 'Info',
                    select: (ele) => {
                        if (onSelectRef.current) onSelectRef.current({ type: 'node', data: ele.data() });
                    }
                },
                {
                    content: 'Isolate',
                    select: (ele) => {
                        if (onIsolateRef.current) onIsolateRef.current(ele.id());
                    }
                },
                {
                    content: 'Reset View',
                    select: () => {
                        if (onIsolateRef.current) onIsolateRef.current(null);
                    }
                }
            ]
        });

        // Click Logic (Tap) for Selection
        cy.on('tap', 'node', (evt) => {
            const node = evt.target;

            // Visual Highlight
            cy.elements().removeClass('selected');
            node.addClass('selected');

            if (onSelectRef.current) onSelectRef.current({ type: 'node', data: node.data() });
        });

        cy.on('tap', 'edge', (evt) => {
            const edge = evt.target;

            // Visual Highlight
            cy.elements().removeClass('selected');
            edge.addClass('selected');

            if (onSelectRef.current) onSelectRef.current({ type: 'edge', data: edge.data() });
        });

        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                if (onSelectRef.current) onSelectRef.current(null);

                // Clear highlights
                cy.elements().removeClass('highlighted').removeClass('selected');
            }
        });

        // Hover Logic for Name Strip
        cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            if (onHoverRef.current) onHoverRef.current({ id: node.id(), label: node.data('label') });
        });

        cy.on('mouseout', 'node', () => {
            if (onHoverRef.current) onHoverRef.current(null);
        });

    }, [cyInstance]); // Run when cyInstance changes

    const handleCy = (cy) => {
        cyRef.current = cy;
        setCyInstance(cy); // Trigger re-render and effect
        if (onCyReady) onCyReady(cy);
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' }}>
            <CytoscapeComponent
                elements={elements}
                style={{ width: '100%', height: '100%' }}
                stylesheet={generateDynamicStyles(
                    threshold, viewMode, maxConnections, curveStyle, endpointStyle,
                    nodeFontSize, edgeFontSize, gradientMin, gradientMax,
                    widthDataMin, widthDataMax, thicknessMin, thicknessMax
                )}
                cy={handleCy}
                wheelSensitivity={0.3}
            />
        </div>
    );
};

export default GraphViewer;
