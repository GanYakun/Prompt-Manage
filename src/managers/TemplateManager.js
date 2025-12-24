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

class TemplateManager {
  constructor() {
    this.repositoryFactory = null;
    this.templateRepository = null;
    this.searchIndexRepository = null;
  }

  async initialize() {
    if (!this.repositoryFactory) {
      this.repositoryFactory = RepositoryFactory.getInstance();
      await this.repositoryFactory.initialize();
      
      this.templateRepository = this.repositoryFactory.getTemplateRepository();
      this.searchIndexRepository = this.repositoryFactory.getSearchIndexRepository();
    }
  }

  // 创建新模板
  async createTemplate(name, content, description = '', tags = [], categories = null) {
    await this.initialize();
    
    const templateId = generateUUID();
    const now = new Date().toISOString();
    
    try {
      const template = {
        id: templateId,
        name: name.trim(),
        content: content,
        description: description.trim(),
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
        categories: categories ? JSON.stringify(categories) : null,
        created_at: now,
        updated_at: now,
        usage_count: 0
      };

      await this.templateRepository.create(template);

      // 更新搜索索引
      await this.updateSearchIndex(templateId, name, content, description, tags);

      return {
        ...template,
        tags: safeParseJSON(template.tags),
        categories: safeParseJSON(template.categories, null)
      };
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error(`创建模板失败: ${error.message}`);
    }
  }

  // 从Prompt创建模板
  async createTemplateFromPrompt(promptId, name, description = '', additionalTags = []) {
    await this.initialize();
    
    try {
      const promptRepository = this.repositoryFactory.getPromptRepository();
      const prompt = await promptRepository.findById(promptId);
      
      if (!prompt) {
        throw new Error('Prompt不存在');
      }

      const promptTags = safeParseJSON(prompt.tags, []);
      const allTags = [...new Set([...promptTags, ...additionalTags])];

      return await this.createTemplate(name, prompt.content, description, allTags);
    } catch (error) {
      console.error('Failed to create template from prompt:', error);
      throw new Error(`从Prompt创建模板失败: ${error.message}`);
    }
  }

  // 更新模板
  async updateTemplate(templateId, updates) {
    await this.initialize();
    
    try {
      const existingTemplate = await this.templateRepository.findById(templateId);
      if (!existingTemplate) {
        throw new Error('模板不存在');
      }

      const now = new Date().toISOString();
      const updatedTemplate = {
        ...existingTemplate,
        name: updates.name !== undefined ? updates.name.trim() : existingTemplate.name,
        content: updates.content !== undefined ? updates.content : existingTemplate.content,
        description: updates.description !== undefined ? updates.description.trim() : existingTemplate.description,
        tags: updates.tags !== undefined ? JSON.stringify(updates.tags) : existingTemplate.tags,
        updated_at: now
      };

      await this.templateRepository.update(templateId, updatedTemplate);

      // 更新搜索索引
      const tags = safeParseJSON(updatedTemplate.tags);
      await this.updateSearchIndex(templateId, updatedTemplate.name, updatedTemplate.content, updatedTemplate.description, tags);

      return {
        ...updatedTemplate,
        tags: tags
      };
    } catch (error) {
      console.error('Failed to update template:', error);
      throw new Error(`更新模板失败: ${error.message}`);
    }
  }

  // 获取模板
  async getTemplate(templateId) {
    await this.initialize();
    
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        return null;
      }

