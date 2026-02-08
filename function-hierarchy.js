import { getBaseFunctionName } from './function-extraction/index.js';

// escapeHtml will be imported from html-generators.js
// Called from html-generators.js to avoid circular dependency
let escapeHtml = null;

/**
 * Sets the escapeHtml function
 * Called from html-generators.js to avoid circular dependency
 * @param {Function} fn - escapeHtml function
 */
export function setEscapeHtml(fn) {
  escapeHtml = fn;
}

/**
 * Finds the immediate parent function for a callback
 * @param {Object} func - Function object
 * @param {Map} functionBoundaries - Map of function boundaries
 * @param {Array} sortedFunctions - Sorted array of all functions
 * @returns {Object|null} Parent function or null
 */
function findImmediateParentFunction(func, functionBoundaries, sortedFunctions) {
  const funcBoundary = functionBoundaries.get(func.line);
  if (!funcBoundary) {
    return null;
  }

  const containingFunctions = Array.from(functionBoundaries.entries())
    .filter(([fl, boundary]) =>
      fl !== func.line
      && boundary.start < funcBoundary.start
      && boundary.end >= funcBoundary.end
    )
    .sort((a, b) => b[1].start - a[1].start);

  if (containingFunctions.length === 0) {
    return null;
  }

  const immediateParentLine = containingFunctions[0][0];
  return sortedFunctions.find((f) => f.line === immediateParentLine) || null;
}

/**
 * Returns the rightmost/leaf segment of a display name
 * (framework-agnostic). Extraction (function-extraction.js) provides
 * names from AST: method names (filter, sort, flatMap), hook names
 * (useEffect, useCallback), handler labels (onClick handler), or
 * variable/function names. We use that as the leaf; no whitelist of
 * "callback types" is needed.
 * @param {string} displayName - Full or hierarchical display name
 * @returns {string} Leaf segment: last parenthetical content, or whole
 */
function getLeafName(displayName) {
  if (!displayName || typeof displayName !== 'string') return displayName || '';
  const match = displayName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : displayName;
}

/**
 * Checks if a name is valid for use in hierarchical display (not a placeholder).
 * @param {string} name - Leaf or base name
 * @returns {boolean} True if valid
 */
function isValidNameForHierarchy(name) {
  return name && name !== 'unknown' && name !== 'anonymous';
}

/**
 * Checks if a function name indicates it's a cleanup callback
 * Function names come from AST-based extraction, so this check is framework-agnostic
 * @param {string} functionName - Function name to check
 * @returns {boolean} True if it's a cleanup callback
 */
function isCleanupCallback(functionName) {
  if (!functionName) return false;
  return functionName.includes('return callback') || functionName === 'return';
}

/**
 * Builds hierarchical display name using function boundaries
 * (framework-agnostic). Recursively prepends parent names so nested
 * functions show as "Parent (leaf)". The leaf name is whatever
 * function-extraction.js provided from the AST (method name, hook,
 * handler, variable name). No whitelist of callback types—works with
 * any framework or API (filter, sort, flatMap, then, useEffect, etc.).
 * @param {Object} func - Function object
 * @param {Map} functionBoundaries - Map of function boundaries
 * @param {Array} sortedFunctions - Sorted array of all functions
 * @param {Set} visited - Set to track visited (prevents infinite loops)
 * @returns {string} Full hierarchical display name
 */
function fixFunctionNameForCallback(
  func,
  functionBoundaries,
  sortedFunctions,
  visited = new Set()
) {
  const displayName = func.functionName || 'unknown';

  // Prevent infinite loops
  const funcKey = `${func.file}:${func.line}`;
  if (visited.has(funcKey)) {
    return displayName;
  }
  visited.add(funcKey);

  if (!functionBoundaries) {
    return displayName;
  }

  // Find the actual immediate parent using boundaries
  const immediateParentFunc = findImmediateParentFunction(
    func,
    functionBoundaries,
    sortedFunctions
  );

  if (!immediateParentFunc) {
    // No parent found, return name as-is
    return displayName;
  }

  // CRITICAL FIX: Cleanup callbacks should never be parents
  // A cleanup callback is the return value of a function, so it can't
  // contain other functions. If the parent is a cleanup callback, skip
  // hierarchical naming to prevent incorrect nesting
  if (isCleanupCallback(immediateParentFunc.functionName)) {
    // Return the name as-is (cleanup callbacks are terminal - they don't have children)
    return displayName;
  }

  // Recursively build the parent's hierarchical name
  const parentHierarchicalName = fixFunctionNameForCallback(
    immediateParentFunc,
    functionBoundaries,
    sortedFunctions,
    new Set(visited)
  );

  const parentBaseName = getBaseFunctionName(parentHierarchicalName);
  if (!isValidNameForHierarchy(parentBaseName)) {
    return displayName;
  }

  // Framework-agnostic: use whatever name extraction gave us
  // (method, hook, handler, variable name). No whitelist—any method
  // (filter, sort, flatMap, then, etc.) or framework callback works.
  const leafName = getLeafName(displayName);
  if (isValidNameForHierarchy(leafName)) {
    return `${parentHierarchicalName} → ${leafName}`;
  }

  return displayName;
}

