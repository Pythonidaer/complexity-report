/**
 * Unit tests for html-generators/file-data.js
 */
import { describe, it, expect } from 'vitest';
import {
  createLineToFunctionMap,
  createDecisionPointLineMap,
} from '../html-generators/file-data.js';

describe('html-generators/file-data', () => {
  describe('createLineToFunctionMap', () => {
    it('creates map from functions array', () => {
      const functions = [
        { line: 5, functionName: 'foo', complexity: 1 },
        { line: 10, functionName: 'bar', complexity: 2 },
      ];
      const map = createLineToFunctionMap(functions);
      expect(map.get(5)).toEqual(functions[0]);
      expect(map.get(10)).toEqual(functions[1]);
    });
    it('returns empty map for empty array', () => {
      const map = createLineToFunctionMap([]);
      expect(map.size).toBe(0);
    });
  });

  describe('createDecisionPointLineMap', () => {
    it('creates map for simple decision points', () => {
      const decisionPoints = [
        { type: 'if', line: 5, functionLine: 3, name: null },
        { type: 'ternary', line: 7, functionLine: 3, name: null },
      ];
      const map = createDecisionPointLineMap(decisionPoints);
      expect(map.get(5)).toHaveLength(1);
      expect(map.get(5)[0].type).toBe('if');
      expect(map.get(7)).toHaveLength(1);
      expect(map.get(7)[0].type).toBe('ternary');
    });
    it('expands multi-line DPs (dp.lines) into per-line entries', () => {
      const decisionPoints = [
        {
          type: 'ternary',
          line: 5,
          functionLine: 3,
          name: null,
          lines: [
            { line: 5, column: 2, endColumn: 10 },
            { line: 6, column: 0, endColumn: 5 },
          ],
        },
      ];
      const map = createDecisionPointLineMap(decisionPoints);
      expect(map.get(5)).toHaveLength(1);
      expect(map.get(5)[0].column).toBe(2);
      expect(map.get(5)[0].endColumn).toBe(10);
      expect(map.get(6)).toHaveLength(1);
      expect(map.get(6)[0].column).toBe(0);
      expect(map.get(6)[0].endColumn).toBe(5);
    });
    it('appends to existing line when multiple DPs on same line', () => {
      const decisionPoints = [
        { type: 'if', line: 5, functionLine: 3 },
        { type: '&&', line: 5, functionLine: 3 },
      ];
      const map = createDecisionPointLineMap(decisionPoints);
      expect(map.get(5)).toHaveLength(2);
    });
  });
});
