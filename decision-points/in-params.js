/**
 * Checks for nodes in function parameters (default params, destructuring).
 */

/**
 * Checks if a node type is a function type
 * @param {string} type - Node type
 * @returns {boolean} True if function type
 */
export function isFunctionType(type) {
  return type === 'FunctionDeclaration' ||
         type === 'FunctionExpression' ||
         type === 'ArrowFunctionExpression';
}

/**
 * Checks if a node is in a function's parameter list
 * @param {Object} node - Node to check
 * @param {Object} funcParent - Function parent node
 * @returns {boolean} True if node is in function params
 */
export function isNodeInFunctionParams(node, funcParent) {
  if (!funcParent.params || !Array.isArray(funcParent.params)) {
    return false;
  }

  if (funcParent.params.includes(node)) {
    return true;
  }

  for (const param of funcParent.params) {
    if (checkNestedPattern(param, node)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a parent node is a pattern container
 * @param {Object} parent - Parent node
 * @returns {boolean} True if pattern container
 */
export function isPatternContainer(parent) {
  return parent.type === 'ArrayPattern' ||
         parent.type === 'ObjectPattern' ||
         parent.type === 'Property' ||
         parent.type === 'RestElement';
}

/**
 * Checks if AssignmentPattern is in function parameters by traversing up
 * @param {Object} node - AssignmentPattern node
 * @param {Map} parentMap - Parent map
 * @returns {boolean} True if in function parameters
 */
export function checkInFunctionParams(node, parentMap) {
  let current = node;
  let depth = 0;
  const maxDepth = 15;

  while (current && depth < maxDepth) {
    const parent = parentMap.get(current);
    if (!parent) break;

    if (isFunctionType(parent.type)) {
      if (isNodeInFunctionParams(node, parent)) {
        return true;
      }
    }

    if (isPatternContainer(parent)) {
      current = parent;
      depth += 1;
      continue;
    }

    break;
  }

  return false;
}

/**
 * Checks if VariableDeclaration is a direct child of function body
 * @param {Object} varParent - VariableDeclaration node
 * @param {Object} funcParent - Function parent node
 * @returns {boolean} True if direct child of function body
 */
export function isVariableDeclarationInFunctionBody(varParent, funcParent) {
  if (!funcParent.body) return false;

  const bodyType = funcParent.body.type;
  if (bodyType !== 'BlockStatement' && bodyType !== 'Program') {
    return false;
  }

  const bodyStatements = funcParent.body.body || funcParent.body.statements || [];
  return bodyStatements.includes(varParent);
}

/**
 * Checks if VariableDeclarator is in a top-level destructuring in function body
 * @param {Object} varDeclarator - VariableDeclarator node
 * @param {Object} node - Original AssignmentPattern node
 * @param {Map} parentMap - Parent map
 * @returns {boolean} True if in top-level destructuring in function body
 */
export function checkInTopLevelDestructuring(varDeclarator, node, parentMap) {
  let varParent = parentMap.get(varDeclarator);
  let depth = 0;
  const maxDepth = 15;

  while (varParent && depth < maxDepth) {
    if (varParent.type === 'VariableDeclaration') {
      let funcParent = parentMap.get(varParent);
      let funcDepth = 0;

      while (funcParent && funcDepth < 10) {
        if (isFunctionType(funcParent.type)) {
          if (isVariableDeclarationInFunctionBody(varParent, funcParent)) {
            return true;
          }
          break;
        }
        funcParent = parentMap.get(funcParent);
        funcDepth += 1;
      }
    }
    varParent = parentMap.get(varParent);
    depth += 1;
  }

  return false;
}

/**
 * Checks if AssignmentPattern is in a top-level destructuring
 * assignment in function body
 * @param {Object} node - AssignmentPattern node
 * @param {Map} parentMap - Parent map
 * @returns {boolean} True if in top-level destructuring
 */
export function checkInFunctionBodyDestructuring(node, parentMap) {
  let current = node;
  let depth = 0;
  const maxDepth = 15;

  while (current && depth < maxDepth) {
    const parent = parentMap.get(current);
    if (!parent) break;

    if (parent.type === 'VariableDeclarator' && parent.id) {
      if (checkNestedPattern(parent.id, node)) {
        if (checkInTopLevelDestructuring(parent, node, parentMap)) {
          return true;
        }
      }
    }

    if (isPatternContainer(parent)) {
      current = parent;
      depth += 1;
      continue;
    }

    break;
  }

  return false;
}

/**
 * Checks if AssignmentPattern is in function parameters or destructuring
 * at the top level of a function body (ESLint counts these as decision)
 * @param {Object} node - AssignmentPattern node
 * @param {Map} parentMap - Parent map
 * @param {Object} _ast - Root AST node (for finding containing function)
 * @returns {boolean} True if in function params or top-level destructuring
 */
export function isInFunctionParameters(node, parentMap, _ast) {
  if (checkInFunctionParams(node, parentMap)) {
    return true;
  }
  return checkInFunctionBodyDestructuring(node, parentMap);
}

/**
 * Checks if target is nested in ArrayPattern elements
 * @param {Array} elements - Array of elements
 * @param {Object} target - Target node to find
 * @returns {boolean} True if target is found
 */
function checkArrayPatternElements(elements, target) {
  return elements.some(el => {
    if (el === target) return true;
    if (el && typeof el === 'object' && el.type) {
      return checkNestedPattern(el, target);
    }
    return false;
  });
}

/**
 * Checks if target is nested in ObjectPattern properties
 * @param {Array} properties - Array of properties
 * @param {Object} target - Target node to find
 * @returns {boolean} True if target is found
 */
function checkObjectPatternProperties(properties, target) {
  return properties.some(prop => {
    if (prop.value === target) return true;
    if (prop.value && typeof prop.value === 'object' && prop.value.type) {
      return checkNestedPattern(prop.value, target);
    }
    if (prop.key && typeof prop.key === 'object' && prop.key.type) {
      return checkNestedPattern(prop.key, target);
    }
    return false;
  });
}

/**
 * Checks if target is nested in RestElement
 * @param {Object} restElement - RestElement node
 * @param {Object} target - Target node to find
 * @returns {boolean} True if target is found
 */
function checkRestElement(restElement, target) {
  if (!restElement.argument) return false;
  if (restElement.argument === target) return true;
  if (restElement.argument && typeof restElement.argument === 'object' && restElement.argument.type) {
    return checkNestedPattern(restElement.argument, target);
  }
  return false;
}

/**
 * Checks if a node is nested in a pattern (recursively)
 * @param {Object} pattern - Pattern node (ArrayPattern, ObjectPattern, Property, etc.)
 * @param {Object} target - Target node to find
 * @returns {boolean} True if target is nested in pattern
 */
export function checkNestedPattern(pattern, target) {
  if (!pattern || typeof pattern !== 'object') return false;
  if (pattern === target) return true;

  if (pattern.elements && Array.isArray(pattern.elements)) {
    return checkArrayPatternElements(pattern.elements, target);
  }

  if (pattern.properties && Array.isArray(pattern.properties)) {
    return checkObjectPatternProperties(pattern.properties, target);
  }

  if (pattern.type === 'RestElement') {
    return checkRestElement(pattern, target);
  }

  return false;
}
