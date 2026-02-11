/**
 * Tests for AST-based decision point parsing
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseDecisionPointsAST } from '../decision-points/index.js';
import { calculateComplexityBreakdown } from '../complexity-breakdown.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const fixturesDir = resolve(__dirname, 'fixtures');

describe('decision-points-ast', () => {
  describe('parseDecisionPointsAST', () => {
    it('should parse simple if statement', async () => {
      const sourceCode = `
function test() {
  if (x > 0) {
    return 1;
  }
  return 0;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 7 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      expect(decisionPoints.length).toBeGreaterThan(0);
      const ifPoint = decisionPoints.find(dp => dp.type === 'if');
      expect(ifPoint).toBeDefined();
      expect(ifPoint.functionLine).toBe(2);
    });

    it('should parse else if as else if not if', async () => {
      const sourceCode = `
function test() {
  if (items.length === 0) return 0;
  else if (items.length === 1) return 1;
  return -1;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 6 });
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      const ifPoints = decisionPoints.filter(dp => dp.type === 'if');
      const elseIfPoints = decisionPoints.filter(dp => dp.type === 'else if');
      expect(ifPoints.length).toBe(1);
      expect(elseIfPoints.length).toBe(1);
    });
    
    it('should parse ternary operator', async () => {
      const sourceCode = `
function test() {
  return x > 0 ? 1 : 0;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 4 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const ternaryPoint = decisionPoints.find(dp => dp.type === 'ternary');
      expect(ternaryPoint).toBeDefined();
      expect(ternaryPoint.functionLine).toBe(2);
    });
    
    it('should parse logical operators', async () => {
      const sourceCode = `
function test() {
  if (x > 0 && y < 10) {
    return 1;
  }
  return 0;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 7 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const ifPoint = decisionPoints.find(dp => dp.type === 'if');
      expect(ifPoint).toBeDefined();
      
      const andPoints = decisionPoints.filter(dp => dp.type === '&&');
      expect(andPoints.length).toBeGreaterThan(0);
    });

    it('should parse switch in classic variant: case counts, default does not (matches ESLint)', async () => {
      const sourceCode = `
function test(x) {
  switch (x) {
    case 0: return 0;
    case 1: return 1;
    default: return -1;
  }
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 8 });
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      const casePoints = decisionPoints.filter(dp => dp.type === 'case');
      const defaultPoints = decisionPoints.filter(dp => dp.type === 'default');
      expect(casePoints.length).toBe(2);
      expect(defaultPoints.length).toBe(0);
    });
    
    it('should parse default parameters', async () => {
      const sourceCode = `
function test(x = 10, y = 20) {
  return x + y;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 4 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const defaultParams = decisionPoints.filter(dp => dp.type === 'default parameter');
      expect(defaultParams.length).toBe(2); // x = 10 and y = 20
    });
    
    it('should assign decision points to nested functions', async () => {
      const sourceCode = `
function outer() {
  function inner() {
    if (x > 0) {
      return 1;
    }
  }
  return 0;
}
`;
      const functions = [
        { line: 2, functionName: 'outer', nodeType: 'FunctionDeclaration' },
        { line: 3, functionName: 'inner', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 9 });
      boundaries.set(3, { start: 3, end: 7 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const ifPoint = decisionPoints.find(dp => dp.type === 'if');
      expect(ifPoint).toBeDefined();
      // The if statement should be assigned to inner, not outer
      expect(ifPoint.functionLine).toBe(3);
    });
    
    it('should parse default parameters in destructured function parameters', async () => {
      const sourceCode = `
function test({ x = 10, y = 20, z = 30 }) {
  return x + y + z;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 4 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const defaultParams = decisionPoints.filter(dp => dp.type === 'default parameter');
      // Note: Default parameters in destructured function parameters should be detected
      expect(defaultParams.length).toBeGreaterThanOrEqual(3); // x = 10, y = 20, z = 30
      defaultParams.forEach(dp => {
        expect(dp.functionLine).toBe(2);
      });
    });
    
    it('should parse nullish coalescing operators (??)', async () => {
      const sourceCode = `
function test() {
  return {
    x: a ?? b,
    y: c ?? d ?? e
  };
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 7 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const nullishOps = decisionPoints.filter(dp => dp.type === '??');
      expect(nullishOps.length).toBe(3); // a ?? b, c ?? d, d ?? e
      nullishOps.forEach(dp => {
        expect(dp.functionLine).toBe(2);
      });
    });
    
    it('should parse arrow functions with if statements', async () => {
      const sourceCode = `
function outer() {
  const inner = () => {
    if (x > 0) {
      return 1;
    }
    return 0;
  };
  return inner();
}
`;
      const functions = [
        { line: 2, functionName: 'outer', nodeType: 'FunctionDeclaration' },
        { line: 3, functionName: 'outer (arrow function)', nodeType: 'ArrowFunctionExpression' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 10 });
      boundaries.set(3, { start: 3, end: 8 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const ifPoint = decisionPoints.find(dp => dp.type === 'if');
      expect(ifPoint).toBeDefined();
      // The if statement should be assigned to the arrow function, not outer
      expect(ifPoint.functionLine).toBe(3);
    });
    
    it('should parse optional chaining operators (?.)', async () => {
      const sourceCode = `
function test() {
  return obj?.prop?.nested?.value;
}
`;
      const functions = [
        { line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }
      ];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 4 });
      
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.ts',
        projectRoot
      );
      
      const optionalChaining = decisionPoints.filter(dp => dp.type === '?.');
      // Note: obj?.prop?.nested?.value has 3 ?. operators, but AST might represent them differently
      expect(optionalChaining.length).toBeGreaterThanOrEqual(3);
      optionalChaining.forEach(dp => {
        expect(dp.functionLine).toBe(2);
      });
    });

    it('should parse with .tsx file path (jsx option enabled)', async () => {
      const sourceCode = `
function Test() {
  if (x) return <div />;
  return null;
}
`;
      const functions = [{ line: 2, functionName: 'Test', nodeType: 'FunctionDeclaration' }];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 5 });
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'Component.tsx',
        projectRoot
      );
      const ifPoint = decisionPoints.find(dp => dp.type === 'if');
      expect(ifPoint).toBeDefined();
    });

    it('should return empty array when parseAST returns null (invalid syntax)', async () => {
      const decisionPoints = await parseDecisionPointsAST(
        '{{{ invalid',
        new Map(),
        [{ line: 1, functionName: 'x', nodeType: 'FunctionDeclaration' }],
        'bad.js',
        projectRoot
      );
      expect(decisionPoints).toEqual([]);
    });

    it('should return empty array when no functions match AST (astToEslintMap size 0)', async () => {
      const sourceCode = `
function real() {
  if (x) return 1;
  return 0;
}
`;
      const functions = [{ line: 99, functionName: 'other', nodeType: 'FunctionDeclaration' }];
      const boundaries = new Map();
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.js',
        projectRoot
      );
      expect(decisionPoints).toEqual([]);
    });

    it('should return empty array when functions array is empty (astToEslintMap size 0)', async () => {
      const sourceCode = `
function real() {
  if (x) return 1;
  return 0;
}
`;
      const boundaries = new Map();
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        [],
        'test.js',
        projectRoot
      );
      expect(decisionPoints).toEqual([]);
    });

    it('should use variant modified and include SwitchStatement not SwitchCase', async () => {
      const sourceCode = `
function test() {
  switch (x) {
    case 1: return 1;
    case 2: return 2;
    default: return 0;
  }
}
`;
      const functions = [{ line: 2, functionName: 'test', nodeType: 'FunctionDeclaration' }];
      const boundaries = new Map();
      boundaries.set(2, { start: 2, end: 10 });
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'test.js',
        projectRoot,
        { variant: 'modified' }
      );
      const switchPoints = decisionPoints.filter(dp => dp.type === 'switch');
      const casePoints = decisionPoints.filter(dp => dp.type === 'case');
      expect(switchPoints.length).toBe(1);
      expect(casePoints.length).toBe(0);
    });

    it('should parse decision-point-test.service.ts fixture and match expected breakdown', async () => {
      const fixturePath = resolve(fixturesDir, 'decision-point-test.service.ts');
      const sourceCode = readFileSync(fixturePath, 'utf-8');
      const functions = [
        { line: 11, functionName: 'runAllDecisionPoints', nodeType: 'MethodDefinition' }
      ];
      const boundaries = new Map();
      boundaries.set(11, { start: 11, end: 55 });
      const decisionPoints = await parseDecisionPointsAST(
        sourceCode,
        boundaries,
        functions,
        'decision-point-test.service.ts',
        projectRoot
      );
      const breakdown = calculateComplexityBreakdown(11, decisionPoints, 1);
      expect(breakdown.breakdown['if']).toBe(1);
      expect(breakdown.breakdown['else if']).toBe(1);
      expect(breakdown.breakdown['for']).toBe(1);
      expect(breakdown.breakdown['for...of']).toBe(1);
      expect(breakdown.breakdown['for...in']).toBe(1);
      expect(breakdown.breakdown['while']).toBe(1);
      expect(breakdown.breakdown['do...while']).toBe(1);
      expect(breakdown.breakdown['case']).toBe(2);
      expect(breakdown.breakdown['catch']).toBe(1);
      expect(breakdown.breakdown['ternary']).toBe(1);
      expect(breakdown.breakdown['&&']).toBe(1);
      expect(breakdown.breakdown['default parameter']).toBe(2);
      expect(breakdown.breakdown['??']).toBeGreaterThanOrEqual(1);
      expect(breakdown.breakdown['?.']).toBeGreaterThanOrEqual(1);
      expect(breakdown.calculatedTotal).toBeGreaterThanOrEqual(17);
    });
  });
});
