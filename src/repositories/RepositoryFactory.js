const DatabaseManager = require('../database/DatabaseManager');
const PromptRepository = require('./PromptRepository');
const VersionRepository = require('./VersionRepository');
const TemplateRepository = require('./TemplateRepository');
const SearchIndexRepository = require('./SearchIndexRepository');

class RepositoryFactory {
  constructor() {
    this.databaseManager = null;
    this.repositories = {};
  }

  async initialize() {
    if (!this.databaseManager) {
      this.databaseManager = DatabaseManager.getInstance();
      await this.databaseManager.initialize();
    }
  }

  getPromptRepository() {
    if (!this.repositories.prompt) {
      this.repositories.prompt = new PromptRepository(this.databaseManager);
    }
    return this.repositories.prompt;
  }

  getVersionRepository() {
    if (!this.repositories.version) {
      this.repositories.version = new VersionRepository(this.databaseManager);
    }
    return this.repositories.version;
  }

  getTemplateRepository() {
    if (!this.repositories.template) {
      this.repositories.template = new TemplateRepository(this.databaseManager);
    }
    return this.repositories.template;
  }

  getSearchIndexRepository() {
    if (!this.repositories.searchIndex) {
      this.repositories.searchIndex = new SearchIndexRepository(this.databaseManager);
    }
    return this.repositories.searchIndex;
  }

  getDatabaseManager() {
    return this.databaseManager;
  }

  async close() {
    if (this.databaseManager) {
      await this.databaseManager.close();
    }
    this.repositories = {};
  }

  // Singleton pattern
  static getInstance() {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }
}

module.exports = RepositoryFactory;