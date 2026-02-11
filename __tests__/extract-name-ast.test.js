/**
 * Unit tests for function-extraction/extract-name-ast.js (branch coverage)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindAllNodesByType = vi.fn();
const mockFindContainingNode = vi.fn();
const mockFindAllFunctions = vi.fn();
const mockParseAST = vi.fn();
const mockReadFileIfExists = vi.fn();
const mockIdentifyCallbackContext = vi.fn();

vi.mock('../function-extraction/ast-utils.js', () => ({
  parseAST: (...args) => mockParseAST(...args),
  findAllFunctions: (...args) => mockFindAllFunctions(...args),
  findAllNodesByType: (...args) => mockFindAllNodesByType(...args),
  findContainingNode: (...args) => mockFindContainingNode(...args),
  readFileIfExists: (...args) => mockReadFileIfExists(...args),
  getNodeLine: (node) => (node.loc && node.loc.start ? node.loc.start.line : 1),
}));

vi.mock('../function-extraction/extract-callback.js', () => ({
  identifyCallbackContext: (...args) => mockIdentifyCallbackContext(...args),
}));

import {
  isFirstArgOfDirectCall,
  findVariableDeclaratorForFunction,
  extractNameFromVariableDeclarator,
  extractNameFromProperty,
  extractNameFromMethodDefinition,
  extractNameFromASTNode,
  doNodeTypesMatch,
  findArrowFunctionLine,
  matchesArrowFunctionLine,
  findMatchingASTFunction,
  extractFunctionNameAST,
} from '../function-extraction/extract-name-ast.js';

describe('function-extraction/extract-name-ast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentifyCallbackContext.mockReturnValue(null);
  });

  describe('isFirstArgOfDirectCall', () => {
    it('returns false when no containing call', () => {
      mockFindContainingNode.mockReturnValue(null);
      const ast = {};
      mockFindAllNodesByType.mockReturnValue([]);
      expect(isFirstArgOfDirectCall({ type: 'ArrowFunctionExpression' }, ast)).toBe(false);
    });

    it('returns false when arguments[0] !== funcNode', () => {
      const funcNode = { type: 'ArrowFunctionExpression' };
      const otherArg = {};
      mockFindAllNodesByType.mockReturnValue([{ arguments: [otherArg], callee: { type: 'Identifier' } }]);
      mockFindContainingNode.mockReturnValue({ arguments: [otherArg], callee: { type: 'Identifier' } });
      expect(isFirstArgOfDirectCall(funcNode, {})).toBe(false);
    });

    it('returns false when callee is not Identifier', () => {
      const funcNode = { type: 'ArrowFunctionExpression' };
      const call = { arguments: [funcNode], callee: { type: 'MemberExpression' } };
      mockFindAllNodesByType.mockReturnValue([call]);
      mockFindContainingNode.mockReturnValue(call);
      expect(isFirstArgOfDirectCall(funcNode, {})).toBe(false);
    });

    it('returns true when first arg and callee Identifier', () => {
      const funcNode = { type: 'ArrowFunctionExpression' };
      const call = { arguments: [funcNode], callee: { type: 'Identifier' } };
      mockFindAllNodesByType.mockReturnValue([call]);
      mockFindContainingNode.mockReturnValue(call);
      expect(isFirstArgOfDirectCall(funcNode, {})).toBe(true);
    });
  });

  describe('findVariableDeclaratorForFunction', () => {
    it('returns declarator when init === funcNode', () => {
      const funcNode = {};
      const decl = { init: funcNode, id: { name: 'fn' } };
      mockFindAllNodesByType.mockReturnValue([decl]);
      expect(findVariableDeclaratorForFunction(funcNode, {})).toBe(decl);
    });

    it('returns declarator when funcNode inside init range and isFirstArgOfDirectCall', () => {
      const funcNode = { range: [15, 25] };
      const decl = { range: [10, 30], init: null };
      const call = { arguments: [funcNode], callee: { type: 'Identifier' } };
      mockFindAllNodesByType.mockImplementation((_ast, type) =>
        type === 'VariableDeclarator' ? [decl] : type === 'CallExpression' ? [call] : []);
      mockFindContainingNode.mockReturnValue(call);
      const result = findVariableDeclaratorForFunction(funcNode, {});
      expect(result).toBe(decl);
    });
  });

  describe('extractNameFromVariableDeclarator', () => {
    it('returns id.name when declarator has id', () => {
      const ast = {};
      const funcNode = {};
      const decl = { init: funcNode, id: { name: 'myFunc' } };
      mockFindAllNodesByType.mockReturnValue([decl]);
      expect(extractNameFromVariableDeclarator(funcNode, ast)).toBe('myFunc');
    });

    it('returns null when no declarator found', () => {
      mockFindAllNodesByType.mockReturnValue([]);
      expect(extractNameFromVariableDeclarator({}, {})).toBe(null);
    });
  });

  describe('extractNameFromProperty', () => {
    it('returns key.name when key type is Identifier', () => {
      const funcNode = {};
      const prop = { key: { type: 'Identifier', name: 'onClick' } };
      mockFindAllNodesByType.mockReturnValue([prop]);
      mockFindContainingNode.mockReturnValue(prop);
      expect(extractNameFromProperty(funcNode, {})).toBe('onClick');
    });

    it('returns String(key.value) when key type is Literal', () => {
      const funcNode = {};
      const prop = { key: { type: 'Literal', value: 'data-id' } };
      mockFindAllNodesByType.mockReturnValue([prop]);
      mockFindContainingNode.mockReturnValue(prop);
      expect(extractNameFromProperty(funcNode, {})).toBe('data-id');
    });

    it('returns null when no containing property', () => {
      mockFindContainingNode.mockReturnValue(null);
      expect(extractNameFromProperty({}, {})).toBe(null);
    });
  });

  describe('extractNameFromMethodDefinition', () => {
    it('returns key.name when MethodDefinition with Identifier key', () => {
      const funcNode = {};
      const method = { key: { type: 'Identifier', name: 'render' } };
      mockFindAllNodesByType.mockReturnValue([method]);
      mockFindContainingNode.mockReturnValue(method);
      expect(extractNameFromMethodDefinition(funcNode, {})).toBe('render');
    });

    it('returns null when key is not Identifier', () => {
      const funcNode = {};
      const method = { key: { type: 'Literal', value: 'x' } };
      mockFindAllNodesByType.mockReturnValue([method]);
      mockFindContainingNode.mockReturnValue(method);
      expect(extractNameFromMethodDefinition(funcNode, {})).toBe(null);
    });
  });

  describe('extractNameFromASTNode', () => {
    it('returns id.name for FunctionDeclaration with id', () => {
      const node = { type: 'FunctionDeclaration', id: { name: 'main' } };
      expect(extractNameFromASTNode(node, {})).toBe('main');
    });

    it('returns key.name for MethodDefinition with Identifier key', () => {
      const node = { type: 'MethodDefinition', key: { type: 'Identifier', name: 'run' } };
      expect(extractNameFromASTNode(node, {})).toBe('run');
    });
  });

  describe('doNodeTypesMatch', () => {
    it('returns true for FunctionDeclaration pair', () => {
      expect(doNodeTypesMatch('FunctionDeclaration', 'FunctionDeclaration')).toBe(true);
    });
    it('returns true for ArrowFunctionExpression pair', () => {
      expect(doNodeTypesMatch('ArrowFunctionExpression', 'ArrowFunctionExpression')).toBe(true);
    });
    it('returns true for MethodDefinition pair', () => {
      expect(doNodeTypesMatch('MethodDefinition', 'MethodDefinition')).toBe(true);
    });
    it('returns false for mismatch', () => {
      expect(doNodeTypesMatch('FunctionDeclaration', 'ArrowFunctionExpression')).toBe(false);
    });
  });

  describe('findArrowFunctionLine', () => {
    it('returns null when no range', () => {
      expect(findArrowFunctionLine({ type: 'ArrowFunctionExpression' }, 'x => 1')).toBe(null);
    });

    it('returns line number of => when range present', () => {
      const source = 'const f = (a, b) => a + b';
      const arrowIdx = source.indexOf('=>');
      const node = { range: [0, source.length] };
      expect(findArrowFunctionLine(node, source)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findMatchingASTFunction', () => {
    it('returns MethodDefinition when nodeType is FunctionExpression and method at line', () => {
      const method = { type: 'MethodDefinition', loc: { start: { line: 5 } } };
      const astFuncs = [method];
      const result = findMatchingASTFunction(astFuncs, 5, 'FunctionExpression', '');
      expect(result).toBe(method);
    });

    it('returns null when no match', () => {
      const astFuncs = [{ type: 'FunctionDeclaration', loc: { start: { line: 1 } } }];
      const result = findMatchingASTFunction(astFuncs, 99, 'FunctionDeclaration', '');
      expect(result).toBe(null);
    });

    it('returns function when nodeType is not ArrowFunctionExpression and getNodeLine matches', () => {
      const funcDecl = { type: 'FunctionDeclaration', loc: { start: { line: 3 } } };
      const astFuncs = [funcDecl];
      const result = findMatchingASTFunction(astFuncs, 3, 'FunctionDeclaration', 'function f() {}');
      expect(result).toBe(funcDecl);
    });

    it('returns MethodDefinition when nodeType is FunctionExpression and method at line matches', () => {
      const methodDef = { type: 'MethodDefinition', loc: { start: { line: 10 } } };
      const astFuncs = [methodDef];
      const result = findMatchingASTFunction(astFuncs, 10, 'FunctionExpression', '');
      expect(result).toBe(methodDef);
    });
  });

  describe('extractFunctionNameAST', () => {
    it('returns null when readFileIfExists returns null', async () => {
      mockReadFileIfExists.mockReturnValue(null);
      expect(await extractFunctionNameAST('any.js', 1, 'FunctionDeclaration', '/root')).toBe(null);
    });

    it('returns null when parseAST returns null', async () => {
      mockReadFileIfExists.mockReturnValue('function f() {}');
      mockParseAST.mockReturnValue(null);
      expect(await extractFunctionNameAST('any.js', 1, 'FunctionDeclaration', '/root')).toBe(null);
    });

    it('returns null when findMatchingASTFunction returns null', async () => {
      mockReadFileIfExists.mockReturnValue('function f() {}');
      mockParseAST.mockReturnValue({ type: 'Program', body: [] });
      mockFindAllFunctions.mockReturnValue([]);
      expect(await extractFunctionNameAST('any.js', 1, 'FunctionDeclaration', '/root')).toBe(null);
    });

    it('returns null on throw', async () => {
      mockReadFileIfExists.mockImplementation(() => { throw new Error('ENOENT'); });
      expect(await extractFunctionNameAST('missing.js', 1, 'FunctionDeclaration', '/root')).toBe(null);
    });

    it('returns "anonymous arrow function" when matchingFunc is ArrowFunctionExpression and no name/callback', async () => {
      const sourceCode = '\nx => 1';
      const arrowNode = { type: 'ArrowFunctionExpression', loc: { start: { line: 2 } }, range: [1, 8] };
      mockReadFileIfExists.mockReturnValue(sourceCode);
      mockParseAST.mockReturnValue({});
      mockFindAllFunctions.mockReturnValue([arrowNode]);
      mockFindAllNodesByType.mockReturnValue([]);
      mockFindContainingNode.mockReturnValue(null);
      mockIdentifyCallbackContext.mockReturnValue(null);
      const result = await extractFunctionNameAST('f.js', 2, 'ArrowFunctionExpression', '/root');
      expect(result).toBe('anonymous arrow function');
    });

    it('returns "anonymous" when matchingFunc has no name and no callback type', async () => {
      const node = { type: 'FunctionExpression', loc: { start: { line: 2 } }, id: null };
      mockReadFileIfExists.mockReturnValue('const f = function() {}');
      mockParseAST.mockReturnValue({});
      mockFindAllFunctions.mockReturnValue([node]);
      mockFindAllNodesByType.mockReturnValue([]);
      mockFindContainingNode.mockReturnValue(null);
      mockIdentifyCallbackContext.mockReturnValue(null);
      const result = await extractFunctionNameAST('f.js', 2, 'FunctionExpression', '/root');
      expect(result).toBe('anonymous');
    });
  });
});
