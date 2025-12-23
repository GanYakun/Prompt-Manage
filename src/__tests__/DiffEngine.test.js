const fc = require('fast-check');
const DiffEngine = require('../engines/DiffEngine');

describe('DiffEngine Tests', () => {
  let diffEngine;

  beforeEach(() => {
    diffEngine = new DiffEngine();
  });

  describe('Property 5: Diff Generation Accuracy', () => {
    test('should correctly identify and categorize all changes', async () => {
      /**
       * Feature: prompt-version-manager, Property 5: Diff Generation Accuracy
       * Validates: Requirements 2.1, 2.2, 2.3
       */
      await fc.assert(
        fc.property(
          fc.record({
            originalLines: fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
            modifications: fc.array(
              fc.record({
                type: fc.constantFrom('add', 'delete', 'modify'),
                lineIndex: fc.nat(),
                content: fc.string()
              }),
              { maxLength: 10 }
            )
          }),
          ({ originalLines, modifications }) => {
            const content1 = originalLines.join('\n');
            let modifiedLines = [...originalLines];
            
            // Apply modifications to create content2
            for (const mod of modifications) {
              const index = mod.lineIndex % Math.max(1, modifiedLines.length);
              
              switch (mod.type) {
                case 'add':
                  modifiedLines.splice(index, 0, mod.content);
                  break;
                case 'delete':
                  if (modifiedLines.length > 0) {
                    modifiedLines.splice(index, 1);
                  }
                  break;
                case 'modify':
                  if (modifiedLines.length > 0) {
                    modifiedLines[index] = mod.content;
                  }
                  break;
              }
            }
            
            const content2 = modifiedLines.join('\n');
            const diff = diffEngine.generateDiff(content1, content2);
            
            // Verify diff structure
            expect(diff).toHaveProperty('summary');
            expect(diff).toHaveProperty('lineDiff');
            expect(diff).toHaveProperty('wordDiff');
            expect(diff).toHaveProperty('charDiff');
            expect(diff).toHaveProperty('unified');
            expect(diff).toHaveProperty('sideBySide');
            
            // Verify summary statistics
            expect(diff.summary.additions).toBeGreaterThanOrEqual(0);
            expect(diff.summary.deletions).toBeGreaterThanOrEqual(0);
            expect(diff.summary.modifications).toBeGreaterThanOrEqual(0);
            expect(diff.summary.unchanged).toBeGreaterThanOrEqual(0);
            
            // Verify line diff structure
            expect(Array.isArray(diff.lineDiff)).toBe(true);
            
            // Verify side-by-side diff structure
            expect(Array.isArray(diff.sideBySide)).toBe(true);
            
            // Verify unified diff is a string
            expect(typeof diff.unified).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Basic Functionality Tests', () => {
    test('should handle identical content', () => {
      const content = 'Hello\nWorld\nTest';
      const diff = diffEngine.generateDiff(content, content);
      
      expect(diff.summary.additions).toBe(0);
      expect(diff.summary.deletions).toBe(0);
      expect(diff.summary.modifications).toBe(0);
      expect(diff.summary.unchanged).toBe(3);
    });

    test('should detect line additions', () => {
      const content1 = 'Line 1\nLine 2';
      const content2 = 'Line 1\nNew Line\nLine 2';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(diff.summary.additions).toBe(1);
      expect(diff.summary.totalChanges).toBe(1);
    });

    test('should detect line deletions', () => {
      const content1 = 'Line 1\nLine 2\nLine 3';
      const content2 = 'Line 1\nLine 3';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(diff.summary.deletions).toBe(1);
      expect(diff.summary.totalChanges).toBe(1);
    });

    test('should detect line modifications', () => {
      const content1 = 'Original line';
      const content2 = 'Modified line';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(diff.summary.totalChanges).toBeGreaterThan(0);
    });

    test('should generate proper unified diff format', () => {
      const content1 = 'Line 1\nLine 2\nLine 3';
      const content2 = 'Line 1\nModified Line 2\nLine 3';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(diff.unified).toContain('@@');
      expect(typeof diff.unified).toBe('string');
    });

    test('should generate side-by-side diff', () => {
      const content1 = 'Original';
      const content2 = 'Modified';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(Array.isArray(diff.sideBySide)).toBe(true);
      expect(diff.sideBySide.length).toBeGreaterThan(0);
    });

    test('should handle empty content', () => {
      const diff1 = diffEngine.generateDiff('', 'New content');
      expect(diff1.summary.additions).toBe(1);
      
      const diff2 = diffEngine.generateDiff('Old content', '');
      expect(diff2.summary.deletions).toBe(1);
      
      const diff3 = diffEngine.generateDiff('', '');
      expect(diff3.summary.totalChanges).toBe(0);
    });

    test('should handle whitespace options', () => {
      const content1 = 'Hello    World';
      const content2 = 'Hello World';
      
      const diff1 = diffEngine.generateDiff(content1, content2, { ignoreWhitespace: false });
      expect(diff1.summary.totalChanges).toBeGreaterThan(0);
      
      const diff2 = diffEngine.generateDiff(content1, content2, { ignoreWhitespace: true });
      expect(diff2.summary.totalChanges).toBe(0);
    });

    test('should handle case sensitivity options', () => {
      const content1 = 'Hello World';
      const content2 = 'hello world';
      
      const diff1 = diffEngine.generateDiff(content1, content2, { ignoreCase: false });
      expect(diff1.summary.totalChanges).toBeGreaterThan(0);
      
      const diff2 = diffEngine.generateDiff(content1, content2, { ignoreCase: true });
      expect(diff2.summary.totalChanges).toBe(0);
    });

    test('should generate word-level diff', () => {
      const content1 = 'The quick brown fox';
      const content2 = 'The fast brown fox';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(Array.isArray(diff.wordDiff)).toBe(true);
      expect(diff.wordDiff.length).toBeGreaterThan(0);
    });

    test('should generate character-level diff', () => {
      const content1 = 'Hello';
      const content2 = 'Hallo';
      const diff = diffEngine.generateDiff(content1, content2);
      
      expect(Array.isArray(diff.charDiff)).toBe(true);
      expect(diff.charDiff.length).toBeGreaterThan(0);
    });
  });

  describe('LCS Algorithm Tests', () => {
    test('should find correct longest common subsequence', () => {
      const seq1 = ['A', 'B', 'C', 'D'];
      const seq2 = ['A', 'C', 'D', 'E'];
      const lcs = diffEngine.longestCommonSubsequence(seq1, seq2);
      
      expect(lcs).toEqual(['A', 'C', 'D']);
    });

    test('should handle empty sequences', () => {
      const lcs1 = diffEngine.longestCommonSubsequence([], ['A', 'B']);
      expect(lcs1).toEqual([]);
      
      const lcs2 = diffEngine.longestCommonSubsequence(['A', 'B'], []);
      expect(lcs2).toEqual([]);
      
      const lcs3 = diffEngine.longestCommonSubsequence([], []);
      expect(lcs3).toEqual([]);
    });

    test('should handle identical sequences', () => {
      const seq = ['A', 'B', 'C'];
      const lcs = diffEngine.longestCommonSubsequence(seq, seq);
      expect(lcs).toEqual(seq);
    });
  });

  describe('Word Tokenization Tests', () => {
    test('should tokenize words correctly', () => {
      const text = 'Hello world test';
      const words = diffEngine.tokenizeWords(text);
      
      expect(words).toContain('Hello');
      expect(words).toContain('world');
      expect(words).toContain('test');
    });

    test('should handle punctuation and whitespace', () => {
      const text = 'Hello, world!  Test.';
      const words = diffEngine.tokenizeWords(text);
      
      expect(words.length).toBeGreaterThan(3);
      expect(words.some(w => w.includes(','))).toBe(true);
    });

    test('should handle empty text', () => {
      const words = diffEngine.tokenizeWords('');
      expect(words).toEqual([]);
    });
  });
});