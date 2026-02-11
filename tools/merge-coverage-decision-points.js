#!/usr/bin/env node

/**
 * Merges coverage/coverage-summary.json (optional) and coverage/decision-points-summary.json
 * into a single coverage/analysis.json. If coverage-summary is missing (e.g. no Vitest),
 * writes analysis.json with decision-points data only; uncoveredDecisionPoints will be
 * empty unless coverage was provided.
 *
 * Usage:
 *   node tools/merge-coverage-decision-points.js [coverageDir]
 * Default: coverageDir = coverage
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const defaultDir = 'coverage';
const coverageSummaryPath = 'coverage-summary.json';
const decisionPointsPath = 'decision-points-summary.json';
const outputPath = 'analysis.json';

function run() {
  const dir = resolve(process.cwd(), process.argv[2] || defaultDir);
  const coverageFile = resolve(dir, coverageSummaryPath);
  const decisionPointsFile = resolve(dir, decisionPointsPath);
  const outFile = resolve(dir, outputPath);

  if (!existsSync(decisionPointsFile)) {
    console.error('Missing', decisionPointsFile, '- run the analysis script or decision-points:json first');
    process.exit(1);
  }

  const decisionPoints = JSON.parse(readFileSync(decisionPointsFile, 'utf-8'));
  const dpByFile = new Map(decisionPoints.files.map((f) => [f.file, f]));

  let coverageByFile = new Map();
  let coverageSummary = {};
  if (existsSync(coverageFile)) {
    const coverage = JSON.parse(readFileSync(coverageFile, 'utf-8'));
    coverageByFile = new Map(coverage.files.map((f) => [f.file, f]));
    coverageSummary = coverage.summary || {};
  }

  const allFiles = new Set([...coverageByFile.keys(), ...dpByFile.keys()]);
  const files = [...allFiles].sort().map((file) => {
    const cov = coverageByFile.get(file) || {};
    const dp = dpByFile.get(file) || {};
    const uncoveredSet = new Set(cov.uncoveredLines || []);
    const uncoveredDecisionPoints = (dp.decisionPoints || []).filter((p) =>
      uncoveredSet.has(p.line)
    );
    return {
      file,
      ...cov,
      decisionPointCount: dp.decisionPointCount,
      decisionPoints: dp.decisionPoints,
      decisionPointLines: dp.decisionPointLines,
      decisionPointLineRanges: dp.decisionPointLineRanges,
      uncoveredDecisionPoints,
    };
  });

  const output = {
    summary: {
      ...coverageSummary,
      ...decisionPoints.summary,
    },
    files,
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  console.log('Wrote', outFile);
}

run();
