#!/usr/bin/env node

/**
 * CLI entry point for complexity-report
 * Parses command-line arguments and runs the report generator
 */

import { generateComplexityReport } from './index.js';

function getCliFlags() {
  const argv = process.argv;
  return {
    showAllInitially: argv.includes('--show-all') || argv.includes('--all'),
    showAllColumnsInitially: argv.includes('--show-all-columns'),
    hideTableInitially: argv.includes('--hide-table'),
    hideLinesInitially: argv.includes('--no-lines'),
    hideHighlightsInitially: argv.includes('--no-highlights'),
    shouldExport: argv.includes('--export') || argv.includes('--exports'),
    cwd: getCwdFlag(argv),
    outputDir: getOutputDirFlag(argv),
  };
}

function getCwdFlag(argv) {
  const cwdIndex = argv.findIndex(arg => arg === '--cwd');
  if (cwdIndex !== -1 && argv[cwdIndex + 1]) {
    return argv[cwdIndex + 1];
  }
  return process.cwd();
}

function getOutputDirFlag(argv) {
  const outputIndex = argv.findIndex(arg => arg === '--output-dir' || arg === '--output');
  if (outputIndex !== -1 && argv[outputIndex + 1]) {
    return argv[outputIndex + 1];
  }
  return undefined;
}

async function main() {
  const flags = getCliFlags();
  
  await generateComplexityReport({
    cwd: flags.cwd,
    outputDir: flags.outputDir,
    showAllInitially: flags.showAllInitially,
    showAllColumnsInitially: flags.showAllColumnsInitially,
    hideTableInitially: flags.hideTableInitially,
    hideLinesInitially: flags.hideLinesInitially,
    hideHighlightsInitially: flags.hideHighlightsInitially,
    shouldExport: flags.shouldExport,
  });
}

main().catch((error) => {
  console.error('Error generating complexity report:', error);
  process.exit(1);
});
