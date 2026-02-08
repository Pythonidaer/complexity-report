# Function Hierarchy

## function-hierarchy.js

This module handles hierarchical function naming and HTML table generation for the Function Complexity Breakdown table in the complexity report. It builds full hierarchical names for nested functions (e.g. "Parent (filter) (sort)", "Component (useEffect) (handleReInit)") by recursively traversing function boundaries to find parent-child relationships. **Framework-agnostic:** it does not maintain a whitelist of "callback types" or focus on any framework (e.g. React). The leaf name is whatever `function-extraction/` provided from the AST—method names (filter, sort, flatMap, then), hook names (useEffect, useCallback), handler labels (onClick handler), or variable/function names. The hierarchy layer simply prepends parent names: "Parent (leafName)".

The core function `formatFunctionHierarchy` generates HTML table rows for the Function Complexity Breakdown table, showing one function per row with its complexity value and individual breakdown columns for each decision point type (if statements, ternary operators, etc.). It handles deduplication of functions on the same line (keeping the highest complexity), groups functions by unique keys (file + name + line), and sorts them by line number to match code order. The module also provides a default column structure defining all the decision point categories (Control Flow, Expressions, Function Parameters) that appear in the breakdown table.

The hierarchical naming system (`fixFunctionNameForCallback`) recursively builds parent chains by finding immediate parent functions using boundary information. It uses `getLeafName(displayName)` to get the rightmost segment of the current display name (last parenthetical content, or the whole string if no parens) and, when valid, prepends the parent: "parentHierarchicalName (leafName)". Cleanup callbacks (functions returned from other functions) are treated as terminal nodes and never become parents. No KNOWN_CALLBACK_TYPES or framework-specific logic—any name from extraction is used as the leaf.

**Dependencies:**
- function-extraction/ (provides `getBaseFunctionName` for base names from hierarchical strings)
- html-generators/file.js (calls `formatFunctionHierarchy` to generate the FCB table, sets `escapeHtml` via `setEscapeHtml`)
