const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Prompt management
  createPrompt: (title, content, tags, note) => ipcRenderer.invoke('create-prompt', title, content, tags, note),
  updatePrompt: (promptId, updates, note) => ipcRenderer.invoke('update-prompt', promptId, updates, note),
  getPrompt: (promptId) => ipcRenderer.invoke('get-prompt', promptId),
  getAllPrompts: (limit, offset) => ipcRenderer.invoke('get-all-prompts', limit, offset),
  deletePrompt: (promptId) => ipcRenderer.invoke('delete-prompt', promptId),
  getPromptsByTag: (tag) => ipcRenderer.invoke('get-prompts-by-tag', tag),

  // Version control
  getVersionHistory: (promptId) => ipcRenderer.invoke('get-version-history', promptId),
  compareVersions: (versionId1, versionId2) => ipcRenderer.invoke('compare-versions', versionId1, versionId2),
  rollbackToVersion: (promptId, targetVersionId, note) => ipcRenderer.invoke('rollback-to-version', promptId, targetVersionId, note),

  // Template management
  createTemplate: (name, content, description, tags) => ipcRenderer.invoke('create-template', name, content, description, tags),
  createTemplateFromPrompt: (promptId, name, description, additionalTags) => ipcRenderer.invoke('create-template-from-prompt', promptId, name, description, additionalTags),
  updateTemplate: (templateId, updates) => ipcRenderer.invoke('update-template', templateId, updates),
  getTemplate: (templateId) => ipcRenderer.invoke('get-template', templateId),
  getAllTemplates: (limit, offset) => ipcRenderer.invoke('get-all-templates', limit, offset),
  deleteTemplate: (templateId) => ipcRenderer.invoke('delete-template', templateId),
  createPromptFromTemplate: (templateId, customizations) => ipcRenderer.invoke('create-prompt-from-template', templateId, customizations),

  // Search
  search: (query, options) => ipcRenderer.invoke('search', query, options),
  advancedSearch: (criteria) => ipcRenderer.invoke('advanced-search', criteria),
  getSearchSuggestions: (partialQuery, limit) => ipcRenderer.invoke('get-search-suggestions', partialQuery, limit),
  getPopularSearchTerms: (limit) => ipcRenderer.invoke('get-popular-search-terms', limit),
  rebuildSearchIndex: () => ipcRenderer.invoke('rebuild-search-index'),

  // Export/Import
  exportPrompt: (promptId, filePath) => ipcRenderer.invoke('export-prompt', promptId, filePath),
  exportAll: (filePath) => ipcRenderer.invoke('export-all', filePath),
  exportTemplates: (filePath) => ipcRenderer.invoke('export-templates', filePath),
  importData: (filePath, options) => ipcRenderer.invoke('import-data', filePath, options),
  validateImportFile: (filePath) => ipcRenderer.invoke('validate-import-file', filePath),

  // Statistics and utilities
  getAppStats: () => ipcRenderer.invoke('get-app-stats'),
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  performMaintenance: () => ipcRenderer.invoke('perform-maintenance'),
  getExportFormats: () => ipcRenderer.invoke('get-export-formats'),

  // Menu event listeners
  onMenuNewPrompt: (callback) => ipcRenderer.on('menu-new-prompt', callback),
  onMenuNewTemplate: (callback) => ipcRenderer.on('menu-new-template', callback),
  onMenuExportAll: (callback) => ipcRenderer.on('menu-export-all', callback),
  onMenuImport: (callback) => ipcRenderer.on('menu-import', callback),
  onMenuSearch: (callback) => ipcRenderer.on('menu-search', callback),
  onMenuAdvancedSearch: (callback) => ipcRenderer.on('menu-advanced-search', callback),
  onMenuRebuildIndex: (callback) => ipcRenderer.on('menu-rebuild-index', callback),
  onMenuMaintenance: (callback) => ipcRenderer.on('menu-maintenance', callback),
  onMenuStats: (callback) => ipcRenderer.on('menu-stats', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});