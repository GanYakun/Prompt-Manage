<template>
  <div class="stats-modal">
    <div class="modal-header">
      <h3 class="modal-title">📊 数据统计</h3>
      <p class="modal-subtitle">查看你的使用情况和数据分析</p>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">⏳</div>
      <p>正在加载统计数据...</p>
    </div>
    
    <div v-else class="stats-content">
      <!-- 总体统计 -->
      <div class="stats-section">
        <h4 class="section-title">📈 总体概况</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">💡</div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalPrompts || 0 }}</div>
              <div class="stat-label">个想法</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalTemplates || 0 }}</div>
              <div class="stat-label">个模板</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔄</div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalUsage || 0 }}</div>
              <div class="stat-label">次使用</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalVersions || 0 }}</div>
              <div class="stat-label">个版本</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 使用趋势 -->
      <div class="stats-section">
        <h4 class="section-title">📅 使用趋势</h4>
        <div class="trend-stats">
          <div class="trend-item">
            <span class="trend-label">今天创建</span>
            <span class="trend-value">{{ stats.createdToday || 0 }} 个</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">本周创建</span>
            <span class="trend-value">{{ stats.createdThisWeek || 0 }} 个</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">本月创建</span>
            <span class="trend-value">{{ stats.createdThisMonth || 0 }} 个</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">平均每天</span>
            <span class="trend-value">{{ averagePerDay }} 个</span>
          </div>
        </div>
      </div>
      
      <!-- 分类统计 -->
      <div class="stats-section" v-if="categoryStats.length > 0">
        <h4 class="section-title">🏷️ 分类分布</h4>
        <div class="category-stats">
          <div 
            v-for="category in categoryStats" 
            :key="category.name"
            class="category-stat-item"
          >
            <div class="category-stat-info">
              <span class="category-stat-icon">{{ category.icon }}</span>
              <span class="category-stat-name">{{ category.name }}</span>
            </div>
            <div class="category-stat-bar">
              <div 
                class="category-stat-fill"
                :style="{ 
                  width: `${(category.count / maxCategoryCount) * 100}%`,
                  backgroundColor: category.color 
                }"
              ></div>
            </div>
            <div class="category-stat-count">{{ category.count }}</div>
          </div>
        </div>
      </div>
      
      <!-- 热门标签 -->
      <div class="stats-section" v-if="popularTags.length > 0">
        <h4 class="section-title">🔥 热门标签</h4>
        <div class="tags-cloud">
          <span 
            v-for="tag in popularTags" 
            :key="tag.name"
            class="tag-item"
            :style="{ fontSize: `${Math.max(12, Math.min(20, tag.count * 2))}px` }"
          >
            {{ tag.name }} ({{ tag.count }})
          </span>
        </div>
      </div>
      
      <!-- 最活跃内容 -->
      <div class="stats-section" v-if="mostUsedItems.length > 0">
        <h4 class="section-title">⭐ 最常使用</h4>
        <div class="top-items">
          <div 
            v-for="(item, index) in mostUsedItems" 
            :key="item.id"
            class="top-item"
            @click="selectItem(item)"
          >
            <div class="top-item-rank">{{ index + 1 }}</div>
            <div class="top-item-icon">{{ item.type === 'prompt' ? '💡' : '📋' }}</div>
            <div class="top-item-info">
              <div class="top-item-title">{{ item.title || item.name }}</div>
              <div class="top-item-usage">使用 {{ item.usage_count }} 次</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 存储信息 -->
      <div class="stats-section">
        <h4 class="section-title">💾 存储信息</h4>
        <div class="storage-stats">
          <div class="storage-item">
            <span class="storage-label">数据库大小</span>
            <span class="storage-value">{{ formatFileSize(stats.databaseSize || 0) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">平均内容长度</span>
            <span class="storage-value">{{ stats.averageContentLength || 0 }} 字符</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">最后备份</span>
            <span class="storage-value">{{ stats.lastBackup ? formatDate(stats.lastBackup) : '从未备份' }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-secondary" @click="refreshStats">刷新数据</button>
      <button class="btn btn-secondary" @click="handleClose">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useModalStore } from '../../stores/modal'
import { useNotificationsStore } from '../../stores/notifications'
import { useAppStore } from '../../stores/app'

const modalStore = useModalStore()
const notificationsStore = useNotificationsStore()
const appStore = useAppStore()

const loading = ref(true)
const stats = ref({})
const categoryStats = ref([])
const popularTags = ref([])
const mostUsedItems = ref([])

const maxCategoryCount = computed(() => {
  return Math.max(...categoryStats.value.map(c => c.count), 1)
})

const averagePerDay = computed(() => {
  if (!stats.value.totalPrompts && !stats.value.totalTemplates) return 0
  
  const total = (stats.value.totalPrompts || 0) + (stats.value.totalTemplates || 0)
  const days = stats.value.daysSinceFirstItem || 1
  
  return Math.round((total / days) * 10) / 10
})

const loadStats = async () => {
  try {
    loading.value = true
    
    // 获取基本统计信息
    const appStats = await window.api.getAppStats()
    stats.value = appStats
    
    // 处理分类统计
    if (appStats.categoryStats) {
      categoryStats.value = Object.entries(appStats.categoryStats).map(([name, data]) => ({
        name: data.name || name,
        icon: data.icon || '📁',
        color: data.color || '#3b82f6',
        count: data.count || 0
      })).sort((a, b) => b.count - a.count).slice(0, 10)
    }
    
    // 处理热门标签
    if (appStats.popularTags) {
      popularTags.value = appStats.popularTags.slice(0, 20)
    }
    
    // 处理最常使用的内容
    if (appStats.mostUsedItems) {
      mostUsedItems.value = appStats.mostUsedItems.slice(0, 10)
    }
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
    notificationsStore.show('加载统计数据失败', 'error')
  } finally {
    loading.value = false
  }
}

const refreshStats = async () => {
  notificationsStore.show('正在刷新统计数据...', 'info', 1000)
  await loadStats()
  notificationsStore.show('统计数据已更新', 'success')
}

const selectItem = (item) => {
  modalStore.close()
  
  if (item.type === 'prompt') {
    appStore.selectPrompt(item.id)
  } else {
    appStore.selectTemplate(item.id)
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const handleClose = () => {
  modalStore.close()
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.stats-modal {
  width: 100%;
  max-width: 900px;
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

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  font-size: 32px;
  margin-bottom: 16px;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-section {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.trend-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.trend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.trend-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.trend-value {
  font-weight: 600;
  color: var(--text-primary);
}

.category-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.category-stat-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.category-stat-icon {
  font-size: 16px;
}

.category-stat-name {
  font-size: 14px;
  color: var(--text-primary);
}

.category-stat-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.category-stat-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.category-stat-count {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: var(--text-primary);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  background: var(--primary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.tag-item:hover {
  opacity: 0.8;
}

.top-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.top-item:hover {
  background: var(--bg-hover);
}

.top-item-rank {
  width: 24px;
  height: 24px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.top-item-icon {
  font-size: 20px;
}

.top-item-info {
  flex: 1;
}

.top-item-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.top-item-usage {
  font-size: 12px;
  color: var(--text-secondary);
}

.storage-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.storage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.storage-item:last-child {
  border-bottom: none;
}

.storage-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.storage-value {
  font-weight: 500;
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}
</style>