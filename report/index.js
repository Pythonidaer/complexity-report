import { writeFileSync, mkdirSync, copyFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import {
  runESLintComplexityCheck,
  findESLintConfig,
  getComplexityVariant,
} from '../integration/eslint/index.js';
import {
  extractFunctionsFromESLintResults,
  getComplexityLevel,
  getDirectory,
  getBaseFunctionName,
} from '../function-extraction/index.js';
import { findFunctionBoundaries } from '../function-boundaries/index.js';
import { parseDecisionPointsAST } from '../decision-points/index.js';
import { calculateComplexityBreakdown } from '../complexity-breakdown.js';
import {
  formatFunctionHierarchy,
  setEscapeHtml,
} from '../function-hierarchy.js';
import {
  escapeHtml,
  generateAboutPageHTML,
  generateMainIndexHTML,
  generateFolderHTML,
  generateFileHTML,
} from '../html-generators/index.js';
import { getComplexityThreshold } from '../integration/threshold/index.js';
import { generateAllExports } from '../export-generators/index.js';

/**
 * Calculates decision point totals across all functions
 */
async function calculateDecisionPointTotals(
  allFunctions,
  projectRoot,
  findFunctionBoundaries,
  parseDecisionPoints
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

  const fileToFunctions = new Map();
  allFunctions.forEach((func) => {
    if (!fileToFunctions.has(func.file)) fileToFunctions.set(func.file, []);
    fileToFunctions.get(func.file).push(func);
  });

  for (const [filePath, functions] of fileToFunctions.entries()) {
    const fullPath = resolve(projectRoot, filePath);
    if (!existsSync(fullPath)) continue;
    try {
      const sourceCode = readFileSync(fullPath, 'utf-8');
      const functionBoundaries = findFunctionBoundaries(sourceCode, functions);
      const decisionPoints = await parseDecisionPoints(
        sourceCode,
        functionBoundaries,
        functions,
        filePath,
        projectRoot
      );
      const seenLines = new Set();
      functions.forEach((func) => {
        const lineKey = `${filePath}:${func.line}`;
        if (seenLines.has(lineKey)) return;
        seenLines.add(lineKey);
        const breakdown = calculateComplexityBreakdown(func.line, decisionPoints, 1);
        controlFlowTypes.forEach((type) => {
          controlFlowTotal += breakdown.breakdown[type] || 0;
        });
        expressionTypes.forEach((type) => {
          expressionsTotal += breakdown.breakdown[type] || 0;
        });
        functionParameterTypes.forEach((type) => {
          functionParametersTotal += breakdown.breakdown[type] || 0;
        });
      });
    } catch (error) {
      console.warn(
        `Warning: Could not process ${filePath} for decision point totals:`,
        error.message
      );
    }
  }

  return {
    controlFlow: controlFlowTotal,
    expressions: expressionsTotal,
    functionParameters: functionParametersTotal,
  };
}

function calculateFunctionStatistics(allFunctions, complexityThreshold) {
  const overThreshold = allFunctions.filter(
    (f) => parseInt(f.complexity, 10) > complexityThreshold
  );
  const allFunctionsCount = allFunctions.length;
  const maxComplexity =
    allFunctions.length > 0
      ? Math.max(...allFunctions.map((i) => parseInt(i.complexity, 10)))
      : 0;
  const avgComplexity =
    allFunctions.length > 0
      ? Math.round(
          allFunctions.reduce(
            (sum, i) => sum + parseInt(i.complexity, 10),
            0
          ) / allFunctions.length
        )
      : 0;
  const withinThreshold = allFunctions.filter(
    (f) => parseInt(f.complexity, 10) <= complexityThreshold
  ).length;
  const withinThresholdPercentage =
    allFunctionsCount > 0
      ? Math.round((withinThreshold / allFunctionsCount) * 100)
      : 100;
  return {
    overThreshold,
    allFunctionsCount,
    maxComplexity,
    avgComplexity,
    withinThreshold,
    withinThresholdPercentage,
  };
}

function groupFunctionsByFolder(allFunctions, complexityThreshold) {
  const folderMap = new Map();
  allFunctions.forEach((func) => {
    const dir = getDirectory(func.file);
    if (!folderMap.has(dir)) folderMap.set(dir, []);
    folderMap.get(dir).push(func);
  });
  return Array.from(folderMap.entries()).map(([dir, functions]) => {
    const totalFunctions = functions.length;
    const withinThreshold = functions.filter(
      (f) => parseInt(f.complexity, 10) <= complexityThreshold
    ).length;
    const percentage =
      totalFunctions > 0
        ? Math.round((withinThreshold / totalFunctions) * 100)
        : 100;
    return {
      directory: dir,
      totalFunctions,
      withinThreshold,
      percentage,
      functions: functions.sort(
        (a, b) => parseInt(b.complexity, 10) - parseInt(a.complexity, 10)
      ),
    };
  }).sort((a, b) => a.directory.localeCompare(b.directory));
}

function groupFunctionsByFile(allFunctions) {
  const fileMap = new Map();
  allFunctions.forEach((func) => {
    if (!fileMap.has(func.file)) fileMap.set(func.file, []);
    fileMap.get(func.file).push(func);
  });
  return fileMap;
}

function copyRequiredFiles(projectRoot, complexityDir, packageRoot) {
  const assetsDir = resolve(packageRoot, 'assets');
  const htmlGeneratorsDir = resolve(packageRoot, 'html-generators');
  const prettifyFiles = [
    { source: resolve(assetsDir, 'prettify.css'), dest: resolve(complexityDir, 'prettify.css') },
    { source: resolve(assetsDir, 'prettify.js'), dest: resolve(complexityDir, 'prettify.js') },
  ];
  prettifyFiles.forEach(({ source, dest }) => {
    try {
      copyFileSync(source, dest);
    } catch (error) {
      console.warn(`Warning: Could not copy ${source}:`, error.message);
    }
  });
  try {
    copyFileSync(
      resolve(assetsDir, 'sort-arrow-sprite.png'),
      resolve(complexityDir, 'sort-arrow-sprite.png')
    );
  } catch (error) {
    console.warn(
      'Warning: Could not copy sort-arrow-sprite.png:',
      error.message
    );
  }
  try {
    copyFileSync(
      resolve(htmlGeneratorsDir, 'shared.css'),
      resolve(complexityDir, 'shared.css')
    );
  } catch (error) {
    console.warn('Warning: Could not copy shared.css:', error.message);
  }
  try {
    copyFileSync(
      resolve(htmlGeneratorsDir, 'file.css'),
      resolve(complexityDir, 'file.css')
    );
  } catch (error) {
    console.warn('Warning: Could not copy file.css:', error.message);
  }
}

function getCliFlags() {
  const argv = process.argv;
  return {
    showAllInitially: argv.includes('--show-all') || argv.includes('--all'),
    showAllColumnsInitially: argv.includes('--show-all-columns'),
    hideTableInitially: argv.includes('--hide-table'),
    hideLinesInitially: argv.includes('--no-lines'),
    hideHighlightsInitially: argv.includes('--no-highlights'),
    shouldExport: argv.includes('--export') || argv.includes('--exports'),
  };
}

function writeMainReport(projectRoot, complexityDir, packageRoot, html) {
  mkdirSync(complexityDir, { recursive: true });
  copyRequiredFiles(projectRoot, complexityDir, packageRoot);
  writeFileSync(resolve(complexityDir, 'index.html'), html, 'utf-8');
  writeFileSync(
    resolve(complexityDir, 'about.html'),
    generateAboutPageHTML(),
    'utf-8'
  );
}

async function generateOneFolderHTML(
  folder,
  folders,
  projectRoot,
  complexityDir,
  parseDecisionPointsFn,
  showAllInitially,
  complexityThreshold
) {
  if (!folder.directory) return 0;
  const folderPath = folder.directory;
  const folderDir = resolve(complexityDir, ...folderPath.split('/'));
  try {
    mkdirSync(folderDir, { recursive: true });
    const folderDecisionPointTotals = await calculateDecisionPointTotals(
      folder.functions,
      projectRoot,
      findFunctionBoundaries,
      parseDecisionPointsFn
    );
    const folderHTML = generateFolderHTML(
      folder,
      folders,
      showAllInitially,
      getComplexityLevel,
      getBaseFunctionName,
      complexityThreshold,
      folderDecisionPointTotals
    );
    writeFileSync(resolve(folderDir, 'index.html'), folderHTML, 'utf-8');
    return 1;
  } catch (error) {
    console.error(
      `Error generating folder HTML for ${folderPath}:`,
      error.message
    );
    return 0;
  }
}

async function generateOneFileHTML(
  filePath,
  functions,
  projectRoot,
  complexityDir,
  parseDecisionPointsFn,
  showAllColumnsInitially,
  hideTableInitially,
  complexityThreshold,
  hideLinesInitially = false,
  hideHighlightsInitially = false,
  variant = 'classic'
) {
  try {
    const fileDir = getDirectory(filePath);
    const fileName = filePath.split('/').pop();
    if (fileDir) {
      mkdirSync(
        resolve(complexityDir, ...fileDir.split('/')),
        { recursive: true }
      );
    }
    const fileHTML = await generateFileHTML(
      filePath,
      functions,
      projectRoot,
      findFunctionBoundaries,
      parseDecisionPointsFn,
      calculateComplexityBreakdown,
      formatFunctionHierarchy,
      getComplexityLevel,
      getDirectory,
      escapeHtml,
      showAllColumnsInitially,
      hideTableInitially,
      complexityThreshold,
      hideLinesInitially,
      hideHighlightsInitially,
      variant
    );
    const fileHTMLPath = fileDir
      ? resolve(complexityDir, ...fileDir.split('/'), `${fileName}.html`)
      : resolve(complexityDir, `${fileName}.html`);
    writeFileSync(fileHTMLPath, fileHTML, 'utf-8');
    return 1;
  } catch (error) {
    console.error(
      `Error generating file HTML for ${filePath}:`,
      error.message
    );
    return 0;
  }
}

function runExportsIfRequested(shouldExport, projectRoot, allFunctions) {
  if (!shouldExport) return;
  try {
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const exportDirConfig =
      packageJson.complexityReport?.exportDir || 'complexity/reports';
    const exportDir = resolve(projectRoot, exportDirConfig);
    const exportResult = generateAllExports(
      allFunctions,
      projectRoot,
      exportDir
    );
    console.log(`\n✅ Exports generated in: ${exportDirConfig}/`);
    console.log(
      `   Generated ${exportResult.generatedFiles.length} export file(s):`
    );
    exportResult.generatedFiles.forEach((file) =>
      console.log(`   - ${file.replace(projectRoot + '/', '')}`)
    );
  } catch (error) {
    console.error('Error generating exports:', error.message);
    console.error('  Exports will be skipped, but HTML report generation will continue.');
  }
}

function printReportSummary(
  stats,
  complexityThreshold,
  foldersGenerated,
  filesGenerated
) {
  console.log(`\n✅ Complexity report generated: complexity/index.html`);
  console.log(`   About: complexity/about.html`);
  console.log(`   Generated ${foldersGenerated} folder HTML file(s)`);
  console.log(`   Generated ${filesGenerated} file HTML page(s)`);
  console.log(`   Found ${stats.allFunctionsCount} total function(s)`);
  if (stats.overThreshold.length > 0) {
    console.log(
      `   ${stats.overThreshold.length} function(s) with complexity > ${complexityThreshold}`
    );
    console.log('');
    stats.overThreshold.forEach((f) =>
      console.log(
        `   ${f.file}:${f.line}  ${f.functionName}  (complexity ${f.complexity})`
      )
    );
  }
  if (stats.allFunctionsCount > 0) {
    console.log(
      `   Highest complexity: ${stats.maxComplexity} / Average: ${stats.avgComplexity}`
    );
  }
  console.log(`   Using AST-based parser for 100% accuracy`);
}

/**
 * Generate complexity report for a project
 * @param {Object} options - Configuration options
 * @param {string} [options.cwd] - Project root directory (defaults to process.cwd())
 * @param {string} [options.outputDir] - Output directory for reports (defaults to 'complexity' under cwd)
 * @param {boolean} [options.showAllInitially] - Show all functions initially
 * @param {boolean} [options.showAllColumnsInitially] - Show all breakdown columns initially
 * @param {boolean} [options.hideTableInitially] - Hide breakdown table initially
 * @param {boolean} [options.hideLinesInitially] - Hide line numbers initially
 * @param {boolean} [options.hideHighlightsInitially] - Hide highlights initially
 * @param {boolean} [options.shouldExport] - Generate export files
 */
export async function generateComplexityReport(options = {}) {
  const {
    cwd = process.cwd(),
    outputDir,
    showAllInitially = false,
    showAllColumnsInitially = false,
    hideTableInitially = false,
    hideLinesInitially = false,
    hideHighlightsInitially = false,
    shouldExport = false,
  } = options;

  // Get package root from this file's location
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageRoot = resolve(__dirname, '..');
  
  // Use provided cwd or default to process.cwd()
  const projectRoot = resolve(cwd);

  setEscapeHtml(escapeHtml);

  const complexityThreshold = getComplexityThreshold(projectRoot);
  const configPath = findESLintConfig(projectRoot);
  const variant = configPath ? getComplexityVariant(configPath) : 'classic';

  const eslintResults = await runESLintComplexityCheck(projectRoot);
  const allFunctions = extractFunctionsFromESLintResults(eslintResults, projectRoot);
  allFunctions.sort((a, b) => parseInt(b.complexity, 10) - parseInt(a.complexity, 10));

  const stats = calculateFunctionStatistics(allFunctions, complexityThreshold);
  const folders = groupFunctionsByFolder(allFunctions, complexityThreshold);
  const fileMap = groupFunctionsByFile(allFunctions);

  // Use options passed to function (CLI will override via getCliFlags)

  const parseDecisionPointsFn = (
    sourceCode,
    functionBoundaries,
    functions,
    filePath,
    projectRoot
  ) =>
    parseDecisionPointsAST(
      sourceCode,
      functionBoundaries,
      functions,
      filePath,
      projectRoot,
      { variant }
    );

  const decisionPointTotals = await calculateDecisionPointTotals(
    allFunctions,
    projectRoot,
    findFunctionBoundaries,
    parseDecisionPointsFn
  );

  const html = generateMainIndexHTML(
    folders,
    stats.allFunctionsCount,
    stats.overThreshold,
    stats.maxComplexity,
    stats.avgComplexity,
    showAllInitially,
    complexityThreshold,
    decisionPointTotals,
    stats.withinThreshold,
    stats.withinThresholdPercentage
  );

  const complexityDir = outputDir 
    ? resolve(projectRoot, outputDir)
    : resolve(projectRoot, 'complexity');
  writeMainReport(projectRoot, complexityDir, packageRoot, html);

  const folderPromises = folders.map((folder) =>
    generateOneFolderHTML(
      folder,
      folders,
      projectRoot,
      complexityDir,
      parseDecisionPointsFn,
      showAllInitially,
      complexityThreshold
    )
  );
  const foldersGenerated = (await Promise.all(folderPromises)).reduce(
    (a, b) => a + b,
    0
  );

  const filePromises = Array.from(fileMap.entries()).map(
    ([filePath, functions]) =>
      generateOneFileHTML(
        filePath,
        functions,
        projectRoot,
        complexityDir,
        parseDecisionPointsFn,
        showAllColumnsInitially,
        hideTableInitially,
        complexityThreshold,
        hideLinesInitially,
        hideHighlightsInitially,
        variant
      )
  );
  const filesGenerated = (await Promise.all(filePromises)).reduce(
    (a, b) => a + b,
    0
  );

  runExportsIfRequested(shouldExport, projectRoot, allFunctions);
  printReportSummary(stats, complexityThreshold, foldersGenerated, filesGenerated);
  
  return {
    stats,
    folders,
    complexityDir,
  };
}

/**
 * Main entry point when run directly (not as a module)
 * Parses CLI flags and calls generateComplexityReport
 */
async function main() {
  const flags = getCliFlags();
  
  await generateComplexityReport({
    cwd: process.cwd(),
    showAllInitially: flags.showAllInitially,
    showAllColumnsInitially: flags.showAllColumnsInitially,
    hideTableInitially: flags.hideTableInitially,
    hideLinesInitially: flags.hideLinesInitially,
    hideHighlightsInitially: flags.hideHighlightsInitially,
    shouldExport: flags.shouldExport,
  });
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error generating complexity report:', error);
    process.exit(1);
  });
}
