#!/usr/bin/env node

/**
 * Outputs decision points per file in a format aligned with coverage-summary.json.
 * Uses the same ESLint run and decision-points pipeline as the complexity report.
 *
 * Usage:
 *   node tools/decision-points-to-json.js [cwd] [output.json]
 * Default: cwd = process.cwd(), output = coverage/decision-points-summary.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { runESLintComplexityCheck, findESLintConfig, getComplexityVariant } from '../integration/eslint/index.js';
import { extractFunctionsFromESLintResults } from '../function-extraction/index.js';
import { findFunctionBoundaries } from '../function-boundaries/index.js';
import { parseDecisionPointsAST } from '../decision-points/index.js';

function toRanges(lineNumbers) {
  if (lineNumbers.length === 0) return [];
  const ranges = [];
  let start = lineNumbers[0];
  let end = lineNumbers[0];
  for (let i = 1; i < lineNumbers.length; i++) {
    if (lineNumbers[i] === end + 1) {
      end = lineNumbers[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = lineNumbers[i];
      end = lineNumbers[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges;
}

function groupFunctionsByFile(allFunctions) {
  const fileMap = new Map();
  allFunctions.forEach((func) => {
    if (!fileMap.has(func.file)) fileMap.set(func.file, []);
    fileMap.get(func.file).push(func);
  });
  return fileMap;
}

async function run(projectRoot, outputPath) {
  const configPath = findESLintConfig(projectRoot);
  const variant = configPath ? getComplexityVariant(configPath) : 'classic';

  const eslintResults = await runESLintComplexityCheck(projectRoot);
  const allFunctions = extractFunctionsFromESLintResults(eslintResults, projectRoot);
  const fileMap = groupFunctionsByFile(allFunctions);

  const parseDecisionPoints = (sourceCode, functionBoundaries, functions, filePath) =>
    parseDecisionPointsAST(sourceCode, functionBoundaries, functions, filePath, projectRoot, { variant });

  const files = [];
  let totalDecisionPoints = 0;

  for (const [filePath, functions] of fileMap.entries()) {
    const fullPath = resolve(projectRoot, filePath);
    if (!existsSync(fullPath)) continue;
    let decisionPoints;
    try {
      const sourceCode = readFileSync(fullPath, 'utf-8');
      const functionBoundaries = findFunctionBoundaries(sourceCode, functions);
      decisionPoints = await parseDecisionPoints(sourceCode, functionBoundaries, functions, filePath);
    } catch (err) {
      console.warn(`Warning: Could not parse decision points for ${filePath}:`, err.message);
      decisionPoints = [];
    }

    const points = decisionPoints.map((dp) => ({
      line: dp.line,
      type: dp.type,
      functionLine: dp.functionLine,
    }));

    const decisionPointLines = [...new Set(decisionPoints.map((dp) => dp.line))].sort((a, b) => a - b);
    const decisionPointLineRanges = toRanges(decisionPointLines);

    totalDecisionPoints += decisionPoints.length;

    files.push({
      file: filePath,
      decisionPointCount: decisionPoints.length,
      decisionPoints: points,
      decisionPointLines,
      decisionPointLineRanges,
    });
  }

  const summary = {
    totalDecisionPoints,
    filesWithDecisionPoints: files.filter((f) => f.decisionPointCount > 0).length,
  };

  const output = {
    summary,
    files: files.sort((a, b) => a.file.localeCompare(b.file)),
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log('Wrote', outputPath);
}

function main() {
  const projectRoot = resolve(process.cwd(), process.argv[2] || '.');
  const outputPath = resolve(projectRoot, process.argv[3] || 'coverage/decision-points-summary.json');
  run(projectRoot, outputPath).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