      return {
        ...template,
        tags: safeParseJSON(template.tags, []),
        categories: safeParseJSON(template.categories, null)
      };
    } catch (error) {
      console.error('Failed to get template:', error);
      throw new Error(`获取模板失败: ${error.message}`);
    }
  }

  // 获取所有模板
  async getAllTemplates(limit = 50, offset = 0) {
    await this.initialize();
    
    try {
      const templates = await this.templateRepository.findAll(limit, offset);
      
      return templates.map(template => {
        const tags = safeParseJSON(template.tags, []);
        const categories = safeParseJSON(template.categories, null);
        
        return {
          ...template,
          tags: tags,
          categories: categories
        };
      });
    } catch (error) {
      console.error('Failed to get all templates:', error);
      throw new Error(`获取所有模板失败: ${error.message}`);
    }
  }

  // 根据标签获取模板
  async getTemplatesByTag(tag) {
    await this.initialize();
    
    try {
      const templates = await this.templateRepository.findByTag(tag);
      
      return templates.map(template => ({
        ...template,
        tags: safeParseJSON(template.tags, [])
      }));
    } catch (error) {
      console.error('Failed to get templates by tag:', error);
      throw new Error(`根据标签获取模板失败: ${error.message}`);
    }
  }

  // 删除模板
  async deleteTemplate(templateId) {
    await this.initialize();
    
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error('模板不存在');
      }

      // 删除搜索索引
      await this.searchIndexRepository.deleteByEntityId(templateId);
      
      // 删除模板
      await this.templateRepository.delete(templateId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw new Error(`删除模板失败: ${error.message}`);
    }
  }

  // 使用模板创建Prompt
  async createPromptFromTemplate(templateId, customizations = {}) {
    await this.initialize();
    
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('模板不存在');
      }

      // 增加使用次数
      await this.incrementUsageCount(templateId);

      // 应用自定义内容
      let content = template.content;
      if (customizations.variables) {
        // 简单的变量替换
        Object.entries(customizations.variables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          content = content.replace(regex, value);
        });
      }

      const promptData = {
        title: customizations.title || `基于模板: ${template.name}`,
        content: content,
        tags: customizations.tags || template.tags,
        templateId: templateId
      };

      return promptData;
    } catch (error) {
      console.error('Failed to create prompt from template:', error);
      throw new Error(`从模板创建Prompt失败: ${error.message}`);
    }
  }

  // 增加模板使用次数
  async incrementUsageCount(templateId) {
    await this.initialize();
    
    try {
      const template = await this.templateRepository.findById(templateId);
      if (template) {
        const updatedTemplate = {
          ...template,
          usage_count: (template.usage_count || 0) + 1
        };
        await this.templateRepository.update(templateId, updatedTemplate);
      }
    } catch (error) {
      console.error('Failed to increment usage count:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }

  // 获取模板统计信息
  async getTemplateStats() {
    await this.initialize();
    
    try {
      const totalTemplates = await this.templateRepository.count();
      const templates = await this.templateRepository.findAll();
      
      const totalUsage = templates.reduce((sum, template) => sum + (template.usage_count || 0), 0);
      const mostUsedTemplate = templates.reduce((max, template) => 
        (template.usage_count || 0) > (max.usage_count || 0) ? template : max, templates[0]);

      return {
        total_templates: totalTemplates,
        total_usage: totalUsage,
        average_usage: totalTemplates > 0 ? (totalUsage / totalTemplates).toFixed(2) : 0,
        most_used_template: mostUsedTemplate ? {
          id: mostUsedTemplate.id,
          name: mostUsedTemplate.name,
          usage_count: mostUsedTemplate.usage_count || 0
        } : null
      };
    } catch (error) {
      console.error('Failed to get template stats:', error);
      // Return default stats if there's an error
      return {
        total_templates: 0,
        total_usage: 0,
        average_usage: 0,
        most_used_template: null
      };
    }
  }

  // 更新搜索索引
  async updateSearchIndex(templateId, name, content, description, tags) {
    try {
      const searchEntry = {
        id: generateUUID(),
        entity_id: templateId,
        entity_type: 'template',
        content: `${content} ${description}`,
        title: name,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
        last_indexed: new Date().toISOString()
      };

      // 删除现有索引
      await this.searchIndexRepository.deleteByEntityId(templateId);
      
      // 创建新索引
      await this.searchIndexRepository.create(searchEntry);
    } catch (error) {
      console.error('Failed to update search index:', error);
      // 不抛出错误，因为搜索索引失败不应该影响主要功能
    }
  }
}

module.exports = TemplateManager;