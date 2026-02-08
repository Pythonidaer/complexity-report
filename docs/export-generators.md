# Export Generators

## Overview

The `export-generators/` directory produces human-readable text exports (Markdown and plain text) of function names from the complexity report. The exports provide two main views: all functions including callbacks and nested functions, and functions organized by folder/file structure. The pipeline is driven by `report/index.js` (run via `npm run lint:complexity`), which collects ESLint complexity data and calls the generators to write `function-names.all.md`, `function-names.all.txt`, `function-names-by-file.md`, and `function-names-by-file.txt`.

**All functions output** is produced by the `*-exports.js` modules. For each detected function (including anonymous callbacks, nested functions, and hooks), it builds hierarchical names showing parent-child relationships using indentation and arrow notation. Functions are sorted alphabetically by their hierarchical names to make scanning easier. The "all functions" exports provide a complete inventory of every callable unit in the codebase.

**By-folder output** is produced by the same modules but organizes functions by directory and file structure. Each folder section lists its files, and each file lists its functions sorted by line number (matching source code order). Hierarchical relationships are shown using indentation and arrows to indicate nesting. This view helps users quickly locate functions in the actual source files and understand the code flow.

## Function naming and hierarchy

Function names are extracted from the AST parser and include context about where they're defined. The hierarchical naming system shows parent-child relationships for nested functions and callbacks. Names are displayed using indentation and arrow notation to show nesting depth, making it clear which functions are defined inside others.

**Current implementation issues:** The export generators currently use regex-based pattern matching (`hasCallbackSuffix`, `extractCallbackType`) to parse and manipulate function names. This approach is problematic because it's inaccurate, framework-specific, and creates the need for deduplication workarounds. Function names should be extracted cleanly from the AST during initial parsing, not post-processed with regex. The hierarchical relationships should also come directly from AST traversal rather than string manipulation.

## Output formats

**Markdown exports** (`.md` files) use table format for better readability:

```markdown
| Function Name | Complexity | Location |
|--------------|------------|----------|
| addEventListener callback | 10 | src/main.tsx:34 |
| AgencyLogosComponent | 1 | src/sections/AgencyLogos/index.tsx:24 |
```

For by-folder exports, Markdown uses folder and file headers with nested function lists sorted by line number:

```markdown
### src/components/

#### `Button.tsx`

| Line | Function Name | Complexity |
|------|--------------|------------|
| 12 | Button | 5 |
| 20 |   → useCallback callback | 3 |
| 25 |   → useEffect callback | 2 |
```

**Plain text exports** (`.txt` files) use indentation and tree structure with arrows to show hierarchy:

```
Button
  → useCallback callback
    → handleClick
  → useEffect callback
```

For by-folder exports, plain text uses folder/file separators and line numbers:

```
src/components/
───────────────

  Button.tsx
    12: Button
    20:   → useCallback callback
    25:   → useEffect callback
```

## Module roles

- **`index.js`** — Main orchestrator that generates all export files; builds file boundaries map, groups functions by file, and calls the format-specific generators
- **`helpers.js`** — Shared utilities for hierarchical naming, nesting detection, and function grouping; contains problematic regex-based pattern matching that should be replaced with AST-based extraction
- **`md-exports.js`** — Generates Markdown exports in table format; produces `function-names.all.md` (alphabetically sorted) and `function-names-by-file.md` (folder structure, line-sorted)
- **`txt-exports.js`** — Generates plain text exports with tree structure; produces `function-names.all.txt` (alphabetically sorted) and `function-names-by-file.txt` (folder structure, line-sorted)

**Dependencies:**  
All generators depend on `function-extraction/` for `getBaseFunctionName` and `getDirectory`, and on `function-boundaries/` for determining function start/end lines. The `helpers.js` module contains the core logic for building hierarchical names and detecting nesting, but this logic relies on regex pattern matching that should be replaced with AST-based extraction.

## TODOs

### High Priority - Accuracy & Architecture

- [ ] **Replace regex-based function name parsing with AST-based extraction** — Remove `hasCallbackSuffix`, `extractCallbackType`, and related regex patterns; function names should come directly from AST parsing without post-processing
- [ ] **Eliminate deduplication workarounds** — If function names are extracted correctly from the AST, there should be no duplicate entries requiring deduplication by base name
- [ ] **Simplify hierarchical naming** — Hierarchical relationships should come from AST traversal context, not from string manipulation in `buildHierarchicalFunctionName`
- [ ] **Fix function-extraction/** — Ensure `extractFunctionName` uses AST directly instead of regex patterns so export-generators receive clean, accurate function names

### Format Improvements

- [ ] **Implement table format for Markdown exports** — Use `| Function Name | Complexity | Location |` table format instead of bullet lists with inline info
- [ ] **Expand "CC" abbreviation** — Change "CC" to "Complexity" or "Cyclomatic Complexity" for clarity
- [ ] **Implement indentation/tree hierarchy notation** — Use indentation and `→` arrows instead of parentheses for showing nested functions (e.g., `Button → useCallback callback → handleClick`)
- [ ] **Sort by-folder exports by line number** — Change from alphabetical to line-number sorting to match source code order
- [ ] **Add nesting indicators** — Use indentation to show which functions are nested within others in the by-folder exports

### Code Organization

- [ ] **Remove or refactor `handleNonCallbackCase`** — This function does almost nothing useful; either implement proper named-nested-function handling or remove it
- [ ] **Consolidate boundary-finding logic** — `addTopLevelFunctionNoBoundary` and `addTopLevelFunctionWithBoundary` are nearly identical; merge or simplify
- [ ] **Document why boundaries are used** — Add comments explaining that boundaries determine parent-child relationships for nesting detection

### Future Enhancements

- [ ] **Add line number column** — Consider adding line numbers as a separate column in table format for easier source code lookup
- [ ] **Add complexity threshold highlighting** — Consider highlighting or marking functions that exceed the complexity threshold
- [ ] **Add summary statistics** — Consider adding per-file or per-folder summary stats (total functions, average complexity, max complexity)
