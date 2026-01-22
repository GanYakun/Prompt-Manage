<template>
  <div class="app-container">
    <!-- 左侧分类面板 -->
    <CategoryPanel />
    
    <!-- 中间列表面板 -->
    <ListPanel />
    
    <!-- 右侧详情面板 -->
    <DetailPanel />
    
    <!-- 全局组件 -->
    <ModalContainer />
    <NotificationContainer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import CategoryPanel from './components/CategoryPanel.vue'
import ListPanel from './components/ListPanel.vue'
import DetailPanel from './components/DetailPanel.vue'
import ModalContainer from './components/ModalContainer.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import { useAppStore } from './stores/app'
import { useThemeStore } from './stores/theme'

const appStore = useAppStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()
  
  // 初始化应用数据
  try {
    await appStore.initialize()
    console.log('App mounted and initialized successfully')
  } catch (error) {
    console.error('App initialization failed:', error)
  }
})
</script>

<style>
/* 全局样式已在CSS文件中定义 */
</style>