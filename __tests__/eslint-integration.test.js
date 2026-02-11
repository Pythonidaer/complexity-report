import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockMkdirSync = vi.hoisted(() => vi.fn(() => {}));
const mockWriteFileSync = vi.hoisted(() => vi.fn(() => {}));
const mockExistsSync = vi.hoisted(() => vi.fn(() => true));
const mockReadFileSync = vi.hoisted(() => vi.fn(() => ""));
const mockLintFiles = vi.hoisted(() => vi.fn(() => Promise.resolve([])));

vi.mock("fs", () => ({
  default: {
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

vi.mock("eslint", () => ({
  ESLint: vi.fn(function MockESLint(options) {
    // Return an instance with lintFiles method
    return {
      options,
      lintFiles: mockLintFiles
    };
  }),
}));

import { runESLintComplexityCheck, findESLintConfig, getComplexityVariant } from "../integration/eslint/index.js";
import { ESLint } from "eslint";

describe("eslint-integration", () => {
  const mockProjectRoot = "/project";

  beforeEach(() => {
    vi.clearAllMocks();
    // Make existsSync return true for eslint.config.js by default (so tests can run)
    mockExistsSync.mockImplementation((p) => p.endsWith("eslint.config.js"));
    mockLintFiles.mockResolvedValue([]);
    // Don't suppress console.log during tests so we can see debug output
    // vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findESLintConfig", () => {
    it("returns path for eslint.config.js when it exists", () => {
      mockExistsSync.mockImplementation((p) => p.endsWith("eslint.config.js"));
      const path = findESLintConfig(mockProjectRoot);
      expect(path).toContain("eslint.config.js");
    });

    it("returns path for eslint.config.mjs when .js missing", () => {
      mockExistsSync.mockImplementation((p) => p.endsWith("eslint.config.mjs"));
      const path = findESLintConfig(mockProjectRoot);
      expect(path).toContain("eslint.config.mjs");
    });

    it("returns path for eslint.config.cjs when .js and .mjs missing", () => {
      mockExistsSync.mockImplementation((p) => p.endsWith("eslint.config.cjs"));
      const path = findESLintConfig(mockProjectRoot);
      expect(path).toContain("eslint.config.cjs");
    });

    it("returns null when no config exists", () => {
      mockExistsSync.mockReturnValue(false);
      const path = findESLintConfig(mockProjectRoot);
      expect(path).toBeNull();
    });
  });

  describe("getComplexityVariant", () => {
    it("returns 'modified' when config content has variant: \"modified\"", () => {
      mockReadFileSync.mockReturnValue('complexity: ["warn", { max: 10, variant: "modified" }]');
      expect(getComplexityVariant("/project/eslint.config.js")).toBe("modified");
    });

    it("returns 'classic' when config content has no modified variant", () => {
      mockReadFileSync.mockReturnValue("complexity: ['warn', { max: 10 }]");
      expect(getComplexityVariant("/project/eslint.config.js")).toBe("classic");
    });

    it("returns 'classic' when readFileSync throws", () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(getComplexityVariant("/project/eslint.config.js")).toBe("classic");
    });
  });

  describe("runESLintComplexityCheck", () => {
    it("creates complexity dir and writes report to complexity/complexity-report.json", async () => {
      mockLintFiles.mockResolvedValue([{ filePath: "/project/src/test.ts", messages: [] }]);

      await runESLintComplexityCheck(mockProjectRoot);

      expect(mockMkdirSync).toHaveBeenCalled();
      const mkdirArg = mockMkdirSync.mock.calls[0][0];
      expect(mkdirArg).toContain("complexity");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[0]).toContain("complexity");
      expect(writeCall[0]).toContain("complexity-report.json");
      expect(JSON.parse(writeCall[1])).toEqual([{ filePath: "/project/src/test.ts", messages: [] }]);
    });

    it("uses project config via overrideConfigFile and overrides complexity rule (classic variant by default)", async () => {
      mockLintFiles.mockResolvedValue([]);
      mockReadFileSync.mockReturnValue(""); // no variant in config -> classic

      await runESLintComplexityCheck(mockProjectRoot);

      expect(ESLint).toHaveBeenCalledWith(
        expect.objectContaining({
          cwd: mockProjectRoot,
          overrideConfigFile: expect.stringContaining("eslint.config"),
          overrideConfig: {
            rules: {
              complexity: ["warn", { max: 0, variant: "classic" }],
            },
          },
        })
      );
    });

    it("uses variant 'modified' when project config has variant: \"modified\"", async () => {
      mockLintFiles.mockResolvedValue([]);
      mockReadFileSync.mockReturnValue('complexity: ["warn", { max: 10, variant: "modified" }]');

      await runESLintComplexityCheck(mockProjectRoot);

      expect(ESLint).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideConfig: {
            rules: {
              complexity: ["warn", { max: 0, variant: "modified" }],
            },
          },
        })
      );
    });

    it("returns lint results (same shape as --format=json)", async () => {
      const mockResults = [
        {
          filePath: "/project/src/test.ts",
          messages: [{ ruleId: "complexity", severity: 1, line: 10, message: "Function has a complexity of 5" }],
        },
      ];
      mockLintFiles.mockResolvedValue(mockResults);

      const result = await runESLintComplexityCheck(mockProjectRoot);

      expect(result).toEqual(mockResults);
    });

    it("exits with 1 and logs error when no ESLint config found", async () => {
      mockExistsSync.mockReturnValue(false);

      await runESLintComplexityCheck(mockProjectRoot);

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("exits with 1 when ESLint throws", async () => {
      mockLintFiles.mockRejectedValue(new Error("ESLint error"));

      await runESLintComplexityCheck(mockProjectRoot);

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("calls lintFiles with ['.']", async () => {
      mockLintFiles.mockResolvedValue([]);

      await runESLintComplexityCheck(mockProjectRoot);

      expect(mockLintFiles).toHaveBeenCalledWith(["."]);
    });
  });
});
