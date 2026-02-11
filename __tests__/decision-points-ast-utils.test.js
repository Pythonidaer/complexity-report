/**
 * Unit tests for decision-points/ast-utils.js
 */
import { describe, it, expect } from 'vitest';
import { getNodeLine } from '../decision-points/ast-utils.js';

describe('decision-points/ast-utils', () => {
  describe('getNodeLine', () => {
    it('returns node.loc.start.line when present', () => {
      expect(getNodeLine({ loc: { start: { line: 5 } } })).toBe(5);
    });
    it('returns 1 when node has range but no loc.start', () => {
      expect(getNodeLine({ range: [0, 10] })).toBe(1);
    });
    it('returns 1 when node has range[0] as 0', () => {
      expect(getNodeLine({ range: [0, 5] })).toBe(1);
    });
    it('returns 1 when node has neither loc nor range', () => {
      expect(getNodeLine({})).toBe(1);
    });
  });
});
