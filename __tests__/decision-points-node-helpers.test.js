import { describe, it, expect } from 'vitest';
import {
  getLogicalExpressionOperatorLine,
  getLogicalExpressionOperatorRange,
  getNodeColumnRange,
  getDecisionPointLineForNode,
  getNodeLineRange,
} from '../decision-points/node-helpers.js';

describe('decision-points/node-helpers', () => {
  describe('getLogicalExpressionOperatorLine', () => {
    it('returns null when node is not LogicalExpression', () => {
      expect(getLogicalExpressionOperatorLine({ type: 'IfStatement' })).toBeNull();
    });
    it('returns null when left or right is missing', () => {
      expect(getLogicalExpressionOperatorLine({ type: 'LogicalExpression', left: {}, right: null })).toBeNull();
      expect(getLogicalExpressionOperatorLine({ type: 'LogicalExpression', left: null, right: {} })).toBeNull();
    });
    it('returns null when left.loc.end is missing', () => {
      expect(getLogicalExpressionOperatorLine({
        type: 'LogicalExpression',
        left: { loc: {} },
        right: { loc: {} },
      })).toBeNull();
    });
    it('returns line from left.loc.end when present', () => {
      expect(getLogicalExpressionOperatorLine({
        type: 'LogicalExpression',
        left: { loc: { end: { line: 3 } } },
        right: { loc: {} },
      })).toBe(3);
    });
  });

  describe('getLogicalExpressionOperatorRange', () => {
    it('returns null when left and right on different lines', () => {
      const node = {
        type: 'LogicalExpression',
        left: { loc: { end: { line: 1, column: 5 } } },
        right: { loc: { start: { line: 2, column: 0 } } },
      };
      expect(getLogicalExpressionOperatorRange(node)).toBeNull();
    });
    it('returns column range when same line', () => {
      const node = {
        type: 'LogicalExpression',
        left: { loc: { end: { line: 1, column: 5 } } },
        right: { loc: { start: { line: 1, column: 10 } } },
      };
      expect(getLogicalExpressionOperatorRange(node)).toEqual({ column: 5, endColumn: 10 });
    });
  });

  describe('getNodeColumnRange', () => {
    it('returns null for node without loc', () => {
      expect(getNodeColumnRange({ type: 'IfStatement' })).toBeNull();
    });
    it('returns null for multi-line node (startLine !== endLine)', () => {
      expect(getNodeColumnRange({
        type: 'IfStatement',
        loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 2 } },
      })).toBeNull();
    });
    it('returns range for single-line node', () => {
      expect(getNodeColumnRange({
        type: 'IfStatement',
        loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 10 } },
      })).toEqual({ column: 2, endColumn: 10 });
    });
  });

  describe('getNodeLineRange', () => {
    it('returns null when loc or start/end missing', () => {
      expect(getNodeLineRange({})).toBeNull();
      expect(getNodeLineRange({ loc: {} })).toBeNull();
      expect(getNodeLineRange({ loc: { start: { line: 1 } } })).toBeNull();
    });
    it('returns { startLine, endLine } when both present', () => {
      expect(getNodeLineRange({
        loc: { start: { line: 1 }, end: { line: 5 } },
      })).toEqual({ startLine: 1, endLine: 5 });
    });
  });

  describe('getDecisionPointLineForNode', () => {
    it('uses getNodeLine for non-LogicalExpression', () => {
      const node = { type: 'IfStatement', loc: { start: { line: 2 } } };
      expect(getDecisionPointLineForNode(node)).toBe(2);
    });
  });
});
