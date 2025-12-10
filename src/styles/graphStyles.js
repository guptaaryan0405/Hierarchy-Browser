export const getGraphStyles = (threshold = -5.0) => [
    {
        selector: 'node',
        style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#ffffff',
            'border-width': 1,
            'border-color': '#333',
            'shape': 'rectangle',
            'font-size': '10px',
            'width': '60px', // Fallback from 'label' to fixed/auto to prevent crash
            'height': '40px',
            'padding': '10px',
            'z-index': 999,
            'z-compound-depth': 'top'
        }
    },
    {
        selector: ':parent',
        style: {
            'text-valign': 'top',
            'text-halign': 'center',
            'background-color': '#f0f0f0',
            'background-opacity': 0.3,
            'border-width': 2,
            'border-color': '#999',
            'font-weight': 'bold',
            'font-size': '12px',
            'padding': '20px',
            'z-index': 0,
            'z-compound-depth': 'bottom'
        }
    },
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'z-index': 998,
            'z-compound-depth': 'top'
        }
    },
    {
        selector: 'edge[wns < 0]',
        style: {
            'line-color': 'mapData(wns, -10, 0, red, #ffcccc)',
            'target-arrow-color': 'mapData(wns, -10, 0, red, #ffcccc)',
            'width': 'mapData(wns, -10, 0, 4, 1)'
        }
    },
    {
        selector: 'edge[wns >= 0]',
        style: {
            'line-color': '#4caf50',
            'target-arrow-color': '#4caf50',
            'width': 1
        }
    },
    // Dynamic threshold styling helper
    // Since we can't easily pass dynamic variables into the stylesheet string for mapData limits without regenerating it,
    // we will handle the exact color mapping logic in the component or regenerate this array.
    // For now, let's assume a fixed range or use the passed threshold.
];

export const generateDynamicStyles = (
    threshold, viewMode = 'wns', maxConnections = 10, curveStyle = 'straight', endpointStyle = 'inside-to-node',
    nodeFontSize = 12, edgeFontSize = 10, gradientMin = -10, gradientMax = 0,
    widthDataMin = -10, widthDataMax = 0, // NEW: Data limits for width
    thicknessMin = 1, thicknessMax = 5    // Fixed pixel limits
) => {

    const formatLabel = (label) => {
        if (!label) return '';
        const maxLength = 40;
        let text = label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
        return text.split('_').join('_\u200B');
    };

    const styles = [
        {
            selector: 'node',
            style: {
                'label': (ele) => formatLabel(ele.data('label')),
                'text-valign': 'center',
                'text-halign': 'center',
                'text-wrap': 'wrap',
                'text-max-width': '55px',
                'background-color': '#fff',
                'border-width': 1,
                'border-color': '#555',
                'shape': 'round-rectangle',
                'font-size': nodeFontSize, // Independent Node Font Size
                'width': '60px',
                'height': '40px',
                'padding': 4,
                'z-index': 999,
                'z-compound-depth': 'top'
            }
        },
        {
            selector: ':parent',
            style: {
                'text-valign': 'top',
                'text-halign': 'center',
                'background-color': '#fafafa',
                'background-opacity': 0.5,
                'border-width': 2,
                'border-color': '#333',
                'font-weight': 'bold',
                'font-size': nodeFontSize + 2,
                'padding': 10,
                'z-index': 0,
                'z-compound-depth': 'bottom'
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 1,
                'curve-style': curveStyle,
                'source-endpoint': endpointStyle,
                'target-endpoint': endpointStyle,
                'target-arrow-shape': 'triangle',
                'arrow-scale': 1,
                'label': `data(${viewMode})`,
                'font-size': edgeFontSize, // Independent Edge Font Size
                'text-background-color': '#fff',
                'text-background-opacity': 0.8,
                'text-background-padding': 2,
                'taxi-direction': 'auto',
                'taxi-turn': 20,
                'taxi-turn-min-distance': 5,
                'z-index': 998,
                'z-compound-depth': 'top'
            }
        },
        // ... (standard classes like .highlighted, .selected remain same)
        {
            selector: '.isolated',
            style: { 'display': 'element' }
        },
        {
            selector: '.highlighted',
            style: { 'border-color': '#ff00ff', 'border-width': 4 }
        },
        {
            selector: '.selected',
            style: {
                'border-color': '#ff00ff',
                'border-width': 4,
                'line-color': '#ff00ff',
                'target-arrow-color': '#ff00ff',
                'z-index': 1000
            }
        },
        {
            selector: '.hidden',
            style: { 'display': 'none' }
        }
    ];

    if (viewMode === 'wns' || viewMode === 'tns') {
        styles.push(
            {
                // Negative values (violations)
                selector: `edge[${viewMode} < 0]`,
                style: {
                    // Map input range (gradientMin ... gradientMax) to output range (Red ... LightRed)
                    'line-color': `mapData(${viewMode}, ${gradientMin}, ${gradientMax}, #ff0000, #ffcccc)`,
                    'target-arrow-color': `mapData(${viewMode}, ${gradientMin}, ${gradientMax}, #ff0000, #ffcccc)`,
                    // Thicker for worse values (closer to widthDataMin aka most negative)
                    // Note: If widthDataMin != gradientMin, this allows independent control
                    'width': `mapData(${viewMode}, ${widthDataMin}, ${widthDataMax}, ${thicknessMax}, ${thicknessMin})`,
                    'color': '#d32f2f',
                    'curve-style': curveStyle,
                    'source-endpoint': endpointStyle,
                    'target-endpoint': endpointStyle
                }
            },
            {
                // Positive values (Good)
                selector: `edge[${viewMode} >= 0]`,
                style: {
                    'line-color': '#2ecc71',
                    'target-arrow-color': '#2ecc71',
                    'width': thicknessMin, // Always thin
                    'color': '#2ecc71',
                    'curve-style': curveStyle,
                    'source-endpoint': endpointStyle,
                    'target-endpoint': endpointStyle
                }
            }
        );
    } else if (viewMode === 'connections') {
        styles.push(
            {
                selector: 'edge',
                style: {
                    // gradientMin here is Worst/High Conn (red), gradientMax is Low (light)
                    // We assume widthDataMin/Max follows same logic for user consistency

                    'line-color': `mapData(connections, ${gradientMax}, ${gradientMin}, #ffcccc, #ff0000)`,
                    'target-arrow-color': `mapData(connections, ${gradientMax}, ${gradientMin}, #ffcccc, #ff0000)`,
                    'width': `mapData(connections, ${widthDataMax}, ${widthDataMin}, ${thicknessMin}, ${thicknessMax})`,

                    'color': '#333',
                    'curve-style': curveStyle,
                    'source-endpoint': endpointStyle,
                    'target-endpoint': endpointStyle
                }
            }
        );
    }

    return styles;
};
