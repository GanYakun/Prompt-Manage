const fc = require('fast-check');
const PromptManager = require('../managers/PromptManager');
const RepositoryFactory = require('../repositories/RepositoryFactory');

describe('PromptManager Property Tests', () => {
  let promptManager;
  let repositoryFactory;

  beforeEach(async () => {
    // Use test database
    process.env.NODE_ENV = 'test';
    
    promptManager = new PromptManager();
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

  describe('Property 1: Version Creation Completeness', () => {
    test('should create complete version history for every prompt modification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            updates: fc.array(
              fc.record({
                content: fc.string({ minLength: 1, maxLength: 1000 }),
                note: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async ({ title, content, tags, updates }) => {
            // Create initial prompt
            const prompt = await promptManager.createPrompt(title, content, tags, 'Initial version');
            
            // Verify initial version creation
            expect(prompt).toBeDefined();
            expect(prompt.id).toBeDefined();
            expect(prompt.current_version).toBeDefined();
            expect(prompt.current_version.version_number).toBe(1);
            expect(prompt.version_count).toBe(1);
            
            let currentVersionCount = 1;
            let lastContent = content;
            
            // Apply updates and verify version creation
            for (const update of updates) {
              // Only create new version if content actually changes
              if (update.content !== lastContent) {
                const updatedPrompt = await promptManager.updatePrompt(
                  prompt.id, 
                  { content: update.content }, 
                  update.note
                );
                
                currentVersionCount++;
                lastContent = update.content;
                
                // Verify version count increased
                expect(updatedPrompt.version_count).toBe(currentVersionCount);
                expect(updatedPrompt.content).toBe(update.content);
              }
            }
            
            // Verify complete version history
            const versionRepository = repositoryFactory.getVersionRepository();
            const allVersions = await versionRepository.findByPromptId(prompt.id);
            
            expect(allVersions).toHaveLength(currentVersionCount);
            
            // Verify version numbers are sequential
            const sortedVersions = allVersions.sort((a, b) => a.version_number - b.version_number);
            for (let i = 0; i < sortedVersions.length; i++) {
              expect(sortedVersions[i].version_number).toBe(i + 1);
              expect(sortedVersions[i].prompt_id).toBe(prompt.id);
            }
            
            // Verify current version pointer is correct
            const finalPrompt = await promptManager.getPrompt(prompt.id);
            const currentVersion = sortedVersions.find(v => v.id === finalPrompt.current_version_id);
            expect(currentVersion).toBeDefined();
            expect(currentVersion.version_number).toBe(currentVersionCount);
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });
  });

  describe('Property 3: Current Version Pointer Consistency', () => {
    test('should maintain consistent current version pointer across all operations', async () => {
      /**
       * Feature: prompt-version-manager, Property 3: Current Version Pointer Consistency
       * Validates: Requirements 1.4, 3.5
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            operations: fc.array(
              fc.oneof(
                fc.record({
                  type: fc.constant('update'),
                  content: fc.string({ minLength: 1, maxLength: 1000 }),
                  note: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
                }),
                fc.record({
                  type: fc.constant('title_update'),
                  title: fc.string({ minLength: 1, maxLength: 100 })
                }),
                fc.record({
                  type: fc.constant('tag_update'),
                  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })
                })
              ),
              { minLength: 1, maxLength: 15 }
            )
          }),
          async ({ title, content, tags, operations }) => {
            // Create initial prompt
            const prompt = await promptManager.createPrompt(title, content, tags);
            
            let expectedVersionCount = 1;
            let lastContent = content;
            
            // Apply operations
            for (const operation of operations) {
              let updatedPrompt;
              
              switch (operation.type) {
                case 'update':
                  // Only update if content is actually different
                  if (operation.content !== lastContent) {
                    updatedPrompt = await promptManager.updatePrompt(
                      prompt.id, 
                      { content: operation.content }, 
                      operation.note
                    );
                    expectedVersionCount++;
                    lastContent = operation.content;
                  }
                  break;
                  
                case 'title_update':
                  updatedPrompt = await promptManager.updatePrompt(
                    prompt.id, 
                    { title: operation.title }
                  );
                  // Title updates don't create new versions or change content
                  break;
                  
                case 'tag_update':
                  updatedPrompt = await promptManager.updatePrompt(
                    prompt.id, 
                    { tags: operation.tags }
                  );
                  // Tag updates don't create new versions or change content
                  break;
              }
              
              // Verify current version pointer consistency
              const currentPrompt = await promptManager.getPrompt(prompt.id);
              expect(currentPrompt.version_count).toBe(expectedVersionCount);
              expect(currentPrompt.current_version_id).toBeDefined();
              
              // Verify current version exists and is the latest
              const versionRepository = repositoryFactory.getVersionRepository();
              const currentVersion = await versionRepository.findById(currentPrompt.current_version_id);
              expect(currentVersion).toBeDefined();
              expect(currentVersion.prompt_id).toBe(prompt.id);
              expect(currentVersion.version_number).toBe(expectedVersionCount);
              
              // Verify current version content matches the last content that created a version
              expect(currentVersion.content).toBe(lastContent);
              // Verify prompt content also matches (should be the same as current version)
              expect(currentPrompt.content).toBe(lastContent);
            }
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });
  });

  describe('Property 4: Version History Chronological Ordering', () => {
    test('should maintain chronological ordering of version history', async () => {
      /**
       * Feature: prompt-version-manager, Property 4: Version History Chronological Ordering
       * Validates: Requirements 1.3
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            initialContent: fc.string({ minLength: 1, maxLength: 1000 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            contentUpdates: fc.array(
              fc.string({ minLength: 1, maxLength: 1000 }),
              { minLength: 2, maxLength: 20 }
            )
          }),
          async ({ title, initialContent, tags, contentUpdates }) => {
            // Create initial prompt
            const prompt = await promptManager.createPrompt(title, initialContent, tags);
            const creationTimes = [new Date()];
            
            // Apply content updates with small delays to ensure different timestamps
            for (const content of contentUpdates) {
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10));
              await promptManager.updatePrompt(prompt.id, { content }, `Update to: ${content.substring(0, 20)}`);
              creationTimes.push(new Date());
            }
            
            // Get version history using VersionController
            const RepositoryFactory = require('../repositories/RepositoryFactory');
            const VersionController = require('../controllers/VersionController');
            
            const versionController = new VersionController();
            const versionHistory = await versionController.getVersionHistory(prompt.id);
            
            // Verify we have the expected number of versions
            expect(versionHistory).toHaveLength(contentUpdates.length + 1);
            
            // Verify chronological ordering (newest first)
            for (let i = 0; i < versionHistory.length - 1; i++) {
              const currentVersion = versionHistory[i];
              const nextVersion = versionHistory[i + 1];
              
              // Version numbers should be in descending order (newest first)
              expect(currentVersion.versionNumber).toBeGreaterThan(nextVersion.versionNumber);
              
              // Creation dates should be in descending order (newest first)
              const currentDate = new Date(currentVersion.createdAt);
              const nextDate = new Date(nextVersion.createdAt);
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
            
            // Verify version numbers are sequential when sorted ascending
            const ascendingVersions = [...versionHistory].sort((a, b) => a.versionNumber - b.versionNumber);
            for (let i = 0; i < ascendingVersions.length; i++) {
              expect(ascendingVersions[i].versionNumber).toBe(i + 1);
            }
            
            // Verify all versions belong to the same prompt
            for (const version of versionHistory) {
              expect(version.promptId).toBe(prompt.id);
            }
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });
  });

  describe('Basic Functionality Tests', () => {
    test('should create prompt with initial version', async () => {
      const prompt = await promptManager.createPrompt(
        'Test Prompt',
        'Test content',
        ['test', 'example']
      );
      
      expect(prompt.id).toBeDefined();
      expect(prompt.title).toBe('Test Prompt');
      expect(prompt.content).toBe('Test content');
      expect(prompt.tags).toEqual(['test', 'example']);
      expect(prompt.version_count).toBe(1);
      expect(prompt.current_version).toBeDefined();
      expect(prompt.current_version.version_number).toBe(1);
    });

    test('should update prompt and create new version', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Original content');
      
      const updated = await promptManager.updatePrompt(
        prompt.id, 
        { content: 'Updated content' }, 
        'Updated for testing'
      );
      
      expect(updated.content).toBe('Updated content');
      expect(updated.version_count).toBe(2);
      
      // Verify version history
      const versionRepository = repositoryFactory.getVersionRepository();
      const versions = await versionRepository.findByPromptId(prompt.id);
      expect(versions).toHaveLength(2);
    });

    test('should not create new version for non-content updates', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Content');
      
      const updated = await promptManager.updatePrompt(
        prompt.id, 
        { title: 'Updated Title', tags: ['new', 'tags'] }
      );
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.tags).toEqual(['new', 'tags']);
      expect(updated.version_count).toBe(1); // Should not increment
    });

    test('should get prompt with current version', async () => {
      const created = await promptManager.createPrompt('Test', 'Content');
      const retrieved = await promptManager.getPrompt(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.current_version).toBeDefined();
    });

    test('should delete prompt and all versions', async () => {
      const prompt = await promptManager.createPrompt('Test', 'Content');
      await promptManager.updatePrompt(prompt.id, { content: 'Updated' });
      
      const deleted = await promptManager.deletePrompt(prompt.id);
      expect(deleted).toBe(true);
      
      const retrieved = await promptManager.getPrompt(prompt.id);
      expect(retrieved).toBeNull();
      
      // Verify versions are also deleted
      const versionRepository = repositoryFactory.getVersionRepository();
      const versions = await versionRepository.findByPromptId(prompt.id);
      expect(versions).toHaveLength(0);
    });

    test('should get prompt statistics', async () => {
      await promptManager.createPrompt('Test 1', 'Content 1');
      const prompt2 = await promptManager.createPrompt('Test 2', 'Content 2');
      await promptManager.updatePrompt(prompt2.id, { content: 'Updated content' });
      
      const stats = await promptManager.getPromptStats();
      expect(stats.total_prompts).toBe(2);
      expect(stats.total_versions).toBe(3); // 1 + 2 versions
      expect(parseFloat(stats.average_versions_per_prompt)).toBe(1.5);
    });
  });
});