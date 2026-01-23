<template>
  <div class="list-panel">
    <div class="list-header">
      <div class="list-title">
        <h3>{{ listTitle }}</h3>
        <span class="list-count">{{ listCount }}</span>
      </div>
      <div class="list-actions">
        <div class="view-mode-buttons">
          <button 
            class="icon-btn"
            :class="{ active: appStore.currentViewMode === 'list' }"
            @click="appStore.switchViewMode('list')"
            title="列表查看"
          >📋</button>
          <button 
            class="icon-btn"
            :class="{ active: appStore.currentViewMode === 'grid' }"
            @click="appStore.switchViewMode('grid')"
            title="卡片查看"
          >⊞</button>
        </div>
        <div class="dropdown" :class="{ active: showSortDropdown }">
          <button 
            class="icon-btn dropdown-toggle" 
            @click="toggleSortDropdown"
            title="排序方式"
          >
            📅<span class="sort-indicator">{{ sortIndicator }}</span>
          </button>
          <div class="dropdown-menu" v-show="showSortDropdown">
            <a 
              href="#" 
              v-for="option in sortOptions" 
              :key="option.value"
              :class="{ active: appStore.currentSortBy === option.value }"
              @click.prevent="handleSort(option.value)"
            >{{ option.label }}</a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 批量操作工具栏 -->
    <div 
      class="bulk-actions-toolbar" 
      v-show="appStore.bulkSelectionMode"
    >
      <div class="bulk-actions-info">
        已选择 <span>{{ appStore.selectedItemsCount }}</span> 个{{ itemTypeName }}
      </div>
      <div class="bulk-actions-buttons">
        <button class="btn btn-sm btn-error" @click="bulkDelete">
          <span class="btn-icon">🗑️</span>
          删除选中的
        </button>
        <button class="btn btn-sm btn-secondary" @click="appStore.clearSelection">
          取消选择
        </button>
      </div>
    </div>
    
    <div class="list-content">
      <!-- Prompt列表 -->
      <div 
        v-show="appStore.currentTab === 'prompts'"
        class="prompt-list"
        :class="{ 
          'grid-view': appStore.currentViewMode === 'grid',
          'bulk-selection-mode': appStore.bulkSelectionMode
        }"
      >
        <div v-if="appStore.filteredPrompts.length === 0" class="empty-state">
          <div class="empty-state-icon">💭</div>
          <h3>{{ emptyPromptTitle }}</h3>
          <p>{{ emptyPromptMessage }}</p>
          <div class="empty-state-actions">
            <button class="btn btn-primary" @click="createNewPrompt">
              写个想法
            </button>
            <button 
              v-if="appStore.currentCategoryFilter !== 'all'"
              class="btn btn-secondary" 
              @click="appStore.clearCategoryFilter"
            >
              清除筛选
            </button>
          </div>
        </div>
        
        <PromptItem
          v-for="prompt in appStore.filteredPrompts"
          :key="prompt.id"
          :prompt="prompt"
          :selectable="appStore.bulkSelectionMode"
          :selected="appStore.selectedItems.has(prompt.id)"
          @click="handlePromptClick(prompt.id)"
          @select="appStore.toggleItemSelection(prompt.id)"
        />
      </div>
      
      <!-- 模板列表 -->
      <div 
        v-show="appStore.currentTab === 'templates'"
        class="template-list"
        :class="{ 
          'grid-view': appStore.currentViewMode === 'grid',
          'bulk-selection-mode': appStore.bulkSelectionMode
        }"
      >
        <div v-if="appStore.filteredTemplates.length === 0" class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>{{ emptyTemplateTitle }}</h3>
          <p>{{ emptyTemplateMessage }}</p>
          <div class="empty-state-actions">
            <button class="btn btn-primary" @click="createNewTemplate">
              做个模板
            </button>
            <button 
              v-if="appStore.currentCategoryFilter !== 'all'"
              class="btn btn-secondary" 
              @click="appStore.clearCategoryFilter"
            >
              清除筛选
            </button>
          </div>
        </div>
        
        <TemplateItem
          v-for="template in appStore.filteredTemplates"
          :key="template.id"
          :template="template"
          :selectable="appStore.bulkSelectionMode"
          :selected="appStore.selectedItems.has(template.id)"
          @click="handleTemplateClick(template.id)"
          @select="appStore.toggleItemSelection(template.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useCategoriesStore } from '../stores/categories'
