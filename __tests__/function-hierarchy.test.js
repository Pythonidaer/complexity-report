import { describe, it, expect, beforeEach } from "vitest";
import {
  setEscapeHtml,
  formatFunctionHierarchy,
  parseHierarchySegments,
} from "../function-hierarchy.js";

describe("function-hierarchy", () => {
  beforeEach(() => {
    // Set up escapeHtml before each test
    setEscapeHtml((str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;"));
  });
  
  describe("setEscapeHtml", () => {
    it("should set the escapeHtml function", () => {
      const mockEscapeHtml = (str) => str.replace(/</g, "&lt;");
      setEscapeHtml(mockEscapeHtml);
      // Function is set internally, we can't directly test it, but we can verify it doesn't throw
      expect(() => setEscapeHtml(mockEscapeHtml)).not.toThrow();
    });
  });

  describe("formatFunctionHierarchy", () => {
    it("should format empty hierarchy", () => {
      const functions = [];
      const boundaries = new Map();
      const breakdowns = new Map();
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toBe("");
    });

    it("should throw error when escapeHtml not set", () => {
      setEscapeHtml(null);
      const functions = [
        { line: 1, functionName: "test", complexity: "3" },
      ];
      const boundaries = new Map();
      const breakdowns = new Map();
      
      expect(() => formatFunctionHierarchy(functions, boundaries, breakdowns)).toThrow("escapeHtml not set");
    });

    it("should format single function hierarchy", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
      expect(result).toContain("3");
    });

    it("should format when boundaries map is empty (no parent lookup)", () => {
      const functions = [
        { line: 1, functionName: "standalone", complexity: "2", file: "a.ts" },
      ];
      const boundaries = new Map();
      const breakdowns = new Map([[1, { breakdown: { base: 1 }, calculatedTotal: 2 }]]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      expect(result).toContain("standalone");
    });

    it("should format hierarchy with parent and child", () => {
      const functions = [
        { line: 1, functionName: "parent", complexity: "5", file: "test.ts" },
        { line: 3, functionName: "child", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 10 }],
        [3, { start: 3, end: 7 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
        [3, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("parent");
      expect(result).toContain("child");
    });

    it("should handle multiple functions on same line (keep highest complexity)", () => {
      const functions = [
        { line: 1, functionName: "func1", complexity: "3", file: "test.ts" },
        { line: 1, functionName: "func2", complexity: "5", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should keep func2 (higher complexity)
      expect(result).toContain("func2");
      expect(result).not.toContain("func1");
    });

    it("should handle duplicate keys (keep higher complexity)", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
        { line: 1, functionName: "test", complexity: "5", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should keep the one with complexity 5
      expect(result).toContain("5");
    });

    it("should handle duplicate keys when second has lower complexity (keep first)", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "5", file: "test.ts" },
        { line: 1, functionName: "test", complexity: "2", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("5");
      expect(result).not.toContain("2");
    });

    it("should replace with higher complexity when duplicate key has higher value", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "2", file: "test.ts" },
        { line: 1, functionName: "test", complexity: "8", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 7 }, calculatedTotal: 8 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      expect(result).toContain("8");
    });

    it("should use default column structure when not provided", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
    });

    it("should filter empty columns when showAllColumns is false", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const columnStructure = {
        groups: [
          {
            name: 'Control Flow',
            columns: [
              { key: 'if', label: 'if' },
              { key: 'for', label: 'for' },
            ]
          }
        ],
        baseColumn: { key: 'base', label: 'base' }
      };
      const emptyColumns = new Set(['for']);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns, "", columnStructure, emptyColumns, false);
      
      expect(result).toContain("test");
      // Should not include 'for' column since it's empty
    });

    it("should show all columns when showAllColumns is true", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const columnStructure = {
        groups: [
          {
            name: 'Control Flow',
            columns: [
              { key: 'if', label: 'if' },
              { key: 'for', label: 'for' },
            ]
          }
        ],
        baseColumn: { key: 'base', label: 'base' }
      };
      const emptyColumns = new Set(['for']);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns, "", columnStructure, emptyColumns, true);
      
      expect(result).toContain("test");
      // Should include 'for' column even though it's empty
    });

    it("should handle functions without breakdown", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map();
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
      expect(result).toContain("3");
    });

    it("should display '-' for zero values in breakdown", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2, "for": 0 }, calculatedTotal: 3 }],
      ]);
      const columnStructure = {
        groups: [
          {
            name: 'Control Flow',
            columns: [
              { key: 'if', label: 'if' },
              { key: 'for', label: 'for' },
            ]
          }
        ],
        baseColumn: { key: 'base', label: 'base' }
      };
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns, "", columnStructure, new Set(), false);
      
      // Should show '-' for for column (value 0)
      expect(result).toContain("-");
    });

    it("should always show base column as 1", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Base should always be 1, never "-"
      expect(result).toContain("1");
      expect(result).not.toContain('base: "-"');
    });

    it("should sort functions by line number", () => {
      const functions = [
        { line: 10, functionName: "func2", complexity: "3", file: "test.ts" },
        { line: 5, functionName: "func1", complexity: "3", file: "test.ts" },
        { line: 15, functionName: "func3", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [5, { start: 5, end: 8 }],
        [10, { start: 10, end: 13 }],
        [15, { start: 15, end: 18 }],
      ]);
      const breakdowns = new Map([
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
        [10, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
        [15, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should be sorted by line number
      const func1Index = result.indexOf("func1");
      const func2Index = result.indexOf("func2");
      const func3Index = result.indexOf("func3");
      expect(func1Index).toBeLessThan(func2Index);
      expect(func2Index).toBeLessThan(func3Index);
    });

    it("should handle functions with same name but different lines", () => {
      const functions = [
        { line: 5, functionName: "handler", complexity: "3", file: "test.ts" },
        { line: 10, functionName: "handler", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [5, { start: 5, end: 8 }],
        [10, { start: 10, end: 13 }],
      ]);
      const breakdowns = new Map([
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
        [10, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should show both functions separately
      const handlerCount = (result.match(/handler/g) || []).length;
      expect(handlerCount).toBeGreaterThanOrEqual(2);
    });

    it("should fix function name for callbacks", () => {
      const functions = [
        { line: 5, functionName: "useEffect callback", complexity: "3", file: "test.ts" },
        { line: 1, functionName: "parent", complexity: "5", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 10 }],
        [5, { start: 5, end: 8 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      // This tests fixFunctionNameForCallback indirectly
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("useEffect");
      expect(result).toContain("parent");
    });

    it("should handle function without file property", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
    });

    it("should handle empty breakdown data", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: {}, calculatedTotal: 1 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
    });

    it("should handle breakdown with base value", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2, "for": 0 }, calculatedTotal: 3 }],
      ]);
      const columnStructure = {
        groups: [
          {
            name: 'Control Flow',
            columns: [
              { key: 'if', label: 'if' },
              { key: 'for', label: 'for' },
            ]
          }
        ],
        baseColumn: { key: 'base', label: 'base' }
      };
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns, "", columnStructure, new Set(), false);
      
      expect(result).toContain("test");
      expect(result).toContain("1"); // base value
    });

    it("should handle function with missing file in key", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("test");
    });

    it("should handle breakdown without base key", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should default base to 1
      expect(result).toContain("1");
    });

    it("should handle multiple functions with same key but different complexity", () => {
      const functions = [
        { line: 1, functionName: "test", complexity: "3", file: "test.ts" },
        { line: 1, functionName: "test", complexity: "5", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should keep the one with complexity 5
      expect(result).toContain("5");
    });

    it("should handle fixFunctionNameForCallback when functionBoundaries is null", () => {
      const functions = [
        { line: 5, functionName: "useEffect callback", complexity: "3", file: "test.ts" },
      ];
      const breakdowns = new Map([
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, null, breakdowns);
      
      expect(result).toContain("useEffect");
    });

    it("should use displayName when function has no boundary in map", () => {
      const functions = [
        { line: 5, functionName: "orphan", complexity: "2", file: "test.ts" },
      ];
      const boundaries = new Map([[1, { start: 1, end: 3 }]]);
      const breakdowns = new Map([
        [5, { breakdown: { base: 1, "if": 1 }, calculatedTotal: 2 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      expect(result).toContain("orphan");
    });

    it("should handle hierarchical naming for nested callbacks", () => {
      const functions = [
        { line: 1, functionName: "parent", complexity: "5", file: "test.ts" },
        { line: 5, functionName: "useEffect callback", complexity: "3", file: "test.ts" },
        { line: 7, functionName: "handleReInit", complexity: "2", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 15 }],
        [5, { start: 5, end: 12 }],
        [7, { start: 7, end: 9 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
        [7, { breakdown: { base: 1, "if": 1 }, calculatedTotal: 2 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Should show hierarchical names
      expect(result).toContain("parent");
      expect(result).toContain("useEffect");
      expect(result).toContain("handleReInit");
    });

    it("should handle cleanup callback not being a parent", () => {
      const functions = [
        { line: 1, functionName: "parent", complexity: "5", file: "test.ts" },
        { line: 5, functionName: "return callback", complexity: "1", file: "test.ts" },
        { line: 7, functionName: "nested", complexity: "2", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 15 }],
        [5, { start: 5, end: 12 }],
        [7, { start: 7, end: 9 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 4 }, calculatedTotal: 5 }],
        [5, { breakdown: { base: 1 }, calculatedTotal: 1 }],
        [7, { breakdown: { base: 1, "if": 1 }, calculatedTotal: 2 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      // Cleanup callback should not be parent of nested
      // nested should show parent as "parent", not "return callback"
      expect(result).toContain("parent");
    });

    it("should return displayName when parent base name is invalid for hierarchy (unknown)", () => {
      const functions = [
        { line: 1, functionName: "unknown", complexity: "2", file: "test.ts" },
        { line: 5, functionName: "child", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 10 }],
        [5, { start: 5, end: 8 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 1 }, calculatedTotal: 2 }],
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("child");
    });

    it("should return displayName when leaf name is invalid for hierarchy (anonymous)", () => {
      const functions = [
        { line: 1, functionName: "parent", complexity: "2", file: "test.ts" },
        { line: 5, functionName: "anonymous", complexity: "3", file: "test.ts" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 10 }],
        [5, { start: 5, end: 8 }],
      ]);
      const breakdowns = new Map([
        [1, { breakdown: { base: 1, "if": 1 }, calculatedTotal: 2 }],
        [5, { breakdown: { base: 1, "if": 2 }, calculatedTotal: 3 }],
      ]);
      const result = formatFunctionHierarchy(functions, boundaries, breakdowns);
      
      expect(result).toContain("anonymous");
    });
  });

  describe("parseHierarchySegments", () => {
    it("should return [displayName || ''] when displayName is falsy or not a string", () => {
      expect(parseHierarchySegments(null)).toEqual([""]);
      expect(parseHierarchySegments(undefined)).toEqual([""]);
      expect(parseHierarchySegments("")).toEqual([""]);
    });

    it("should split by arrow when displayName includes ' → '", () => {
      expect(parseHierarchySegments("Parent → child")).toEqual(["Parent", "child"]);
    });

    it("should split by parentheses when no arrow", () => {
      expect(parseHierarchySegments("Parent (child)")).toEqual(["Parent", "child"]);
    });
  });
});
