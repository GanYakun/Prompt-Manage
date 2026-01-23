<template>
  <div 
    class="template-card"
    :class="{ 
      active: selected,
      selectable: selectable,
      [templateStatus]: true
    }"
    @click="handleClick"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-section">
        <h3 class="card-title">{{ template.name }}</h3>
        <div class="card-status-badge template-badge">
          📋 模板
        </div>
      </div>
      <div class="card-actions" v-show="!selectable">
        <button class="action-btn" @click.stop="useTemplate" title="使用模板">✨</button>
        <button class="action-btn" @click.stop="editTemplate" title="编辑">✏️</button>
        <button class="action-btn" @click.stop="copyTemplate" title="复制">📋</button>
        <button class="action-btn" @click.stop="deleteTemplate" title="删除">🗑️</button>
      </div>
    </div>
    
    <!-- 情绪化标签 -->
    <div class="emotion-tags" v-if="emotionTags.length > 0">
      <span 
        v-for="tag in emotionTags" 
        :key="tag.text"
        class="emotion-tag template-emotion"
        :title="tag.description"
      >
        {{ tag.emoji }} {{ tag.text }}
      </span>
    </div>
    
    <!-- 内容预览 -->
    <div class="card-content">
      <p class="content-preview" v-if="template.description">{{ template.description }}</p>
      <p class="content-preview" v-else>{{ truncatedContent }}</p>
    </div>
    
    <!-- 卡片底部信息 -->
    <div class="card-footer">
      <div class="usage-info">
        <div class="usage-frequency">
          <span class="usage-icon">🔥</span>
          <span class="usage-text">{{ usageFrequencyText }}</span>
        </div>
        <div class="last-used">
          <span class="time-icon">⏰</span>
          <span class="time-text">{{ formatDate(template.updated_at) }}</span>
        </div>
      </div>
      
      <div class="card-meta">
        <span class="template-type">模板</span>
      </div>
    </div>
    
    <!-- 原有标签（保持兼容性） -->
    <div class="original-tags" v-if="template.tags && template.tags.length > 0">
      <span 
        v-for="(tag, index) in visibleTags" 
        :key="tag"
        class="original-tag"
        :class="{ primary: index === 0 }"
      >{{ tag }}</span>
      <span v-if="hiddenTagsCount > 0" class="tag-more">+{{ hiddenTagsCount }}</span>
    </div>
    
    <!-- 分类标签 -->
    <div class="category-tags" v-if="categoryTags.length > 0">
      <span 
        v-for="tag in categoryTags" 
        :key="tag.key"
        class="category-tag"
        :style="{ backgroundColor: tag.color }"
      >{{ tag.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCategoriesStore } from '../stores/categories'
import { useModalStore } from '../stores/modal'
import { useNotificationsStore } from '../stores/notifications'
import { useAppStore } from '../stores/app'

const props = defineProps({
  template: {
    type: Object,
    required: true
  },
  selectable: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'select'])

const categoriesStore = useCategoriesStore()
const modalStore = useModalStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const truncatedContent = computed(() => {
  const maxLength = 120
  if (props.template.content.length <= maxLength) {
    return props.template.content
  }
  return props.template.content.substring(0, maxLength) + '...'
})

const visibleTags = computed(() => {
  if (!props.template.tags) return []
  return props.template.tags.slice(0, 3)
})

const hiddenTagsCount = computed(() => {
  if (!props.template.tags) return 0
  return Math.max(0, props.template.tags.length - 3)
})

const categoryTags = computed(() => {
  if (!props.template.categories) return []
  
  const tags = []
  Object.entries(props.template.categories).forEach(([categoryType, categoryKey]) => {
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

// 模板状态（简化版，主要是模板标识）
const templateStatus = computed(() => {
  return 'template'
})

// 使用频率文本
const usageFrequencyText = computed(() => {
  const usageCount = props.template.usage_count || 0
  if (usageCount === 0) return '未使用'
  if (usageCount === 1) return '使用 1 次'
  if (usageCount < 5) return `使用 ${usageCount} 次`
  if (usageCount < 10) return '经常使用'
  return '高频使用'
})

// 模板情绪化标签
const emotionTags = computed(() => {
  const tags = []
  const content = (props.template.content || '').toLowerCase()
  const name = props.template.name.toLowerCase()
  const description = (props.template.description || '').toLowerCase()
  const usageCount = props.template.usage_count || 0
  
  // 基于内容和名称分析情绪标签
  if (content.includes('模板') || name.includes('模板') || description.includes('模板')) {
    tags.push({ emoji: '📋', text: '快速模板', description: '提供快速创建的模板' })
  }
  
  if (content.includes('写作') || name.includes('写作') || description.includes('写作')) {
    tags.push({ emoji: '✍️', text: '写作模板', description: '专业写作模板' })
  }
  
  if (content.includes('创意') || name.includes('创意') || description.includes('创意')) {
    tags.push({ emoji: '💡', text: '创意模板', description: '激发创意的模板' })
  }
  
  if (content.includes('学习') || name.includes('学习') || description.includes('学习')) {
    tags.push({ emoji: '📚', text: '学习模板', description: '学习专用模板' })
  }
  
  if (content.includes('工作') || name.includes('工作') || description.includes('工作')) {
    tags.push({ emoji: '💼', text: '工作模板', description: '提升工作效率' })
  }
  
  if (usageCount >= 5) {
    tags.push({ emoji: '⭐', text: '热门模板', description: '广受欢迎的模板' })
  }
  
  if (content.includes('分析') || name.includes('分析') || description.includes('分析')) {
    tags.push({ emoji: '🔍', text: '分析模板', description: '专业分析模板' })
  }
  
  if (content.includes('计划') || name.includes('计划') || description.includes('计划')) {
    tags.push({ emoji: '📅', text: '规划模板', description: '计划制定模板' })
  }
  
  // 限制显示数量
  return tags.slice(0, 2)
})

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

const handleClick = () => {
  if (props.selectable) {
    emit('select')
  } else {
    emit('click')
  }
}

const useTemplate = () => {
  modalStore.show('CreateFromTemplateModal', { template: props.template })
}

const editTemplate = () => {
  modalStore.show('EditTemplateModal', { template: props.template })
}

const copyTemplate = async () => {
  try {
    await navigator.clipboard.writeText(props.template.content)
    notificationsStore.show('模板内容已复制到剪贴板 📋', 'success', 2000)
  } catch (error) {
    console.error('复制失败:', error)
    notificationsStore.show('复制失败', 'error')
  }
}

const deleteTemplate = async () => {
  const confirmed = await modalStore.confirm(
    `确定要删除模板 "${props.template.name}" 吗？`,
    '此操作不可撤销。'
  )
  
  if (confirmed) {
    try {
      await window.api.deleteTemplate(props.template.id)
      notificationsStore.show('模板删除成功 🗑️', 'success')
      
      // 如果删除的是当前选中的项目，清除选择
      if (appStore.selectedTemplate?.id === props.template.id) {
        appStore.selectedTemplate = null
        appStore.currentView = 'welcome'
      }
      
      // 重新加载数据
      await appStore.loadTemplates()
    } catch (error) {
      console.error('删除失败:', error)
      notificationsStore.show('删除失败', 'error')
    }
  }
}
</script>