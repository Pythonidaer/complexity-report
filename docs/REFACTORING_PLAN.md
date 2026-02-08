# Scripts Refactoring Plan

Plan to split large modules and introduce folder structure, mirroring the organization of `export-generators/` and `html-generators/`.

---

## ✅ Implementation Complete

The refactor has been completed. Current layout:

- **`report/index.js`** — Main entry (from `generate-complexity-report.js`). Run via `npm run lint:complexity`.
- **`tools/analyze-ast-mismatches/index.js`** — Standalone diagnostic (from `analyze-ast-mismatches.js`). Run manually.
- **`integration/eslint/index.js`** — ESLint runner (from `eslint-integration.js`).
- **`integration/threshold/index.js`** — Threshold reader (from `get-complexity-threshold.js`).
- **`decision-points/`** — AST parser (split from `decision-points-ast.js`).
- **`function-boundaries/`** — Boundary detection (split from `function-boundaries.js`).
- **`function-extraction/`** — Name extraction and ESLint processing (split from `function-extraction.js`).

Root-level `generate-complexity-report.js`, `analyze-ast-mismatches.js`, `eslint-integration.js`, and `get-complexity-threshold.js` have been removed. All imports and tests reference the new paths. See [README.md](../README.md) and [TOC.md](./TOC.md) for current file roles.

---

## Original Plan (Current State)

| Module | Lines | Status |
|--------|-------|--------|
| `decision-points-ast.js` | 947 | Over 1000-line guideline |
| `function-boundaries.js` | 1403 | Over guideline |
| `function-extraction.js` | 1054 | Over guideline |
| `analyze-ast-mismatches.js` | 139 | Small, candidate for folder |
| `complexity-breakdown.js` | 44 | Small |
| `eslint-integration.js` | 93 | Small |
| `function-hierarchy.js` | 340 | Moderate |
| `generate-complexity-report.js` | 414 | Moderate |

---

## 1. decision-points-ast/ (947 lines)

Split by responsibility. Main export: `parseDecisionPointsAST`.

### Proposed structure

```
scripts/decision-points/
  index.js           # Main export, thin orchestrator (~50 lines)
  ast-utils.js       # parseAST, collectNodesByType, findAllFunctions, getNodeLine, etc.
  node-helpers.js    # getLogicalExpressionOperatorLine/Range, getNodeColumnRange, getDecisionPointLineForNode, etc.
  parent-map.js      # buildParentMap, processArrayChildrenForParentMap, etc.
  function-matching.js  # matchFunctionsToAST, findInnermostASTFunction, findFunctionForDecisionPoint, etc.
  decision-type.js   # getControlFlowDecisionType, getLogicalExpressionType, getExpressionDecisionType, getDecisionPointType
  ternary-multiline.js  # isMultiLineTernaryNode, buildMultiLineTernaryLineRanges, buildDecisionPointEntries
  parse-main.js      # Core parse logic: forEach node type handling, emit decision points
```

### Logic groupings

- **AST traversal**: `parseAST`, `shouldSkipKey`, `processArrayChildren`, `collectNodesByType`, `findAllFunctions`
- **Node line/column helpers**: `getNodeLine`, `getLogicalExpressionOperatorLine/Range`, `getNodeColumnRange`, `getDecisionPointLineForNode`, `getNodeLineRange`
- **Multi-line ternary**: `isMultiLineTernaryNode`, `buildMultiLineTernaryLineRanges`, `buildDecisionPointEntries`
- **Parent map**: `buildParentMap`, `processArrayChildrenForParentMap`, `processChildNodeForParentMap`
- **In-params check**: `isFunctionType`, `isNodeInFunctionParameters`, `checkInFunctionParams`, `checkArrayPatternElements`, etc.
- **Decision type mapping**: `getControlFlowDecisionType`, `getLogicalExpressionType`, `getExpressionDecisionType`, `getDecisionPointType`
- **Function matching**: `findArrowFunctionLine`, `getMatchLineForASTFunction`, `matchFunctionsToAST`, `findInnermostASTFunction`, `findFunctionForDecisionPoint`
- **Main**: `parseDecisionPointsAST` (orchestrates, imports from above)

---

## 2. function-boundaries/ (1403 lines)

