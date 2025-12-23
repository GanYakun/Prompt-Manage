const fc = require('fast-check');
const PromptManager = require('../managers/PromptManager');
const VersionController = require('../controllers/VersionController');
const RepositoryFactory = require('../repositories/RepositoryFactory');

describe('VersionController Property Tests', () => {
  let promptManager;
  let versionController;
  let repositoryFactory;

  beforeEach(async () => {
    // Use test database
    process.env.NODE_ENV = 'test';
    
    promptManager = new PromptManager();
    versionController = new VersionController();
    repositoryFactory = RepositoryFactory.getInstance();
    await repositoryFactory.initialize();
    
    // Clean up test database
    const db = repositoryFactory.getDatabaseManager();
    await db.run('DELETE FROM search_index');
    await db.run('DELETE FROM prompt_versions');
    await db.run('DELETE FROM prompts');
    await db.run('DELETE FROM templates');
  });

  afterEach(async () => {
    if (repositoryFactory) {
      await repositoryFactory.close();
    }
  });

  describe('Property 6: Rollback Content Preservation', () => {
    test('should preserve exact content when rolling back to any previous version', async () => {
      /**
       * Feature: prompt-version-manager, Property 6: Rollback Content Preservation
       * Validates: Requirements 3.1, 3.4
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            initialContent: fc.string({ minLength: 1, maxLength: 1000 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            contentUpdates: fc.array(
              fc.string({ minLength: 1, maxLength: 1000 }),
              { minLength: 2, maxLength: 10 }
            ),
            rollbackNote: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
          }),
          async ({ title, initialContent, tags, contentUpdates, rollbackNote }) => {
            // Create initial prompt
            const prompt = await promptManager.createPrompt(title, initialContent, tags);
            
            // Apply content updates to create version history
            const allContents = [initialContent];
            const uniqueContents = [initialContent];
            
            for (let i = 0; i < contentUpdates.length; i++) {
              const newContent = contentUpdates[i];
              // Only add if content is different from the last unique content
              if (newContent !== uniqueContents[uniqueContents.length - 1]) {
                await promptManager.updatePrompt(
                  prompt.id, 
                  { content: newContent }, 
                  `Update ${i + 1}`
                );
                uniqueContents.push(newContent);
              }
            }
            
            // Get version history
            const versionHistory = await versionController.getVersionHistory(prompt.id);
            expect(versionHistory).toHaveLength(uniqueContents.length);
            
            // Test rollback to each previous version
            for (let i = 0; i < versionHistory.length - 1; i++) {
              const targetVersion = versionHistory[i];
              const expectedContent = targetVersion.content;
              
              // Perform rollback
              const rollbackResult = await versionController.rollbackToVersion(
                prompt.id,
                targetVersion.id,
                rollbackNote
              );
              
              // Verify rollback success
              expect(rollbackResult.success).toBe(true);
              expect(rollbackResult.newVersion).toBeDefined();
              expect(rollbackResult.prompt).toBeDefined();
              
              // Verify content preservation
              expect(rollbackResult.newVersion.content).toBe(expectedContent);
              expect(rollbackResult.prompt.content).toBe(expectedContent);
              
              // Verify rollback metadata
              expect(rollbackResult.newVersion.isRollback).toBe(true);
              expect(rollbackResult.newVersion.sourceVersionId).toBe(targetVersion.id);
              
              // Verify current prompt state
              const currentPrompt = await promptManager.getPrompt(prompt.id);
              expect(currentPrompt.content).toBe(expectedContent);
              expect(currentPrompt.current_version_id).toBe(rollbackResult.newVersion.id);
              
              // Verify version history is preserved (no versions deleted)
              const newVersionHistory = await versionController.getVersionHistory(prompt.id);
              expect(newVersionHistory.length).toBeGreaterThan(versionHistory.length);
              
              // Verify all original versions still exist
              for (const originalVersion of versionHistory) {
                const stillExists = newVersionHistory.find(v => v.id === originalVersion.id);
                expect(stillExists).toBeDefined();
                expect(stillExists.content).toBe(originalVersion.content);
              }
              
              // Update version history for next iteration
              versionHistory.push(rollbackResult.newVersion);
            }
          }
        ),
        { numRuns: 10, timeout: 15000 }
      );
    });
  });

  describe('Property 2: Data Immutability During Operations', () => {
    test('should not modify original versions during rollback operations', async () => {
      /**
       * Feature: prompt-version-manager, Property 2: Data Immutability During Operations
       * Validates: Requirements 1.5, 2.5, 3.3, 4.3
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            initialContent: fc.string({ minLength: 1, maxLength: 1000 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            contentUpdates: fc.array(
              fc.string({ minLength: 1, maxLength: 1000 }),
              { minLength: 3, maxLength: 8 }
            )
          }),
          async ({ title, initialContent, tags, contentUpdates }) => {
            // Create initial prompt
            const prompt = await promptManager.createPrompt(title, initialContent, tags);
            
            // Apply content updates
            for (let i = 0; i < contentUpdates.length; i++) {
              await promptManager.updatePrompt(
                prompt.id, 
                { content: contentUpdates[i] }, 
                `Update ${i + 1}`
              );
            }
            
            // Get initial version history snapshot
            const initialVersionHistory = await versionController.getVersionHistory(prompt.id);
            const versionSnapshots = initialVersionHistory.map(v => ({
              id: v.id,
              content: v.content,
              note: v.note,
              versionNumber: v.versionNumber,
              isRollback: v.isRollback,
              sourceVersionId: v.sourceVersionId,
              createdAt: v.createdAt
            }));
            
            // Perform rollback to a middle version
            const targetVersion = initialVersionHistory[Math.floor(initialVersionHistory.length / 2)];
            await versionController.rollbackToVersion(prompt.id, targetVersion.id);
            
            // Get version history after rollback
            const postRollbackHistory = await versionController.getVersionHistory(prompt.id);
            
            // Verify all original versions are unchanged
            for (const originalSnapshot of versionSnapshots) {
              const currentVersion = postRollbackHistory.find(v => v.id === originalSnapshot.id);
              expect(currentVersion).toBeDefined();
              
              // Verify immutability of all fields
              expect(currentVersion.content).toBe(originalSnapshot.content);
              expect(currentVersion.note).toBe(originalSnapshot.note);
              expect(currentVersion.versionNumber).toBe(originalSnapshot.versionNumber);
              expect(currentVersion.isRollback).toBe(originalSnapshot.isRollback);
              expect(currentVersion.sourceVersionId).toBe(originalSnapshot.sourceVersionId);
              expect(currentVersion.createdAt).toBe(originalSnapshot.createdAt);
            }
            
            // Verify only one new version was added (the rollback version)
            expect(postRollbackHistory.length).toBe(initialVersionHistory.length + 1);
            
            // Verify the new version is marked as rollback
            const rollbackVersion = postRollbackHistory.find(v => 
              !versionSnapshots.some(s => s.id === v.id)
            );
            expect(rollbackVersion).toBeDefined();
            expect(rollbackVersion.isRollback).toBe(true);
            expect(rollbackVersion.sourceVersionId).toBe(targetVersion.id);
            expect(rollbackVersion.content).toBe(targetVersion.content);
          }
        ),
        { numRuns: 10, timeout: 15000 }
      );
    });
  });

  describe('Basic Functionality Tests', () => {
    test('should get version history in chronological order', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Initial content');
      await promptManager.updatePrompt(prompt.id, { content: 'Updated content' });
      
      const history = await versionController.getVersionHistory(prompt.id);
      
      expect(history).toHaveLength(2);
      expect(history[0].versionNumber).toBe(2); // Newest first
      expect(history[1].versionNumber).toBe(1);
    });

    test('should rollback to previous version', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Original content');
      await promptManager.updatePrompt(prompt.id, { content: 'Modified content' });
      
      const history = await versionController.getVersionHistory(prompt.id);
      const originalVersion = history.find(v => v.versionNumber === 1);
      
      const result = await versionController.rollbackToVersion(
        prompt.id, 
        originalVersion.id, 
        'Rolling back to original'
      );
      
      expect(result.success).toBe(true);
      expect(result.newVersion.content).toBe('Original content');
      expect(result.newVersion.isRollback).toBe(true);
      expect(result.newVersion.sourceVersionId).toBe(originalVersion.id);
    });

    test('should get version statistics', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Content');
      await promptManager.updatePrompt(prompt.id, { content: 'Updated' });
      
      const history = await versionController.getVersionHistory(prompt.id);
      await versionController.rollbackToVersion(prompt.id, history[1].id);
      
      const stats = await versionController.getVersionStats(prompt.id);
      
      expect(stats.totalVersions).toBe(3);
      expect(stats.rollbackCount).toBe(1);
    });

    test('should compare versions with advanced diff', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Original content\nLine 2\nLine 3');
      await promptManager.updatePrompt(prompt.id, { content: 'Modified content\nLine 2\nNew Line 3' });
      
      const history = await versionController.getVersionHistory(prompt.id);
      const comparison = await versionController.compareVersions(history[1].id, history[0].id);
      
      expect(comparison.version1).toBeDefined();
      expect(comparison.version2).toBeDefined();
      expect(comparison.diff).toBeDefined();
      expect(comparison.diff.summary).toBeDefined();
      expect(comparison.diff.lineDiff).toBeDefined();
      expect(comparison.diff.unified).toBeDefined();
      expect(comparison.diff.sideBySide).toBeDefined();
      
      // Verify diff contains changes
      expect(comparison.diff.summary.totalChanges).toBeGreaterThan(0);
    });

    test('should get rollback versions only', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Content');
      await promptManager.updatePrompt(prompt.id, { content: 'Updated' });
      
      const history = await versionController.getVersionHistory(prompt.id);
      await versionController.rollbackToVersion(prompt.id, history[1].id);
      
      const rollbackVersions = await versionController.getRollbackVersions(prompt.id);
      
      expect(rollbackVersions).toHaveLength(1);
      expect(rollbackVersions[0].isRollback).toBe(true);
    });
  });
});