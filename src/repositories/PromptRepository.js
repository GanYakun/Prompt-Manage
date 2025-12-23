const BaseRepository = require('./BaseRepository');

class PromptRepository extends BaseRepository {
  constructor(databaseManager) {
    super(databaseManager, 'prompts');
  }

  // Create a new prompt with initial version
  async createPrompt(data) {
    const promptId = this.generateId();
    const versionId = this.generateId();
    const now = this.getCurrentTimestamp();

    return await this.transaction(async () => {
      // Create the prompt
      const prompt = {
        id: promptId,
        title: data.title,
        content: data.content,
        tags: JSON.stringify(data.tags || [], null, 0), // Ensure proper JSON encoding
        created_at: now,
        updated_at: now,
        current_version_id: versionId,
        version_count: 1
      };

      await this.create(prompt);

      // Create the initial version
      const initialVersion = {
        id: versionId,
        prompt_id: promptId,
        content: data.content,
        note: 'Initial version',
        created_at: now,
        version_number: 1,
        is_rollback: false
      };

      await this.db.run(
        'INSERT INTO prompt_versions (id, prompt_id, content, note, created_at, version_number, is_rollback) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [initialVersion.id, initialVersion.prompt_id, initialVersion.content, initialVersion.note, initialVersion.created_at, initialVersion.version_number, initialVersion.is_rollback]
      );

      return this.formatPrompt(prompt);
    });
  }

  // Update prompt content and create new version
  async updatePrompt(id, content, note) {
    const prompt = await this.findById(id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const versionId = this.generateId();
    const now = this.getCurrentTimestamp();
    const newVersionNumber = prompt.version_count + 1;

    return await this.transaction(async () => {
      // Create new version
      const newVersion = {
        id: versionId,
        prompt_id: id,
        content,
        note: note || `Update ${newVersionNumber}`,
        created_at: now,
        version_number: newVersionNumber,
        is_rollback: false
      };

      await this.db.run(
        'INSERT INTO prompt_versions (id, prompt_id, content, note, created_at, version_number, is_rollback) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newVersion.id, newVersion.prompt_id, newVersion.content, newVersion.note, newVersion.created_at, newVersion.version_number, newVersion.is_rollback]
      );

      // Update prompt
      const updated = await this.update(id, {
        content,
        current_version_id: versionId,
        version_count: newVersionNumber
      });

      if (!updated) {
        throw new Error('Failed to update prompt');
      }

      const updatedPrompt = await this.findById(id);
      return this.formatPrompt(updatedPrompt);
    });
  }

  // Rollback to a specific version
  async rollbackToVersion(promptId, versionId, note) {
    const prompt = await this.findById(promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const sourceVersion = await this.db.get(
      'SELECT * FROM prompt_versions WHERE id = ?',
      [versionId]
    );
    if (!sourceVersion) {
      throw new Error('Version not found');
    }

    const rollbackVersionId = this.generateId();
    const now = this.getCurrentTimestamp();
    const newVersionNumber = prompt.version_count + 1;

    return await this.transaction(async () => {
      // Create rollback version
      const rollbackVersion = {
        id: rollbackVersionId,
        prompt_id: promptId,
        content: sourceVersion.content,
        note: note || `Rollback to version ${sourceVersion.version_number}`,
        created_at: now,
        version_number: newVersionNumber,
        is_rollback: true,
        source_version_id: versionId
      };

      await this.db.run(
        'INSERT INTO prompt_versions (id, prompt_id, content, note, created_at, version_number, is_rollback, source_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [rollbackVersion.id, rollbackVersion.prompt_id, rollbackVersion.content, rollbackVersion.note, rollbackVersion.created_at, rollbackVersion.version_number, rollbackVersion.is_rollback, rollbackVersion.source_version_id]
      );

      // Update prompt
      const updated = await this.update(promptId, {
        content: sourceVersion.content,
        current_version_id: rollbackVersionId,
        version_count: newVersionNumber
      });

      if (!updated) {
        throw new Error('Failed to rollback prompt');
      }

      const updatedPrompt = await this.findById(promptId);
      return this.formatPrompt(updatedPrompt);
    });
  }

  // Get prompts with tag filtering
  async findByTags(tags) {
    if (!tags || tags.length === 0) {
      return await this.findAll();
    }

    const sql = `SELECT * FROM ${this.tableName} ORDER BY updated_at DESC`;
    const allPrompts = await this.db.all(sql);
    
    return allPrompts
      .map(prompt => this.formatPrompt(prompt))
      .filter(prompt => {
        return tags.some(tag => prompt.tags.includes(tag));
      });
  }

  // Search prompts by title and content
  async search(query) {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 0);
    const sql = `SELECT * FROM ${this.tableName} ORDER BY updated_at DESC`;
    const allPrompts = await this.db.all(sql);
    
    const results = [];
    
    for (const promptRow of allPrompts) {
      const prompt = this.formatPrompt(promptRow);
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

  // Format prompt data (parse JSON fields)
  formatPrompt(promptRow) {
    if (!promptRow) return null;
    
    let tags = [];
    try {
      tags = promptRow.tags ? JSON.parse(promptRow.tags) : [];
    } catch (error) {
      console.warn('Failed to parse prompt tags:', promptRow.tags, error);
      // Try to handle as comma-separated string fallback
      if (typeof promptRow.tags === 'string' && promptRow.tags.trim()) {
        tags = promptRow.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    
    return {
      ...promptRow,
      tags: tags,
      createdAt: promptRow.created_at,
      updatedAt: promptRow.updated_at,
      currentVersionId: promptRow.current_version_id,
      versionCount: promptRow.version_count
    };
  }

  // Get all prompts formatted
  async getAllPrompts() {
    const prompts = await this.findAll('updated_at DESC');
    return prompts.map(prompt => this.formatPrompt(prompt));
  }

  // Get single prompt formatted
  async getPrompt(id) {
    const prompt = await this.findById(id);
    return this.formatPrompt(prompt);
  }
}

module.exports = PromptRepository;