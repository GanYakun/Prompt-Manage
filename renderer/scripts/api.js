// API接口封装

class API {
    constructor() {
        this.electronAPI = window.electronAPI;
    }

    // 检查Electron API是否可用
    isElectronAvailable() {
        return !!this.electronAPI;
    }

    // Prompt相关API
    async createPrompt(title, content, tags = [], note = '初始版本') {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.createPrompt(title, content, tags, note);
    }

    async updatePrompt(promptId, updates, note = null) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.updatePrompt(promptId, updates, note);
    }

    async getPrompt(promptId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getPrompt(promptId);
    }

    async getAllPrompts(limit = 50, offset = 0) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getAllPrompts(limit, offset);
    }

    async deletePrompt(promptId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.deletePrompt(promptId);
    }

    async getPromptsByTag(tag) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getPromptsByTag(tag);
    }

    // 版本控制API
    async getVersionHistory(promptId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getVersionHistory(promptId);
    }

    async compareVersions(versionId1, versionId2) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.compareVersions(versionId1, versionId2);
    }

    async rollbackToVersion(promptId, targetVersionId, note = null) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.rollbackToVersion(promptId, targetVersionId, note);
    }

    // 模板相关API
    async createTemplate(name, content, description = '', tags = []) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.createTemplate(name, content, description, tags);
    }

    async createTemplateFromPrompt(promptId, name, description = '', additionalTags = []) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.createTemplateFromPrompt(promptId, name, description, additionalTags);
    }

    async updateTemplate(templateId, updates) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.updateTemplate(templateId, updates);
    }

    async getTemplate(templateId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getTemplate(templateId);
    }

    async getAllTemplates(limit = 50, offset = 0) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getAllTemplates(limit, offset);
    }

    async deleteTemplate(templateId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.deleteTemplate(templateId);
    }

    async createPromptFromTemplate(templateId, customizations = {}) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.createPromptFromTemplate(templateId, customizations);
    }

    // 搜索API
    async search(query, options = {}) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.search(query, options);
    }

    async advancedSearch(criteria) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.advancedSearch(criteria);
    }

    async getSearchSuggestions(partialQuery, limit = 10) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getSearchSuggestions(partialQuery, limit);
    }

    async getPopularSearchTerms(limit = 10) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getPopularSearchTerms(limit);
    }

    async rebuildSearchIndex() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.rebuildSearchIndex();
    }

    // 导出导入API
    async exportPrompt(promptId) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.exportPrompt(promptId);
    }

    async exportAll() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.exportAll();
    }

    async exportTemplates() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.exportTemplates();
    }

    async importData(options = {}) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.importData(options);
    }

    async validateImportFile(filePath) {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.validateImportFile(filePath);
    }

    // 统计信息API
    async getAppStats() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getAppStats();
    }

    async getAllTags() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getAllTags();
    }

    async performMaintenance() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.performMaintenance();
    }

    getExportFormats() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return this.electronAPI.getExportFormats();
    }

    // 应用信息API
    async getAppVersion() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getAppVersion();
    }

    async getDataPath() {
        if (!this.electronAPI) throw new Error('Electron API不可用');
        return await this.electronAPI.getDataPath();
    }
}

// 错误处理装饰器
function withErrorHandling(apiMethod) {
    return async function(...args) {
        try {
            return await apiMethod.apply(this, args);
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 显示用户友好的错误消息
            const errorMessage = this.getErrorMessage(error);
            window.app?.showNotification(errorMessage, 'error');
            
            throw error;
        }
    };
}

// 为API类的所有方法添加错误处理
function addErrorHandling(apiInstance) {
    const prototype = Object.getPrototypeOf(apiInstance);
    const methodNames = Object.getOwnPropertyNames(prototype)
        .filter(name => name !== 'constructor' && typeof apiInstance[name] === 'function');
    
    methodNames.forEach(methodName => {
        const originalMethod = apiInstance[methodName];
        apiInstance[methodName] = withErrorHandling(originalMethod);
    });
    
    // 添加错误消息处理方法
    apiInstance.getErrorMessage = function(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        return '操作失败，请重试';
    };
    
    return apiInstance;
}

// 创建API实例
const api = addErrorHandling(new API());

// 导出API实例
window.api = api;