/**
 * Breakdown and FCB (Function Complexity Breakdown) logic for file page
 */

/**
 * Detects which columns are completely empty across all functions
 */
export function detectEmptyColumns(functions, functionBreakdowns, columnStructure) {
  const emptyColumns = new Set();
  const allColumnKeys = columnStructure.groups.flatMap(group =>
    group.columns.map(col => col.key)
  );
  allColumnKeys.forEach(columnKey => {
    let hasAnyValue = false;
    functions.forEach(func => {
      const breakdown = functionBreakdowns.get(func.line);
      if (breakdown && breakdown.breakdown) {
        const value = breakdown.breakdown[columnKey] || 0;
        if (value > 0) hasAnyValue = true;
      }
    });
    if (!hasAnyValue) emptyColumns.add(columnKey);
  });
  return emptyColumns;
}

/**
 * Defines the breakdown column structure with groupings.
 */
export function getBreakdownColumnStructure(variant = 'classic') {
  const controlFlowBase = [
    { key: 'if', label: 'if' },
    { key: 'else if', label: 'else if' },
    { key: 'for', label: 'for' },
    { key: 'for...of', label: 'for...of' },
    { key: 'for...in', label: 'for...in' },
    { key: 'while', label: 'while' },
    { key: 'do...while', label: 'do...while' },
    ...(variant === 'modified' ? [{ key: 'switch', label: 'switch' }] : [{ key: 'case', label: 'case' }]),
    { key: 'catch', label: 'catch' },
  ];
  return {
    groups: [
      { name: 'Control Flow', columns: controlFlowBase },
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
        columns: [{ key: 'default parameter', label: 'default parameter' }],
      },
    ],
    baseColumn: { key: 'base', label: 'base' },
  };
}

/**
 * Finds the boundary for a function
 */
export function findBoundaryForFunction(functionLine, functionBoundaries) {
  let boundary = functionBoundaries.get(functionLine);
  if (!boundary) {
    for (const [, b] of functionBoundaries.entries()) {
      if ((functionLine >= b.start && functionLine <= b.end) ||
          (functionLine < b.start && b.start === functionLine + 1)) {
        boundary = b;
        break;
      }
    }
  }
  return boundary;
}

/**
 * Finds the breakdown line for a function
 */
export function findBreakdownLine(functionLine) {
  return functionLine;
}

/**
 * Logs complexity mismatches for debugging
 */
export function logComplexityMismatch(func, breakdown, _functionBoundaries) {
  const actualComplexity = parseInt(func.complexity, 10);
  const calculatedTotal = breakdown.calculatedTotal;
  if (Math.abs(calculatedTotal - actualComplexity) > 1) {
    console.warn(`Complexity mismatch for ${func.functionName} at line ${func.line}: ESLint reports ${actualComplexity}, calculated ${calculatedTotal}`);
    if (breakdown.decisionPoints && breakdown.decisionPoints.length > 0) {
      console.warn(`  Decision points found:`, breakdown.decisionPoints.map(dp => `${dp.type} at line ${dp.line}`).join(', '));
    } else {
      console.warn(`  Decision points found: (none)`);
    }
  }
}

/**
 * Calculates complexity breakdowns for all functions
 */
export function calculateFunctionBreakdowns(
  functions,
  functionBoundaries,
  decisionPoints,
  calculateComplexityBreakdown
) {
  const functionBreakdowns = new Map();
  functions.forEach(func => {
    findBoundaryForFunction(func.line, functionBoundaries);
    const breakdownLine = findBreakdownLine(func.line);
    const breakdown = calculateComplexityBreakdown(breakdownLine, decisionPoints, 1);
    logComplexityMismatch(func, breakdown, functionBoundaries);
    functionBreakdowns.set(func.line, breakdown);
  });
  return functionBreakdowns;
}

/**
 * Calculates decision point totals from function breakdowns
 */
export function calculateDecisionPointTotalsFromBreakdowns(
  functionBreakdowns
) {
  const controlFlowTypes = [
    'if',
    'else if',
    'for',
    'for...of',
    'for...in',
    'while',
    'do...while',
    'switch',
    'case',
    'catch',
  ];
  const expressionTypes = ['ternary', '&&', '||', '??', '?.'];
  const functionParameterTypes = ['default parameter'];
  let controlFlowTotal = 0;
  let expressionsTotal = 0;
  let functionParametersTotal = 0;
  functionBreakdowns.forEach((breakdown) => {
    const breakdownObj = breakdown.breakdown || {};
    controlFlowTypes.forEach((type) => {
      controlFlowTotal += breakdownObj[type] || 0;
    });
    expressionTypes.forEach((type) => {
      expressionsTotal += breakdownObj[type] || 0;
    });
    functionParameterTypes.forEach((type) => {
      functionParametersTotal += breakdownObj[type] || 0;
    });
  });
  return {
    controlFlow: controlFlowTotal,
    expressions: expressionsTotal,
    functionParameters: functionParametersTotal,
  };
}

