import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadFileSync = vi.hoisted(() => vi.fn());

vi.mock("fs", () => ({
  default: { readFileSync: mockReadFileSync },
  readFileSync: mockReadFileSync,
}));

import { getComplexityThreshold } from "../integration/threshold/index.js";

describe("get-complexity-threshold", () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
  });

  it("returns max threshold from eslint.config.js when valid config exists", () => {
    mockReadFileSync.mockReturnValue(`
      complexity: ["warn", { max: 10, variant: "classic" }],
      other: ["warn", { max: 5 }]
    `);
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("eslint.config.js"),
      "utf-8"
    );
  });

  it("returns maximum when multiple complexity blocks exist with different values", () => {
    mockReadFileSync.mockReturnValue(`
      complexity: ["warn", { max: 10, variant: "classic" }],
      complexity: ["warn", { max: 15, variant: "modified" }]
    `);
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(15);
  });

  it("detects threshold when severity uses single quotes (e.g. 'warn')", () => {
    mockReadFileSync.mockReturnValue(
      "complexity: ['warn', { max: 12, variant: 'classic' }],"
    );
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(12);
  });

  it("returns 10 and logs warning when no complexity threshold found", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockReadFileSync.mockReturnValue("no complexity here");
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Could not find complexity threshold in eslint.config.js, defaulting to 10"
    );
    consoleSpy.mockRestore();
  });

  it("returns 10 and logs warning when file read throws", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });
    const result = getComplexityThreshold("/project/root");
    expect(result).toBe(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error reading eslint.config.js: ENOENT: no such file, defaulting to 10"
    );
    consoleSpy.mockRestore();
  });

  it("resolves config path using projectRoot", () => {
    mockReadFileSync.mockReturnValue(
      'complexity: ["warn", { max: 8, variant: "classic" }]'
    );
    const result = getComplexityThreshold("/my/project");
    expect(result).toBe(8);
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/\/my\/project.*eslint\.config\.js/),
      "utf-8"
    );
  });
});
