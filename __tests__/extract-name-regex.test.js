/**
 * Unit tests for function-extraction/extract-name-regex.js (function coverage)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  findMethodCallCallback,
  findFunctionCallCallback,
  findParentFunctionWithFallback,
  formatCallbackName,
  handleArrowFunctionFinalFallback,
  tryFindCallbackFromCurrentLine,
  handleArrowFunctionExpression,
} from '../function-extraction/extract-name-regex.js';

describe('function-extraction/extract-name-regex', () => {
  const projectRoot = '/project';
  const noopGetFunctionNameForLine = () => null;

  describe('findMethodCallCallback', () => {
    it('returns formatted name when beforeArrow matches .method(', () => {
      const lines = ['function parentFn() {', '  items.forEach(x =>'];
      const result = findMethodCallCallback(
        '  items.forEach(',
        '/project/src/file.js',
        2,
        projectRoot,
        lines,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('parentFn (forEach)');
    });

    it('returns null when beforeArrow has no method call', () => {
      const result = findMethodCallCallback(
        '  something',
        '/project/src/file.js',
        1,
        projectRoot,
        ['const x = 1'],
        noopGetFunctionNameForLine
      );
      expect(result).toBeNull();
    });
  });

  describe('findFunctionCallCallback', () => {
    it('returns formatted name when beforeArrow matches functionCall pattern', () => {
      const lines = ['function wrapper() {', '  runCallback(item =>'];
      const result = findFunctionCallCallback(
        '  runCallback(',
        '/project/src/file.js',
        2,
        projectRoot,
        lines,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('wrapper (runCallback)');
    });

    it('returns null when beforeArrow is "if ("', () => {
      const result = findFunctionCallCallback(
        '  if (',
        '/project/src/file.js',
        1,
        projectRoot,
        [],
        noopGetFunctionNameForLine
      );
      expect(result).toBeNull();
    });
  });

  describe('tryFindCallbackFromCurrentLine (method then function path)', () => {
    it('uses findMethodCallCallback when current line has .method( ... =>', () => {
      const lines = ['function myFunc() {', '  arr.map(x => x + 1);'];
      const result = tryFindCallbackFromCurrentLine(
        '  arr.map(x => x + 1);',
        '/project/src/file.js',
        2,
        projectRoot,
        lines,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('myFunc (map)');
    });

    it('uses findFunctionCallCallback when current line has func( ... => and no method', () => {
      const lines = ['function outer() {', '  processItem(x => x);'];
      const result = tryFindCallbackFromCurrentLine(
        '  processItem(x => x);',
        '/project/src/file.js',
        2,
        projectRoot,
        lines,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('outer (processItem)');
    });
  });

  describe('findParentFunctionWithFallback', () => {
    it('calls getFunctionNameForLine when no parent from lines and returns its value', () => {
      const getFunctionNameForLine = vi.fn(() => 'fromAst');
      const result = findParentFunctionWithFallback(
        '/f.js',
        20,
        '/project',
        ['const x = 1;', 'const y = 2;'],
        getFunctionNameForLine
      );
      expect(result).toBe('fromAst');
      expect(getFunctionNameForLine).toHaveBeenCalledWith('/f.js', 15, 'FunctionDeclaration', '/project');
    });

    it('returns "anonymous" when no parent and getFunctionNameForLine is not a function', () => {
      const result = findParentFunctionWithFallback(
        '/f.js',
        5,
        '/project',
        ['x;', 'y;'],
        null
      );
      expect(result).toBe('anonymous');
    });
  });

  describe('formatCallbackName', () => {
    it('returns only callbackType when parentFunction is null', () => {
      expect(formatCallbackName('map', null)).toBe('map');
    });
    it('returns only callbackType when parentFunction is "anonymous"', () => {
      expect(formatCallbackName('forEach', 'anonymous')).toBe('forEach');
    });
    it('returns only callbackType when parentFunction is "unknown"', () => {
      expect(formatCallbackName('filter', 'unknown')).toBe('filter');
    });
  });

  describe('handleArrowFunctionFinalFallback', () => {
    it('returns "anonymous arrow function" when parent is anonymous', () => {
      const result = handleArrowFunctionFinalFallback(
        '/f.js',
        1,
        '/project',
        () => 'anonymous'
      );
      expect(result).toBe('anonymous arrow function');
    });
  });

  describe('handleArrowFunctionExpression (invokes regex path for method/func callbacks)', () => {
    it('returns method-callback name when arrow is on same line as .forEach(', () => {
      const lines = ['function main() {', '  list.forEach(i =>'];
      const result = handleArrowFunctionExpression(
        lines,
        2,
        '/project/src/file.js',
        projectRoot,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('main (forEach)');
    });

    it('returns function-callback name when arrow follows plain function call', () => {
      const lines = ['function main() {', '  handleEvent(e =>'];
      const result = handleArrowFunctionExpression(
        lines,
        2,
        '/project/src/file.js',
        projectRoot,
        noopGetFunctionNameForLine
      );
      expect(result).toBe('main (handleEvent)');
    });
  });
});
