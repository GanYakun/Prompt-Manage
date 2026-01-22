import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCategoriesStore } from './categories'

export const useAppStore = defineStore('app', () => {
  // 状态
  const currentView = ref('welcome')
  const currentTab = ref('prompts')
  const selectedPrompt = ref(null)
  const selectedTemplate = ref(null)
  const prompts = ref([])
  const templates = ref([])
  const searchResults = ref(null)
  const currentVersions = ref(null)
  
  // 批量操作
  const bulkSelectionMode = ref(false)
  const selectedItems = ref(new Set())
  
  // 视图和排序
  const currentViewMode = ref('list')
  const currentSortBy = ref('updated_at')
  const currentSortOrder = ref('desc')
  
  // 分类筛选
  const currentCategoryFilter = ref('all')
  
  // 搜索状态
  const searchQuery = ref('')
  const isSearching = ref(false)
  
  // 计算属性
  const promptCount = computed(() => prompts.value.length)
  const templateCount = computed(() => templates.value.length)
  const selectedItemsCount = computed(() => selectedItems.value.size)
  
  const filteredPrompts = computed(() => {
    let filtered = searchResults.value?.prompts || prompts.value
    
    // 应用分类筛选
    if (currentCategoryFilter.value !== 'all') {
      filtered = filterItemsByCategory(filtered, currentCategoryFilter.value)
    }
    
    // 应用排序
    return sortItems(filtered)
  })
  
  const filteredTemplates = computed(() => {
    let filtered = searchResults.value?.templates || templates.value
    
    // 应用分类筛选
    if (currentCategoryFilter.value !== 'all') {
      filtered = filterItemsByCategory(filtered, currentCategoryFilter.value)
    }
    
    // 应用排序
    return sortItems(filtered)
  })
  
  // 方法
  const initialize = async () => {
    try {
      // 检查Electron API
      if (!window.api?.isElectronAvailable()) {
        console.warn('Electron API不可用，某些功能可能无法正常工作')
      }
      
      // 初始化分类系统
      const categoriesStore = useCategoriesStore()
      categoriesStore.initializeCategories()
      await categoriesStore.loadCustomCategories()
      
      // 加载数据
      await Promise.all([
        loadPrompts(),
        loadTemplates()
      ])
      
      console.log('应用初始化完成')
    } catch (error) {
      console.error('应用初始化失败:', error)
    }
  }
  
  const loadPrompts = async () => {
    try {
      const result = await window.api.getAllPrompts()
      prompts.value = result || []
    } catch (error) {
      console.error('加载Prompt失败:', error)
      prompts.value = []
    }
  }
  
  const loadTemplates = async () => {
    try {
      const result = await window.api.getAllTemplates()
      templates.value = result || []
    } catch (error) {
      console.error('加载模板失败:', error)
      templates.value = []
    }
  }
  
  const switchTab = (tab) => {
    currentTab.value = tab
    clearSelection()
    clearSearch()
  }
  
  const switchViewMode = (mode) => {
    currentViewMode.value = mode
  }
  
  const setSortBy = (sortBy) => {
    if (currentSortBy.value === sortBy) {
      // 切换排序顺序
      currentSortOrder.value = currentSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      currentSortBy.value = sortBy
      currentSortOrder.value = 'desc'
    }
  }
  
  const filterByCategory = (category) => {
    currentCategoryFilter.value = category
  }
  
  const clearCategoryFilter = () => {
    currentCategoryFilter.value = 'all'
  }
  
  const selectPrompt = (promptId) => {
    const prompt = prompts.value.find(p => p.id === promptId)
    if (prompt) {
      selectedPrompt.value = prompt
      currentView.value = 'prompt'
    }
  }
  
  const selectTemplate = (templateId) => {
    const template = templates.value.find(t => t.id === templateId)
    if (template) {
      selectedTemplate.value = template
      currentView.value = 'template'
    }
  }
  
  const toggleBulkSelection = () => {
    bulkSelectionMode.value = !bulkSelectionMode.value
    if (!bulkSelectionMode.value) {
      selectedItems.value.clear()
    }
  }
  
  const toggleItemSelection = (itemId) => {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }
  }
  
  const clearSelection = () => {
    bulkSelectionMode.value = false
    selectedItems.value.clear()
  }
  
  // 搜索功能
  const search = async (query, options = {}) => {
    if (!query.trim()) {
      clearSearch()
      return
    }
    
    try {
      isSearching.value = true
      searchQuery.value = query
      
      const results = await window.api.search(query, {
        searchIn: options.searchIn || 'all',
        limit: options.limit || 100,
        ...options
      })
      
      searchResults.value = {
        prompts: results.filter(item => item.type === 'prompt'),
        templates: results.filter(item => item.type === 'template')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      searchResults.value = { prompts: [], templates: [] }
    } finally {
      isSearching.value = false
    }
  }
  
  const clearSearch = () => {
    searchQuery.value = ''
    searchResults.value = null
    isSearching.value = false
  }
  
  // 批量删除
  const bulkDelete = async () => {
    if (selectedItems.value.size === 0) return
    
    try {
      const itemsToDelete = Array.from(selectedItems.value)
      const currentItems = currentTab.value === 'prompts' ? prompts.value : templates.value
      
      for (const itemId of itemsToDelete) {
        if (currentTab.value === 'prompts') {
          await window.api.deletePrompt(itemId)
        } else {
          await window.api.deleteTemplate(itemId)
        }
      }
      
      // 重新加载数据
      if (currentTab.value === 'prompts') {
        await loadPrompts()
      } else {
        await loadTemplates()
      }
      
      clearSelection()
    } catch (error) {
      console.error('批量删除失败:', error)
      throw error
    }
  }
  
  // 导出功能
  const exportAll = async () => {
    try {
      const result = await window.api.exportAll()
      return result
    } catch (error) {
      console.error('导出失败:', error)
      throw error
    }
  }
  
  const exportTemplates = async () => {
    try {
      const result = await window.api.exportTemplates()
      return result
    } catch (error) {
      console.error('导出模板失败:', error)
      throw error
    }
  }
  
  const importData = async (filePath, options = {}) => {
    try {
      const result = await window.api.importData(filePath, options)
      
      // 重新加载数据
      await Promise.all([
        loadPrompts(),
        loadTemplates()
      ])
      
      return result
    } catch (error) {
      console.error('导入失败:', error)
      throw error
    }
  }
  
  // 辅助函数
  const filterItemsByCategory = (items, categoryFilter) => {
    if (categoryFilter === 'all') return items
    
    const [categoryType, categoryKey] = categoryFilter.split(':')
    
    return items.filter(item => {
      if (!item.categories) return false
      return item.categories[categoryType] === categoryKey
    })
  }
  
  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let aValue = a[currentSortBy.value]
      let bValue = b[currentSortBy.value]
      
      // 处理日期字段
      if (currentSortBy.value.includes('_at')) {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      // 处理字符串字段
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (currentSortOrder.value === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }
  
  return {
    // 状态
    currentView,
    currentTab,
    selectedPrompt,
    selectedTemplate,
    prompts,
    templates,
    searchResults,
    currentVersions,
    bulkSelectionMode,
    selectedItems,
    currentViewMode,
    currentSortBy,
    currentSortOrder,
    currentCategoryFilter,
    searchQuery,
    isSearching,
    
    // 计算属性
    promptCount,
    templateCount,
    selectedItemsCount,
    filteredPrompts,
    filteredTemplates,
    
    // 方法
    initialize,
    loadPrompts,
    loadTemplates,
    switchTab,
    switchViewMode,
    setSortBy,
    filterByCategory,
    clearCategoryFilter,
    selectPrompt,
    selectTemplate,
    toggleBulkSelection,
    toggleItemSelection,
    clearSelection,
    search,
    clearSearch,
    bulkDelete,
    exportAll,
    exportTemplates,
    importData
  }
})