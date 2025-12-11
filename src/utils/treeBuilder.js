export const buildHierarchyTree = (elements) => {
    const tree = [];
    const map = {};

    // First pass: Create all nodes and map them
    elements.forEach(el => {
        // Check if it's a node: explicit group 'nodes' OR no group and no source/target (which implies edge)
        const isNode = el.group === 'nodes' || (!el.group && !el.data.source && !el.data.target);

        if (isNode) {
            const id = el.data.id;
            map[id] = {
                key: id,
                title: el.data.label || id,
                children: [],
                data: el.data
            };
        }
    });

    // Second pass: Link parents and children
    Object.values(map).forEach(node => {
        const parentId = node.data.parent;
        if (parentId && map[parentId]) {
            map[parentId].children.push(node);
        } else {
            if (parentId) console.warn(`Parent ${parentId} not found for ${node.key}`);
            tree.push(node);
        }
    });

    // console.log("Hierarchy Tree:", tree);
    return tree;
};
