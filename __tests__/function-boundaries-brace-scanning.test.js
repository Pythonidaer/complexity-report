/**
 * Unit tests for function-boundaries/brace-scanning.js
 */
import { describe, it, expect } from 'vitest';
import {
  findDependencyArrayEnd,
  findSetTimeoutCallbackEnd,
  checkCallbackPatterns,
  handleFunctionBodyEnd,
} from '../function-boundaries/brace-scanning.js';

describe('function-boundaries/brace-scanning', () => {
  describe('findDependencyArrayEnd', () => {
    it('returns line number when ] found within 3 lines', () => {
      const lines = ['  }', '  ,', '  [dep]'];
      expect(findDependencyArrayEnd(lines, 0)).toBe(3);
    });
    it('returns null when no ] in next 3 lines', () => {
      const lines = ['  }', '  ,', '  something'];
      expect(findDependencyArrayEnd(lines, 0)).toBeNull();
    });
  });

  describe('findSetTimeoutCallbackEnd', () => {
    it('returns line number when ) and ; on same line', () => {
      const lines = ['  }, 1000);'];
      expect(findSetTimeoutCallbackEnd(lines, 0)).toBe(1);
    });
    it('returns line number when ) on next line', () => {
      const lines = ['  }', '  , 0)'];
      expect(findSetTimeoutCallbackEnd(lines, 0)).toBe(2);
    });
    it('returns null when pattern not found', () => {
      const lines = ['  }', '  ,', '  x'];
      expect(findSetTimeoutCallbackEnd(lines, 0)).toBeNull();
    });
  });

  describe('checkCallbackPatterns', () => {
    it('returns both false when line has no }', () => {
      const result = checkCallbackPatterns('  return x;', 0, []);
      expect(result).toEqual({ hasDependencyArray: false, hasCallbackParam: false });
    });
    it('returns hasDependencyArray true when }, [ pattern', () => {
      const lines = ['  }', ', [dep]'];
      const result = checkCallbackPatterns('  }', 0, lines);
      expect(result.hasDependencyArray).toBe(true);
    });
    it('returns hasCallbackParam true when }, digit pattern', () => {
      const lines = ['  }, 500);'];
      const result = checkCallbackPatterns('  }, 500);', 0, lines);
      expect(result.hasCallbackParam).toBe(true);
    });
  });

  describe('handleFunctionBodyEnd', () => {
    it('returns findDependencyArrayEnd result when hasDependencyArray', () => {
      const lines = ['  }', '  , [deps]', '  ]'];
      expect(handleFunctionBodyEnd('  }', 0, 1, lines)).toBe(2);
    });
    it('returns findSetTimeoutCallbackEnd result when hasCallbackParam', () => {
      const lines = ['  }, 0);'];
      expect(handleFunctionBodyEnd('  }, 0);', 0, 1, lines)).toBe(1);
    });
    it('returns i+1 when neither pattern', () => {
      const lines = ['  }'];
      expect(handleFunctionBodyEnd('  }', 0, 1, lines)).toBe(1);
    });
  });
});
