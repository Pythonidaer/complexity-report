import { describe, it, expect, beforeEach, vi } from "vitest";
import { join } from "path";
import {
  generateAllFunctionsMD,
  generateFunctionsByFolderMD,
} from "../export-generators/md-exports.js";
import {
  generateAllFunctionsTXT,
  generateFunctionsByFolderTXT,
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

    it("should generate functions by folder MD", () => {
      const result = generateFunctionsByFolderMD(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("# Functions by Folder");
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

    it("should generate functions by folder TXT", () => {
      const result = generateFunctionsByFolderTXT(
        mockFunctions,
        mockBoundaries,
        mockFileToFunctions
      );
      expect(result).toContain("Functions by Folder");
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
  });
});
