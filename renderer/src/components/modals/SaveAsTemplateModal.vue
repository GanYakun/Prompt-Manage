<template>
  <div class="save-as-template-modal">
    <div class="modal-header">
      <h3 class="modal-title">📄 存为模板</h3>
      <p class="modal-subtitle">将想法 "{{ prompt?.title }}" 保存为可重复使用的模板</p>
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
          placeholder="模板内容，可以使用 {{变量名}} 来定义变量..."
          rows="8"
          required
        ></textarea>
        <div class="form-hint-text">
          💡 提示：你可以编辑内容并使用 {{变量名}} 来定义可替换的变量
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">标签 <span class="form-hint">(用空格分隔)</span></label>
        <input 
          type="text" 
          v-model="tagsInput"
          class="form-input"
          placeholder="模板 通用..."
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
          <span class="btn-icon">💾</span>保存为模板
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
    
    // 添加额外的标签
    const additionalTags = ['基于想法', '模板']
    const allTags = [...new Set([...tags, ...additionalTags])]
    
    await window.api.createTemplateFromPrompt(
      props.prompt.id,
      form.value.name.trim(),
      form.value.description.trim() || null,
      allTags
    )
    
    notificationsStore.show('模板创建成功！📄', 'success')
    modalStore.close()
    
    // 重新加载数据
    await appStore.loadTemplates()
  } catch (error) {
    console.error('创建模板失败:', error)
    notificationsStore.show('创建失败，请重试', 'error')
  }
}

const handleCancel = () => {
  modalStore.close()
}

onMounted(() => {
  if (props.prompt) {
    form.value.name = `${props.prompt.title} - 模板`
    form.value.content = props.prompt.content
    form.value.categories = props.prompt.categories || {}
    
    if (props.prompt.tags && Array.isArray(props.prompt.tags)) {
      tagsInput.value = [...props.prompt.tags, '模板'].join(' ')
    } else {
      tagsInput.value = '模板'
    }
  }
  
  if (nameRef.value) {
    nameRef.value.focus()
  }
})
</script>

<style scoped>
.save-as-template-modal {
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