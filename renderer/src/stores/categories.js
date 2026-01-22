import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref({})
  const customCategories = ref({})
  const expandedState = ref({})
  
  const initializeCategories = () => {
    // 从localStorage恢复展开状态
    const savedExpandedState = JSON.parse(localStorage.getItem('categoryExpandedState') || '{}')
    expandedState.value = savedExpandedState
    
    categories.value = {
      // 按使用场景分类
      scene: {
        name: '使用场景',
        icon: '🎯',
        expanded: savedExpandedState.scene !== false,
        items: {
          'work': { name: '工作相关', icon: '💼', color: '#3b82f6' },
          'study': { name: '学习笔记', icon: '📚', color: '#10b981' },
          'life': { name: '生活记录', icon: '🏠', color: '#f59e0b' },
          'creative': { name: '创意想法', icon: '🎨', color: '#8b5cf6' },
          'project': { name: '项目规划', icon: '📋', color: '#ef4444' },
          'communication': { name: '沟通交流', icon: '💬', color: '#06b6d4' }
        }
      },
      // 按内容类型分类
      type: {
        name: '内容类型',
        icon: '📝',
        expanded: savedExpandedState.type !== false,
        items: {
          'question': { name: '问题提问', icon: '❓', color: '#10b981' },
          'instruction': { name: '操作指南', icon: '📖', color: '#3b82f6' },
          'brainstorm': { name: '头脑风暴', icon: '💡', color: '#f59e0b' },
          'analysis': { name: '分析总结', icon: '📊', color: '#8b5cf6' },
          'writing': { name: '文字创作', icon: '✍️', color: '#ec4899' },
          'planning': { name: '计划安排', icon: '📅', color: '#06b6d4' }
        }
      },
      // 按重要程度分类
      priority: {
        name: '重要程度',
        icon: '⭐',
        expanded: savedExpandedState.priority === true,
        items: {
          'high': { name: '很重要', icon: '🔥', color: '#ef4444' },
          'medium': { name: '一般重要', icon: '⚡', color: '#f59e0b' },
          'low': { name: '不太重要', icon: '💫', color: '#10b981' }
        }
      },
      // 按使用频率分类
      frequency: {
        name: '使用频率',
        icon: '🔄',
        expanded: savedExpandedState.frequency === true,
        items: {
          'daily': { name: '每天都用', icon: '🌟', color: '#ef4444' },
          'weekly': { name: '经常使用', icon: '📅', color: '#f59e0b' },
          'monthly': { name: '偶尔使用', icon: '📝', color: '#10b981' },
          'archive': { name: '存档备用', icon: '📦', color: '#6b7280' }
        }
      }
    }
  }
  
  const loadCustomCategories = async () => {
    try {
      customCategories.value = await window.api.getAllCustomCategories()
    } catch (error) {
      console.error('加载自定义分类失败:', error)
      customCategories.value = {}
    }
  }
  
  const allCategories = computed(() => {
    return { ...categories.value, ...customCategories.value }
  })
  
  const toggleCategoryGroup = (categoryType) => {
    const category = allCategories.value[categoryType]
    if (category) {
      category.expanded = !category.expanded
      expandedState.value[categoryType] = category.expanded
      
      // 保存状态到localStorage
      localStorage.setItem('categoryExpandedState', JSON.stringify(expandedState.value))
    }
  }
  
  const getCategoryItemsCount = (categoryType, categoryKey, items) => {
    return items.filter(item => 
      item.categories && item.categories[categoryType] === categoryKey
    ).length
  }
  
  return {
    categories,
    customCategories,
    expandedState,
    allCategories,
    initializeCategories,
    loadCustomCategories,
    toggleCategoryGroup,
    getCategoryItemsCount
  }
})