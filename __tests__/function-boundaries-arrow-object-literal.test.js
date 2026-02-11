/**
 * Unit tests for function-boundaries/arrow-object-literal.js
 */
import { describe, it, expect } from 'vitest';
import {
  isObjectLiteralPattern,
  findObjectLiteralClosingParen,
  findArrowFunctionEndObjectLiteral,
} from '../function-boundaries/arrow-object-literal.js';

describe('function-boundaries/arrow-object-literal', () => {
  describe('isObjectLiteralPattern', () => {
    it('returns false when braceIndex is -1', () => {
      expect(isObjectLiteralPattern('x => y', 2, -1)).toBe(false);
    });
    it('returns true when between arrow and brace matches ( paren', () => {
      expect(isObjectLiteralPattern('x => ({ a: 1 })', 2, 6)).toBe(true);
    });
    it('returns false when between has other content and no leading (', () => {
      expect(isObjectLiteralPattern('x =>  { a: 1 }', 2, 5)).toBe(false);
    });
  });

  describe('findObjectLiteralClosingParen', () => {
    it('returns true when closing paren followed by ;', () => {
      expect(findObjectLiteralClosingParen('({ a: 1 });', 0)).toBe(true);
    });
    it('returns true when closing paren followed by )', () => {
      expect(findObjectLiteralClosingParen('({ a: 1 })', 0)).toBe(true);
    });
    it('returns true when rest of line is empty after )', () => {
      expect(findObjectLiteralClosingParen('({ a: 1 })', 0)).toBe(true);
    });
    it('returns false when parens do not balance on line', () => {
      expect(findObjectLiteralClosingParen('({ a: 1 ', 0)).toBe(false);
    });
  });

  describe('findArrowFunctionEndObjectLiteral', () => {
    it('returns found: false when not object literal pattern', () => {
      const lines = ['x => 5'];
      const result = findArrowFunctionEndObjectLiteral(lines, 0, 2, -1, 1);
      expect(result.found).toBe(false);
    });
    it('returns found: true when object literal on single line', () => {
      const lines = ['const fn = () => ({ a: 1 });'];
      const arrowIndex = lines[0].indexOf('=>');
      const braceIndex = lines[0].indexOf('{', arrowIndex);
      const result = findArrowFunctionEndObjectLiteral(lines, 0, arrowIndex, braceIndex, 1);
      expect(result.found).toBe(true);
    });
  });
});
