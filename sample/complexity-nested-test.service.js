/**
 * Test file for complexity report: multiple functions with nested,
 * multi-line decision points. Used to verify report includes this file
 * and that class methods show their names (not "anonymous").
 */
export class ComplexityNestedTestService {
  /**
   * Deeply nested if/else with multi-line blocks and ternaries inside.
   */
  processNestedConditions(level, data = {}, fallback = 0) {
    const min = data?.min ?? fallback;
    const max = data?.max ?? level;

    if (level <= 0) {
      return min;
    }

    if (level === 1) {
      return max > 0 ? min + 1 : min;
    }

    if (level > 1 && level < 10) {
      if (min < max) {
        return (level % 2 === 0 ? min + level : max - 1) ?? fallback;
      } else if (min === max) {
        return level;
      } else {
        return min > 0 ? min - 1 : 0;
      }
    }

    return level >= 10 ? level : fallback;
  }

  /**
   * Nested loops with conditionals and optional chaining inside.
   */
  aggregateWithNestedLoops(matrix, threshold = 5) {
    let sum = 0;

    for (let i = 0; i < matrix.length; i += 1) {
      const row = matrix[i];

      if (row == null) continue;

      for (const cell of row) {
        const value = cell ?? 0;
        if (value > threshold) {
          sum += value;
        } else if (value > 0) {
          sum += value < threshold ? value : 0;
        }
      }

      for (const k in row) {
        const v = row[k] ?? 0;
        sum += v > 0 ? v : 0;
      }
    }

    return sum;
  }

  /**
   * Switch inside try/catch with nested if and ternaries; multi-line.
   */
  classifyAndHandle(code, opts = {}) {
    const strict = opts?.strict ?? false;

    try {
      switch (code) {
        case 'A':
          if (strict) {
            return code.toLowerCase();
          }
          return code;

        case 'B':
          return strict ? 'b' : 'B';

        case 'C':
          if (!strict) {
            return code;
          }
          return code.toLowerCase();

        default:
          return strict ? code?.toLowerCase() ?? code : code;
      }
    } catch {
      return code ?? 'unknown';
    }
  }

  /**
   * While and do-while with nested conditionals; multiple decision paths.
   */
  iterateWithGuards(maxIterations = 10, skipEven = false) {
    const results = [];
    let i = 0;

    while (i < maxIterations) {
      if (skipEven && i % 2 === 0) {
        i += 1;
        continue;
      }

      if (i % 3 === 0) {
        results.push(i);
      } else if (i > 5) {
        results.push(i * 2);
      }

      i += 1;
    }

    let j = 0;
    do {
      const value = j < results.length ? results[j] ?? 0 : 0;
      if (value > 0 && (skipEven ? j % 2 !== 0 : true)) {
        results[j] = value + 1;
      }
      j += 1;
    } while (j < results.length && j < maxIterations);

    return results;
  }

  /**
   * Deep ternary and logical chains across multiple lines.
   */
  resolveValue(a, b, c, defaultVal = 0) {
    return (
      a ??
      (b != null
        ? b > 0
          ? b
          : defaultVal
        : c != null && c >= 0
          ? c
          : defaultVal)
    );
  }
}
