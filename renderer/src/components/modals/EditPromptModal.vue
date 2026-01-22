<template>
  <div class="edit-prompt-modal">
    <div class="modal-header">
      <h3 class="modal-title">✏️ 编辑想法</h3>
    </div>
    
    <form @submit.prevent="handleSubmit" class="prompt-form">
      <div class="form-group">
        <label class="form-label">想法标题</label>
        <input 
          ref="titleRef"
          type="text" 
          v-model="form.title"
          class="form-input"
          placeholder="给你的想法起个名字..."
          required
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">想法内容</label>
        <textarea 
          v-model="form.content"
          class="form-textarea"
          placeholder="写下你的想法..."
          rows="8"
          required
        ></textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">标签 <span class="form-hint">(用空格分隔)</span></label>
        <input 
          type="text" 
          v-model="tagsInput"
          class="form-input"
          placeholder="工作 创意 重要..."
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
      
      <div class="form-group">
        <label class="form-label">更新说明 <span class="form-hint">(可选)</span></label>
        <input 
          type="text" 
          v-model="form.note"
          class="form-input"
          placeholder="简单说明这次修改了什么..."
        />
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
  prompt: {
    type: Object,
    required: true
  }
})

const modalStore = useModalStore()
const categoriesStore = useCategoriesStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const titleRef = ref(null)
const tagsInput = ref('')

const form = ref({
  title: '',
  content: '',
  categories: {},
  note: ''
})

const canSubmit = computed(() => {
  return form.value.title.trim() && form.value.content.trim()
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
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      tags: tags.length > 0 ? tags : [],
      categories: Object.keys(categories).length > 0 ? categories : null
    }
    
    await window.api.updatePrompt(props.prompt.id, updates, form.value.note.trim() || null)
    
    notificationsStore.show('想法更新成功！✨', 'success')
    modalStore.close()
    
    // 重新加载数据
    await appStore.loadPrompts()
  } catch (error) {
    console.error('更新想法失败:', error)
    notificationsStore.show('更新失败，请重试', 'error')
  }
}

const handleCancel = () => {
  modalStore.close()
}

onMounted(() => {
  if (props.prompt) {
    form.value.title = props.prompt.title || ''
    form.value.content = props.prompt.content || ''
    form.value.categories = props.prompt.categories || {}
    
    if (props.prompt.tags && Array.isArray(props.prompt.tags)) {
      tagsInput.value = props.prompt.tags.join(' ')
    }
  }
  
  if (titleRef.value) {
    titleRef.value.focus()
  }
})
</script>

<style scoped>
.edit-prompt-modal {
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

.prompt-form {
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