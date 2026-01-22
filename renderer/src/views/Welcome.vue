<template>
  <div class="welcome-view">
    <div class="welcome-content">
      <div class="welcome-header">
        <div class="welcome-icon">📝</div>
        <h1 class="welcome-title">欢迎使用我的灵感笔记本</h1>
        <p class="welcome-subtitle">记录每一个好想法，管理每一次灵感迸发</p>
      </div>
      
      <div class="welcome-stats" v-if="hasData">
        <div class="stat-card">
          <div class="stat-number">{{ appStore.promptCount }}</div>
          <div class="stat-label">个想法</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ appStore.templateCount }}</div>
          <div class="stat-label">个模板</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ totalVersions }}</div>
          <div class="stat-label">个版本</div>
        </div>
      </div>
      
      <div class="welcome-actions">
        <button class="action-btn primary" @click="createNewPrompt">
          <span class="btn-icon">✍️</span>
          <div class="btn-content">
            <div class="btn-title">写个新想法</div>
            <div class="btn-desc">记录你的灵感和思考</div>
          </div>
        </button>
        
        <button class="action-btn secondary" @click="createNewTemplate">
          <span class="btn-icon">📄</span>
          <div class="btn-content">
            <div class="btn-title">做个模板</div>
            <div class="btn-desc">创建可重复使用的模板</div>
          </div>
        </button>
        
        <button class="action-btn tertiary" @click="testCreatePrompt">
          <span class="btn-icon">🧪</span>
          <div class="btn-content">
            <div class="btn-title">测试创建</div>
            <div class="btn-desc">测试API调用</div>
          </div>
        </button>
        
        <button class="action-btn tertiary" @click="importData" v-if="!hasData">
          <span class="btn-icon">📥</span>
          <div class="btn-content">
            <div class="btn-title">导入数据</div>
            <div class="btn-desc">从备份文件恢复数据</div>
          </div>
        </button>
      </div>
      
      <div class="welcome-tips" v-if="!hasData">
        <h3>💡 使用小贴士</h3>
        <ul>
          <li>每次修改想法都会自动保存版本历史</li>
          <li>使用分类和标签来组织你的想法</li>
          <li>创建模板可以快速生成相似的想法</li>
          <li>支持全文搜索，快速找到需要的内容</li>
        </ul>
      </div>
      
      <div class="recent-activity" v-if="hasData && recentPrompts.length > 0">
        <h3>📋 最近的想法</h3>
        <div class="recent-list">
          <div 
            v-for="prompt in recentPrompts" 
            :key="prompt.id"
            class="recent-item"
            @click="selectPrompt(prompt)"
          >
            <div class="recent-title">{{ prompt.title }}</div>
            <div class="recent-preview">{{ truncateText(prompt.content, 80) }}</div>
            <div class="recent-date">{{ formatRelativeDate(prompt.updated_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useModalStore } from '../stores/modal'

const appStore = useAppStore()
const modalStore = useModalStore()

const hasData = computed(() => {
  return appStore.promptCount > 0 || appStore.templateCount > 0
})

const totalVersions = computed(() => {
  return appStore.prompts.reduce((total, prompt) => {
    return total + (prompt.version_count || 1)
  }, 0)
})

const recentPrompts = computed(() => {
  return appStore.prompts
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)
})

const createNewPrompt = () => {
  modalStore.show('CreatePromptModal')
}

const createNewTemplate = () => {
  modalStore.show('CreateTemplateModal')
}

const importData = () => {
  modalStore.show('ImportModal')
}

const testCreatePrompt = async () => {
  try {
    console.log('Testing direct API call...')
    const result = await window.api.createPrompt({
      title: 'Test Prompt',
      content: 'This is a test prompt content',
      tags: ['test', 'api'],
      note: 'Test note',
      categories: { scene: 'work' }
    })
    console.log('Test result:', result)
    alert('测试成功！检查控制台查看详细信息')
    
    // 重新加载数据
    await appStore.loadPrompts()
  } catch (error) {
    console.error('Test failed:', error)
    alert('测试失败：' + error.message)
  }
}

const selectPrompt = (prompt) => {
  appStore.selectPrompt(prompt.id)
}

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatRelativeDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays} 天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}
</script>

<style scoped>
.welcome-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  overflow-y: auto;
}

.welcome-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.welcome-header {
  margin-bottom: 40px;
}

.welcome-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.welcome-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  min-width: 100px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  color: white;
  box-shadow: var(--shadow-md);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.action-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.action-btn.tertiary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px dashed var(--border-color);
}

.action-btn.tertiary:hover {
  background: var(--bg-secondary);
  border-style: solid;
}

.btn-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.btn-content {
  flex: 1;
}

.btn-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.btn-desc {
  font-size: 14px;
  opacity: 0.8;
}

.welcome-tips {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 40px;
  text-align: left;
}

.welcome-tips h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.welcome-tips ul {
  margin: 0;
  padding-left: 20px;
}

.welcome-tips li {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.recent-activity {
  text-align: left;
}

.recent-activity h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.recent-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.recent-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
}

.recent-date {
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .welcome-view {
    padding: 20px;
  }
  
  .welcome-title {
    font-size: 24px;
  }
  
  .welcome-subtitle {
    font-size: 16px;
  }
  
  .welcome-stats {
    flex-direction: column;
    align-items: center;
  }
  
  .stat-card {
    width: 100%;
    max-width: 200px;
  }
}
</style>