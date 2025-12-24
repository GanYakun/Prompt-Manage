// Simple UUID v4 generator for compatibility
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Safe JSON parsing helper
function safeParseJSON(jsonString, fallback = []) {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error);
    // Try to handle as comma-separated string fallback
    if (typeof jsonString === 'string' && jsonString.trim()) {
      return jsonString.split(',').map(item => item.trim()).filter(item => item);
    }
    return fallback;
  }
}

const RepositoryFactory = require('../repositories/RepositoryFactory');

class PromptManager {
  constructor() {
    this.repositoryFactory = null;
    this.promptRepository = null;
    this.versionRepository = null;
    this.searchIndexRepository = null;
  }

  async initialize() {
    if (!this.repositoryFactory) {
      this.repositoryFactory = RepositoryFactory.getInstance();
      await this.repositoryFactory.initialize();
      
      this.promptRepository = this.repositoryFactory.getPromptRepository();
      this.versionRepository = this.repositoryFactory.getVersionRepository();
      this.searchIndexRepository = this.repositoryFactory.getSearchIndexRepository();
    }
  }

  // Create new prompt with automatic versioning
  async createPrompt(title, content, tags = [], note = 'Initial version', categories = null) {
    await this.initialize();
    
    const promptId = generateUUID();
    const versionId = generateUUID();
    const now = new Date().toISOString();
    
    try {
      // Create the prompt record
      const prompt = {
        id: promptId,
        title: title.trim(),
        content: content,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
        categories: categories ? JSON.stringify(categories) : null,
        created_at: now,
        updated_at: now,
        current_version_id: versionId,
        version_count: 1
      };

      await this.promptRepository.create(prompt);

      // Create the initial version
      const version = {
        id: versionId,
        prompt_id: promptId,
        content: content,
        note: note || 'Initial version',
        created_at: now,
        version_number: 1,
        is_rollback: false,
        source_version_id: null
      };

      await this.versionRepository.create(version);

      // Update search index
      await this.updateSearchIndex(promptId, title, content, tags);

      return {
        ...prompt,
        tags: safeParseJSON(prompt.tags),
        categories: safeParseJSON(prompt.categories, null),
        current_version: version
      };
    } catch (error) {
      console.error('Failed to create prompt:', error);
      throw new Error(`Failed to create prompt: ${error.message}`);
    }
  }

