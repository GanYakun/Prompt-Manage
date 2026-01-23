<template>
  <div 
    class="prompt-card"
    :class="{ 
      active: selected,
      selectable: selectable,
      [promptStatus]: true
    }"
    @click="handleClick"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="card-title-section">
        <h3 class="card-title">{{ prompt.title }}</h3>
        <div class="card-status-badge" :class="promptStatus">
          {{ statusText }}
        </div>
      </div>
      <div class="card-actions" v-show="!selectable">
        <button class="action-btn" @click.stop="showVersionHistory" title="版本历史">📜</button>
        <button class="action-btn" @click.stop="editPrompt" title="编辑">✏️</button>
        <button class="action-btn" @click.stop="copyPrompt" title="复制">📋</button>
        <button class="action-btn" @click.stop="saveAsTemplate" title="存为模板">📄</button>
        <button class="action-btn" @click.stop="deletePrompt" title="删除">🗑️</button>
      </div>
    </div>
    
    <!-- 情绪化标签 -->
    <div class="emotion-tags" v-if="emotionTags.length > 0">
      <span 
        v-for="tag in emotionTags" 
        :key="tag.text"
        class="emotion-tag"
        :title="tag.description"
      >
        {{ tag.emoji }} {{ tag.text }}
      </span>
    </div>
    
    <!-- 内容预览 -->
    <div class="card-content">
      <p class="content-preview">{{ truncatedContent }}</p>
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
          <span class="time-text">{{ formatDate(prompt.updated_at) }}</span>
        </div>
      </div>
      
      <div class="card-meta">
        <span class="version-count">{{ prompt.version_count || 1 }} 版本</span>
      </div>
    </div>
    
    <!-- 原有标签（保持兼容性） -->
    <div class="original-tags" v-if="prompt.tags && prompt.tags.length > 0">
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
  prompt: {
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
  if (props.prompt.content.length <= maxLength) {
    return props.prompt.content
  }
  return props.prompt.content.substring(0, maxLength) + '...'
})

const visibleTags = computed(() => {
  if (!props.prompt.tags) return []
  return props.prompt.tags.slice(0, 3)
})

const hiddenTagsCount = computed(() => {
  if (!props.prompt.tags) return 0
  return Math.max(0, props.prompt.tags.length - 3)
})

const categoryTags = computed(() => {
  if (!props.prompt.categories) return []
  
  const tags = []
  Object.entries(props.prompt.categories).forEach(([categoryType, categoryKey]) => {
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

// 计算 Prompt 状态
const promptStatus = computed(() => {
  const usageCount = props.prompt.usage_count || 0
  const versionCount = props.prompt.version_count || 1
  const daysSinceCreated = getDaysSinceCreated()
  
  if (daysSinceCreated <= 7) {
    return 'new'
  } else if (usageCount >= 10 || versionCount >= 5) {
    return 'mature'
  } else if (usageCount >= 3) {
    return 'frequent'
  }
  return 'new'
})

const statusText = computed(() => {
  switch (promptStatus.value) {
    case 'new': return '新'
    case 'frequent': return '常用'
    case 'mature': return '成熟'
    default: return '新'
  }
})

// 使用频率文本
const usageFrequencyText = computed(() => {
  const usageCount = props.prompt.usage_count || 0
  if (usageCount === 0) return '未使用'
  if (usageCount === 1) return '使用 1 次'
  if (usageCount < 5) return `使用 ${usageCount} 次`
  if (usageCount < 10) return '经常使用'
  return '高频使用'
})

// 情绪化标签
const emotionTags = computed(() => {
  const tags = []
  const content = props.prompt.content.toLowerCase()
  const title = props.prompt.title.toLowerCase()
  const usageCount = props.prompt.usage_count || 0
  
  // 基于内容和标题分析情绪标签
  if (content.includes('思考') || content.includes('分析') || content.includes('思维') || title.includes('思考')) {
    tags.push({ emoji: '🧠', text: '思维放大器', description: '帮助深度思考和分析' })
  }
  
  if (content.includes('写作') || content.includes('文章') || content.includes('写') || title.includes('写作')) {
    tags.push({ emoji: '✍️', text: '写作救命', description: '提升写作效率和质量' })
  }
  
  if (content.includes('创意') || content.includes('创新') || content.includes('想法') || title.includes('创意')) {
    tags.push({ emoji: '💡', text: '灵感火花', description: '激发创意和想象力' })
  }
  
  if (content.includes('学习') || content.includes('教学') || content.includes('解释') || title.includes('学习')) {
    tags.push({ emoji: '📚', text: '学习助手', description: '提升学习和理解效果' })
  }
  
  if (content.includes('解决') || content.includes('问题') || content.includes('方案') || title.includes('解决')) {
    tags.push({ emoji: '🔧', text: '问题终结者', description: '快速解决各种问题' })
  }
  
  if (content.includes('效率') || content.includes('快速') || content.includes('自动') || usageCount >= 10) {
    tags.push({ emoji: '⚡', text: '效率神器', description: '大幅提升工作效率' })
  }
  
  if (content.includes('沟通') || content.includes('交流') || content.includes('对话') || title.includes('沟通')) {
    tags.push({ emoji: '💬', text: '沟通桥梁', description: '改善沟通和表达' })
  }
  
  if (content.includes('计划') || content.includes('规划') || content.includes('安排') || title.includes('计划')) {
    tags.push({ emoji: '📋', text: '规划大师', description: '帮助制定和执行计划' })
  }
  
  // 限制显示数量
  return tags.slice(0, 2)
})

const getDaysSinceCreated = () => {
  const created = new Date(props.prompt.created_at)
  const now = new Date()
  const diffTime = Math.abs(now - created)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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

const handleClick = () => {
  if (props.selectable) {
    emit('select')
  } else {
    emit('click')
  }
}

const editPrompt = () => {
  modalStore.show('EditPromptModal', { prompt: props.prompt })
}

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(props.prompt.content)
    notificationsStore.show('内容已复制到剪贴板 📋', 'success', 2000)
  } catch (error) {
    console.error('复制失败:', error)
    notificationsStore.show('复制失败', 'error')
  }
}

const deletePrompt = async () => {
  const confirmed = await modalStore.confirm(
    `确定要删除想法 "${props.prompt.title}" 吗？`,
    '此操作将删除该想法及其所有版本历史，且不可撤销。'
  )
  
  if (confirmed) {
    try {
      await window.api.deletePrompt(props.prompt.id)
      notificationsStore.show('想法删除成功 🗑️', 'success')
      
      // 如果删除的是当前选中的项目，清除选择
      if (appStore.selectedPrompt?.id === props.prompt.id) {
        appStore.selectedPrompt = null
        appStore.currentView = 'welcome'
      }
      
      // 重新加载数据
      await appStore.loadPrompts()
    } catch (error) {
      console.error('删除失败:', error)
      notificationsStore.show('删除失败', 'error')
    }
  }
}

const showVersionHistory = () => {
  modalStore.show('VersionHistoryModal', { prompt: props.prompt })
}

const saveAsTemplate = () => {
  modalStore.show('SaveAsTemplateModal', { prompt: props.prompt })
}
</script>