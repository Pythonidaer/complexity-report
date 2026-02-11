#!/usr/bin/env node

/**
 * Reads Vitest v8 coverage-final.json and writes a summary JSON file
 * with per-file stats (statements, branches, functions, lines) and
 * uncovered line ranges, suitable for tooling or LLM hints.
 *
 * Usage:
 *   node tools/coverage-to-json.js [coverage-final.json] [output.json]
 * Default: reads coverage/coverage-final.json, writes coverage/coverage-summary.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

const defaultInput = 'coverage/coverage-final.json';
const defaultOutput = 'coverage/coverage-summary.json';

function getRelativePath(absolutePath, projectRoot) {
  try {
    return relative(projectRoot, absolutePath);
  } catch {
    return absolutePath;
  }
}

function toPct(covered, total) {
  if (total === 0) return 100;
  return Math.round((covered / total) * 10000) / 100;
}

function uncoveredStatementLines(entry) {
  const s = entry.s || {};
  const statementMap = entry.statementMap || {};
  const lines = new Set();
  for (const [id, count] of Object.entries(s)) {
    if (count === 0 && statementMap[id]) {
      const { start, end } = statementMap[id];
      for (let line = start.line; line <= end.line; line++) {
        lines.add(line);
      }
    }
  }
  return [...lines].sort((a, b) => a - b);
}

function toRanges(lineNumbers) {
  if (lineNumbers.length === 0) return [];
  const ranges = [];
  let start = lineNumbers[0];
  let end = lineNumbers[0];
  for (let i = 1; i < lineNumbers.length; i++) {
    if (lineNumbers[i] === end + 1) {
      end = lineNumbers[i];
    } else {
      ranges.push(start === end ? [start] : [start, end]);
      start = lineNumbers[i];
      end = lineNumbers[i];
    }
  }
  ranges.push(start === end ? [start] : [start, end]);
  return ranges;
}

function summarizeFile(entry, filePath, projectRoot) {
  const s = entry.s || {};
  const b = entry.b || {};
  const f = entry.f || {};
  const statementMap = entry.statementMap || {};
  const branchMap = entry.branchMap || {};
  const fnMap = entry.fnMap || {};

  const statementIds = Object.keys(s);
  const statementTotal = statementIds.length;
  const statementCovered = statementIds.filter((id) => s[id] > 0).length;

  const branchIds = Object.keys(b);
  let branchTotal = 0;
  let branchCovered = 0;
  for (const id of branchIds) {
    const hits = b[id];
    const len = Array.isArray(hits) ? hits.length : 0;
    branchTotal += len;
    branchCovered += (Array.isArray(hits) ? hits : []).filter((h) => h > 0).length;
  }

  const fnIds = Object.keys(f);
  const fnTotal = fnIds.length;
  const fnCovered = fnIds.filter((id) => f[id] > 0).length;

  const linesWithStatements = new Set();
  for (const range of Object.values(statementMap)) {
    for (let line = range.start.line; line <= range.end.line; line++) {
      linesWithStatements.add(line);
    }
  }
  const linesCoveredSet = new Set();
  for (const [id, count] of Object.entries(s)) {
    if (count > 0 && statementMap[id]) {
      const { start, end } = statementMap[id];
      for (let line = start.line; line <= end.line; line++) {
        linesCoveredSet.add(line);
      }
    }
  }
  const lineTotal = linesWithStatements.size;
  const lineCovered = [...linesWithStatements].filter((line) => linesCoveredSet.has(line)).length;

  const uncoveredLines = uncoveredStatementLines(entry);
  const uncoveredLineRanges = toRanges(uncoveredLines);

  const relativePath = getRelativePath(filePath, projectRoot);

  return {
    file: relativePath,
    statements: toPct(statementCovered, statementTotal),
    branches: toPct(branchCovered, branchTotal),
    functions: toPct(fnCovered, fnTotal),
    lines: toPct(lineCovered, lineTotal),
    uncoveredLines,
    uncoveredLineRanges: uncoveredLineRanges.map((r) => (r.length === 1 ? `${r[0]}` : `${r[0]}-${r[1]}`)),
  };
}

function run() {
  const projectRoot = resolve(process.cwd());
  const inputPath = resolve(projectRoot, process.argv[2] || defaultInput);
  const outputPath = resolve(projectRoot, process.argv[3] || defaultOutput);

  let data;
  try {
    data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to read coverage file:', inputPath, err.message);
    process.exit(1);
  }

  const files = [];
  let statementCovered = 0;
  let statementTotal = 0;
  let branchCovered = 0;
  let branchTotal = 0;
  let fnCovered = 0;
  let fnTotal = 0;
  let lineCovered = 0;
  let lineTotal = 0;

  for (const [filePath, entry] of Object.entries(data)) {
    const s = entry.s || {};
    const statementMap = entry.statementMap || {};
    const statementIds = Object.keys(s);
    const stTotal = statementIds.length;
    const stCovered = statementIds.filter((id) => s[id] > 0).length;

    const b = entry.b || {};
    let brTotal = 0;
    let brCovered = 0;
    for (const id of Object.keys(b)) {
      const hits = b[id];
      const len = Array.isArray(hits) ? hits.length : 0;
      brTotal += len;
      brCovered += (Array.isArray(hits) ? hits : []).filter((h) => h > 0).length;
    }

    const f = entry.f || {};
    const fnIds = Object.keys(f);
    const fTotal = fnIds.length;
    const fCovered = fnIds.filter((id) => f[id] > 0).length;

    const linesWithStatements = new Set();
    for (const range of Object.values(statementMap)) {
      for (let line = range.start.line; line <= range.end.line; line++) {
        linesWithStatements.add(line);
      }
    }
    const linesCoveredSet = new Set();
    for (const [id, count] of Object.entries(s)) {
      if (count > 0 && statementMap[id]) {
        const { start, end } = statementMap[id];
        for (let line = start.line; line <= end.line; line++) {
          linesCoveredSet.add(line);
        }
      }
    }
    const lTotal = linesWithStatements.size;
    const lCovered = [...linesWithStatements].filter((line) => linesCoveredSet.has(line)).length;

    statementTotal += stTotal;
    statementCovered += stCovered;
    branchTotal += brTotal;
    branchCovered += brCovered;
    fnTotal += fTotal;
    fnCovered += fCovered;
    lineTotal += lTotal;
    lineCovered += lCovered;

    files.push(summarizeFile(entry, filePath, projectRoot));
  }

  const summary = {
    statements: toPct(statementCovered, statementTotal),
    branches: toPct(branchCovered, branchTotal),
    functions: toPct(fnCovered, fnTotal),
    lines: toPct(lineCovered, lineTotal),
  };

  const output = {
    summary,
    files: files.sort((a, b) => a.file.localeCompare(b.file)),
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log('Wrote', outputPath);
}

run();
