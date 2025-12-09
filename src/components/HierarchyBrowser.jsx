import React, { useState } from 'react';
import './HierarchyBrowser.css';

const TreeNode = ({ node, onZoomTo, onIsolate, level = 0 }) => {
    const [expanded, setExpanded] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);

    const handleToggle = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    const handleRightClick = (e) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY
        });
    };

    const closeContextMenu = () => setContextMenu(null);

    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="tree-node">
            <div
                className="node-content"
                onContextMenu={handleRightClick}
                onClick={() => setExpanded(!expanded)}
            >
                <span className="toggle-icon" onClick={handleToggle}>
                    {hasChildren ? (expanded ? '▼' : '▶') : '•'}
                </span>
                <span className="node-title">{node.title}</span>
            </div>

            {contextMenu && (
                <>
                    <div className="context-menu-overlay" onClick={closeContextMenu} />
                    <div
                        className="context-menu"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div onClick={() => { onZoomTo(node.key); closeContextMenu(); }}>
                            Zoom To
                        </div>
                        <div onClick={() => { onIsolate(node.key); closeContextMenu(); }}>
                            Isolate
                        </div>
                    </div>
                </>
            )}

            {expanded && hasChildren && (
                <div className="node-children">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.key}
                            node={child}
                            onZoomTo={onZoomTo}
                            onIsolate={onIsolate}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const HierarchyBrowser = ({ data, onZoomTo, onIsolate }) => {
    return (
        <div className="hierarchy-browser">
            <h3>Hierarchy</h3>
            <div className="tree-container">
                {data.map(node => (
                    <TreeNode
                        key={node.key}
                        node={node}
                        onZoomTo={onZoomTo}
                        onIsolate={onIsolate}
                    />
                ))}
            </div>
        </div>
    );
};

export default HierarchyBrowser;
