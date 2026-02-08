/**
 * Tests for analyze-ast-mismatches.js
 * Tests AST parser mismatch analysis functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules using vi.hoisted to ensure they're available when modules are imported
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockRunESLintComplexityCheck = vi.hoisted(() => vi.fn());
const mockExtractFunctionName = vi.hoisted(() => vi.fn());
const mockExtractFunctionsFromESLintResults = vi.hoisted(() => vi.fn());
const mockFindFunctionBoundaries = vi.hoisted(() => vi.fn());
const mockParseDecisionPointsAST = vi.hoisted(() => vi.fn());
const mockCalculateComplexityBreakdown = vi.hoisted(() => vi.fn());

// Mock fs module
vi.mock('fs', () => ({
  default: {
    writeFileSync: mockWriteFileSync,
    readFileSync: mockReadFileSync,
  },
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
}));

// Don't mock path - use real module
// vi.mock('path', ...) removed - use actual path module

// Mock url module - must be hoisted
const mockFileURLToPath = vi.hoisted(() => {
  return vi.fn((url) => {
    // Handle import.meta.url - return a mock path
    if (typeof url === 'string') {
      return url.replace('file://', '');
    }
    return '/mock/path/to/scripts/tools/analyze-ast-mismatches/index.js';
  });
});

vi.mock('url', async () => {
  const actual = await vi.importActual('url');
  return {
    ...actual,
    default: {
      ...actual,
      fileURLToPath: mockFileURLToPath,
    },
    fileURLToPath: mockFileURLToPath,
  };
});

// Mock imported modules
vi.mock('../integration/eslint/index.js', () => ({
  runESLintComplexityCheck: mockRunESLintComplexityCheck,
  findESLintConfig: vi.fn(() => '/mock/eslint.config.js'),
  getComplexityVariant: vi.fn(() => 'classic'),
}));

vi.mock('../function-extraction/index.js', () => ({
  extractFunctionName: mockExtractFunctionName,
  extractFunctionsFromESLintResults: mockExtractFunctionsFromESLintResults,
}));

vi.mock('../function-boundaries/index.js', () => ({
  findFunctionBoundaries: mockFindFunctionBoundaries,
}));

vi.mock('../decision-points/index.js', () => ({
  parseDecisionPointsAST: mockParseDecisionPointsAST,
}));

vi.mock('../complexity-breakdown.js', () => ({
  calculateComplexityBreakdown: mockCalculateComplexityBreakdown,
}));

// Suppress console.log during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('analyze-ast-mismatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
    // Mock process.exit to prevent test from exiting
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    // Set up default mocks
    mockExtractFunctionName.mockImplementation((func) => func.name || 'anonymous');
    // Mock fileURLToPath to return a predictable path
    mockFileURLToPath.mockReturnValue('/mock/path/to/scripts/tools/analyze-ast-mismatches/index.js');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  describe('analyzeASTMismatches', () => {
    it('processes functions and detects no mismatches when all match', async () => {
      // Setup mocks
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            {
              ruleId: 'complexity',
              line: 2,
              message: "Function 'testFunc' has a complexity of 3.",
            },
          ],
        },
      ];

      const mockFunctions = [
        {
          functionName: 'testFunc',
          file: 'src/test.ts',
          line: 2,
          complexity: '3',
        },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 10 }],
      ]);

      const mockDecisionPoints = [
        { line: 3, type: 'if', functionLine: 2 },
        { line: 5, type: '&&', functionLine: 2 },
      ];

      const mockBreakdown = {
        calculatedTotal: 3, // base (1) + if (1) + && (1) = 3
        decisionPoints: mockDecisionPoints,
      };

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() { if (x && y) {} }');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue(mockDecisionPoints);
      mockCalculateComplexityBreakdown.mockReturnValue(mockBreakdown);

      // Import the exported function
      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      // Verify no mismatches were reported
      expect(mockWriteFileSync).toHaveBeenCalled();
      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      expect(writeCall).toBeTruthy();
      const report = JSON.parse(writeCall[1]);
      expect(report.summary.totalMismatches).toBe(0);
      expect(report.mismatches).toEqual([]);
    });

    it('detects mismatches when calculated complexity differs from ESLint', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            {
              ruleId: 'complexity',
              line: 2,
              message: "Function 'testFunc' has a complexity of 5.",
            },
          ],
        },
      ];

      const mockFunctions = [
        {
          functionName: 'testFunc',
          file: 'src/test.ts',
          line: 2,
          complexity: '5',
        },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 10 }],
      ]);

      const mockDecisionPoints = [
        { line: 3, type: 'if', functionLine: 2 },
        { line: 5, type: '&&', functionLine: 2 },
      ];

      // Calculated total is 3, but ESLint says 5 - mismatch!
      const mockBreakdown = {
        calculatedTotal: 3,
        decisionPoints: mockDecisionPoints,
      };

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() { if (x && y) {} }');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue(mockDecisionPoints);
      mockCalculateComplexityBreakdown.mockReturnValue(mockBreakdown);

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      // Verify mismatch was detected
      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      expect(report.summary.totalMismatches).toBe(1);
      expect(report.mismatches.length).toBe(1);
      expect(report.mismatches[0].functionName).toBe('testFunc');
      expect(report.mismatches[0].actualComplexity).toBe(5);
      expect(report.mismatches[0].calculatedTotal).toBe(3);
      expect(report.mismatches[0].difference).toBe(-2);
    });

    it('groups functions by file correctly', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/file1.ts',
          messages: [
            {
              ruleId: 'complexity',
              line: 2,
              message: "Function 'func1' has a complexity of 2.",
            },
          ],
        },
        {
          filePath: 'src/file2.ts',
          messages: [
            {
              ruleId: 'complexity',
              line: 5,
              message: "Function 'func2' has a complexity of 3.",
            },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'func1', file: 'src/file1.ts', line: 2, complexity: '2' },
        { functionName: 'func2', file: 'src/file2.ts', line: 5, complexity: '3' },
      ];

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync
        .mockReturnValueOnce('function func1() {}')
        .mockReturnValueOnce('function func2() {}');
      mockFindFunctionBoundaries
        .mockReturnValueOnce(new Map([[2, { start: 2, end: 5 }]]))
        .mockReturnValueOnce(new Map([[5, { start: 5, end: 8 }]]));
      mockParseDecisionPointsAST
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockCalculateComplexityBreakdown
        .mockReturnValue({ calculatedTotal: 2, decisionPoints: [] })
        .mockReturnValue({ calculatedTotal: 3, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      // Verify both files were processed
      expect(mockReadFileSync).toHaveBeenCalledTimes(2);
      expect(mockFindFunctionBoundaries).toHaveBeenCalledTimes(2);
      expect(mockParseDecisionPointsAST).toHaveBeenCalledTimes(2);
    });

    it('sorts mismatches by absolute difference', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'func1' has a complexity of 2." },
            { ruleId: 'complexity', line: 5, message: "Function 'func2' has a complexity of 10." },
            { ruleId: 'complexity', line: 8, message: "Function 'func3' has a complexity of 5." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'func1', file: 'src/test.ts', line: 2, complexity: '2' },
        { functionName: 'func2', file: 'src/test.ts', line: 5, complexity: '10' },
        { functionName: 'func3', file: 'src/test.ts', line: 8, complexity: '5' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
        [5, { start: 5, end: 7 }],
        [8, { start: 8, end: 10 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function func1() {} function func2() {} function func3() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      
      // func1: calculated 1, actual 2, diff = -1
      // func2: calculated 1, actual 10, diff = -9 (largest)
      // func3: calculated 1, actual 5, diff = -4
      mockCalculateComplexityBreakdown
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] }) // func1
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] }) // func2
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] }); // func3

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      // Should be sorted by absolute difference: func2 (-9), func3 (-4), func1 (-1)
      expect(report.mismatches.length).toBe(3);
      expect(report.mismatches[0].functionName).toBe('func2');
      expect(report.mismatches[0].difference).toBe(-9);
      expect(report.mismatches[1].functionName).toBe('func3');
      expect(report.mismatches[1].difference).toBe(-4);
      expect(report.mismatches[2].functionName).toBe('func1');
      expect(report.mismatches[2].difference).toBe(-1);
    });

    it('includes decision points in mismatch report', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 5." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '5' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 10 }],
      ]);

      const mockDecisionPoints = [
        { line: 3, type: 'if', functionLine: 2 },
        { line: 5, type: '&&', functionLine: 2 },
        { line: 7, type: 'for', functionLine: 2 },
      ];

      const mockBreakdown = {
        calculatedTotal: 3,
        decisionPoints: mockDecisionPoints,
      };

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() { if (x && y) { for (let i = 0; i < 10; i++) {} } }');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue(mockDecisionPoints);
      mockCalculateComplexityBreakdown.mockReturnValue(mockBreakdown);

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.mismatches[0].decisionPointsFound).toBe(3);
      expect(report.mismatches[0].decisionPoints).toEqual([
        { type: 'if', line: 3 },
        { type: '&&', line: 5 },
        { type: 'for', line: 7 },
      ]);
    });

    it('includes boundary information in mismatch report', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 5." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '5' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 15 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      mockCalculateComplexityBreakdown.mockReturnValue({ calculatedTotal: 1, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.mismatches[0].boundary).toEqual({ start: 2, end: 15 });
    });

    it('handles missing boundary gracefully', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 5." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '5' },
      ];

      const mockBoundaries = new Map(); // No boundary for line 2

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      mockCalculateComplexityBreakdown.mockReturnValue({ calculatedTotal: 1, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.mismatches[0].boundary).toBeNull();
    });

    it('calculates accuracy percentage correctly', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'func1' has a complexity of 2." },
            { ruleId: 'complexity', line: 5, message: "Function 'func2' has a complexity of 3." },
            { ruleId: 'complexity', line: 8, message: "Function 'func3' has a complexity of 4." },
            { ruleId: 'complexity', line: 11, message: "Function 'func4' has a complexity of 5." },
            { ruleId: 'complexity', line: 14, message: "Function 'func5' has a complexity of 6." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'func1', file: 'src/test.ts', line: 2, complexity: '2' },
        { functionName: 'func2', file: 'src/test.ts', line: 5, complexity: '3' },
        { functionName: 'func3', file: 'src/test.ts', line: 8, complexity: '4' },
        { functionName: 'func4', file: 'src/test.ts', line: 11, complexity: '5' },
        { functionName: 'func5', file: 'src/test.ts', line: 14, complexity: '6' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
        [5, { start: 5, end: 7 }],
        [8, { start: 8, end: 10 }],
        [11, { start: 11, end: 13 }],
        [14, { start: 14, end: 16 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function func1() {} function func2() {} function func3() {} function func4() {} function func5() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      
      // 2 mismatches out of 5 functions = 60% accuracy
      mockCalculateComplexityBreakdown
        .mockReturnValueOnce({ calculatedTotal: 2, decisionPoints: [] }) // func1 - match
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] }) // func2 - mismatch
        .mockReturnValueOnce({ calculatedTotal: 4, decisionPoints: [] }) // func3 - match
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] }) // func4 - mismatch
        .mockReturnValueOnce({ calculatedTotal: 6, decisionPoints: [] }); // func5 - match

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.summary.totalProcessed).toBe(5);
      expect(report.summary.totalMismatches).toBe(2);
      expect(report.summary.accuracy).toBe('60.00%');
    });

    it('handles file processing errors gracefully', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 2." },
          ],
        },
        {
          filePath: 'src/error.ts',
          messages: [
            { ruleId: 'complexity', line: 5, message: "Function 'errorFunc' has a complexity of 3." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '2' },
        { functionName: 'errorFunc', file: 'src/error.ts', line: 5, complexity: '3' },
      ];

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync
        .mockReturnValueOnce('function testFunc() {}')
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        });

      const { analyzeASTMismatches } = await import('../tools/analyze-ast-mismatches/index.js');
      
      // Should not throw, but log error
      await analyzeASTMismatches();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing file'),
        expect.any(String)
      );
    });

    it('limits top mismatches display to 20', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: Array.from({ length: 25 }, (_, i) => ({
            ruleId: 'complexity',
            line: i * 3 + 2,
            message: `Function 'func${i}' has a complexity of ${i + 1}.`,
          })),
        },
      ];

      const mockFunctions = Array.from({ length: 25 }, (_, i) => ({
        functionName: `func${i}`,
        file: 'src/test.ts',
        line: i * 3 + 2,
        complexity: String(i + 1),
      }));

      const mockBoundaries = new Map(
        mockFunctions.map(f => [f.line, { start: f.line, end: f.line + 2 }])
      );

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue(mockFunctions.map(f => `function ${f.functionName}() {}`).join(' '));
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      
      // All are mismatches (calculated 1, actual varies)
      mockCalculateComplexityBreakdown.mockReturnValue({ calculatedTotal: 1, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      // Verify console.log was called with top 20
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const topMismatchesLog = logCalls.find(log => 
        typeof log === 'string' && log.includes('Top 20')
      );
      expect(topMismatchesLog).toBeTruthy();
      
      // Count mismatch entries in console output (each has function name)
      const mismatchLogs = logCalls.filter(log => 
        typeof log === 'string' && /^\d+\. \w+/.test(log)
      );
      expect(mismatchLogs.length).toBeLessThanOrEqual(20);
    });

    it('handles positive and negative differences', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'under' has a complexity of 2." },
            { ruleId: 'complexity', line: 5, message: "Function 'over' has a complexity of 2." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'under', file: 'src/test.ts', line: 2, complexity: '2' },
        { functionName: 'over', file: 'src/test.ts', line: 5, complexity: '2' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
        [5, { start: 5, end: 7 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function under() {} function over() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      
      // under: calculated 1, actual 2, diff = -1 (underestimated)
      // over: calculated 5, actual 2, diff = +3 (overestimated)
      mockCalculateComplexityBreakdown
        .mockReturnValueOnce({ calculatedTotal: 1, decisionPoints: [] })
        .mockReturnValueOnce({ calculatedTotal: 5, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.mismatches.length).toBe(2);
      // Should be sorted by absolute difference: over (+3), under (-1)
      expect(report.mismatches[0].functionName).toBe('over');
      expect(report.mismatches[0].difference).toBe(3);
      expect(report.mismatches[1].functionName).toBe('under');
      expect(report.mismatches[1].difference).toBe(-1);
    });

    it('formats difference with + sign for positive differences in console output', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 2." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '2' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      mockCalculateComplexityBreakdown.mockReturnValue({ calculatedTotal: 5, decisionPoints: [] });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      // Check console output includes + sign for positive difference
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const differenceLog = logCalls.find(log => 
        typeof log === 'string' && log.includes('Difference: +')
      );
      expect(differenceLog).toBeTruthy();
    });

    it('handles empty decision points array', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 2." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '2' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      mockCalculateComplexityBreakdown.mockReturnValue({ 
        calculatedTotal: 1, 
        decisionPoints: [] // Empty array
      });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      expect(report.mismatches[0].decisionPointsFound).toBe(0);
      expect(report.mismatches[0].decisionPoints).toEqual([]);
    });

    it('handles undefined decisionPoints in breakdown', async () => {
      const mockESLintResults = [
        {
          filePath: 'src/test.ts',
          messages: [
            { ruleId: 'complexity', line: 2, message: "Function 'testFunc' has a complexity of 2." },
          ],
        },
      ];

      const mockFunctions = [
        { functionName: 'testFunc', file: 'src/test.ts', line: 2, complexity: '2' },
      ];

      const mockBoundaries = new Map([
        [2, { start: 2, end: 4 }],
      ]);

      mockRunESLintComplexityCheck.mockReturnValue(mockESLintResults);
      mockExtractFunctionsFromESLintResults.mockReturnValue(mockFunctions);
      mockReadFileSync.mockReturnValue('function testFunc() {}');
      mockFindFunctionBoundaries.mockReturnValue(mockBoundaries);
      mockParseDecisionPointsAST.mockResolvedValue([]);
      mockCalculateComplexityBreakdown.mockReturnValue({ 
        calculatedTotal: 1,
        // decisionPoints is undefined
      });

      const module = await import('../tools/analyze-ast-mismatches/index.js');
      await module.analyzeASTMismatches();

      const writeCall = mockWriteFileSync.mock.calls.find(call => 
        call[0].includes('ast-mismatch-report.json')
      );
      const report = JSON.parse(writeCall[1]);
      
      // Should handle undefined gracefully
      expect(report.mismatches[0].decisionPointsFound).toBe(0);
      expect(report.mismatches[0].decisionPoints).toEqual([]);
    });
  });
});
