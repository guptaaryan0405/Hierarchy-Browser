import Papa from 'papaparse';
import _ from 'lodash';

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const processGraphData = (data) => {
  const nodes = {};
  const edges = [];

  // Helper to create nodes for a hierarchy path
  const createNodesFromPath = (path) => {
    if (!path || typeof path !== 'string') return;

    const parts = path.split('/').map(p => p.trim());
    let currentId = '';

    parts.forEach((part, index) => {
      const parentId = currentId;
      currentId = currentId ? `${currentId}/${part}` : part;

      if (!nodes[currentId]) {
        nodes[currentId] = {
          data: {
            id: currentId,
            label: part,
            parent: parentId || undefined,
          },
        };
      }
    });
    return currentId;
  };

  data.forEach((row) => {
    if (!row.hier || !row.connnecting_hier) {
      return;
    }

    // Create nodes for source and target
    const sourceId = createNodesFromPath(row.hier);
    const targetId = createNodesFromPath(row.connnecting_hier);

    // Determine edge direction
    let actualSource, actualTarget;
    if (row.direction === 'to') {
      actualSource = sourceId;
      actualTarget = targetId;
    } else {
      actualSource = targetId;
      actualTarget = sourceId;
    }

    // Create edge
    // Use a unique ID for the edge
    const edgeId = `${actualSource}->${actualTarget}`;

    // Check if edge is internal (ancestor-descendant relationship)
    // We check if one ID is a prefix of the other (with a slash boundary)
    const isInternal = actualSource.startsWith(actualTarget + '/') || actualTarget.startsWith(actualSource + '/');

    edges.push({
      data: {
        id: edgeId,
        source: actualSource,
        target: actualTarget,
        connections: row.connections,
        wns: row.wns,
        tns: row.tns,
        // Helper for styling
        isViolation: row.wns < 0,
        isInternal: isInternal
      },
    });
  });

  // Convert nodes object to array
  const nodesArray = Object.values(nodes);

  return [...nodesArray, ...edges];
};
