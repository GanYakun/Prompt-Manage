<template>
  <div class="version-history-modal">
    <div class="modal-header">
      <h3 class="modal-title">📜 版本历史</h3>
      <p class="modal-subtitle">{{ prompt?.title }}</p>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">⏳</div>
      <p>正在加载版本历史...</p>
    </div>
    
    <div v-else class="version-content">
      <div class="current-version">
        <h4 class="section-title">当前版本</h4>
        <div class="version-item current">
          <div class="version-header">
            <div class="version-info">
              <span class="version-number">版本 {{ prompt?.version || 'latest' }}</span>
              <span class="version-date">{{ formatDate(prompt?.updated_at) }}</span>
            </div>
            <div class="version-actions">
              <button class="btn btn-sm btn-secondary" @click="previewVersion(prompt)">
                <span class="btn-icon">👁️</span>预览
              </button>
            </div>
          </div>
          <div class="version-preview">{{ truncateText(prompt?.content, 150) }}</div>
        </div>
      </div>
      
      <div v-if="versions.length > 0" class="history-versions">
        <h4 class="section-title">历史版本</h4>
        <div class="versions-list">
          <div 
            v-for="version in versions" 
            :key="version.id"
            class="version-item"
            :class="{ selected: selectedVersion?.id === version.id }"
          >
            <div class="version-header">
              <div class="version-info">
                <span class="version-number">版本 {{ version.versionNumber || version.version_number }}</span>
                <span class="version-date">{{ formatDate(version.created_at) }}</span>
                <span v-if="version.note" class="version-note">{{ version.note }}</span>
              </div>
              <div class="version-actions">
                <button 
                  class="btn btn-sm btn-secondary" 
                  @click="previewVersion(version)"
                  title="预览此版本"
                >
                  <span class="btn-icon">👁️</span>预览
                </button>
                <button 
                  class="btn btn-sm btn-secondary" 
                  @click="compareVersion(version)"
                  title="与当前版本对比"
                >
                  <span class="btn-icon">🔍</span>对比
                </button>
                <button 
                  class="btn btn-sm btn-primary" 
                  @click="restoreVersion(version)"
                  title="恢复到此版本"
                >
                  <span class="btn-icon">↩️</span>恢复
                </button>
              </div>
            </div>
            <div class="version-preview">{{ truncateText(version.content, 150) }}</div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-versions">
        <div class="empty-icon">📝</div>
        <p>暂无历史版本</p>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="handleClose">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useNotificationsStore } from '../../stores/notifications'
import { useAppStore } from '../../stores/app'

const props = defineProps({
  prompt: {
    type: Object,
    required: true
  }
})

const modalStore = useModalStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const loading = ref(true)
const versions = ref([])
const selectedVersion = ref(null)

const loadVersions = async () => {
  try {
    loading.value = true
    versions.value = await window.api.getPromptVersions(props.prompt.id)
  } catch (error) {
    console.error('加载版本历史失败:', error)
    notificationsStore.show('加载版本历史失败', 'error')
    versions.value = []
  } finally {
    loading.value = false
  }
}

const previewVersion = (version) => {
  modalStore.show('VersionPreviewModal', { version, prompt: props.prompt })
}

const compareVersion = (version) => {
  modalStore.show('VersionCompareModal', { 
    current: props.prompt, 
    compare: version 
  })
}

const restoreVersion = async (version) => {
  const confirmed = await modalStore.confirm(
    `确定要恢复到版本 ${version.versionNumber || version.version_number} 吗？`,
    '这将创建一个新版本，原有内容不会丢失。'
  )
  
  if (confirmed) {
    try {
      await window.api.restorePromptVersion(version.id)
      notificationsStore.show('版本恢复成功 ↩️', 'success')
      
      // 重新加载数据
      await appStore.loadPrompts()
      modalStore.close()
    } catch (error) {
      console.error('恢复版本失败:', error)
      notificationsStore.show('恢复版本失败', 'error')
    }
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const handleClose = () => {
  modalStore.close()
}

onMounted(() => {
  if (props.prompt?.id) {
    loadVersions()
  }
})
</script>

<style scoped>
.version-history-modal {
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

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  font-size: 32px;
  margin-bottom: 16px;
}

.version-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  transition: all 0.2s ease;
}

.version-item.current {
  background: var(--primary-light);
  border-color: var(--primary-color);
}

.version-item.selected {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-number {
  font-weight: 600;
  color: var(--text-primary);
}

.version-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.version-note {
  font-size: 12px;
  color: var(--primary-color);
  font-style: italic;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-preview {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  background: var(--bg-primary);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.empty-versions {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>