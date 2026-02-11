/**
 * Groups functions by base name and file, keeping the highest complexity version
 * @param {Array} functions - Array of function objects
 * @param {Function} getBaseFunctionName - Function to get base function name
 * @returns {Array} Array of function objects with highest complexity per group
 */
function groupFunctionsByBaseName(functions, getBaseFunctionName) {
  const functionGroups = new Map();
  functions.forEach(issue => {
    const baseName = getBaseFunctionName(issue.functionName || 'unknown');
    const key = `${issue.file}:${baseName}`;
    const complexityNum = parseInt(issue.complexity, 10);
    
    const existing = functionGroups.get(key);
    if (!existing || complexityNum > parseInt(existing.complexity, 10)) {
      functionGroups.set(key, issue);
    }
  });
  
  return Array.from(functionGroups.values())
    .sort((a, b) => parseInt(b.complexity, 10) - parseInt(a.complexity, 10));
}

/**
 * Generates HTML row for a function
 * @param {Object} issue - Function object
 * @param {Function} getComplexityLevel - Function to get complexity level
 * @param {Function} getBaseFunctionName - Function to get base function name
 * @param {boolean} showAllInitially - Show all functions initially
 * @param {number} complexityThreshold - Complexity threshold
 * @param {string} fileLinkPrefix - Optional prefix for file links (e.g. '../' when folder page is in a subdir)
 * @returns {string} HTML row string
 */
function generateFunctionRow(
  issue,
  getComplexityLevel,
  getBaseFunctionName,
  showAllInitially,
  complexityThreshold = 10,
  fileLinkPrefix = ''
) {
  const level = getComplexityLevel(issue.complexity);
  const complexityNum = parseInt(issue.complexity, 10);
  const isOverThreshold = complexityNum > complexityThreshold;
  const maxComplexityForBar = Math.max(30, complexityNum);
  const percentage = Math.min(100, (complexityNum / maxComplexityForBar) * 100);
  const fileName = issue.file.split('/').pop();
  const fileLinkPath = `${fileLinkPrefix}${fileName}.html`;
  const baseFunctionName = getBaseFunctionName(issue.functionName || 'unknown');
  
  return `
    <tr class="${level}"
        data-over-threshold="${isOverThreshold}"
        data-file="${issue.file}"
        data-function="${baseFunctionName}"
        data-complexity="${complexityNum}"
        data-line="${issue.line}"
        ${!showAllInitially && !isOverThreshold ? 'style="display: none;"' : ''}>
      <td class="file"><a href="${fileLinkPath}">${issue.file}</a></td>
      <td class="bar ${level}">
        <div class="chart">
          <div class="cover-fill ${level} ${percentage === 100 ? 'cover-full' : ''}"
               style="width: ${percentage}%"></div>
          <div class="cover-empty" style="width: ${100 - percentage}%"></div>
        </div>
      </td>
      <td class="file">
        <span style="font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 13px;">
          ${baseFunctionName}
        </span>
      </td>
      <td class="pct">
        <span class="complexity-value ${level}">${complexityNum}</span>
      </td>
      <td class="abs">${issue.line}</td>
    </tr>
  `;
}

/**
 * Generates the JavaScript code for folder page functionality
 * @returns {string} JavaScript code as string
 */
