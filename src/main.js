const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { join } = require('path');
const fs = require('fs');
const AppController = require('./controllers/AppController');

class PromptVersionManagerApp {
  constructor() {
    this.mainWindow = null;
    this.dataPath = null;
    this.appController = new AppController();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    app.whenReady().then(() => {
      try {
        this.initializeDataDirectory();
        this.createMainWindow();
        this.setupMenu();
        this.setupIpcHandlers();
      } catch (error) {
        console.error('Error during app initialization:', error);
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    }).catch(error => {
      console.error('Error in app.whenReady:', error);
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Add global error handlers
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  initializeDataDirectory() {
    this.dataPath = app.getPath('userData');
    const dataDir = join(this.dataPath, 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    console.log('Data directory:', dataDir);
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        devTools: false, // 禁用开发者工具
      },
      titleBarStyle: 'default',
      autoHideMenuBar: true, // 隐藏菜单栏
      show: false,
      icon: join(__dirname, '../APP-icon.png'),
    });

    // Load the application
    const isDev = process.argv.includes('--dev');
    console.log('isDev:', isDev);
    if (isDev) {
      // Development mode - load from Vite dev server
      console.log('Loading from Vite dev server: http://localhost:5175');
      this.mainWindow.loadURL('http://localhost:5175');
    } else {
      // Production mode - load from built files
      console.log('Loading from built files');
      this.mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      this.mainWindow.show();
      
      // 不再自动打开开发者工具
    });

    // Add loading event handlers
    this.mainWindow.webContents.on('did-start-loading', () => {
      console.log('Started loading page');
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Finished loading page');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
    });

    // Listen to console messages from renderer process
    this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}]:`, message);
    });

    // Add error handling
    this.mainWindow.webContents.on('crashed', (event) => {
      console.error('Renderer process crashed:', event);
    });

    this.mainWindow.webContents.on('unresponsive', () => {
      console.error('Renderer process became unresponsive');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建Prompt',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-prompt');
            },
          },
          {
            label: '新建模板',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-template');
            },
          },
          { type: 'separator' },
          {
            label: '导出全部数据',
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              this.mainWindow?.webContents.send('menu-export-all');
            },
          },
          {
            label: '导入数据',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              this.mainWindow?.webContents.send('menu-import');
            },
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectall', label: '全选' },
        ],
      },
      {
        label: '查看',
        submenu: [
          { role: 'reload', label: '重新加载' },
          { role: 'forceReload', label: '强制重新加载' },
          { type: 'separator' },
          { role: 'resetZoom', label: '重置缩放' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' },
        ],
      },
      {
        label: '搜索',
        submenu: [
          {
            label: '搜索',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              this.mainWindow?.webContents.send('menu-search');
            },
          },
          {
            label: '高级搜索',
            accelerator: 'CmdOrCtrl+Shift+F',
            click: () => {
              this.mainWindow?.webContents.send('menu-advanced-search');
            },
          },
        ],
      },
      {
        label: '工具',
        submenu: [
          {
            label: '重建搜索索引',
            click: () => {
              this.mainWindow?.webContents.send('menu-rebuild-index');
            },
          },
          {
            label: '数据库维护',
            click: () => {
              this.mainWindow?.webContents.send('menu-maintenance');
            },
          },
          { type: 'separator' },
          {
            label: '应用统计',
            click: () => {
              this.mainWindow?.webContents.send('menu-stats');
            },
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              this.mainWindow?.webContents.send('menu-about');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    // Application info
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('get-app-path', (event, name) => {
      return app.getPath(name);
    });

    ipcMain.handle('get-data-path', () => {
      return this.dataPath;
    });

    ipcMain.handle('open-data-folder', async () => {
      const { shell } = require('electron');
      return await shell.openPath(this.dataPath);
    });

    // File dialogs
    ipcMain.handle('show-save-dialog', async (event, options) => {
      return await dialog.showSaveDialog(this.mainWindow, options);
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      return await dialog.showOpenDialog(this.mainWindow, options);
    });

    // Prompt management
    ipcMain.handle('create-prompt', async (event, promptData) => {
      try {
        console.log('IPC create-prompt called with:', promptData);
        // Handle both object and individual parameters for backward compatibility
        if (typeof promptData === 'object' && promptData !== null) {
          return await this.appController.createPrompt(
            promptData.title, 
            promptData.content, 
            promptData.tags, 
            promptData.note, 
            promptData.categories
          );
        } else {
          // Legacy individual parameters
          const [title, content, tags, note, categories] = arguments.slice(1);
          return await this.appController.createPrompt(title, content, tags, note, categories);
        }
      } catch (error) {
        console.error('IPC create-prompt error:', error);
        throw error;
      }
    });

    ipcMain.handle('update-prompt', async (event, promptId, updates, note) => {
      try {
        // Ensure updates object is serializable
        const cleanUpdates = JSON.parse(JSON.stringify(updates));
        return await this.appController.updatePrompt(promptId, cleanUpdates, note);
      } catch (error) {
        console.error('Update prompt error:', error);
        throw error;
      }
    });

    ipcMain.handle('get-prompt', async (event, promptId) => {
      try {
        return await this.appController.getPrompt(promptId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-all-prompts', async (event, limit, offset) => {
      try {
        return await this.appController.getAllPrompts(limit, offset);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('delete-prompt', async (event, promptId) => {
      try {
        return await this.appController.deletePrompt(promptId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-prompts-by-tag', async (event, tag) => {
      try {
        return await this.appController.getPromptsByTag(tag);
      } catch (error) {
        throw error;
      }
    });

    // Version control
    ipcMain.handle('get-version-history', async (event, promptId) => {
      try {
        return await this.appController.getVersionHistory(promptId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-version-by-id', async (event, versionId) => {
      try {
        return await this.appController.getVersionById(versionId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('compare-versions', async (event, versionId1, versionId2) => {
      try {
        return await this.appController.compareVersions(versionId1, versionId2);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('rollback-to-version', async (event, promptId, targetVersionId, note) => {
      try {
        return await this.appController.rollbackToVersion(promptId, targetVersionId, note);
      } catch (error) {
        throw error;
      }
    });

    // Template management
    ipcMain.handle('create-template', async (event, name, content, description, tags, categories) => {
      try {
        return await this.appController.createTemplate(name, content, description, tags, categories);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('create-template-from-prompt', async (event, promptId, name, description, additionalTags) => {
      try {
        return await this.appController.createTemplateFromPrompt(promptId, name, description, additionalTags);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('update-template', async (event, templateId, updates) => {
      try {
        return await this.appController.updateTemplate(templateId, updates);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-template', async (event, templateId) => {
      try {
        return await this.appController.getTemplate(templateId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-all-templates', async (event, limit, offset) => {
      try {
        return await this.appController.getAllTemplates(limit, offset);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('delete-template', async (event, templateId) => {
      try {
        return await this.appController.deleteTemplate(templateId);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('create-prompt-from-template', async (event, templateId, customizations) => {
      try {
        return await this.appController.createPromptFromTemplate(templateId, customizations);
      } catch (error) {
        throw error;
      }
    });

    // Search
    ipcMain.handle('search', async (event, query, options) => {
      try {
        return await this.appController.search(query, options);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('advanced-search', async (event, criteria) => {
      try {
        return await this.appController.advancedSearch(criteria);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-search-suggestions', async (event, partialQuery, limit) => {
      try {
        return await this.appController.getSearchSuggestions(partialQuery, limit);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-popular-search-terms', async (event, limit) => {
      try {
        return await this.appController.getPopularSearchTerms(limit);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('rebuild-search-index', async (event) => {
      try {
        return await this.appController.rebuildSearchIndex();
      } catch (error) {
        throw error;
      }
    });

    // Export/Import
    ipcMain.handle('export-prompt', async (event, promptId, filePath) => {
      try {
        if (filePath) {
          // 直接导出到指定路径
          return await this.appController.exportPrompt(promptId, filePath);
        } else {
          // 显示保存对话框
          const result = await dialog.showSaveDialog(this.mainWindow, {
            title: '导出Prompt',
            defaultPath: `prompt-${promptId}.json`,
            filters: [
              { name: 'JSON文件', extensions: ['json'] }
            ]
          });

          if (!result.canceled && result.filePath) {
            return await this.appController.exportPrompt(promptId, result.filePath);
          }
          return { success: false, message: '用户取消了导出' };
        }
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('export-all', async (event, filePath) => {
      try {
        if (filePath) {
          // 直接导出到指定路径
          return await this.appController.exportAll(filePath);
        } else {
          // 显示保存对话框
          const result = await dialog.showSaveDialog(this.mainWindow, {
            title: '导出全部数据',
            defaultPath: `prompt-manager-backup-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
              { name: 'JSON文件', extensions: ['json'] }
            ]
          });

          if (!result.canceled && result.filePath) {
            return await this.appController.exportAll(result.filePath);
          }
          return { success: false, message: '用户取消了导出' };
        }
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('export-templates', async (event, filePath) => {
      try {
        if (filePath) {
          // 直接导出到指定路径
          return await this.appController.exportTemplates(filePath);
        } else {
          // 显示保存对话框
          const result = await dialog.showSaveDialog(this.mainWindow, {
            title: '导出模板库',
            defaultPath: `templates-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
              { name: 'JSON文件', extensions: ['json'] }
            ]
          });

          if (!result.canceled && result.filePath) {
            return await this.appController.exportTemplates(result.filePath);
          }
          return { success: false, message: '用户取消了导出' };
        }
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('import-data', async (event, filePath, options) => {
      try {
        if (filePath) {
          // 直接从指定路径导入
          return await this.appController.importData(filePath, options);
        } else {
          // 显示打开对话框
          const result = await dialog.showOpenDialog(this.mainWindow, {
            title: '导入数据',
            filters: [
              { name: 'JSON文件', extensions: ['json'] }
            ],
            properties: ['openFile']
          });

          if (!result.canceled && result.filePaths.length > 0) {
            return await this.appController.importData(result.filePaths[0], options);
          }
          return { success: false, message: '用户取消了导入' };
        }
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('validate-import-file', async (event, filePath) => {
      try {
        return await this.appController.validateImportFile(filePath);
      } catch (error) {
        throw error;
      }
    });

    // Statistics and utilities
    ipcMain.handle('get-app-stats', async (event) => {
      try {
        return await this.appController.getAppStats();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-all-tags', async (event) => {
      try {
        return await this.appController.getAllTags();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('perform-maintenance', async (event) => {
      try {
        return await this.appController.performMaintenance();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-export-formats', (event) => {
      return this.appController.getExportFormats();
    });

    // Custom categories
    ipcMain.handle('get-all-custom-categories', async (event) => {
      try {
        return await this.appController.getAllCustomCategories();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('create-custom-category-group', async (event, groupData) => {
      try {
        return await this.appController.createCustomCategoryGroup(groupData);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('add-category-to-group', async (event, groupType, categoryData) => {
      try {
        return await this.appController.addCategoryToGroup(groupType, categoryData);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('update-custom-category', async (event, id, updates) => {
      try {
        return await this.appController.updateCustomCategory(id, updates);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('delete-custom-category', async (event, id) => {
      try {
        return await this.appController.deleteCustomCategory(id);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('delete-custom-category-group', async (event, groupType) => {
      try {
        return await this.appController.deleteCustomCategoryGroup(groupType);
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-custom-category-group-statistics', async (event) => {
      try {
        return await this.appController.getCustomCategoryGroupStatistics();
      } catch (error) {
        throw error;
      }
    });

    ipcMain.handle('get-custom-category-icon-options', (event) => {
      return this.appController.getCustomCategoryIconOptions();
    });

    ipcMain.handle('get-custom-category-color-options', (event) => {
      return this.appController.getCustomCategoryColorOptions();
    });
  }
}

// Create and start the application
new PromptVersionManagerApp();