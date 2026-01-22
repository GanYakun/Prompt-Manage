<template>
  <div class="confirm-modal">
    <div class="modal-header">
      <div class="modal-icon">⚠️</div>
      <h3 class="modal-title">{{ title || '确认操作' }}</h3>
    </div>
    
    <div class="modal-content">
      <p class="confirm-message">{{ message }}</p>
      <p v-if="description" class="confirm-description">{{ description }}</p>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="handleCancel">
        取消
      </button>
      <button class="btn btn-danger" @click="handleConfirm">
        确认
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  message: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: '确认操作'
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

const handleConfirm = () => {
  props.onConfirm()
}

const handleCancel = () => {
  props.onCancel()
}
</script>

<style scoped>
.confirm-modal {
  width: 100%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}

.modal-content {
  margin-bottom: 24px;
  text-align: center;
}

.confirm-message {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.confirm-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
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

.btn-danger {
  background: var(--error-color);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>