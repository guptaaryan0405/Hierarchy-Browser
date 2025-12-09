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
  const [threshold, setThreshold] = useState(-5.0); // WNS/TNS Threshold

  // Visual Editing State
  const [fontSize, setFontSize] = useState(12);
  const [gradientMin, setGradientMin] = useState(-10); // Red Max (Most negative)
  const [gradientMax, setGradientMax] = useState(0);   // Red Start (Least negative)
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
  const [dataStats, setDataStats] = useState({ maxConn: 0, minWNS: 0, minTNS: 0 });
  const [filters, setFilters] = useState({ conn: '0', wns: '0', tns: '0' });
  const [showInternalPaths, setShowInternalPaths] = useState(true);

  // Interaction State
  const [zoomToId, setZoomToId] = useState(null);
  const [isolateId, setIsolateId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(true); // true = pan, false = select
  const [selectedElement, setSelectedElement] = useState(null); // { type: 'node'|'edge', data: {} }
  const [hoveredNode, setHoveredNode] = useState(null);

  // Cy Reference
  const cyRef = useRef(null);

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
      // Stats Calc
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

      // Auto-set visual defaults based on data
      setGradientMin(Math.floor(minWNS));

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
            <h1>Hierarchy Analyser</h1>
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

            <button className="toolbar-btn" onClick={handleFit} style={{ fontWeight: 'bold' }}>
              [ Fit ]
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px' }}>
              <span>A</span>
              <input
                type="range"
                min="8" max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '1.2rem' }}>A</span>
            </div>
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

              {/* Gradient Mapping */}
              <label>Gradient Mapping (Red Intensity)</label>
              <div className="gradient-control">
                <div className="range-inputs">
                  <input
                    type="number"
                    value={gradientMin}
                    onChange={(e) => setGradientMin(Number(e.target.value))}
                    title="Value for MAX Red"
                  />
                </div>
                <div className="gradient-bar" style={{ background: 'linear-gradient(to right, #ff0000, #ffcccc)' }}></div>
                <div className="range-inputs">
                  <input
                    type="number"
                    value={gradientMax}
                    onChange={(e) => setGradientMax(Number(e.target.value))}
                    title="Value for MIN Red"
                  />
                </div>
              </div>
              <p className="help-text">Map WNS/TNS values to color intensity.</p>

              {/* Thickness Mapping */}
              <label style={{ marginTop: '10px' }}>Width Mapping</label>
              <div className="range-inputs">
                <input
                  type="number"
                  value={thicknessMin}
                  onChange={(e) => setThicknessMin(Number(e.target.value))}
                  title="Min Width"
                />
                <span> to </span>
                <input
                  type="number"
                  value={thicknessMax}
                  onChange={(e) => setThicknessMax(Number(e.target.value))}
                  title="Max Width"
                />
              </div>
            </div>
          )}

          {/* Threshold - Only when graph rendered */}
          {elements.length > 0 && (
            <div className="panel-section" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <h3>Threshold Filter</h3>
              <label>Red Limit Threshold</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                step="0.1"
              />
              <p className="help-text">Absolute cutoff for rendering red edges.</p>
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
                threshold={threshold}
                viewMode={viewMode}
                fontSize={fontSize}
                gradientMin={gradientMin}
                gradientMax={gradientMax}
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

        {/* Removed grid sidebar-right */}



      </div>
    </ErrorBoundary>
  );
}

export default App;
