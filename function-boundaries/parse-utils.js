/**
 * Character-level parsing: comments, strings, regex, brace counting.
 */

/**
 * Handles escape sequences in strings
 */
export function handleEscapeSequence(char, inString, escapeNext) {
  if (escapeNext) return { escapeNext: false, shouldContinue: true };
  if (char === '\\' && inString) return { escapeNext: true, shouldContinue: true };
  return { escapeNext: false, shouldContinue: false };
}

/**
 * Checks if a single-line comment starts
 */
export function isSingleLineCommentStart(
  char,
  nextChar,
  inString,
  inRegex,
  inMultiLineComment
) {
  return (
    char === '/' &&
    nextChar === '/' &&
    !inString &&
    !inRegex &&
    !inMultiLineComment
  );
}

/**
 * Checks if a multi-line comment starts
 */
export function isMultiLineCommentStart(
  char,
  nextChar,
  inString,
  inRegex,
  inSingleLineComment
) {
  return (
    char === '/' &&
    nextChar === '*' &&
    !inString &&
    !inRegex &&
    !inSingleLineComment
  );
}

/**
 * Checks if a multi-line comment ends
 */
export function isMultiLineCommentEnd(char, nextChar, inMultiLineComment) {
  return char === '*' && nextChar === '/' && inMultiLineComment;
}

/**
 * Handles comment detection and state updates
 */
export function handleComments(
  char,
  nextChar,
  inString,
  inRegex,
  inSingleLineComment,
  inMultiLineComment
) {
  if (
    isSingleLineCommentStart(
      char,
      nextChar,
      inString,
      inRegex,
      inMultiLineComment
    )
  ) {
    return {
      inSingleLineComment: true,
      inMultiLineComment: false,
      shouldBreak: true,
      shouldContinue: false,
      skipNext: false,
    };
  }
  if (
    isMultiLineCommentStart(
      char,
      nextChar,
      inString,
      inRegex,
      inSingleLineComment
    )
  ) {
    return {
      inSingleLineComment: false,
      inMultiLineComment: true,
      shouldBreak: false,
      shouldContinue: true,
      skipNext: true,
    };
  }
  if (isMultiLineCommentEnd(char, nextChar, inMultiLineComment)) {
    return {
      inSingleLineComment: false,
      inMultiLineComment: false,
      shouldBreak: false,
      shouldContinue: true,
      skipNext: true,
    };
  }
  if (inSingleLineComment || inMultiLineComment) {
    return {
      inSingleLineComment,
      inMultiLineComment,
      shouldBreak: false,
      shouldContinue: true,
      skipNext: false,
    };
  }
  return {
    inSingleLineComment: false,
    inMultiLineComment: false,
    shouldBreak: false,
    shouldContinue: false,
    skipNext: false,
  };
}

/**
 * Handles string literal detection
 */
export function handleStringLiterals(char, inRegex, inString, stringChar) {
  if ((char === '"' || char === "'") && !inRegex) {
    if (!inString) return { inString: true, stringChar: char };
    if (char === stringChar) return { inString: false, stringChar: null };
  }
  return { inString, stringChar };
}

/**
 * Detects if a slash character is the start of a regex pattern
 */
export function isRegexStart(line, j, _prevChar) {
  const beforeSlash = line.substring(Math.max(0, j - 2), j).trim();
  return (
    beforeSlash === '' ||
    beforeSlash.endsWith('=') ||
    beforeSlash.endsWith('(') ||
    beforeSlash.endsWith('[') ||
    beforeSlash.endsWith(',') ||
    /^\s*$/.test(beforeSlash)
  );
}

export function couldBeRegexStart(char, prevChar, inRegex, inString) {
  return (
    char === '/' &&
    prevChar !== '/' &&
    prevChar !== '*' &&
    !inRegex &&
    !inString
  );
}

export function couldBeRegexEnd(char, nextChar, inRegex) {
  return char === '/' && inRegex && nextChar !== '/' && nextChar !== '*';
}

/**
 * Handles regex detection
 */
export function handleRegexDetection(
  char,
  prevChar,
  nextChar,
  line,
  j,
  inRegex,
  inString
) {
  if (couldBeRegexStart(char, prevChar, inRegex, inString)) {
    if (isRegexStart(line, j, prevChar)) return true;
  }
  if (couldBeRegexEnd(char, nextChar, inRegex)) return false;
  return inRegex;
}

/**
 * Creates a result object with updated state
 */
export function createBracesResult(
  openBraces,
  closeBraces,
  state,
  updatedState,
  shouldBreak,
  shouldContinue,
  skipNext
) {
  return {
    openBraces,
    closeBraces,
    state: { ...state, ...updatedState },
    shouldBreak,
    shouldContinue,
    skipNext
  };
}

/**
 * Processes escape sequence
 */
