/**
 * Tests for extract-callback.js (callback context identification)
 */

import { describe, it, expect } from "vitest";
import {
  getCalleeCallbackName,
  checkCallExpressionCallback,
  checkJSXAttributeCallback,
  checkReturnCallback,
  identifyCallbackContext,
} from "../function-extraction/extract-callback.js";

describe("extract-callback", () => {
  describe("getCalleeCallbackName", () => {
    it("returns null for null callee", () => {
      expect(getCalleeCallbackName(null)).toBe(null);
    });

    it("returns property name for MemberExpression callee", () => {
      expect(getCalleeCallbackName({
        type: "MemberExpression",
        property: { name: "map" },
      })).toBe("map");
      expect(getCalleeCallbackName({
        type: "MemberExpression",
        property: { name: "useEffect" },
      })).toBe("useEffect");
    });

    it("returns null for MemberExpression without property", () => {
      expect(getCalleeCallbackName({ type: "MemberExpression" })).toBe(null);
    });

    it("returns null for MemberExpression with property without name", () => {
      expect(getCalleeCallbackName({ type: "MemberExpression", property: {} })).toBe(null);
    });

    it("returns name for Identifier callee", () => {
      expect(getCalleeCallbackName({ type: "Identifier", name: "setTimeout" })).toBe("setTimeout");
    });

    it("returns null for Identifier without name", () => {
      expect(getCalleeCallbackName({ type: "Identifier" })).toBe(null);
    });

    it("returns null for other node types", () => {
      expect(getCalleeCallbackName({ type: "CallExpression" })).toBe(null);
    });
  });

  describe("checkCallExpressionCallback", () => {
    it("returns null when function is not inside any call expression", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [10, 20] };
      const ast = { type: "Program", body: [] };
      const result = checkCallExpressionCallback(funcNode, ast);
      expect(result).toBe(null);
    });

    it("returns callee name for Identifier when function is inside call", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [10, 20] };
      const callExpr = {
        type: "CallExpression",
        callee: { type: "Identifier", name: "setTimeout" },
        arguments: [funcNode],
        range: [0, 50],
      };
      const ast = { type: "Program", body: [{ type: "ExpressionStatement", expression: callExpr }] };
      const result = checkCallExpressionCallback(funcNode, ast);
      expect(result).toBe("setTimeout");
    });
  });

  describe("checkJSXAttributeCallback", () => {
    it("returns null when function is not inside JSX attribute", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [10, 20] };
      const ast = { type: "Program", body: [] };
      const result = checkJSXAttributeCallback(funcNode, ast);
      expect(result).toBe(null);
    });
  });

  describe("checkReturnCallback", () => {
    it("returns null when function is not inside return statement", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [10, 20] };
      const ast = { type: "Program", body: [] };
      const result = checkReturnCallback(funcNode, ast);
      expect(result).toBe(null);
    });

    it("returns 'return' when function is direct return value and has containing function", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [25, 35] };
      const returnStatement = { type: "ReturnStatement", argument: funcNode, range: [18, 36] };
      const block = { type: "BlockStatement", body: [returnStatement] };
      const parentFunc = { type: "FunctionDeclaration", body: block, range: [0, 50] };
      const ast = { type: "Program", body: [parentFunc] };
      const result = checkReturnCallback(funcNode, ast);
      expect(result).toBe("return");
    });

    it("returns null when function is in return but argument is not direct (no containing function)", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [30, 40] };
      const returnStatement = { type: "ReturnStatement", argument: funcNode, range: [18, 42] };
      const ast = { type: "Program", body: [returnStatement] };
      const result = checkReturnCallback(funcNode, ast);
      expect(result).toBe(null);
    });
  });

  describe("identifyCallbackContext", () => {
    it("returns null when funcNode has no range", () => {
      expect(identifyCallbackContext({ type: "ArrowFunctionExpression" }, {})).toBe(null);
    });

    it("returns null for function with range but not in callback context", () => {
      const funcNode = { type: "ArrowFunctionExpression", range: [0, 50] };
      const ast = { type: "Program", body: [] };
      expect(identifyCallbackContext(funcNode, ast)).toBe(null);
    });
  });
});