/**
 * Gets default column structure (used when not provided)
 * @returns {Object} Column configuration
 */
function getDefaultColumnStructure() {
  return {
    groups: [
      {
        name: 'Control Flow',
        columns: [
          { key: 'if', label: 'if' },
          { key: 'else if', label: 'else if' },
          { key: 'for', label: 'for' },
          { key: 'for...of', label: 'for...of' },
          { key: 'for...in', label: 'for...in' },
          { key: 'while', label: 'while' },
          { key: 'do...while', label: 'do...while' },
          { key: 'switch', label: 'switch' },
          { key: 'case', label: 'case' },
          { key: 'catch', label: 'catch' },
        ],
      },
      {
        name: 'Expressions',
        columns: [
          { key: 'ternary', label: '?:' },
          { key: '&&', label: '&&' },
          { key: '||', label: '||' },
          { key: '??', label: '??' },
          { key: '?.', label: '?.' },
        ],
      },
      {
        name: 'Function Parameters',
        columns: [
          { key: 'default parameter', label: 'default parameter' },
        ],
      },
    ],
    baseColumn: { key: 'base', label: 'base' },
  };
}

/**
 * Parses hierarchical display name into segments.
 * Supports both "Parent → child → grandchild" (arrow) and
 * "Parent (child) (grandchild)" (paren) formats.
 * @param {string} displayName - Full hierarchical name
 * @returns {string[]} Array of segment names
 */
