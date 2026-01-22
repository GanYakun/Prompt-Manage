import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 早期主题应用，避免闪烁
const savedTheme = localStorage.getItem('app-theme') || 'light'
const root = document.documentElement

if (savedTheme === 'auto') {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.setAttribute('data-theme', 'light')
  }
} else {
  root.setAttribute('data-theme', savedTheme)
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')