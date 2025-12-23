/**
 * Advanced text diff engine with line-based and word-based comparison
 * Supports various diff algorithms and visualization formats
 */
class DiffEngine {
  constructor() {
    this.options = {
      ignoreWhitespace: false,
      ignoreCase: false,
      contextLines: 3
    };
  }

  /**
   * Generate comprehensive diff between two text contents
   * @param {string} content1 - Original content
   * @param {string} content2 - Modified content
   * @param {Object} options - Diff options
   * @returns {Object} Comprehensive diff result
   */
  generateDiff(content1, content2, options = {}) {
    const opts = { ...this.options, ...options };
    
    // Normalize content
    const normalizedContent1 = this.normalizeContent(content1, opts);
    const normalizedContent2 = this.normalizeContent(content2, opts);
    
    // Generate line-based diff
    const lineDiff = this.generateLineDiff(normalizedContent1, normalizedContent2, opts);
    
    // Generate word-based diff for modified lines
    const wordDiff = this.generateWordDiff(normalizedContent1, normalizedContent2, opts);
    
    // Generate character-based diff for small changes
    const charDiff = this.generateCharDiff(normalizedContent1, normalizedContent2, opts);
    
    return {
      summary: this.generateSummary(lineDiff),
      lineDiff,
      wordDiff,
      charDiff,
      unified: this.generateUnifiedDiff(lineDiff, opts),
      sideBySide: this.generateSideBySideDiff(lineDiff, opts)
    };
  }

  /**
   * Normalize content based on options
   */
  normalizeContent(content, options) {
    let normalized = content;
    
    if (options.ignoreCase) {
      normalized = normalized.toLowerCase();
    }
    
    if (options.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
    
    return normalized;
  }

  /**
   * Generate line-based diff using LCS algorithm
   */
  generateLineDiff(content1, content2, options) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const lcs = this.longestCommonSubsequence(lines1, lines2);
    const diff = [];
    
    let i = 0, j = 0, lcsIndex = 0;
    
    while (i < lines1.length || j < lines2.length) {
      if (lcsIndex < lcs.length && 
          i < lines1.length && 
          j < lines2.length && 
          lines1[i] === lcs[lcsIndex] && 
          lines2[j] === lcs[lcsIndex]) {
        // Unchanged line
        diff.push({
          type: 'unchanged',
          lineNumber1: i + 1,
          lineNumber2: j + 1,
          content: lines1[i]
        });
        i++;
        j++;
        lcsIndex++;
      } else if (i < lines1.length && 
                 (lcsIndex >= lcs.length || lines1[i] !== lcs[lcsIndex])) {
        // Deleted line
        diff.push({
          type: 'deletion',
          lineNumber1: i + 1,
          lineNumber2: null,
          content: lines1[i]
        });
        i++;
      } else if (j < lines2.length) {
        // Added line
        diff.push({
          type: 'addition',
          lineNumber1: null,
          lineNumber2: j + 1,
          content: lines2[j]
        });
        j++;
      }
    }
    
    return this.groupDiffLines(diff, options);
  }

  /**
   * Generate word-based diff for modified sections
   */
  generateWordDiff(content1, content2, options) {
    const words1 = this.tokenizeWords(content1);
    const words2 = this.tokenizeWords(content2);
    
    const lcs = this.longestCommonSubsequence(words1, words2);
    const diff = [];
    
    let i = 0, j = 0, lcsIndex = 0;
    
    while (i < words1.length || j < words2.length) {
      if (lcsIndex < lcs.length && 
          i < words1.length && 
          j < words2.length && 
          words1[i] === lcs[lcsIndex] && 
          words2[j] === lcs[lcsIndex]) {
        // Unchanged word
        diff.push({
          type: 'unchanged',
          content: words1[i]
        });
        i++;
        j++;
        lcsIndex++;
      } else if (i < words1.length && 
                 (lcsIndex >= lcs.length || words1[i] !== lcs[lcsIndex])) {
        // Deleted word
        diff.push({
          type: 'deletion',
          content: words1[i]
        });
        i++;
      } else if (j < words2.length) {
        // Added word
        diff.push({
          type: 'addition',
          content: words2[j]
        });
        j++;
      }
    }
    
    return diff;
  }