Split by detection strategy. Main export: `findFunctionBoundaries`.

### Proposed structure

```
scripts/function-boundaries/
  index.js                    # findFunctionBoundaries, thin orchestrator (~80 lines)
  arrow-helpers.js            # findArrowFunctionStart, checkJSXReturnClosingPattern, scanForJSXReturnClosingParens
  arrow-jsx.js                # findArrowFunctionEndJSXReturn, findArrowFunctionEndJSXAttribute, handleJSXReturnPattern
  arrow-object-literal.js     # isObjectLiteralPattern, findObjectLiteralClosingParen, findArrowFunctionEndObjectLiteral
  arrow-single-expr.js        # endsOnSameLine, calculateInitialParenDepth, scanForSingleExpressionEnd, findArrowFunctionEndSingleExpression
  arrow-brace-body.js         # handleBraceOnSameLine, handleNoBraceOnSameLine, findArrowFunctionEnd
  named-helpers.js            # findNamedFunctionStart, findNamedFunctionEnd, findFunctionEndFallback
  brace-scanning.js           # Brace counting: handleEscapeSequence, isSingleLineCommentStart, processLineInFunctionBody, checkFunctionEnd, etc.
  parse-utils.js              # processLineBeforeFunctionBody, handleComments, handleStringLiterals, regex detection, processCharacterForBraces
```

### Logic groupings

- **Arrow start**: `findArrowFunctionStart`
- **Arrow JSX**: `findArrowFunctionEndJSXReturn`, `findArrowFunctionEndJSXAttribute`, `scanForJSXReturnClosingParens`, `checkJSXReturnClosingPattern`
- **Arrow object literal**: `isObjectLiteralPattern`, `findObjectLiteralClosingParen`, `findArrowFunctionEndObjectLiteral`
- **Arrow single expression**: `endsOnSameLine`, `calculateInitialParenDepth`, `scanForSingleExpressionEnd`, `findArrowFunctionEndSingleExpression`
- **Arrow brace body**: `handleBraceOnSameLine`, `handleNoBraceOnSameLine`, `handleJSXReturnPattern`, `findArrowFunctionEnd`
- **Named functions**: `findNamedFunctionStart`, `findNamedFunctionEnd`, `findFunctionEndFallback`, `findDependencyArrayEnd`, `findSetTimeoutCallbackEnd`, etc.
- **Brace scanning**: Comment/string/regex handling, `processLineInFunctionBody`, `checkFunctionEnd`, `createBracesResult`

---

## 3. function-extraction/ (1054 lines)

Split by purpose. Main exports: `extractFunctionsFromESLintResults`, `extractFunctionName`, `getFunctionStartColumn`, `getFunctionRange`, `getComplexityLevel`, `getDirectory`, `getBaseFunctionName`.

### Proposed structure

```
scripts/function-extraction/
  index.js              # Re-exports public API
  extract-from-eslint.js  # extractFunctionsFromESLintResults, processComplexityMessage, resolveHighlightColumn
  extract-name-regex.js   # Regex-based: findParentFunction, handleArrowFunctionExpression, handleFunctionDeclaration, etc.
  extract-name-ast.js     # AST-based: parseAST, findAllFunctions, findMatchingASTFunction, extractFunctionNameAST, etc.
  extract-callback.js     # identifyCallbackContext, checkCallExpressionCallback, checkJSXAttributeCallback, checkReturnCallback, etc.
  range-and-column.js     # getFunctionStartColumn, getFunctionRange, getMatchingFunctionWithLoc, getCallbackHighlightColumn
  utils.js                # getComplexityLevel, getDirectory, getBaseFunctionName
```

### Logic groupings

- **ESLint processing**: `processComplexityMessage`, `resolveHighlightColumn`, `extractFunctionsFromESLintResults`
- **Regex name extraction**: `findParentFunction`, `handleArrowFunctionExpression`, `handleFunctionDeclaration`, `checkNamedArrowFunction`, `findMethodCallCallback`, etc.
- **AST name extraction**: `parseAST`, `traverseAST`, `findAllFunctions`, `findMatchingASTFunction`, `extractFunctionNameAST`, `extractNameFromVariableDeclarator`, etc.
- **Callback context**: `identifyCallbackContext`, `checkCallExpressionCallback`, `checkJSXAttributeCallback`, `checkReturnCallback`, `getCalleeCallbackName`
- **Range/column**: `getFunctionStartColumn`, `getFunctionRange`, `getMatchingFunctionWithLoc`, `getCallbackHighlightColumn`, `getVariableDeclaratorForCall`
- **Utilities**: `getComplexityLevel`, `getDirectory`, `getBaseFunctionName`

