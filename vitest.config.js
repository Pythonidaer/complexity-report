import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Include all JavaScript files except tests and excluded directories
      include: [
        "report/**/*.js",
        "integration/**/*.js",
        "function-boundaries/**/*.js",
        "function-extraction/**/*.js",
        "decision-points/**/*.js",
        "html-generators/**/*.js",
        "export-generators/**/*.js",
        "complexity-breakdown.js",
        "function-hierarchy.js"
      ],
      exclude: [
        "__tests__/**",
        "**/*.test.js",
        "**/*.spec.js",
        "tools/**",
        "assets/**",
        "docs/**",
        // Main entry point (orchestration only, tested via integration)
        "report/index.js",
        "report/cli.js",
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 65,
      },
    },
  },
});
