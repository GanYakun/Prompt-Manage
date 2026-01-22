<template>
  <div 
    class="list-item"
    :class="{ 
      active: selected,
      selectable: selectable
    }"
    @click="handleClick"
  >
    <div class="item-header">
      <div class="item-title">{{ prompt.title }}</div>
      <div class="item-actions" v-show="!selectable">
        <button class="icon-btn" @click.stop="showVersionHistory" title="版本历史">📜</button>
        <button class="icon-btn" @click.stop="editPrompt" title="编辑">✏️</button>
        <button class="icon-btn" @click.stop="copyPrompt" title="复制">📋</button>
        <button class="icon-btn" @click.stop="saveAsTemplate" title="存为模板">📄</button>
        <button class="icon-btn" @click.stop="deletePrompt" title="删除">🗑️</button>
      </div>
    </div>
    
    <div class="item-preview">{{ truncatedContent }}</div>
    
    <div class="item-meta">
      <div class="item-stats">
        <div class="item-date">{{ formatDate(prompt.updated_at) }}</div>
        <div class="item-versions">{{ prompt.version_count || 1 }} 个版本</div>
        <div class="item-usage">使用 {{ prompt.usage_count || 0 }} 次</div>
      </div>
    </div>
    
    <div class="tags" v-if="prompt.tags && prompt.tags.length > 0">
      <span 
        v-for="(tag, index) in visibleTags" 
        :key="tag"
        class="tag"
        :class="{ primary: index === 0 }"
      >{{ tag }}</span>
      <span v-if="hiddenTagsCount > 0" class="tag-more">+{{ hiddenTagsCount }}</span>
    </div>
    
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
  const maxLength = 150
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