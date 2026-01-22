import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const isOpen = ref(false)
  const component = ref(null)
  const props = ref({})
  const options = ref({})
  
  const show = (modalComponent, modalProps = {}, modalOptions = {}) => {
    component.value = modalComponent
    props.value = modalProps
    options.value = {
      title: '',
      size: 'medium',
      closable: true,
      className: '',
      ...modalOptions
    }
    isOpen.value = true
    
    // 防止背景滚动
    document.body.classList.add('modal-open')
  }
  
  const close = () => {
    isOpen.value = false
    component.value = null
    props.value = {}
    options.value = {}
    
    // 恢复背景滚动
    document.body.classList.remove('modal-open')
  }
  
  const confirm = (message, description = '', title = '确认') => {
    return new Promise((resolve) => {
      show('ConfirmModal', {
        message,
        description,
        title,
        onConfirm: () => {
          close()
          resolve(true)
        },
        onCancel: () => {
          close()
          resolve(false)
        }
      }, {
        title: '',
        size: 'small',
        className: 'modern-modal'
      })
    })
  }
  
  const prompt = (message, defaultValue = '', title = '输入') => {
    return new Promise((resolve) => {
      show('PromptModal', {
        message,
        defaultValue,
        title,
        onConfirm: (value) => {
          close()
          resolve(value)
        },
        onCancel: () => {
          close()
          resolve(null)
        }
      }, {
        title: '',
        size: 'medium',
        className: 'modern-modal'
      })
    })
  }
  
  return {
    isOpen,
    component,
    props,
    options,
    show,
    close,
    confirm,
    prompt
  }
})