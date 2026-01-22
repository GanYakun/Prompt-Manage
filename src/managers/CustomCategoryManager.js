const CustomCategoryRepository = require('../repositories/CustomCategoryRepository');

class CustomCategoryManager {
    constructor(db) {
        this.repository = new CustomCategoryRepository(db);
    }

    // 安全解析JSON
    safeParseJSON(jsonString, defaultValue = null) {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON解析失败:', error);
            return defaultValue;
        }
    }

    // 获取所有自定义分类，按分组组织
    async getAllCustomCategories() {
        try {
            const categories = await this.repository.getAllCustomCategories();
            
            // 按分组组织数据
            const groupedCategories = {};
            
            categories.forEach(category => {
                const groupType = category.group_type;
                
                if (!groupedCategories[groupType]) {
                    groupedCategories[groupType] = {
                        name: category.group_name,
                        icon: category.group_icon,
                        expanded: true, // 默认展开自定义分类
                        items: {}
                    };
                }
                
                groupedCategories[groupType].items[category.category_key] = {
                    name: category.category_name,
                    icon: category.category_icon,
                    color: category.category_color
                };
            });
            
            return groupedCategories;
        } catch (error) {
            console.error('获取自定义分类失败:', error);
            throw error;
        }
    }

    // 创建新的自定义分类组
    async createCustomCategoryGroup(groupData) {
        try {
            const { groupType, groupName, groupIcon, categories } = groupData;
            
            // 验证输入
            if (!groupType || !groupName || !groupIcon || !categories || categories.length === 0) {
                throw new Error('分类组信息不完整');
            }

            // 检查分组类型是否已存在
            const existingCategories = await this.repository.getCustomCategoriesByGroup(groupType);
            if (existingCategories.length > 0) {
                throw new Error('分类组类型已存在');
            }

            // 验证分类项
            for (const category of categories) {
                if (!category.key || !category.name || !category.icon) {
                    throw new Error('分类项信息不完整');
                }
            }

            const result = await this.repository.createCustomCategoryGroup(groupData);
            return result;
        } catch (error) {
            console.error('创建自定义分类组失败:', error);
            throw error;
        }
    }

    // 添加分类项到现有分组
    async addCategoryToGroup(groupType, categoryData) {
        try {
            const { key, name, icon, color } = categoryData;
            
            // 验证输入
            if (!groupType || !key || !name || !icon) {
                throw new Error('分类信息不完整');
            }

            // 检查分类键是否已存在
            const exists = await this.repository.isCategoryKeyExists(groupType, key);
            if (exists) {
                throw new Error('分类键已存在');
            }

            const result = await this.repository.addCategoryToGroup(groupType, categoryData);
            return result;
        } catch (error) {
            console.error('添加分类项失败:', error);
            throw error;
        }
    }

    // 更新自定义分类
    async updateCustomCategory(id, updates) {
        try {
            if (!id) {
                throw new Error('分类ID不能为空');
            }

            const result = await this.repository.updateCustomCategory(id, updates);
            return result;
        } catch (error) {
            console.error('更新自定义分类失败:', error);
            throw error;
        }
    }

    // 删除自定义分类
    async deleteCustomCategory(id) {
        try {
            if (!id) {
                throw new Error('分类ID不能为空');
            }

            const result = await this.repository.deleteCustomCategory(id);
            return result;
        } catch (error) {
            console.error('删除自定义分类失败:', error);
            throw error;
        }
    }

    // 删除整个自定义分类组
    async deleteCustomCategoryGroup(groupType) {
        try {
            if (!groupType) {
                throw new Error('分组类型不能为空');
            }

            const result = await this.repository.deleteCustomCategoryGroup(groupType);
            return result;
        } catch (error) {
            console.error('删除自定义分类组失败:', error);
            throw error;
        }
    }

    // 获取分组统计信息
    async getGroupStatistics() {
        try {
            const stats = await this.repository.getGroupStatistics();
            return stats;
        } catch (error) {
            console.error('获取分组统计失败:', error);
            throw error;
        }
    }

    // 验证分类组数据
    validateCategoryGroupData(groupData) {
        const { groupType, groupName, groupIcon, categories } = groupData;
        const errors = [];

        if (!groupType || typeof groupType !== 'string' || groupType.trim().length === 0) {
            errors.push('分组类型不能为空');
        }

        if (!groupName || typeof groupName !== 'string' || groupName.trim().length === 0) {
            errors.push('分组名称不能为空');
        }

        if (!groupIcon || typeof groupIcon !== 'string' || groupIcon.trim().length === 0) {
            errors.push('分组图标不能为空');
        }

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            errors.push('至少需要一个分类项');
        } else {
            categories.forEach((category, index) => {
                if (!category.key || typeof category.key !== 'string') {
                    errors.push(`第${index + 1}个分类项的键不能为空`);
                }
                if (!category.name || typeof category.name !== 'string') {
                    errors.push(`第${index + 1}个分类项的名称不能为空`);
                }
                if (!category.icon || typeof category.icon !== 'string') {
                    errors.push(`第${index + 1}个分类项的图标不能为空`);
                }
            });
        }

        return errors;
    }

    // 生成唯一的分组类型
    generateUniqueGroupType(baseName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `custom_${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}_${random}`;
    }

    // 预设的图标选项
    getIconOptions() {
        return {
            business: ['🏢', '💼', '📊', '💰', '🏦', '🏭', '🏪', '🏬'],
            technology: ['💻', '📱', '⚙️', '🔧', '🖥️', '⌨️', '🖱️', '💾'],
            education: ['📚', '🎓', '✏️', '📝', '🔬', '🧪', '📐', '🎒'],
            creative: ['🎨', '🖌️', '🎭', '🎪', '🎬', '📷', '🎵', '🎸'],
            health: ['🏥', '💊', '🩺', '❤️', '🧬', '🦷', '👁️', '🧠'],
            food: ['🍕', '🍔', '🍜', '🍰', '☕', '🍷', '🥗', '🍎'],
            travel: ['✈️', '🚗', '🏖️', '🗺️', '🧳', '🏔️', '🏝️', '🚢'],
            sports: ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐', '🏓', '🏸'],
            nature: ['🌳', '🌸', '🌊', '⛰️', '🌙', '☀️', '🌈', '🦋'],
            symbols: ['⭐', '💎', '🔥', '💡', '🎯', '🚀', '⚡', '🌟']
        };
    }

    // 预设的颜色选项
    getColorOptions() {
        return [
            '#3b82f6', // 蓝色
            '#10b981', // 绿色
            '#f59e0b', // 黄色
            '#ef4444', // 红色
            '#8b5cf6', // 紫色
            '#ec4899', // 粉色
            '#06b6d4', // 青色
            '#84cc16', // 青绿色
            '#f97316', // 橙色
            '#6b7280', // 灰色
            '#14b8a6', // 蓝绿色
            '#a855f7'  // 深紫色
        ];
    }
}

module.exports = CustomCategoryManager;