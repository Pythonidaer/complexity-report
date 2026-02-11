/**
 * Unit tests for decision-type module (getDecisionPointType, getControlFlowDecisionType, getExpressionDecisionType)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDecisionPointType,
  getControlFlowDecisionType,
  getExpressionDecisionType,
  getLogicalExpressionType,
} from '../decision-points/decision-type.js';

vi.mock('../decision-points/in-params.js', () => ({
  isInFunctionParameters: vi.fn(),
}));

import { isInFunctionParameters } from '../decision-points/in-params.js';

describe('decision-type', () => {
  beforeEach(() => {
    vi.mocked(isInFunctionParameters).mockReturnValue(false);
  });

  describe('getControlFlowDecisionType', () => {
    it('returns "if" for IfStatement', () => {
      expect(getControlFlowDecisionType(null, 'IfStatement', 'classic')).toBe('if');
    });
    it('returns "case" for SwitchCase with test (classic)', () => {
      expect(getControlFlowDecisionType({ test: {} }, 'SwitchCase', 'classic')).toBe('case');
    });
    it('returns null for SwitchCase default (test === null) in classic', () => {
      expect(getControlFlowDecisionType({ test: null }, 'SwitchCase', 'classic')).toBe(null);
    });
    it('returns null for SwitchCase in modified variant', () => {
      expect(getControlFlowDecisionType({ test: {} }, 'SwitchCase', 'modified')).toBe(null);
    });
    it('returns "else if" via getDecisionPointType when IfStatement alternate', () => {
      const node = { type: 'IfStatement' };
      const parent = { type: 'IfStatement', alternate: node };
      const parentMap = new Map([[node, parent]]);
      expect(getDecisionPointType(node, parentMap, null, 'classic')).toBe('else if');
    });
  });

  describe('getLogicalExpressionType', () => {
    it('returns "&&" for && operator', () => {
      expect(getLogicalExpressionType({ operator: '&&' })).toBe('&&');
    });
    it('returns "||" for || operator', () => {
      expect(getLogicalExpressionType({ operator: '||' })).toBe('||');
    });
    it('returns "??" for ?? operator', () => {
      expect(getLogicalExpressionType({ operator: '??' })).toBe('??');
    });
    it('returns null for unknown operator', () => {
      expect(getLogicalExpressionType({ operator: '+' })).toBe(null);
    });
  });

  describe('getExpressionDecisionType', () => {
    it('returns "ternary" for ConditionalExpression', () => {
      expect(getExpressionDecisionType({}, 'ConditionalExpression')).toBe('ternary');
    });
    it('returns "?." for MemberExpression with optional', () => {
      expect(getExpressionDecisionType({ optional: true }, 'MemberExpression')).toBe('?.');
    });
    it('returns "??" for BinaryExpression with ?? operator', () => {
      expect(getExpressionDecisionType({ operator: '??' }, 'BinaryExpression')).toBe('??');
    });
  });

  describe('getDecisionPointType', () => {
    it('returns null for null node', () => {
      expect(getDecisionPointType(null, new Map(), null, 'classic')).toBe(null);
    });
    it('returns null for node without type', () => {
      expect(getDecisionPointType({}, new Map(), null, 'classic')).toBe(null);
    });
    it('returns "if" for IfStatement when not alternate', () => {
      const node = { type: 'IfStatement' };
      const parentMap = new Map();
      expect(getDecisionPointType(node, parentMap, null, 'classic')).toBe('if');
    });
    it('returns "default parameter" when AssignmentPattern in params', () => {
      const node = { type: 'AssignmentPattern' };
      const parentMap = new Map();
      const ast = {};
      vi.mocked(isInFunctionParameters).mockReturnValue(true);
      expect(getDecisionPointType(node, parentMap, ast, 'classic')).toBe('default parameter');
    });
    it('returns null for AssignmentPattern when not in params', () => {
      const node = { type: 'AssignmentPattern' };
      const parentMap = new Map();
      vi.mocked(isInFunctionParameters).mockReturnValue(false);
      expect(getDecisionPointType(node, parentMap, {}, 'classic')).toBe(null);
    });
  });
});
