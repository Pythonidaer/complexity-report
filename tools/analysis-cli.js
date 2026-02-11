#!/usr/bin/env node

/**
 * User-facing analysis script: generates decision-points summary and (if Vitest
 * is available) coverage summary, then merges them into coverage/analysis.json.
 * Safe to run in any project; Vitest is optional.
 *
 * Usage: from project root, run via package.json script or:
 *   npx @pythonidaer/complexity-report analysis
 *   complexity-analysis
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const cwd = process.cwd();

function hasVitest() {
  try {
    const pkgPath = resolve(cwd, 'package.json');
    if (!existsSync(pkgPath)) return false;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) return true;
    if (existsSync(resolve(cwd, 'node_modules', 'vitest', 'package.json'))) return true;
  } catch {
    // ignore
  }
  return false;
}

function runNode(scriptName) {
  const scriptPath = join(packageRoot, 'tools', scriptName);
  execSync(`node "${scriptPath}"`, { cwd, stdio: 'inherit' });
}

function main() {
  let hasCoverage = false;

  if (hasVitest()) {
    try {
      execSync('npx vitest run --coverage', { cwd, stdio: 'inherit' });
      runNode('coverage-to-json.js');
      hasCoverage = true;
    } catch (err) {
      console.warn('Vitest coverage failed or coverage-final.json not produced; continuing with decision points only.');
    }
  } else {
    console.warn('Vitest not found (optional). Generating decision-points summary only. Install vitest + @vitest/coverage-v8 for coverage data.');
  }

  runNode('decision-points-to-json.js');
  runNode('merge-coverage-decision-points.js');

  if (hasCoverage) {
    console.log('Done. Output: coverage/coverage-summary.json, coverage/decision-points-summary.json, coverage/analysis.json');
  } else {
    console.log('Done. Output: coverage/decision-points-summary.json, coverage/analysis.json (no coverage data; install Vitest for coverage).');
  }
}

main();
