/**
 * Statement coverage for function-boundaries/arrow-jsx.js
 */
import { describe, it, expect } from 'vitest';
import { findArrowFunctionEndJSXReturn } from '../function-boundaries/arrow-jsx.js';

describe('function-boundaries/arrow-jsx', () => {
  describe('findArrowFunctionEndJSXReturn', () => {
    it('returns found: false when arrow body does not start with ( (e.g. => <div />)', () => {
      const lines = ['const Comp = () => <div />;'];
      const arrowIndex = lines[0].indexOf('=>');
      const result = findArrowFunctionEndJSXReturn(lines, 0, arrowIndex, 1);
      expect(result.found).toBe(false);
      expect(result.end).toBe(1);
    });
  });
});
