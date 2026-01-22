<template>
  <div class="prompt-modal">
    <div class="modal-header">
      <h3 class="modal-title">{{ title || '输入' }}</h3>
    </div>
    
    <div class="modal-content">
      <p class="prompt-message">{{ message }}</p>
      <input 
        ref="inputRef"
        type="text" 
        v-model="inputValue"
        class="prompt-input"
        @keyup.enter="handleConfirm"
        @keyup.escape="handleCancel"
      />
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="handleCancel">
        取消
      </button>
      <button 
        class="btn btn-primary" 
        @click="handleConfirm"
        :disabled="!inputValue.trim()"
      >
        确认
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  defaultValue: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: '输入'
  },
  onConfirm: {
    type: Function,
    required: true
  },
  onCancel: {
    type: Function,
    required: true
  }
})

const inputRef = ref(null)
const inputValue = ref(props.defaultValue)

const handleConfirm = () => {
  if (inputValue.value.trim()) {
    props.onConfirm(inputValue.value.trim())
  }
}

const handleCancel = () => {
  props.onCancel()
}

onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
})
</script>

<style scoped>
.prompt-modal {
  width: 100%;
  max-width: 450px;
}

.modal-header {
  margin-bottom: 20px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-content {
  margin-bottom: 24px;
}

.prompt-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.prompt-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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