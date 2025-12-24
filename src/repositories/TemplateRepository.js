const BaseRepository = require('./BaseRepository');

class TemplateRepository extends BaseRepository {
  constructor(databaseManager) {
    super(databaseManager, 'templates');
  }

  // Create a new template
  async createTemplate(data) {
    const templateData = {
      name: data.name,
      content: data.content,
      description: data.description || '',
      tags: JSON.stringify(data.tags || [], null, 0), // Ensure proper JSON encoding
      usage_count: 0
    };

    const template = await this.create(templateData);
    return this.formatTemplate(template);
  }

  // Update template
  async updateTemplate(id, data) {
    const updateData = {
      name: data.name,
      content: data.content,
      description: data.description,
      tags: JSON.stringify(data.tags || [], null, 0) // Ensure proper JSON encoding
    };

    const updated = await this.update(id, updateData);
    if (!updated) {
      throw new Error('Template not found or update failed');
    }

    const template = await this.findById(id);
    return this.formatTemplate(template);
  }

  // Increment usage count
  async incrementUsageCount(id) {
    const template = await this.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const newUsageCount = (template.usage_count || 0) + 1;
    await this.update(id, { usage_count: newUsageCount });
    
    const updatedTemplate = await this.findById(id);
    return this.formatTemplate(updatedTemplate);
  }

  // Get templates by tags
  async findByTags(tags) {
    if (!tags || tags.length === 0) {
      return await this.getAllTemplates();
    }

    const sql = `SELECT * FROM ${this.tableName} ORDER BY updated_at DESC`;
    const allTemplates = await this.db.all(sql);
    
    return allTemplates
      .map(template => this.formatTemplate(template))
      .filter(template => {
        return tags.some(tag => template.tags.includes(tag));
      });
  }

  // Search templates
  async search(query) {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 0);
    const sql = `SELECT * FROM ${this.tableName} ORDER BY updated_at DESC`;
    const allTemplates = await this.db.all(sql);
    
    const results = [];
    
    for (const templateRow of allTemplates) {
      const template = this.formatTemplate(templateRow);
      let score = 0;
      const searchText = `${template.name} ${template.description} ${template.content} ${template.tags.join(' ')}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          score++;
          if (template.name.toLowerCase().includes(keyword)) {
            score += 3; // Name matches are most important
          }
          if (template.description.toLowerCase().includes(keyword)) {
            score += 2; // Description matches are important
          }
        }
      }

      if (score > 0) {
        results.push({
          template,
          relevanceScore: score,
          matchType: 'content'
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Get most used templates
  async getMostUsedTemplates(limit = 10) {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY usage_count DESC, updated_at DESC LIMIT ?`;
    const templates = await this.db.all(sql, [limit]);
    return templates.map(template => this.formatTemplate(template));
  }

  // Get recently created templates
  async getRecentTemplates(limit = 10) {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ?`;
    const templates = await this.db.all(sql, [limit]);
    return templates.map(template => this.formatTemplate(template));
  }

  // Get template statistics
  async getTemplateStats() {
    const totalSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const usageSql = `SELECT SUM(usage_count) as total_usage FROM ${this.tableName}`;
    const avgUsageSql = `SELECT AVG(usage_count) as avg_usage FROM ${this.tableName}`;
    
    const [total, usage, avgUsage] = await Promise.all([
      this.db.get(totalSql),
      this.db.get(usageSql),
      this.db.get(avgUsageSql)
    ]);

    return {
      totalTemplates: total.total || 0,
      totalUsage: usage.total_usage || 0,
      averageUsage: Math.round((avgUsage.avg_usage || 0) * 100) / 100
    };
  }

  // Get all unique tags
  async getAllTags() {
    const sql = `SELECT tags FROM ${this.tableName} WHERE tags IS NOT NULL AND tags != ''`;
    const results = await this.db.all(sql);
    
    const allTags = new Set();
    results.forEach(row => {
      try {
        const tags = JSON.parse(row.tags || '[]');
        tags.forEach(tag => allTags.add(tag));
      } catch (error) {
        // Ignore invalid JSON
      }
    });
    
    return Array.from(allTags).sort();
  }

  // Format template data
  formatTemplate(templateRow) {
    if (!templateRow) return null;
    
    let tags = [];
    try {
      tags = templateRow.tags ? JSON.parse(templateRow.tags) : [];
    } catch (error) {
      console.warn('Failed to parse template tags:', templateRow.tags, error);
      // Try to handle as comma-separated string fallback
      if (typeof templateRow.tags === 'string' && templateRow.tags.trim()) {
        tags = templateRow.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    
    let categories = null;
    try {
      categories = templateRow.categories ? JSON.parse(templateRow.categories) : null;
    } catch (error) {
      console.warn('Failed to parse template categories:', templateRow.categories, error);
    }
    
    return {
      ...templateRow,
      tags: tags,
      categories: categories,
      createdAt: templateRow.created_at,
      updatedAt: templateRow.updated_at,
      usageCount: templateRow.usage_count || 0
    };
  }

  // Get all templates formatted
  async getAllTemplates() {
    const templates = await this.findAll('updated_at DESC');
    return templates.map(template => this.formatTemplate(template));
  }

  // Get single template formatted
  async getTemplate(id) {
    const template = await this.findById(id);
    return this.formatTemplate(template);
  }
}

module.exports = TemplateRepository;