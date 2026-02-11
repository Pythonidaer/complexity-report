/**
 * Unit tests for html-generators/file-breakdown.js
 */
import { describe, it, expect, vi } from 'vitest';
import {
  detectEmptyColumns,
  getBreakdownColumnStructure,
  findBoundaryForFunction,
  logComplexityMismatch,
  calculateFileStatistics,
  getBreakdownSectionOptions,
  generateBreakdownSectionHTML,
  _generateStatisticsHTML,
} from '../html-generators/file-breakdown.js';

describe('html-generators/file-breakdown', () => {
  describe('getBreakdownColumnStructure', () => {
    it('returns classic structure with case column', () => {
      const result = getBreakdownColumnStructure('classic');
      const controlFlow = result.groups[0].columns;
      expect(controlFlow.some(c => c.key === 'case')).toBe(true);
      expect(controlFlow.some(c => c.key === 'switch')).toBe(false);
    });

    it('returns modified structure with switch column', () => {
      const result = getBreakdownColumnStructure('modified');
      const controlFlow = result.groups[0].columns;
      expect(controlFlow.some(c => c.key === 'switch')).toBe(true);
      expect(controlFlow.some(c => c.key === 'case')).toBe(false);
    });
  });

  describe('detectEmptyColumns', () => {
    it('adds column to emptyColumns when no function has value', () => {
      const columnStructure = {
        groups: [{ columns: [{ key: 'if' }, { key: 'ternary' }] }],
      };
      const functions = [{ line: 1 }, { line: 2 }];
      const functionBreakdowns = new Map([
        [1, { breakdown: { if: 0, ternary: 0 } }],
        [2, { breakdown: { if: 0, ternary: 0 } }],
      ]);
      const empty = detectEmptyColumns(functions, functionBreakdowns, columnStructure);
      expect(empty.has('if')).toBe(true);
      expect(empty.has('ternary')).toBe(true);
    });

    it('does not add column when at least one function has value', () => {
      const columnStructure = {
        groups: [{ columns: [{ key: 'if' }] }],
      };
      const functions = [{ line: 1 }, { line: 2 }];
      const functionBreakdowns = new Map([
        [1, { breakdown: { if: 0 } }],
        [2, { breakdown: { if: 2 } }],
      ]);
      const empty = detectEmptyColumns(functions, functionBreakdowns, columnStructure);
      expect(empty.has('if')).toBe(false);
    });
  });

  describe('findBoundaryForFunction', () => {
    it('returns boundary when functionLine is key in map', () => {
      const boundaries = new Map([[5, { start: 5, end: 10 }]]);
      expect(findBoundaryForFunction(5, boundaries)).toEqual({ start: 5, end: 10 });
    });

    it('returns boundary from entries when functionLine within range', () => {
      const boundaries = new Map([
        [1, { start: 1, end: 20 }],
        [5, { start: 5, end: 10 }],
      ]);
      expect(findBoundaryForFunction(7, boundaries)).toBeDefined();
    });

    it('returns undefined when no matching boundary', () => {
      const boundaries = new Map([[1, { start: 1, end: 5 }]]);
      expect(findBoundaryForFunction(10, boundaries)).toBeUndefined();
    });
  });

  describe('logComplexityMismatch', () => {
    it('logs decision points when breakdown has decision points and mismatch > 1', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const func = { functionName: 'test', line: 1, complexity: '5' };
      const breakdown = { calculatedTotal: 2, decisionPoints: [{ type: 'if', line: 2 }] };
      logComplexityMismatch(func, breakdown, new Map());
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[1][0]).toContain('Decision points found:');
      expect(consoleSpy.mock.calls[1][1]).toContain('if at line 2');
      consoleSpy.mockRestore();
    });

    it('logs "(none)" when breakdown has no decision points and mismatch > 1', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const func = { functionName: 'test', line: 1, complexity: '5' };
      const breakdown = { calculatedTotal: 2, decisionPoints: [] };
      logComplexityMismatch(func, breakdown, new Map());
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('(none)'));
      consoleSpy.mockRestore();
    });
  });

  describe('calculateFileStatistics', () => {
    it('returns level "medium" when percentage in [40, 60)', () => {
      const functions = [
        { complexity: '5' },
        { complexity: '5' },
        { complexity: '15' },
        { complexity: '15' },
        { complexity: '15' },
      ];
      const result = calculateFileStatistics(functions, 10);
      expect(result.percentage).toBe(40);
      expect(result.level).toBe('medium');
    });

    it('returns level "high" when percentage >= 80', () => {
      const functions = [
        { complexity: '5' },
        { complexity: '5' },
        { complexity: '5' },
      ];
      const result = calculateFileStatistics(functions, 10);
      expect(result.percentage).toBe(100);
      expect(result.level).toBe('high');
    });

    it('returns level "low" when percentage < 40', () => {
      const functions = [
        { complexity: '15' },
        { complexity: '15' },
        { complexity: '15' },
      ];
      const result = calculateFileStatistics(functions, 10);
      expect(result.percentage).toBe(0);
      expect(result.level).toBe('low');
    });
  });

  describe('getBreakdownSectionOptions', () => {
    it('returns colspanWithoutLines and hide-lines class when hideLinesInitially true', () => {
      const opts = getBreakdownSectionOptions(3, true, false, false, false);
      expect(opts.initialColspan).toBe(2 + 3);
      expect(opts.tableClass).toContain('hide-lines');
    });

    it('returns tableDisplay none when hideTableInitially true', () => {
      const opts = getBreakdownSectionOptions(2, false, true, false, false);
      expect(opts.tableDisplay).toBe('none');
    });

    it('returns showAllColumnsChecked when initialShowAllColumns true', () => {
      const opts = getBreakdownSectionOptions(2, false, false, true, false);
      expect(opts.showAllColumnsChecked).toBe('checked');
    });

    it('returns showHighlightsChecked when hideHighlightsInitially false', () => {
      const opts = getBreakdownSectionOptions(2, false, false, false, false);
      expect(opts.showHighlightsChecked).toBe('checked');
    });
  });

  describe('generateBreakdownSectionHTML', () => {
    it('returns empty string when functions length is 0', () => {
      const result = generateBreakdownSectionHTML(
        [],
        { totalBreakdownCols: 2, visibleGroups: [] },
        [],
        {},
        false,
        false,
        false,
        false
      );
      expect(result).toBe('');
    });

    it('skips group header when group has no columns', () => {
      const initialColumns = {
        totalBreakdownCols: 1,
        visibleGroups: [
          { name: 'Control Flow', columns: [], totalColumns: 0 },
          { name: 'Expressions', columns: [{ key: 'ternary', label: 'Ternary' }], totalColumns: 1 },
        ],
      };
      const result = generateBreakdownSectionHTML(
        [{ line: 1, functionName: 'f', complexity: '1' }],
        initialColumns,
        [{ key: 'ternary', label: 'Ternary' }],
        {},
        false,
        false,
        false,
        false
      );
      expect(result).toContain('Expressions');
    });
  });

  describe('_generateStatisticsHTML', () => {
    it('returns HTML with max and avg complexity when maxComplexity > 0', () => {
      const result = _generateStatisticsHTML(5, 4, 10, 2);
      expect(result).toContain('10');
      expect(result).toContain('Max Complexity');
      expect(result).toContain('Avg Complexity');
    });

    it('returns empty string when maxComplexity is 0', () => {
      const result = _generateStatisticsHTML(0, 0, 0, 0);
      expect(result).toBe('');
    });
  });
});
