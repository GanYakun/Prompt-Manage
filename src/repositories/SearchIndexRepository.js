const BaseRepository = require('./BaseRepository');

class SearchIndexRepository extends BaseRepository {
  constructor(databaseManager) {
    super(databaseManager, 'search_index');
  }

  // Index a prompt
  async indexPrompt(prompt) {
    const indexData = {
      entity_id: prompt.id,
      entity_type: 'prompt',
      content: prompt.content,
      title: prompt.title,
      tags: JSON.stringify(prompt.tags || [])
    };

    // Check if already indexed
    const existing = await this.db.get(
      'SELECT id FROM search_index WHERE entity_id = ? AND entity_type = ?',
      [prompt.id, 'prompt']
    );

    if (existing) {
      // Update existing index
      await this.update(existing.id, indexData);
    } else {
      // Create new index
      await this.create(indexData);
    }
  }

  // Index a prompt version
  async indexPromptVersion(version) {
    const indexData = {
      entity_id: version.id,
      entity_type: 'version',
      content: version.content,
      title: `Version ${version.versionNumber}`,
      tags: JSON.stringify([])
    };

    // Check if already indexed
    const existing = await this.db.get(
      'SELECT id FROM search_index WHERE entity_id = ? AND entity_type = ?',
      [version.id, 'version']
    );

    if (existing) {
      await this.update(existing.id, indexData);
    } else {
      await this.create(indexData);
    }
  }

  // Index a template
  async indexTemplate(template) {
    const indexData = {
      entity_id: template.id,
      entity_type: 'template',
      content: template.content,
      title: template.name,
      tags: JSON.stringify(template.tags || [])
    };

    // Check if already indexed
    const existing = await this.db.get(
      'SELECT id FROM search_index WHERE entity_id = ? AND entity_type = ?',
      [template.id, 'template']
    );

    if (existing) {
      await this.update(existing.id, indexData);
    } else {
      await this.create(indexData);
    }
  }

  // Search across all indexed content
  async search(query, options = {}) {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 0);
    const entityTypes = options.entityTypes || ['prompt', 'version', 'template'];
    const includeHistory = options.includeHistory !== false;

    let sql = `SELECT * FROM ${this.tableName}`;
    const conditions = [];
    
    if (!includeHistory) {
      conditions.push("entity_type != 'version'");
    }
    
    if (entityTypes.length < 3) {
      const typeConditions = entityTypes.map(() => 'entity_type = ?').join(' OR ');
      conditions.push(`(${typeConditions})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const params = entityTypes.length < 3 ? entityTypes : [];
    const allIndexes = await this.db.all(sql, params);
    
    const results = [];
    
    for (const indexRow of allIndexes) {
      const index = this.formatIndex(indexRow);
      let score = 0;
      const searchText = `${index.title || ''} ${index.content} ${index.tags.join(' ')}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          score++;
          if (index.title && index.title.toLowerCase().includes(keyword)) {
            score += 3; // Title matches are most important
          }
          if (index.tags.some(tag => tag.toLowerCase().includes(keyword))) {
            score += 2; // Tag matches are important
          }
        }
      }

      if (score > 0) {
        // Extract context around the match
        const matchedContent = this.extractContext(index.content, keywords);
        
        results.push({
          entityId: index.entityId,
          entityType: index.entityType,
          title: index.title,
          matchedContent,
          relevanceScore: score,
          matchType: this.determineMatchType(index, keywords)
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Extract context around matched keywords
  extractContext(content, keywords, contextLength = 100) {
    const lowerContent = content.toLowerCase();
    
    for (const keyword of keywords) {
      const index = lowerContent.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - contextLength / 2);
        const end = Math.min(content.length, index + keyword.length + contextLength / 2);
        let context = content.substring(start, end);
        
        if (start > 0) context = '...' + context;
        if (end < content.length) context = context + '...';
        
        return context;
      }
    }
    
    // If no keyword found, return beginning of content
    return content.substring(0, contextLength) + (content.length > contextLength ? '...' : '');
  }

  // Determine the type of match
  determineMatchType(index, keywords) {
    const lowerTitle = (index.title || '').toLowerCase();
    const lowerContent = index.content.toLowerCase();
    const lowerTags = index.tags.map(t => t.toLowerCase());
    
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) return 'title';
      if (lowerTags.some(tag => tag.includes(keyword))) return 'tag';
    }
    
    if (index.entityType === 'version') return 'history';
    return 'content';
  }

  // Rebuild entire search index
  async rebuildIndex() {
    // Clear existing index
    await this.db.run(`DELETE FROM ${this.tableName}`);
    
    // Re-index all prompts
    const prompts = await this.db.all('SELECT * FROM prompts');
    for (const prompt of prompts) {
      await this.indexPrompt({
        id: prompt.id,
        title: prompt.title,
        content: prompt.content,
        tags: JSON.parse(prompt.tags || '[]')
      });
    }
    
    // Re-index all versions
    const versions = await this.db.all('SELECT * FROM prompt_versions');
    for (const version of versions) {
      await this.indexPromptVersion({
        id: version.id,
        content: version.content,
        versionNumber: version.version_number
      });
    }
    
    // Re-index all templates
    const templates = await this.db.all('SELECT * FROM templates');
    for (const template of templates) {
      await this.indexTemplate({
        id: template.id,
        name: template.name,
        content: template.content,
        tags: JSON.parse(template.tags || '[]')
      });
    }
    
    return {
      promptsIndexed: prompts.length,
      versionsIndexed: versions.length,
      templatesIndexed: templates.length
    };
  }

  // Remove index for an entity
  async removeIndex(entityId, entityType) {
    const sql = `DELETE FROM ${this.tableName} WHERE entity_id = ? AND entity_type = ?`;
    const result = await this.db.run(sql, [entityId, entityType]);
    return result.changes > 0;
  }

  // Remove all indexes for an entity (all types)
  async deleteByEntityId(entityId) {
    const sql = `DELETE FROM ${this.tableName} WHERE entity_id = ?`;
    const result = await this.db.run(sql, [entityId]);
    return result.changes > 0;
  }

  // Get index statistics
  async getIndexStats() {
    const sql = `
      SELECT 
        entity_type,
        COUNT(*) as count
      FROM ${this.tableName}
      GROUP BY entity_type
    `;
    const stats = await this.db.all(sql);
    
    const result = {
      total: 0,
      prompts: 0,
      versions: 0,
      templates: 0
    };
    
    stats.forEach(stat => {
      result[stat.entity_type + 's'] = stat.count;
      result.total += stat.count;
    });
    
    return result;
  }

  // Format index data
  formatIndex(indexRow) {
    if (!indexRow) return null;
    
    return {
      ...indexRow,
      entityId: indexRow.entity_id,
      entityType: indexRow.entity_type,
      tags: indexRow.tags ? JSON.parse(indexRow.tags) : [],
      lastIndexed: indexRow.last_indexed
    };
  }
}

module.exports = SearchIndexRepository;