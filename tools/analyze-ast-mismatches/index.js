/**
 * Analyzes complexity mismatches when using AST parser
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { runESLintComplexityCheck, findESLintConfig, getComplexityVariant } from '../../integration/eslint/index.js';
import { extractFunctionsFromESLintResults } from '../../function-extraction/index.js';
import { findFunctionBoundaries } from '../../function-boundaries/index.js';
import { parseDecisionPointsAST } from '../../decision-points/index.js';
import { calculateComplexityBreakdown } from '../../complexity-breakdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../..');

export async function analyzeASTMismatches() {
  console.log('🔍 Analyzing AST parser mismatches...\n');

  const eslintResults = await runESLintComplexityCheck(projectRoot);
  const configPath = findESLintConfig(projectRoot);
  const variant = configPath ? getComplexityVariant(configPath) : 'classic';

  const allFunctions = extractFunctionsFromESLintResults(eslintResults, projectRoot);

  const fileMap = new Map();
  allFunctions.forEach((func) => {
    if (!fileMap.has(func.file)) fileMap.set(func.file, []);
    fileMap.get(func.file).push(func);
  });

  const mismatches = [];
  let totalProcessed = 0;
  let totalMismatches = 0;

  for (const [filePath, functions] of fileMap.entries()) {
    try {
      const fullPath = resolve(projectRoot, filePath);
      const sourceCode = readFileSync(fullPath, 'utf-8');
      const fileBoundaries = findFunctionBoundaries(sourceCode, functions);
      const fileDecisionPoints = await parseDecisionPointsAST(
        sourceCode,
        fileBoundaries,
        functions,
        filePath,
        projectRoot,
        { variant }
      );

      functions.forEach((func) => {
        totalProcessed += 1;
        const breakdown = calculateComplexityBreakdown(
          func.line,
          fileDecisionPoints,
          1
        );
        const actualComplexity = parseInt(func.complexity, 10);
        const calculatedTotal = breakdown.calculatedTotal;
        const difference = calculatedTotal - actualComplexity;

        if (calculatedTotal !== actualComplexity) {
          totalMismatches += 1;
          const functionDecisionPoints = breakdown.decisionPoints || [];
          mismatches.push({
            functionName: func.functionName,
            file: func.file,
            line: func.line,
            actualComplexity,
            calculatedTotal,
            difference,
            decisionPointsFound: functionDecisionPoints.length,
            decisionPoints: functionDecisionPoints.map((dp) => ({
              type: dp.type,
              line: dp.line,
            })),
            boundary: fileBoundaries.get(func.line) || null,
          });
        }
      });
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
    }
  }

  mismatches.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  console.log(`\n📊 AST PARSER MISMATCH ANALYSIS\n`);
  console.log(`Total Functions Processed: ${totalProcessed}`);
  console.log(`Total Mismatches: ${totalMismatches} (${((totalMismatches / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`\nTop 20 Largest Mismatches:\n`);

  mismatches.slice(0, 20).forEach((m, idx) => {
    console.log(`${idx + 1}. ${m.functionName} (${m.file}:${m.line})`);
    console.log(`   ESLint: ${m.actualComplexity}, Calculated: ${m.calculatedTotal}, Difference: ${m.difference > 0 ? '+' : ''}${m.difference}`);
    console.log(`   Decision Points Found: ${m.decisionPointsFound}`);
    if (m.decisionPoints.length > 0) console.log(`   Types: ${m.decisionPoints.map((dp) => `${dp.type}@${dp.line}`).join(', ')}`);
    if (m.boundary) console.log(`   Boundary: lines ${m.boundary.start}-${m.boundary.end}`);
    console.log('');
  });

  const reportPath = resolve(projectRoot, 'ast-mismatch-report.json');
  writeFileSync(reportPath, JSON.stringify({
    summary: { totalProcessed, totalMismatches, accuracy: ((1 - totalMismatches / totalProcessed) * 100).toFixed(2) + '%' },
    mismatches,
  }, null, 2), 'utf-8');
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

analyzeASTMismatches().catch((error) => {
  console.error('Error analyzing AST mismatches:', error);
  process.exit(1);
});
