import { describe, it, expect } from "vitest";
import { calculateComplexityBreakdown } from "../complexity-breakdown.js";

describe("complexity-breakdown", () => {
  describe("calculateComplexityBreakdown", () => {
    it("should return base complexity of 1 when no decision points", () => {
      const result = calculateComplexityBreakdown(10, [], 1);

      expect(result.breakdown.base).toBe(1);
      expect(result.calculatedTotal).toBe(1);
      expect(result.decisionPoints).toEqual([]);
    });

    it("should use provided base complexity", () => {
      const result = calculateComplexityBreakdown(10, [], 2);

      expect(result.breakdown.base).toBe(2);
      expect(result.calculatedTotal).toBe(2);
    });

    it("should default to base complexity of 1 when not provided", () => {
      const result = calculateComplexityBreakdown(10, []);

      expect(result.breakdown.base).toBe(1);
      expect(result.calculatedTotal).toBe(1);
    });

    it("should filter decision points by function line", () => {
      const decisionPoints = [
        { functionLine: 10, type: "if", line: 12 },
        { functionLine: 10, type: "&&", line: 13 },
        { functionLine: 20, type: "if", line: 22 }, // Different function
      ];

      const result = calculateComplexityBreakdown(10, decisionPoints, 1);

      expect(result.decisionPoints).toHaveLength(2);
      expect(result.decisionPoints[0].type).toBe("if");
      expect(result.decisionPoints[1].type).toBe("&&");
      expect(result.calculatedTotal).toBe(3); // base + if + &&
    });

    it("should count all decision point types correctly", () => {
      const decisionPoints = [
        { functionLine: 10, type: "if", line: 12 },
        { functionLine: 10, type: "else if", line: 14 },
        { functionLine: 10, type: "for", line: 16 },
        { functionLine: 10, type: "for...of", line: 18 },
        { functionLine: 10, type: "for...in", line: 20 },
        { functionLine: 10, type: "while", line: 22 },
        { functionLine: 10, type: "do...while", line: 24 },
        { functionLine: 10, type: "switch", line: 26 },
        { functionLine: 10, type: "case", line: 28 },
        { functionLine: 10, type: "catch", line: 30 },
        { functionLine: 10, type: "ternary", line: 32 },
        { functionLine: 10, type: "&&", line: 34 },
        { functionLine: 10, type: "||", line: 36 },
        { functionLine: 10, type: "??", line: 38 },
        { functionLine: 10, type: "?.", line: 40 },
        { functionLine: 10, type: "default parameter", line: 42 },
      ];

      const result = calculateComplexityBreakdown(10, decisionPoints, 1);

      expect(result.breakdown.base).toBe(1);
      expect(result.breakdown["if"]).toBe(1);
      expect(result.breakdown["else if"]).toBe(1);
      expect(result.breakdown["for"]).toBe(1);
      expect(result.breakdown["for...of"]).toBe(1);
      expect(result.breakdown["for...in"]).toBe(1);
      expect(result.breakdown["while"]).toBe(1);
      expect(result.breakdown["do...while"]).toBe(1);
      expect(result.breakdown["switch"]).toBe(1);
      expect(result.breakdown["case"]).toBe(1);
      expect(result.breakdown["catch"]).toBe(1);
      expect(result.breakdown["ternary"]).toBe(1);
      expect(result.breakdown["&&"]).toBe(1);
      expect(result.breakdown["||"]).toBe(1);
      expect(result.breakdown["??"]).toBe(1);
      expect(result.breakdown["?."]).toBe(1);
      expect(result.breakdown["default parameter"]).toBe(1);
      expect(result.calculatedTotal).toBe(17); // base + 16 decision points
    });

    it("should count multiple instances of the same decision point type", () => {
      const decisionPoints = [
        { functionLine: 10, type: "if", line: 12 },
        { functionLine: 10, type: "if", line: 15 },
        { functionLine: 10, type: "&&", line: 18 },
        { functionLine: 10, type: "&&", line: 19 },
        { functionLine: 10, type: "&&", line: 20 },
      ];

      const result = calculateComplexityBreakdown(10, decisionPoints, 1);

      expect(result.breakdown["if"]).toBe(2);
      expect(result.breakdown["&&"]).toBe(3);
      expect(result.calculatedTotal).toBe(6); // base + 2 if + 3 &&
    });

    it("should ignore unknown decision point types", () => {
      const decisionPoints = [
        { functionLine: 10, type: "if", line: 12 },
        { functionLine: 10, type: "unknown-type", line: 13 }, // Unknown type
        { functionLine: 10, type: "&&", line: 14 },
      ];

      const result = calculateComplexityBreakdown(10, decisionPoints, 1);

      expect(result.breakdown["if"]).toBe(1);
      expect(result.breakdown["&&"]).toBe(1);
      expect(result.breakdown["unknown-type"]).toBeUndefined();
      expect(result.calculatedTotal).toBe(3); // base + if + &&
    });
  });
});
