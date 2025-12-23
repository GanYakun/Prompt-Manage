const RepositoryFactory = require('../repositories/RepositoryFactory');

class SearchEngine {
  constructor() {
    this.repositoryFactory = null;
    this.searchIndexRepository = null;
  }

  async initialize() {
    if (!this.repositoryFactory) {
      this.repositoryFactory = RepositoryFactory.getInstance();
      await this.repositoryFactory.initialize();
      
      this.searchIndexRepository = this.repositoryFactory.getSearchIndexRepository();
    }
  }

  // 执行搜索
  async search(query, options = {}) {
    await this.initialize();
    
    try {
      const searchOptions = {
        entityTypes: options.entityTypes || ['prompt', 'template'],
        includeHistory: options.includeHistory !== false,
        limit: options.limit || 50,
        offset: options.offset || 0
      };

      const results = await this.searchIndexRepository.search(query, searchOptions);
      
      // 增强搜索结果
      const enhancedResults = await this.enhanceSearchResults(results);
      
      return {
        query: query,
        total: enhancedResults.length,
        results: enhancedResults.slice(searchOptions.offset, searchOptions.offset + searchOptions.limit),
        options: searchOptions
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  // 增强搜索结果
  async enhanceSearchResults(results) {
    const enhancedResults = [];
    
    for (const result of results) {
      try {
        let entityData = null;
        
        if (result.entityType === 'prompt') {
          const promptRepository = this.repositoryFactory.getPromptRepository();
          entityData = await promptRepository.findById(result.entityId);
          if (entityData) {
            entityData.tags = JSON.parse(entityData.tags || '[]');
          }
        } else if (result.entityType === 'template') {
          const templateRepository = this.repositoryFactory.getTemplateRepository();
          entityData = await templateRepository.findById(result.entityId);
          if (entityData) {
            entityData.tags = JSON.parse(entityData.tags || '[]');
          }
        } else if (result.entityType === 'version') {
          const versionRepository = this.repositoryFactory.getVersionRepository();
          entityData = await versionRepository.findById(result.entityId);
        }

        if (entityData) {
          enhancedResults.push({
            ...result,
            entity: entityData,
            searchScore: this.calculateSearchScore(result, entityData)
          });
        }
      } catch (error) {
        console.error('Failed to enhance search result:', error);
        // 继续处理其他结果
      }
    }

    // 按搜索分数排序
    return enhancedResults.sort((a, b) => b.searchScore - a.searchScore);
  }

  // 计算搜索分数
  calculateSearchScore(result, entity) {
    let score = result.relevanceScore || 0;
    
    // 根据实体类型调整分数
    if (result.entityType === 'prompt') {
      score += 10; // Prompt优先级最高
    } else if (result.entityType === 'template') {
      score += 8; // 模板次之
      // 使用频率高的模板加分
      if (entity.usage_count > 0) {
        score += Math.min(entity.usage_count * 0.5, 5);
      }
    } else if (result.entityType === 'version') {
      score += 5; // 版本历史分数较低
    }

    // 根据匹配类型调整分数
    switch (result.matchType) {
      case 'title':
        score += 15;
        break;
      case 'tag':
        score += 10;
        break;
      case 'content':
        score += 5;
        break;
      case 'history':
        score += 2;
        break;
    }

    // 新创建的内容加分
    if (entity.created_at) {
      const daysSinceCreation = (Date.now() - new Date(entity.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        score += 3; // 一周内创建的内容加分
      } else if (daysSinceCreation < 30) {
        score += 1; // 一个月内创建的内容小幅加分
      }
    }

    return score;
  }

  // 搜索建议
  async getSearchSuggestions(partialQuery, limit = 10) {
    await this.initialize();
    
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }

      // 获取所有索引数据
      const allIndexes = await this.searchIndexRepository.findAll();
      const suggestions = new Set();

      // 从标题中提取建议
      allIndexes.forEach(index => {
        if (index.title) {
          const words = index.title.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.includes(partialQuery.toLowerCase()) && word.length > 2) {
              suggestions.add(word);
            }
          });
        }

        // 从标签中提取建议
        if (index.tags) {
          try {
            const tags = JSON.parse(index.tags);
            tags.forEach(tag => {
              if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
                suggestions.add(tag);
              }
            });
          } catch (e) {
            // 忽略JSON解析错误
          }
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  // 获取热门搜索词
  async getPopularSearchTerms(limit = 10) {
    await this.initialize();
    
    try {
      const allIndexes = await this.searchIndexRepository.findAll();
      const termFrequency = {};

      // 统计词频
      allIndexes.forEach(index => {
        // 从标题中提取词汇
        if (index.title) {
          const words = index.title.toLowerCase().match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
          words.forEach(word => {
            if (word.length > 1) {
              termFrequency[word] = (termFrequency[word] || 0) + 3; // 标题权重更高
            }
          });
        }

        // 从标签中提取词汇
        if (index.tags) {
          try {
            const tags = JSON.parse(index.tags);
            tags.forEach(tag => {
              if (tag.length > 1) {
                termFrequency[tag.toLowerCase()] = (termFrequency[tag.toLowerCase()] || 0) + 2;
              }
            });
          } catch (e) {
            // 忽略JSON解析错误
          }
        }

        // 从内容中提取关键词（简单实现）
        if (index.content) {
          const words = index.content.toLowerCase().match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{3,}/g) || [];
          words.slice(0, 20).forEach(word => { // 只取前20个词避免过度处理
            if (word.length > 2) {
              termFrequency[word] = (termFrequency[word] || 0) + 1;
            }
          });
        }
      });

      // 排序并返回热门词汇
      return Object.entries(termFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([term, frequency]) => ({ term, frequency }));
    } catch (error) {
      console.error('Failed to get popular search terms:', error);
      return [];
    }
  }

  // 重建搜索索引
  async rebuildSearchIndex() {
    await this.initialize();
    
    try {
      const result = await this.searchIndexRepository.rebuildIndex();
      return {
        success: true,
        message: '搜索索引重建完成',
        stats: result
      };
    } catch (error) {
      console.error('Failed to rebuild search index:', error);
      throw new Error(`重建搜索索引失败: ${error.message}`);
    }
  }

  // 获取搜索统计信息
  async getSearchStats() {
    await this.initialize();
    
    try {
      const stats = await this.searchIndexRepository.getIndexStats();
      return {
        ...stats,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get search stats:', error);
      // Return default stats if there's an error
      return {
        total: 0,
        prompts: 0,
        versions: 0,
        templates: 0,
        last_updated: new Date().toISOString()
      };
    }
  }

  // 高级搜索
  async advancedSearch(criteria) {
    await this.initialize();
    
    try {
      const {
        query = '',
        entityTypes = ['prompt', 'template'],
        tags = [],
        dateRange = null,
        sortBy = 'relevance', // relevance, date, title
        sortOrder = 'desc'
      } = criteria;

      let results = [];

      if (query) {
        const searchResult = await this.search(query, { entityTypes });
        results = searchResult.results;
      } else {
        // 如果没有查询词，获取所有相关实体
        results = await this.getAllEntitiesByType(entityTypes);
      }

      // 按标签过滤
      if (tags.length > 0) {
        results = results.filter(result => {
          if (result.entity && result.entity.tags) {
            const entityTags = Array.isArray(result.entity.tags) ? 
              result.entity.tags : JSON.parse(result.entity.tags || '[]');
            return tags.some(tag => entityTags.includes(tag));
          }
          return false;
        });
      }

      // 按日期范围过滤
      if (dateRange && dateRange.start && dateRange.end) {
        results = results.filter(result => {
          if (result.entity && result.entity.created_at) {
            const createdDate = new Date(result.entity.created_at);
            return createdDate >= new Date(dateRange.start) && createdDate <= new Date(dateRange.end);
          }
          return false;
        });
      }

      // 排序
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            const dateA = new Date(a.entity?.created_at || 0);
            const dateB = new Date(b.entity?.created_at || 0);
            comparison = dateA - dateB;
            break;
          case 'title':
            const titleA = a.entity?.title || a.entity?.name || '';
            const titleB = b.entity?.title || b.entity?.name || '';
            comparison = titleA.localeCompare(titleB);
            break;
          case 'relevance':
          default:
            comparison = (a.searchScore || 0) - (b.searchScore || 0);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      return {
        query: criteria,
        total: results.length,
        results: results
      };
    } catch (error) {
      console.error('Advanced search failed:', error);
      throw new Error(`高级搜索失败: ${error.message}`);
    }
  }

  // 获取指定类型的所有实体
  async getAllEntitiesByType(entityTypes) {
    const results = [];
    
    for (const entityType of entityTypes) {
      try {
        let entities = [];
        
        if (entityType === 'prompt') {
          const promptRepository = this.repositoryFactory.getPromptRepository();
          entities = await promptRepository.findAll();
        } else if (entityType === 'template') {
          const templateRepository = this.repositoryFactory.getTemplateRepository();
          entities = await templateRepository.findAll();
        }

        entities.forEach(entity => {
          results.push({
            entityId: entity.id,
            entityType: entityType,
            title: entity.title || entity.name,
            matchedContent: entity.content?.substring(0, 200) + '...',
            relevanceScore: 1,
            matchType: 'all',
            entity: {
              ...entity,
              tags: JSON.parse(entity.tags || '[]')
            },
            searchScore: 1
          });
        });
      } catch (error) {
        console.error(`Failed to get entities of type ${entityType}:`, error);
      }
    }

    return results;
  }
}

module.exports = SearchEngine;