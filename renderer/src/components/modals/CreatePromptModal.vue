<template>
  <div class="create-prompt-modal">
    <div class="modal-header">
      <h3 class="modal-title">记录新想法 ✍️</h3>
      <p class="modal-subtitle">写下你的灵感，我来帮你保存每个版本</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="modal-form">
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">给想法起个名字</span>
          <span class="label-required">*</span>
        </label>
        <input 
          type="text" 
          v-model="formData.title"
          required 
          placeholder="比如：周末计划、工作思路、学习笔记..." 
          class="form-input"
          ref="titleInput"
        />
        <div class="input-hint">简单描述一下这个想法是关于什么的</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">详细内容</span>
          <span class="label-required">*</span>
        </label>
        <textarea 
          v-model="formData.content"
          required 
          placeholder="在这里写下你的想法、计划、思路或者任何你想记录的内容..." 
          rows="8" 
          class="form-textarea"
        ></textarea>
        <div class="input-hint">把你的想法详细写下来，想写多少写多少</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">添加标签</span>
          <span class="label-optional">可选</span>
        </label>
        <input 
          type="text" 
          v-model="formData.tags"
          placeholder="工作, 学习, 生活..." 
          class="form-input"
        />
        <div class="input-hint">用逗号分隔多个标签，方便以后查找</div>
      </div>
      
      <!-- 分类选择 -->
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">分类</span>
          <span class="label-optional">可选</span>
        </label>
        <div class="input-hint">为想法选择合适的分类，便于管理和查找</div>
        
        <div 
          v-for="(categoryData, categoryType) in categoriesStore.allCategories" 
          :key="categoryType"
          class="category-selector"
        >
          <label class="category-selector-label">
            <span class="category-group-icon">{{ categoryData.icon }}</span>
            {{ categoryData.name }}
          </label>
          <div class="category-selector-grid">
            <div 
              v-for="(item, key) in categoryData.items" 
              :key="key"
              class="category-option"
              :class="{ selected: selectedCategories[categoryType] === key }"
              @click="toggleCategory(categoryType, key)"
            >
              <span class="category-option-icon">{{ item.icon }}</span>
              <span class="category-option-text">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">备注说明</span>
          <span class="label-optional">可选</span>
        </label>
        <input 
          type="text" 
          v-model="formData.note"
          placeholder="记录一下这次写了什么..." 
          class="form-input"
        />
        <div class="input-hint">记录这个版本的特点或变更内容</div>
      </div>
    </form>
    
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" @click="handleClose">
        取消
      </button>
      <button 
        type="button" 
        class="btn btn-primary" 
        @click="handleSubmit"
        :disabled="!canSubmit || isSubmitting"
      >
        <span v-if="isSubmitting">创建中...</span>
        <span v-else>保存想法</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useCategoriesStore } from '../../stores/categories'
import { useAppStore } from '../../stores/app'
import { useNotificationsStore } from '../../stores/notifications'

const modalStore = useModalStore()
const categoriesStore = useCategoriesStore()
const appStore = useAppStore()
const notificationsStore = useNotificationsStore()

const titleInput = ref(null)
const isSubmitting = ref(false)

const formData = ref({
  title: '',
  content: '',
  tags: '',
  note: '初始版本'
})

const selectedCategories = ref({})

const canSubmit = computed(() => {
  return formData.value.title.trim() && formData.value.content.trim()
})

const toggleCategory = (categoryType, categoryKey) => {
  if (selectedCategories.value[categoryType] === categoryKey) {
    delete selectedCategories.value[categoryType]
  } else {
    selectedCategories.value[categoryType] = categoryKey
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return
  
  try {
    isSubmitting.value = true
    
    console.log('Form data before processing:', formData.value)
    console.log('Selected categories:', selectedCategories.value)
    
    const title = formData.value.title.trim()
    const content = formData.value.content.trim()
    const tagsStr = formData.value.tags.trim()
    const note = formData.value.note.trim() || '初始版本'
    
    console.log('Processed values:', { title, content, tagsStr, note })
    
    // 处理标签 - 确保是纯数组
    const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : []
    
    // 处理分类 - 确保传递纯JavaScript对象，避免克隆错误
    let categories = null
    if (Object.keys(selectedCategories.value).length > 0) {
      categories = {}
      Object.keys(selectedCategories.value).forEach(key => {
        const value = selectedCategories.value[key]
        if (value && typeof value === 'string') {
          categories[key] = value
        }
      })
    }
    
    console.log('Final API call parameters:', { title, content, tags, note, categories })
    
    // 调用API创建Prompt - 使用对象参数
    const newPrompt = await window.api.createPrompt({
      title,
      content,
      tags,
      note,
      categories
    })
    
    // 关闭模态框
    modalStore.close()
    
    // 刷新数据
    console.log('Reloading prompts after creation...')
    await appStore.loadPrompts()
    console.log('Prompts after reload:', appStore.prompts.length)
    console.log('Filtered prompts:', appStore.filteredPrompts.length)
    
    // 确保切换到prompts标签页
    appStore.switchTab('prompts')
    
    // 选择新创建的Prompt
    appStore.selectPrompt(newPrompt.id)
    
    // 显示成功消息
    notificationsStore.show('想法保存成功！✨', 'success')
    
  } catch (error) {
    console.error('创建Prompt失败:', error)
    notificationsStore.show('创建失败: ' + error.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  modalStore.close()
}

onMounted(() => {
  nextTick(() => {
    titleInput.value?.focus()
  })
})
</script>

<style scoped>
.create-prompt-modal {
  width: 100%;
  max-width: 600px;
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

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: var(--text-primary);
}

.label-required {
  color: var(--error-color);
}

.label-optional {
  color: var(--text-tertiary);
  font-size: 12px;
}

.form-input,
.form-textarea {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.category-selector {
  margin-bottom: 16px;
}

.category-selector-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.category-group-icon {
  font-size: 16px;
}

.category-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
}

.category-option:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.category-option.selected {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.category-option-icon {
  font-size: 14px;
}

.category-option-text {
  font-size: 13px;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>