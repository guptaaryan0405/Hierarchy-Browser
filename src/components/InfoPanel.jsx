import React from 'react';

const InfoPanel = ({ selectedData, rawData }) => {
    if (!selectedData) return (
        <div style={{ padding: '20px', color: '#888', fontStyle: 'italic' }}>
            Select a module or arrow to view details.
        </div>
    );

    const { type, data } = selectedData;

    if (type === 'edge') {
        return (
            <div className="info-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#555', fontSize: '1.1rem' }}>
                    <strong>Info Browser</strong>
                </div>

                <div style={{ marginBottom: '15px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>
                    <span style={{ fontWeight: 'bold' }}>Path:</span> {data.source} → {data.target}
                </div>

                <div className="stat-section" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    <div style={{ marginBottom: '8px', color: '#333' }}>
                        <strong>TNS:</strong> <span className={data.tns < 0 ? 'bad-value' : 'good-value'}>{data.tns} ns</span>
                    </div>
                    <div style={{ marginBottom: '8px', color: '#333' }}>
                        <strong>WNS:</strong> <span className={data.wns < 0 ? 'bad-value' : 'good-value'}>{data.wns} ns</span>
                    </div>
                    <div style={{ marginBottom: '8px', color: '#333' }}>
                        <strong>CONN:</strong> {data.connections}
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'node') {
        // Filter paths involving this node STRICTLY (exact match only)
        // User requested that compound/parent nodes should NOT show child paths.
        const nodeId = data.id;
        // Find relevant rows
        const relevantRows = rawData.filter(row => {
            return row.hier === nodeId || row.connnecting_hier === nodeId;
        });

        // Helper to sort and slice
        const getTop3 = (comparator, formatter) => {
            return [...relevantRows]
                .sort(comparator)
                .slice(0, 3)
                .map((row, idx) => (
                    <li key={idx} style={{ marginBottom: '5px', color: '#333' }}>
                        {formatter(row)}
                    </li>
                ));
        };

        return (
            <div className="info-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#555', fontSize: '1.1rem' }}>

                    <strong>Info Browser</strong>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Module: {data.id}
                </div>

                {/* TNS */}
                <div className="stat-section">
                    <h4>TNS:</h4>
                    <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {getTop3(
                            (a, b) => a.tns - b.tns,
                            (row) => `${row.hier} → ${row.connnecting_hier} : ${row.tns}ns`
                        )}
                    </ul>
                </div>

                {/* WNS */}
                <div className="stat-section">
                    <h4>WNS:</h4>
                    <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {getTop3(
                            (a, b) => a.wns - b.wns,
                            (row) => `${row.hier} → ${row.connnecting_hier} : ${row.wns}ns`
                        )}
                    </ul>
                </div>

                {/* CONNECTION */}
                <div className="stat-section">
                    <h4>CONNECTION:</h4>
                    <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {getTop3(
                            (a, b) => b.connections - a.connections,
                            (row) => `${row.hier} → ${row.connnecting_hier} : ${row.connections}`
                        )}
                    </ul>
                </div>

            </div>
        );
    }

    return null;
};

export default InfoPanel;
