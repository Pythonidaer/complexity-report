/**
 * Main file page HTML generator
 * Orchestrates file-helpers, file-breakdown, file-boundary-builders,
 * file-line-render, file-data
 */
import { resolve } from 'path';
import { generateJavaScriptCode } from './file-javascript.js';
import { detectLanguage, getFilePagePaths, readSourceFile } from './file-helpers.js';
import {
  calculateFunctionBreakdowns,
  generateSummarySection,
  generateBreakdownSectionHTML,
  prepareFileLevelData,
  prepareBreakdownColumns,
} from './file-breakdown.js';
import { buildLineToSpan } from './file-boundary-builders.js';
import { generateLineRowHTML } from './file-line-render.js';
import { createLineToFunctionMap, createDecisionPointLineMap } from './file-data.js';

/**
 * Generates file HTML page with line-by-line complexity annotations
 * @param {string} filePath - Relative file path
 * @param {Array} functions - Array of function objects
 * @param {string} projectRoot - Project root directory
 * @param {Function} findFunctionBoundaries - Find function boundaries
 * @param {Function} parseDecisionPoints - Parse decision points
 * @param {Function} calculateComplexityBreakdown - Calculate breakdown
 * @param {Function} formatFunctionHierarchy - Format hierarchy
 * @param {Function} getComplexityLevel - Get complexity level
 * @param {Function} getDirectory - Get directory from file path
 * @param {Function} escapeHtml - Escape HTML
 * @param {'classic'|'modified'} [variant='classic'] - Complexity variant
 *                                (controls switch vs case column in FCB)
 * @returns {string} Full HTML document string
 */
export async function generateFileHTML(
  filePath,
  functions,
  projectRoot,
  findFunctionBoundaries,
  parseDecisionPoints,
  calculateComplexityBreakdown,
  formatFunctionHierarchy,
  getComplexityLevel,
  getDirectory,
  escapeHtml,
  showAllColumnsInitially = false,
  hideTableInitially = false,
  complexityThreshold = 10,
  hideLinesInitially = false,
  hideHighlightsInitially = false,
  variant = 'classic'
) {
  const fullPath = resolve(projectRoot, filePath);
  const { sourceCode, sourceLines } = readSourceFile(fullPath, filePath);

  const lineToFunction = createLineToFunctionMap(functions);
  const functionBoundaries = findFunctionBoundaries(sourceCode, functions);
  const decisionPoints = await parseDecisionPoints(
    sourceCode,
    functionBoundaries,
    functions,
    filePath,
    projectRoot
  );
  const functionBreakdowns = calculateFunctionBreakdowns(
    functions,
    functionBoundaries,
    decisionPoints,
    calculateComplexityBreakdown
  );
  const lineToDecisionPoint = createDecisionPointLineMap(decisionPoints);

  const fileData = prepareFileLevelData(
    functions,
    functionBreakdowns,
    complexityThreshold
  );
  const {
    totalFunctions,
    withinThreshold,
    level,
    decisionPointTotals,
    withinThresholdPercentage,
  } = fileData;
  const summarySection = generateSummarySection(
    decisionPointTotals,
    totalFunctions,
    withinThreshold,
    withinThresholdPercentage
  );

  const fileDir = getDirectory(filePath);
  const fileName = filePath.split('/').pop();
  const paths = getFilePagePaths(filePath, fileDir);

  const breakdownData = prepareBreakdownColumns(
    functions,
    functionBreakdowns,
    showAllColumnsInitially,
    variant
  );
  const { columnStructure, emptyColumns, initialColumns } = breakdownData;
  const breakdownItems = formatFunctionHierarchy(
    functions,
    functionBoundaries,
    functionBreakdowns,
    sourceCode,
    columnStructure,
    emptyColumns,
    showAllColumnsInitially,
    complexityThreshold
  );
  const breakdownSection = generateBreakdownSectionHTML(
    functions,
    initialColumns,
    breakdownItems,
    columnStructure,
    showAllColumnsInitially,
    hideTableInitially,
    hideLinesInitially,
    hideHighlightsInitially
  );

  const lineToSpan = buildLineToSpan(
    functionBoundaries,
    sourceLines.length,
    sourceLines
  );

  const languageClass = detectLanguage(filePath);
  const lineRows = sourceLines.map((line, index) =>
    generateLineRowHTML(
      line,
      index,
      lineToFunction,
      lineToDecisionPoint,
      getComplexityLevel,
      escapeHtml,
      languageClass
    )
  ).join('\n');

  const javascriptCode = generateJavaScriptCode(
    showAllColumnsInitially,
    columnStructure,
    emptyColumns,
    lineToSpan,
    !hideLinesInitially
  );

  const {
    backLink,
    folderIndexPath,
    aboutPath,
    prettifyCssPath,
    prettifyJsPath,
    sharedCssPath,
    fileCssPath,
  } = paths;

  return `<!doctype html>
<html lang="en">
<head>
    <title>Complexity report for ${filePath}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${sharedCssPath}" />
    <link rel="stylesheet" href="${prettifyCssPath}" />
    <link rel="stylesheet" href="${fileCssPath}" />
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <div class="header-row">
            <h1>
              <a href="${backLink}">All files</a>${
  fileDir ? ` / <a href="${folderIndexPath}">${fileDir}</a>` : ''
} / ${fileName}
            </h1>
            <a href="${aboutPath}" class="about-link">
              About Cyclomatic Complexity
            </a>
        </div>
        ${summarySection}
        ${breakdownSection}
    </div>
    <div class='status-line ${level}'></div>
    <div class="pad1 coverage-block">
    <div class="coverage-table-wrapper${hideHighlightsInitially ? ' hide-highlights' : ''}">
    <div id="hover-vertical-line" aria-hidden="true"></div>
<pre><table class="coverage" id="coverage-table">
${lineRows}
</table></pre>
    </div>
    </div>
    <div class='push'></div>
</div>
<div class='footer quiet pad2 space-top1 center small'>
    Complexity report generated by <a href="https://www.github.com/pythonidaer" target="_blank" rel="noopener noreferrer">pythonidaer</a> at ${new Date().toISOString()}
</div>
<button type="button" id="scroll-to-top" class="scroll-to-top" aria-label="Scroll to top" title="Scroll to top">↑</button>
<script src="${prettifyJsPath}"></script>
<script>${javascriptCode}</script>
</body>
</html>`;
}
