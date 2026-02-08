/**
 * Line rendering logic for file page (code line HTML, line row HTML)
 */

/**
 * Generates complexity annotation HTML for a function
 */
export function generateComplexityAnnotation(func, getComplexityLevel, escapeHtml) {
  if (!func) return '<span class="cline-any cline-neutral">&nbsp;</span>';
  const complexityNum = parseInt(func.complexity, 10);
  getComplexityLevel(func.complexity);
  return `<span class="cline-any cline-yes" title="Function '${escapeHtml(func.functionName)}' has complexity ${complexityNum}">${complexityNum}</span>`;
}

/**
 * Determines CSS classes for a line based on decision points
 */
export function determineLineClasses(
  decisionPointsOnLine
) {
  const isDecisionPoint = decisionPointsOnLine.length > 0;
  const decisionPointClass = isDecisionPoint ? 'decision-point' : '';
  const allClasses = decisionPointClass ? ` class="${decisionPointClass}"` : '';
  return { classAttr: allClasses, isDecisionPoint };
}

/**
 * Gets range for a single decision point using ONLY AST-provided columns.
 * No regex, no keyword search - only what the AST tells us.
 */
function getRangeForDecisionPoint(dp, line, lineLength) {
  // Use only AST-provided column information
  const hasValidColumns = typeof dp.column === 'number' && 
                         typeof dp.endColumn === 'number' && 
                         dp.endColumn > dp.column &&
                         dp.column >= 0 &&
                         dp.column < lineLength &&
                         dp.endColumn <= lineLength;
  
  if (hasValidColumns) {
    return {
      start: dp.column,
      end: dp.endColumn
    };
  }
  
  // No fallback - if AST doesn't provide valid columns, don't highlight
  return null;
}

/**
 * Builds sorted, non-overlapping ranges from decision points with
 * column/endColumn (0-based from AST)
 */
export function getDecisionPointRanges(decisionPointsOnLine, line) {
  const lineLength = line.length;
  const ranges = [];
  
  for (const dp of decisionPointsOnLine) {
    const range = getRangeForDecisionPoint(dp, line, lineLength);
    if (range) {
      ranges.push({ ...range, type: 'decision-point' });
    }
  }
  
  if (ranges.length === 0) return [];
  
  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    if (ranges[i].start <= last.end) {
      last.end = Math.max(last.end, ranges[i].end);
    } else {
      merged.push(ranges[i]);
    }
  }
  return merged;
}

/**
 * Builds HTML for a code line with precise AST-based highlighting
 * Only highlights decision points
 */
export function buildCodeLineHTML(
  line,
  escapeHtml,
  decisionPointsOnLine
) {
  // Get decision point ranges from AST data
  const decisionPointRanges = getDecisionPointRanges(decisionPointsOnLine, line);
  
  // If no highlights, return plain text
  if (decisionPointRanges.length === 0) {
    return `<span class="code-line">${escapeHtml(line)}</span>`;
  }
  
  // Build HTML with highlighted segments
  const lineLength = line.length;
  const segments = [];
  let pos = 0;
  
  for (const range of decisionPointRanges) {
    // Add unhighlighted gap before this range
    if (range.start > pos) {
      const gapText = line.substring(pos, range.start);
      segments.push(`<span class="code-line">${escapeHtml(gapText)}</span>`);
    }
    
    // Add highlighted decision point range
    const rangeText = line.substring(range.start, range.end);
    segments.push(`<span class="code-line decision-point-line">${escapeHtml(rangeText)}</span>`);
    
    pos = range.end;
  }
  
  // Add any remaining unhighlighted text
  if (pos < lineLength) {
    const remainingText = line.substring(pos, lineLength);
    segments.push(`<span class="code-line">${escapeHtml(remainingText)}</span>`);
  }
  
  return segments.join('');
}

export function generateLineRowHTML(
  line,
  index,
  lineToFunction,
  lineToDecisionPoint,
  getComplexityLevel,
  escapeHtml,
  languageClass = 'lang-js'
) {
  const lineNum = index + 1;
  const func = lineToFunction.get(lineNum);
  const decisionPointsOnLine = lineToDecisionPoint.get(lineNum) || [];
  const complexityAnnotation = generateComplexityAnnotation(
    func,
    getComplexityLevel,
    escapeHtml
  );
  const { classAttr } =
    determineLineClasses(
      decisionPointsOnLine
    );
  
  const codeLineHTML = buildCodeLineHTML(
    line,
    escapeHtml,
    decisionPointsOnLine
  );
  
  return `<tr${classAttr} data-line="${lineNum}">
<td class="line-count quiet"><a name='L${lineNum}'></a><a href='#L${lineNum}'>${lineNum}</a></td>
<td class="line-coverage quiet">${complexityAnnotation}</td>
<td class="text"><pre class="prettyprint ${languageClass}">${codeLineHTML}</pre></td>
</tr>`;
}
