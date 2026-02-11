import { describe, it, expect, beforeEach, vi } from "vitest";
import { join } from "path";
import {
  generateAllFunctionsMD,
  generateFunctionsByFolderMD,
  generateFileNamesAlphabeticalMD,
} from "../export-generators/md-exports.js";
import {
  generateAllFunctionsTXT,
  generateFunctionsByFolderTXT,
  generateAllFunctionsLeafOnlyTXT,
  generateFunctionsByFolderLeafOnlyTXT,
  generateFileNamesAlphabeticalTXT,
} from "../export-generators/txt-exports.js";
import { generateAllExports } from "../export-generators/index.js";

const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn(() => "function foo() {}"));
const mockExistsSync = vi.hoisted(() => vi.fn(() => true));

vi.mock("fs", () => ({
  default: {
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  },
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
}));

vi.mock("../function-boundaries/index.js", () => ({
  findFunctionBoundaries: vi.fn(() => new Map([[1, { start: 1, end: 5 }]])),
}));

vi.mock("../export-generators/helpers.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildHierarchicalFunctionName: (func, ...args) => {
      if (func.functionName === "__returnEmpty__") return "";
      if (func.functionName === "__returnNull__") return null;
      return actual.buildHierarchicalFunctionName(func, ...args);
    },
  };
});

