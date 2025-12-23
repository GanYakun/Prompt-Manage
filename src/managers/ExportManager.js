const fs = require('fs').promises;
const path = require('path');
const RepositoryFactory = require('../repositories/RepositoryFactory');

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

class ExportManager {
  constructor() {
    this.repositoryFactory = null;
  }

  async initialize() {
    if (!this.repositoryFactory) {
      this.repositoryFactory = RepositoryFactory.getInstance();
      await this.repositoryFactory.initialize();
    }
  }

  // 导出单个Prompt（包含完整版本历史）
  async exportPrompt(promptId, filePath) {
    await this.initialize();
    
    try {
      const promptRepository = this.repositoryFactory.getPromptRepository();
      const versionRepository = this.repositoryFactory.getVersionRepository();
      
      // 获取Prompt基本信息
      const prompt = await promptRepository.findById(promptId);
      if (!prompt) {
        throw new Error('Prompt不存在');
      }

      // 获取所有版本历史
      const versions = await versionRepository.getVersionHistory(promptId);

      // 构建导出数据
      const exportData = {
        export_info: {
          type: 'single_prompt',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          exported_by: 'Prompt版本管理器'
        },
        prompt: {
          ...prompt,
          tags: safeParseJSON(prompt.tags, [])
        },
        versions: versions,
        statistics: {
          total_versions: versions.length,
          first_created: versions[versions.length - 1]?.createdAt,
          last_updated: versions[0]?.createdAt
        }
      };

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      return {
        success: true,
        message: 'Prompt导出成功',
        file_path: filePath,
        data_size: JSON.stringify(exportData).length
      };
    } catch (error) {
      console.error('Failed to export prompt:', error);
      throw new Error(`导出Prompt失败: ${error.message}`);
    }
  }

  // 导出所有Prompt和模板
  async exportAll(filePath) {
    await this.initialize();
    
    try {
      const promptRepository = this.repositoryFactory.getPromptRepository();
      const versionRepository = this.repositoryFactory.getVersionRepository();
      const templateRepository = this.repositoryFactory.getTemplateRepository();
      
      // 获取所有数据
      const prompts = await promptRepository.findAll();
      const templates = await templateRepository.findAll();
      
      // 获取所有版本历史
      const allVersions = {};
      for (const prompt of prompts) {
        const versions = await versionRepository.getVersionHistory(prompt.id);
        allVersions[prompt.id] = versions;
      }

      // 构建导出数据
      const exportData = {
        export_info: {
          type: 'full_backup',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          exported_by: 'Prompt版本管理器'
        },
        prompts: prompts.map(prompt => ({
          ...prompt,
          tags: safeParseJSON(prompt.tags, [])
        })),
        versions: allVersions,
        templates: templates.map(template => ({
          ...template,
          tags: safeParseJSON(template.tags, [])
        })),
        statistics: {
          total_prompts: prompts.length,
          total_templates: templates.length,
          total_versions: Object.values(allVersions).reduce((sum, versions) => sum + versions.length, 0)
        }
      };

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      return {
        success: true,
        message: '完整数据导出成功',
        file_path: filePath,
        data_size: JSON.stringify(exportData).length,
        statistics: exportData.statistics
      };
    } catch (error) {
      console.error('Failed to export all data:', error);
      throw new Error(`导出所有数据失败: ${error.message}`);
    }
  }

