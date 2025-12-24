const SimpleSQLite = require('./SimpleSQLite');
const { join } = require('path');

class DatabaseManager {
  constructor() {
    // Get user data directory for database storage
    const userDataPath = process.env.NODE_ENV === 'test' ? './test-data' : 
                        (typeof require !== 'undefined' && this.getElectronUserPath()) || './data';
    const dbPath = join(userDataPath, 'prompts.db');
    
    this.db = new SimpleSQLite(dbPath);
    this.initialized = false;
  }

  getElectronUserPath() {
    try {
      const { app } = require('electron');
      return app?.getPath('userData');
    } catch (error) {
      return null;
    }
  }

  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create tables
      await this.createTables();
      
      // Create indexes for performance
      await this.createIndexes();
      
      this.initialized = true;
      console.log('DatabaseManager initialized with SQLite');
    } catch (error) {
      console.error('Failed to initialize DatabaseManager:', error);
      throw error;
    }
  }

  async createTables() {
    // Prompts table
    await this.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        categories TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        current_version_id TEXT,
        version_count INTEGER DEFAULT 1
      )
    `);

    // Prompt versions table
    await this.run(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id TEXT PRIMARY KEY,
        prompt_id TEXT NOT NULL,
        content TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version_number INTEGER NOT NULL,
        is_rollback BOOLEAN DEFAULT FALSE,
        source_version_id TEXT
      )
    `);

    // Templates table
    await this.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        categories TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_count INTEGER DEFAULT 0
      )
    `);

    // Search index table
    await this.run(`
      CREATE TABLE IF NOT EXISTS search_index (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        content TEXT NOT NULL,
        title TEXT,
        tags TEXT,
        last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id)',
      'CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_search_index_entity_id ON search_index(entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_search_index_entity_type ON search_index(entity_type)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }
  }

  getDatabase() {
    return this.db;
  }

  // Database operation methods
  async run(sql, params = []) {
    return this.db.run(sql, params);
  }

  async get(sql, params = []) {
    return this.db.get(sql, params);
  }

  async all(sql, params = []) {
    return this.db.all(sql, params);
  }

  async transaction(fn) {
    // Simple transaction implementation
    try {
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async close() {
    this.db.close();
  }

  // Health check and maintenance
  async checkIntegrity() {
    try {
      const result = await this.get('PRAGMA integrity_check');
      return result?.integrity_check === 'ok';
    } catch (error) {
      console.error('Database integrity check failed:', error);
      return false;
    }
  }

  async vacuum() {
    await this.run('VACUUM');
  }

  async analyze() {
    await this.run('ANALYZE');
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseManager;
}