# Sibling Callback Boundary Detection Fix

## Issue Summary

**Problem:** Consecutive single-line arrow function callbacks were incorrectly shown as nested in the Function Complexity Breakdown table.

**Example:**
```javascript
functions.forEach((func) => {
  const breakdown = calculate(func);
  controlFlowTypes.forEach((type) => { controlFlowTotal += breakdown[type] || 0; });
  expressionTypes.forEach((type) => { expressionsTotal += breakdown[type] || 0; });
  functionParameterTypes.forEach((type) => { functionParametersTotal += breakdown[type] || 0; });
});
```

**Before (INCORRECT):**
```
calculateDecisionPointTotals → forEach
calculateDecisionPointTotals → forEach
calculateDecisionPointTotals → forEach → forEach
calculateDecisionPointTotals → forEach → forEach → forEach
calculateDecisionPointTotals → forEach → forEach → forEach → forEach
```

**After (CORRECT):**
```
calculateDecisionPointTotals → forEach
calculateDecisionPointTotals → forEach
calculateDecisionPointTotals → forEach → forEach
calculateDecisionPointTotals → forEach → forEach
calculateDecisionPointTotals → forEach → forEach
```

## Root Cause

The brace-counting logic in `function-boundaries/` was not correctly detecting when single-line arrow functions with brace bodies ended. 

**Pattern:**
```javascript
.forEach((type) => { /* single line body */ });
```

**What happened:**
1. Scanner detected `=>` followed by `{`
2. Scanner started counting braces: `braceCount = 1`
3. Scanner continued to next lines looking for closing brace
4. Scanner picked up braces from subsequent callbacks
5. Result: Callback's end line extended way past its actual boundary

**Why this broke hierarchy:**
- `findImmediateParentFunction()` uses boundary containment to determine parent-child relationships
- If callback A's boundary incorrectly extends to include callback B's line, callback B appears to be nested inside A
- This cascaded: A contains B, B contains C, C contains D (all incorrect)

## Solution

Added detection for single-line arrow function brace bodies in `arrow-brace-body.js`:

### New Helper Function: `isSingleLineBraceBody()`

```javascript
function isSingleLineBraceBody(line, arrowIndex) {
  const afterArrow = line.substring(arrowIndex + 2);
  const openBraces = (afterArrow.match(/{/g) || []).length;
  const closeBraces = (afterArrow.match(/}/g) || []).length;
  
  // Must have at least one brace, and braces must balance
  if (openBraces === 0 || openBraces !== closeBraces) {
    return false;
  }
  
  // Check for common single-line patterns:
  // - Ends with }); (callback in method call)
  // - Ends with }; (arrow function assignment)
  // - Ends with }) (callback without semicolon)
  const trimmed = afterArrow.trim();
  return trimmed.endsWith('});') || trimmed.endsWith('};') || trimmed.endsWith('})');
}
```

### Updated `handleBraceOnSameLine()`

Added early return when single-line brace body is detected:

```javascript
// CRITICAL FIX: Check if this is a single-line arrow function with balanced braces
// This prevents sibling callbacks from being treated as nested
if (isSingleLineBraceBody(line, arrowIndex)) {
  boundaries.set(functionLine, { start: i + 1, end: i + 1 });
  return {
    end: i + 1,
    found: true,
    arrowFunctionHandled: true,
    arrowFunctionEndSet: true,
    inFunctionBody: false,
    braceCount: 0
  };
}
```

**Key insight:** When braces balance on the same line and the line ends with a terminator pattern (`});`, `};`, `})`), the function ends on that line. No need to scan further.

## Test Coverage

Added comprehensive tests in `function-boundaries.test.js`:

### Test 1: Consecutive Single-Line forEach Callbacks
```javascript
it("should correctly detect boundaries for consecutive single-line forEach callbacks", () => {
  // Tests the calculateDecisionPointTotals pattern
  // Verifies that three sibling forEach callbacks on lines 10, 11 each end on their own line
  // Verifies that line 10 does NOT contain line 11 (sibling, not nested)
});
```

### Test 2: Three Consecutive Single-Line forEach Callbacks
```javascript
it("should correctly detect boundaries for three consecutive single-line forEach callbacks", () => {
  // Tests pattern with three sibling callbacks inside a parent forEach
  // Verifies each sibling ends on its own line
  // Verifies no incorrect nesting between siblings
});
```

## Files Modified

1. **`scripts/function-boundaries/arrow-brace-body.js`**
   - Added `isSingleLineBraceBody()` helper function
   - Updated `handleBraceOnSameLine()` to detect and handle single-line callbacks
   - Complexity: All functions ≤ 10 (threshold maintained)

2. **`scripts/__tests__/function-boundaries.test.js`**
   - Added 2 new tests for sibling callback boundaries
   - Total tests: 87 (all passing)

3. **`scripts/docs/TODO.md`**
   - Marked "Fix sibling callback boundary detection" as complete

4. **`scripts/README.md`**
   - Updated "Ongoing Debugging" section to reflect fix

## Verification

**All Tests Pass:**
```bash
npm test -- scripts/__tests__/ --run
# Test Files  12 passed (12)
# Tests  291 passed (291)
```

**Complexity Report Verified:**
```bash
npm run lint:complexity
# Highest complexity: 10 / Average: 3
# Using AST-based parser for 100% accuracy
```

**Function Hierarchy Display:**
- `calculateDecisionPointTotals` now shows correct hierarchy
- Three forEach siblings (lines 46, 47, 48) correctly shown as siblings, not nested
- No linter errors introduced

## Impact

**Positive:**
- ✅ Correct function hierarchy display in complexity reports
- ✅ Accurate parent-child relationships for nested functions
- ✅ Improved clarity for developers reading reports
- ✅ No performance impact (early detection is faster)
- ✅ All existing tests still pass

**No Breaking Changes:**
- Multi-line arrow functions still work correctly
- Object literal returns still work correctly
- JSX patterns still work correctly
- All other arrow function patterns unaffected

## Pattern Coverage

The fix correctly handles these patterns:

```javascript
// Pattern 1: Method callback (most common)
array.forEach((item) => { doSomething(item); });

// Pattern 2: Assignment with semicolon
const handler = (event) => { processEvent(event); };

// Pattern 3: Callback without semicolon
promise.then((result) => { handleResult(result) })

// Pattern 4: Nested object access
items.map((x) => { return { id: x.id, value: x.value }; });
```

The fix does NOT affect these patterns (correctly left for multi-line scanning):

```javascript
// Multi-line brace body
array.forEach((item) => {
  const processed = process(item);
  return processed;
});

// Unbalanced braces (opening brace only)
array.forEach((item) => {
  // body continues below
```

## Lessons Learned

1. **Single-line detection is critical** for accurate boundary detection
2. **Pattern matching** (checking line endings) is more reliable than pure brace counting for single-line functions
3. **Early returns** prevent unnecessary scanning and improve accuracy
4. **Test-driven development** caught the issue and verified the fix
5. **Balanced braces + terminator pattern** is a reliable signal for single-line function bodies

## Related Documentation

- [Function Boundaries Module](../function-boundaries/README.md) - if it exists
- [Function Hierarchy Documentation](./function-hierarchy.md)
- [TODO List](./TODO.md) - Item marked complete
- [README](../README.md) - Status updated

## Date

Fixed: February 8, 2026
