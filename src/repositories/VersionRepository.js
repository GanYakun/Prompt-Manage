const BaseRepository = require('./BaseRepository');
const DiffEngine = require('../engines/DiffEngine');

class VersionRepository extends BaseRepository {
  constructor(databaseManager) {
    super(databaseManager, 'prompt_versions');
    this.diffEngine = new DiffEngine();
  }

  // Get version history for a prompt
  async getVersionHistory(promptId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE prompt_id = ? ORDER BY version_number DESC`;
    const versions = await this.db.all(sql, [promptId]);
    return versions.map(version => this.formatVersion(version));
  }

  // Find versions by prompt ID (alias for getVersionHistory for compatibility)
  async findByPromptId(promptId) {
    return this.getVersionHistory(promptId);
  }

  // Delete all versions for a prompt (alias for deleteVersionsForPrompt for compatibility)
  async deleteByPromptId(promptId) {
    return this.deleteVersionsForPrompt(promptId);
  }

  // Get a specific version
  async getVersion(versionId) {
    const version = await this.findById(versionId);
    return this.formatVersion(version);
  }

  // Create a new version
  async create(versionData) {
    const record = await super.create(versionData);
    return this.formatVersion(record);
  }

  // Create a new version
  async createVersion(promptId, content, note, isRollback = false, sourceVersionId = null) {
    // Get current version count
    const versionCountResult = await this.db.get(
      'SELECT COUNT(*) as count FROM prompt_versions WHERE prompt_id = ?',
      [promptId]
    );
    const versionNumber = (versionCountResult?.count || 0) + 1;

    const versionData = {
      prompt_id: promptId,
      content,
      note: note || `Version ${versionNumber}`,
      version_number: versionNumber,
      is_rollback: isRollback,
      source_version_id: sourceVersionId
    };

    const version = await this.create(versionData);
    return this.formatVersion(version);
  }

  // Get versions by date range
  async getVersionsByDateRange(promptId, startDate, endDate) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE prompt_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY version_number DESC
    `;
    const versions = await this.db.all(sql, [promptId, startDate, endDate]);
    return versions.map(version => this.formatVersion(version));
  }

  // Get rollback versions
  async getRollbackVersions(promptId) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE prompt_id = ? AND is_rollback = true
      ORDER BY version_number DESC
    `;
    const versions = await this.db.all(sql, [promptId]);
    return versions.map(version => this.formatVersion(version));
  }

  // Get version statistics
  async getVersionStats(promptId) {
    const sql = `
      SELECT 
        COUNT(*) as total_versions,
        COUNT(CASE WHEN is_rollback = true THEN 1 END) as rollback_count,
        MIN(created_at) as first_version_date,
        MAX(created_at) as last_version_date
      FROM ${this.tableName} 
      WHERE prompt_id = ?
    `;
    const stats = await this.db.get(sql, [promptId]);
    return {
      totalVersions: stats.total_versions || 0,
      rollbackCount: stats.rollback_count || 0,
      firstVersionDate: stats.first_version_date,
      lastVersionDate: stats.last_version_date
    };
  }

  // Compare two versions
  async compareVersions(versionId1, versionId2) {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Use advanced diff engine
    const diffResult = this.diffEngine.generateDiff(version1.content, version2.content);

    return {
      version1,
      version2,
      diff: diffResult,
      // Keep backward compatibility
      contentDiff: this.generateSimpleDiff(version1.content, version2.content)
    };
  }

  // Simple diff generation (for backward compatibility)
  generateSimpleDiff(content1, content2) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const diff = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 === line2) {
        diff.push({
          lineNumber: i + 1,
          content: line1,
          type: 'unchanged'
        });
      } else if (line1 && !line2) {
        diff.push({
          lineNumber: i + 1,
          content: line1,
          type: 'deletion'
        });
      } else if (!line1 && line2) {
        diff.push({
          lineNumber: i + 1,
          content: line2,
          type: 'addition'
        });
      } else {
        diff.push({
          lineNumber: i + 1,
          content: line2,
          type: 'modification',
          oldContent: line1
        });
      }
    }
    
    return {
      additions: diff.filter(d => d.type === 'addition'),
      deletions: diff.filter(d => d.type === 'deletion'),
      modifications: diff.filter(d => d.type === 'modification'),
      unchanged: diff.filter(d => d.type === 'unchanged')
    };
  }

  // Delete all versions for a prompt (cascade delete)
  async deleteVersionsForPrompt(promptId) {
    const sql = `DELETE FROM ${this.tableName} WHERE prompt_id = ?`;
    const result = await this.db.run(sql, [promptId]);
    return result.changes;
  }

  // Format version data
  formatVersion(versionRow) {
    if (!versionRow) return null;
    
    return {
      ...versionRow,
      promptId: versionRow.prompt_id,
      createdAt: versionRow.created_at,
      versionNumber: versionRow.version_number,
      isRollback: !!versionRow.is_rollback,
      sourceVersionId: versionRow.source_version_id
    };
  }
}

module.exports = VersionRepository;