function generateFolderPageScript() {
  return `(function() {
      function initFilters() {
        // Checkbox filter
        const checkbox = document.getElementById('showAllFunctions');
        const fileSearchInput = document.getElementById('fileSearch');
        const table = document.querySelector('.coverage-summary.function-complexity-table');
        
        if (!table) {
          console.warn('Complexity table not found');
          return;
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
          console.warn('Table tbody not found');
          return;
        }
        
        function applyFilters() {
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const showAll = checkbox ? checkbox.checked : true;
          const searchValue = fileSearchInput ? fileSearchInput.value : '';
          
          // Try to create a RegExp from the searchValue
          let searchRegex;
          try {
            searchRegex = searchValue ? new RegExp(searchValue, 'i') : null;
          } catch (error) {
            searchRegex = null;
          }
          
          rows.forEach(row => {
            // Check if row matches search filter
            let matchesSearch = true;
            if (searchValue) {
              if (searchRegex) {
                matchesSearch = searchRegex.test(row.textContent);
              } else {
                matchesSearch = row.textContent.toLowerCase().includes(searchValue.toLowerCase());
              }
            }
            
            // Check if row matches checkbox filter
            const isOverThreshold = row.getAttribute('data-over-threshold') === 'true';
            const matchesCheckbox = showAll || isOverThreshold;
            
            // Show row only if it matches both filters
            if (matchesSearch && matchesCheckbox) {
              // Remove inline style attribute entirely if it only contains display:none
              // Otherwise set display to empty string to show the row
              if (row.getAttribute('style') === 'display: none;') {
                row.removeAttribute('style');
              } else {
                row.style.display = '';
              }
            } else {
              row.style.display = 'none';
            }
          });
        }
        
        if (checkbox) {
          checkbox.addEventListener('change', applyFilters);
        }
        
        // Filter functionality
        if (fileSearchInput) {
          fileSearchInput.addEventListener('input', applyFilters);
        }
      }
      
      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilters);
      } else {
        initFilters();
      }
      
      // Sorting functionality
      const headers = document.querySelectorAll('.coverage-summary th[data-sort]');
      let currentSort = { column: null, direction: 'asc' };
      
      function getSortValue(row, column) {
        if (column === 'file') {
          return row.getAttribute('data-file') || '';
        }
        if (column === 'function') {
          return (row.getAttribute('data-function') || '').toLowerCase();
        }
        if (column === 'functions') {
          const parts = (row.getAttribute('data-functions') || '0/0').split('/');
          return parseInt(parts[1] || 1, 10);
        }
        if (column === 'complexity') {
          return parseFloat(row.getAttribute('data-complexity') || 0);
        }
        if (column === 'line') {
          return parseFloat(row.getAttribute('data-line') || 0);
        }
        return 0;
      }
      
      function compareSortValues(aVal, bVal, direction, column) {
        if (column === 'functions') {
          if (direction === 'desc') {
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
          }
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        
        if (typeof aVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return direction === 'asc' ? comparison : -comparison;
        }
        
        if (direction === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
      
      headers.forEach(header => {
        header.addEventListener('click', function() {
          const column = this.getAttribute('data-sort');
          const tbody = this.closest('table').querySelector('tbody');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          
          // Set sort column and direction
          if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.column = column;
            currentSort.direction = column === 'functions' ? 'desc' : 'asc';
          }
          
          // Update sort classes
          headers.forEach(h => {
            // Remove sorted classes from all headers
            h.classList.remove('sorted', 'sorted-desc');
            // Add appropriate class to the clicked header
            if (h === this) {
              if (currentSort.direction === 'asc') {
                h.classList.add('sorted');
              } else {
                h.classList.add('sorted-desc');
              }
            }
          });
          
          // Sort rows
          rows.sort((a, b) => {
            const aVal = getSortValue(a, column);
            const bVal = getSortValue(b, column);
            return compareSortValues(aVal, bVal, currentSort.direction, column);
          });
          
          // Re-append sorted rows
          tbody.innerHTML = '';
          rows.forEach(row => tbody.appendChild(row));
        });
      });
    })();`;
}

/**
 * Generates summary section HTML (similar to main index)
 * @param {Object} decisionPointTotals - Object with controlFlow, expressions,
 *                                       functionParameters totals
 * @param {number} totalFunctions - Total number of functions
 * @param {number} withinThreshold - Number of functions within threshold
 * @param {number} withinThresholdPercentage - Percentage within threshold
 * @returns {string} Summary section HTML
 */
function generateSummarySection(
  decisionPointTotals,
  totalFunctions,
  withinThreshold,
  _withinThresholdPercentage
) {
  const { controlFlow, expressions, functionParameters } = decisionPointTotals;
  
  // Helper function to format percentage (2 decimals if needed)
  const formatPercentage = (numerator, denominator) => {
    if (denominator === 0) return '0%';
    const percentage = (numerator / denominator) * 100;
    // Whole number: no decimals; otherwise 2 decimal places
    return percentage % 1 === 0
      ? `${percentage}%`
      : `${percentage.toFixed(2)}%`;
  };
  
  // Functions: show bold % and fraction (can be < 100%)
  // Control Flow / Expressions / Default Parameters: always 100% here
  const functionsPercentage = formatPercentage(
    withinThreshold,
    totalFunctions
  );
  
  return `
    <div class="clearfix">
      <div class='fl pad1y space-right2'>
        <span class="strong">${functionsPercentage}</span>
        <span class="quiet">Functions</span>
        <span class='fraction'>${withinThreshold}/${totalFunctions}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Control Flow</span>
        <span class='fraction'>${controlFlow}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Expressions</span>
        <span class='fraction'>${expressions}</span>
      </div>
      <div class='fl pad1y space-right2'>
        <span class="quiet">Default Parameters</span>
        <span class='fraction'>${functionParameters}</span>
      </div>
    </div>`;
}

/**
 * Calculates status bar level based on percentage
 * @param {number} percentageValue - Percentage value
 * @returns {string} Level string
 */
function calculateStatusLevel(percentageValue) {
  if (percentageValue >= 80) return 'high';
  if (percentageValue >= 60) return 'high';
  if (percentageValue >= 40) return 'medium';
  return 'low';
}

/**
 * Generates relative path for shared.css
 * @param {string} folderPath - Folder path
 * @returns {string} Relative path to shared.css
 */
