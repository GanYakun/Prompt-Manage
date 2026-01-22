<template>
  <div class="detail-panel">
    <div class="detail-header">
      <div class="header-left">
        <h2>{{ headerTitle }}</h2>
        <div class="breadcrumb" v-if="breadcrumb">{{ breadcrumb }}</div>
      </div>
      <div class="header-right">
        <div class="header-actions">
          <button class="icon-btn" @click="showStats" title="看看数据">📊</button>
          <button class="icon-btn" @click="showSettings" title="个人设置">⚙️</button>
          <div class="dropdown" :class="{ active: showExportDropdown }">
            <button 
              class="icon-btn dropdown-toggle" 
              @click="toggleExportDropdown"
              title="备份导出"
            >💾</button>
            <div class="dropdown-menu" v-show="showExportDropdown">
              <a href="#" @click.prevent="exportAll">备份所有内容</a>
              <a href="#" @click.prevent="exportTemplates">只备份模板</a>
              <a href="#" @click.prevent="importData">导入备份文件</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="detail-content">
      <component :is="currentViewComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useModalStore } from '../stores/modal'
import Welcome from '../views/Welcome.vue'
import PromptDetail from '../views/PromptDetail.vue'
import TemplateDetail from '../views/TemplateDetail.vue'

const appStore = useAppStore()
const modalStore = useModalStore()

const showExportDropdown = ref(false)

const headerTitle = computed(() => {
  if (appStore.currentView === 'prompt') {
    return appStore.selectedPrompt?.title || '想法详情'
  } else if (appStore.currentView === 'template') {
    return appStore.selectedTemplate?.name || '模板详情'
  } else {
    return '欢迎回来！👋'
  }
})

const breadcrumb = computed(() => {
  if (appStore.currentView === 'prompt') {
    return '我的想法 > 详情'
  } else if (appStore.currentView === 'template') {
    return '常用模板 > 详情'
  }
  return null
})

const currentViewComponent = computed(() => {
  switch (appStore.currentView) {
    case 'prompt':
      return PromptDetail
    case 'template':
      return TemplateDetail
    default:
      return Welcome
  }
})

const toggleExportDropdown = () => {
  showExportDropdown.value = !showExportDropdown.value
}

const showStats = () => {
  modalStore.show('StatsModal')
}

const showSettings = () => {
  modalStore.show('SettingsModal')
}

const exportAll = async () => {
  try {
    await appStore.exportAll()
    showExportDropdown.value = false
  } catch (error) {
    console.error('导出失败:', error)
  }
}

const exportTemplates = async () => {
  try {
    await appStore.exportTemplates()
    showExportDropdown.value = false
  } catch (error) {
    console.error('导出失败:', error)
  }
}

const importData = async () => {
  try {
    modalStore.show('ImportModal')
    showExportDropdown.value = false
  } catch (error) {
    console.error('导入失败:', error)
  }
}

// 在组件挂载时添加事件监听器
let clickHandler = null

onMounted(() => {
  // 点击其他地方关闭下拉菜单
  clickHandler = (e) => {
    if (!e.target.closest('.dropdown')) {
      showExportDropdown.value = false
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