describe("export-generators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MD exports", () => {
    const mockFunctions = [
      { file: "test.js", line: 1, functionName: "test", complexity: 1 },
    ];
    const mockBoundaries = new Map([
      ["test.js", new Map([[1, { start: 1, end: 5 }]])],
    ]);
    const mockFileToFunctions = new Map([
      ["test.js", mockFunctions],
    ]);

    it("should generate all functions MD", () => {
      const result = generateAllFunctionsMD(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("# All Functions");
    });

    it("should escape pipe in function name in MD", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "a|b", complexity: 2 },
      ];
      const boundaries = new Map([["a.js", new Map([[1, { start: 1, end: 3 }]])]]);
      const fileToFuncs = new Map([["a.js", funcs]]);
      const result = generateAllFunctionsMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("&#124;");
    });

    it("should generate functions by folder MD with root folder", () => {
      const funcs = [
        { file: "index.js", line: 1, functionName: "main", complexity: 1 },
      ];
      const boundaries = new Map([["index.js", new Map([[1, { start: 1, end: 5 }]])]]);
      const fileToFuncs = new Map([["index.js", funcs]]);
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("(root)");
    });

    it("should generate functions by folder MD", () => {
      const result = generateFunctionsByFolderMD(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("# Functions by Folder");
    });

    it("should use fallback Map and array when file not in boundaries/fileToFunctions in generateAllFunctionsMD", () => {
      const funcs = [
        { file: "not-in-maps.js", line: 1, functionName: "alone", complexity: 1 },
      ];
      const result = generateAllFunctionsMD(funcs, new Map(), new Map());
      expect(result).toContain("alone");
      expect(result).toContain("not-in-maps.js:1");
    });

    it("should use 'unknown' in sort when hierarchicalName is falsy in generateAllFunctionsMD", () => {
      const funcsWithUnknown = [
        { file: "a.js", line: 1, functionName: "foo", complexity: 1 },
        { file: "b.js", line: 1, functionName: null, complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 5 }]])],
        ["b.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["a.js", [funcsWithUnknown[0]]],
        ["b.js", [funcsWithUnknown[1]]],
      ]);
      const result = generateAllFunctionsMD(funcsWithUnknown, boundaries, fileToFuncs);
      expect(result).toContain("unknown");
      expect(result).toContain("foo");
    });

    it("should use fallback 'unknown' and '' when buildHierarchicalFunctionName returns empty", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "__returnEmpty__", complexity: 1 },
        { file: "b.js", line: 1, functionName: "normal", complexity: 2 },
        { file: "c.js", line: 1, functionName: "__returnEmpty__", complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 5 }]])],
        ["b.js", new Map([[1, { start: 1, end: 5 }]])],
        ["c.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["a.js", [funcs[0]]],
        ["b.js", [funcs[1]]],
        ["c.js", [funcs[2]]],
      ]);
      const result = generateAllFunctionsMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("normal");
      expect(result).toMatch(/\|\s*\|/);
      expect(result).toMatch(/\|\s*1\s*\|.*a\.js:1/);
    });

    it("should use (root) when folder is empty in generateFunctionsByFolderMD", () => {
      const funcs = [
        { file: "index.js", line: 1, functionName: "main", complexity: 1 },
      ];
      const boundaries = new Map([["index.js", new Map([[1, { start: 1, end: 5 }]])]]);
      const fileToFuncs = new Map([["index.js", funcs]]);
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("(root)");
      expect(result).toContain("index.js");
    });

    it("should use fallback when file not in boundaries/fileToFunctions in generateFunctionsByFolderMD", () => {
      const funcs = [
        { file: "missing-in-maps.js", line: 1, functionName: "fn", complexity: 1 },
      ];
      const boundaries = new Map();
      const fileToFuncs = new Map();
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("fn");
      expect(result).toContain("missing-in-maps.js");
    });

    it("should use fallback hierarchicalName in by-folder MD when helper returns empty", () => {
      const funcs = [
        { file: "root.js", line: 1, functionName: "__returnEmpty__", complexity: 1 },
      ];
      const boundaries = new Map();
      const fileToFuncs = new Map();
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("(root)");
      expect(result).toMatch(/\|\s*\|/);
    });

    it("should use fallback hierarchicalName in by-folder inner sort when two functions in same file", () => {
      const funcs = [
        { file: "lib/foo.js", line: 1, functionName: "normal", complexity: 1 },
        { file: "lib/foo.js", line: 5, functionName: "__returnEmpty__", complexity: 2 },
      ];
      const boundaries = new Map([
        ["lib/foo.js", new Map([[1, { start: 1, end: 20 }], [5, { start: 5, end: 10 }]])],
      ]);
      const fileToFuncs = new Map([["lib/foo.js", funcs]]);
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("lib/");
      expect(result).toContain("normal");
      expect(result).toMatch(/\|\s*\|/);
    });

    it("should generate file names alphabetical MD and escape backticks", () => {
      const fileToFuncs = new Map([
        ["src/`weird`.js", []],
        ["src/normal.js", []],
      ]);
      const result = generateFileNamesAlphabeticalMD(fileToFuncs);
      expect(result).toContain("# File Names");
      expect(result).toContain("\\`");
    });

    it("should generate functions by folder MD with multiple folders, files, and functions", () => {
      const funcs = [
        { file: "pkg/a.js", line: 1, functionName: "main", complexity: 1 },
        { file: "pkg/a.js", line: 5, functionName: "helper", complexity: 2 },
        { file: "pkg/b.js", line: 1, functionName: "run", complexity: 1 },
        { file: "other/c.js", line: 1, functionName: "init", complexity: 1 },
      ];
      const boundaries = new Map([
        ["pkg/a.js", new Map([[1, { start: 1, end: 20 }], [5, { start: 5, end: 10 }]])],
        ["pkg/b.js", new Map([[1, { start: 1, end: 5 }]])],
        ["other/c.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["pkg/a.js", [funcs[0], funcs[1]]],
        ["pkg/b.js", [funcs[2]]],
        ["other/c.js", [funcs[3]]],
      ]);
      const result = generateFunctionsByFolderMD(funcs, boundaries, fileToFuncs);
      expect(result).toContain("pkg/");
      expect(result).toContain("other/");
      expect(result).toContain("main");
      expect(result).toContain("helper");
      expect(result).toContain("run");
      expect(result).toContain("init");
      expect(result).toMatch(/\|\s*main\s*\|\s*1\s*\|/);
      expect(result).toContain("main → helper");
      expect(result).toMatch(/\|\s*2\s*\|/);
    });
  });

  describe("TXT exports", () => {
    const mockFunctions = [
      { file: "test.js", line: 1, functionName: "test", complexity: 1 },
    ];
    const mockBoundaries = new Map([
      ["test.js", new Map([[1, { start: 1, end: 5 }]])],
    ]);
    const mockFileToFunctions = new Map([
      ["test.js", mockFunctions],
    ]);

    it("should generate all functions TXT", () => {
      const result = generateAllFunctionsTXT(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("All Functions");
    });

    it("should run sort with hierarchicalName fallback to unknown in generateAllFunctionsTXT", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "__returnEmpty__", complexity: 1 },
        { file: "b.js", line: 1, functionName: "normal", complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 5 }]])],
        ["b.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["a.js", [funcs[0]]],
        ["b.js", [funcs[1]]],
      ]);
      const result = generateAllFunctionsTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("normal");
      expect(result).toContain("Total: 2 functions");
    });

    it("should generate functions by folder TXT", () => {
      const result = generateFunctionsByFolderTXT(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("Functions by Folder");
    });

    it("should generate leaf-only TXT with hierarchical names", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "parent", complexity: 1 },
        { file: "a.js", line: 5, functionName: "child", complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 10 }], [5, { start: 5, end: 8 }]])],
      ]);
      const fileToFuncs = new Map([["a.js", funcs]]);
      const result = generateAllFunctionsLeafOnlyTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("parent");
      expect(result).toContain("child");
    });

    it("should use fallback when file not in maps in generateAllFunctionsTXT", () => {
      const funcs = [
        { file: "only-in-funcs.js", line: 1, functionName: "alone", complexity: 1 },
      ];
      const result = generateAllFunctionsTXT(funcs, new Map(), new Map());
      expect(result).toContain("alone");
    });

    it("should use (root) and fallback in generateFunctionsByFolderTXT", () => {
      const funcs = [
        { file: "index.js", line: 1, functionName: "main", complexity: 1 },
      ];
      const boundaries = new Map([["index.js", new Map([[1, { start: 1, end: 5 }]])]]);
      const fileToFuncs = new Map([["index.js", funcs]]);
      const result = generateFunctionsByFolderTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("index.js");
      expect(result).toContain("main");
    });

    it("should use fallback when file not in maps in generateFunctionsByFolderTXT", () => {
      const funcs = [
        { file: "missing.js", line: 1, functionName: "fn", complexity: 1 },
      ];
      const result = generateFunctionsByFolderTXT(funcs, new Map(), new Map());
      expect(result).toContain("fn");
    });

    it("should generate functions by folder leaf-only TXT with hierarchy segment", () => {
      const funcs = [
        { file: "lib/a.js", line: 1, functionName: "parent", complexity: 1 },
        { file: "lib/a.js", line: 5, functionName: "child", complexity: 2 },
      ];
      const boundaries = new Map([
        ["lib/a.js", new Map([[1, { start: 1, end: 20 }], [5, { start: 5, end: 10 }]])],
      ]);
      const fileToFuncs = new Map([["lib/a.js", funcs]]);
      const result = generateFunctionsByFolderLeafOnlyTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("Leaf Names Only");
      expect(result).toContain("parent");
      expect(result).toContain("child");
    });

    it("should generate file names alphabetical TXT", () => {
      const fileToFuncs = new Map([
        ["src/a.js", []],
        ["src/b.js", []],
      ]);
      const result = generateFileNamesAlphabeticalTXT(fileToFuncs);
      expect(result).toContain("File Names");
      expect(result).toContain("src/a.js");
      expect(result).toContain("src/b.js");
    });

    it("should generate file names alphabetical TXT with empty map", () => {
      const result = generateFileNamesAlphabeticalTXT(new Map());
      expect(result).toContain("File Names");
      expect(result).toContain("Total files: 0");
    });

    it("should sort by leaf name in generateAllFunctionsLeafOnlyTXT when names have hierarchy", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "parent", complexity: 1 },
        { file: "a.js", line: 5, functionName: "child", complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 10 }], [5, { start: 5, end: 8 }]])],
      ]);
      const fileToFuncs = new Map([["a.js", funcs]]);
      const result = generateAllFunctionsLeafOnlyTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("child");
      expect(result).toContain("parent");
    });

    it("should handle null hierarchicalName in generateAllFunctionsLeafOnlyTXT (getLeafNameFromHierarchy)", () => {
      const funcs = [
        { file: "a.js", line: 1, functionName: "__returnNull__", complexity: 1 },
        { file: "b.js", line: 1, functionName: "normal", complexity: 1 },
      ];
      const boundaries = new Map([
        ["a.js", new Map([[1, { start: 1, end: 5 }]])],
        ["b.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([["a.js", [funcs[0]]], ["b.js", [funcs[1]]]]);
      const result = generateAllFunctionsLeafOnlyTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("normal");
      expect(result).toContain("Leaf Names Only");
    });

    it("should run by-folder TXT with multiple files in same folder (fileName and lines)", () => {
      const funcs = [
        { file: "pkg/a.js", line: 1, functionName: "main", complexity: 1 },
        { file: "pkg/b.js", line: 1, functionName: "run", complexity: 1 },
      ];
      const boundaries = new Map([
        ["pkg/a.js", new Map([[1, { start: 1, end: 5 }]])],
        ["pkg/b.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["pkg/a.js", [funcs[0]]],
        ["pkg/b.js", [funcs[1]]],
      ]);
      const result = generateFunctionsByFolderTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("Functions by Folder");
      expect(result).toContain("pkg/");
      expect(result).toContain("a.js");
      expect(result).toContain("b.js");
      expect(result).toContain("main");
      expect(result).toContain("run");
    });

    it("should run by-folder leaf-only TXT with multiple files and fallback unknown in sort", () => {
      const funcs = [
        { file: "lib/foo.js", line: 1, functionName: "parent", complexity: 1 },
        { file: "lib/bar.js", line: 1, functionName: "__returnEmpty__", complexity: 1 },
      ];
      const boundaries = new Map([
        ["lib/foo.js", new Map([[1, { start: 1, end: 10 }]])],
        ["lib/bar.js", new Map([[1, { start: 1, end: 5 }]])],
      ]);
      const fileToFuncs = new Map([
        ["lib/foo.js", [funcs[0]]],
        ["lib/bar.js", [funcs[1]]],
      ]);
      const result = generateFunctionsByFolderLeafOnlyTXT(funcs, boundaries, fileToFuncs);
      expect(result).toContain("Leaf Names Only");
      expect(result).toContain("lib/");
      expect(result).toContain("parent");
      expect(result).toContain("bar.js");
      expect(result).toContain("foo.js");
    });
  });

  describe("generateAllExports (index)", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it("should create export directory and generate all export files", () => {
      const allFunctions = [
        { file: "src/test.ts", line: 1, functionName: "foo", complexity: 1 },
      ];
      const projectRoot = "/project";
      const exportDir = join("/project", "complexity", "reports");

      const result = generateAllExports(allFunctions, projectRoot, exportDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(exportDir, { recursive: true });
      expect(result.exportDir).toBe(exportDir);
      expect(result.generatedFiles).toHaveLength(8);
      expect(result.generatedFiles).toContain(
        join(exportDir, "function-names.all.txt")
      );
      expect(result.generatedFiles).toContain(
        join(exportDir, "function-names.all.md")
      );
      expect(result.generatedFiles).toContain(
        join(exportDir, "function-names-by-file.txt")
      );
      expect(result.generatedFiles).toContain(
        join(exportDir, "file-names-alphabetical.txt")
      );
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should handle non-existent source files gracefully", () => {
      mockExistsSync.mockReturnValue(false);
      const allFunctions = [
        { file: "nonexistent/file.ts", line: 1, functionName: "bar", complexity: 2 },
      ];

      const result = generateAllExports(
        allFunctions,
        "/project",
        "/project/reports"
      );

      expect(result.generatedFiles).toHaveLength(8);
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it("should continue when mkdirSync throws (directory may already exist)", () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error("EEXIST");
      });
      const allFunctions = [
        { file: "src/test.ts", line: 1, functionName: "foo", complexity: 1 },
      ];

      const result = generateAllExports(
        allFunctions,
        "/project",
        "/project/reports"
      );

      expect(result.generatedFiles).toHaveLength(8);
    });

    it("should handle readFileSync errors when building boundaries", () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Cannot read file");
      });
      const allFunctions = [
        { file: "src/test.ts", line: 1, functionName: "foo", complexity: 1 },
      ];

      const result = generateAllExports(
        allFunctions,
        "/project",
        "/project/reports"
      );

      expect(result.generatedFiles).toHaveLength(8);
      expect(mockReadFileSync).toHaveBeenCalled();
    });
  });
});
