<template>
  <div class="advanced-search-modal">
    <div class="modal-header">
      <h3 class="modal-title">🔍 精确查找</h3>
      <p class="modal-subtitle">使用多种条件精确查找你的内容</p>
    </div>
    
    <form @submit.prevent="handleSearch" class="search-form">
      <div class="search-section">
        <h4 class="section-title">基本搜索</h4>
        <div class="form-group">
          <label class="form-label">关键词</label>
          <input 
            ref="keywordRef"
            type="text" 
            v-model="searchForm.keyword"
            class="form-input"
            placeholder="搜索标题、内容、标签..."
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">搜索范围</label>
            <select v-model="searchForm.searchIn" class="form-select">
              <option value="all">全部内容</option>
              <option value="title">仅标题</option>
              <option value="content">仅内容</option>
              <option value="tags">仅标签</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">内容类型</label>
            <select v-model="searchForm.contentType" class="form-select">
              <option value="all">全部类型</option>
              <option value="prompts">想法</option>
              <option value="templates">模板</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="search-section">
        <h4 class="section-title">分类筛选</h4>
        <div class="category-filters">
          <div 
            v-for="(categoryData, categoryType) in categoriesStore.allCategories" 
            :key="categoryType"
            class="category-filter-group"
          >
            <label class="category-group-label">{{ categoryData.name }}</label>
            <select v-model="searchForm.categories[categoryType]" class="form-select">
              <option value="">不限</option>
              <option 
                v-for="(item, key) in categoryData.items" 
                :key="key"
                :value="key"
              >{{ item.name }}</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="search-section">
        <h4 class="section-title">时间范围</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">创建时间</label>
            <select v-model="searchForm.createdTime" class="form-select">
              <option value="">不限</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="quarter">最近三月</option>
              <option value="year">最近一年</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">更新时间</label>
            <select v-model="searchForm.updatedTime" class="form-select">
              <option value="">不限</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="quarter">最近三月</option>
              <option value="year">最近一年</option>
              <option value="custom">自定义</option>
            </select>
          </div>
        </div>
        
        <div v-if="searchForm.createdTime === 'custom' || searchForm.updatedTime === 'custom'" class="custom-date-range">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始日期</label>
              <input 
                type="date" 
                v-model="searchForm.startDate"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">结束日期</label>
              <input 
                type="date" 
                v-model="searchForm.endDate"
                class="form-input"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div class="search-section">
        <h4 class="section-title">其他条件</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">使用次数</label>
            <select v-model="searchForm.usageCount" class="form-select">
              <option value="">不限</option>
              <option value="unused">从未使用</option>
              <option value="low">使用较少 (1-5次)</option>
              <option value="medium">使用一般 (6-20次)</option>
              <option value="high">使用频繁 (20次以上)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">排序方式</label>
            <select v-model="searchForm.sortBy" class="form-select">
              <option value="relevance">相关性</option>
              <option value="created_at">创建时间</option>
              <option value="updated_at">更新时间</option>
              <option value="usage_count">使用次数</option>
              <option value="title">标题</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">排序顺序</label>
            <select v-model="searchForm.sortOrder" class="form-select">
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="search-actions">
        <button type="button" class="btn btn-secondary" @click="resetForm">重置</button>
        <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
        <button type="submit" class="btn btn-primary">
          <span class="btn-icon">🔍</span>开始搜索
        </button>
      </div>
    </form>
    
    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0" class="search-results">
      <div class="results-header">
        <h4>搜索结果 ({{ searchResults.length }} 项)</h4>
        <button class="btn btn-sm btn-secondary" @click="clearResults">清除结果</button>
      </div>
      <div class="results-list">
        <div 
          v-for="item in searchResults" 
          :key="item.id"
          class="result-item"
          @click="selectItem(item)"
        >
          <div class="result-icon">{{ item.type === 'prompt' ? '💡' : '📋' }}</div>
          <div class="result-content">
            <div class="result-title">{{ item.title || item.name }}</div>
            <div class="result-preview">{{ truncateText(item.content, 100) }}</div>
            <div class="result-meta">
              <span class="result-type">{{ item.type === 'prompt' ? '想法' : '模板' }}</span>
              <span class="result-date">{{ formatDate(item.updated_at) }}</span>
              <span v-if="item.usage_count" class="result-usage">使用 {{ item.usage_count }} 次</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useCategoriesStore } from '../../stores/categories'
