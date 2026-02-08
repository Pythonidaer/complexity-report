# Function Extraction

## function-extraction/

This directory turns ESLint complexity results (file path, line number, node type) into human-readable function names and metadata for the complexity report. It prefers AST-based extraction: it parses source with `@typescript-eslint/typescript-estree`, finds the function node that matches the reported line and type, derives the name from the AST (VariableDeclarator, Property, MethodDefinition, or FunctionDeclaration id), and identifies callback context via **`extract-callback.js`** (ReturnStatement, JSXAttribute, or CallExpression). **Named inner functions (e.g. `handleReInit`, `currentOnSelect`) are preferred over callback type:** extraction returns the AST-derived name so the hierarchy shows e.g. "AgencyLogosComponent (useEffect) (handleReInit)" instead of "AgencyLogosComponent (useEffect) (useEffect)". Only when the function has no name (anonymous arrow, unnamed expression) does extraction return the callback type (e.g. "useEffect", "return", "requestAnimationFrame"). **Variable name from VariableDeclarator** is used only when (1) the function **is** the init (e.g. `const x = () => {}`), or (2) the function is the **first argument** of a direct call (Identifier callee, e.g. `useCallback`, `setTimeout`) assigned to the variable. Callbacks inside method calls (e.g. `.filter()`, `.sort()`) get the callee property name ("filter", "sort"). **Callback type from CallExpression** is framework-agnostic: for any call `callee(cb)` or `obj.method(cb)`, extraction uses the callee identifier or property name from the AST (no whitelist). When AST is unavailable or fails, it falls back to regex in `extract-name-regex.js`.

**Main modules:**
- **`index.js`** — Re-exports public API
- **`extract-from-eslint.js`** — `extractFunctionsFromESLintResults`, `processComplexityMessage`, `resolveHighlightColumn`
- **`extract-name-ast.js`** — AST-based name extraction; uses `extract-callback.js` for callback context
- **`extract-name-regex.js`** — Regex fallback when AST fails
- **`extract-callback.js`** — `identifyCallbackContext`, `checkCallExpressionCallback`, `checkJSXAttributeCallback`, `checkReturnCallback`, `getCalleeCallbackName`
- **`range-and-column.js`** — `getFunctionStartColumn`, `getFunctionRange`, `getMatchingFunctionWithLoc`, `getCallbackHighlightColumn`
- **`utils.js`** — `getComplexityLevel`, `getDirectory`, `getBaseFunctionName`
- **`ast-utils.js`** — `parseAST`, `findAllFunctions`, `findAllNodesByType`, `findContainingNode`, `readFileIfExists`, etc.

The main public API is `extractFunctionName` (AST first, then regex) and `extractFunctionsFromESLintResults`. Callback types are framework-agnostic. The regex fallback exists only when the AST path returns null; the AST path is the single source of truth whenever the file parses and a matching function node is found.

**Dependencies:**
- fs (readFileSync, existsSync)
- path (resolve)
- @typescript-eslint/typescript-estree (parse)

**Issues to resolve (for 100% display hierarchy, accuracy, and framework-agnostic use):**

- **maxLookBack (50 lines):** Arbitrary; no documented rationale. For functions longer than 50 lines, `findParentFunction` can return the wrong parent or null. Prefer AST-only or document/derive a safe bound.
- **Regex fallback when AST fails:** Regex does not understand scope; it can mislabel parents and callback types. Prefer improving AST robustness (parser options, line-matching for arrows) so fallback is rare, or clearly document fallback as best-effort only.
- **findCallbackWithFallbackPatterns:** Heuristic over two lines of text; can mislabel. Only used when AST fails. Consider removing or narrowing to a single, well-defined fallback.
- **~~checkMethodCallback hardcoded list~~:** Resolved. CallExpression callback type now uses `getCalleeCallbackName`: property name for any MemberExpression (e.g. `arr.map` → "map", `lib.debounce` → "debounce"), identifier name for Identifier. No whitelist.
- **checkJSXAttributeCallback:** Relies on "on*" and "ref" naming. JSX is framework-agnostic, but the convention is React/Preact/Vue–style. Non-JSX frameworks are not special-cased (they only get CallExpression). Document or relax if targeting other template systems.
- **identifyCallbackContext order:** ReturnStatement → JSXAttribute → CallExpression is intentional (cleanup before generic call). No known issue; keep order documented.
- **Insufficient direct tests for extractFunctionNameAST:** Tests cover `extractFunctionName` with mocks; there are no dedicated tests that force the AST path and assert exact names/callback types. Add tests that parse real snippets and assert `extractFunctionNameAST` (or `extractFunctionName`) output.
- **getBaseFunctionName:** Now strips any trailing " (X)" repeatedly, which is generic and avoids a long hardcoded list. Remaining risk: standalone tokens (e.g. "addEventListener callback") are still special-cased. Document behavior for edge names.
- **Hierarchy layer (function-hierarchy.js):** Framework-agnostic; uses whatever name extraction provides as the leaf (no whitelist). See [function-hierarchy.md](./function-hierarchy.md).
- **Brittleness of string-based hierarchy:** Hierarchical names are built and parsed as strings (e.g. "Parent (useEffect) (handleReInit)"). Any change in format requires coordinated updates in `getBaseFunctionName`, `extractCallbackTypeFromName`, and export-generators. Consider a small structured representation (e.g. { base, segments }) for hierarchy to avoid regex parsing.
