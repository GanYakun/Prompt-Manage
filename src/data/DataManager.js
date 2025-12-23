// Simple file-based data manager for initial implementation
// This will be replaced with SQLite database later

class DataManager {
  constructor() {
    this.prompts = new Map();
    this.templates = new Map();
    this.versions = new Map(); // promptId -> versions array
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load existing data
      await this.loadAllData();
      this.initialized = true;
      console.log('DataManager initialized');
    } catch (error) {
      console.error('Failed to initialize DataManager:', error);
      // Initialize with empty data
      this.initialized = true;
    }
  }

  async loadAllData() {
    if (!global.window?.electronAPI) return;

    // Load prompts
    const promptsResult = await global.window.electronAPI.loadData('prompts.json');
    if (promptsResult.success && promptsResult.data) {
      Object.entries(promptsResult.data).forEach(([id, prompt]) => {
        this.prompts.set(id, prompt);
      });
    }

    // Load templates
    const templatesResult = await global.window.electronAPI.loadData('templates.json');
    if (templatesResult.success && templatesResult.data) {
      Object.entries(templatesResult.data).forEach(([id, template]) => {
        this.templates.set(id, template);
      });
    }

    // Load versions
    const versionsResult = await global.window.electronAPI.loadData('versions.json');
    if (versionsResult.success && versionsResult.data) {
      Object.entries(versionsResult.data).forEach(([promptId, versions]) => {
        this.versions.set(promptId, versions);
      });
    }
  }

  async saveAllData() {
    if (!global.window?.electronAPI) return;

    try {
      // Save prompts
      const promptsData = Object.fromEntries(this.prompts);
      await global.window.electronAPI.saveData('prompts.json', promptsData);

      // Save templates
      const templatesData = Object.fromEntries(this.templates);
      await global.window.electronAPI.saveData('templates.json', templatesData);

      // Save versions
      const versionsData = Object.fromEntries(this.versions);
      await global.window.electronAPI.saveData('versions.json', versionsData);

      console.log('Data saved successfully');
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }

  // Utility function to generate IDs
  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Prompt operations
  async createPrompt(data) {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const prompt = {
      id,
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      versionCount: 1
    };

    // Create initial version
    const versionId = this.generateId();
    const initialVersion = {
      id: versionId,
      promptId: id,
      content: data.content,
      note: 'Initial version',
      createdAt: now,
      versionNumber: 1,
      isRollback: false
    };

    prompt.currentVersionId = versionId;

    this.prompts.set(id, prompt);
    this.versions.set(id, [initialVersion]);

    await this.saveAllData();
    return prompt;
  }

  async updatePrompt(id, content, note) {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const now = new Date().toISOString();
    const versions = this.versions.get(id) || [];
    const newVersionNumber = versions.length + 1;
    
    // Create new version
    const versionId = this.generateId();
    const newVersion = {
      id: versionId,
      promptId: id,
      content,
      note: note || `Update ${newVersionNumber}`,
      createdAt: now,
      versionNumber: newVersionNumber,
      isRollback: false
    };

    // Update prompt
    prompt.content = content;
    prompt.updatedAt = now;
    prompt.currentVersionId = versionId;
    prompt.versionCount = newVersionNumber;

    // Add version
    versions.push(newVersion);
    this.versions.set(id, versions);
    this.prompts.set(id, prompt);

    await this.saveAllData();
    return prompt;
  }

  getPrompt(id) {
    return this.prompts.get(id);
  }

  getAllPrompts() {
    return Array.from(this.prompts.values()).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  async deletePrompt(id) {
    this.prompts.delete(id);
    this.versions.delete(id);
    await this.saveAllData();
  }

  // Version operations
  getVersionHistory(promptId) {
    const versions = this.versions.get(promptId) || [];
    return versions.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  getVersion(versionId) {
    for (const versions of this.versions.values()) {
      const version = versions.find(v => v.id === versionId);
      if (version) return version;
    }
    return null;
  }

  async rollbackToVersion(promptId, versionId, note) {
    const prompt = this.prompts.get(promptId);
    const sourceVersion = this.getVersion(versionId);
    
    if (!prompt || !sourceVersion) {
      throw new Error('Prompt or version not found');
    }

    const now = new Date().toISOString();
    const versions = this.versions.get(promptId) || [];
    const newVersionNumber = versions.length + 1;
    
    // Create rollback version
    const rollbackVersionId = this.generateId();
    const rollbackVersion = {
      id: rollbackVersionId,
      promptId,
      content: sourceVersion.content,
      note: note || `Rollback to version ${sourceVersion.versionNumber}`,
      createdAt: now,
      versionNumber: newVersionNumber,
      isRollback: true,
      sourceVersionId: versionId
    };

    // Update prompt
    prompt.content = sourceVersion.content;
    prompt.updatedAt = now;
    prompt.currentVersionId = rollbackVersionId;
    prompt.versionCount = newVersionNumber;

    // Add rollback version
    versions.push(rollbackVersion);
    this.versions.set(promptId, versions);
    this.prompts.set(promptId, prompt);

    await this.saveAllData();
    return prompt;
  }

  // Template operations
  async createTemplate(data) {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const template = {
      id,
      name: data.name,
      content: data.content,
      description: data.description || '',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };

    this.templates.set(id, template);
    await this.saveAllData();
    return template;
  }

  async createPromptFromTemplate(templateId, customizations) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Increment usage count
    template.usageCount++;
    this.templates.set(templateId, template);

    // Create prompt from template
    const promptData = {
      title: customizations?.title || `From ${template.name}`,
      content: template.content,
      tags: [...template.tags, ...(customizations?.additionalTags || [])]
    };

    const prompt = await this.createPrompt(promptData);
    await this.saveAllData();
    return prompt;
  }

  getTemplate(id) {
    return this.templates.get(id);
  }

  getAllTemplates() {
    return Array.from(this.templates.values()).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  async deleteTemplate(id) {
    this.templates.delete(id);
    await this.saveAllData();
  }

  // Search operations (simple implementation)
  searchPrompts(query) {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 0);
    const results = [];

    for (const prompt of this.prompts.values()) {
      let score = 0;
      const searchText = `${prompt.title} ${prompt.content} ${prompt.tags.join(' ')}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          score++;
          if (prompt.title.toLowerCase().includes(keyword)) {
            score += 2; // Title matches are more important
          }
        }
      }

      if (score > 0) {
        results.push({
          prompt,
          relevanceScore: score,
          matchType: 'content'
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Export/Import operations
  exportAllData() {
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      prompts: Object.fromEntries(this.prompts),
      templates: Object.fromEntries(this.templates),
      versions: Object.fromEntries(this.versions),
      metadata: {
        totalPrompts: this.prompts.size,
        totalTemplates: this.templates.size,
        totalVersions: Array.from(this.versions.values()).reduce((sum, versions) => sum + versions.length, 0),
        exportType: 'complete'
      }
    };
  }

  async importData(data) {
    try {
      if (data.prompts) {
        Object.entries(data.prompts).forEach(([id, prompt]) => {
          this.prompts.set(id, prompt);
        });
      }

      if (data.templates) {
        Object.entries(data.templates).forEach(([id, template]) => {
          this.templates.set(id, template);
        });
      }

      if (data.versions) {
        Object.entries(data.versions).forEach(([promptId, versions]) => {
          this.versions.set(promptId, versions);
        });
      }

      await this.saveAllData();
      
      return {
        success: true,
        importedPrompts: Object.keys(data.prompts || {}).length,
        importedTemplates: Object.keys(data.templates || {}).length,
        importedVersions: Object.values(data.versions || {}).reduce((sum, versions) => sum + versions.length, 0),
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        importedPrompts: 0,
        importedTemplates: 0,
        importedVersions: 0,
        errors: [error.message]
      };
    }
  }
}

// Export for different environments
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Browser environment
  window.dataManager = new DataManager();
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = DataManager;
}