function getSharedCssPath(folderPath) {
  return folderPath ? '../'.repeat(folderPath.split('/').length) + 'shared.css' : 'shared.css';
}

/**
 * Generates back link path
 * @param {string} folderPath - Folder path
 * @returns {string} Back link path
 */
function getBackLink(folderPath) {
  return folderPath ? '../'.repeat(folderPath.split('/').length) + 'index.html' : 'index.html';
}

/**
 * Computes depth, asset prefix, and link paths for a folder page
 * @param {string} folderPath - Folder directory path (empty for root)
 * @param {number|null} outputDepth - Override depth (e.g. 1 for root at root/index.html)
 * @returns {{ depth: number, assetPrefix: string, backLink: string, sharedCssPath: string, fileLinkPrefix: string }}
 */
function getFolderPageContext(folderPath, outputDepth) {
  const depth = outputDepth !== null && outputDepth !== undefined
    ? outputDepth
    : (folderPath ? folderPath.split('/').length : 0);
  const assetPrefix = depth > 0 ? '../'.repeat(depth) : '';
  const backLink = assetPrefix ? `${assetPrefix}index.html` : 'index.html';
  const sharedCssPath = assetPrefix ? `${assetPrefix}shared.css` : 'shared.css';
  const fileLinkPrefix = !folderPath && depth === 1 ? '../' : '';
  return { depth, assetPrefix, backLink, sharedCssPath, fileLinkPrefix };
}

/**
 * Returns status bar level for a folder based on within-threshold percentage
 * @param {{ totalFunctions: number, withinThreshold: number }} folder
 * @returns {string}
 */
function getFolderStatusLevel(folder) {
  const pct = folder.totalFunctions > 0
    ? (folder.withinThreshold / folder.totalFunctions) * 100
    : 100;
  return calculateStatusLevel(pct);
}

/**
 * @param {number} [outputDepth] - If set, folder page is written at this depth (e.g. 1 for root at root/index.html). Used for assets and file links.
 */
export function generateFolderHTML(
  folder,
  allFolders,
  showAllInitially,
  getComplexityLevel,
  getBaseFunctionName,
  complexityThreshold = 10,
  decisionPointTotals = {
    controlFlow: 0,
    expressions: 0,
    functionParameters: 0,
  },
  outputDepth = null
) {
  const folderPath = folder.directory;
  const ctx = getFolderPageContext(folderPath, outputDepth);
  const summarySection = generateSummarySection(
    decisionPointTotals,
    folder.totalFunctions,
    folder.withinThreshold,
    folder.percentage
  );
  const level = getFolderStatusLevel(folder);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complexity Report - ${folderPath || 'Root'}</title>
  <link rel="stylesheet" href="${ctx.sharedCssPath}" />
</head>
<body>
  <div class="pad2">
    <div class="header-row">
      <h1><a href="${ctx.backLink}" style="color: #0074D9; text-decoration: none; font-weight: bold;">All files</a>${folderPath ? ` <span style="font-weight: bold;">${folderPath}</span>` : ''}</h1>
      <a href="${ctx.assetPrefix ? ctx.assetPrefix + 'about.html' : 'about.html'}" class="about-link">About Cyclomatic Complexity</a>
    </div>
    ${summarySection}
    <div class="quiet" style="display: flex; align-items: center; gap: 15px; margin-top: 14px;">
      <div>
        Filter:
        <input type="search" id="fileSearch">
      </div>
      <label style="margin: 0; font-weight: normal;">
        <input type="checkbox" id="showAllFunctions" ${showAllInitially ? 'checked' : ''}>
        Show all functions
      </label>
    </div>
  </div>
  <div class='status-line ${level}'></div>
  <div class="pad2">
    <table class="coverage-summary function-complexity-table">
      <thead>
        <tr>
          <th class="file" data-sort="file">File <span class="sorter"></span></th>
          <th class="bar" data-sort="complexity" style="text-align: right;"><span class="sorter"></span></th>
          <th class="file" data-sort="function">Function <span class="sorter"></span></th>
          <th class="pct" data-sort="complexity">Complexity <span class="sorter"></span></th>
          <th class="abs" data-sort="line">Line <span class="sorter"></span></th>
        </tr>
      </thead>
      <tbody>
        ${groupFunctionsByBaseName(folder.functions, getBaseFunctionName)
          .map((issue) =>
            generateFunctionRow(
              issue,
              getComplexityLevel,
              getBaseFunctionName,
              showAllInitially,
              complexityThreshold,
              ctx.fileLinkPrefix
            )
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <div class='footer quiet pad2 space-top1 center small'>
    Complexity report generated by <a href="https://www.github.com/pythonidaer" target="_blank" rel="noopener noreferrer">pythonidaer</a> at ${new Date().toISOString()}
  </div>
  <script>
    ${generateFolderPageScript()}
  </script>
</body>
</html>`;
}
