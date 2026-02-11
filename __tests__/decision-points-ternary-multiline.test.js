/**
 * Unit tests for decision-points/ternary-multiline.js
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isMultiLineTernaryNode,
  buildMultiLineTernaryLineRanges,
  buildDecisionPointEntries,
} from '../decision-points/ternary-multiline.js';

vi.mock('../decision-points/node-helpers.js', () => ({
  getNodeLineRange: vi.fn(),
}));

import { getNodeLineRange } from '../decision-points/node-helpers.js';

describe('decision-points/ternary-multiline', () => {
  describe('isMultiLineTernaryNode', () => {
    it('returns false when single line', () => {
      expect(isMultiLineTernaryNode(
        { type: 'ConditionalExpression' },
        { startLine: 1, endLine: 1 },
        { column: 0, endColumn: 10 }
      )).toBe(false);
    });
    it('returns false when columnRange is null', () => {
      expect(isMultiLineTernaryNode(
        { type: 'ConditionalExpression' },
        { startLine: 1, endLine: 3 },
        null
      )).toBe(false);
    });
    it('returns false when node is not ConditionalExpression', () => {
      expect(isMultiLineTernaryNode(
        { type: 'IfStatement' },
        { startLine: 1, endLine: 3 },
        { column: 0, endColumn: 10 }
      )).toBe(false);
    });
    it('returns true when multi-line ternary with column range', () => {
      expect(isMultiLineTernaryNode(
        { type: 'ConditionalExpression' },
        { startLine: 1, endLine: 3 },
        { column: 0, endColumn: 10 }
      )).toBe(true);
    });
  });

  describe('buildMultiLineTernaryLineRanges', () => {
    it('builds line ranges for multi-line node', () => {
      const lines = ['  x ?', '    a', '    : b'];
      const nodeLoc = { start: { line: 1, column: 2 }, end: { line: 3, column: 8 } };
      const result = buildMultiLineTernaryLineRanges(1, 3, nodeLoc, lines);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        column: 2,
        endColumn: 5,
      });
    });
    it('handles missing line gracefully', () => {
      const lines = ['a'];
      const nodeLoc = { start: { line: 2, column: 0 } };
      const result = buildMultiLineTernaryLineRanges(2, 3, nodeLoc, lines);
      expect(result).toHaveLength(1);
      expect(result[0].line).toBe(2);
      expect(result[0].endColumn).toBe(0);
    });
  });

  describe('buildDecisionPointEntries', () => {
    it('returns multi-line entry when lineRange spans multiple lines', () => {
      vi.mocked(getNodeLineRange).mockReturnValue({ startLine: 1, endLine: 3 });
      const node = { loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 5 } } };
      const lines = ['x ?', '  a', '  : b'];
      const result = buildDecisionPointEntries(
        node,
        'ternary',
        1,
        1,
        null,
        lines
      );
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ternary');
      expect(result[0].lines).toBeDefined();
      expect(result[0].lines.length).toBe(1);
      vi.mocked(getNodeLineRange).mockRestore();
    });
    it('returns single-line entry with column when columnRange provided', () => {
      vi.mocked(getNodeLineRange).mockReturnValue({ startLine: 1, endLine: 1 });
      const node = { loc: {} };
      const result = buildDecisionPointEntries(
        node,
        'ternary',
        1,
        1,
        { column: 2, endColumn: 10 },
        ['x ? 1 : 0']
      );
      expect(result).toHaveLength(1);
      expect(result[0].column).toBe(2);
      expect(result[0].endColumn).toBe(10);
      vi.mocked(getNodeLineRange).mockRestore();
    });
    it('returns single-line entry without column when columnRange is null', () => {
      vi.mocked(getNodeLineRange).mockReturnValue({ startLine: 1, endLine: 1 });
      const node = { loc: {} };
      const result = buildDecisionPointEntries(node, 'if', 1, 1, null, ['  if (x)']);
      expect(result).toHaveLength(1);
      expect(result[0].column).toBeUndefined();
      expect(result[0].endColumn).toBeUndefined();
      vi.mocked(getNodeLineRange).mockRestore();
    });
  });
});
