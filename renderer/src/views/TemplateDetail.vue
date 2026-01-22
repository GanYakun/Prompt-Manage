<template>
  <div class="template-detail" v-if="template">
    <!-- 标题区域 -->
    <div class="detail-title-section">
      <h1 class="detail-main-title">{{ template.name }}</h1>
      <div class="detail-meta-info">
        <div class="meta-item">
          <span class="meta-label">创建</span>
          <span class="meta-value">{{ formatDate(template.created_at) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">更新</span>
          <span class="meta-value">{{ formatDate(template.updated_at) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">使用</span>
          <span class="meta-value">{{ template.usage_count || 0 }} 次</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="detail-actions-section">
      <div class="primary-actions">
        <button class="btn btn-primary" @click="createFromTemplate">
          <span class="btn-icon">🚀</span>使用模板
        </button>
        <button class="btn btn-secondary" @click="editTemplate">
          <span class="btn-icon">✏️</span>编辑
        </button>
      </div>
      <div class="secondary-actions">
        <button class="btn btn-outline" @click="copyTemplate">
          <span class="btn-icon">📋</span>复制
        </button>
        <button class="btn btn-error-outline" @click="deleteTemplate">
          <span class="btn-icon">🗑️</span>删除
        </button>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="detail-content-section">
      <div v-if="template.description" class="content-block">
        <h4 class="section-title">描述</h4>
        <p class="template-description">{{ template.description }}</p>
      </div>
      
      <div class="content-block">
        <h4 class="section-title">模板内容</h4>
        <div class="content-preview-enhanced">{{ template.content }}</div>
        <div v-if="variables.length > 0" class="template-variables">
          <h5 class="variables-title">📝 变量占位符</h5>
          <div class="variables-list">
            <span 
              v-for="variable in variables" 
              :key="variable"
              class="variable-tag"
            >{{ variable }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="categoryTags.length > 0" class="content-block">
        <h4 class="section-title">分类</h4>
        <div class="category-tags">
          <span 
            v-for="tag in categoryTags" 
            :key="tag.key"
            class="category-tag"
            :style="{ backgroundColor: tag.color }"
          >{{ tag.name }}</span>
        </div>
      </div>
      
      <div v-if="template.tags && template.tags.length > 0" class="content-block">
        <h4 class="section-title">标签</h4>
        <div class="tags-enhanced">
          <span 
            v-for="tag in template.tags" 
            :key="tag"
            class="tag-enhanced"
          >{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="empty-detail">
    <div class="empty-detail-icon">📄</div>
    <h3>选择一个模板查看详情</h3>
    <p>从左侧列表中选择模板，或者创建一个新的模板</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useCategoriesStore } from '../stores/categories'
import { useModalStore } from '../stores/modal'
import { useNotificationsStore } from '../stores/notifications'

const appStore = useAppStore()
const categoriesStore = useCategoriesStore()
const modalStore = useModalStore()
const notificationsStore = useNotificationsStore()

const template = computed(() => appStore.selectedTemplate)

const categoryTags = computed(() => {
  if (!template.value?.categories) return []
  
  const tags = []
  Object.entries(template.value.categories).forEach(([categoryType, categoryKey]) => {
    const categoryData = categoriesStore.allCategories[categoryType]
    if (categoryData && categoryData.items[categoryKey]) {
      const item = categoryData.items[categoryKey]
      tags.push({
        key: `${categoryType}:${categoryKey}`,
        name: item.name,
        color: item.color
      })
    }
  })
  return tags
})

const variables = computed(() => {
  if (!template.value?.content) return []
  
  const variableRegex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = variableRegex.exec(template.value.content)) !== null) {
    const variable = match[1].trim()
    if (!matches.includes(variable)) {
      matches.push(variable)
    }
  }
  
  return matches
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const createFromTemplate = () => {
  modalStore.show('CreateFromTemplateModal', { template: template.value })
}

const editTemplate = () => {
  modalStore.show('EditTemplateModal', { template: template.value })
}

const copyTemplate = async () => {
  try {
    await navigator.clipboard.writeText(template.value.content)
    notificationsStore.show('模板内容已复制到剪贴板 📋', 'success', 2000)
  } catch (error) {
    console.error('复制失败:', error)
    notificationsStore.show('复制失败', 'error')
  }
}

const deleteTemplate = async () => {
  const confirmed = await modalStore.confirm(
    `确定要删除模板 "${template.value.name}" 吗？`,
    '此操作不可撤销。'
  )
  
  if (confirmed) {
    try {
      await window.api.deleteTemplate(template.value.id)
      notificationsStore.show('模板删除成功 🗑️', 'success')
      
      // 清除选择并重新加载数据
      appStore.selectedTemplate = null
      appStore.currentView = 'welcome'
      await appStore.loadTemplates()
    } catch (error) {
      console.error('删除失败:', error)
      notificationsStore.show('删除失败', 'error')
    }
  }
}
</script>

<style scoped>
.template-detail {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.detail-title-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.detail-main-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  line-height: 1.3;
}

.detail-meta-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
}

.meta-value {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-actions-section {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.primary-actions,
.secondary-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-content-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.content-block {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.template-description {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

.content-preview-enhanced {
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 16px;
}

.template-variables {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.variables-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.variables-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.variable-tag {
  padding: 4px 8px;
  background: var(--warning-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-mono);
}

.category-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: var(--primary-color);
}

.tags-enhanced {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-enhanced {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border-color);
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
}

.empty-detail-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-detail h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-detail p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-icon {
  font-size: 14px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-error-outline {
  background: transparent;
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.btn-error-outline:hover {
  background: var(--error-color);
  color: white;
}
</style>