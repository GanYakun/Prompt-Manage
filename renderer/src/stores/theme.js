import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('light')
  
  const themeNames = {
    'light': '浅色主题',
    'dark': '深色主题',
    'auto': '跟随系统主题'
  }
  
  const initTheme = () => {
    const savedTheme = localStorage.getItem('app-theme') || 'light'
    setTheme(savedTheme)
    
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleSystemThemeChange = () => {
        if (currentTheme.value === 'auto') {
          applyTheme('auto')
        }
      }
      
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      
      // 初始检查系统主题
      if (savedTheme === 'auto') {
        handleSystemThemeChange()
      }
    }
  }
  
  const setTheme = (theme) => {
    currentTheme.value = theme
    localStorage.setItem('app-theme', theme)
    applyTheme(theme)
  }
  
  const applyTheme = (theme) => {
    const root = document.documentElement
    
    // 移除现有主题
    root.removeAttribute('data-theme')
    
    if (theme === 'auto') {
      // 跟随系统主题
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.setAttribute('data-theme', 'dark')
      } else {
        root.setAttribute('data-theme', 'light')
      }
    } else {
      root.setAttribute('data-theme', theme)
    }
  }
  
  const getThemeName = (theme) => {
    return themeNames[theme] || '默认主题'
  }
  
  return {
    currentTheme,
    themeNames,
    initTheme,
    setTheme,
    applyTheme,
    getThemeName
  }
})