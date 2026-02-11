/**
 * Unit tests for decision-points/in-params.js
 */
import { describe, it, expect } from 'vitest';
import {
  isFunctionType,
  isNodeInFunctionParams,
  isPatternContainer,
  checkInFunctionParams,
  isVariableDeclarationInFunctionBody,
  checkInTopLevelDestructuring,
  checkInFunctionBodyDestructuring,
  isInFunctionParameters,
  checkNestedPattern,
} from '../decision-points/in-params.js';

describe('decision-points/in-params', () => {
  describe('isFunctionType', () => {
    it('returns true for FunctionDeclaration', () => {
      expect(isFunctionType('FunctionDeclaration')).toBe(true);
    });
    it('returns true for FunctionExpression', () => {
      expect(isFunctionType('FunctionExpression')).toBe(true);
    });
    it('returns true for ArrowFunctionExpression', () => {
      expect(isFunctionType('ArrowFunctionExpression')).toBe(true);
    });
    it('returns false for other types', () => {
      expect(isFunctionType('BlockStatement')).toBe(false);
    });
  });

  describe('isNodeInFunctionParams', () => {
    it('returns false when funcParent.params is null', () => {
      expect(isNodeInFunctionParams({}, { params: null })).toBe(false);
    });
    it('returns false when funcParent.params is not an array', () => {
      expect(isNodeInFunctionParams({}, { params: {} })).toBe(false);
    });
    it('returns true when params.includes(node)', () => {
      const node = { id: 'x' };
      const funcParent = { params: [node, { id: 'y' }] };
      expect(isNodeInFunctionParams(node, funcParent)).toBe(true);
    });
    it('returns true when node is nested via checkNestedPattern', () => {
      const innerNode = { type: 'Identifier' };
      const pattern = { type: 'ObjectPattern', properties: [{ value: innerNode }] };
      const funcParent = { params: [pattern] };
      expect(isNodeInFunctionParams(innerNode, funcParent)).toBe(true);
    });
    it('returns false when node is not in params', () => {
      const node = { id: 'other' };
      const funcParent = { params: [{ id: 'x' }, { id: 'y' }] };
      expect(isNodeInFunctionParams(node, funcParent)).toBe(false);
    });
  });

  describe('isPatternContainer', () => {
    it('returns true for ArrayPattern', () => {
      expect(isPatternContainer({ type: 'ArrayPattern' })).toBe(true);
    });
    it('returns true for ObjectPattern', () => {
      expect(isPatternContainer({ type: 'ObjectPattern' })).toBe(true);
    });
    it('returns true for Property', () => {
      expect(isPatternContainer({ type: 'Property' })).toBe(true);
    });
    it('returns true for RestElement', () => {
      expect(isPatternContainer({ type: 'RestElement' })).toBe(true);
    });
    it('returns false for other types', () => {
      expect(isPatternContainer({ type: 'Identifier' })).toBe(false);
    });
  });

  describe('checkInFunctionParams', () => {
    it('returns true when node is in function params', () => {
      const node = { type: 'Identifier' };
      const funcNode = { type: 'FunctionDeclaration', params: [node] };
      const parentMap = new Map([[node, funcNode]]);
      expect(checkInFunctionParams(node, parentMap)).toBe(true);
    });
    it('returns false when parentMap has no parent', () => {
      const node = { type: 'Identifier' };
      const parentMap = new Map();
      expect(checkInFunctionParams(node, parentMap)).toBe(false);
    });
    it('returns false when traversing pattern containers does not find function params', () => {
      const node = { type: 'Identifier' };
      const prop = { type: 'Property', value: node };
      const objPattern = { type: 'ObjectPattern', properties: [prop] };
      const parentMap = new Map([
        [node, prop],
        [prop, objPattern],
        [objPattern, { type: 'AssignmentExpression' }],
      ]);
      expect(checkInFunctionParams(node, parentMap)).toBe(false);
    });
    it('returns true when node is in params via pattern container chain', () => {
      const node = { type: 'Identifier' };
      const prop = { type: 'Property', value: node };
      const objPattern = { type: 'ObjectPattern', properties: [prop] };
      const funcNode = { type: 'FunctionDeclaration', params: [objPattern] };
      const parentMap = new Map([
        [node, prop],
        [prop, objPattern],
        [objPattern, funcNode],
      ]);
      expect(checkInFunctionParams(node, parentMap)).toBe(true);
    });
  });

  describe('isVariableDeclarationInFunctionBody', () => {
    it('returns false when funcParent has no body', () => {
      expect(isVariableDeclarationInFunctionBody({}, {})).toBe(false);
    });
    it('returns false when body type is not BlockStatement or Program', () => {
      const varParent = {};
      const funcParent = { body: { type: 'ExpressionStatement' } };
      expect(isVariableDeclarationInFunctionBody(varParent, funcParent)).toBe(false);
    });
    it('returns false when varParent is not in body.body', () => {
      const varParent = {};
      const funcParent = { body: { type: 'BlockStatement', body: [] } };
      expect(isVariableDeclarationInFunctionBody(varParent, funcParent)).toBe(false);
    });
    it('returns true when varParent is in body.body', () => {
      const varParent = {};
      const funcParent = { body: { type: 'BlockStatement', body: [varParent] } };
      expect(isVariableDeclarationInFunctionBody(varParent, funcParent)).toBe(true);
    });
    it('returns true when varParent is in body.statements (Program)', () => {
      const varParent = {};
      const funcParent = { body: { type: 'Program', statements: [varParent] } };
      expect(isVariableDeclarationInFunctionBody(varParent, funcParent)).toBe(true);
    });
  });

  describe('checkInTopLevelDestructuring', () => {
    it('returns false when varDeclarator has no VariableDeclaration parent in function body', () => {
      const varDeclarator = {};
      const node = {};
      const parentMap = new Map([[varDeclarator, { type: 'VariableDeclaration' }]]);
      const varDecl = { type: 'VariableDeclaration' };
      parentMap.set(varDecl, { type: 'Program' });
      expect(checkInTopLevelDestructuring(varDeclarator, node, parentMap)).toBe(false);
    });
    it('returns true when VariableDeclaration is direct child of function body', () => {
      const varDeclarator = { type: 'VariableDeclarator' };
      const varDecl = { type: 'VariableDeclaration' };
      const funcNode = { type: 'FunctionDeclaration', body: { type: 'BlockStatement', body: [varDecl] } };
      const parentMap = new Map([
        [varDeclarator, varDecl],
        [varDecl, funcNode],
      ]);
      expect(checkInTopLevelDestructuring(varDeclarator, {}, parentMap)).toBe(true);
    });
  });

  describe('checkInFunctionBodyDestructuring', () => {
    it('returns false when no VariableDeclarator with matching id in chain', () => {
      const node = { type: 'AssignmentPattern' };
      const parentMap = new Map([[node, { type: 'Property' }]]);
      expect(checkInFunctionBodyDestructuring(node, parentMap)).toBe(false);
    });
    it('returns true when AssignmentPattern is in VariableDeclarator id and in function body destructuring', () => {
      const node = { type: 'AssignmentPattern' };
      const varDeclarator = { type: 'VariableDeclarator', id: node };
      const varDecl = { type: 'VariableDeclaration' };
      const funcNode = { type: 'FunctionDeclaration', body: { type: 'BlockStatement', body: [varDecl] } };
      const parentMap = new Map([
        [node, varDeclarator],
        [varDeclarator, varDecl],
        [varDecl, funcNode],
      ]);
      expect(checkInFunctionBodyDestructuring(node, parentMap)).toBe(true);
    });
  });

  describe('isInFunctionParameters', () => {
    it('returns true when checkInFunctionParams returns true', () => {
      const node = { type: 'Identifier' };
      const funcNode = { type: 'FunctionDeclaration', params: [node] };
      const parentMap = new Map([[node, funcNode]]);
      expect(isInFunctionParameters(node, parentMap, {})).toBe(true);
    });
    it('returns true when checkInFunctionParams is false but checkInFunctionBodyDestructuring is true', () => {
      const node = { type: 'AssignmentPattern' };
      const varDeclarator = { type: 'VariableDeclarator', id: node };
      const varDecl = { type: 'VariableDeclaration' };
      const funcNode = { type: 'FunctionDeclaration', body: { type: 'BlockStatement', body: [varDecl] } };
      const parentMap = new Map([
        [node, varDeclarator],
        [varDeclarator, varDecl],
        [varDecl, funcNode],
      ]);
      expect(isInFunctionParameters(node, parentMap, {})).toBe(true);
    });
  });

  describe('checkNestedPattern', () => {
    it('returns false when pattern is null', () => {
      expect(checkNestedPattern(null, {})).toBe(false);
    });
    it('returns false when pattern is not an object', () => {
      expect(checkNestedPattern('string', {})).toBe(false);
    });
    it('returns true when pattern === target', () => {
      const node = {};
      expect(checkNestedPattern(node, node)).toBe(true);
    });
    it('returns true when target is in pattern.elements (direct)', () => {
      const target = {};
      const pattern = { elements: [target, {}] };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns true when target is nested in array element', () => {
      const target = {};
      const inner = { type: 'ObjectPattern', properties: [{ value: target }] };
      const pattern = { elements: [inner] };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns false when element has no type', () => {
      const target = {};
      const pattern = { elements: [{ notType: true }] };
      expect(checkNestedPattern(pattern, target)).toBe(false);
    });
    it('returns true when target is prop.value in ObjectPattern', () => {
      const target = {};
      const pattern = { properties: [{ value: target }] };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns true when target is nested in prop.value', () => {
      const target = {};
      const inner = { type: 'ArrayPattern', elements: [target] };
      const pattern = { properties: [{ value: inner }] };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns true when target is nested in prop.key', () => {
      const target = {};
      const inner = { type: 'Identifier' };
      const pattern = { properties: [{ key: inner, value: {} }] };
      expect(checkNestedPattern(pattern, target)).toBe(false);
    });
    it('returns true when target is in RestElement.argument', () => {
      const target = {};
      const pattern = { type: 'RestElement', argument: target };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns false when RestElement has no argument', () => {
      expect(checkNestedPattern({ type: 'RestElement' }, {})).toBe(false);
    });
    it('returns true when target is nested in RestElement.argument', () => {
      const target = {};
      const inner = { type: 'ObjectPattern', properties: [{ value: target }] };
      const pattern = { type: 'RestElement', argument: inner };
      expect(checkNestedPattern(pattern, target)).toBe(true);
    });
    it('returns false when RestElement.argument has no type', () => {
      const target = {};
      const pattern = { type: 'RestElement', argument: { noType: true } };
      expect(checkNestedPattern(pattern, target)).toBe(false);
    });
  });
});
