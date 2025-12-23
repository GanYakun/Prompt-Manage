// UI组件

// 通知组件
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationContainer');
        this.notifications = new Map();
    }

    show(message, type = 'info', duration = 5000) {
        const id = window.utils.generateId();
        const notification = this.createNotification(id, message, type);
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
        
        return id;
    }

    createNotification(id, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getIcon(type)}</div>
                <div class="notification-message">${window.utils.escapeHtml(message)}</div>
                <button class="notification-close" onclick="window.components.notifications.remove('${id}')">×</button>
            </div>
        `;
        
        return notification;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }
}

// 模态框组件
class ModalManager {
    constructor() {
        this.container = document.getElementById('modalContainer');
        this.currentModal = null;
    }

    show(content, options = {}) {
        this.close(); // 关闭现有模态框
        
        const modal = this.createModal(content, options);
        this.container.appendChild(modal);
        this.currentModal = modal;
        
        // 焦点管理
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
        
        // ESC键关闭
        this.handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleEsc);
        
        return modal;
    }

    createModal(content, options) {
        const {
            title = '',
            size = 'medium',
            closable = true,
            className = ''
        } = options;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = `modal modal-${size} ${className}`;
        
        let modalHTML = '';
        
        if (title || closable) {
            modalHTML += `
                <div class="modal-header">
                    <h3 class="modal-title">${window.utils.escapeHtml(title)}</h3>
                    ${closable ? '<button class="modal-close" onclick="window.components.modal.close()">×</button>' : ''}
                </div>
            `;
        }
        
        modalHTML += `<div class="modal-body">${content}</div>`;
        
        modal.innerHTML = modalHTML;
        overlay.appendChild(modal);
        
        // 点击遮罩关闭
        if (closable) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });
        }
        
        // 防止模态框内容滚动时影响背景
        document.body.classList.add('modal-open');
        
        return overlay;
    }

    close() {
        if (this.currentModal) {
            console.log('开始关闭模态框');
            
            // 移除事件监听器
            if (this.handleEsc) {
                document.removeEventListener('keydown', this.handleEsc);
                this.handleEsc = null;
            }
            
            // 恢复背景滚动
            document.body.classList.remove('modal-open');
            
            // 清理模态框内容中的事件监听器
            if (this.currentModal) {
                const buttons = this.currentModal.querySelectorAll('button[onclick]');
                buttons.forEach(button => {
                    button.removeAttribute('onclick');
                });
            }
            
            // 立即移除模态框，不等待动画
            if (this.currentModal && this.currentModal.parentNode) {
                this.currentModal.parentNode.removeChild(this.currentModal);
            }
            this.currentModal = null;
            
            // 确保页面重新获得焦点和交互能力
            document.body.style.pointerEvents = '';
            document.documentElement.style.pointerEvents = '';
            
            // 强制清理模态框容器
            const modalContainer = document.getElementById('modalContainer');
            if (modalContainer) {
                modalContainer.innerHTML = '';
            }
            
            console.log('模态框关闭完成');
        }
    }

    confirm(message, description = '', title = '确认') {
        return new Promise((resolve) => {
            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">${window.utils.escapeHtml(title)}</h2>
                        <p class="modal-subtitle">请确认您的操作</p>
                    </div>
                    
                    <div class="confirm-dialog" style="padding: 32px;">
                        <p class="confirm-message">${window.utils.escapeHtml(message)}</p>
                        ${description ? `<p class="confirm-description">${window.utils.escapeHtml(description)}</p>` : ''}
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button class="btn-modern btn-secondary-modern confirm-cancel-btn">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button class="btn-modern btn-primary-modern confirm-ok-btn">
                            <span class="btn-icon">✓</span>
                            确认
                        </button>
                    </div>
                </div>
            `;
            
            this.confirmResolve = resolve;
            const modal = this.show(content, { 
                title: '', 
                size: 'small',
                className: 'modern-modal'
            });
            
            // Add event listeners using event delegation
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('confirm-cancel-btn') || e.target.closest('.confirm-cancel-btn')) {
                    this.resolveConfirm(false);
                } else if (e.target.classList.contains('confirm-ok-btn') || e.target.closest('.confirm-ok-btn')) {
                    this.resolveConfirm(true);
                }
            });
        });
    }

    resolveConfirm(result) {
        if (this.confirmResolve) {
            const resolve = this.confirmResolve;
            this.confirmResolve = null;
            this.close();
            resolve(result);
        }
    }

    prompt(message, defaultValue = '', title = '输入') {
        return new Promise((resolve) => {
            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">${window.utils.escapeHtml(title)}</h2>
                        <p class="modal-subtitle">请输入所需信息</p>
                    </div>
                    
                    <div class="prompt-dialog" style="padding: 32px;">
                        <p>${window.utils.escapeHtml(message)}</p>
                        <input 
                            type="text" 
                            class="form-input-modern" 
                            id="promptInput" 
                            value="${window.utils.escapeHtml(defaultValue)}" 
                            autocomplete="off"
                        />
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button class="btn-modern btn-secondary-modern prompt-cancel-btn">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button class="btn-modern btn-primary-modern prompt-ok-btn">
                            <span class="btn-icon">✓</span>
                            确认
                        </button>
                    </div>
                </div>
            `;
            
            this.promptResolve = resolve;
            const modal = this.show(content, { 
                title: '', 
                size: 'small',
                className: 'modern-modal'
            });
            
            // Add event listeners using event delegation
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('prompt-cancel-btn') || e.target.closest('.prompt-cancel-btn')) {
                    this.resolvePrompt(null);
                } else if (e.target.classList.contains('prompt-ok-btn') || e.target.closest('.prompt-ok-btn')) {
                    const input = document.getElementById('promptInput');
                    this.resolvePrompt(input ? input.value : '');
                }
            });
            
            // Handle Enter key
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const input = document.getElementById('promptInput');
                    this.resolvePrompt(input ? input.value : '');
                }
            });
            
            // 自动聚焦输入框
            setTimeout(() => {
                const input = document.getElementById('promptInput');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    resolvePrompt(result) {
        if (this.promptResolve) {
            const resolve = this.promptResolve;
            this.promptResolve = null;
            this.close();
            resolve(result);
        }
    }
}

// 下拉菜单组件
class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            const dropdown = e.target.closest('.dropdown');
            
            if (dropdown) {
                const toggle = e.target.closest('.dropdown-toggle');
                if (toggle) {
                    e.preventDefault();
                    this.toggle(dropdown);
                }
            } else {
                this.closeAll();
            }
        });
    }

    toggle(dropdown) {
        if (this.activeDropdown && this.activeDropdown !== dropdown) {
            this.close(this.activeDropdown);
        }
        
        if (dropdown.classList.contains('active')) {
            this.close(dropdown);
        } else {
            this.open(dropdown);
        }
    }

    open(dropdown) {
        dropdown.classList.add('active');
        this.activeDropdown = dropdown;
    }

    close(dropdown) {
        dropdown.classList.remove('active');
        if (this.activeDropdown === dropdown) {
            this.activeDropdown = null;
        }
    }

    closeAll() {
        document.querySelectorAll('.dropdown.active').forEach(dropdown => {
            this.close(dropdown);
        });
    }
}

// 标签页组件
class TabManager {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (tab) {
                this.switchTab(tab);
            }
        });
    }

    switchTab(activeTab) {
        const tabContainer = activeTab.closest('.nav-tabs');
        const targetTab = activeTab.dataset.tab;
        
        // 更新标签状态
        tabContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        activeTab.classList.add('active');
        
        // 更新内容显示
        const contentContainer = tabContainer.parentNode.nextElementSibling;
        if (contentContainer) {
            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            const targetContent = contentContainer.querySelector(`#${targetTab}List`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'flex';
            }
        }
        
        // 触发标签切换事件
        window.app?.onTabSwitch(targetTab);
    }
}

