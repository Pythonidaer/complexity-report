/**
 * Unit tests for html-generators/file-boundary-builders.js
 */
import { describe, it, expect } from 'vitest';
import { buildLineToSpan } from '../html-generators/file-boundary-builders.js';

describe('html-generators/file-boundary-builders', () => {
  describe('buildLineToSpan', () => {
    it('skips lines not contained in any boundary', () => {
      const boundaries = new Map([
        [1, { start: 1, end: 3 }],
      ]);
      const sourceLines = ['line1', 'line2', 'line3', 'line4', 'line5'];
      const result = buildLineToSpan(boundaries, 5, sourceLines);
      expect(result[1]).toBeDefined();
      expect(result[2]).toBeDefined();
      expect(result[3]).toBeDefined();
      expect(result[4]).toBeUndefined();
      expect(result[5]).toBeUndefined();
    });

    it('picks innermost boundary when multiple contain the line', () => {
      const boundaries = new Map([
        [1, { start: 1, end: 10 }],
        [3, { start: 3, end: 5 }],
      ]);
      const sourceLines = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      const result = buildLineToSpan(boundaries, 10, sourceLines);
      expect(result[4]).toEqual({ start: 3, end: 5, indent: 0 });
    });

    it('uses indent 0 when start line is not a string', () => {
      const boundaries = new Map([
        [1, { start: 1, end: 2 }],
      ]);
      const sourceLines = [];
      const result = buildLineToSpan(boundaries, 2, sourceLines);
      expect(result[1]).toEqual({ start: 1, end: 2, indent: 0 });
    });
  });
});
