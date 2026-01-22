<template>
  <div class="category-panel">
    <div class="category-header">
      <div class="logo">
        <div class="logo-icon">📝</div>
        <div class="logo-text">
          <h1>我的灵感笔记本</h1>
          <span class="version">记录每一个好想法 ✨</span>
        </div>
      </div>
      
      <div class="search-container">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="找找我写过什么..." 
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">🔍</button>
        </div>
        <button class="advanced-search-btn" @click="showAdvancedSearch">精确查找</button>
      </div>
    </div>
    
    <div class="category-nav">
      <div class="nav-tabs">
        <button 
          class="nav-tab"
          :class="{ active: appStore.currentTab === 'prompts' }"
          @click="appStore.switchTab('prompts')"
        >
          <span class="tab-icon">💡</span>
          <span class="tab-text">我的想法</span>
          <span class="tab-count">{{ appStore.promptCount }}</span>
        </button>
        <button 
          class="nav-tab"
          :class="{ active: appStore.currentTab === 'templates' }"
          @click="appStore.switchTab('templates')"
        >
          <span class="tab-icon">📋</span>
          <span class="tab-text">常用模板</span>
          <span class="tab-count">{{ appStore.templateCount }}</span>
        </button>
      </div>
      
      <!-- 分类筛选器 -->
      <div class="category-filter">
        <div class="filter-header">
          <span class="filter-title">📂 按类别查看</span>
          <button 
            class="filter-clear" 
            @click="appStore.clearCategoryFilter"
            title="看全部"
          >✕</button>
        </div>
        <div class="category-list">
          <div 
            class="category-item"
            :class="{ active: appStore.currentCategoryFilter === 'all' }"
            @click="appStore.filterByCategory('all')"
          >
            <span class="category-icon">🌟</span>
            <span class="category-name">全部想法</span>
            <span class="category-count">{{ totalCount }}</span>
          </div>
          
          <!-- 分类组 -->
          <div 
            v-for="(categoryData, categoryType) in categoriesStore.allCategories" 
            :key="categoryType"
            class="category-group"
          >
            <div 
              class="category-group-header"
              @click="categoriesStore.toggleCategoryGroup(categoryType)"
            >
              <span 
                class="category-expand-icon"
                :class="{ expanded: categoryData.expanded }"
              >{{ categoryData.expanded ? '▼' : '▶' }}</span>
              <span class="category-group-icon">{{ categoryData.icon }}</span>
              <span class="category-group-name">{{ categoryData.name }}</span>
              <span class="category-group-count">{{ getGroupCount(categoryType) }}</span>
            </div>
            
            <div 
              class="category-items"
              :class="{ 
                expanded: categoryData.expanded, 
                collapsed: !categoryData.expanded 
              }"
            >
              <div 
                v-for="(item, key) in categoryData.items" 
                :key="key"
                class="category-item"
                :class="{ active: appStore.currentCategoryFilter === `${categoryType}:${key}` }"
                @click="appStore.filterByCategory(`${categoryType}:${key}`)"
              >
                <span class="category-icon">{{ item.icon }}</span>
                <span class="category-name">{{ item.name }}</span>
                <span class="category-count">{{ getCategoryCount(categoryType, key) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 自定义分类管理按钮 -->
          <div class="custom-category-management">
            <button 
              class="btn btn-sm btn-outline custom-category-add-btn"
              @click="showCustomCategoryManagement"
            >
              <span class="btn-icon">➕</span>添加我的分类
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="category-actions">
      <button class="action-btn primary" @click="createNewPrompt">
        <span class="btn-icon">✍️</span>
        写个新想法
      </button>
      <button class="action-btn secondary" @click="createNewTemplate">
        <span class="btn-icon">📄</span>
        做个模板
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useCategoriesStore } from '../stores/categories'
import { useModalStore } from '../stores/modal'

const appStore = useAppStore()
const categoriesStore = useCategoriesStore()
const modalStore = useModalStore()

const searchQuery = ref('')

const totalCount = computed(() => {
  return appStore.currentTab === 'prompts' 
    ? appStore.promptCount 
    : appStore.templateCount
})

const currentItems = computed(() => {
  return appStore.currentTab === 'prompts' 
    ? appStore.prompts 
    : appStore.templates
})

const getGroupCount = (categoryType) => {
  const categoryData = categoriesStore.allCategories[categoryType]
  if (!categoryData) return 0
  
  let total = 0
  Object.keys(categoryData.items).forEach(key => {
    total += getCategoryCount(categoryType, key)
  })
  return total
}

const getCategoryCount = (categoryType, categoryKey) => {
  return categoriesStore.getCategoryItemsCount(
    categoryType, 
    categoryKey, 
    currentItems.value
  )
}

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    await appStore.search(searchQuery.value.trim())
  } else {
    appStore.clearSearch()
  }
}

const showAdvancedSearch = () => {
  modalStore.show('AdvancedSearchModal')
}

const createNewPrompt = () => {
  modalStore.show('CreatePromptModal')
}

const createNewTemplate = () => {
  modalStore.show('CreateTemplateModal')
}

const showCustomCategoryManagement = () => {
  modalStore.show('CustomCategoryModal')
}

// 在组件挂载时初始化分类
onMounted(() => {
  categoriesStore.initializeCategories()
  categoriesStore.loadCustomCategories()
})
</script>