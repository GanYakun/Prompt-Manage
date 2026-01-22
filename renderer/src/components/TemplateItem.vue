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
      <div class="item-title">{{ template.name }}</div>
      <div class="item-actions" v-show="!selectable">
        <button class="icon-btn" @click.stop="useTemplate" title="使用模板">✨</button>
        <button class="icon-btn" @click.stop="editTemplate" title="编辑">✏️</button>
        <button class="icon-btn" @click.stop="copyTemplate" title="复制">📋</button>
        <button class="icon-btn" @click.stop="deleteTemplate" title="删除">🗑️</button>
      </div>
    </div>
    
    <div class="item-preview" v-if="template.description">{{ template.description }}</div>
    <div class="item-preview" v-else>{{ truncatedContent }}</div>
    
    <div class="item-meta">
      <div class="item-stats">
        <div class="item-date">{{ formatDate(template.updated_at) }}</div>
        <div class="item-usage">使用 {{ template.usage_count || 0 }} 次</div>
      </div>
    </div>
    
    <div class="tags" v-if="template.tags && template.tags.length > 0">
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
  const maxLength = 150
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