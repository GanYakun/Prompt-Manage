<template>
  <div class="custom-category-modal">
    <div class="modal-header">
      <h3 class="modal-title">➕ 管理我的分类</h3>
      <p class="modal-subtitle">创建和管理你的个人分类系统</p>
    </div>
    
    <div class="category-management">
      <!-- 创建新分类组 -->
      <div class="section">
        <h4 class="section-title">创建新分类组</h4>
        <form @submit.prevent="createCategoryGroup" class="create-group-form">
          <div class="form-row">
            <input 
              type="text" 
              v-model="newGroup.name"
              class="form-input"
              placeholder="分类组名称，如：项目类型"
              required
            />
            <select v-model="newGroup.icon" class="form-select" required>
              <option value="">选择图标</option>
              <option v-for="icon in iconOptions" :key="icon.value" :value="icon.value">
                {{ icon.icon }} {{ icon.label }}
              </option>
            </select>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="!canCreateGroup">
              <span class="btn-icon">➕</span>创建
            </button>
          </div>
        </form>
      </div>
      
      <!-- 现有分类组管理 -->
      <div class="section">
        <h4 class="section-title">现有分类组</h4>
        <div class="groups-list">
          <div 
            v-for="(groupData, groupType) in customCategories" 
            :key="groupType"
            class="group-item"
          >
            <div class="group-header">
              <div class="group-info">
                <span class="group-icon">{{ groupData.icon }}</span>
                <span class="group-name">{{ groupData.name }}</span>
                <span class="group-count">({{ Object.keys(groupData.items || {}).length }} 个分类)</span>
              </div>
              <div class="group-actions">
                <button 
                  class="icon-btn" 
                  @click="toggleGroup(groupType)"
                  :title="groupData.expanded ? '收起' : '展开'"
                >
                  {{ groupData.expanded ? '▼' : '▶' }}
                </button>
                <button 
                  class="icon-btn" 
                  @click="deleteGroup(groupType)"
                  title="删除分类组"
                >🗑️</button>
              </div>
            </div>
            
            <div v-if="groupData.expanded" class="group-content">
              <!-- 添加新分类 -->
              <div class="add-category-form">
                <div class="form-row">
                  <input 
                    type="text" 
                    :value="getNewCategoryName(groupType)"
                    @input="setNewCategoryName(groupType, $event.target.value)"
                    class="form-input form-input-sm"
                    placeholder="分类名称"
                  />
                  <select 
                    :value="getNewCategoryIcon(groupType)"
                    @change="setNewCategoryIcon(groupType, $event.target.value)"
                    class="form-select form-select-sm"
                  >
                    <option value="">选择图标</option>
                    <option v-for="icon in iconOptions" :key="icon.value" :value="icon.value">
                      {{ icon.icon }} {{ icon.label }}
                    </option>
                  </select>
                  <select 
                    :value="getNewCategoryColor(groupType)"
                    @change="setNewCategoryColor(groupType, $event.target.value)"
                    class="form-select form-select-sm"
                  >
                    <option value="">选择颜色</option>
                    <option v-for="color in colorOptions" :key="color.value" :value="color.value">
                      {{ color.name }}
                    </option>
                  </select>
                  <button 
                    type="button" 
                    class="btn btn-primary btn-sm"
                    @click="addCategoryToGroup(groupType)"
                    :disabled="!canAddCategory(groupType)"
                  >
                    <span class="btn-icon">➕</span>添加
                  </button>
                </div>
              </div>
              
              <!-- 现有分类列表 -->
              <div class="categories-list">
                <div 
                  v-for="(item, key) in groupData.items" 
                  :key="key"
                  class="category-item"
                >
                  <div class="category-info">
                    <span class="category-icon">{{ item.icon }}</span>
                    <span class="category-name">{{ item.name }}</span>
                    <span 
                      class="category-color-preview" 
                      :style="{ backgroundColor: item.color }"
                    ></span>
                  </div>
                  <div class="category-actions">
                    <button 
                      class="icon-btn" 
                      @click="editCategory(groupType, key, item)"
                      title="编辑"
                    >✏️</button>
                    <button 
                      class="icon-btn" 
                      @click="deleteCategory(groupType, key)"
                      title="删除"
                    >🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="handleClose">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useCategoriesStore } from '../../stores/categories'
import { useNotificationsStore } from '../../stores/notifications'

const modalStore = useModalStore()
const categoriesStore = useCategoriesStore()
const notificationsStore = useNotificationsStore()

const customCategories = ref({})
const iconOptions = ref([])
const colorOptions = ref([])

const newGroup = ref({
  name: '',
  icon: ''
})

const newCategory = ref({})

const canCreateGroup = computed(() => {
  return newGroup.value.name.trim() && newGroup.value.icon
})

const canAddCategory = (groupType) => {
  const category = newCategory.value[groupType]
  return category?.name?.trim() && category?.icon && category?.color
}

// 辅助方法来处理嵌套对象的v-model绑定
const getNewCategoryName = (groupType) => {
  return newCategory.value[groupType]?.name || ''
}

const setNewCategoryName = (groupType, value) => {
  if (!newCategory.value[groupType]) {
    newCategory.value[groupType] = {}
  }
  newCategory.value[groupType].name = value
}

const getNewCategoryIcon = (groupType) => {
  return newCategory.value[groupType]?.icon || ''
}

const setNewCategoryIcon = (groupType, value) => {
  if (!newCategory.value[groupType]) {
    newCategory.value[groupType] = {}
  }
  newCategory.value[groupType].icon = value
}

