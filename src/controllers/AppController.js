const PromptManager = require('../managers/PromptManager');
const TemplateManager = require('../managers/TemplateManager');
const VersionController = require('./VersionController');
const SearchEngine = require('../engines/SearchEngine');
const ExportManager = require('../managers/ExportManager');

class AppController {
  constructor() {
    this.promptManager = new PromptManager();
    this.templateManager = new TemplateManager();
    this.versionController = new VersionController();
    this.searchEngine = new SearchEngine();
    this.exportManager = new ExportManager();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await Promise.all([
        this.promptManager.initialize(),
        this.templateManager.initialize(),
        this.versionController.initialize(),
        this.searchEngine.initialize(),
        this.exportManager.initialize()
      ]);
      this.initialized = true;
    }
  }

  // Prompt相关方法
  async createPrompt(title, content, tags = [], note = '初始版本', categories = null) {
    await this.initialize();
    return this.promptManager.createPrompt(title, content, tags, note, categories);
  }

  async updatePrompt(promptId, updates, note = null) {
    await this.initialize();
    return this.promptManager.updatePrompt(promptId, updates, note);
  }

  async getPrompt(promptId) {
    await this.initialize();
    return this.promptManager.getPrompt(promptId);
  }

  async getAllPrompts(limit = 50, offset = 0) {
    await this.initialize();
    return this.promptManager.getAllPrompts(limit, offset);
  }

  async deletePrompt(promptId) {
    await this.initialize();
    return this.promptManager.deletePrompt(promptId);
  }

  async getPromptsByTag(tag) {
    await this.initialize();
    return this.promptManager.getPromptsByTag(tag);
  }

  async getPromptStats() {
    await this.initialize();
    return this.promptManager.getPromptStats();
  }

  // 版本控制相关方法
  async getVersionHistory(promptId) {
    await this.initialize();
    return this.versionController.getVersionHistory(promptId);
  }

  async compareVersions(versionId1, versionId2) {
    await this.initialize();
    return this.versionController.compareVersions(versionId1, versionId2);
  }

  async rollbackToVersion(promptId, targetVersionId, note = null) {
    await this.initialize();
    return this.versionController.rollbackToVersion(promptId, targetVersionId, note);
  }

  async getVersionStats(promptId) {
    await this.initialize();
    return this.versionController.getVersionStats(promptId);
  }

  // 模板相关方法
  async createTemplate(name, content, description = '', tags = [], categories = null) {
    await this.initialize();
    return this.templateManager.createTemplate(name, content, description, tags, categories);
  }

  async createTemplateFromPrompt(promptId, name, description = '', additionalTags = []) {
    await this.initialize();
    return this.templateManager.createTemplateFromPrompt(promptId, name, description, additionalTags);
  }

  async updateTemplate(templateId, updates) {
    await this.initialize();
    return this.templateManager.updateTemplate(templateId, updates);
  }

  async getTemplate(templateId) {
    await this.initialize();
    return this.templateManager.getTemplate(templateId);
  }

  async getAllTemplates(limit = 50, offset = 0) {
    await this.initialize();
    return this.templateManager.getAllTemplates(limit, offset);
  }

  async deleteTemplate(templateId) {
    await this.initialize();
    return this.templateManager.deleteTemplate(templateId);
  }

  async createPromptFromTemplate(templateId, customizations = {}) {
    await this.initialize();
    const promptData = await this.templateManager.createPromptFromTemplate(templateId, customizations);
    // 实际创建Prompt
    return this.createPrompt(promptData.title, promptData.content, promptData.tags);
  }

  async getTemplateStats() {
    await this.initialize();
    return this.templateManager.getTemplateStats();
  }

  // 搜索相关方法
  async search(query, options = {}) {
    await this.initialize();
    return this.searchEngine.search(query, options);
  }

  async advancedSearch(criteria) {
    await this.initialize();
    return this.searchEngine.advancedSearch(criteria);
  }

  async getSearchSuggestions(partialQuery, limit = 10) {
    await this.initialize();
    return this.searchEngine.getSearchSuggestions(partialQuery, limit);
  }

  async getPopularSearchTerms(limit = 10) {
    await this.initialize();
    return this.searchEngine.getPopularSearchTerms(limit);
  }

  async rebuildSearchIndex() {
    await this.initialize();
    return this.searchEngine.rebuildSearchIndex();
  }

  async getSearchStats() {
    await this.initialize();
    return this.searchEngine.getSearchStats();
  }

  // 导出导入相关方法
  async exportPrompt(promptId, filePath) {
    await this.initialize();
    return this.exportManager.exportPrompt(promptId, filePath);
  }

  async exportAll(filePath) {
    await this.initialize();
    return this.exportManager.exportAll(filePath);
  }

  async exportTemplates(filePath) {
    await this.initialize();
    return this.exportManager.exportTemplates(filePath);
  }

  async importData(filePath, options = {}) {
    await this.initialize();
    return this.exportManager.importData(filePath, options);
  }

  async validateImportFile(filePath) {
    await this.initialize();
    return this.exportManager.validateImportFile(filePath);
  }

  getExportFormats() {
    return this.exportManager.getExportFormats();
  }

  // 应用程序统计信息
  async getAppStats() {
    await this.initialize();
    
    try {
      const [promptStats, templateStats, searchStats] = await Promise.all([
        this.getPromptStats(),
        this.getTemplateStats(),
        this.getSearchStats()
      ]);

      return {
        prompts: promptStats,
        templates: templateStats,
        search: searchStats,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get app stats:', error);
      throw new Error(`获取应用统计信息失败: ${error.message}`);
    }
  }

  // 获取所有标签
  async getAllTags() {
    await this.initialize();
    
    try {
      const [prompts, templates] = await Promise.all([
        this.getAllPrompts(),
        this.getAllTemplates()
      ]);

      const tagSet = new Set();
      
      // 从Prompt中收集标签
      prompts.forEach(prompt => {
        if (prompt.tags && Array.isArray(prompt.tags)) {
          prompt.tags.forEach(tag => tagSet.add(tag));
        }
      });

      // 从模板中收集标签
      templates.forEach(template => {
        if (template.tags && Array.isArray(template.tags)) {
          template.tags.forEach(tag => tagSet.add(tag));
        }
      });

      return Array.from(tagSet).sort();
    } catch (error) {
      console.error('Failed to get all tags:', error);
      throw new Error(`获取所有标签失败: ${error.message}`);
    }
  }

  // 数据库维护
  async performMaintenance() {
    await this.initialize();
    
    try {
      // 重建搜索索引
      const searchResult = await this.rebuildSearchIndex();
      
      // 可以添加其他维护任务，如数据库优化等
      
      return {
        success: true,
        message: '数据库维护完成',
        details: {
          search_index: searchResult
        }
      };
    } catch (error) {
      console.error('Failed to perform maintenance:', error);
      throw new Error(`数据库维护失败: ${error.message}`);
    }
  }
}

module.exports = AppController;