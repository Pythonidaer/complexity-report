import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockFindESLintConfig = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
  default: { readFileSync: mockReadFileSync },
  readFileSync: mockReadFileSync,
}));

vi.mock("../integration/eslint/index.js", () => ({
  findESLintConfig: mockFindESLintConfig,
}));

import { getComplexityThreshold } from "../integration/threshold/index.js";

describe("get-complexity-threshold", () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockFindESLintConfig.mockReset();
  });

  it("returns max threshold when valid config exists", () => {
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.js");
    mockReadFileSync.mockReturnValue(`
      complexity: ["warn", { max: 10, variant: "classic" }],
      other: ["warn", { max: 5 }]
    `);
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(mockFindESLintConfig).toHaveBeenCalledWith("/project/root");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/project/root/eslint.config.js",
      "utf-8"
    );
  });

  it("reads from eslint.config.mjs when that is the project config", () => {
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.mjs");
    mockReadFileSync.mockReturnValue(
      'complexity: ["warn", { max: 12, variant: "classic" }]'
    );
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(12);
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/project/root/eslint.config.mjs",
      "utf-8"
    );
  });

  it("reads from eslint.config.cjs when that is the project config", () => {
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.cjs");
    mockReadFileSync.mockReturnValue(
      "complexity: ['warn', { max: 8 }]"
    );
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(8);
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/project/root/eslint.config.cjs",
      "utf-8"
    );
  });

  it("returns maximum when multiple complexity blocks exist with different values", () => {
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.js");
    mockReadFileSync.mockReturnValue(`
      complexity: ["warn", { max: 10, variant: "classic" }],
      complexity: ["warn", { max: 15, variant: "modified" }]
    `);
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(15);
  });

  it("detects threshold when severity uses single quotes (e.g. 'warn')", () => {
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.js");
    mockReadFileSync.mockReturnValue(
      "complexity: ['warn', { max: 12, variant: 'classic' }],"
    );
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(12);
  });

  it("returns 10 and logs warning when no ESLint config found", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFindESLintConfig.mockReturnValue(null);
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      "No ESLint config found, defaulting complexity threshold to 10"
    );
    expect(mockReadFileSync).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns 10 and logs warning when no complexity threshold in config", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.js");
    mockReadFileSync.mockReturnValue("no complexity here");
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not find complexity threshold in config, defaulting to 10"
    );
    consoleSpy.mockRestore();
  });

  it("returns 10 and logs warning when config file read throws", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFindESLintConfig.mockReturnValue("/project/root/eslint.config.js");
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error reading ESLint config: ENOENT: no such file, defaulting to 10"
    );
    consoleSpy.mockRestore();
  });

  it("uses config path from findESLintConfig for given projectRoot", () => {
    mockFindESLintConfig.mockReturnValue("/my/project/eslint.config.mjs");
    mockReadFileSync.mockReturnValue(
      'complexity: ["warn", { max: 8, variant: "classic" }]'
    );
    const result = getComplexityThreshold("/my/project");
    expect(result).toBe(8);
    expect(mockFindESLintConfig).toHaveBeenCalledWith("/my/project");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/my/project/eslint.config.mjs",
      "utf-8"
    );
  });
});