  // 导出模板库
  async exportTemplates(filePath) {
    await this.initialize();
    
    try {
      const templateRepository = this.repositoryFactory.getTemplateRepository();
      const templates = await templateRepository.findAll();

      // 构建导出数据
      const exportData = {
        export_info: {
          type: 'templates',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          exported_by: 'Prompt版本管理器'
        },
        templates: templates.map(template => ({
          ...template,
          tags: safeParseJSON(template.tags, [])
        })),
        statistics: {
          total_templates: templates.length,
          total_usage: templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)
        }
      };

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      
      return {
        success: true,
        message: '模板库导出成功',
        file_path: filePath,
        data_size: JSON.stringify(exportData).length,
        statistics: exportData.statistics
      };
    } catch (error) {
      console.error('Failed to export templates:', error);
      throw new Error(`导出模板库失败: ${error.message}`);
    }
  }

  // 导入数据
  async importData(filePath, options = {}) {
    await this.initialize();
    
    try {
      // 读取文件
      const fileContent = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent);

      // 验证导入数据格式
      if (!importData.export_info || !importData.export_info.type) {
        throw new Error('无效的导入文件格式');
      }

      const results = {
        success: true,
        message: '数据导入成功',
        imported: {
          prompts: 0,
          templates: 0,
          versions: 0
        },
        conflicts: [],
        errors: []
      };

      // 根据导入类型处理数据
      switch (importData.export_info.type) {
        case 'single_prompt':
          await this.importSinglePrompt(importData, options, results);
          break;
        case 'full_backup':
          await this.importFullBackup(importData, options, results);
          break;
        case 'templates':
          await this.importTemplates(importData, options, results);
          break;
        default:
          throw new Error(`不支持的导入类型: ${importData.export_info.type}`);
      }

      return results;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error(`导入数据失败: ${error.message}`);
    }
  }

  // 导入单个Prompt
  async importSinglePrompt(importData, options, results) {
    const promptRepository = this.repositoryFactory.getPromptRepository();
    const versionRepository = this.repositoryFactory.getVersionRepository();
    
    try {
      const { prompt, versions } = importData;
      
      // 检查冲突
      const existingPrompt = await promptRepository.findById(prompt.id);
      if (existingPrompt && !options.overwrite) {
        results.conflicts.push({
          type: 'prompt',
          id: prompt.id,
          title: prompt.title,
          message: 'Prompt已存在'
        });
        return;
      }

      // 导入Prompt
      if (existingPrompt && options.overwrite) {
        await promptRepository.update(prompt.id, {
          ...prompt,
          tags: JSON.stringify(prompt.tags)
        });
      } else {
        await promptRepository.create({
          ...prompt,
          tags: JSON.stringify(prompt.tags)
        });
      }
      results.imported.prompts++;

      // 导入版本历史
      if (options.includeVersions !== false) {
        for (const version of versions) {
          try {
            const existingVersion = await versionRepository.findById(version.id);
            if (!existingVersion) {
              await versionRepository.create(version);
              results.imported.versions++;
            }
          } catch (error) {
            results.errors.push({
              type: 'version',
              id: version.id,
              message: error.message
            });
          }
        }
      }
    } catch (error) {
      results.errors.push({
        type: 'prompt',
        id: importData.prompt?.id,
        message: error.message
      });
    }
  }

  // 导入完整备份
  async importFullBackup(importData, options, results) {
    const { prompts, versions, templates } = importData;

    // 导入Prompt
    if (prompts) {
      for (const prompt of prompts) {
        try {
          await this.importSinglePrompt({
            prompt,
            versions: versions[prompt.id] || []
          }, options, results);
        } catch (error) {
          results.errors.push({
            type: 'prompt',
            id: prompt.id,
            message: error.message
          });
        }
      }
    }

    // 导入模板
    if (templates) {
      await this.importTemplates({ templates }, options, results);
    }
  }

  // 导入模板
  async importTemplates(importData, options, results) {
    const templateRepository = this.repositoryFactory.getTemplateRepository();
    
    for (const template of importData.templates) {
      try {
        const existingTemplate = await templateRepository.findById(template.id);
        if (existingTemplate && !options.overwrite) {
          results.conflicts.push({
            type: 'template',
            id: template.id,
            name: template.name,
            message: '模板已存在'
          });
          continue;
        }

        if (existingTemplate && options.overwrite) {
          await templateRepository.update(template.id, {
            ...template,
            tags: JSON.stringify(template.tags)
          });
        } else {
          await templateRepository.create({
            ...template,
            tags: JSON.stringify(template.tags)
          });
        }
        results.imported.templates++;
      } catch (error) {
        results.errors.push({
          type: 'template',
          id: template.id,
          message: error.message
        });
      }
    }
  }

  // 验证导入文件
  async validateImportFile(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      const validation = {
        valid: true,
        errors: [],
        warnings: [],
        info: null
      };

      // 检查基本结构
      if (!data.export_info) {
        validation.valid = false;
        validation.errors.push('缺少导出信息');
      } else {
        validation.info = data.export_info;
      }

      // 根据类型验证
      if (data.export_info?.type === 'single_prompt') {
        if (!data.prompt) {
          validation.valid = false;
          validation.errors.push('缺少Prompt数据');
        }
        if (!data.versions || !Array.isArray(data.versions)) {
          validation.warnings.push('缺少版本历史数据');
        }
      } else if (data.export_info?.type === 'full_backup') {
        if (!data.prompts || !Array.isArray(data.prompts)) {
          validation.warnings.push('缺少Prompt数据');
        }
        if (!data.templates || !Array.isArray(data.templates)) {
          validation.warnings.push('缺少模板数据');
        }
      } else if (data.export_info?.type === 'templates') {
        if (!data.templates || !Array.isArray(data.templates)) {
          validation.valid = false;
          validation.errors.push('缺少模板数据');
        }
      }

      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [`文件读取或解析失败: ${error.message}`],
        warnings: [],
        info: null
      };
    }
  }

  // 获取导出格式信息
  getExportFormats() {
    return [
      {
        id: 'single_prompt',
        name: '单个Prompt',
        description: '导出单个Prompt及其完整版本历史',
        extension: '.json'
      },
      {
        id: 'full_backup',
        name: '完整备份',
        description: '导出所有Prompt、模板和版本历史',
        extension: '.json'
      },
      {
        id: 'templates',
        name: '模板库',
        description: '导出所有模板',
        extension: '.json'
      }
    ];
  }
}

module.exports = ExportManager;