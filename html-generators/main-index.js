/**
 * Generates HTML row for a folder
 * @param {Object} folder - Folder object
 * @returns {string} HTML row string
 */
function generateFolderRow(folder) {
  // Helper function to format percentage (2 decimals if needed)
  const formatPercentage = (numerator, denominator) => {
    if (denominator === 0) return '0%';
    const percentage = (numerator / denominator) * 100;
    // Whole number: no decimals; otherwise 2 decimal places
    return percentage % 1 === 0
      ? `${percentage}%`
      : `${percentage.toFixed(2)}%`;
  };
  
  // Calculate accurate percentage (not the pre-rounded value)
  const percentageValue = folder.totalFunctions > 0 
    ? (folder.withinThreshold / folder.totalFunctions) * 100 
    : 100;
  const percentageDisplay = formatPercentage(
    folder.withinThreshold,
    folder.totalFunctions
  );
  // Use raw value for bar width calculation
  const percentageForBar = percentageValue;

  const level =
    percentageValue >= 80
      ? 'high'
      : percentageValue >= 60
        ? 'high'
        : percentageValue >= 40
          ? 'medium'
          : 'low';
  return `
    <tr data-file="${folder.directory || '.'}"
        data-functions="${folder.withinThreshold}/${folder.totalFunctions}"
        data-percentage="${percentageValue}">
      <td class="file">
        <a href="${folder.directory ? folder.directory + '/index.html' : 'root/index.html'}">
          ${folder.directory || '.'}
        </a>
      </td>
      <td class="bar ${level}">
        <div class="chart">
          <div class="cover-fill ${level} ${percentageForBar === 100 ? 'cover-full' : ''}"
               style="width: ${percentageForBar}%"></div>
          <div class="cover-empty" style="width: ${100 - percentageForBar}%"></div>
        </div>
      </td>
      <td class="pic">${percentageDisplay}</td>
      <td class="pct">${folder.withinThreshold}/${folder.totalFunctions}</td>
    </tr>
  `;
}

/**
 * Generates JavaScript code for main index page
 * @returns {string} JavaScript code as string
 */
function generateMainIndexScript() {
  return `(function() {
      const headers = document.querySelectorAll('.coverage-summary th[data-sort]');
      let currentSort = { column: null, direction: 'asc' };
      
      // Filter functionality
      const fileSearch = document.getElementById('fileSearch');
      if (fileSearch) {
        fileSearch.addEventListener('input', function() {
          const searchValue = this.value;
          const tbody = document.querySelector('.coverage-summary tbody');
          if (!tbody) return;
          const rows = Array.from(tbody.querySelectorAll('tr'));
          
          // Try to create a RegExp from the searchValue. If it fails (invalid regex),
          // it will be treated as a plain text search
          let searchRegex;
          try {
            searchRegex = new RegExp(searchValue, 'i'); // 'i' for case-insensitive
          } catch (error) {
            searchRegex = null;
          }
          
          rows.forEach(row => {
            let isMatch = false;
            
            if (searchRegex) {
              // If a valid regex was created, use it for matching
              isMatch = searchRegex.test(row.textContent);
            } else {
              // Otherwise, fall back to the original plain text search
              isMatch = row.textContent.toLowerCase().includes(searchValue.toLowerCase());
            }
            
            row.style.display = isMatch ? '' : 'none';
          });
        });
      }
      
      function getSortValue(row, column) {
        if (column === 'file') {
          return row.getAttribute('data-file') || '';
        }
        if (column === 'functions') {
          const parts = (row.getAttribute('data-functions') || '0/0').split('/');
          return parseInt(parts[1] || 1, 10);
        }
        if (column === 'percentage') {
          return parseFloat(row.getAttribute('data-percentage') || 0);
        }
        return 0;
      }
      
      function compareValues(aVal, bVal, direction, column) {
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
          
          if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.column = column;
            currentSort.direction = (column === 'functions' || column === 'percentage') ? 'desc' : 'asc';
          }
          
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
          
          rows.sort((a, b) => {
            const aVal = getSortValue(a, column);
            const bVal = getSortValue(b, column);
            return compareValues(aVal, bVal, currentSort.direction, column);
          });
          
          tbody.innerHTML = '';
          rows.forEach(row => tbody.appendChild(row));
        });
      });
      
      // Export functionality
      const exportBtn = document.getElementById('exportBtn');
      if (exportBtn) {
        const exportMenu = document.createElement('div');
        exportMenu.id = 'exportMenu';
        exportMenu.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ccc; border-radius: 2px; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; margin-top: 4px; min-width: 240px;';
        exportMenu.innerHTML = '<div style="display: flex; flex-direction: column; gap: 4px;">' +
          '<a href="reports/function-names.all.txt" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">All Functions (TXT)</a>' +
          '<a href="reports/function-names.all-leaf.txt" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">All Functions – leaf only (TXT)</a>' +
          '<a href="reports/function-names.all.md" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">All Functions (Markdown)</a>' +
          '<hr style="margin: 4px 0; border: none; border-top: 1px solid #ccc;">' +
          '<a href="reports/function-names-by-file.txt" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">By Folder/File (TXT)</a>' +
          '<a href="reports/function-names-by-file-leaf.txt" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">By Folder/File – leaf only (TXT)</a>' +
          '<a href="reports/function-names-by-file.md" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">By Folder/File (Markdown)</a>' +
          '<hr style="margin: 4px 0; border: none; border-top: 1px solid #ccc;">' +
          '<a href="reports/file-names-alphabetical.txt" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">File names – (TXT)</a>' +
          '<a href="reports/file-names-alphabetical.md" download style="padding: 4px 8px; text-decoration: none; color: #000; display: block;">File names – (Markdown)</a>' +
          '</div>';
        exportBtn.parentElement.appendChild(exportMenu);
        
        exportBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', function(e) {
          if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
            exportMenu.style.display = 'none';
          }
        });
      }
    })();`;
}

