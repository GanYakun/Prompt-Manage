const SimpleSQLite = require('./SimpleSQLite');
const { join } = require('path');

export class DatabaseManager {
  private db: SimpleSQLite;
  private static instance: DatabaseManager;

  private constructor() {
    // Get user data directory for database storage
    const userDataPath = process.env.NODE_ENV === 'test' ? './test-data' : 
                        (typeof require !== 'undefined' && require('electron')?.app?.getPath('userData')) || './data';
    const dbPath = join(userDataPath, 'prompts.db');
    
    this.db = new SimpleSQLite(dbPath);
    this.initializeDatabase();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async initializeDatabase(): Promise<void> {
    // Enable foreign keys
    await this.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    await this.createTables();
    
    // Create indexes for performance
    await this.createIndexes();
  }

  private async createTables(): Promise<void> {
    // Prompts table
    await this.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT, -- JSON array
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
        source_version_id TEXT,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
      )
    `);

    // Templates table
    await this.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        tags TEXT, -- JSON array
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
        tags TEXT, -- JSON array
        last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createIndexes(): Promise<void> {
    // Indexes for performance optimization
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

  public getDatabase(): SimpleSQLite {
    return this.db;
  }

  // Promisified database methods
  public async run(sql: string, params: any[] = []): Promise<any> {
    return this.db.run(sql, params);
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    return this.db.get(sql, params);
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    return this.db.all(sql, params);
  }

  public async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Simple transaction implementation
    // In a real SQLite implementation, this would use BEGIN/COMMIT/ROLLBACK
    try {
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async close(): Promise<void> {
    this.db.close();
  }

  // Health check and maintenance
  public async checkIntegrity(): Promise<boolean> {
    try {
      const result = await this.get('PRAGMA integrity_check');
      return result?.integrity_check === 'ok';
    } catch (error) {
      console.error('Database integrity check failed:', error);
      return false;
    }
  }

  public async vacuum(): Promise<void> {
    await this.run('VACUUM');
  }

  public async analyze(): Promise<void> {
    await this.run('ANALYZE');
  }
}