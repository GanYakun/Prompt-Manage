<template>
  <div class="settings-modal">
    <div class="modal-header">
      <h3 class="modal-title">⚙️ 个人设置</h3>
    </div>
    
    <div class="modal-content">
      <div class="settings-section">
        <h4>主题设置</h4>
        <div class="theme-options">
          <label 
            v-for="(name, theme) in themeStore.themeNames" 
            :key="theme"
            class="theme-option"
          >
            <input 
              type="radio" 
              :value="theme" 
              v-model="selectedTheme"
              @change="handleThemeChange"
            />
            <span>{{ name }}</span>
          </label>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="handleClose">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useThemeStore } from '../../stores/theme'

const modalStore = useModalStore()
const themeStore = useThemeStore()

const selectedTheme = ref(themeStore.currentTheme)

const handleThemeChange = () => {
  themeStore.setTheme(selectedTheme.value)
}

const handleClose = () => {
  modalStore.close()
}

onMounted(() => {
  selectedTheme.value = themeStore.currentTheme
})
</script>

<style scoped>
.settings-modal {
  padding: 20px;
  min-width: 400px;
}

.modal-title {
  margin-bottom: 24px;
  color: var(--text-primary);
  text-align: center;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.theme-option:hover {
  background: var(--bg-secondary);
}

.theme-option input[type="radio"] {
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: center;
}
</style>