const getNewCategoryColor = (groupType) => {
  return newCategory.value[groupType]?.color || ''
}

const setNewCategoryColor = (groupType, value) => {
  if (!newCategory.value[groupType]) {
    newCategory.value[groupType] = {}
  }
  newCategory.value[groupType].color = value
}

const toggleGroup = (groupType) => {
  if (customCategories.value[groupType]) {
    customCategories.value[groupType].expanded = !customCategories.value[groupType].expanded
  }
}

const createCategoryGroup = async () => {
  if (!canCreateGroup.value) return
  
  try {
    const groupData = {
      name: newGroup.value.name.trim(),
      icon: newGroup.value.icon,
      expanded: true,
      items: {}
    }
    
    await window.api.createCustomCategoryGroup(groupData)
    
    notificationsStore.show('分类组创建成功！', 'success')
    
    // 重置表单
    newGroup.value = { name: '', icon: '' }
    
    // 重新加载数据
    await loadCustomCategories()
  } catch (error) {
    console.error('创建分类组失败:', error)
    notificationsStore.show('创建失败，请重试', 'error')
  }
}

const addCategoryToGroup = async (groupType) => {
  if (!canAddCategory(groupType)) return
  
  try {
    const categoryData = {
      name: newCategory.value[groupType].name.trim(),
      icon: newCategory.value[groupType].icon,
      color: newCategory.value[groupType].color
    }
    
    await window.api.addCategoryToGroup(groupType, categoryData)
    
    notificationsStore.show('分类添加成功！', 'success')
    
    // 重置表单
    if (!newCategory.value[groupType]) {
      newCategory.value[groupType] = {}
    }
    newCategory.value[groupType] = { name: '', icon: '', color: '' }
    
    // 重新加载数据
    await loadCustomCategories()
  } catch (error) {
    console.error('添加分类失败:', error)
    notificationsStore.show('添加失败，请重试', 'error')
  }
}

const editCategory = async (groupType, key, item) => {
  // 简单的编辑实现
  const newName = await modalStore.prompt('编辑分类名称', item.name, '编辑分类')
  if (newName && newName !== item.name) {
    try {
      await window.api.updateCustomCategory(key, { name: newName })
      notificationsStore.show('分类更新成功！', 'success')
      await loadCustomCategories()
    } catch (error) {
      console.error('更新分类失败:', error)
      notificationsStore.show('更新失败，请重试', 'error')
    }
  }
}

const deleteCategory = async (groupType, key) => {
  const confirmed = await modalStore.confirm(
    '确定要删除这个分类吗？',
    '删除后，使用此分类的内容将失去分类标记。'
  )
  
  if (confirmed) {
    try {
      await window.api.deleteCustomCategory(key)
      notificationsStore.show('分类删除成功！', 'success')
      await loadCustomCategories()
    } catch (error) {
      console.error('删除分类失败:', error)
      notificationsStore.show('删除失败，请重试', 'error')
    }
  }
}

const deleteGroup = async (groupType) => {
  const confirmed = await modalStore.confirm(
    '确定要删除整个分类组吗？',
    '这将删除分类组及其下的所有分类，且不可撤销。'
  )
  
  if (confirmed) {
    try {
      await window.api.deleteCustomCategoryGroup(groupType)
      notificationsStore.show('分类组删除成功！', 'success')
      await loadCustomCategories()
    } catch (error) {
      console.error('删除分类组失败:', error)
      notificationsStore.show('删除失败，请重试', 'error')
    }
  }
}

const loadCustomCategories = async () => {
  try {
    customCategories.value = await window.api.getAllCustomCategories()
    
    // 初始化新分类表单
    Object.keys(customCategories.value).forEach(groupType => {
      if (!newCategory.value[groupType]) {
        newCategory.value[groupType] = { name: '', icon: '', color: '' }
      }
    })
  } catch (error) {
    console.error('加载自定义分类失败:', error)
  }
}

const loadOptions = async () => {
  try {
    iconOptions.value = await window.api.getCustomCategoryIconOptions()
    colorOptions.value = await window.api.getCustomCategoryColorOptions()
  } catch (error) {
    console.error('加载选项失败:', error)
    // 提供默认选项
    iconOptions.value = [
      { value: '📁', icon: '📁', label: '文件夹' },
      { value: '🏷️', icon: '🏷️', label: '标签' },
      { value: '⭐', icon: '⭐', label: '星星' },
      { value: '🎯', icon: '🎯', label: '目标' },
      { value: '💼', icon: '💼', label: '工作' }
    ]
    colorOptions.value = [
      { value: '#3b82f6', name: '蓝色' },
      { value: '#10b981', name: '绿色' },
      { value: '#f59e0b', name: '橙色' },
      { value: '#ef4444', name: '红色' },
      { value: '#8b5cf6', name: '紫色' }
    ]
  }
}

const handleClose = () => {
  modalStore.close()
}

onMounted(async () => {
  await Promise.all([
    loadCustomCategories(),
    loadOptions()
  ])
})
</script>

<style scoped>
.custom-category-modal {
  width: 100%;
  max-width: 800px;
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

.category-management {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--bg-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-input,
.form-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.form-input-sm,
.form-select-sm {
  padding: 6px 10px;
  font-size: 13px;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.group-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  font-size: 16px;
}

.group-name {
  font-weight: 500;
  color: var(--text-primary);
}

.group-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-actions {
  display: flex;
  gap: 4px;
}

.group-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-category-form {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px dashed var(--border-color);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-size: 14px;
  color: var(--text-primary);
}

.category-color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
}

.category-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: background-color 0.2s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
}

.modal-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>