---

## 4. Folder structure for orchestration and tools

### Proposed layout

```
scripts/
  report/                      # Main report generation
    index.js                   # generate-complexity-report.js (entry point, thin)
    calculate-totals.js        # calculateDecisionPointTotals
    write-output.js            # writeMainReport, generateOneFolderHTML, generateOneFileHTML, copyRequiredFiles
  
  tools/                       # Standalone analysis tools
    analyze-ast-mismatches/
      index.js                 # analyzeASTMismatches entry
    (future: other tools)
  
  integration/                 # External integrations
    eslint/
      index.js                 # eslint-integration.js (runESLintComplexityCheck, findESLintConfig, getComplexityVariant)
    threshold/
      index.js                 # get-complexity-threshold.js
  
  analysis/                    # Core analysis modules (refactored)
    decision-points/           # from decision-points-ast.js
    function-boundaries/       # from function-boundaries.js
    function-extraction/       # from function-extraction.js
    complexity-breakdown/      # from complexity-breakdown.js
      index.js
    function-hierarchy/        # from function-hierarchy.js
      index.js
```

### Simpler variant (fewer top-level folders)

```
scripts/
  decision-points/             # Split from decision-points-ast.js
  function-boundaries/         # Split from function-boundaries.js
  function-extraction/         # Split from function-extraction.js
  
  report/
    index.js                   # generate-complexity-report (orchestration)
    analyze-ast-mismatches.js  # Keep as single file (139 lines)
  
  eslint-integration.js        # Keep flat (93 lines)
  get-complexity-threshold.js  # Keep flat
  complexity-breakdown.js      # Keep flat (44 lines)
  function-hierarchy.js        # Keep flat (340 lines) or move to function-hierarchy/
  
  html-generators/
  export-generators/
  assets/
  docs/
  __tests__/
```

---

## 5. Import path updates

After moving modules, update imports:

| Consumer | Old | New (folder) |
|----------|-----|--------------|
| report/index.js | `./decision-points-ast.js` | `./decision-points/index.js` |
| report/index.js | `./function-boundaries.js` | `./function-boundaries/index.js` |
| report/index.js | `./function-extraction.js` | `./function-extraction/index.js` |
| export-generators/index.js | `../function-boundaries.js` | `../function-boundaries/index.js` |
| export-generators/helpers.js | `../function-extraction.js` | `../function-extraction/index.js` |
| html-generators/file.js | (indirect) | (indirect) |
| tools/analyze-ast-mismatches/index.js | (multiple) | (multiple) |

---

## 6. Test updates

- `__tests__/decision-points-ast.test.js` → `__tests__/decision-points.test.js` (import from `../decision-points/index.js`)
- `__tests__/function-boundaries.test.js` → import from `../function-boundaries/index.js`
- `__tests__/function-extraction.test.js` → import from `../function-extraction/index.js`
- Other tests: update paths as needed

---

## 7. Entry points (current)

- `npm run lint:complexity` → `node scripts/report/index.js`
- `node scripts/tools/analyze-ast-mismatches/index.js` — run manually (no npm script)

---

## 8. Suggested implementation order

1. Split `decision-points-ast.js` → `decision-points/`
2. Split `function-boundaries.js` → `function-boundaries/`
3. Split `function-extraction.js` → `function-extraction/`
4. Update all imports and tests
5. Run `npm run lint:complexity` and `npm test -- --run` to verify
6. (Optional) Introduce `report/` and `tools/` folders for orchestration modules

---

## 9. Naming consistency

- Each folder: `index.js` as main export
- Internal modules: descriptive names (e.g. `arrow-jsx.js`, `extract-name-ast.js`)
- Public API: re-export from `index.js` only; internal modules stay private
