/**
 * Tests for AST-based decision point parsing
 */

import { describe, it, expect } from 'vitest';
import { parseDecisionPointsAST } from '../decision-points/index.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

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
  });
});
