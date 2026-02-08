/**
 * Generates the standalone "About Cyclomatic Complexity" page (complexity/about.html).
 * Barebones, Istanbul-style. Examples live on a separate page.
 * @returns {string} Full HTML document string
 */
export function generateAboutPageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Cyclomatic Complexity</title>
  <link rel="stylesheet" href="shared.css" />
  <style>
    body { padding: 20px; line-height: 1.4; }
    .back-link { display: inline-block; margin-bottom: 12px; }
    h1 { margin-top: 1rem; }
    h2 { font-size: 16px; margin: 2rem 0 6px 0; }
    .about-subheading { margin-top: 2rem; }
    .about-last-p { margin-bottom: 2rem; }
    .summary-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 1rem 0 1rem 0; }
    @media (max-width: 640px) { .summary-two-col { grid-template-columns: 1fr; } }
    .summary-col { min-width: 0; }
  </style>
</head>
<body>
  <a href="index.html" class="back-link">← Back to complexity report</a>
  <h1>About Cyclomatic Complexity</h1>
  <p>Cyclomatic complexity measures the number of linearly independent execution paths through a function. It is calculated as a base value of 1 plus the number of decision points. Values above 10 typically indicate code that is harder to test, reason about, and safely modify, and should prompt refactoring. Cyclomatic complexity measures structural branching, not runtime performance or algorithmic efficiency.</p>
  <h2>About This Report</h2>
  <p>This complexity report extends <strong>ESLint's <code>complexity</code> rule</strong> and uses your project's chosen variant (<code>classic</code> or <code>modified</code>; see below). The report analyzes whatever files your ESLint config lints—commonly <code>*.ts</code>, <code>*.tsx</code>, and <code>*.js</code>. Single-file component formats (e.g. Vue <code>.vue</code>, Svelte <code>.svelte</code>) are only included if ESLint is configured to lint them. The lists below show examples of which constructs are counted and which are not.</p>
  <div class="summary-two-col">
    <div class="summary-col">
      <h3>Counted</h3>
      <ul>
        <li><strong>Callable units</strong> — complexity is measured per function, method, or arrow function</li>
        <li><strong>Statements</strong> — such as: <code>if</code>, <code>else if</code>, <code>switch</code> (in <code>modified</code>)</li>
        <li><strong>Clauses</strong> — such as: <code>catch</code>, <code>case</code> (in <code>classic</code>)</li>
        <li><strong>Loops</strong> — such as: <code>for</code>, <code>for...of</code>, <code>for...in</code>, <code>while</code>, <code>do...while</code></li>
        <li><strong>Ternary</strong> —<code>? :</code></li>
        <li><strong>Logical</strong> and — <code>&&</code></li>
        <li><strong>Logical</strong> or — <code>||</code></li>
        <li><strong>Optional chaining</strong> — <code>?.</code></li>
        <li><strong>Nullish coalescing</strong> — <code>??</code></li>
        <li><strong>Default parameters</strong></li>
      </ul>
    </div>
    <div class="summary-col">
      <h3>Not counted</h3>
      <ul>
        <li><strong>Top-level module code</strong> (code outside of functions); runs once at load and is not a callable unit</li>
        <li><strong>Sequential statements</strong> (assignments, calls, declarations)</li>
        <li><code>else</code> — does not introduce a new decision path by itself</li>
        <li><code>try</code> — does not add complexity by itself; each <code>catch</code> adds one decision path</li>
        <li>JSX without conditionals</li>
        <li>Hook calls (only callbacks count)</li>
        <li>TypeScript types, interfaces, generics</li>
        <li>Literals, destructuring; arithmetic, strings</li>
        <li>Property access; method calls</li>
        <li><strong>Early exits</strong> (<code>return</code>, <code>break</code>, <code>continue</code>) — do not add complexity unless conditional</li>
        <li><strong>Nesting depth</strong> — nesting itself does not increase cyclomatic complexity; only decision points do, and nested functions are measured independently with their own base complexity.</li>
      </ul>
    </div>
  </div>
  <h2>Classic vs modified variant</h2>
  <p>ESLint's <code>complexity</code> rule supports two variants. This report uses the variant from your project's config.</p>
  <ul>
    <li><strong>Classic</strong> — Each <code>case</code> adds +1. So a switch with 5 cases adds 5 to complexity.</li>
    <li><strong>Modified</strong> — The whole <code>switch</code> adds +1 regardless of how many cases. So a switch with 5 cases adds 1 to complexity.</li>
  </ul>
  <h2 class="about-subheading">Cyclomatic vs. Cognitive Complexity</h2>
  <p class="about-last-p">While cyclomatic complexity measures the number of independent execution paths in a function to estimate testing effort and structural risk, cognitive complexity is designed to reflect how difficult code is for a human to read and understand. Cognitive complexity increases with control flow and nesting that disrupts linear reading (such as conditionals, loops, and early exits), but intentionally does not track boolean expressions, default parameters, or short-circuit operators. By focusing on mental load rather than path count, cognitive complexity better highlights code that is technically correct but unnecessarily hard to reason about or maintain.</p>
</body>
</html>`;
}
