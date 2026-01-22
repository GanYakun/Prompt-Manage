<template>
  <div class="create-template-modal">
    <div class="modal-header">
      <h3 class="modal-title">创建新模板 📄</h3>
      <p class="modal-subtitle">创建可重复使用的Prompt模板</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="modal-form">
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">模板名称</span>
          <span class="label-required">*</span>
        </label>
        <input 
          type="text" 
          v-model="formData.name"
          required 
          placeholder="为模板起个名字..." 
          class="form-input"
          ref="nameInput"
        />
        <div class="input-hint">清晰的名称有助于快速找到合适的模板</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">模板内容</span>
          <span class="label-required">*</span>
        </label>
        <textarea 
          v-model="formData.content"
          required 
          placeholder="输入模板内容，可以使用 {{变量名}} 作为占位符..." 
          rows="8" 
          class="form-textarea"
        ></textarea>
        <div class="input-hint">使用 {{变量名}} 创建可替换的占位符，如 {{主题}}、{{风格}} 等</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">描述</span>
          <span class="label-optional">可选</span>
        </label>
        <textarea 
          v-model="formData.description"
          placeholder="描述模板的用途和使用方法..." 
          rows="3" 
          class="form-textarea"
        ></textarea>
        <div class="input-hint">详细的描述有助于他人理解模板的用途</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">标签</span>
          <span class="label-optional">可选</span>
        </label>
        <input 
          type="text" 
          v-model="formData.tags"
          placeholder="模板, 写作, 通用..." 
          class="form-input"
        />
        <div class="input-hint">用逗号分隔多个标签，便于分类管理</div>
      </div>
      
      <!-- 分类选择 -->
      <div class="form-group">
        <label class="form-label">
          <span class="label-text">分类</span>
          <span class="label-optional">可选</span>
        </label>
        <div class="input-hint">为模板选择合适的分类，便于管理和查找</div>
        
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
        <span v-else>创建模板</span>
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

const nameInput = ref(null)
const isSubmitting = ref(false)

const formData = ref({
  name: '',
  content: '',
  description: '',
  tags: ''
})

const selectedCategories = ref({})

const canSubmit = computed(() => {
  return formData.value.name.trim() && formData.value.content.trim()
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
    
    const name = formData.value.name.trim()
    const content = formData.value.content.trim()
    const description = formData.value.description.trim() || ''
    const tagsStr = formData.value.tags.trim()
    
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
    
    console.log('Creating template with data:', { name, content, description, tags, categories })
    
    // 调用API创建模板 - 使用对象参数
    const newTemplate = await window.api.createTemplate({
      name,
      content,
      description,
      tags,
      categories
    })
    
    // 关闭模态框
    modalStore.close()
    
    // 刷新数据
    await appStore.loadTemplates()
    
    // 切换到模板标签页并选择新创建的模板
    appStore.switchTab('templates')
    appStore.selectTemplate(newTemplate.id)
    
    // 显示成功消息
    notificationsStore.show('模板创建成功！📄', 'success')
    
  } catch (error) {
    console.error('创建模板失败:', error)
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
    nameInput.value?.focus()
  })
})
</script>

<style scoped>
.create-template-modal {
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