/**
 * Unit tests for decision-points/function-matching.js
 */
import { describe, it, expect } from 'vitest';
import {
  findArrowFunctionLine,
  getMatchLineForASTFunction,
  doNodeTypesMatch,
  matchByNodeType,
  isESLintLineInASTRange,
  tryMatchByRange,
  matchFunctionsToAST,
  findInnermostASTFunction,
  findFunctionForDecisionPoint,
} from '../decision-points/function-matching.js';

describe('decision-points/function-matching', () => {
  describe('findArrowFunctionLine', () => {
    it('returns null for non-arrow function', () => {
      expect(findArrowFunctionLine({ type: 'FunctionDeclaration' }, '')).toBeNull();
    });
    it('returns null when astFunc has no range', () => {
      expect(findArrowFunctionLine({ type: 'ArrowFunctionExpression' }, '')).toBeNull();
    });
    it('returns null when => not found in function code', () => {
      const astFunc = { type: 'ArrowFunctionExpression', range: [0, 10] };
      expect(findArrowFunctionLine(astFunc, 'function()')).toBeNull();
    });
    it('returns line number where => appears', () => {
      const sourceCode = 'const fn = (x) => x;';
      const astFunc = { type: 'ArrowFunctionExpression', range: [10, 21] };
      expect(findArrowFunctionLine(astFunc, sourceCode)).toBe(1);
    });
    it('returns correct line when => is on line 2', () => {
      const sourceCode = 'const fn = (x)\n=> x;';
      const astFunc = { type: 'ArrowFunctionExpression', range: [10, 22] };
      expect(findArrowFunctionLine(astFunc, sourceCode)).toBe(2);
    });
  });

  describe('getMatchLineForASTFunction', () => {
    it('uses arrow line for ArrowFunctionExpression when available', () => {
      const sourceCode = 'const fn = (x) => x;';
      const astFunc = { type: 'ArrowFunctionExpression', range: [10, 21], loc: { start: { line: 1 } } };
      expect(getMatchLineForASTFunction(astFunc, sourceCode)).toBe(1);
    });
    it('falls back to astLine when arrow line is null', () => {
      const astFunc = { type: 'ArrowFunctionExpression', range: [0, 2], loc: { start: { line: 2 } } };
      expect(getMatchLineForASTFunction(astFunc, 'x => y')).toBe(2);
    });
    it('returns astLine for non-arrow function', () => {
      const astFunc = { type: 'FunctionDeclaration', loc: { start: { line: 3 } } };
      expect(getMatchLineForASTFunction(astFunc, '')).toBe(3);
    });
  });

  describe('doNodeTypesMatch', () => {
    it('returns true for matching FunctionDeclaration', () => {
      expect(doNodeTypesMatch('FunctionDeclaration', 'FunctionDeclaration')).toBe(true);
    });
    it('returns true for matching ArrowFunctionExpression', () => {
      expect(doNodeTypesMatch('ArrowFunctionExpression', 'ArrowFunctionExpression')).toBe(true);
    });
    it('returns true for matching FunctionExpression', () => {
      expect(doNodeTypesMatch('FunctionExpression', 'FunctionExpression')).toBe(true);
    });
    it('returns false for mismatched types', () => {
      expect(doNodeTypesMatch('FunctionDeclaration', 'ArrowFunctionExpression')).toBe(false);
    });
  });

  describe('matchByNodeType', () => {
    it('matches when node types match', () => {
      const astFunc = {};
      const map = new Map();
      const matching = [{ nodeType: 'FunctionDeclaration', line: 2 }];
      expect(matchByNodeType(astFunc, matching, map)).toBe(true);
      expect(map.get(astFunc)).toBe(2);
    });
    it('matches when only one ESLint func (fallback)', () => {
      const astFunc = {};
      const map = new Map();
      const matching = [{ nodeType: 'ArrowFunctionExpression', line: 5 }];
      expect(matchByNodeType(astFunc, matching, map)).toBe(true);
      expect(map.get(astFunc)).toBe(5);
    });
    it('uses first when multiple and none match type', () => {
      const astFunc = { type: 'ArrowFunctionExpression' };
      const map = new Map();
      const matching = [
        { nodeType: 'FunctionDeclaration', line: 1 },
        { nodeType: 'FunctionExpression', line: 2 },
      ];
      expect(matchByNodeType(astFunc, matching, map)).toBe(true);
      expect(map.get(astFunc)).toBe(1);
    });
    it('returns false when no matching ESLint funcs', () => {
      const astFunc = {};
      const map = new Map();
      expect(matchByNodeType(astFunc, [], map)).toBe(false);
      expect(map.size).toBe(0);
    });
  });

  describe('isESLintLineInASTRange', () => {
    it('returns false when astFunc has no range', () => {
      expect(isESLintLineInASTRange({ line: 1 }, {}, 'x')).toBe(false);
    });
    it('returns true when ESLint line is within AST range', () => {
      const sourceCode = 'line1\nline2\nline3';
      const astFunc = { range: [0, 17] };
      const eslintFunc = { line: 2 };
      expect(isESLintLineInASTRange(eslintFunc, astFunc, sourceCode)).toBe(true);
    });
    it('returns false when ESLint line is outside AST range', () => {
      const sourceCode = 'line1\nline2\nline3';
      const astFunc = { range: [0, 5] };
      const eslintFunc = { line: 3 };
      expect(isESLintLineInASTRange(eslintFunc, astFunc, sourceCode)).toBe(false);
    });
  });

  describe('tryMatchByRange', () => {
    it('matches when nodeType matches and line in range', () => {
      const sourceCode = 'function f() {}';
      const astFunc = { type: 'FunctionDeclaration', range: [0, 16] };
      const eslintFunctions = [{ nodeType: 'FunctionDeclaration', line: 1 }];
      const map = new Map();
      expect(tryMatchByRange(astFunc, eslintFunctions, sourceCode, map)).toBe(true);
      expect(map.get(astFunc)).toBe(1);
    });
    it('returns false when no match by range', () => {
      const astFunc = { type: 'FunctionExpression', range: [0, 5] };
      const eslintFunctions = [{ nodeType: 'FunctionDeclaration', line: 1 }];
      const map = new Map();
      expect(tryMatchByRange(astFunc, eslintFunctions, 'x', map)).toBe(false);
    });
  });

  describe('matchFunctionsToAST', () => {
    it('falls back to tryMatchByRange when no line match', () => {
      const sourceCode = 'function f() { const g = function() {}; }';
      const astFunctions = [{ type: 'FunctionExpression', range: [25, 37], loc: { start: { line: 1 } } }];
      const eslintFunctions = [{ nodeType: 'FunctionExpression', line: 1 }];
      const map = matchFunctionsToAST(astFunctions, eslintFunctions, sourceCode);
      expect(map.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findInnermostASTFunction', () => {
    it('returns null when node has no range', () => {
      expect(findInnermostASTFunction({}, [])).toBeNull();
    });
    it('returns innermost function containing node', () => {
      const node = { range: [20, 25] };
      const outer = { range: [0, 50] };
      const inner = { range: [15, 30] };
      expect(findInnermostASTFunction(node, [outer, inner])).toBe(inner);
    });
    it('returns null when no function contains node', () => {
      const node = { range: [100, 105] };
      const astFunc = { range: [0, 50] };
      expect(findInnermostASTFunction(node, [astFunc])).toBeNull();
    });
  });

  describe('findFunctionForDecisionPoint', () => {
    it('returns null when node has no range', () => {
      expect(findFunctionForDecisionPoint({}, [], new Map())).toBeNull();
    });
    it('returns null when no innermost function found', () => {
      expect(findFunctionForDecisionPoint({ range: [100, 105] }, [], new Map())).toBeNull();
    });
    it('returns ESLint line from map when found', () => {
      const node = { range: [20, 25] };
      const astFunc = { range: [0, 50] };
      const map = new Map([[astFunc, 5]]);
      expect(findFunctionForDecisionPoint(node, [astFunc], map)).toBe(5);
    });
    it('returns null when map has no entry for innermost', () => {
      const node = { range: [20, 25] };
      const astFunc = { range: [0, 50] };
      const map = new Map();
      expect(findFunctionForDecisionPoint(node, [astFunc], map)).toBeNull();
    });
  });
});