import { useNotificationsStore } from '../../stores/notifications'
import { useAppStore } from '../../stores/app'

const modalStore = useModalStore()
const categoriesStore = useCategoriesStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const keywordRef = ref(null)
const searchResults = ref([])

const searchForm = ref({
  keyword: '',
  searchIn: 'all',
  contentType: 'all',
  categories: {},
  createdTime: '',
  updatedTime: '',
  startDate: '',
  endDate: '',
  usageCount: '',
  sortBy: 'relevance',
  sortOrder: 'desc'
})

const handleSearch = async () => {
  try {
    // 确保categories对象是可序列化的
    const categories = {}
    if (searchForm.value.categories && typeof searchForm.value.categories === 'object') {
      Object.keys(searchForm.value.categories).forEach(key => {
        const value = searchForm.value.categories[key]
        if (value && typeof value === 'string') {
          categories[key] = value
        }
      })
    }
    
    // 构建搜索条件
    const criteria = {
      keyword: searchForm.value.keyword.trim(),
      searchIn: searchForm.value.searchIn,
      contentType: searchForm.value.contentType,
      categories: Object.keys(categories).length > 0 ? categories : null,
      createdTime: searchForm.value.createdTime,
      updatedTime: searchForm.value.updatedTime,
      startDate: searchForm.value.startDate,
      endDate: searchForm.value.endDate,
      usageCount: searchForm.value.usageCount,
      sortBy: searchForm.value.sortBy,
      sortOrder: searchForm.value.sortOrder
    }
    
    // 调用高级搜索API
    const results = await window.api.advancedSearch(criteria)
    searchResults.value = results || []
    
    if (searchResults.value.length === 0) {
      notificationsStore.show('没有找到匹配的结果', 'info')
    } else {
      notificationsStore.show(`找到 ${searchResults.value.length} 个结果`, 'success')
    }
  } catch (error) {
    console.error('搜索失败:', error)
    notificationsStore.show('搜索失败，请重试', 'error')
  }
}

const resetForm = () => {
  searchForm.value = {
    keyword: '',
    searchIn: 'all',
    contentType: 'all',
    categories: {},
    createdTime: '',
    updatedTime: '',
    startDate: '',
    endDate: '',
    usageCount: '',
    sortBy: 'relevance',
    sortOrder: 'desc'
  }
  searchResults.value = []
}

const clearResults = () => {
  searchResults.value = []
}

const selectItem = (item) => {
  modalStore.close()
  
  if (item.type === 'prompt') {
    appStore.selectPrompt(item.id)
  } else {
    appStore.selectTemplate(item.id)
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays} 天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const handleCancel = () => {
  modalStore.close()
}

onMounted(() => {
  if (keywordRef.value) {
    keywordRef.value.focus()
  }
})
</script>

<style scoped>
.advanced-search-modal {
  width: 100%;
  max-width: 800px;
}

.modal-header {
  margin-bottom: 24px;
  text-align: center;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.search-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--bg-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input,
.form-select {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.category-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.category-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-group-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.custom-date-range {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.search-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.search-results {
  margin-top: 24px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.results-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.results-list {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.result-item:hover {
  background: var(--bg-hover);
}

.result-item:last-child {
  border-bottom: none;
}

.result-icon {
  font-size: 20px;
  margin-top: 2px;
}

.result-content {
  flex: 1;
}

.result-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.result-preview {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.result-type {
  background: var(--primary-color);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}
</style>