import { readFileSync } from 'fs';
import { findESLintConfig } from '../eslint/index.js';

/**
 * Reads the complexity threshold from the project's ESLint config file
 * (eslint.config.js, .mjs, or .cjs). Returns the maximum threshold value
 * found (different file types can have different thresholds).
 * @param {string} projectRoot - Root directory of the project
 * @returns {number} Maximum complexity threshold value
 */
export function getComplexityThreshold(projectRoot) {
  const configPath = findESLintConfig(projectRoot);
  if (!configPath) {
    console.warn('No ESLint config found, defaulting complexity threshold to 10');
    return 10;
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');

    // Extract all complexity max values using regex
    // Pattern: complexity: ["warn" | 'warn', { max: <number>, ... }] — accept single or double quotes
    const complexityMatches = configContent.match(/complexity:\s*\[["'](?:warn|error)["'],\s*\{\s*max:\s*(\d+)/g);

    if (!complexityMatches || complexityMatches.length === 0) {
      console.warn('Could not find complexity threshold in config, defaulting to 10');
      return 10;
    }

    // Extract all max values
    const maxValues = complexityMatches.map((match) => {
      const valueMatch = match.match(/max:\s*(\d+)/);
      return valueMatch ? parseInt(valueMatch[1], 10) : null;
    }).filter((val) => val !== null);

    if (maxValues.length === 0) {
      console.warn('Could not parse complexity threshold values, defaulting to 10');
      return 10;
    }

    // Return the maximum threshold value (to be safe, use the highest)
    return Math.max(...maxValues);
  } catch (error) {
    console.warn(`Error reading ESLint config: ${error.message}, defaulting to 10`);
    return 10;
  }
}