import { useModalStore } from '../stores/modal'
import { useNotificationsStore } from '../stores/notifications'
import PromptItem from './PromptItem.vue'
import TemplateItem from './TemplateItem.vue'

const appStore = useAppStore()
const categoriesStore = useCategoriesStore()
const modalStore = useModalStore()
const notificationsStore = useNotificationsStore()

const showSortDropdown = ref(false)

const sortOptions = [
  { value: 'updated_at', label: '最近修改的' },
  { value: 'created_at', label: '最新创建的' },
  { value: 'title', label: '按名字排序' },
  { value: 'usage_count', label: '最常用的' }
]

const listTitle = computed(() => {
  const type = appStore.currentTab === 'prompts' ? '想法' : '模板'
  
  if (appStore.currentCategoryFilter === 'all') {
    return `我的所有${type}`
  }
  
  const [categoryType, categoryKey] = appStore.currentCategoryFilter.split(':')
  const categoryData = categoriesStore.allCategories[categoryType]
  
  if (categoryData && categoryData.items[categoryKey]) {
    return `${categoryData.items[categoryKey].name} - ${type}`
  }
  
  return `我的所有${type}`
})

const listCount = computed(() => {
  const count = appStore.currentTab === 'prompts' 
    ? appStore.filteredPrompts.length 
    : appStore.filteredTemplates.length
  const type = appStore.currentTab === 'prompts' ? '想法' : '模板'
  return `${count} 个${type}`
})

const itemTypeName = computed(() => {
  return appStore.currentTab === 'prompts' ? '想法' : '模板'
})

const sortIndicator = computed(() => {
  return appStore.currentSortOrder === 'asc' ? '↑' : '↓'
})

const emptyPromptTitle = computed(() => {
  return appStore.currentCategoryFilter === 'all' 
    ? '还没有记录想法呢' 
    : '没有找到相关的想法'
})

const emptyPromptMessage = computed(() => {
  return appStore.currentCategoryFilter === 'all' 
    ? '写下你的第一个想法开始吧！' 
    : '试试调整筛选条件，或者记录一个新想法'
})

const emptyTemplateTitle = computed(() => {
  return appStore.currentCategoryFilter === 'all' 
    ? '还没有模板呢' 
    : '没有找到相关的模板'
})

const emptyTemplateMessage = computed(() => {
  return appStore.currentCategoryFilter === 'all' 
    ? '创建你的第一个模板开始吧！' 
    : '试试调整筛选条件，或者创建一个新模板'
})

const toggleSortDropdown = () => {
  showSortDropdown.value = !showSortDropdown.value
}

const handleSort = (sortBy) => {
  appStore.setSortBy(sortBy)
  showSortDropdown.value = false
}

const handlePromptClick = (promptId) => {
  if (appStore.bulkSelectionMode) {
    appStore.toggleItemSelection(promptId)
  } else {
    appStore.selectPrompt(promptId)
  }
}

const handleTemplateClick = (templateId) => {
  if (appStore.bulkSelectionMode) {
    appStore.toggleItemSelection(templateId)
  } else {
    appStore.selectTemplate(templateId)
  }
}

const createNewPrompt = () => {
  modalStore.show('CreatePromptModal')
}

const createNewTemplate = () => {
  modalStore.show('CreateTemplateModal')
}

const bulkDelete = async () => {
  const confirmed = await modalStore.confirm(
    `确定要删除选中的 ${appStore.selectedItemsCount} 个${itemTypeName.value}吗？`,
    '此操作不可撤销，请谨慎操作。'
  )
  
  if (confirmed) {
    try {
      // 调用store中的批量删除方法
      await appStore.bulkDelete()
      notificationsStore.show(`成功删除 ${appStore.selectedItemsCount} 个${itemTypeName.value} 🗑️`, 'success')
    } catch (error) {
      console.error('批量删除失败:', error)
      notificationsStore.show('批量删除失败', 'error')
    }
  }
}

// 在组件挂载时添加事件监听器
let clickHandler = null

onMounted(() => {
  // 点击其他地方关闭下拉菜单
  clickHandler = (e) => {
    if (!e.target.closest('.dropdown')) {
      showSortDropdown.value = false
    }
  }
  document.addEventListener('click', clickHandler)
})

onUnmounted(() => {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler)
  }
})
</script>