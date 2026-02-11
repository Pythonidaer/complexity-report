/**
 * Branch coverage for decision-points/parent-map.js
 */
import { describe, it, expect } from 'vitest';
import { buildParentMap } from '../decision-points/parent-map.js';

describe('decision-points/parent-map', () => {
  it('builds parent map for simple AST', () => {
    const ast = {
      type: 'Program',
      body: [
        { type: 'ExpressionStatement', expression: { type: 'Literal', value: 1 } },
      ],
    };
    const map = buildParentMap(ast);
    expect(map.size).toBeGreaterThan(0);
    expect(map.get(ast)).toBe(null);
  });

  it('skips non-object and non-type array elements', () => {
    const child = { type: 'Identifier', name: 'x' };
    const ast = {
      type: 'Program',
      body: [null, 1, 'string', child],
    };
    const map = buildParentMap(ast);
    expect(map.get(child)).toBeDefined();
  });

  it('skips node without type (does not set in map)', () => {
    const ast = { body: [{ type: 'Identifier', name: 'y' }] };
    const map = buildParentMap(ast);
    expect(map.size).toBe(1);
  });
});