/**
 * Generates summary section HTML
 */
export function generateSummarySection(
  decisionPointTotals,
  totalFunctions,
  withinThreshold,
  _withinThresholdPercentage
) {
  const { controlFlow, expressions, functionParameters } = decisionPointTotals;
  const formatPercentage = (num, den) => (den === 0 ? '0%' : ((num / den) * 100) % 1 === 0 ? `${(num / den) * 100}%` : `${((num / den) * 100).toFixed(2)}%`);
  const functionsPercentage = formatPercentage(withinThreshold, totalFunctions);
  return `
    <div class="clearfix">
      <div class='fl pad1y space-right2'>
        <span class="strong">${functionsPercentage}</span>
        <span class="quiet">Functions</span>
        <span class='fraction'>${withinThreshold}/${totalFunctions}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Control Flow</span>
        <span class='fraction'>${controlFlow}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Expressions</span>
        <span class='fraction'>${expressions}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Default Parameters</span>
        <span class='fraction'>${functionParameters}</span>
      </div>
    </div>`;
}

/**
 * Calculates file-level statistics
 */
export function calculateFileStatistics(
  functions,
  complexityThreshold = 10
) {
  const totalFunctions = functions.length;
  const withinThreshold = functions.filter((f) =>
    parseInt(f.complexity, 10) <= complexityThreshold
  ).length;
  const maxComplexity = functions.length > 0
    ? Math.max(...functions.map((f) => parseInt(f.complexity, 10)))
    : 0;
  const avgComplexity = functions.length > 0
    ? Math.round(
        functions.reduce((sum, f) => sum + parseInt(f.complexity, 10), 0) /
          functions.length
      )
    : 0;
  const percentage = totalFunctions > 0
    ? Math.round((withinThreshold / totalFunctions) * 100)
    : 100;
  const level =
    percentage >= 80
      ? 'high'
      : percentage >= 60
        ? 'high'
        : percentage >= 40
          ? 'medium'
          : 'low';
  return {
    totalFunctions,
    withinThreshold,
    maxComplexity,
    avgComplexity,
    percentage,
    level,
  };
}

/**
 * Computes display options for the breakdown section
 */
export function getBreakdownSectionOptions(
  totalBreakdownCols,
  hideLinesInitially,
  hideTableInitially,
  initialShowAllColumns,
  hideHighlightsInitially
) {
  const colspanWithLines = 3 + totalBreakdownCols;
  const colspanWithoutLines = 2 + totalBreakdownCols;
  return {
    colspanWithLines,
    colspanWithoutLines,
    initialColspan: hideLinesInitially ? colspanWithoutLines : colspanWithLines,
    tableClass: hideLinesInitially ? 'complexity-breakdown-table hide-lines' : 'complexity-breakdown-table',
    showAllColumnsChecked: initialShowAllColumns ? 'checked' : '',
    showLinesChecked: hideLinesInitially ? '' : 'checked',
    showTableChecked: hideTableInitially ? '' : 'checked',
    showHighlightsChecked: hideHighlightsInitially ? '' : 'checked',
    tableDisplay: hideTableInitially ? 'none' : 'table',
  };
}

/**
 * Generates breakdown section HTML
 */
