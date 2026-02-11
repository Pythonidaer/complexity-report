/**
 * Coverage for function-boundaries/arrow-brace-body.js
 */
import { describe, it, expect } from 'vitest';
import {
  handleBraceOnSameLine,
  handleNoBraceOnSameLine,
  findArrowFunctionEnd,
} from '../function-boundaries/arrow-brace-body.js';

describe('function-boundaries/arrow-brace-body', () => {
  describe('handleBraceOnSameLine', () => {
    it('returns single-line brace body result when isSingleLineBraceBody matches (e.g. });)', () => {
      const lines = ['  types.forEach((t) => { sum += t; });'];
      const boundaries = new Map();
      const result = handleBraceOnSameLine(
        lines,
        0,
        lines[0].indexOf('=>'),
        1,
        boundaries,
        lines[0]
      );
      expect(result).not.toBeNull();
      expect(result.end).toBe(1);
      expect(result.arrowFunctionEndSet).toBe(true);
      expect(boundaries.get(1)).toEqual({ start: 1, end: 1 });
    });

    it('returns single-line brace body when body ends with };', () => {
      const lines = ['const fn = () => { return 1; };'];
      const boundaries = new Map();
      const result = handleBraceOnSameLine(
        lines,
        0,
        lines[0].indexOf('=>'),
        1,
        boundaries,
        lines[0]
      );
      expect(result).not.toBeNull();
      expect(result.end).toBe(1);
    });
  });

  describe('handleNoBraceOnSameLine', () => {
    it('returns inFunctionBody when next line starts with {', () => {
      const lines = ['const fn = () =>', '  {', '    return 1;', '  };'];
      const boundaries = new Map();
      const result = handleNoBraceOnSameLine(
        lines,
        0,
        lines[0].indexOf('=>'),
        1,
        boundaries
      );
      expect(result.arrowFunctionHandled).toBe(true);
      expect(result.arrowFunctionEndSet).toBe(false);
      expect(result.inFunctionBody).toBe(true);
      expect(result.braceCount).toBe(1);
    });

    it('returns found when singleExprResult.found (single expression)', () => {
      const lines = ['const fn = () => value;'];
      const boundaries = new Map();
      const result = handleNoBraceOnSameLine(
        lines,
        0,
        lines[0].indexOf('=>'),
        1,
        boundaries
      );
      expect(result.found).toBe(true);
      expect(boundaries.get(1)).toBeDefined();
    });

    it('exercises path when next line does not start with brace', () => {
      const lines = ['const fn = () =>', '  someCall('];
      const boundaries = new Map();
      const result = handleNoBraceOnSameLine(
        lines,
        0,
        lines[0].indexOf('=>'),
        1,
        boundaries
      );
      expect(result).toBeDefined();
      expect(typeof result.found).toBe('boolean');
    });
  });

  describe('findArrowFunctionEnd', () => {
    it('returns default when no line contains =>', () => {
      const lines = ['function foo() {', '  return 1;', '}'];
      const boundaries = new Map();
      const result = findArrowFunctionEnd(lines, 1, 1, boundaries);
      expect(result.found).toBe(false);
      expect(result.arrowFunctionHandled).toBe(false);
      expect(result.end).toBe(1);
    });
  });
});
