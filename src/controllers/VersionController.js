const RepositoryFactory = require('../repositories/RepositoryFactory');

class VersionController {
  constructor() {
    this.repositoryFactory = null;
    this.versionRepository = null;
    this.promptRepository = null;
  }

  async initialize() {
    if (!this.repositoryFactory) {
      this.repositoryFactory = RepositoryFactory.getInstance();
      await this.repositoryFactory.initialize();
      
      this.versionRepository = this.repositoryFactory.getVersionRepository();
      this.promptRepository = this.repositoryFactory.getPromptRepository();
    }
  }

  // 获取Prompt的完整版本历史
  async getVersionHistory(promptId) {
    await this.initialize();
    
    try {
      const versions = await this.versionRepository.getVersionHistory(promptId);
      return versions.sort((a, b) => b.versionNumber - a.versionNumber);
    } catch (error) {
      console.error('Failed to get version history:', error);
      throw new Error(`获取版本历史失败: ${error.message}`);
    }
  }

  // 比较两个版本
  async compareVersions(versionId1, versionId2) {
    await this.initialize();
    
    try {
      const comparison = await this.versionRepository.compareVersions(versionId1, versionId2);
      return comparison;
    } catch (error) {
      console.error('Failed to compare versions:', error);
      throw new Error(`版本对比失败: ${error.message}`);
    }
  }

  // 回滚到指定版本
  async rollbackToVersion(promptId, targetVersionId, note = null) {
    await this.initialize();
    
    try {
      // 获取目标版本
      const targetVersion = await this.versionRepository.findById(targetVersionId);
      if (!targetVersion) {
        throw new Error('目标版本不存在');
      }

      // 获取当前Prompt
      const prompt = await this.promptRepository.findById(promptId);
      if (!prompt) {
        throw new Error('Prompt不存在');
      }

      // 创建新版本（回滚版本）
      const newVersionNumber = prompt.version_count + 1;
      const rollbackNote = note || `回滚到版本 ${targetVersion.versionNumber}`;
      
      const newVersion = {
        prompt_id: promptId,
        content: targetVersion.content,
        note: rollbackNote,
        version_number: newVersionNumber,
        is_rollback: true,
        source_version_id: targetVersionId
      };

      const createdVersion = await this.versionRepository.create(newVersion);

      // 更新Prompt
      const updatedPrompt = {
        ...prompt,
        content: targetVersion.content,
        updated_at: new Date().toISOString(),
        current_version_id: createdVersion.id,
        version_count: newVersionNumber
      };

      await this.promptRepository.update(promptId, updatedPrompt);

      return {
        success: true,
        newVersion: createdVersion,
        prompt: updatedPrompt
      };
    } catch (error) {
      console.error('Failed to rollback version:', error);
      throw new Error(`版本回滚失败: ${error.message}`);
    }
  }

  // 获取版本统计信息
  async getVersionStats(promptId) {
    await this.initialize();
    
    try {
      const stats = await this.versionRepository.getVersionStats(promptId);
      return stats;
    } catch (error) {
      console.error('Failed to get version stats:', error);
      throw new Error(`获取版本统计失败: ${error.message}`);
    }
  }

  // 获取回滚版本列表
  async getRollbackVersions(promptId) {
    await this.initialize();
    
    try {
      const rollbackVersions = await this.versionRepository.getRollbackVersions(promptId);
      return rollbackVersions;
    } catch (error) {
      console.error('Failed to get rollback versions:', error);
      throw new Error(`获取回滚版本失败: ${error.message}`);
    }
  }
}

module.exports = VersionController;
