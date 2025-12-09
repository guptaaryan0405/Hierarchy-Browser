import React, { useState, useEffect, useRef } from 'react';
import './AdvancedSearch.css';

const AdvancedSearch = ({ elements, onZoomTo }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isRegex, setIsRegex] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        const nodes = elements.filter(el => el.group === 'nodes' || !el.group); // Cytoscape elements might not have group if raw data
        // Actually our processed data has group 'nodes' implicitly if we check data structure or just filter by having 'id' and not 'source'
        // Our processGraphData returns objects with { data: { id, ... } }
        // Edges have source/target. Nodes don't.

        const searchNodes = elements.filter(el => !el.data.source);

        let matches = [];
        try {
            if (isRegex) {
                const regex = new RegExp(query, 'i');
                matches = searchNodes.filter(node => regex.test(node.data.label || node.data.id));
            } else {
                const lowerQuery = query.toLowerCase();
                matches = searchNodes.filter(node =>
                    (node.data.label || node.data.id).toLowerCase().includes(lowerQuery)
                );
            }
        } catch (e) {
            // Invalid regex
        }

        setResults(matches.slice(0, 10)); // Limit to 10 results
        setShowDropdown(true);
    }, [query, isRegex, elements]);

    const handleSelect = (id) => {
        onZoomTo(id);
        setQuery(''); // Optional: clear search after selection
        setShowDropdown(false);
    };

    return (
        <div className="advanced-search" ref={searchRef}>
            <div className="search-input-wrapper">
                <input
                    type="text"
                    placeholder={isRegex ? "Regex search (e.g. ^u_.*)" : "Search modules..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                />
                <label className="regex-toggle">
                    <input
                        type="checkbox"
                        checked={isRegex}
                        onChange={(e) => setIsRegex(e.target.checked)}
                    />
                    Regex
                </label>
            </div>

            {showDropdown && results.length > 0 && (
                <div className="search-dropdown">
                    {results.map(node => (
                        <div
                            key={node.data.id}
                            className="search-result-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(node.data.id);
                            }}
                        >
                            {node.data.label || node.data.id}
                        </div>
                    ))}
                </div>
            )}
            {showDropdown && query && results.length === 0 && (
                <div className="search-dropdown">
                    <div className="no-results">No matches found</div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearch;
