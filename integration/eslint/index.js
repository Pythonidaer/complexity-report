import { ESLint } from 'eslint';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const CONFIG_NAMES = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs'];
const COMPLEXITY_DIR = 'complexity';
const REPORT_FILENAME = 'complexity-report.json';

/** @type {'classic' | 'modified'} ESLint complexity variant; see https://eslint.org/docs/latest/rules/complexity */
const DEFAULT_VARIANT = 'classic';

/**
 * Finds the project's ESLint config file (flat config).
 * ESLint 9+ looks for eslint.config.js, .mjs, .cjs in that order.
 * @param {string} projectRoot - Root directory of the project
 * @returns {string | null} Absolute path to config file, or null if not found
 */
export function findESLintConfig(projectRoot) {
  for (const name of CONFIG_NAMES) {
    const path = resolve(projectRoot, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/**
 * Reads the complexity rule variant from the config file.
 * Classic: each switch case +1; modified: whole switch +1.
 * Defaults to "classic" if not found.
 * See https://eslint.org/docs/latest/rules/complexity (option "variant").
 * @param {string} configPath - Absolute path to eslint.config.js
 * @returns {'classic' | 'modified'}
 */
export function getComplexityVariant(configPath) {
  try {
    const content = readFileSync(configPath, 'utf-8');
    if (/variant:\s*["']modified["']/.test(content)) return 'modified';
  } catch {
    // ignore
  }
  return DEFAULT_VARIANT;
}

/**
 * Runs ESLint using the project's config with complexity overridden to max: 0
 * so every function gets a complexity diagnostic. Writes the JSON report to
 * complexity/complexity-report.json (same mental model as Vitest coverage/).
 * @param {string} projectRoot - Root directory of the project
 * @returns {Promise<Array>} ESLint results as JSON array (same shape as --format=json)
 */
export async function runESLintComplexityCheck(projectRoot) {
  const configPath = findESLintConfig(projectRoot);
  if (!configPath) {
    const tried = CONFIG_NAMES.join(', ');
    console.error(
      `No ESLint flat config found. Tried: ${tried}. Add one at project root to run the complexity report.`
    );
    process.exit(1);
  }

  const complexityDir = resolve(projectRoot, COMPLEXITY_DIR);
  mkdirSync(complexityDir, { recursive: true });

  const reportPath = resolve(complexityDir, REPORT_FILENAME);
  const variant = getComplexityVariant(configPath);

  console.log('Running ESLint to collect complexity for all functions...');
  try {
    const eslint = new ESLint({
      cwd: projectRoot,
      overrideConfigFile: configPath,
      ignorePatterns: [
        '**/__tests__/**',
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}',
        // Avoid linting report output and common build/cache dirs (prevents apparent hang)
        'complexity/**',
        'dist/**',
        'build/**',
        '.angular/**',
        '**/coverage/**',
        'node_modules/**',
      ],
      overrideConfig: {
        rules: {
          complexity: ['warn', { max: 0, variant }],
        },
      },
    });

    const results = await eslint.lintFiles(['.']);

    const json = JSON.stringify(results, null, 0);
    writeFileSync(reportPath, json, 'utf-8');

    return results;
  } catch (error) {
    console.error('Error running ESLint:', error.message);
    process.exit(1);
  }
}
