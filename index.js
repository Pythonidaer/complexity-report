/**
 * complexity-report - AST-based cyclomatic complexity analyzer
 * 
 * Public API for programmatic usage
 */

export { generateComplexityReport } from './report/index.js';

// Export utility functions that might be useful for consumers
export { findESLintConfig, getComplexityVariant } from './integration/eslint/index.js';
export { getComplexityThreshold } from './integration/threshold/index.js';

/**
 * Type definitions for API consumers (JSDoc)
 * 
 * @typedef {Object} ComplexityReportOptions
 * @property {string} [cwd] - Project root directory (defaults to process.cwd())
 * @property {string} [outputDir] - Output directory for reports (defaults to 'complexity' under cwd)
 * @property {boolean} [showAllInitially] - Show all functions initially in HTML report
 * @property {boolean} [showAllColumnsInitially] - Show all breakdown columns initially
 * @property {boolean} [hideTableInitially] - Hide breakdown table initially
 * @property {boolean} [hideLinesInitially] - Hide line numbers initially
 * @property {boolean} [hideHighlightsInitially] - Hide code highlights initially
 * @property {boolean} [shouldExport] - Generate TXT/MD export files
 * 
 * @typedef {Object} ComplexityReportResult
 * @property {Object} stats - Statistics about analyzed functions
 * @property {number} stats.allFunctionsCount - Total number of functions analyzed
 * @property {number} stats.maxComplexity - Highest complexity found
 * @property {number} stats.avgComplexity - Average complexity
 * @property {number} stats.withinThreshold - Number of functions within threshold
 * @property {number} stats.withinThresholdPercentage - Percentage within threshold
 * @property {Array} stats.overThreshold - Functions exceeding complexity threshold
 * @property {Array} folders - Folder-level complexity data
 * @property {string} complexityDir - Path to generated report directory
 */