  // Update prompt content with automatic versioning
  async updatePrompt(promptId, updates, note = null) {
    await this.initialize();
    
    try {
      const existingPrompt = await this.promptRepository.findById(promptId);
      if (!existingPrompt) {
        throw new Error('Prompt not found');
      }

      const now = new Date().toISOString();
      let contentChanged = false;
      let newVersionId = existingPrompt.current_version_id;

      // Check if content has changed
      if (updates.content !== undefined && updates.content !== existingPrompt.content) {
        contentChanged = true;
        newVersionId = generateUUID();
        
        // Create new version
        const newVersionNumber = existingPrompt.version_count + 1;
        const version = {
          id: newVersionId,
          prompt_id: promptId,
          content: updates.content,
          note: note || `Version ${newVersionNumber}`,
          created_at: now,
          version_number: newVersionNumber,
          is_rollback: false,
          source_version_id: null
        };

        await this.versionRepository.create(version);
      }

      // Prepare update data - only include fields that are being updated
      const updateData = {
        updated_at: now
      };

      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }
      
      if (updates.content !== undefined) {
        updateData.content = updates.content;
      }
      
      if (updates.tags !== undefined) {
        updateData.tags = JSON.stringify(updates.tags);
      }

      if (contentChanged) {
        updateData.current_version_id = newVersionId;
        updateData.version_count = existingPrompt.version_count + 1;
      }

      // Update prompt record using base repository update
      await this.promptRepository.update(promptId, updateData);

      // Get the updated prompt to return
      const updatedPrompt = await this.promptRepository.findById(promptId);

      // Update search index
      const tags = safeParseJSON(updatedPrompt.tags, []);
      await this.updateSearchIndex(promptId, updatedPrompt.title, updatedPrompt.content, tags);

      return {
        ...updatedPrompt,
        tags: tags
      };
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw new Error(`Failed to update prompt: ${error.message}`);
    }
  }

  // Get prompt with current version
  async getPrompt(promptId) {
    await this.initialize();
    
    try {
      const prompt = await this.promptRepository.findById(promptId);
      if (!prompt) {
        return null;
      }

      const currentVersion = await this.versionRepository.findById(prompt.current_version_id);
      
      return {
        ...prompt,
        tags: safeParseJSON(prompt.tags, []),
        categories: safeParseJSON(prompt.categories, null),
        current_version: currentVersion
      };
    } catch (error) {
      console.error('Failed to get prompt:', error);
      throw new Error(`Failed to get prompt: ${error.message}`);
    }
  }

  // Get all prompts with pagination
  async getAllPrompts(limit = 50, offset = 0) {
    await this.initialize();
    
    try {
      const prompts = await this.promptRepository.findAll(limit, offset);
      
      return Promise.all(prompts.map(async (prompt) => {
        const currentVersion = await this.versionRepository.findById(prompt.current_version_id);
        return {
          ...prompt,
          tags: safeParseJSON(prompt.tags, []),
          categories: safeParseJSON(prompt.categories, null),
          current_version: currentVersion
        };
      }));
    } catch (error) {
      console.error('Failed to get all prompts:', error);
      throw new Error(`Failed to get all prompts: ${error.message}`);
    }
  }

  // Delete prompt and all its versions
  async deletePrompt(promptId) {
    await this.initialize();
    
    try {
      const prompt = await this.promptRepository.findById(promptId);
      if (!prompt) {
        throw new Error('Prompt not found');
      }

      // Delete all versions
      await this.versionRepository.deleteByPromptId(promptId);
      
      // Delete search index entries
      await this.searchIndexRepository.deleteByEntityId(promptId);
      
      // Delete prompt
      await this.promptRepository.delete(promptId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      throw new Error(`Failed to delete prompt: ${error.message}`);
    }
  }

  // Get prompts by tag
  async getPromptsByTag(tag) {
    await this.initialize();
    
    try {
      const prompts = await this.promptRepository.findByTag(tag);
      
      return Promise.all(prompts.map(async (prompt) => {
        const currentVersion = await this.versionRepository.findById(prompt.current_version_id);
        return {
          ...prompt,
          tags: safeParseJSON(prompt.tags, []),
          current_version: currentVersion
        };
      }));
    } catch (error) {
      console.error('Failed to get prompts by tag:', error);
      throw new Error(`Failed to get prompts by tag: ${error.message}`);
    }
  }

  // Update search index for a prompt
  async updateSearchIndex(promptId, title, content, tags) {
    try {
      const searchEntry = {
        id: generateUUID(),
        entity_id: promptId,
        entity_type: 'prompt',
        content: content,
        title: title,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
        last_indexed: new Date().toISOString()
      };

      // Delete existing index entry
      await this.searchIndexRepository.deleteByEntityId(promptId);
      
      // Create new index entry
      await this.searchIndexRepository.create(searchEntry);
    } catch (error) {
      console.error('Failed to update search index:', error);
      // Don't throw error for search index failures
    }
  }

  // Get prompt statistics
  async getPromptStats() {
    await this.initialize();
    
    try {
      const totalPrompts = await this.promptRepository.count();
      const totalVersions = await this.versionRepository.count();
      
      return {
        total_prompts: totalPrompts,
        total_versions: totalVersions,
        average_versions_per_prompt: totalPrompts > 0 ? (totalVersions / totalPrompts).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Failed to get prompt stats:', error);
      // Return default stats if there's an error
      return {
        total_prompts: 0,
        total_versions: 0,
        average_versions_per_prompt: 0
      };
    }
  }
}

module.exports = PromptManager;