  /**
   * Generate character-based diff for fine-grained changes
   */
  generateCharDiff(content1, content2, options) {
    const chars1 = content1.split('');
    const chars2 = content2.split('');
    
    const lcs = this.longestCommonSubsequence(chars1, chars2);
    const diff = [];
    
    let i = 0, j = 0, lcsIndex = 0;
    
    while (i < chars1.length || j < chars2.length) {
      if (lcsIndex < lcs.length && 
          i < chars1.length && 
          j < chars2.length && 
          chars1[i] === lcs[lcsIndex] && 
          chars2[j] === lcs[lcsIndex]) {
        // Unchanged character
        diff.push({
          type: 'unchanged',
          content: chars1[i]
        });
        i++;
        j++;
        lcsIndex++;
      } else if (i < chars1.length && 
                 (lcsIndex >= lcs.length || chars1[i] !== lcs[lcsIndex])) {
        // Deleted character
        diff.push({
          type: 'deletion',
          content: chars1[i]
        });
        i++;
      } else if (j < chars2.length) {
        // Added character
        diff.push({
          type: 'addition',
          content: chars2[j]
        });
        j++;
      }
    }
    
    return diff;
  }

  /**
   * Longest Common Subsequence algorithm
   */
  longestCommonSubsequence(seq1, seq2) {
    const m = seq1.length;
    const n = seq2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Reconstruct LCS
    const lcs = [];
    let i = m, j = n;
    
    while (i > 0 && j > 0) {
      if (seq1[i - 1] === seq2[j - 1]) {
        lcs.unshift(seq1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }

  /**
   * Tokenize text into words
   */
  tokenizeWords(text) {
    return text.match(/\S+|\s+/g) || [];
  }

  /**
   * Group diff lines with context
   */
  groupDiffLines(diff, options) {
    const contextLines = options.contextLines || 3;
    
    // If there are no changes, return all lines as a single group
    const hasChanges = diff.some(line => line.type !== 'unchanged');
    if (!hasChanges) {
      return [{
        startLine1: 1,
        startLine2: 1,
        lines: diff
      }];
    }
    
    const groups = [];
    let currentGroup = null;
    
    for (let i = 0; i < diff.length; i++) {
      const line = diff[i];
      
      if (line.type !== 'unchanged') {
        // Start new group or extend current group
        if (!currentGroup) {
          currentGroup = {
            startLine1: Math.max(1, (line.lineNumber1 || line.lineNumber2) - contextLines),
            startLine2: Math.max(1, (line.lineNumber2 || line.lineNumber1) - contextLines),
            lines: []
          };
          
          // Add context before
          for (let j = Math.max(0, i - contextLines); j < i; j++) {
            if (diff[j].type === 'unchanged') {
              currentGroup.lines.push(diff[j]);
            }
          }
        }
        
        currentGroup.lines.push(line);
      } else if (currentGroup) {
        // Add context after changes
        currentGroup.lines.push(line);
        
        // Check if we should close the group
        let unchangedCount = 1;
        for (let j = i + 1; j < diff.length && j < i + contextLines * 2; j++) {
          if (diff[j].type === 'unchanged') {
            unchangedCount++;
          } else {
            break;
          }
        }
        
        if (unchangedCount >= contextLines * 2 || i === diff.length - 1) {
          // Close current group
          groups.push(currentGroup);
          currentGroup = null;
        }
      }
    }
    
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Generate unified diff format
   */
  generateUnifiedDiff(lineDiff, options) {
    const unified = [];
    
    for (const group of lineDiff) {
      unified.push(`@@ -${group.startLine1},${group.lines.length} +${group.startLine2},${group.lines.length} @@`);
      
      for (const line of group.lines) {
        switch (line.type) {
          case 'unchanged':
            unified.push(` ${line.content}`);
            break;
          case 'deletion':
            unified.push(`-${line.content}`);
            break;
          case 'addition':
            unified.push(`+${line.content}`);
            break;
        }
      }
    }
    
    return unified.join('\n');
  }

  /**
   * Generate side-by-side diff format
   */
  generateSideBySideDiff(lineDiff, options) {
    const sideBySide = [];
    
    for (const group of lineDiff) {
      for (const line of group.lines) {
        switch (line.type) {
          case 'unchanged':
            sideBySide.push({
              leftLineNumber: line.lineNumber1,
              leftContent: line.content,
              rightLineNumber: line.lineNumber2,
              rightContent: line.content,
              type: 'unchanged'
            });
            break;
          case 'deletion':
            sideBySide.push({
              leftLineNumber: line.lineNumber1,
              leftContent: line.content,
              rightLineNumber: null,
              rightContent: '',
              type: 'deletion'
            });
            break;
          case 'addition':
            sideBySide.push({
              leftLineNumber: null,
              leftContent: '',
              rightLineNumber: line.lineNumber2,
              rightContent: line.content,
              type: 'addition'
            });
            break;
        }
      }
    }
    
    return sideBySide;
  }

  /**
   * Generate diff summary statistics
   */
  generateSummary(lineDiff) {
    let additions = 0;
    let deletions = 0;
    let modifications = 0;
    let unchanged = 0;
    
    for (const group of lineDiff) {
      for (const line of group.lines) {
        switch (line.type) {
          case 'addition':
            additions++;
            break;
          case 'deletion':
            deletions++;
            break;
          case 'modification':
            modifications++;
            break;
          case 'unchanged':
            unchanged++;
            break;
        }
      }
    }
    
    return {
      additions,
      deletions,
      modifications,
      unchanged,
      totalChanges: additions + deletions + modifications
    };
  }

  /**
   * Generate HTML visualization of diff
   */
  generateHtmlDiff(diff, options = {}) {
    const html = [];
    html.push('<div class="diff-container">');
    
    if (options.showSideBySide) {
      html.push('<div class="diff-side-by-side">');
      html.push('<div class="diff-left">');
      html.push('<h3>Original</h3>');
      
      for (const line of diff.sideBySide) {
        if (line.leftContent !== undefined) {
          const className = `diff-line diff-${line.type}`;
          html.push(`<div class="${className}" data-line="${line.leftLineNumber || ''}">`);
          html.push(`<span class="line-number">${line.leftLineNumber || ''}</span>`);
          html.push(`<span class="line-content">${this.escapeHtml(line.leftContent)}</span>`);
          html.push('</div>');
        }
      }
      
      html.push('</div>');
      html.push('<div class="diff-right">');
      html.push('<h3>Modified</h3>');
      
      for (const line of diff.sideBySide) {
        if (line.rightContent !== undefined) {
          const className = `diff-line diff-${line.type}`;
          html.push(`<div class="${className}" data-line="${line.rightLineNumber || ''}">`);
          html.push(`<span class="line-number">${line.rightLineNumber || ''}</span>`);
          html.push(`<span class="line-content">${this.escapeHtml(line.rightContent)}</span>`);
          html.push('</div>');
        }
      }
      
      html.push('</div>');
      html.push('</div>');
    } else {
      // Unified view
      html.push('<div class="diff-unified">');
      
      for (const group of diff.lineDiff) {
        html.push('<div class="diff-group">');
        
        for (const line of group.lines) {
          const className = `diff-line diff-${line.type}`;
          html.push(`<div class="${className}">`);
          
          if (line.type === 'unchanged') {
            html.push(`<span class="line-number">${line.lineNumber1}</span>`);
            html.push(`<span class="line-number">${line.lineNumber2}</span>`);
          } else if (line.type === 'deletion') {
            html.push(`<span class="line-number">${line.lineNumber1}</span>`);
            html.push('<span class="line-number"></span>');
          } else if (line.type === 'addition') {
            html.push('<span class="line-number"></span>');
            html.push(`<span class="line-number">${line.lineNumber2}</span>`);
          }
          
          html.push(`<span class="line-content">${this.escapeHtml(line.content)}</span>`);
          html.push('</div>');
        }
        
        html.push('</div>');
      }
      
      html.push('</div>');
    }
    
    html.push('</div>');
    return html.join('\n');
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

module.exports = DiffEngine;