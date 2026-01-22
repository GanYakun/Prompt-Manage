<template>
  <Teleport to="body">
    <div 
      v-if="modalStore.isOpen" 
      class="modal-overlay"
      @click="handleOverlayClick"
    >
      <div 
        class="modal-container"
        :class="[
          `modal-${modalStore.options.size}`,
          modalStore.options.className
        ]"
        @click.stop
      >
        <div class="modal-header" v-if="modalStore.options.title">
          <h3 class="modal-title">{{ modalStore.options.title }}</h3>
          <button 
            v-if="modalStore.options.closable"
            class="modal-close"
            @click="modalStore.close"
          >×</button>
        </div>
        
        <div class="modal-body">
          <component 
            :is="getModalComponent(modalStore.component)"
            v-bind="modalStore.props"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useModalStore } from '../stores/modal'
import ConfirmModal from './modals/ConfirmModal.vue'
import PromptModal from './modals/PromptModal.vue'
import CreatePromptModal from './modals/CreatePromptModal.vue'
import EditPromptModal from './modals/EditPromptModal.vue'
import CreateTemplateModal from './modals/CreateTemplateModal.vue'
import EditTemplateModal from './modals/EditTemplateModal.vue'
import CreateFromTemplateModal from './modals/CreateFromTemplateModal.vue'
import CustomCategoryModal from './modals/CustomCategoryModal.vue'
import AdvancedSearchModal from './modals/AdvancedSearchModal.vue'
import StatsModal from './modals/StatsModal.vue'
import SettingsModal from './modals/SettingsModal.vue'
import VersionHistoryModal from './modals/VersionHistoryModal.vue'
import SaveAsTemplateModal from './modals/SaveAsTemplateModal.vue'

const modalStore = useModalStore()

const modalComponents = {
  ConfirmModal,
  PromptModal,
  CreatePromptModal,
  EditPromptModal,
  CreateTemplateModal,
  EditTemplateModal,
  CreateFromTemplateModal,
  CustomCategoryModal,
  AdvancedSearchModal,
  StatsModal,
  SettingsModal,
  VersionHistoryModal,
  SaveAsTemplateModal
}

const getModalComponent = (componentName) => {
  return modalComponents[componentName] || null
}

const handleOverlayClick = () => {
  if (modalStore.options.closable) {
    modalStore.close()
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-small {
  width: 400px;
  max-width: 90vw;
}

.modal-medium {
  width: 600px;
  max-width: 90vw;
}

.modal-large {
  width: 800px;
  max-width: 95vw;
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
</style>