export function processEscapeSequence(
  char,
  inString,
  escapeNext,
  state,
  openBraces,
  closeBraces
) {
  const escapeResult = handleEscapeSequence(char, inString, escapeNext);
  if (escapeResult.shouldContinue) {
    return {
      result: createBracesResult(
        openBraces,
        closeBraces,
        state,
        { escapeNext: escapeResult.escapeNext },
        false,
        true,
        false
      ),
      escapeNext: escapeResult.escapeNext
    };
  }
  return { result: null, escapeNext: escapeResult.escapeNext };
}

/**
 * Handles comment processing
 */
export function processCommentHandling(
  char,
  nextChar,
  inString,
  inRegex,
  inSingleLineComment,
  inMultiLineComment,
  escapeNext,
  state,
  openBraces,
  closeBraces
) {
  const commentResult = handleComments(
    char,
    nextChar,
    inString,
    inRegex,
    inSingleLineComment,
    inMultiLineComment
  );
  if (commentResult.shouldBreak) {
    return {
      result: createBracesResult(
        openBraces,
        closeBraces,
        state,
        {
          inSingleLineComment: commentResult.inSingleLineComment,
          inMultiLineComment: commentResult.inMultiLineComment,
          escapeNext
        },
        true,
        false,
        false
      ),
      inSingleLineComment: commentResult.inSingleLineComment,
      inMultiLineComment: commentResult.inMultiLineComment
    };
  }
  if (commentResult.shouldContinue) {
    return {
      result: createBracesResult(
        openBraces,
        closeBraces,
        state,
        {
          inSingleLineComment: commentResult.inSingleLineComment,
          inMultiLineComment: commentResult.inMultiLineComment,
          escapeNext
        },
        false,
        true,
        commentResult.skipNext
      ),
      inSingleLineComment: commentResult.inSingleLineComment,
      inMultiLineComment: commentResult.inMultiLineComment
    };
  }
  return {
    result: null,
    inSingleLineComment: commentResult.inSingleLineComment,
    inMultiLineComment: commentResult.inMultiLineComment
  };
}

/**
 * Handles string literal processing
 */
export function processStringLiteralHandling(
  char,
  inRegex,
  inString,
  stringChar,
  escapeNext,
  state,
  openBraces,
  closeBraces
) {
  const stringResult = handleStringLiterals(char, inRegex, inString, stringChar);
  if (
    stringResult.inString !== inString ||
    stringResult.stringChar !== stringChar
  ) {
    return {
      result: createBracesResult(
        openBraces,
        closeBraces,
        state,
        {
          inString: stringResult.inString,
          stringChar: stringResult.stringChar,
          escapeNext
        },
        false,
        true,
        false
      ),
      inString: stringResult.inString,
      stringChar: stringResult.stringChar
    };
  }
  return {
    result: null,
    inString: stringResult.inString,
    stringChar: stringResult.stringChar,
  };
}

/**
 * Processes a single character in the line to count braces
 */
export function processCharacterForBraces(
  char,
  prevChar,
  nextChar,
  line,
  j,
  state,
  openBraces,
  closeBraces
) {
  let {
    inRegex,
    inString,
    inSingleLineComment,
    inMultiLineComment,
    stringChar,
    escapeNext,
  } = state;

  const escapeHandling = processEscapeSequence(
    char,
    inString,
    escapeNext,
    state,
    openBraces,
    closeBraces
  );
  if (escapeHandling.result) return escapeHandling.result;
  escapeNext = escapeHandling.escapeNext;

  const commentHandling = processCommentHandling(
    char,
    nextChar,
    inString,
    inRegex,
    inSingleLineComment,
    inMultiLineComment,
    escapeNext,
    state,
    openBraces,
    closeBraces
  );
  if (commentHandling.result) return commentHandling.result;
  inSingleLineComment = commentHandling.inSingleLineComment;
  inMultiLineComment = commentHandling.inMultiLineComment;

  const stringHandling = processStringLiteralHandling(
    char,
    inRegex,
    inString,
    stringChar,
    escapeNext,
    state,
    openBraces,
    closeBraces
  );
  if (stringHandling.result) return stringHandling.result;
  inString = stringHandling.inString;
  stringChar = stringHandling.stringChar;

  const newRegexState = handleRegexDetection(
    char,
    prevChar,
    nextChar,
    line,
    j,
    inRegex,
    inString
  );
  if (newRegexState !== inRegex) {
    return createBracesResult(
      openBraces,
      closeBraces,
      state,
      {
        inRegex: newRegexState,
        inString,
        stringChar,
        escapeNext
      },
      false,
      true,
      false
    );
  }
  inRegex = newRegexState;

  if (!inRegex && !inString) {
    if (char === '{') openBraces += 1;
    if (char === '}') closeBraces += 1;
  }

  return createBracesResult(
    openBraces,
    closeBraces,
    state,
    { inRegex, inString, stringChar, escapeNext },
    false,
    false,
    false
  );
}
