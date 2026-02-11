import { describe, it, expect } from "vitest";
import {
  buildHierarchicalFunctionName,
  getTopLevelFunctions,
  groupFunctionsByFolder,
} from "../export-generators/helpers.js";
import { getDirectory } from "../function-extraction/index.js";

describe("export-generators/helpers", () => {
  describe("buildHierarchicalFunctionName", () => {
    it("should return function name as-is when no parent found", () => {
      const func = { file: "test.js", line: 10, functionName: "testFunction" };
      const fileBoundaries = new Map();
      const fileFunctions = [];
      
      const result = buildHierarchicalFunctionName(func, fileBoundaries, fileFunctions);
      expect(result).toBe("testFunction");
    });

    it("should return function name when boundaries are null", () => {
      const func = { file: "test.js", line: 10, functionName: "testFunction" };
      const result = buildHierarchicalFunctionName(func, null, []);
      expect(result).toBe("testFunction");
    });

    it("should build hierarchical name for callback functions", () => {
      const parentFunc = { file: "test.js", line: 5, functionName: "parentFunction" };
      const callbackFunc = { file: "test.js", line: 10, functionName: "useEffect" };
      
      const fileBoundaries = new Map([
        [5, { start: 5, end: 20 }],
        [10, { start: 10, end: 15 }],
      ]);
      const fileFunctions = [parentFunc, callbackFunc];
      
      const result = buildHierarchicalFunctionName(callbackFunc, fileBoundaries, fileFunctions);
      expect(result).toBe("parentFunction → useEffect");
    });

    it("should prevent infinite loops with visited set", () => {
      const func = { file: "test.js", line: 10, functionName: "testFunction" };
      const fileBoundaries = new Map([
        [10, { start: 10, end: 15 }],
      ]);
      const fileFunctions = [func];
      
      const visited = new Set(["test.js:10"]);
      const result = buildHierarchicalFunctionName(func, fileBoundaries, fileFunctions, visited);
      expect(result).toBe("testFunction");
    });

    it("should handle nested callbacks", () => {
      const parentFunc = { file: "test.js", line: 5, functionName: "parentFunction" };
      const callbackFunc = { file: "test.js", line: 10, functionName: "useEffect" };
      const nestedCallback = { file: "test.js", line: 12, functionName: "map" };
      
      const fileBoundaries = new Map([
        [5, { start: 5, end: 20 }],
        [10, { start: 10, end: 18 }],
        [12, { start: 12, end: 15 }],
      ]);
      const fileFunctions = [parentFunc, callbackFunc, nestedCallback];
      
      const result = buildHierarchicalFunctionName(nestedCallback, fileBoundaries, fileFunctions);
      expect(result).toBe("parentFunction → useEffect → map");
    });

    it("should pick immediate parent when two containers have same size (tie-break by later start)", () => {
      const func5 = { file: "test.js", line: 5, functionName: "outer" };
      const func10 = { file: "test.js", line: 10, functionName: "inner" };
      const func12 = { file: "test.js", line: 12, functionName: "innermost" };
      const fileBoundaries = new Map([
        [5, { start: 5, end: 25 }],
        [10, { start: 10, end: 30 }],
        [12, { start: 12, end: 18 }],
      ]);
      const fileFunctions = [func5, func10, func12];
      const result = buildHierarchicalFunctionName(func12, fileBoundaries, fileFunctions);
      expect(result).toBe("inner → innermost");
    });

    it("should handle unknown function name", () => {
      const func = { file: "test.js", line: 10, functionName: null };
      const fileBoundaries = new Map();
      const fileFunctions = [];
      
      const result = buildHierarchicalFunctionName(func, fileBoundaries, fileFunctions);
      expect(result).toBe("unknown");
    });

    it("should return displayName when parent base name is invalid for hierarchy", () => {
      const parentFunc = { file: "test.js", line: 5, functionName: "anonymous" };
      const childFunc = { file: "test.js", line: 10, functionName: "callback" };
      const fileBoundaries = new Map([
        [5, { start: 5, end: 20 }],
        [10, { start: 10, end: 15 }],
      ]);
      const fileFunctions = [parentFunc, childFunc];
      const result = buildHierarchicalFunctionName(childFunc, fileBoundaries, fileFunctions);
      expect(result).toBe("callback");
    });

    it("should return displayName when leaf name is invalid", () => {
      const parentFunc = { file: "test.js", line: 5, functionName: "parent" };
      const childFunc = { file: "test.js", line: 10, functionName: "anonymous" };
      const fileBoundaries = new Map([
        [5, { start: 5, end: 20 }],
        [10, { start: 10, end: 15 }],
      ]);
      const fileFunctions = [parentFunc, childFunc];
      const result = buildHierarchicalFunctionName(childFunc, fileBoundaries, fileFunctions);
      expect(result).toBe("anonymous");
    });
  });

  describe("getTopLevelFunctions", () => {
    it("should return empty array for empty functions", () => {
      const result = getTopLevelFunctions([], new Map());
      expect(result).toEqual([]);
    });

    it("should return all functions when none are nested", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "func1" },
        { file: "test.js", line: 10, functionName: "func2" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
        [10, { start: 10, end: 15 }],
      ]);
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(2);
    });

    it("should exclude nested functions", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "parent" },
        { file: "test.js", line: 5, functionName: "nested" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 20 }],
        [5, { start: 5, end: 10 }],
      ]);
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("parent");
    });

    it("should deduplicate callback variants by base name", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "testFunction" },
        { file: "test.js", line: 10, functionName: "testFunction (useEffect)" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
        [10, { start: 10, end: 15 }],
      ]);
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("testFunction");
    });

    it("should handle functions without boundaries", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "func1" },
      ];
      const boundaries = new Map();
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("func1");
    });

    it("should add callback-suffix function when no boundary and first of base name", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "main (useEffect callback)" },
      ];
      const boundaries = new Map();
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("main");
    });

    it("should add standalone name with boundary when not nested", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "onlyOne" },
      ];
      const boundaries = new Map([[1, { start: 1, end: 10 }]]);
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("onlyOne");
    });

    it("should add callback-suffix function with boundary when first of base name (addTopLevelFunctionWithBoundary branch)", () => {
      const functions = [
        { file: "a.js", line: 5, functionName: "foo (useEffect callback)" },
      ];
      const boundaries = new Map([[5, { start: 5, end: 15 }]]);
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(1);
      expect(result[0].functionName).toBe("foo");
    });

    it("should keep standalone callback names as-is", () => {
      const functions = [
        { file: "test.js", line: 1, functionName: "useCallback" },
        { file: "test.js", line: 10, functionName: "anonymous" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
        [10, { start: 10, end: 15 }],
      ]);
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(2);
      expect(result[0].functionName).toBe("useCallback");
      expect(result[1].functionName).toBe("anonymous");
    });

    it("should only deduplicate within same file", () => {
      const functions = [
        { file: "test1.js", line: 1, functionName: "testFunction" },
        { file: "test2.js", line: 1, functionName: "testFunction" },
      ];
      const boundaries = new Map([
        [1, { start: 1, end: 5 }],
      ]);
      
      const result = getTopLevelFunctions(functions, boundaries);
      expect(result).toHaveLength(2);
    });
  });

  describe("groupFunctionsByFolder", () => {
    it("should return empty map for empty functions", () => {
      const result = groupFunctionsByFolder([], getDirectory);
      expect(result.size).toBe(0);
    });

    it("should group functions by directory", () => {
      const functions = [
        { file: "src/components/Button.tsx", line: 1, functionName: "Button" },
        { file: "src/components/Icon.tsx", line: 1, functionName: "Icon" },
        { file: "src/utils/helper.ts", line: 1, functionName: "helper" },
      ];
      
      const result = groupFunctionsByFolder(functions, getDirectory);
      expect(result.size).toBe(2);
      expect(result.has("src/components")).toBe(true);
      expect(result.has("src/utils")).toBe(true);
    });

    it("should group functions by file within directory", () => {
      const functions = [
        { file: "src/components/Button.tsx", line: 1, functionName: "Button" },
        { file: "src/components/Button.tsx", line: 10, functionName: "handleClick" },
      ];
      
      const result = groupFunctionsByFolder(functions, getDirectory);
      const componentsMap = result.get("src/components");
      expect(componentsMap).toBeDefined();
      expect(componentsMap.has("src/components/Button.tsx")).toBe(true);
      expect(componentsMap.get("src/components/Button.tsx")).toHaveLength(2);
    });

    it("should handle root-level files", () => {
      const functions = [
        { file: "index.ts", line: 1, functionName: "main" },
      ];
      
      const result = groupFunctionsByFolder(functions, getDirectory);
      // getDirectory returns '' for root-level files (no path separator)
      const rootKey = getDirectory("index.ts");
      expect(rootKey).toBe("");
      expect(result.has(rootKey)).toBe(true);
      const rootMap = result.get(rootKey);
      expect(rootMap.has("index.ts")).toBe(true);
    });
  });
});
