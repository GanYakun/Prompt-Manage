const BaseRepository = require('./BaseRepository');
const crypto = require('crypto');

// 生成UUID的简单实现
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class CustomCategoryRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.tableName = 'custom_categories';
    }

    // 获取所有自定义分类
    async getAllCustomCategories() {
        try {
            const categories = await this.db.all(`
                SELECT * FROM ${this.tableName} 
                WHERE is_active = 1 
                ORDER BY group_type, sort_order, created_at
            `);
            
            return categories;
        } catch (error) {
            console.error('获取自定义分类失败:', error);
            throw error;
        }
    }

    // 按分组类型获取自定义分类
    async getCustomCategoriesByGroup(groupType) {
        try {
            const categories = await this.db.all(`
                SELECT * FROM ${this.tableName} 
                WHERE group_type = ? AND is_active = 1 
                ORDER BY sort_order, created_at
            `, [groupType]);
            
            return categories;
        } catch (error) {
            console.error('按分组获取自定义分类失败:', error);
            throw error;
        }
    }

    // 创建新的自定义分类组
    async createCustomCategoryGroup(groupData) {
        try {
            const { groupType, groupName, groupIcon, categories } = groupData;
            const results = [];

            // 为每个分类项创建记录
            for (let i = 0; i < categories.length; i++) {
                const category = categories[i];
                const id = generateUUID();
                
                await this.db.run(`
                    INSERT INTO ${this.tableName} (
                        id, group_type, group_name, group_icon,
                        category_key, category_name, category_icon, category_color,
                        sort_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [
                    id, groupType, groupName, groupIcon,
                    category.key, category.name, category.icon, category.color || '#3b82f6',
                    i
                ]);

                results.push({
                    id,
                    group_type: groupType,
                    group_name: groupName,
                    group_icon: groupIcon,
                    category_key: category.key,
                    category_name: category.name,
                    category_icon: category.icon,
                    category_color: category.color || '#3b82f6',
                    sort_order: i
                });
            }

            return results;
        } catch (error) {
            console.error('创建自定义分类组失败:', error);
            throw error;
        }
    }

    // 添加单个分类项到现有分组
    async addCategoryToGroup(groupType, categoryData) {
        try {
            const { key, name, icon, color } = categoryData;
            const id = generateUUID();

            // 获取分组信息
            const groupInfo = await this.db.get(`
                SELECT group_name, group_icon FROM ${this.tableName} 
                WHERE group_type = ? LIMIT 1
            `, [groupType]);

            if (!groupInfo) {
                throw new Error('分组不存在');
            }

            // 获取下一个排序序号
            const maxSort = await this.db.get(`
                SELECT MAX(sort_order) as max_sort FROM ${this.tableName} 
                WHERE group_type = ?
            `, [groupType]);

            const sortOrder = (maxSort?.max_sort || 0) + 1;

            await this.db.run(`
                INSERT INTO ${this.tableName} (
                    id, group_type, group_name, group_icon,
                    category_key, category_name, category_icon, category_color,
                    sort_order, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [
                id, groupType, groupInfo.group_name, groupInfo.group_icon,
                key, name, icon, color || '#3b82f6',
                sortOrder
            ]);

            return {
                id,
                group_type: groupType,
                group_name: groupInfo.group_name,
                group_icon: groupInfo.group_icon,
                category_key: key,
                category_name: name,
                category_icon: icon,
                category_color: color || '#3b82f6',
                sort_order: sortOrder
            };
        } catch (error) {
            console.error('添加分类项失败:', error);
            throw error;
        }
    }

    // 更新自定义分类
    async updateCustomCategory(id, updates) {
        try {
            const { name, icon, color } = updates;
            
            await this.db.run(`
                UPDATE ${this.tableName} 
                SET category_name = ?, category_icon = ?, category_color = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [name, icon, color, id]);

            return await this.getById(id);
        } catch (error) {
            console.error('更新自定义分类失败:', error);
            throw error;
        }
    }

    // 删除自定义分类（软删除）
    async deleteCustomCategory(id) {
        try {
            await this.db.run(`
                UPDATE ${this.tableName} 
                SET is_active = 0, updated_at = datetime('now')
                WHERE id = ?
            `, [id]);

            return true;
        } catch (error) {
            console.error('删除自定义分类失败:', error);
            throw error;
        }
    }

    // 删除整个自定义分类组
    async deleteCustomCategoryGroup(groupType) {
        try {
            await this.db.run(`
                UPDATE ${this.tableName} 
                SET is_active = 0, updated_at = datetime('now')
                WHERE group_type = ?
            `, [groupType]);

            return true;
        } catch (error) {
            console.error('删除自定义分类组失败:', error);
            throw error;
        }
    }

    // 更新分类排序
    async updateCategorySortOrder(categoryId, newSortOrder) {
        try {
            await this.db.run(`
                UPDATE ${this.tableName} 
                SET sort_order = ?, updated_at = datetime('now')
                WHERE id = ?
            `, [newSortOrder, categoryId]);

            return true;
        } catch (error) {
            console.error('更新分类排序失败:', error);
            throw error;
        }
    }

    // 检查分类键是否已存在
    async isCategoryKeyExists(groupType, categoryKey) {
        try {
            const result = await this.db.get(`
                SELECT id FROM ${this.tableName} 
                WHERE group_type = ? AND category_key = ? AND is_active = 1
            `, [groupType, categoryKey]);

            return !!result;
        } catch (error) {
            console.error('检查分类键失败:', error);
            throw error;
        }
    }

    // 获取分组的统计信息
    async getGroupStatistics() {
        try {
            const stats = await this.db.all(`
                SELECT 
                    group_type,
                    group_name,
                    group_icon,
                    COUNT(*) as category_count,
                    MIN(created_at) as created_at
                FROM ${this.tableName} 
                WHERE is_active = 1 
                GROUP BY group_type, group_name, group_icon
                ORDER BY created_at
            `);

            return stats;
        } catch (error) {
            console.error('获取分组统计失败:', error);
            throw error;
        }
    }
}

module.exports = CustomCategoryRepository;