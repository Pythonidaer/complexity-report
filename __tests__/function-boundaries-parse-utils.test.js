/**
 * Unit tests for function-boundaries/parse-utils.js (branch coverage)
 */
import { describe, it, expect } from 'vitest';
import {
  handleEscapeSequence,
  isSingleLineCommentStart,
  isMultiLineCommentStart,
  isMultiLineCommentEnd,
  handleComments,
  handleStringLiterals,
  isRegexStart,
  couldBeRegexStart,
  couldBeRegexEnd,
  handleRegexDetection,
  createBracesResult,
  processEscapeSequence,
  processCommentHandling,
  processStringLiteralHandling,
  processCharacterForBraces,
} from '../function-boundaries/parse-utils.js';

describe('function-boundaries/parse-utils', () => {
  describe('handleEscapeSequence', () => {
    it('returns escapeNext true when escapeNext was true', () => {
      const r = handleEscapeSequence('x', true, true);
      expect(r.escapeNext).toBe(false);
      expect(r.shouldContinue).toBe(true);
    });
    it('returns escapeNext when backslash in string', () => {
      const r = handleEscapeSequence('\\', true, false);
      expect(r.escapeNext).toBe(true);
      expect(r.shouldContinue).toBe(true);
    });
    it('returns shouldContinue false when not escape', () => {
      const r = handleEscapeSequence('a', false, false);
      expect(r.shouldContinue).toBe(false);
    });
  });

  describe('isMultiLineCommentEnd', () => {
    it('returns true when * / and in multi-line comment', () => {
      expect(isMultiLineCommentEnd('*', '/', true)).toBe(true);
    });
    it('returns false when not in multi-line comment', () => {
      expect(isMultiLineCommentEnd('*', '/', false)).toBe(false);
    });
  });

  describe('handleComments', () => {
    it('returns single-line comment start', () => {
      const r = handleComments('/', '/', false, false, false, false);
      expect(r.inSingleLineComment).toBe(true);
      expect(r.shouldBreak).toBe(true);
    });
    it('returns multi-line comment start', () => {
      const r = handleComments('/', '*', false, false, false, false);
      expect(r.inMultiLineComment).toBe(true);
      expect(r.shouldContinue).toBe(true);
      expect(r.skipNext).toBe(true);
    });
    it('returns multi-line comment end', () => {
      const r = handleComments('*', '/', false, false, false, true);
      expect(r.inMultiLineComment).toBe(false);
      expect(r.shouldContinue).toBe(true);
      expect(r.skipNext).toBe(true);
    });
    it('returns in-comment continue when in single-line comment', () => {
      const r = handleComments('x', 'y', false, false, true, false);
      expect(r.shouldContinue).toBe(true);
      expect(r.inSingleLineComment).toBe(true);
    });
    it('returns in-comment continue when in multi-line comment', () => {
      const r = handleComments('x', 'y', false, false, false, true);
      expect(r.shouldContinue).toBe(true);
      expect(r.inMultiLineComment).toBe(true);
    });
    it('returns default when no comment state', () => {
      const r = handleComments('a', 'b', false, false, false, false);
      expect(r.shouldBreak).toBe(false);
      expect(r.shouldContinue).toBe(false);
      expect(r.skipNext).toBe(false);
    });
  });

  describe('handleStringLiterals', () => {
    it('enters string on double quote when not in regex', () => {
      const r = handleStringLiterals('"', false, false, null);
      expect(r.inString).toBe(true);
      expect(r.stringChar).toBe('"');
    });
    it('exits string when quote matches stringChar', () => {
      const r = handleStringLiterals("'", false, true, "'");
      expect(r.inString).toBe(false);
      expect(r.stringChar).toBe(null);
    });
    it('returns unchanged when in regex', () => {
      const r = handleStringLiterals('"', true, false, null);
      expect(r.inString).toBe(false);
    });
    it('returns unchanged when not quote', () => {
      const r = handleStringLiterals('x', false, false, null);
      expect(r.inString).toBe(false);
    });
  });

  describe('isRegexStart', () => {
    it('returns true when beforeSlash is empty', () => {
      expect(isRegexStart('  /g', 2, ' ')).toBe(true);
    });
    it('returns true when beforeSlash ends with =', () => {
      expect(isRegexStart('x = /g', 4, ' ')).toBe(true);
    });
    it('returns true when beforeSlash ends with (', () => {
      expect(isRegexStart('f(/g', 2, ' ')).toBe(true);
    });
    it('returns true when beforeSlash ends with [', () => {
      expect(isRegexStart(' [ /x', 3, ' ')).toBe(true);
    });
    it('returns true when beforeSlash ends with ,', () => {
      expect(isRegexStart('a, /g', 3, ' ')).toBe(true);
    });
    it('returns true when beforeSlash is only whitespace', () => {
      expect(isRegexStart('   /g', 3, ' ')).toBe(true);
    });
  });

  describe('couldBeRegexStart', () => {
    it('returns true when / and prev not / or * and not in regex/string', () => {
      expect(couldBeRegexStart('/', ' ', false, false)).toBe(true);
    });
    it('returns false when prevChar is /', () => {
      expect(couldBeRegexStart('/', '/', false, false)).toBe(false);
    });
  });

  describe('couldBeRegexEnd', () => {
    it('returns true when / and inRegex and next not / or *', () => {
      expect(couldBeRegexEnd('/', 'g', true)).toBe(true);
    });
  });

  describe('handleRegexDetection', () => {
    it('returns true when regex start detected', () => {
      expect(handleRegexDetection('/', ' ', 'g', ' /g', 1, false, false)).toBe(true);
    });
    it('returns false when regex end detected', () => {
      expect(handleRegexDetection('/', 'g', ' ', 'g/ ', 2, true, false)).toBe(false);
    });
    it('returns inRegex when no change', () => {
      expect(handleRegexDetection('a', 'b', 'c', 'line', 0, false, false)).toBe(false);
    });
  });

  describe('createBracesResult', () => {
    it('returns object with merged state', () => {
      const r = createBracesResult(1, 0, { a: 1 }, { b: 2 }, true, false, false);
      expect(r.openBraces).toBe(1);
      expect(r.closeBraces).toBe(0);
      expect(r.state).toEqual({ a: 1, b: 2 });
      expect(r.shouldBreak).toBe(true);
      expect(r.shouldContinue).toBe(false);
    });
  });

  describe('processEscapeSequence', () => {
    it('returns result when shouldContinue (escape next)', () => {
      const state = { inString: true };
      const r = processEscapeSequence('x', true, true, state, 0, 0);
      expect(r.result).toBeTruthy();
      expect(r.result.shouldContinue).toBe(true);
      expect(r.escapeNext).toBe(false);
    });
    it('returns result when backslash in string', () => {
      const state = {};
      const r = processEscapeSequence('\\', true, false, state, 0, 0);
      expect(r.result).toBeTruthy();
      expect(r.escapeNext).toBe(true);
    });
  });

  describe('processCommentHandling', () => {
    const state = {};
    const openBraces = 0;
    const closeBraces = 0;
    it('returns result with shouldBreak when single-line start', () => {
      const r = processCommentHandling('/', '/', false, false, false, false, false, state, openBraces, closeBraces);
      expect(r.result).toBeTruthy();
      expect(r.result.shouldBreak).toBe(true);
    });
    it('returns result with shouldContinue when multi-line start', () => {
      const r = processCommentHandling('/', '*', false, false, false, false, false, state, openBraces, closeBraces);
      expect(r.result).toBeTruthy();
      expect(r.result.shouldContinue).toBe(true);
      expect(r.result.skipNext).toBe(true);
    });
    it('returns result with shouldContinue when multi-line end', () => {
      const r = processCommentHandling('*', '/', false, false, false, true, false, state, openBraces, closeBraces);
      expect(r.result).toBeTruthy();
      expect(r.inMultiLineComment).toBe(false);
    });
    it('returns result with shouldContinue when in comment', () => {
      const r = processCommentHandling('x', 'y', false, false, true, false, false, state, openBraces, closeBraces);
      expect(r.result).toBeTruthy();
      expect(r.result.shouldContinue).toBe(true);
    });
    it('returns null result when no comment state change', () => {
      const r = processCommentHandling('a', 'b', false, false, false, false, false, state, openBraces, closeBraces);
      expect(r.result).toBe(null);
    });
  });

  describe('processStringLiteralHandling', () => {
    const state = {};
    it('returns result when string state changes (enter)', () => {
      const r = processStringLiteralHandling('"', false, false, null, false, state, 0, 0);
      expect(r.result).toBeTruthy();
      expect(r.inString).toBe(true);
      expect(r.stringChar).toBe('"');
    });
    it('returns null when no change', () => {
      const r = processStringLiteralHandling('x', false, false, null, false, state, 0, 0);
      expect(r.result).toBe(null);
    });
  });

  describe('processCharacterForBraces', () => {
    it('returns result when regex state changes (enter regex)', () => {
      const line = ' /g';
      const state = { inRegex: false, inString: false, inSingleLineComment: false, inMultiLineComment: false, stringChar: null, escapeNext: false };
      const r = processCharacterForBraces('/', ' ', 'g', line, 1, state, 0, 0);
      expect(r).toBeTruthy();
      expect(r.shouldContinue).toBe(true);
      expect(r.state.inRegex).toBe(true);
    });
    it('increments openBraces when { and not in regex/string', () => {
      const state = { inRegex: false, inString: false, inSingleLineComment: false, inMultiLineComment: false, stringChar: null, escapeNext: false };
      const r = processCharacterForBraces('{', ' ', ' ', ' { ', 1, state, 0, 0);
      expect(r.openBraces).toBe(1);
    });
    it('increments closeBraces when } and not in regex/string', () => {
      const state = { inRegex: false, inString: false, inSingleLineComment: false, inMultiLineComment: false, stringChar: null, escapeNext: false };
      const r = processCharacterForBraces('}', ' ', ' ', ' } ', 1, state, 0, 0);
      expect(r.closeBraces).toBe(1);
    });
  });
});
