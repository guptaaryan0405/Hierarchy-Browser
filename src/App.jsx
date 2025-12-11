import React, { useState, useRef, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import GraphViewer from './components/GraphViewer';
import HierarchyBrowser from './components/HierarchyBrowser';
import InfoPanel from './components/InfoPanel';
import AdvancedSearch from './components/AdvancedSearch';
import { parseCSV, processGraphData } from './utils/dataProcessor';
import { buildHierarchyTree } from './utils/treeBuilder';
import './App.css';

function App() {
  const [elements, setElements] = useState([]);
  const [hierarchyData, setHierarchyData] = useState([]);

  // View State
  const [viewMode, setViewMode] = useState('wns'); // 'wns', 'tns', 'connections'

  // Visual Editing State
  const [nodeFontSize, setNodeFontSize] = useState(12);
  const [edgeFontSize, setEdgeFontSize] = useState(10);

  const [gradientMin, setGradientMin] = useState(-10); // Worst Value (Mapped to Red/Thick)
  const [gradientMax, setGradientMax] = useState(0);   // Best Value (Mapped to Light/Thin)

  const [widthDataMin, setWidthDataMin] = useState(-10); // Worst Value (Width)
  const [widthDataMax, setWidthDataMax] = useState(0);   // Best Value (Width)

  const [thicknessMin, setThicknessMin] = useState(1);
  const [thicknessMax, setThicknessMax] = useState(5);

  const [curveStyle, setCurveStyle] = useState('bezier');
  const [endpointStyle, setEndpointStyle] = useState('outside-to-node');

  // App State
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGraphReady, setIsGraphReady] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Data Filtering State
  const [rawGraphData, setRawGraphData] = useState([]);
  const [dataStats, setDataStats] = useState({ maxConn: 0, minWNS: 0, minTNS: 0 }); // Global Stats
  const [filteredStats, setFilteredStats] = useState({ maxConn: 0, minWNS: 0, minTNS: 0 }); // Current Render Stats
  const [filters, setFilters] = useState({ conn: '0', wns: '0', tns: '0' });
  const [showInternalPaths, setShowInternalPaths] = useState(true);

  // Interaction State
  const [zoomToId, setZoomToId] = useState(null);
  const [isolateId, setIsolateId] = useState(null);
  const [isPanMode, setIsPanMode] = useState(true); // true = pan, false = select
  const [selectedElement, setSelectedElement] = useState(null); // { type: 'node'|'edge', data: {} }
  const [hoveredNode, setHoveredNode] = useState(null);

  // Cy Reference
  const cyRef = useRef(null);

  // --- Auto-Set Visual Limits Effect ---
  useEffect(() => {
    // Logic: 
    // Worst Value = GradientMin (Reddest) & WidthMin (Thickest)
    // Best Value = GradientMax (Lightest) & WidthMax (Thinnest)

    // We use filteredStats to ensure the legend matches the visible graph
    if (viewMode === 'wns') {
      // WNS: Worst is most negative. Best is 0.
      const val = filteredStats.minWNS;
      setGradientMin(val);
      setGradientMax(0);
      setWidthDataMin(val);
      setWidthDataMax(0);

    } else if (viewMode === 'tns') {
      // TNS: Worst is most negative. Best is 0.
      const val = filteredStats.minTNS;
      setGradientMin(val);
      setGradientMax(0);
      setWidthDataMin(val);
      setWidthDataMax(0);

    } else if (viewMode === 'connections') {
      // Connections: Worst is Highest (Max Conn in current view). Best is 0.
      setGradientMin(filteredStats.maxConn);
      setGradientMax(0);
      setWidthDataMin(filteredStats.maxConn); // Map Max Conn to Max Width
      setWidthDataMax(0);
    }

  }, [viewMode, filteredStats]); // Run when mode or filtered stats change

  // --- Handlers ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setIsGraphReady(false);
    setElements([]);

    try {
      const rawData = await parseCSV(file);
      // Stats Calc (Global)
      let maxConn = 0, minWNS = 0, minTNS = 0;
      rawData.forEach(row => {
        if (row.connections > maxConn) maxConn = row.connections;
        if (row.wns < minWNS) minWNS = row.wns;
        if (row.tns < minTNS) minTNS = row.tns;
      });

      setRawGraphData(rawData);
      setDataStats({ maxConn, minWNS, minTNS });
      setFilters({ conn: '0', wns: '0', tns: '0' });
      setShowInternalPaths(true);

      setLoading(false);
    } catch (error) {
      console.error("Error processing CSV:", error);
      setLoading(false);
    }
  };

  const applyFiltersAndRender = () => {
    setLoading(true);
    const filteredData = rawGraphData.filter(row => {
      const fConn = Number(filters.conn);
      const fWNS = Number(filters.wns);
      const fTNS = Number(filters.tns);

      const passConn = (row.connections || 0) >= (isNaN(fConn) ? 0 : fConn);
      const passWNS = (row.wns || 0) <= (isNaN(fWNS) ? 0 : fWNS);
      const passTNS = (row.tns || 0) <= (isNaN(fTNS) ? 0 : fTNS);

      let passInternal = true;
      if (!showInternalPaths) {
        const s = row.hier;
        const t = row.connnecting_hier;
        if (s && t) {
          const isInternal = s.startsWith(t + '/') || t.startsWith(s + '/');
          if (isInternal) passInternal = false;
        }
      }
      return passConn && passWNS && passTNS && passInternal;
    });

    // --- Calculate Stats for Filtered Data ---
    let fMaxConn = 0;
    let fMinWNS = 0;
    let fMinTNS = 0;

    if (filteredData.length > 0) {
      // Initialize mins to Infinity to correctly find the minimum negative value
      fMinWNS = Infinity;
      fMinTNS = Infinity;

      filteredData.forEach(row => {
        if (row.connections > fMaxConn) fMaxConn = row.connections;
        if (row.wns < fMinWNS) fMinWNS = row.wns;
        if (row.tns < fMinTNS) fMinTNS = row.tns;
      });

      // Correct Infinity if no data found (or if all values are positive/zero)
      if (fMinWNS === Infinity) fMinWNS = 0;
      if (fMinTNS === Infinity) fMinTNS = 0;
    }

    setFilteredStats({ maxConn: fMaxConn, minWNS: fMinWNS, minTNS: fMinTNS });

    const graphElements = processGraphData(filteredData);
    setElements(graphElements);
    setHierarchyData(buildHierarchyTree(graphElements));
    setIsGraphReady(true);
    setLoading(false);
  };

  const handleZoomTo = (id) => {
    setZoomToId(id);
    setTimeout(() => setZoomToId(null), 100);
  };

  const handleViewOnly = (id) => setIsolateId(id);

  // --- Toolbar Actions ---
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(50);
    }
  };

  const togglePanMode = (mode) => {
    setIsPanMode(mode);
    if (cyRef.current) {
      cyRef.current.userPanningEnabled(mode);
      cyRef.current.boxSelectionEnabled(!mode);
    }
  };

  const handleSelect = (data) => {
    setSelectedElement(data);
    if (!isRightPanelOpen && data) setIsRightPanelOpen(true);
  };

  return (
    <ErrorBoundary>
      <div className="app-container">

        {/* TOP HEADER / TOOLBAR */}
        <header className="app-header">
          <div className="title-section">
            <h1>Hierarchy Browser</h1>
          </div>

          <div className="toolbar-controls">
            <span>Toolbar:</span>
            <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out">➖</button>
            <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In">➕</button>

            <button
              className={`toolbar-btn ${!isPanMode ? 'active' : ''}`}
              onClick={() => togglePanMode(false)}
            >
              ➤ Select
            </button>
            <button
              className={`toolbar-btn ${isPanMode ? 'active' : ''}`}
              onClick={() => togglePanMode(true)}
            >
              ✋ Pan
            </button>

            <button className="toolbar-btn" onClick={handleFit} style={{ fontWeight: 'bold', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              Fit
            </button>
          </div>

          {/* Hamburger for Right Panel */}
          <div className="hamburger-menu" onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}>
            ☰
          </div>
        </header>

        {/* LEFT SIDEBAR: Tools & Config */}
        <aside className="sidebar-left">
          {/* Upload Section */}
          <div className="panel-section">
            <h3>📁 Upload Data</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn-secondary small-upload-btn"
                onClick={() => document.getElementById('fileInput').click()}
              >
                Upload CSV
              </button>
              <input id="fileInput" type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              <div className="file-name" style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                {fileName || "No file selected"}
              </div>
            </div>
          </div>

          {/* Data Filtering - Show whenever raw data exists */}
          {rawGraphData.length > 0 && (
            <div className="panel-section" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <h3>🔍 Data Filtering</h3>
              <label>Min Connections (Max: {dataStats.maxConn})</label>
              <input type="number" value={filters.conn} onChange={(e) => setFilters({ ...filters, conn: e.target.value })} />

              <label>Max WNS (Min: {dataStats.minWNS} ns)</label>
              <input type="number" value={filters.wns} onChange={(e) => setFilters({ ...filters, wns: e.target.value })} step="0.1" />

              <label>Max TNS (Min: {dataStats.minTNS} ns)</label>
              <input type="number" value={filters.tns} onChange={(e) => setFilters({ ...filters, tns: e.target.value })} step="1" />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '5px' }}>
                <input type="checkbox" checked={showInternalPaths} onChange={(e) => setShowInternalPaths(e.target.checked)} />
                Show Internal Paths
              </label>

              <button className="btn-primary" onClick={applyFiltersAndRender}>
                {isGraphReady ? 'Update Graph' : 'Render Graph'}
              </button>
            </div>
          )}

          {/* Visual Editing Tools - Show ONLY when graph is rendered */}
          {elements.length > 0 && (
            <div className="panel-section" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <h3>🎨 Visual Editing</h3>

              {/* Font Sliders */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Module Name Size: <span>{nodeFontSize}px</span>
                </label>
                <input
                  type="range" min="8" max="24"
                  value={nodeFontSize}
                  onChange={(e) => setNodeFontSize(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Arrow Value Size: <span>{edgeFontSize}px</span>
                </label>
                <input
                  type="range" min="6" max="18"
                  value={edgeFontSize}
                  onChange={(e) => setEdgeFontSize(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Gradient Mapping */}
              <label>Gradient Mapping (Red Intensity)</label>
              <div className="gradient-control">
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.001"
                    value={gradientMin}
                    onChange={(e) => setGradientMin(Number(e.target.value))}
                    title="Value for MAX Red (Worst)"
                  />
                </div>
                {/* Visual Representation of Gradient */}
                <div className="gradient-bar" style={{ background: 'linear-gradient(to right, #ff0000, #ffcccc)', height: '10px', borderRadius: '4px', flexGrow: 1, margin: '0 8px' }}></div>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.001"
                    value={gradientMax}
                    onChange={(e) => setGradientMax(Number(e.target.value))}
                    title="Value for MIN Red (Best)"
                  />
                </div>
              </div>


              {/* Thickness Mapping */}
              <label style={{ marginTop: '5px' }}>Width Mapping (Thickness)</label>
              <div className="gradient-control" style={{ alignItems: 'center' }}>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.001"
                    value={widthDataMin}
                    onChange={(e) => setWidthDataMin(Number(e.target.value))}
                    title="Data Value for MAX Width (e.g. Worst Slack)"
                  />
                </div>

                {/* Wedge Icon: Thick Left -> Thin Right */}
                <div style={{
                  width: '0',
                  height: '0',
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: '60px solid #333', // Points Right
                  margin: '0 10px'
                }} title="Thickness Scale"></div>

                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.001"
                    value={widthDataMax}
                    onChange={(e) => setWidthDataMax(Number(e.target.value))}
                    title="Data Value for MIN Width (e.g. Best Slack)"
                  />
                </div>
              </div>
              <p className="help-text" style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>Maps Data Range to 5px - 1px width.</p>

            </div>
          )}
        </aside>

        {/* MAIN VISUALIZATION AREA */}
        <main className="main-content">
          {loading ? (
            <div className="loading">Processing Graph Data...</div>
          ) : elements.length > 0 ? (
            <>
              <GraphViewer
                elements={elements}
                // Visual Props
                viewMode={viewMode}
                nodeFontSize={nodeFontSize}
                edgeFontSize={edgeFontSize}

                gradientMin={gradientMin}
                gradientMax={gradientMax}
                widthDataMin={widthDataMin}
                widthDataMax={widthDataMax}
                thicknessMin={thicknessMin}
                thicknessMax={thicknessMax}

                curveStyle={curveStyle}
                endpointStyle={endpointStyle}
                // Interaction
                zoomToId={zoomToId}
                isolateId={isolateId}
                onIsolate={handleViewOnly}

                onCyReady={(cy) => { cyRef.current = cy; }}

                onSelect={handleSelect}
                onHover={setHoveredNode}
              />

              {/* Floating Right Stack (Hierarchy + Info) */}
              <div className="floating-right-stack">
                {/* Hierarchy Browser */}
                {isRightPanelOpen && elements.length > 0 && (
                  <div className="floating-hierarchy">
                    <div style={{ marginBottom: '15px' }}>
                      <AdvancedSearch elements={elements} onZoomTo={handleZoomTo} />
                    </div>
                    {hierarchyData.length > 0 && (
                      <HierarchyBrowser
                        data={hierarchyData}
                        onZoomTo={handleZoomTo}
                        onIsolate={handleViewOnly}
                      />
                    )}
                  </div>
                )}

                {/* Info Panel */}
                {selectedElement && (
                  <div className="floating-info-panel">
                    <button className="close-btn" onClick={() => setSelectedElement(null)}>×</button>
                    <InfoPanel selectedData={selectedElement} rawData={rawGraphData} />
                  </div>
                )}
              </div>

              {/* Floating View Mode Selector */}
              <div className="floating-view-mode">
                <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', paddingLeft: '5px' }}>View Mode:</span>
                <button className={`mode-btn ${viewMode === 'wns' ? 'active' : ''}`} onClick={() => setViewMode('wns')}>WNS</button>
                <button className={`mode-btn ${viewMode === 'tns' ? 'active' : ''}`} onClick={() => setViewMode('tns')}>TNS</button>
                <button className={`mode-btn ${viewMode === 'connections' ? 'active' : ''}`} onClick={() => setViewMode('connections')}>Conn</button>
              </div>

              {/* Hover Name Strip */}
              {hoveredNode && (
                <div className="hover-strip">
                  <span style={{ fontWeight: 'bold', color: '#333' }}>Module :</span> {hoveredNode.id}
                </div>
              )}
            </>
          ) : (
            <div className="placeholder">
              <div>Please upload a CSV file to begin.</div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