export function generateBreakdownSectionHTML(
  functions,
  initialColumns,
  breakdownItems,
  columnStructure,
  initialShowAllColumns,
  hideTableInitially,
  hideLinesInitially = false,
  hideHighlightsInitially = false
) {
  if (functions.length === 0) return '';
  const opts = getBreakdownSectionOptions(
    initialColumns.totalBreakdownCols,
    hideLinesInitially,
    hideTableInitially,
    initialShowAllColumns,
    hideHighlightsInitially
  );
  const groupHeadersHTML = initialColumns.visibleGroups.map(group => {
    if (group.columns.length === 0) return '';
    return `<th colspan="${group.columns.length}" class="breakdown-group-header" data-group="${group.name}" data-total-cols="${group.totalColumns}">${group.name}</th>`;
  }).filter(Boolean).join('');
  const colHeadersHTML = initialColumns.visibleGroups.map(group =>
    group.columns.map(col =>
      `<th class="breakdown-col-header sortable" data-column-key="${col.key}" onclick="sortTable('${col.key}')" id="sort-${col.key}-header">${col.label} <span class="sort-indicator" id="sort-${col.key}-indicator"></span></th>`
    ).join('')
  ).join('');
  return `
    <div class="complexity-breakdown">
      <div class="quiet" style="display: flex; align-items: center; gap: 15px; margin-top: 14px;">
        <div>Filter: <input type="search" id="breakdown-search" oninput="filterFunctions(this.value)"></div>
        <label style="margin: 0; font-weight: normal;"><input type="checkbox" id="breakdown-show-all-columns" onchange="toggleEmptyColumns()" ${opts.showAllColumnsChecked}> Show All Columns</label>
        <label style="margin: 0; font-weight: normal;"><input type="checkbox" id="breakdown-show-lines" onchange="toggleLineColumn()" ${opts.showLinesChecked}> Show Lines</label>
        <label style="margin: 0; font-weight: normal;"><input type="checkbox" id="breakdown-show-table" onchange="toggleTableVisibility()" ${opts.showTableChecked}> Show Table</label>
        <label style="margin: 0; font-weight: normal;"><input type="checkbox" id="breakdown-show-highlights" onchange="toggleHighlights()" ${opts.showHighlightsChecked}> Show Highlights</label>
      </div>
      <table class="${opts.tableClass}" id="complexity-breakdown-table" style="display: ${opts.tableDisplay};" data-colspan-with-lines="${opts.colspanWithLines}" data-colspan-without-lines="${opts.colspanWithoutLines}">
        <thead id="complexity-breakdown-thead">
          <tr><th colspan="${opts.initialColspan}" class="breakdown-header" id="breakdown-header-span">Function Complexity Breakdown</th></tr>
          <tr id="breakdown-group-headers-row">
            <th rowspan="2" class="breakdown-function-header sortable" onclick="sortTable('function')" id="sort-function-header">Function (base = 1) <span class="sort-indicator" id="sort-function-indicator"></span></th>
            <th rowspan="2" class="breakdown-line-header breakdown-line-column sortable" onclick="sortTable('line')" id="sort-line-header">Line <span class="sort-indicator" id="sort-line-indicator"></span></th>
            <th rowspan="2" class="breakdown-complexity-header sortable" onclick="sortTable('complexity')" id="sort-complexity-header">Complexity <span class="sort-indicator" id="sort-complexity-indicator"></span></th>
            ${groupHeadersHTML}
          </tr>
          <tr id="breakdown-col-headers-row">${colHeadersHTML}</tr>
        </thead>
        <tbody id="complexity-breakdown-tbody">
          ${breakdownItems}
          <tr id="no-matches-row" style="display: none;"><td colspan="${opts.initialColspan}" class="no-matches-message">No functions match the current filter.</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generates statistics HTML section
 */
export function _generateStatisticsHTML(
  totalFunctions,
  withinThreshold,
  maxComplexity,
  avgComplexity
) {
  const maxComplexityHTML = maxComplexity > 0
    ? `
            <div class='fl pad1y space-right2'>
              <span class="strong">${maxComplexity} </span>
              <span class="quiet">Max Complexity</span>
            </div>
            <div class='fl pad1y space-right2'>
              <span class="strong">${avgComplexity} </span>
              <span class="quiet">Avg Complexity</span>
            </div>`
    : '';
  return maxComplexityHTML;
}

/**
 * Prepares file-level data for HTML generation
 */
export function prepareFileLevelData(
  functions,
  functionBreakdowns,
  complexityThreshold
) {
  const stats = calculateFileStatistics(functions, complexityThreshold);
  const decisionPointTotals =
    calculateDecisionPointTotalsFromBreakdowns(functionBreakdowns);
  const withinThresholdPercentage = stats.totalFunctions > 0
    ? Math.round((stats.withinThreshold / stats.totalFunctions) * 100)
    : 100;
  return { ...stats, decisionPointTotals, withinThresholdPercentage };
}

/**
 * Prepares breakdown column structure
 */
export function prepareBreakdownColumns(
  functions,
  functionBreakdowns,
  showAllColumnsInitially,
  variant = 'classic'
) {
  const columnStructure = getBreakdownColumnStructure(variant);
  const emptyColumns = detectEmptyColumns(
    functions,
    functionBreakdowns,
    columnStructure
  );
  const initialColumns = buildVisibleColumns(
    columnStructure,
    emptyColumns,
    showAllColumnsInitially
  );
  return { columnStructure, emptyColumns, initialColumns };
}

/**
 * Builds visible column structure
 */
export function buildVisibleColumns(
  columnStructure,
  emptyColumns,
  showAll
) {
  const visibleGroups = columnStructure.groups.map((group) => {
    const visibleColumns = showAll
      ? group.columns
      : group.columns.filter((col) => !emptyColumns.has(col.key));
    return {
      name: group.name,
      columns: visibleColumns,
      totalColumns: group.columns.length,
      visibleColumns: visibleColumns.length,
    };
  });
  const totalBreakdownCols = visibleGroups.reduce(
    (sum, group) => sum + group.columns.length,
    0
  );
  return { visibleGroups, totalBreakdownCols };
}
