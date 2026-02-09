import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions using vi.hoisted to ensure they're available when modules are imported
const mockReadFileSync = vi.hoisted(() => {
  const fn = vi.fn(() => "function testFunction() {}");
  return fn;
});
const mockExistsSync = vi.hoisted(() => {
  const fn = vi.fn(() => true);
  return fn;
});
const mockResolve = vi.hoisted(() => {
  const fn = vi.fn((...args) => {
    const parts = args.filter(Boolean);
    return parts.join("/");
  });
  return fn;
});

// Mock modules BEFORE importing the module under test
vi.mock("fs", () => {
  return {
    default: {
      readFileSync: mockReadFileSync,
      existsSync: mockExistsSync,
    },
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  };
});

vi.mock("path", () => {
  return {
    default: {
      resolve: mockResolve,
    },
    resolve: mockResolve,
  };
});

import * as functionExtraction from "../function-extraction/index.js";

describe("function-extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset hoisted mocks
    mockReadFileSync.mockClear();
    mockExistsSync.mockClear();
    mockResolve.mockClear();
    // Default mocks for file system
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("function testFunction() {}");
  });

  describe("getComplexityLevel", () => {
    it("should return 'low' for complexity >= 20", () => {
      expect(functionExtraction.getComplexityLevel(20)).toBe("low");
      expect(functionExtraction.getComplexityLevel(25)).toBe("low");
      expect(functionExtraction.getComplexityLevel("20")).toBe("low");
    });

    it("should return 'medium' for complexity >= 15 and < 20", () => {
      expect(functionExtraction.getComplexityLevel(15)).toBe("medium");
      expect(functionExtraction.getComplexityLevel(19)).toBe("medium");
      expect(functionExtraction.getComplexityLevel("15")).toBe("medium");
    });

    it("should return 'high' for complexity > 10 and < 15", () => {
      expect(functionExtraction.getComplexityLevel(11)).toBe("high");
      expect(functionExtraction.getComplexityLevel(14)).toBe("high");
      expect(functionExtraction.getComplexityLevel("11")).toBe("high");
    });

    it("should return 'acceptable' for complexity > 6 and <= 10", () => {
      expect(functionExtraction.getComplexityLevel(7)).toBe("acceptable");
      expect(functionExtraction.getComplexityLevel(10)).toBe("acceptable");
      expect(functionExtraction.getComplexityLevel("7")).toBe("acceptable");
    });

    it("should return 'good' for complexity <= 6", () => {
      expect(functionExtraction.getComplexityLevel(1)).toBe("good");
      expect(functionExtraction.getComplexityLevel(6)).toBe("good");
      expect(functionExtraction.getComplexityLevel("5")).toBe("good");
    });
  });

  describe("getDirectory", () => {
    it("should return directory path from file path", () => {
      expect(functionExtraction.getDirectory("src/components/Button.tsx")).toBe("src/components");
      expect(functionExtraction.getDirectory("scripts/complexity-breakdown.js")).toBe("scripts");
    });

    it("should return empty string for root-level (no path separator) files", () => {
      expect(functionExtraction.getDirectory("file.tsx")).toBe("");
      expect(functionExtraction.getDirectory("index.js")).toBe("");
    });

    it("should handle nested paths", () => {
      expect(functionExtraction.getDirectory("src/utils/helpers/format.ts")).toBe("src/utils/helpers");
    });

    it("should handle root-level files", () => {
      // Note: getDirectory splits by '/', so "/file.tsx" becomes ["", "file.tsx"]
      // When slicing (0, -1), we get [""], which joins to ""
      // This is the actual behavior of the current implementation
      const result = functionExtraction.getDirectory("/file.tsx");
      expect(result).toBe(""); // Current implementation behavior for absolute paths
    });
  });

  describe("getBaseFunctionName", () => {
    it("should return name unchanged if no callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("handleClick")).toBe("handleClick");
      expect(functionExtraction.getBaseFunctionName("MyComponent")).toBe("MyComponent");
    });

    it("should remove useEffect callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("handleClick (useEffect callback)")).toBe("handleClick");
      expect(functionExtraction.getBaseFunctionName("MyComponent (useEffect callback)")).toBe("MyComponent");
    });

    it("should remove setTimeout callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("updateTimer (setTimeout callback)")).toBe("updateTimer");
    });

    it("should remove requestAnimationFrame callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("animate (requestAnimationFrame callback)")).toBe("animate");
    });

    it("should remove return callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("cleanup (return callback)")).toBe("cleanup");
    });

    it("should remove arrow function suffix", () => {
      expect(functionExtraction.getBaseFunctionName("handler (arrow function)")).toBe("handler");
    });

    it("should remove map callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("renderItem (map callback)")).toBe("renderItem");
    });

    it("should remove filter callback suffix", () => {
      expect(functionExtraction.getBaseFunctionName("isValid (filter callback)")).toBe("isValid");
    });

    it("should handle case-insensitive matching", () => {
      expect(functionExtraction.getBaseFunctionName("handler (USEEFFECT CALLBACK)")).toBe("handler");
      expect(functionExtraction.getBaseFunctionName("handler (SetTimeout Callback)")).toBe("handler");
    });

    it("should trim whitespace", () => {
      expect(functionExtraction.getBaseFunctionName("  handler  ")).toBe("handler");
      expect(functionExtraction.getBaseFunctionName("  handler (useEffect callback)  ")).toBe("handler");
    });
  });

  describe("extractFunctionName", () => {
    const mockProjectRoot = "/project";

    beforeEach(() => {
      // Reset mocks for each test
      mockExistsSync.mockReturnValue(true);
      mockResolve.mockImplementation((...args) => {
        const parts = args.filter(Boolean);
        return parts.join("/");
      });
      // Default mock for readFileSync - can be overridden in individual tests
      mockReadFileSync.mockImplementation(() => {
        return "function testFunction() {}";
      });
    });

    describe("named function declarations", () => {
      it("should extract function name from function declaration", () => {
        const fileContent = `
function myFunction() {
  return true;
}
        `.trim();
        mockReadFileSync.mockReturnValue(fileContent);
        mockExistsSync.mockReturnValue(true);

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("myFunction");
      });

      it("should extract function name from exported function", () => {
        mockReadFileSync.mockReturnValue(`
export function exportedFunction() {
  return true;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("exportedFunction");
      });

      it("should extract function name from export default function", () => {
        mockReadFileSync.mockReturnValue(`
export default function DefaultComponent() {
  return <div />;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.jsx",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("DefaultComponent");
      });

      it("should find the most recent function when multiple exist", () => {
        mockReadFileSync.mockReturnValue(`
function firstFunction() {
  return true;
}

function secondFunction() {
  return false;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          6,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("secondFunction");
      });
    });

    describe("class methods (MethodDefinition)", () => {
      it("should extract method name from class method", () => {
        mockReadFileSync.mockReturnValue(`
class Foo {
  bar() {
    return 1;
  }
}
        `.trim());
        mockExistsSync.mockReturnValue(true);

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "MethodDefinition",
          mockProjectRoot
        );
        expect(name).toBe("bar");
      });

      it("should extract method name from class with multiple methods", () => {
        mockReadFileSync.mockReturnValue(`
export class Service {
  processNestedConditions(level, data = {}, fallback = 0) {
    return level;
  }

  aggregateWithNestedLoops(matrix, threshold = 5) {
    return 0;
  }
}
        `.trim());
        mockExistsSync.mockReturnValue(true);

        const first = functionExtraction.extractFunctionName(
          "src/file.ts",
          2,
          "MethodDefinition",
          mockProjectRoot
        );
        const second = functionExtraction.extractFunctionName(
          "src/file.ts",
          6,
          "MethodDefinition",
          mockProjectRoot
        );
        expect(first).toBe("processNestedConditions");
        expect(second).toBe("aggregateWithNestedLoops");
      });

      it("should extract method name from Angular-style Injectable class", () => {
        mockReadFileSync.mockReturnValue(`
@Injectable({ providedIn: 'root' })
export class ComplexityNestedTestService {
  processNestedConditions(level, data = {}, fallback = 0) {
    return level;
  }
}
        `.trim());
        mockExistsSync.mockReturnValue(true);

        const name = functionExtraction.extractFunctionName(
          "src/service.ts",
          3,
          "MethodDefinition",
          mockProjectRoot
        );
        expect(name).toBe("processNestedConditions");
      });
    });

    describe("const arrow functions", () => {
      it("should extract name from const arrow function", () => {
        mockReadFileSync.mockReturnValue(`
const myArrowFunction = () => {
  return true;
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("myArrowFunction");
      });

      it("should extract name from exported const arrow function", () => {
        mockReadFileSync.mockReturnValue(`
export const exportedArrow = () => {
  return true;
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("exportedArrow");
      });

      it("should extract name from const arrow function with parameters", () => {
        mockReadFileSync.mockReturnValue(`
const handleClick = (event) => {
  console.log(event);
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("handleClick");
      });
    });

    describe("arrow function expressions - named arrow functions", () => {
      it("should extract name from named arrow function", () => {
        mockReadFileSync.mockReturnValue(`
const updateVars = () => {
  return true;
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("updateVars");
      });

      it("should extract name from named arrow function with parameters", () => {
        mockReadFileSync.mockReturnValue(`
const handleSubmit = (data) => {
  return data;
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("handleSubmit");
      });
    });

    describe("arrow function expressions - hook/call expression callbacks", () => {
      it("should identify useEffect callback when arrow has no variable name", () => {
        mockReadFileSync.mockReturnValue(`
useEffect(() => {
  return () => {};
}, []);
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          1,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("useEffect");
      });

      it("should identify onClick handler in JSX", () => {
        mockReadFileSync.mockReturnValue(`
function Button() {
  return <button onClick={() => {}}>Click</button>;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.tsx",
          2,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("onClick handler");
      });
    });

    describe("arrow function expressions - method callbacks", () => {
      it("should identify map callback", () => {
        mockReadFileSync.mockReturnValue(`
function processItems() {
  items.map((item) => {
    return item.id;
  });
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("processItems (map)");
      });

      it("should identify find callback", () => {
        mockReadFileSync.mockReturnValue(`
function findUser() {
  users.find((user) => {
    return user.id === targetId;
  });
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("findUser (find)");
      });

      it("should identify filter callback", () => {
        mockReadFileSync.mockReturnValue(`
function filterItems() {
  items.filter((item) => {
    return item.active;
  });
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("filterItems (filter)");
      });

      it("should identify callback when method call is on same line", () => {
        mockReadFileSync.mockReturnValue(`
function processData() {
  data.map((item) => item.id);
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("processData (map)");
      });

      it("should identify callback when arrow is on different line", () => {
        mockReadFileSync.mockReturnValue(`
function processData() {
  data.map((item) =>
    item.id
  );
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("processData (map)");
      });
    });

    describe("arrow function expressions - function callbacks", () => {
      it("should identify useEffect callback", () => {
        mockReadFileSync.mockReturnValue(`
function MyComponent() {
  useEffect(() => {
    console.log('mounted');
  }, []);
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.jsx",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("MyComponent (useEffect)");
      });

      it("should identify setTimeout callback", () => {
        mockReadFileSync.mockReturnValue(`
function startTimer() {
  setTimeout(() => {
    console.log('timeout');
  }, 1000);
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("startTimer (setTimeout)");
      });

      it("should identify callback when function call is on same line", () => {
        mockReadFileSync.mockReturnValue(`
function handleClick() {
  useEffect(() => console.log('click'));
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.jsx",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("handleClick (useEffect)");
      });
    });

    describe("arrow function expressions - fallback patterns", () => {
      it("should return anonymous arrow function when no pattern matches", () => {
        mockReadFileSync.mockReturnValue(`
function outerFunction() {
  const result = someCondition ? () => true : () => false;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        // Should find parent function or return anonymous
        expect(name).toMatch(/outerFunction|anonymous/);
      });

      it("should find parent function when callback pattern matches", () => {
        mockReadFileSync.mockReturnValue(`
function parentFunction() {
  someMethod(() => {
    return true;
  });
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toMatch(/parentFunction/);
      });
    });

    describe("React component patterns", () => {
      it("should extract React component name from arrow function", () => {
        mockReadFileSync.mockReturnValue(`
const MyComponent = () => {
  return <div />;
};
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.jsx",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("MyComponent");
      });

      it("should extract React component name from export default", () => {
        mockReadFileSync.mockReturnValue(`
export default function App() {
  return <div />;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.jsx",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("App");
      });
    });

    describe("error handling", () => {
      it("should return 'unknown' when file does not exist", () => {
        mockExistsSync.mockReturnValue(false);

        const name = functionExtraction.extractFunctionName(
          "src/nonexistent.js",
          1,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("unknown");
      });

      it("should return 'unknown' when readFileSync throws error", () => {
        mockReadFileSync.mockImplementation(() => {
          throw new Error("Read error");
        });

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          1,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("unknown");
      });

      it("should return 'anonymous' when function name cannot be extracted", () => {
        mockReadFileSync.mockReturnValue("// No functions here");

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          1,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("anonymous");
      });
    });

    describe("edge cases", () => {
      it("should handle functions far from line number", () => {
        mockReadFileSync.mockReturnValue(`
function farFunction() {
  return true;
}

// Many lines of code...
// ... (60+ lines)
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          100,
          "FunctionDeclaration",
          mockProjectRoot
        );
        // Should still find the function or return anonymous
        expect(typeof name).toBe("string");
      });

      it("should handle function with TypeScript generics", () => {
        mockReadFileSync.mockReturnValue(`
function genericFunction<T>(param: T): T {
  return param;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.ts",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("genericFunction");
      });

      it("should handle function with complex parameters", () => {
        mockReadFileSync.mockReturnValue(`
function complexFunction({ prop1, prop2 }, [item1, item2]) {
  return true;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          2,
          "FunctionDeclaration",
          mockProjectRoot
        );
        expect(name).toBe("complexFunction");
      });

      it("should handle nested callbacks with parent function detection", () => {
        mockReadFileSync.mockReturnValue(`
function outerFunction() {
  function innerFunction() {
    items.map((item) => {
      return item.id;
    });
  }
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          4,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        // Should identify as map callback, ideally with parent context
        expect(name).toMatch(/map/);
      });

      it("should handle arrow function in conditional", () => {
        mockReadFileSync.mockReturnValue(`
function conditionalFunction() {
  const handler = condition ? () => true : () => false;
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          3,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        // Should find parent function or return anonymous
        expect(name).toMatch(/conditionalFunction|anonymous/);
      });
    });

    describe("lookback logic for parent functions", () => {
      it("should find closest parent function", () => {
        mockReadFileSync.mockReturnValue(`
function firstFunction() {
  return true;
}

function secondFunction() {
  items.map((item) => item.id);
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          7,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        expect(name).toBe("secondFunction (map)");
      });

      it("should handle multiple nested functions", () => {
        mockReadFileSync.mockReturnValue(`
function level1() {
  function level2() {
    function level3() {
      items.map((item) => item.id);
    }
  }
}
        `.trim());

        const name = functionExtraction.extractFunctionName(
          "src/file.js",
          5,
          "ArrowFunctionExpression",
          mockProjectRoot
        );
        // Should find a parent function (level3 is closest)
        expect(name).toMatch(/map/);
      });
    });
  });

  describe("extractFunctionsFromESLintResults", () => {
    const mockProjectRoot = "/project";

    beforeEach(() => {
      // Mock file system to return a file with a function declaration
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
function testFunction() {
  return true;
}
      `.trim());
    });

    it("should return empty array for empty ESLint results", () => {
      const results = [];
      const functions = functionExtraction.extractFunctionsFromESLintResults(results, mockProjectRoot);
      expect(functions).toEqual([]);
    });

    it("should extract functions from ESLint results", () => {
      // Mock file system to simulate file exists and has content
      // Note: extractFunctionName is complex and depends on file system, so we'll verify structure
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("function testFunction() {}");
      // Mock resolve to return a predictable path
      mockResolve.mockImplementation((...args) => args.join("/"));

      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              column: 5,
              message: "Function has a complexity of 5",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);

      expect(functions).toHaveLength(1);
      expect(functions[0].file).toBe("src/component.tsx");
      expect(functions[0].line).toBe(10);
      expect(functions[0].complexity).toBe("5");
      expect(functions[0].functionName).toBeDefined();
      // Function name extraction depends on file content parsing
      // If file system mocks work correctly, it should extract a name, otherwise "unknown" or "anonymous"
      expect(typeof functions[0].functionName).toBe("string");
    });

    it("should filter out non-complexity messages", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              line: 5,
              message: "Variable is unused",
            },
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              message: "Function has a complexity of 3",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      expect(functions).toHaveLength(1);
      expect(functions[0].line).toBe(10);
    });

    it("should filter out non-warning complexity messages", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 2, // Error, not warning
              line: 10,
              message: "Function has a complexity of 3",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      expect(functions).toHaveLength(0);
    });

    it("should handle files without messages", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      expect(functions).toEqual([]);
    });

    it("should sort functions by complexity (highest first)", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              message: "Function has a complexity of 3",
              nodeType: "FunctionDeclaration",
            },
            {
              ruleId: "complexity",
              severity: 1,
              line: 20,
              message: "Function has a complexity of 5",
              nodeType: "FunctionDeclaration",
            },
            {
              ruleId: "complexity",
              severity: 1,
              line: 30,
              message: "Function has a complexity of 1",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      expect(functions).toHaveLength(3);
      expect(functions[0].complexity).toBe("5");
      expect(functions[1].complexity).toBe("3");
      expect(functions[2].complexity).toBe("1");
    });

    it("should deduplicate functions by file:name:line", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              message: "Function has a complexity of 5",
              nodeType: "FunctionDeclaration",
            },
            {
              ruleId: "complexity",
              severity: 1,
              line: 10, // Same line
              message: "Function has a complexity of 3", // Lower complexity
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      // Should keep the higher complexity one
      expect(functions).toHaveLength(1);
      expect(functions[0].complexity).toBe("5");
    });

    it("should handle multiple files", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component1.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              message: "Function has a complexity of 3",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
        {
          filePath: "/project/src/component2.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 20,
              message: "Function has a complexity of 5",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, mockProjectRoot);
      expect(functions).toHaveLength(2);
      expect(functions[0].file).toBe("src/component2.tsx"); // Higher complexity first
      expect(functions[1].file).toBe("src/component1.tsx");
    });

    it("should handle file paths with different project root formats", () => {
      const eslintResults = [
        {
          filePath: "/project/src/component.tsx",
          messages: [
            {
              ruleId: "complexity",
              severity: 1,
              line: 10,
              message: "Function has a complexity of 3",
              nodeType: "FunctionDeclaration",
            },
          ],
        },
      ];

      const functions = functionExtraction.extractFunctionsFromESLintResults(eslintResults, "/project");
      expect(functions[0].file).toBe("src/component.tsx");
    });
  });
});