// 搜索组件
class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.advancedSearchBtn = document.getElementById('advancedSearchBtn');
        this.currentQuery = '';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', window.utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch(e.target.value, true);
                }
            });
        }
        
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => {
                this.handleSearch(this.searchInput.value, true);
            });
        }
        
        if (this.advancedSearchBtn) {
            this.advancedSearchBtn.addEventListener('click', () => {
                this.showAdvancedSearch();
            });
        }
    }

    async handleSearch(query, immediate = false) {
        query = query.trim();
        
        if (query === this.currentQuery) return;
        this.currentQuery = query;
        
        if (!query) {
            window.app?.clearSearch();
            return;
        }
        
        try {
            const results = await window.api.search(query);
            window.app?.displaySearchResults(results);
        } catch (error) {
            console.error('搜索失败:', error);
        }
    }

    showAdvancedSearch() {
        const content = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">高级搜索</h2>
                    <p class="modal-subtitle">使用更多条件精确搜索</p>
                </div>
                
                <form class="modern-form" style="padding: 32px;">
                    <div class="form-group-modern">
                        <label class="form-label-modern">
                            <span class="label-text">搜索关键词</span>
                        </label>
                        <input 
                            type="text" 
                            id="advancedQuery" 
                            class="form-input-modern" 
                            placeholder="输入搜索关键词..." 
                            autocomplete="off"
                        />
                    </div>
                    
                    <div class="form-group-modern">
                        <label class="form-label-modern">
                            <span class="label-text">搜索范围</span>
                        </label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" id="searchPrompts" checked /> Prompt</label>
                            <label><input type="checkbox" id="searchTemplates" checked /> 模板</label>
                            <label><input type="checkbox" id="searchHistory" /> 版本历史</label>
                        </div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label class="form-label-modern">
                            <span class="label-text">标签筛选</span>
                        </label>
                        <input 
                            type="text" 
                            id="tagFilter" 
                            class="form-input-modern" 
                            placeholder="输入标签，用逗号分隔..." 
                            autocomplete="off"
                        />
                    </div>
                    
                    <div class="form-group-modern">
                        <label class="form-label-modern">
                            <span class="label-text">排序方式</span>
                        </label>
                        <select id="sortBy" class="form-input-modern">
                            <option value="relevance">相关性</option>
                            <option value="date">创建时间</option>
                            <option value="title">标题</option>
                        </select>
                    </div>
                </form>
                
                <div class="modal-footer-modern">
                    <button class="btn-modern btn-secondary-modern" onclick="window.components.modal.close()">
                        <span class="btn-icon">✕</span>
                        取消
                    </button>
                    <button class="btn-modern btn-primary-modern" onclick="window.components.search.performAdvancedSearch()">
                        <span class="btn-icon">🔍</span>
                        搜索
                    </button>
                </div>
            </div>
        `;
        
        window.components.modal.show(content, {
            title: '',
            size: 'medium',
            className: 'modern-modal'
        });
    }

    async performAdvancedSearch() {
        const query = document.getElementById('advancedQuery')?.value || '';
        const searchPrompts = document.getElementById('searchPrompts')?.checked;
        const searchTemplates = document.getElementById('searchTemplates')?.checked;
        const searchHistory = document.getElementById('searchHistory')?.checked;
        const tagFilter = document.getElementById('tagFilter')?.value || '';
        const sortBy = document.getElementById('sortBy')?.value || 'relevance';
        
        const entityTypes = [];
        if (searchPrompts) entityTypes.push('prompt');
        if (searchTemplates) entityTypes.push('template');
        if (searchHistory) entityTypes.push('version');
        
        const tags = tagFilter.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        const criteria = {
            query,
            entityTypes,
            tags,
            sortBy,
            sortOrder: 'desc'
        };
        
        try {
            const results = await window.api.advancedSearch(criteria);
            window.app?.displaySearchResults(results);
            window.components.modal.close();
        } catch (error) {
            console.error('高级搜索失败:', error);
        }
    }

    clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentQuery = '';
    }
}

// 初始化所有组件
function initComponents() {
    window.components = {
        notifications: new NotificationManager(),
        modal: new ModalManager(),
        dropdown: new DropdownManager(),
        tabs: new TabManager(),
        search: new SearchManager()
    };
}

// 导出组件初始化函数
window.initComponents = initComponents;