/**
 * Generates the main index HTML page
 * @param {Array} folders - Array of folder objects
 * @param {number} allFunctionsCount - Total number of functions
 * @param {Array} overThreshold - Array of functions over threshold
 * @param {number} maxComplexity - Maximum complexity value
 * @param {number} avgComplexity - Average complexity value
 * @param {boolean} showAllInitially - Show all functions initially
 * @param {number} _complexityThreshold - Complexity threshold from ESLint
 *                                        (unused, kept for API compatibility)
 * @param {Object} decisionPointTotals - Object with controlFlow, expressions,
 *                                       functionParameters totals
 * @param {number} withinThreshold - Number of functions within threshold
 * @param {number} _withinThresholdPercentage - Percentage within threshold
 *                 (unused, calculated from withinThreshold/allFunctionsCount)
 * @returns {string} Full HTML document string
 */
export function generateMainIndexHTML(
  folders,
  allFunctionsCount,
  overThreshold,
  maxComplexity,
  avgComplexity,
  _showAllInitially,
  _complexityThreshold = 10,
  decisionPointTotals = {
    controlFlow: 0,
    expressions: 0,
    functionParameters: 0,
  },
  withinThreshold = 0,
  _withinThresholdPercentage = 100
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
  // Control Flow / Expressions / Default Params: always 100% here
  const functionsPercentage = formatPercentage(
    withinThreshold,
    allFunctionsCount
  );
  
  // Calculate level for status bar
  const percentageValue = allFunctionsCount > 0
    ? (withinThreshold / allFunctionsCount) * 100
    : 100;
  const level =
    percentageValue >= 80
      ? 'high'
      : percentageValue >= 60
        ? 'high'
        : percentageValue >= 40
          ? 'medium'
          : 'low';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complexity Report</title>
  <link rel="stylesheet" href="shared.css" />
  <style>
    #exportMenu a:hover {
      background-color: #f5f5f5;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="pad2">
    <div class="header-row">
      <h1>All files</h1>
      <a href="about.html" class="about-link">About Cyclomatic Complexity</a>
    </div>
    <div class="clearfix">
      <div class='fl pad1y space-right2'>
        <span class="strong">${functionsPercentage}</span>
        <span class="quiet">Functions</span>
        <span class='fraction'>${withinThreshold}/${allFunctionsCount}</span>
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
    </div>
    <div class="quiet" style="margin-top: 14px; display: flex; align-items: center; gap: 15px;">
      <span>Filter:</span>
      <input type="search" id="fileSearch" style="flex: 0 0 auto; width: auto;">
      <div style="position: relative;">
        <button id="exportBtn" style="padding: 6px 12px; font-size: 13px; cursor: pointer; border: 1px solid var(--color-muted, #ccc); background: var(--color-bg, #fff); color: var(--color-text, #000); border-radius: 2px;">Export</button>
      </div>
    </div>
  </div>
  <div class='status-line ${level}'></div>
  <div class="pad2">
    ${folders.length === 0
      ? '<div class="pad2y"><div class="strong" style="color: rgb(77,146,33);">✓ No functions found.</div></div>'
      : `        <div class="folder-view" id="folderView">
          <table class="coverage-summary">
            <thead>
              <tr>
                <th class="file" data-sort="file">File <span class="sorter"></span></th>
                <th class="bar" data-sort="percentage" style="text-align: right;"><span class="sorter"></span></th>
                <th class="pic" data-sort="percentage" style="text-align: left;">Functions <span class="sorter"></span></th>
                <th class="pct" data-sort="functions" style="text-align: right;"><span class="sorter"></span></th>
              </tr>
            </thead>
            <tbody>
              ${folders.map(folder => generateFolderRow(folder)).join('')}
            </tbody>
          </table>
        </div>`
    }
  </div>
  <div class='footer quiet pad2 space-top1 center small'>
    Complexity report generated by <a href="https://www.github.com/pythonidaer" target="_blank" rel="noopener noreferrer">pythonidaer</a> at ${new Date().toISOString()}
  </div>
  <script>
    ${generateMainIndexScript()}
  </script>
</body>
</html>`;
}