function parseHierarchySegments(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return [displayName || ''];
  }
  if (displayName.includes(' → ')) {
    return displayName
      .split(/\s*→\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const parts = displayName.split(/\s*\(\s*/);
  return parts
    .map((s) => s.replace(/\s*\)\s*$/, '').trim())
    .filter(Boolean);
}

/**
 * Renders function name for FCB: arrows between segments,
 * last segment bold (highlights the function for this row).
 * "Parent (child) (grandchild)" → "Parent → child → grandchild"
 * with last in .function-name-leaf.
 * @param {string} displayName - Full hierarchical display name
 * @returns {string} HTML for the function-name cell content
 */
function formatFunctionNameDisplay(displayName) {
  const segments = parseHierarchySegments(displayName);
  if (segments.length === 0) return '';
  const last = escapeHtml(segments[segments.length - 1]);
  const rest = segments.slice(0, -1).map((s) => escapeHtml(s)).join(' → ');
  const leafSpan = `<span class="function-name-leaf">${last}</span>`;
  return rest ? `${rest} → ${leafSpan}` : leafSpan;
}

/**
 * Generates HTML for a function table row with individual breakdown
 * columns
 * @param {string} displayName - Function display name
 * @param {number} lineNumber - Start line number (1-based)
 * @param {number} complexity - Function complexity
 * @param {Object} breakdownData - Breakdown data object
 * @param {Object} columnStructure - Column structure configuration
 * @param {Set} emptyColumns - Set of column keys that are empty
 * @param {Array} visibleColumns - Array of visible column objects
 * @param {number} [functionStart] - Function start line
 * @param {number} [functionEnd] - Function end line
 * @param {number} [complexityThreshold] - Linter threshold
 * @returns {string} HTML string for table row
 */
function generateFunctionRowHTML(
  displayName,
  lineNumber,
  complexity,
  breakdownData,
  columnStructure,
  emptyColumns,
  visibleColumns,
  functionStart,
  functionEnd,
  complexityThreshold
) {
  const startLine =
    functionStart !== null && functionStart !== undefined
      ? functionStart
      : lineNumber;
  const endLine =
    functionEnd !== null && functionEnd !== undefined
      ? functionEnd
      : lineNumber;
  // Generate cells only for visible columns (base = 1 is not shown as
  // a column; see header "Function (base = 1)")
  const breakdownCells = visibleColumns.map((col) => {
    const value = breakdownData[col.key] || 0;
    // Display "-" instead of 0 for better readability
    const displayValue = value === 0 ? '-' : value;
    // Add empty class for styling when value is "-"
    const emptyClass = value === 0 ? ' breakdown-value-empty' : '';
    return `<td class="breakdown-value${emptyClass}" data-column-key="${col.key}">${displayValue}</td>`;
  });

  const isAboveThreshold =
    typeof complexityThreshold === 'number' &&
    complexity > complexityThreshold;
  const complexityCellClass = isAboveThreshold
    ? 'complexity-value complexity-above-threshold'
    : 'complexity-value';
  const functionNameHTML = formatFunctionNameDisplay(displayName);
  return `        <tr class="breakdown-function-row" data-line="${lineNumber}" data-function-start="${startLine}" data-function-end="${endLine}" role="button" tabindex="0" title="Click to jump to function in code; click again to clear">
          <td class="function-name">${functionNameHTML}</td>
          <td class="breakdown-line-value breakdown-line-column" data-line="${lineNumber}">${lineNumber}</td>
          <td class="${complexityCellClass}"><span class="complexity-number">${complexity}</span></td>
          ${breakdownCells.join('')}
        </tr>`;
}

/**
 * Formats all functions in scannable, unambiguous format (one per line)
 * Shows only what ESLint counts for cyclomatic complexity
 * Groups functions by base name, showing the highest complexity version
 * @param {Array} functions - Array of function objects
 * @param {Map} functionBoundaries - Map of functionLine -> { start, end }
 * @param {Map} functionBreakdowns - Map of functionLine -> breakdown
 * @param {string} _sourceCode - Source code (unused, kept for API compat)
 * @param {Object} [columnStructure] - Column structure config
 * @param {Set} [emptyColumns] - Set of column keys that are empty
 * @param {boolean} [showAllColumns] - Show all columns including empty
 * @param {number} [complexityThreshold] - Linter threshold
 * @returns {string} Formatted HTML string
 */
export function formatFunctionHierarchy(
  functions,
  functionBoundaries,
  functionBreakdowns,
  _sourceCode,
  columnStructure,
  emptyColumns,
  showAllColumns = false,
  complexityThreshold
) {
  if (!escapeHtml) {
    throw new Error('escapeHtml not set. Call setEscapeHtml() first.');
  }

  if (functions.length === 0) return '';

  // Use default column structure if not provided
  // (for backward compatibility with tests)
  const structure = columnStructure || getDefaultColumnStructure();

  // Use empty set if not provided (for backward compatibility with tests)
  const emptyCols = emptyColumns || new Set();

  // Build visible columns list based on showAllColumns flag
  const visibleColumns = structure.groups.flatMap((group) => {
    if (showAllColumns) {
      return group.columns;
    }
    return group.columns.filter((col) => !emptyCols.has(col.key));
  });

  // Show each function exactly as ESLint reports it, but deduplicate by line number
  // This ensures the breakdown matches the inline code annotations
  const lineToFunction = new Map();

  functions.forEach((func) => {
    const line = func.line;
    const existing = lineToFunction.get(line);

    // If multiple functions on same line, keep the highest complexity
    // (this handles edge cases where ESLint might report multiple)
    if (
      !existing ||
      parseInt(func.complexity, 10) > parseInt(existing.complexity, 10)
    ) {
      lineToFunction.set(line, func);
    }
  });

  // Show each function separately, but group functions with the same name
  // and line number. This ensures functions with the same name but
  // different line numbers are shown separately. This matches what users
  // see in the code view annotations
  const functionGroups = new Map();

  Array.from(lineToFunction.values()).forEach((func) => {
    // Use file + function name + line number as key to ensure uniqueness
    // This allows multiple functions with the same name (e.g.,
    // "addEventListener callback" on different lines) to be shown
    // separately, each with their own breakdown
    const key = `${func.file}:${func.functionName}:${func.line}`;

    const existing = functionGroups.get(key);
    if (!existing) {
      functionGroups.set(key, func);
    } else {
      // If somehow we have duplicate key, keep the one with higher complexity
      if (parseInt(func.complexity, 10) > parseInt(existing.complexity, 10)) {
        functionGroups.set(key, func);
      }
    }
  });

  // Sort by line number to match code order
  const sortedFunctions = Array.from(functionGroups.values()).sort(
    (a, b) => a.line - b.line
  );

  const lines = [];

  // Format each function on one line with individual breakdown columns
  sortedFunctions.forEach((func) => {
    const complexity = parseInt(func.complexity, 10);
    const breakdown = functionBreakdowns.get(func.line);
    const breakdownData = breakdown ? breakdown.breakdown : {};
    const displayName = fixFunctionNameForCallback(
      func,
      functionBoundaries,
      sortedFunctions
    );
    const boundary = functionBoundaries
      ? functionBoundaries.get(func.line)
      : null;
    const functionStart = boundary ? boundary.start : null;
    const functionEnd = boundary ? boundary.end : null;
    const rowHTML = generateFunctionRowHTML(
      displayName,
      func.line,
      complexity,
      breakdownData,
      structure,
      emptyCols,
      visibleColumns,
      functionStart,
      functionEnd,
      complexityThreshold
    );
    lines.push(rowHTML);
  });

  return lines.join('\n');
}
