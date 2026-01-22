<template>
  <div class="edit-template-modal">
    <div class="modal-header">
      <h3 class="modal-title">✏️ 编辑模板</h3>
    </div>
    
    <form @submit.prevent="handleSubmit" class="template-form">
      <div class="form-group">
        <label class="form-label">模板名称</label>
        <input 
          ref="nameRef"
          type="text" 
          v-model="form.name"
          class="form-input"
          placeholder="给模板起个名字..."
          required
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">模板描述 <span class="form-hint">(可选)</span></label>
        <input 
          type="text" 
          v-model="form.description"
          class="form-input"
          placeholder="简单描述这个模板的用途..."
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">模板内容</label>
        <textarea 
          v-model="form.content"
          class="form-textarea"
          placeholder="写下模板内容，可以使用 {{变量名}} 来定义变量..."
          rows="8"
          required
        ></textarea>
        <div class="form-hint-text">
          💡 提示：使用 {{变量名}} 来定义可替换的变量，如 {{姓名}}、{{公司名称}} 等
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">标签 <span class="form-hint">(用空格分隔)</span></label>
        <input 
          type="text" 
          v-model="tagsInput"
          class="form-input"
          placeholder="邮件 报告 通用..."
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">分类</label>
        <div class="category-selectors">
          <div 
            v-for="(categoryData, categoryType) in categoriesStore.allCategories" 
            :key="categoryType"
            class="category-selector"
          >
            <label class="category-label">{{ categoryData.name }}</label>
            <select 
              v-model="form.categories[categoryType]"
              class="form-select"
            >
              <option value="">请选择...</option>
              <option 
                v-for="(item, key) in categoryData.items" 
                :key="key"
                :value="key"
              >{{ item.name }}</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
          <span class="btn-icon">💾</span>保存修改
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useCategoriesStore } from '../../stores/categories'
import { useNotificationsStore } from '../../stores/notifications'
import { useAppStore } from '../../stores/app'

const props = defineProps({
  template: {
    type: Object,
    required: true
  }
})

const modalStore = useModalStore()
const categoriesStore = useCategoriesStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const nameRef = ref(null)
const tagsInput = ref('')

const form = ref({
  name: '',
  description: '',
  content: '',
  categories: {}
})

const canSubmit = computed(() => {
  return form.value.name.trim() && form.value.content.trim()
})

const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  try {
    const tags = tagsInput.value
      .split(/\s+/)
      .filter(tag => tag.trim())
      .map(tag => tag.trim())
    
    // 确保categories对象是可序列化的
    const categories = {}
    if (form.value.categories && typeof form.value.categories === 'object') {
      Object.keys(form.value.categories).forEach(key => {
        const value = form.value.categories[key]
        if (value && typeof value === 'string') {
          categories[key] = value
        }
      })
    }
    
    const updates = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || null,
      content: form.value.content.trim(),
      tags: tags.length > 0 ? tags : [],
      categories: Object.keys(categories).length > 0 ? categories : null
    }
    
    await window.api.updateTemplate(props.template.id, updates)
    
    notificationsStore.show('模板更新成功！📄', 'success')
    modalStore.close()
    
    // 重新加载数据
    await appStore.loadTemplates()
  } catch (error) {
    console.error('更新模板失败:', error)
    notificationsStore.show('更新失败，请重试', 'error')
  }
}

const handleCancel = () => {
  modalStore.close()
}

onMounted(() => {
  if (props.template) {
    form.value.name = props.template.name || ''
    form.value.description = props.template.description || ''
    form.value.content = props.template.content || ''
    form.value.categories = props.template.categories || {}
    
    if (props.template.tags && Array.isArray(props.template.tags)) {
      tagsInput.value = props.template.tags.join(' ')
    }
  }
  
  if (nameRef.value) {
    nameRef.value.focus()
  }
})
</script>

<style scoped>
.edit-template-modal {
  width: 100%;
  max-width: 600px;
}

.modal-header {
  margin-bottom: 24px;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.template-form {
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
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.form-hint {
  font-weight: normal;
  color: var(--text-secondary);
  font-size: 12px;
}

.form-hint-text {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
}

.form-input,
.form-textarea,
.form-select {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

.category-selectors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.category-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>