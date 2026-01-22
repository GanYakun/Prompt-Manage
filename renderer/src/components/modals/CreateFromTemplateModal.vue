<template>
  <div class="create-from-template-modal">
    <div class="modal-header">
      <h3 class="modal-title">✨ 基于模板创建想法</h3>
      <p class="modal-subtitle">模板：{{ template?.name }}</p>
    </div>
    
    <form @submit.prevent="handleSubmit" class="template-form">
      <div class="form-group">
        <label class="form-label">想法标题</label>
        <input 
          ref="titleRef"
          type="text" 
          v-model="form.title"
          class="form-input"
          placeholder="给基于模板创建的想法起个名字..."
          required
        />
      </div>
      
      <div class="form-group" v-if="templateVariables.length > 0">
        <label class="form-label">模板变量</label>
        <div class="variables-section">
          <div 
            v-for="variable in templateVariables" 
            :key="variable.name"
            class="variable-input-group"
          >
            <label class="variable-label">{{ variable.name }}</label>
            <input 
              type="text" 
              v-model="variableValues[variable.name]"
              class="form-input"
              :placeholder="variable.example || `请输入${variable.name}...`"
            />
            <div v-if="variable.description" class="variable-description">
              {{ variable.description }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">生成的内容</label>
        <textarea 
          v-model="generatedContent"
          class="form-textarea"
          placeholder="内容将根据模板和变量自动生成..."
          rows="8"
          readonly
        ></textarea>
        <div class="form-hint-text">
          💡 内容会根据你填写的变量自动生成，你也可以手动修改
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">标签 <span class="form-hint">(用空格分隔)</span></label>
        <input 
          type="text" 
          v-model="tagsInput"
          class="form-input"
          placeholder="基于模板 自动生成..."
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
          <span class="btn-icon">✨</span>创建想法
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

const titleRef = ref(null)
const tagsInput = ref('')
const variableValues = ref({})

const form = ref({
  title: '',
  categories: {}
})

const templateVariables = computed(() => {
  if (!props.template?.content) return []
  
  // 提取模板中的变量 {{变量名}}
  const matches = props.template.content.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []
  
  const variables = []
  const seen = new Set()
  
  matches.forEach(match => {
    const name = match.replace(/[{}]/g, '').trim()
    if (!seen.has(name)) {
      seen.add(name)
      variables.push({
        name,
        description: '',
        example: ''
      })
    }
  })
  
  return variables
})

const generatedContent = computed(() => {
  if (!props.template?.content) return ''
  
  let content = props.template.content
  
  // 替换变量
  templateVariables.value.forEach(variable => {
    const value = variableValues.value[variable.name] || `{{${variable.name}}}`
    const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g')
    content = content.replace(regex, value)
  })
  
  return content
})

const canSubmit = computed(() => {
  return form.value.title.trim() && generatedContent.value.trim()
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
    
    const customizations = {
      title: form.value.title.trim(),
      variables: variableValues.value,
      tags: tags.length > 0 ? tags : [],
      categories: Object.keys(categories).length > 0 ? categories : null
    }
    
    await window.api.createPromptFromTemplate(props.template.id, customizations)
    
    notificationsStore.show('基于模板创建想法成功！✨', 'success')
    modalStore.close()
    
    // 重新加载数据
    await appStore.loadPrompts()
  } catch (error) {
    console.error('基于模板创建失败:', error)
    notificationsStore.show('创建失败，请重试', 'error')
  }
}

const handleCancel = () => {
  modalStore.close()
}

onMounted(() => {
  if (props.template) {
    form.value.title = `基于${props.template.name}的想法`
    form.value.categories = props.template.categories || {}
    
    if (props.template.tags && Array.isArray(props.template.tags)) {
      tagsInput.value = [...props.template.tags, '基于模板'].join(' ')
    } else {
      tagsInput.value = '基于模板'
    }
    
    // 初始化变量值
    templateVariables.value.forEach(variable => {
      variableValues.value[variable.name] = ''
    })
  }
  
  if (titleRef.value) {
    titleRef.value.focus()
  }
})

// 监听变量值变化，自动更新内容
watch(variableValues, () => {
  // 内容会通过computed自动更新
}, { deep: true })
</script>

<style scoped>
.create-from-template-modal {
  width: 100%;
  max-width: 700px;
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

.variables-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.variable-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variable-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  font-family: monospace;
}

.variable-description {
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
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

.form-textarea[readonly] {
  background: var(--bg-secondary);
  color: var(--text-secondary);
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