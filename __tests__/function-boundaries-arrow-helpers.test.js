/**
 * Statement coverage for function-boundaries/arrow-helpers.js
 */
import { describe, it, expect } from 'vitest';
import {
  checkJSXReturnClosingPattern,
  scanForJSXReturnClosingParens,
} from '../function-boundaries/arrow-helpers.js';

describe('function-boundaries/arrow-helpers', () => {
  describe('checkJSXReturnClosingPattern', () => {
    it('returns j+1 when nextChar is ")"', () => {
      expect(checkJSXReturnClosingPattern('))', 0, 0, ['))'])).toBe(1);
    });

    it('returns j+2 when nextChar is "}" and next line starts with ")"', () => {
      expect(checkJSXReturnClosingPattern(')}', 0, 0, [')}', ')'])).toBe(2);
    });

    it('returns null when nextChar is "}" but next line does not start with ")"', () => {
      expect(checkJSXReturnClosingPattern(')}', 0, 0, [')}', ''])).toBeNull();
    });
  });

  describe('scanForJSXReturnClosingParens', () => {
    it('returns end line when )} then ) on next line', () => {
      // One open paren from context, then line 1 has "  )}" so one ')' closes it; nextChar is '}' and line 2 is ")"
      const lines = ['  ', '  )}', ')'];
      const result = scanForJSXReturnClosingParens(lines, 0, lines[0], 0);
      expect(result).toBe(3);
    });
  });
});
