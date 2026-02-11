/**
 * Unit tests for html-generators/file-line-render.js
 */
import { describe, it, expect } from 'vitest';
import {
  generateComplexityAnnotation,
  determineLineClasses,
  getDecisionPointRanges,
  buildCodeLineHTML,
  generateLineRowHTML,
} from '../html-generators/file-line-render.js';

describe('html-generators/file-line-render', () => {
  describe('generateComplexityAnnotation', () => {
    it('returns neutral span when func is null', () => {
      expect(generateComplexityAnnotation(null, () => {}, () => '')).toBe(
        '<span class="cline-any cline-neutral">&nbsp;</span>'
      );
    });
    it('returns span with complexity when func is provided', () => {
      const escapeHtml = (s) => s;
      const getComplexityLevel = () => {};
      const result = generateComplexityAnnotation(
        { functionName: 'foo', complexity: '5' },
        getComplexityLevel,
        escapeHtml
      );
      expect(result).toContain('cline-yes');
      expect(result).toContain('5');
      expect(result).toContain("Function 'foo'");
    });
  });

  describe('determineLineClasses', () => {
    it('returns empty class when no decision points', () => {
      const result = determineLineClasses([]);
      expect(result.classAttr).toBe('');
      expect(result.isDecisionPoint).toBe(false);
    });
    it('returns decision-point class when decision points exist', () => {
      const result = determineLineClasses([{ type: 'if' }]);
      expect(result.classAttr).toContain('decision-point');
      expect(result.isDecisionPoint).toBe(true);
    });
  });

  describe('getDecisionPointRanges', () => {
    it('returns empty array when no valid ranges', () => {
      const dps = [
        { column: undefined, endColumn: undefined },
        { column: -1, endColumn: 5 },
        { column: 5, endColumn: 3 },
      ];
      expect(getDecisionPointRanges(dps, '  if (x) {}')).toEqual([]);
    });
    it('returns merged ranges when decision points have valid columns', () => {
      const dps = [
        { column: 2, endColumn: 6 },
        { column: 4, endColumn: 8 },
      ];
      const line = '  if (x)';
      expect(getDecisionPointRanges(dps, line)).toEqual([
        { start: 2, end: 8, type: 'decision-point' },
      ]);
    });
    it('returns non-overlapping ranges when separate', () => {
      const dps = [
        { column: 0, endColumn: 2 },
        { column: 5, endColumn: 7 },
      ];
      const line = 'a = x ? 1 : 0';
      expect(getDecisionPointRanges(dps, line)).toEqual([
        { start: 0, end: 2, type: 'decision-point' },
        { start: 5, end: 7, type: 'decision-point' },
      ]);
    });
  });

  describe('buildCodeLineHTML', () => {
    it('returns plain span when no decision point ranges', () => {
      const result = buildCodeLineHTML('  const x = 1;', (s) => s, []);
      expect(result).toBe('<span class="code-line">  const x = 1;</span>');
    });
    it('returns HTML with highlighted decision point segments', () => {
      const dps = [{ column: 9, endColumn: 12 }];
      const line = '  const x = 1;';
      const result = buildCodeLineHTML(line, (s) => s, dps);
      expect(result).toContain('decision-point-line');
      expect(result).toContain(' = ');
      expect(result).toContain('code-line');
    });
    it('adds gap before first range when range does not start at 0', () => {
      const dps = [{ column: 2, endColumn: 6 }];
      const line = '  if (x)';
      const result = buildCodeLineHTML(line, (s) => s, dps);
      expect(result).toContain('  ');
      expect(result).toContain('if (');
    });
    it('adds remaining text after last range', () => {
      const dps = [{ column: 0, endColumn: 2 }];
      const line = '  x';
      const result = buildCodeLineHTML(line, (s) => s, dps);
      expect(result).toContain('  ');
      expect(result).toContain('x');
    });
  });

  describe('generateLineRowHTML', () => {
    it('generates row with line number and annotation', () => {
      const lineToFunction = new Map();
      const lineToDecisionPoint = new Map();
      const getComplexityLevel = () => {};
      const escapeHtml = (s) => s;

      const result = generateLineRowHTML(
        'const x = 1;',
        0,
        lineToFunction,
        lineToDecisionPoint,
        getComplexityLevel,
        escapeHtml
      );

      expect(result).toContain('data-line="1"');
      expect(result).toContain('L1');
      expect(result).toContain('cline-neutral');
      expect(result).toContain('const x = 1;');
    });
    it('includes function complexity when line has function', () => {
      const lineToFunction = new Map([[1, { functionName: 'main', complexity: '2' }]]);
      const lineToDecisionPoint = new Map();
      const getComplexityLevel = () => {};
      const escapeHtml = (s) => s;

      const result = generateLineRowHTML(
        'function main() {}',
        0,
        lineToFunction,
        lineToDecisionPoint,
        getComplexityLevel,
        escapeHtml
      );

      expect(result).toContain('cline-yes');
      expect(result).toContain('2');
    });
    it('adds decision-point class when line has decision points', () => {
      const lineToFunction = new Map();
      const lineToDecisionPoint = new Map([
        [1, [{ column: 2, endColumn: 6, type: 'if' }]],
      ]);
      const getComplexityLevel = () => {};
      const escapeHtml = (s) => s;

      const result = generateLineRowHTML(
        '  if (x)',
        0,
        lineToFunction,
        lineToDecisionPoint,
        getComplexityLevel,
        escapeHtml
      );

      expect(result).toContain('decision-point');
      expect(result).toContain('decision-point-line');
    });
    it('uses custom language class', () => {
      const lineToFunction = new Map();
      const lineToDecisionPoint = new Map();
      const getComplexityLevel = () => {};
      const escapeHtml = (s) => s;

      const result = generateLineRowHTML(
        'code',
        0,
        lineToFunction,
        lineToDecisionPoint,
        getComplexityLevel,
        escapeHtml,
        'lang-ts'
      );

      expect(result).toContain('lang-ts');
    });
  });
});
