/**
 * Statement coverage for function-extraction/ast-utils.js (getNodeLine fallback)
 */
import { describe, it, expect } from 'vitest';
import { getNodeLine } from '../function-extraction/ast-utils.js';

describe('function-extraction/ast-utils getNodeLine', () => {
  it('returns 1 when node has no loc', () => {
    expect(getNodeLine({})).toBe(1);
  });

  it('returns 1 when node.loc has no start', () => {
    expect(getNodeLine({ loc: {} })).toBe(1);
  });

  it('returns line when node has loc.start.line', () => {
    expect(getNodeLine({ loc: { start: { line: 5 } } })).toBe(5);
  });
});
