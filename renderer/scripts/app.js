// 主应用程序

class PromptManagerApp {
    constructor() {
        this.currentView = 'welcome';
        this.currentTab = 'prompts';
        this.selectedPrompt = null;
        this.selectedTemplate = null;
        this.prompts = [];
        this.templates = [];
        this.searchResults = null;
        this.currentVersions = null; // Store version data for preview functionality
        
        // 批量操作相关
        this.bulkSelectionMode = false;
        this.selectedItems = new Set();
        
        // 视图和排序状态
        this.currentViewMode = 'list'; // 'list' 或 'grid'
        this.currentSortBy = 'updated_at'; // 排序字段
        this.currentSortOrder = 'desc'; // 'asc' 或 'desc'
        
        // 分类系统
        this.currentCategoryFilter = 'all';
        this.categories = this.initializeCategories();
        
        this.init();
    }

    // 初始化分类系统
    initializeCategories() {
        // 从localStorage恢复展开状态
        const savedExpandedState = JSON.parse(localStorage.getItem('categoryExpandedState') || '{}');
        
        return {
            // 按使用场景分类
            scene: {
                name: '使用场景',
                icon: '🎯',
                expanded: savedExpandedState.scene !== false, // 默认展开
                items: {
                    'work': { name: '工作相关', icon: '💼', color: '#3b82f6' },
                    'study': { name: '学习笔记', icon: '📚', color: '#10b981' },
                    'life': { name: '生活记录', icon: '🏠', color: '#f59e0b' },
                    'creative': { name: '创意想法', icon: '🎨', color: '#8b5cf6' },
                    'project': { name: '项目规划', icon: '📋', color: '#ef4444' },
                    'communication': { name: '沟通交流', icon: '💬', color: '#06b6d4' }
                }
            },
            // 按内容类型分类
            type: {
                name: '内容类型',
                icon: '📝',
                expanded: savedExpandedState.type !== false, // 默认展开
                items: {
                    'question': { name: '问题提问', icon: '❓', color: '#10b981' },
                    'instruction': { name: '操作指南', icon: '📖', color: '#3b82f6' },
                    'brainstorm': { name: '头脑风暴', icon: '💡', color: '#f59e0b' },
                    'analysis': { name: '分析总结', icon: '📊', color: '#8b5cf6' },
                    'writing': { name: '文字创作', icon: '✍️', color: '#ec4899' },
                    'planning': { name: '计划安排', icon: '📅', color: '#06b6d4' }
                }
            },
            // 按重要程度分类
            priority: {
                name: '重要程度',
                icon: '⭐',
                expanded: savedExpandedState.priority === true, // 默认收起
                items: {
                    'high': { name: '很重要', icon: '🔥', color: '#ef4444' },
                    'medium': { name: '一般重要', icon: '⚡', color: '#f59e0b' },
                    'low': { name: '不太重要', icon: '💫', color: '#10b981' }
                }
            },
            // 按使用频率分类
            frequency: {
                name: '使用频率',
                icon: '🔄',
                expanded: savedExpandedState.frequency === true, // 默认收起
                items: {
                    'daily': { name: '每天都用', icon: '🌟', color: '#ef4444' },
                    'weekly': { name: '经常使用', icon: '📅', color: '#f59e0b' },
                    'monthly': { name: '偶尔使用', icon: '📝', color: '#10b981' },
                    'archive': { name: '存档备用', icon: '📦', color: '#6b7280' }
                }
            }
        };
    }

    async init() {
        try {
            // 初始化主题管理器
            this.initThemeManager();
            
            // 初始化工具和组件
            window.utils.init();
            window.initComponents();
            
            // 绑定事件
            this.bindEvents();
            
            // 检查Electron API
            if (!window.api.isElectronAvailable()) {
                this.showNotification('Electron API不可用，某些功能可能无法正常工作', 'warning');
            }
            
            // 加载初始数据
            await this.loadInitialData();
            
            console.log('Prompt版本管理器已启动');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showNotification('应用初始化失败', 'error');
        }
    }

    // 主题管理器初始化
    initThemeManager() {
        // 从localStorage加载保存的主题设置
        const savedTheme = localStorage.getItem('app-theme') || 'auto';
        
        // 立即应用主题，避免闪烁
        this.applyTheme(savedTheme);
        
        // 监听系统主题变化
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleSystemThemeChange = () => {
                const currentTheme = localStorage.getItem('app-theme') || 'auto';
                if (currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            };
            
            mediaQuery.addEventListener('change', handleSystemThemeChange);
            
            // 初始检查系统主题
            if (savedTheme === 'auto') {
                handleSystemThemeChange();
            }
        }
    }

    setTheme(theme) {
        localStorage.setItem('app-theme', theme);
        this.applyTheme(theme);
        
        // 更新设置面板中的主题选择器状态
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = theme;
        }
        
        this.showNotification(`已切换到${this.getThemeName(theme)}`, 'success', 2000);
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        // 移除现有主题
        root.removeAttribute('data-theme');
        
        if (theme === 'auto') {
            // 跟随系统主题
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.setAttribute('data-theme', 'light');
            }
        } else {
            root.setAttribute('data-theme', theme);
        }
    }

    getThemeName(theme) {
        const names = {
            'light': '浅色主题',
            'dark': '深色主题',
            'auto': '跟随系统主题'
        };
        return names[theme] || '默认主题';
    }

    // 表单验证辅助方法
    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return false;

        let isValid = true;
        const errors = {};

        // 清除之前的错误状态
        form.querySelectorAll('.form-input-modern, .form-textarea-modern').forEach(input => {
            input.classList.remove('error');
        });
        form.querySelectorAll('.form-error').forEach(error => {
            error.remove();
        });

        // 验证每个字段
        Object.entries(rules).forEach(([fieldName, rule]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const value = field.value.trim();
            
            // 必填验证
            if (rule.required && !value) {
                errors[fieldName] = rule.requiredMessage || '此字段为必填项';
                isValid = false;
            }
            
            // 最小长度验证
            if (rule.minLength && value.length < rule.minLength) {
                errors[fieldName] = rule.minLengthMessage || `最少需要${rule.minLength}个字符`;
                isValid = false;
            }
            
            // 最大长度验证
            if (rule.maxLength && value.length > rule.maxLength) {
                errors[fieldName] = rule.maxLengthMessage || `最多允许${rule.maxLength}个字符`;
                isValid = false;
            }
            
            // 自定义验证
            if (rule.validator && !rule.validator(value)) {
                errors[fieldName] = rule.validatorMessage || '输入格式不正确';
                isValid = false;
            }
        });

        // 显示错误信息
        Object.entries(errors).forEach(([fieldName, message]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('error');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'form-error';
                errorDiv.textContent = message;
                
                field.parentNode.appendChild(errorDiv);
            }
        });

        return isValid;
    }

    bindEvents() {
        console.log('开始绑定事件...');
        
        // 确保在DOM加载完成后绑定事件
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEventsInternal();
            });
        } else {
            this.bindEventsInternal();
        }
    }

    bindEventsInternal() {
        console.log('执行内部事件绑定...');
        
        // 新建按钮
        const newPromptBtn = document.getElementById('newPromptBtn');
        const newTemplateBtn = document.getElementById('newTemplateBtn');
        const getStartedBtn = document.getElementById('getStartedBtn');
        const importDataBtn = document.getElementById('importDataBtn');
        
        console.log('按钮元素:', { newPromptBtn, newTemplateBtn, getStartedBtn, importDataBtn });
        
        if (newPromptBtn) {
            // 移除现有的事件监听器（如果有的话）
            newPromptBtn.replaceWith(newPromptBtn.cloneNode(true));
            const newBtn = document.getElementById('newPromptBtn');
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('新建Prompt按钮被点击');
                console.log('this context:', this);
                console.log('createNewPrompt method:', typeof this.createNewPrompt);
                this.createNewPrompt();
            });
            console.log('新建Prompt按钮事件已绑定');
        } else {
            console.error('找不到newPromptBtn元素');
        }
        
        if (newTemplateBtn) {
            // 移除现有的事件监听器（如果有的话）
            newTemplateBtn.replaceWith(newTemplateBtn.cloneNode(true));
            const newBtn = document.getElementById('newTemplateBtn');
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('新建模板按钮被点击');
                console.log('this context:', this);
                console.log('createNewTemplate method:', typeof this.createNewTemplate);
                this.createNewTemplate();
            });
            console.log('新建模板按钮事件已绑定');
        } else {
            console.error('找不到newTemplateBtn元素');
        }
        
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('开始使用按钮被点击');
                this.createNewPrompt();
            });
        }
        
        if (importDataBtn) {
            importDataBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('导入数据按钮被点击');
                this.importData();
            });
        }
        
        // 标签页切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                if (tabName) {
                    this.switchToTab(tabName);
                    this.onTabSwitch(tabName);
                }
            });
        });
        
        // 统计和设置按钮
        const statsBtn = document.getElementById('statsBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStats());
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        // 导出按钮
        const exportAllBtn = document.getElementById('exportAllBtn');
        const exportTemplatesBtn = document.getElementById('exportTemplatesBtn');
        const importBtn = document.getElementById('importBtn');
        
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => this.exportAll());
        }
        
        if (exportTemplatesBtn) {
            exportTemplatesBtn.addEventListener('click', () => this.exportTemplates());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importData());
        }
        
        // 菜单事件监听
        if (window.electronAPI) {
            window.electronAPI.onMenuNewPrompt(() => this.createNewPrompt());
            window.electronAPI.onMenuNewTemplate(() => this.createNewTemplate());
            window.electronAPI.onMenuExportAll(() => this.exportAll());
            window.electronAPI.onMenuImport(() => this.importData());
            window.electronAPI.onMenuSearch(() => this.focusSearch());
            window.electronAPI.onMenuAdvancedSearch(() => window.components.search.showAdvancedSearch());
            window.electronAPI.onMenuRebuildIndex(() => this.rebuildSearchIndex());
            window.electronAPI.onMenuMaintenance(() => this.performMaintenance());
            window.electronAPI.onMenuStats(() => this.showStats());
            window.electronAPI.onMenuAbout(() => this.showAbout());
        }
        
        // 批量操作事件绑定
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const bulkCancelBtn = document.getElementById('bulkCancelBtn');
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.bulkDelete());
        }
        
        if (bulkCancelBtn) {
            bulkCancelBtn.addEventListener('click', () => this.cancelBulkSelection());
        }
        
        // 添加右键菜单支持批量选择
        document.addEventListener('contextmenu', (e) => {
            const listItem = e.target.closest('.list-item');
            if (listItem && !this.bulkSelectionMode) {
                e.preventDefault();
                this.showContextMenu(e, listItem);
            }
        });
        
        // 添加列表项点击事件委托
        document.addEventListener('click', (e) => {
            const listItem = e.target.closest('.list-item');
            if (listItem && listItem.dataset.itemId) {
                // 如果点击的是操作按钮，不处理
                if (e.target.closest('.item-actions')) {
                    return;
                }
                
                const itemId = listItem.dataset.itemId;
                const itemType = listItem.dataset.itemType;
                
                if (this.bulkSelectionMode) {
                    this.toggleItemSelection(itemId);
                } else {
                    if (itemType === 'prompt') {
                        this.selectPrompt(itemId);
                    } else if (itemType === 'template') {
                        this.selectTemplate(itemId);
                    }
                }
            }
        });
        
        // 视图切换按钮
        const listViewBtn = document.getElementById('listViewBtn');
        const gridViewBtn = document.getElementById('gridViewBtn');
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.switchViewMode('list'));
        }
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.switchViewMode('grid'));
        }
        
        // 排序功能
        const sortBtn = document.getElementById('sortBtn');
        const sortDropdown = sortBtn?.closest('.dropdown');
        
        if (sortBtn && sortDropdown) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSortDropdown();
            });
            
            // 排序选项点击
            sortDropdown.addEventListener('click', (e) => {
                const sortOption = e.target.closest('[data-sort]');
                if (sortOption) {
                    e.preventDefault();
                    const sortBy = sortOption.dataset.sort;
                    this.setSortBy(sortBy);
                }
            });
        }
        
        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeSortDropdown();
        });
        
        console.log('事件绑定完成');
    }

    async loadInitialData() {
        try {
            // 加载Prompt和模板
            await Promise.all([
                this.loadPrompts(),
                this.loadTemplates()
            ]);
            
            // 更新计数和分类
            this.updateCounts();
            await this.initializeCategoryFilter();
            
            // 初始化用户偏好设置
            this.initializeUserPreferences();
            
        } catch (error) {
            console.error('加载初始数据失败:', error);
        }
    }

    // 初始化分类筛选器
    async initializeCategoryFilter() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;

        // 清空现有内容，保留"全部"选项
        const allItem = categoryList.querySelector('[data-category="all"]');
        categoryList.innerHTML = '';
        if (allItem) {
            categoryList.appendChild(allItem);
        }

        // 添加分隔线
        const separator = document.createElement('div');
        separator.className = 'category-separator';
        categoryList.appendChild(separator);

        // 获取所有分类（包括自定义分类）
        const allCategories = await this.getAllCategories();

        // 添加各个分类组
        Object.entries(allCategories).forEach(([categoryType, categoryData]) => {
            // 创建分类组容器
            const groupContainer = document.createElement('div');
            groupContainer.className = 'category-group';
            groupContainer.dataset.categoryType = categoryType;

            // 添加分类组标题（可点击展开/收起）
            const groupHeader = document.createElement('div');
            groupHeader.className = 'category-group-header';
            const isExpanded = categoryData.expanded !== false; // 默认展开
            groupHeader.innerHTML = `
                <span class="category-expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▶'}</span>
                <span class="category-group-icon">${categoryData.icon}</span>
                <span class="category-group-name">${categoryData.name}</span>
                <span class="category-group-count" id="group-count-${categoryType}">0</span>
            `;
            
            // 绑定展开/收起事件
            groupHeader.addEventListener('click', () => this.toggleCategoryGroup(categoryType));
            groupContainer.appendChild(groupHeader);

            // 添加分类项容器
            const itemsContainer = document.createElement('div');
            itemsContainer.className = `category-items ${isExpanded ? 'expanded' : 'collapsed'}`;
            itemsContainer.dataset.categoryType = categoryType;

            // 添加分类项
            Object.entries(categoryData.items).forEach(([key, item]) => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.dataset.category = `${categoryType}:${key}`;
                categoryItem.innerHTML = `
                    <span class="category-icon">${item.icon}</span>
                    <span class="category-name">${item.name}</span>
                    <span class="category-count" id="count-${categoryType}-${key}">0</span>
                `;
                itemsContainer.appendChild(categoryItem);
            });

            groupContainer.appendChild(itemsContainer);
            categoryList.appendChild(groupContainer);
        });

        // 添加自定义分类管理按钮
        this.addCustomCategoryManagementButton(categoryList);

        // 绑定分类筛选事件
        this.bindCategoryEvents();
        
        // 更新分类计数
        this.updateCategoryCounts();
    }

    // 绑定分类相关事件
    bindCategoryEvents() {
        const categoryList = document.getElementById('categoryList');
        const clearFilter = document.getElementById('clearCategoryFilter');

        if (categoryList) {
            categoryList.addEventListener('click', (e) => {
                const categoryItem = e.target.closest('.category-item');
                if (categoryItem && categoryItem.dataset.category) {
                    this.filterByCategory(categoryItem.dataset.category);
                }
            });
        }

        if (clearFilter) {
            clearFilter.addEventListener('click', () => {
                this.clearCategoryFilter();
            });
        }
    }

    // 按分类筛选
    filterByCategory(category) {
        this.currentCategoryFilter = category;
        
        // 更新UI状态
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-category="${category}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // 应用筛选
        this.applyCurrentFilters();
    }

    // 清除分类筛选
    clearCategoryFilter() {
        this.currentCategoryFilter = 'all';
        
        // 更新UI状态
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const allItem = document.querySelector('[data-category="all"]');
        if (allItem) {
            allItem.classList.add('active');
        }

        // 应用筛选
        this.applyCurrentFilters();
    }

    // 应用当前筛选条件
    applyCurrentFilters() {
        if (this.currentTab === 'prompts') {
            this.renderFilteredPrompts();
        } else if (this.currentTab === 'templates') {
            this.renderFilteredTemplates();
        }
    }

    // 渲染筛选后的Prompt列表
    renderFilteredPrompts() {
        const container = document.getElementById('promptsList');
        if (!container) return;

        let filteredPrompts = this.prompts;

        // 应用分类筛选
        if (this.currentCategoryFilter !== 'all') {
            filteredPrompts = this.filterItemsByCategory(filteredPrompts, this.currentCategoryFilter);
        }

        // 应用排序
        filteredPrompts = this.sortItems(filteredPrompts);

        // 更新列表标题和计数
        this.updateListTitle('Prompt', filteredPrompts.length);

        if (filteredPrompts.length === 0) {
            this.showEmptyState('promptsList', '没有找到相关的想法', '试试调整筛选条件，或者记录一个新想法', [
                { text: '写个想法', action: () => this.createNewPrompt(), primary: true },
                { text: '清除筛选', action: () => this.clearCategoryFilter() }
            ]);
            return;
        }

        container.innerHTML = filteredPrompts.map(prompt => this.renderPromptItem(prompt)).join('');
    }

    // 渲染筛选后的模板列表
    renderFilteredTemplates() {
        const container = document.getElementById('templatesList');
        if (!container) return;

        let filteredTemplates = this.templates;

        // 应用分类筛选
        if (this.currentCategoryFilter !== 'all') {
            filteredTemplates = this.filterItemsByCategory(filteredTemplates, this.currentCategoryFilter);
        }

        // 应用排序
        filteredTemplates = this.sortItems(filteredTemplates);

        // 更新列表标题和计数
        this.updateListTitle('模板', filteredTemplates.length);

        if (filteredTemplates.length === 0) {
            this.showEmptyState('templatesList', '没有找到匹配的模板', '尝试调整筛选条件或创建新的模板', [
                { text: '创建模板', action: () => this.createNewTemplate(), primary: true },
                { text: '清除筛选', action: () => this.clearCategoryFilter() }
            ]);
            return;
        }

        container.innerHTML = filteredTemplates.map(template => this.renderTemplateItem(template)).join('');
    }

    // 更新列表标题和计数
    updateListTitle(type, count) {
        const listTitle = document.getElementById('listTitle');
        const listCount = document.getElementById('listCount');
        
        if (listTitle) {
            let title = `我的所有${type === 'Prompt' ? '想法' : '模板'}`;
            if (this.currentCategoryFilter !== 'all') {
                const [categoryType, categoryKey] = this.currentCategoryFilter.split(':');
                const categoryData = this.categories[categoryType];
                if (categoryData && categoryData.items[categoryKey]) {
                    title = `${categoryData.items[categoryKey].name} - ${type === 'Prompt' ? '想法' : '模板'}`;
                }
            }
            listTitle.textContent = title;
        }
        
        if (listCount) {
            listCount.textContent = `${count} 个${type === 'Prompt' ? '想法' : '模板'}`;
        }
    }

    // 按分类筛选项目
    filterItemsByCategory(items, categoryFilter) {
        if (categoryFilter === 'all') return items;

        const [categoryType, categoryKey] = categoryFilter.split(':');
        
        return items.filter(item => {
            // 检查项目是否有分类信息
            if (!item.categories) return false;
            
            // 检查是否匹配指定分类
            return item.categories[categoryType] === categoryKey;
        });
    }

    // 更新分类计数
    async updateCategoryCounts() {
        // 更新总计数
        const allCount = document.getElementById('allCount');
        if (allCount) {
            const totalCount = this.currentTab === 'prompts' ? this.prompts.length : this.templates.length;
            allCount.textContent = totalCount;
        }

        // 获取所有分类（包括自定义分类）
        const allCategories = await this.getAllCategories();

        // 更新各分类计数
        Object.entries(allCategories).forEach(([categoryType, categoryData]) => {
            let groupTotal = 0;
            
            Object.keys(categoryData.items).forEach(key => {
                const countElement = document.getElementById(`count-${categoryType}-${key}`);
                if (countElement) {
                    const items = this.currentTab === 'prompts' ? this.prompts : this.templates;
                    const count = items.filter(item => 
                        item.categories && item.categories[categoryType] === key
                    ).length;
                    countElement.textContent = count;
                    groupTotal += count;
                }
            });

            // 更新分组总计数
            const groupCountElement = document.getElementById(`group-count-${categoryType}`);
            if (groupCountElement) {
                groupCountElement.textContent = groupTotal;
            }
        });
    }

    // 添加自定义分类管理按钮
    addCustomCategoryManagementButton(categoryList) {
        const managementContainer = document.createElement('div');
        managementContainer.className = 'custom-category-management';
        
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-sm btn-outline custom-category-add-btn';
        addButton.innerHTML = '<span class="btn-icon">➕</span>添加我的分类';
        addButton.addEventListener('click', () => this.showCustomCategoryManagement());
        
        managementContainer.appendChild(addButton);
        categoryList.appendChild(managementContainer);
    }

    // 显示自定义分类管理界面
    async showCustomCategoryManagement() {
        try {
            console.log('开始加载自定义分类管理界面...');
            
            // 获取图标和颜色选项（异步调用）
            let iconOptions, colorOptions;
            
            try {
                iconOptions = await window.api.getCustomCategoryIconOptions();
                console.log('图标选项:', iconOptions, '类型:', typeof iconOptions);
            } catch (error) {
                console.error('获取图标选项失败:', error);
                iconOptions = {
                    business: ['🏢', '💼', '📊', '💰'],
                    technology: ['💻', '📱', '⚙️', '🔧'],
                    creative: ['🎨', '🖌️', '🎭', '🎪']
                };
            }
            
            try {
                colorOptions = await window.api.getCustomCategoryColorOptions();
                console.log('颜色选项原始值:', colorOptions);
                console.log('颜色选项类型:', typeof colorOptions);
                console.log('是否为数组:', Array.isArray(colorOptions));
                
                // 如果不是数组，尝试转换或使用默认值
                if (!Array.isArray(colorOptions)) {
                    console.warn('颜色选项不是数组，使用默认值');
                    colorOptions = [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
                        '#f97316', '#6b7280', '#14b8a6', '#a855f7'
                    ];
                }
            } catch (error) {
                console.error('获取颜色选项失败:', error);
                colorOptions = [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
                    '#f97316', '#6b7280', '#14b8a6', '#a855f7'
                ];
            }
            
            console.log('最终颜色选项:', colorOptions, '是否为数组:', Array.isArray(colorOptions));
            
            // 获取统计信息（异步调用）
            const statistics = await window.api.getCustomCategoryGroupStatistics();
            
            console.log('准备创建模板，colorOptions类型:', typeof colorOptions, 'isArray:', Array.isArray(colorOptions));
            console.log('colorOptions内容:', colorOptions);

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">整理我的分类 📂</h2>
                        <p class="modal-subtitle">创建属于你自己的分类方式</p>
                    </div>
                    
                    <div class="custom-category-management-content" style="padding: 32px;">
                        <!-- 现有分类组 -->
                        <div class="existing-groups-section">
                            <h3>我的分类</h3>
                            <div class="existing-groups-list" id="existingGroupsList">
                                ${statistics.length > 0 ? 
                                    statistics.map(group => `
                                        <div class="existing-group-item">
                                            <div class="group-info">
                                                <span class="group-icon">${group.group_icon}</span>
                                                <span class="group-name">${group.group_name}</span>
                                                <span class="group-count">${group.category_count} 项</span>
                                            </div>
                                            <div class="group-actions">
                                                <button class="btn btn-sm btn-outline" onclick="window.app.editCustomCategoryGroup('${group.group_type}')">编辑</button>
                                                <button class="btn btn-sm btn-error-outline" onclick="window.app.deleteCustomCategoryGroup('${group.group_type}')">删除</button>
                                            </div>
                                        </div>
                                    `).join('') :
                                    '<div class="empty-state-small">还没有自定义分类组</div>'
                                }
                            </div>
                        </div>

                        <!-- 创建新分类组 -->
                        <div class="create-group-section">
                            <h3>添加新分类</h3>
                            <form id="createCustomCategoryForm">
                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-text">分类名称</span>
                                        <span class="label-required">*</span>
                                    </label>
                                    <input type="text" name="groupName" class="form-input-modern" placeholder="比如：我的项目、学习笔记、工作计划..." required>
                                </div>

                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-text">选个图标</span>
                                        <span class="label-required">*</span>
                                    </label>
                                    <div class="icon-selector" id="groupIconSelector">
                                        ${Object.entries(iconOptions).map(([category, icons]) => `
                                            <div class="icon-category">
                                                <h4>${this.getIconCategoryName(category)}</h4>
                                                <div class="icon-grid">
                                                    ${icons.map(icon => `
                                                        <div class="icon-option" data-icon="${icon}">${icon}</div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" name="groupIcon" required>
                                </div>

                                <div class="form-group-modern">
                                    <label class="form-label-modern">
                                        <span class="label-text">具体分类</span>
                                        <span class="label-required">*</span>
                                    </label>
                                    <div class="input-hint">为这个分类添加具体的子项目，比如"工作"下面可以有"会议记录"、"项目计划"等</div>
                                    <div class="category-items-builder" id="categoryItemsBuilder">
                                        <div class="category-item-template">
                                            <div class="category-item-inputs">
                                                <input type="text" placeholder="分类键（如：tech, finance）" class="category-key-input" required>
                                                <input type="text" placeholder="分类名称（如：科技互联网）" class="category-name-input" required>
                                                <div class="category-icon-selector">
                                                    <button type="button" class="icon-select-btn" data-action="select-icon">🔘 选择图标</button>
                                                    <input type="hidden" class="category-icon-input" required>
                                                </div>
                                                <div class="category-color-selector">
                                                    <!-- 颜色选项将通过JavaScript动态添加 -->
                                                    <input type="hidden" class="category-color-input" value="#3b82f6">
                                                </div>
                                                <button type="button" class="btn btn-sm btn-error remove-category-btn">删除</button>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-secondary" id="addCategoryItemBtn">添加分类项</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern btn-secondary-modern modal-cancel-btn">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button type="button" class="btn-modern btn-primary-modern modal-submit-btn">
                            <span class="btn-icon">✓</span>
                            保存分类
                        </button>
                    </div>
                </div>
            `;
            
            const modal = window.components.modal.show(content, {
                title: '',
                size: 'xlarge',
                className: 'modern-modal custom-category-modal'
            });

            // 绑定事件
            this.bindCustomCategoryManagementEvents(modal);

        } catch (error) {
            console.error('显示自定义分类管理失败:', error);
            this.showNotification('加载自定义分类管理失败', 'error');
        }
    }

    // 切换分类组的展开/收起状态
    toggleCategoryGroup(categoryType) {
        const groupContainer = document.querySelector(`[data-category-type="${categoryType}"]`);
        const itemsContainer = groupContainer?.querySelector('.category-items');
        const expandIcon = groupContainer?.querySelector('.category-expand-icon');
        
        if (!itemsContainer || !expandIcon) {
            console.warn(`Category group elements not found for type: ${categoryType}`);
            return;
        }

        const isExpanded = itemsContainer.classList.contains('expanded');
        
        if (isExpanded) {
            // 收起
            itemsContainer.classList.remove('expanded');
            itemsContainer.classList.add('collapsed');
            expandIcon.classList.remove('expanded');
            expandIcon.textContent = '▶';
        } else {
            // 展开
            itemsContainer.classList.remove('collapsed');
            itemsContainer.classList.add('expanded');
            expandIcon.classList.add('expanded');
            expandIcon.textContent = '▼';
        }

        // 保存状态到localStorage
        try {
            const expandedState = JSON.parse(localStorage.getItem('categoryExpandedState') || '{}');
            expandedState[categoryType] = !isExpanded;
            localStorage.setItem('categoryExpandedState', JSON.stringify(expandedState));
        } catch (error) {
            console.error('Failed to save category expanded state:', error);
        }
    }

    // 获取所有分类（包括自定义分类）
    async getAllCategories() {
        try {
            // 获取内置分类
            const builtinCategories = this.categories;
            
            // 获取自定义分类
            const customCategories = await window.api.getAllCustomCategories();
            
            // 合并分类
            return { ...builtinCategories, ...customCategories };
        } catch (error) {
            console.error('获取分类失败:', error);
            // 如果获取自定义分类失败，返回内置分类
            return this.categories;
        }
    }

    // 获取项目的分类标签HTML
    getCategoryTagsHtml(categories) {
        if (!categories) return '';
        
        const tags = [];
        Object.entries(categories).forEach(([categoryType, categoryKey]) => {
            const categoryData = this.categories[categoryType];
            if (categoryData && categoryData.items[categoryKey]) {
                const item = categoryData.items[categoryKey];
                tags.push(`<span class="category-tag ${categoryType}" style="background-color: ${item.color}">${item.name}</span>`);
            }
        });
        
        return tags.length > 0 ? `<div class="category-tags">${tags.join('')}</div>` : '';
    }

    // 获取分类选择器HTML
    // 获取分类选择器HTML（异步版本）
    async getCategorySelectionHtml() {
        const allCategories = await this.getAllCategories();
        
        return `
            <div class="form-group-modern">
                <label class="form-label-modern">
                    <span class="label-text">分类</span>
                    <span class="label-optional">可选</span>
                </label>
                <div class="input-hint">为Prompt选择合适的分类，便于管理和查找</div>
                
                ${Object.entries(allCategories).map(([categoryType, categoryData]) => `
                    <div class="category-selector">
                        <label class="category-selector-label">
                            <span class="category-group-icon">${categoryData.icon}</span>
                            ${categoryData.name}
                        </label>
                        <div class="category-selector-grid">
                            ${Object.entries(categoryData.items).map(([key, item]) => `
                                <div class="category-option" data-category-type="${categoryType}" data-category-key="${key}">
                                    <span class="category-option-icon">${item.icon}</span>
                                    <span class="category-option-text">${item.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 从表单获取选中的分类
    getSelectedCategories(formElement) {
        const categories = {};
        const selectedOptions = formElement.querySelectorAll('.category-option.selected');
        
        selectedOptions.forEach(option => {
            const categoryType = option.dataset.categoryType;
            const categoryKey = option.dataset.categoryKey;
            if (categoryType && categoryKey) {
                categories[categoryType] = categoryKey;
            }
        });
        
        return Object.keys(categories).length > 0 ? categories : null;
    }

    // 绑定分类选择事件
    bindCategorySelectionEvents(formElement) {
        const categoryOptions = formElement.querySelectorAll('.category-option');
        
        categoryOptions.forEach(option => {
            option.addEventListener('click', () => {
                const categoryType = option.dataset.categoryType;
                
                // 清除同类型的其他选择
                formElement.querySelectorAll(`[data-category-type="${categoryType}"]`).forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // 切换当前选择
                option.classList.toggle('selected');
            });
        });
    }

    async loadPrompts() {
        try {
            this.prompts = await window.api.getAllPrompts();
            this.renderPromptsList();
            this.updateCounts(); // 更新计数
        } catch (error) {
            console.error('加载Prompt失败:', error);
            this.showEmptyState('promptsList', '加载Prompt失败', '请检查网络连接或重试');
        }
    }

    async loadTemplates() {
        try {
            this.templates = await window.api.getAllTemplates();
            this.renderTemplatesList();
            this.updateCounts(); // 更新计数
        } catch (error) {
            console.error('加载模板失败:', error);
            this.showEmptyState('templatesList', '加载模板失败', '请检查网络连接或重试');
        }
    }

    renderPromptsList() {
        const container = document.getElementById('promptsList');
        if (!container) return;

        if (this.prompts.length === 0) {
            this.showEmptyState('promptsList', '还没有记录想法呢', '写下你的第一个想法开始吧！', [
                { text: '写个想法', action: () => this.createNewPrompt(), primary: true }
            ]);
            return;
        }

        // 使用筛选渲染方法
        this.renderFilteredPrompts();
    }

    renderTemplatesList() {
        const container = document.getElementById('templatesList');
        if (!container) return;

        if (this.templates.length === 0) {
            this.showEmptyState('templatesList', '还没有模板', '将常用Prompt保存为模板以便复用', [
                { text: '创建模板', action: () => this.createNewTemplate(), primary: true }
            ]);
            return;
        }

        // 使用筛选渲染方法
        this.renderFilteredTemplates();
    }

    renderPromptItem(prompt) {
        const isActive = this.selectedPrompt?.id === prompt.id;
        const isSelected = this.selectedItems.has(prompt.id);
        const selectableClass = this.bulkSelectionMode ? 'selectable' : '';
        const selectedClass = isSelected ? 'selected' : '';
        
        return `
            <div class="list-item ${isActive ? 'active' : ''} ${selectableClass} ${selectedClass}" 
                 data-item-id="${prompt.id}"
                 data-item-type="prompt">
                <div class="item-header">
                    <div class="item-title">${window.utils.escapeHtml(prompt.title)}</div>
                    ${!this.bulkSelectionMode ? `
                        <div class="item-actions">
                            <button class="icon-btn" onclick="event.stopPropagation(); window.app.editPrompt('${prompt.id}')" data-tooltip="编辑">✏️</button>
                            <button class="icon-btn" onclick="event.stopPropagation(); window.app.showVersionHistory('${prompt.id}')" data-tooltip="版本历史">📋</button>
                        </div>
                    ` : ''}
                </div>
                <div class="item-preview">${window.utils.truncateText(prompt.content, 100)}</div>
                ${this.getCategoryTagsHtml(prompt.categories)}
                <div class="item-meta">
                    <div class="item-stats">
                        <span class="item-date">${window.utils.formatDate(prompt.updated_at)}</span>
                        <span class="item-versions">${prompt.version_count} 版本</span>
                    </div>
                </div>
                ${prompt.tags && prompt.tags.length > 0 ? `
                    <div class="tags">
                        ${prompt.tags.slice(0, 3).map(tag => `<span class="tag">${window.utils.escapeHtml(tag)}</span>`).join('')}
                        ${prompt.tags.length > 3 ? `<span class="tag-more">+${prompt.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTemplateItem(template) {
        const isActive = this.selectedTemplate?.id === template.id;
        const isSelected = this.selectedItems.has(template.id);
        const selectableClass = this.bulkSelectionMode ? 'selectable' : '';
        const selectedClass = isSelected ? 'selected' : '';
        
        return `
            <div class="list-item ${isActive ? 'active' : ''} ${selectableClass} ${selectedClass}" 
                 data-item-id="${template.id}"
                 data-item-type="template">
                <div class="item-header">
                    <div class="item-title">${window.utils.escapeHtml(template.name)}</div>
                    ${!this.bulkSelectionMode ? `
                        <div class="item-actions">
                            <button class="icon-btn" onclick="event.stopPropagation(); window.app.createFromTemplate('${template.id}')" data-tooltip="使用模板">🚀</button>
                            <button class="icon-btn" onclick="event.stopPropagation(); window.app.editTemplate('${template.id}')" data-tooltip="编辑">✏️</button>
                        </div>
                    ` : ''}
                </div>
                <div class="item-preview">${window.utils.truncateText(template.description || template.content, 100)}</div>
                ${this.getCategoryTagsHtml(template.categories)}
                <div class="item-meta">
                    <div class="item-stats">
                        <span class="item-date">${window.utils.formatDate(template.created_at)}</span>
                        <span class="item-usage">使用 ${template.usage_count} 次</span>
                    </div>
                </div>
                ${template.tags && template.tags.length > 0 ? `
                    <div class="tags">
                        ${template.tags.slice(0, 3).map(tag => `<span class="tag">${window.utils.escapeHtml(tag)}</span>`).join('')}
                        ${template.tags.length > 3 ? `<span class="tag-more">+${template.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    showEmptyState(containerId, title, message, actions = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const actionsHTML = actions.map((action, index) => 
            `<button class="btn ${action.primary ? 'btn-primary' : 'btn-secondary'}" data-action-index="${index}">${action.text}</button>`
        ).join('');

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>${title}</h3>
                <p>${message}</p>
                ${actionsHTML ? `<div class="empty-state-actions">${actionsHTML}</div>` : ''}
            </div>
        `;

        // 添加事件监听器
        if (actions.length > 0) {
            const actionButtons = container.querySelectorAll('[data-action-index]');
            actionButtons.forEach((button, index) => {
                button.addEventListener('click', () => {
                    if (actions[index] && actions[index].action) {
                        actions[index].action();
                    }
                });
            });
        }
    }

    async selectPrompt(promptId) {
        try {
            const prompt = await window.api.getPrompt(promptId);
            if (!prompt) return;

            this.selectedPrompt = prompt;
            this.showPromptDetail(prompt);
            this.updateSelection('prompts', promptId);
        } catch (error) {
            console.error('选择Prompt失败:', error);
            this.showNotification('加载Prompt详情失败', 'error');
        }
    }

    async selectTemplate(templateId) {
        try {
            const template = await window.api.getTemplate(templateId);
            if (!template) return;

            this.selectedTemplate = template;
            this.showTemplateDetail(template);
            this.updateSelection('templates', templateId);
        } catch (error) {
            console.error('选择模板失败:', error);
            this.showNotification('加载模板详情失败', 'error');
        }
    }

    showPromptDetail(prompt) {
        this.currentView = 'prompt';
        this.updateContentTitle(prompt.title);
        this.updateBreadcrumb(['Prompt库', prompt.title]);

        const content = `
            <div class="detail-view-container">
                <!-- 标题区域 -->
                <div class="detail-title-section">
                    <h1 class="detail-main-title">${window.utils.escapeHtml(prompt.title)}</h1>
                    <div class="detail-meta-info">
                        <div class="meta-item">
                            <span class="meta-label">创建</span>
                            <span class="meta-value">${window.utils.formatDate(prompt.created_at)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">更新</span>
                            <span class="meta-value">${window.utils.formatDate(prompt.updated_at)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">版本</span>
                            <span class="meta-value">${prompt.version_count} 个</span>
                        </div>
                    </div>
                </div>

                <!-- 操作按钮区域 -->
                <div class="detail-actions-section">
                    <div class="primary-actions">
                        <button class="btn btn-primary" onclick="window.app.editPrompt('${prompt.id}')">
                            <span class="btn-icon">✏️</span>编辑
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.showVersionHistory('${prompt.id}')">
                            <span class="btn-icon">📋</span>版本历史
                        </button>
                    </div>
                    <div class="secondary-actions">
                        <button class="btn btn-outline" onclick="window.app.saveAsTemplate('${prompt.id}')">
                            <span class="btn-icon">📄</span>保存为模板
                        </button>
                        <button class="btn btn-outline" onclick="window.app.copyPrompt('${prompt.id}')">
                            <span class="btn-icon">📋</span>复制
                        </button>
                        <button class="btn btn-outline" onclick="window.app.exportPrompt('${prompt.id}')">
                            <span class="btn-icon">📤</span>导出
                        </button>
                        <button class="btn btn-error-outline" onclick="window.app.deletePrompt('${prompt.id}')">
                            <span class="btn-icon">🗑️</span>删除
                        </button>
                    </div>
                </div>
                
                <!-- 内容区域 -->
                <div class="detail-content-section">
                    <div class="content-block">
                        <div class="content-preview-enhanced">${window.utils.escapeHtml(prompt.content)}</div>
                    </div>
                    
                    ${this.getCategoryTagsHtml(prompt.categories) ? `
                        <div class="content-block">
                            <h4 class="section-title">分类</h4>
                            ${this.getCategoryTagsHtml(prompt.categories)}
                        </div>
                    ` : ''}
                    
                    ${prompt.tags && prompt.tags.length > 0 ? `
                        <div class="content-block">
                            <h4 class="section-title">标签</h4>
                            <div class="tags-enhanced">
                                ${prompt.tags.map(tag => `<span class="tag-enhanced">${window.utils.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.showDetailView(content);
    }

    showTemplateDetail(template) {
        this.currentView = 'template';
        this.updateContentTitle(template.name);
        this.updateBreadcrumb(['模板库', template.name]);

        const content = `
            <div class="detail-view-container">
                <!-- 标题区域 -->
                <div class="detail-title-section">
                    <h1 class="detail-main-title">${window.utils.escapeHtml(template.name)}</h1>
                    <div class="detail-meta-info">
                        <div class="meta-item">
                            <span class="meta-label">创建</span>
                            <span class="meta-value">${window.utils.formatDate(template.created_at)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">更新</span>
                            <span class="meta-value">${window.utils.formatDate(template.updated_at)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">使用</span>
                            <span class="meta-value">${template.usage_count} 次</span>
                        </div>
                    </div>
                </div>

                <!-- 操作按钮区域 -->
                <div class="detail-actions-section">
                    <div class="primary-actions">
                        <button class="btn btn-primary" onclick="window.app.createFromTemplate('${template.id}')">
                            <span class="btn-icon">🚀</span>使用模板
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.editTemplate('${template.id}')">
                            <span class="btn-icon">✏️</span>编辑
                        </button>
                    </div>
                    <div class="secondary-actions">
                        <button class="btn btn-outline" onclick="window.app.copyTemplate('${template.id}')">
                            <span class="btn-icon">📋</span>复制
                        </button>
                        <button class="btn btn-error-outline" onclick="window.app.deleteTemplate('${template.id}')">
                            <span class="btn-icon">🗑️</span>删除
                        </button>
                    </div>
                </div>
                
                <!-- 内容区域 -->
                <div class="detail-content-section">
                    ${template.description ? `
                        <div class="content-block">
                            <h4 class="section-title">描述</h4>
                            <p class="template-description">${window.utils.escapeHtml(template.description)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="content-block">
                        <h4 class="section-title">模板内容</h4>
                        <div class="content-preview-enhanced">${window.utils.escapeHtml(template.content)}</div>
                    </div>
                    
                    ${this.getCategoryTagsHtml(template.categories) ? `
                        <div class="content-block">
                            <h4 class="section-title">分类</h4>
                            ${this.getCategoryTagsHtml(template.categories)}
                        </div>
                    ` : ''}
                    
                    ${template.tags && template.tags.length > 0 ? `
                        <div class="content-block">
                            <h4 class="section-title">标签</h4>
                            <div class="tags-enhanced">
                                ${template.tags.map(tag => `<span class="tag-enhanced">${window.utils.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.showDetailView(content);
    }

    showDetailView(content) {
        document.getElementById('welcomeView').style.display = 'none';
        document.getElementById('promptView').style.display = this.currentView === 'prompt' ? 'block' : 'none';
        document.getElementById('templateView').style.display = this.currentView === 'template' ? 'block' : 'none';

        const activeView = document.getElementById(this.currentView + 'View');
        if (activeView) {
            activeView.innerHTML = content;
            activeView.style.display = 'block';
        }
    }

    showWelcomeView() {
        this.currentView = 'welcome';
        this.selectedPrompt = null;
        this.selectedTemplate = null;
        this.updateContentTitle('欢迎使用Prompt版本管理器');
        this.updateBreadcrumb([]);

        document.getElementById('welcomeView').style.display = 'block';
        document.getElementById('promptView').style.display = 'none';
        document.getElementById('templateView').style.display = 'none';

        this.clearSelection();
    }

    updateContentTitle(title) {
        const titleElement = document.getElementById('contentTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = items.map((item, index) => 
                index === items.length - 1 ? 
                `<span class="breadcrumb-current">${window.utils.escapeHtml(item)}</span>` :
                `<span class="breadcrumb-item">${window.utils.escapeHtml(item)}</span> <span class="breadcrumb-separator">›</span>`
            ).join(' ');
        }
    }

    updateSelection(type, id) {
        // 清除所有选中状态
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.remove('active');
        });

        // 设置新的选中状态
        const selector = type === 'prompts' ? '#promptsList' : '#templatesList';
        const container = document.querySelector(selector);
        if (container) {
            const items = container.querySelectorAll('.list-item');
            items.forEach(item => {
                if (item.onclick && item.onclick.toString().includes(id)) {
                    item.classList.add('active');
                }
            });
        }
    }

    clearSelection() {
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    updateCounts() {
        const promptCount = document.getElementById('promptCount');
        const templateCount = document.getElementById('templateCount');
        
        if (promptCount) promptCount.textContent = this.prompts.length;
        if (templateCount) templateCount.textContent = this.templates.length;
        
        // 更新分类计数
        this.updateCategoryCounts();
    }

    // 标签切换处理
    onTabSwitch(tab) {
        this.currentTab = tab;
        
        // 更新标签页状态
        document.querySelectorAll('.nav-tab').forEach(tabEl => {
            tabEl.classList.remove('active');
            if (tabEl.dataset.tab === tab) {
                tabEl.classList.add('active');
            }
        });

        // 更新列表显示
        document.querySelectorAll('.item-list').forEach(list => {
            list.classList.remove('active');
        });
        
        const targetList = document.getElementById(tab + 'List');
        if (targetList) {
            targetList.classList.add('active');
        }
        
        if (tab === 'prompts') {
            this.loadPrompts();
        } else if (tab === 'templates') {
            this.loadTemplates();
        }
        
        // 更新分类计数
        this.updateCategoryCounts();
        
        // 如果当前显示的是详情页，切换到欢迎页
        if (this.currentView !== 'welcome') {
            this.showWelcomeView();
        }
    }

    // 搜索相关方法
    async displaySearchResults(results) {
        const activeTab = this.currentTab;
        const container = document.getElementById(activeTab + 'List');
        
        if (!container) return;

        if (results.total === 0) {
            this.showEmptyState(activeTab + 'List', '没有找到匹配的结果', '尝试使用不同的关键词');
            return;
        }

        const items = results.results.filter(result => {
            if (activeTab === 'prompts') return result.entityType === 'prompt';
            if (activeTab === 'templates') return result.entityType === 'template';
            return true;
        });

        container.innerHTML = items.map(result => {
            if (result.entityType === 'prompt') {
                return this.renderPromptItem(result.entity);
            } else if (result.entityType === 'template') {
                return this.renderTemplateItem(result.entity);
            }
            return '';
        }).join('');
    }

    clearSearch() {
        if (this.currentTab === 'prompts') {
            this.renderPromptsList();
        } else if (this.currentTab === 'templates') {
            this.renderTemplatesList();
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // 通知方法
    showNotification(message, type = 'info', duration = 5000) {
        return window.components.notifications.show(message, type, duration);
    }

    // 模态框方法
    closeModal() {
        window.components.modal.close();
    }

    // 创建新Prompt
    async createNewPrompt() {
        const categorySelectionHtml = await this.getCategorySelectionHtml();
        
        const content = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">记录新想法 ✍️</h2>
                    <p class="modal-subtitle">写下你的灵感，我来帮你保存每个版本</p>
                </div>
                
                <form id="createPromptForm" class="modern-form">
                    <div class="form-group-modern">
                        <label for="promptTitle" class="form-label-modern">
                            <span class="label-text">给想法起个名字</span>
                            <span class="label-required">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="promptTitle" 
                            name="title" 
                            required 
                            placeholder="比如：周末计划、工作思路、学习笔记..." 
                            class="form-input-modern"
                            autocomplete="off"
                        >
                        <div class="input-hint">简单描述一下这个想法是关于什么的</div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label for="promptContent" class="form-label-modern">
                            <span class="label-text">详细内容</span>
                            <span class="label-required">*</span>
                        </label>
                        <textarea 
                            id="promptContent" 
                            name="content" 
                            required 
                            placeholder="在这里写下你的想法、计划、思路或者任何你想记录的内容..." 
                            rows="8" 
                            class="form-textarea-modern"
                        ></textarea>
                        <div class="input-hint">把你的想法详细写下来，想写多少写多少</div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label for="promptTags" class="form-label-modern">
                            <span class="label-text">添加标签</span>
                            <span class="label-optional">可选</span>
                        </label>
                        <input 
                            type="text" 
                            id="promptTags" 
                            name="tags" 
                            placeholder="工作, 学习, 生活..." 
                            class="form-input-modern"
                            autocomplete="off"
                        >
                        <div class="input-hint">用逗号分隔多个标签，方便以后查找</div>
                    </div>
                    
                    ${categorySelectionHtml}
                    
                    <div class="form-group-modern">
                        <label for="promptNote" class="form-label-modern">
                            <span class="label-text">备注说明</span>
                            <span class="label-optional">可选</span>
                        </label>
                        <input 
                            type="text" 
                            id="promptNote" 
                            name="note" 
                            placeholder="记录一下这次写了什么..." 
                            value="初始版本" 
                            class="form-input-modern"
                            autocomplete="off"
                        >
                        <div class="input-hint">记录这个版本的特点或变更内容</div>
                    </div>
                </form>
                
                <div class="modal-footer-modern">
                    <button type="button" class="btn-modern btn-secondary-modern modal-cancel-btn">
                        <span class="btn-icon">✕</span>
                        取消
                    </button>
                    <button type="button" class="btn-modern btn-primary-modern modal-submit-btn">
                        <span class="btn-icon">✓</span>
                        保存想法
                    </button>
                </div>
            </div>
        `;
        
        const modal = window.components.modal.show(content, {
            title: '',
            size: 'large',
            className: 'modern-modal'
        });

        // Add event listeners using event delegation
        modal.addEventListener('click', (e) => {
            // 检查是否点击了取消按钮或其子元素
            if (e.target.classList.contains('modal-cancel-btn') || e.target.closest('.modal-cancel-btn')) {
                window.components.modal.close();
            } 
            // 检查是否点击了提交按钮或其子元素
            else if (e.target.classList.contains('modal-submit-btn') || e.target.closest('.modal-submit-btn')) {
                this.submitCreatePrompt();
            }
        });

        // 绑定分类选择事件
        this.bindCategorySelectionEvents(modal);

        // 自动聚焦第一个输入框
        setTimeout(() => {
            const titleInput = document.getElementById('promptTitle');
            if (titleInput) {
                titleInput.focus();
            }
        }, 100);
    }

    async submitCreatePrompt() {
        // 表单验证
        const isValid = this.validateForm('createPromptForm', {
            title: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入Prompt标题',
                maxLengthMessage: '标题不能超过200个字符'
            },
            content: {
                required: true,
                minLength: 1,
                requiredMessage: '请输入Prompt内容'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('createPromptForm');
        const formData = new FormData(form);
        const title = formData.get('title')?.trim();
        const content = formData.get('content')?.trim();
        const tagsStr = formData.get('tags')?.trim();
        const note = formData.get('note')?.trim() || '初始版本';

        // 处理标签
        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        // 获取选中的分类
        const categories = this.getSelectedCategories(form);

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>创建中...';
            submitBtn.disabled = true;

            // 调用API创建Prompt
            const newPrompt = await window.api.createPrompt(title, content, tags, note, categories);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新Prompt列表
            await this.loadPrompts();
            
            // 如果有分类选择，自动切换到对应分类
            if (categories) {
                const firstCategory = Object.entries(categories)[0];
                if (firstCategory) {
                    const [categoryType, categoryKey] = firstCategory;
                    const categoryFilter = `${categoryType}:${categoryKey}`;
                    
                    // 确保DOM已经更新，然后应用筛选
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 验证分类项是否存在
                    const categoryItem = document.querySelector(`[data-category="${categoryFilter}"]`);
                    if (categoryItem) {
                        console.log('Found category item, applying filter:', categoryFilter);
                        this.filterByCategory(categoryFilter);
                        
                        // 再次延迟选择项目，确保筛选已完成
                        setTimeout(() => {
                            this.selectPrompt(newPrompt.id);
                        }, 100);
                    } else {
                        console.log('Category item not found:', categoryFilter);
                        // 如果找不到分类项，直接选择
                        this.selectPrompt(newPrompt.id);
                    }
                } else {
                    // 如果没有分类，直接选择
                    this.selectPrompt(newPrompt.id);
                }
            } else {
                // 如果没有分类，直接选择
                this.selectPrompt(newPrompt.id);
            }
            
            // 显示成功消息
            this.showNotification('想法保存成功！✨', 'success');
            
        } catch (error) {
            console.error('创建Prompt失败:', error);
            this.showNotification('创建Prompt失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    async createNewTemplate() {
        const categorySelectionHtml = await this.getCategorySelectionHtml();
        
        const content = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">创建新模板</h2>
                    <p class="modal-subtitle">创建可重复使用的Prompt模板</p>
                </div>
                
                <form id="createTemplateForm" class="modern-form">
                    <div class="form-group-modern">
                        <label for="templateName" class="form-label-modern">
                            <span class="label-text">模板名称</span>
                            <span class="label-required">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="templateName" 
                            name="name" 
                            required 
                            placeholder="为模板起个名字..." 
                            class="form-input-modern"
                            autocomplete="off"
                        >
                        <div class="input-hint">清晰的名称有助于快速找到合适的模板</div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label for="templateContent" class="form-label-modern">
                            <span class="label-text">模板内容</span>
                            <span class="label-required">*</span>
                        </label>
                        <textarea 
                            id="templateContent" 
                            name="content" 
                            required 
                            placeholder="输入模板内容，可以使用 {{变量名}} 作为占位符..." 
                            rows="8" 
                            class="form-textarea-modern"
                        ></textarea>
                        <div class="input-hint">使用 {{变量名}} 创建可替换的占位符，如 {{主题}}、{{风格}} 等</div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label for="templateDescription" class="form-label-modern">
                            <span class="label-text">描述</span>
                            <span class="label-optional">可选</span>
                        </label>
                        <textarea 
                            id="templateDescription" 
                            name="description" 
                            placeholder="描述模板的用途和使用方法..." 
                            rows="3" 
                            class="form-textarea-modern"
                        ></textarea>
                        <div class="input-hint">详细的描述有助于他人理解模板的用途</div>
                    </div>
                    
                    <div class="form-group-modern">
                        <label for="templateTags" class="form-label-modern">
                            <span class="label-text">标签</span>
                            <span class="label-optional">可选</span>
                        </label>
                        <input 
                            type="text" 
                            id="templateTags" 
                            name="tags" 
                            placeholder="模板, 写作, 通用..." 
                            class="form-input-modern"
                            autocomplete="off"
                        >
                        <div class="input-hint">用逗号分隔多个标签，便于分类管理</div>
                    </div>
                    
                    ${categorySelectionHtml}
                </form>
                
                <div class="modal-footer-modern">
                    <button type="button" class="btn-modern btn-secondary-modern modal-cancel-btn">
                        <span class="btn-icon">✕</span>
                        取消
                    </button>
                    <button type="button" class="btn-modern btn-primary-modern modal-submit-btn">
                        <span class="btn-icon">✓</span>
                        创建模板
                    </button>
                </div>
            </div>
        `;
        
        const modal = window.components.modal.show(content, {
            title: '',
            size: 'large',
            className: 'modern-modal'
        });

        // Add event listeners using event delegation
        modal.addEventListener('click', (e) => {
            // 检查是否点击了取消按钮或其子元素
            if (e.target.classList.contains('modal-cancel-btn') || e.target.closest('.modal-cancel-btn')) {
                window.components.modal.close();
            } 
            // 检查是否点击了提交按钮或其子元素
            else if (e.target.classList.contains('modal-submit-btn') || e.target.closest('.modal-submit-btn')) {
                this.submitCreateTemplate();
            }
        });

        // 绑定分类选择事件
        this.bindCategorySelectionEvents(modal);

        // 自动聚焦第一个输入框
        setTimeout(() => {
            const nameInput = document.getElementById('templateName');
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
    }

    async submitCreateTemplate() {
        // 表单验证
        const isValid = this.validateForm('createTemplateForm', {
            name: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入模板名称',
                maxLengthMessage: '名称不能超过200个字符'
            },
            content: {
                required: true,
                minLength: 1,
                requiredMessage: '请输入模板内容'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('createTemplateForm');
        const formData = new FormData(form);
        const name = formData.get('name')?.trim();
        const content = formData.get('content')?.trim();
        const description = formData.get('description')?.trim() || '';
        const tagsStr = formData.get('tags')?.trim();

        // 处理标签
        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        // 获取选中的分类
        const categories = this.getSelectedCategories(form);

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>创建中...';
            submitBtn.disabled = true;

            // 调用API创建模板
            const newTemplate = await window.api.createTemplate(name, content, description, tags, categories);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新模板列表
            await this.loadTemplates();
            
            // 切换到模板标签页
            this.switchToTab('templates');
            
            // 如果有分类选择，自动切换到对应分类
            if (categories) {
                const firstCategory = Object.entries(categories)[0];
                if (firstCategory) {
                    const [categoryType, categoryKey] = firstCategory;
                    const categoryFilter = `${categoryType}:${categoryKey}`;
                    
                    // 确保DOM已经更新，然后应用筛选
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 验证分类项是否存在
                    const categoryItem = document.querySelector(`[data-category="${categoryFilter}"]`);
                    if (categoryItem) {
                        console.log('Found category item, applying filter:', categoryFilter);
                        this.filterByCategory(categoryFilter);
                        
                        // 再次延迟选择项目，确保筛选已完成
                        setTimeout(() => {
                            this.selectTemplate(newTemplate.id);
                        }, 100);
                    } else {
                        console.log('Category item not found:', categoryFilter);
                        // 如果找不到分类项，直接选择
                        this.selectTemplate(newTemplate.id);
                    }
                } else {
                    // 如果没有分类，直接选择
                    this.selectTemplate(newTemplate.id);
                }
            } else {
                // 如果没有分类，直接选择
                this.selectTemplate(newTemplate.id);
            }
            
            // 显示成功消息
            this.showNotification('模板创建成功！', 'success');
            
        } catch (error) {
            console.error('创建模板失败:', error);
            this.showNotification('创建模板失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    // 切换标签页
    switchToTab(tabName) {
        // 更新标签页状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // 更新内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = document.getElementById(tabName + 'List');
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // 更新当前标签页
        this.currentTab = tabName;
        
        // 如果当前显示详情页，切换到欢迎页
        if (this.currentView !== 'welcome') {
            this.showWelcomeView();
        }
    }

    async editPrompt(id) {
        try {
            const prompt = await window.api.getPrompt(id);
            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">修改想法 ✏️</h2>
                        <p class="modal-subtitle">更新你的想法，每次修改都会保存历史版本</p>
                    </div>
                    
                    <form id="editPromptForm" class="modern-form">
                        <div class="form-group-modern">
                            <label for="editPromptTitle" class="form-label-modern">
                                <span class="label-text">标题</span>
                                <span class="label-required">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="editPromptTitle" 
                                name="title" 
                                required 
                                placeholder="输入Prompt标题" 
                                value="${window.utils.escapeHtml(prompt.title)}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editPromptContent" class="form-label-modern">
                                <span class="label-text">内容</span>
                                <span class="label-required">*</span>
                            </label>
                            <textarea 
                                id="editPromptContent" 
                                name="content" 
                                required 
                                placeholder="输入Prompt内容" 
                                rows="8" 
                                class="form-textarea-modern"
                            >${window.utils.escapeHtml(prompt.content)}</textarea>
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editPromptTags" class="form-label-modern">
                                <span class="label-text">标签</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <input 
                                type="text" 
                                id="editPromptTags" 
                                name="tags" 
                                placeholder="AI, 写作, 创意..." 
                                value="${prompt.tags ? prompt.tags.join(', ') : ''}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                            <div class="input-hint">用逗号分隔多个标签</div>
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editPromptNote" class="form-label-modern">
                                <span class="label-text">版本说明</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <input 
                                type="text" 
                                id="editPromptNote" 
                                name="note" 
                                placeholder="记录本次修改的内容..."
                                class="form-input-modern"
                                autocomplete="off"
                            >
                            <div class="input-hint">描述这次修改的主要变更</div>
                        </div>
                    </form>
                    
                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button type="button" class="btn-modern btn-primary-modern" onclick="window.app.submitEditPrompt('${id}')">
                            <span class="btn-icon">✓</span>
                            保存修改
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
        } catch (error) {
            console.error('编辑Prompt失败:', error);
            this.showNotification('加载Prompt信息失败', 'error');
        }
    }

    async submitEditPrompt(promptId) {
        // 表单验证
        const isValid = this.validateForm('editPromptForm', {
            title: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入标题',
                maxLengthMessage: '标题不能超过200个字符'
            },
            content: {
                required: true,
                minLength: 1,
                requiredMessage: '请输入内容'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('editPromptForm');
        const formData = new FormData(form);
        const title = formData.get('title')?.trim();
        const content = formData.get('content')?.trim();
        const tagsStr = formData.get('tags')?.trim();
        const note = formData.get('note')?.trim();

        // 处理标签
        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>保存中...';
            submitBtn.disabled = true;

            // 调用API更新Prompt
            const updates = { title, content, tags };
            await window.api.updatePrompt(promptId, updates, note);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新Prompt列表
            await this.loadPrompts();
            
            // 重新选择更新后的Prompt
            await this.selectPrompt(promptId);
            
            // 显示成功消息
            this.showNotification('想法更新成功！📝', 'success');
            
        } catch (error) {
            console.error('更新Prompt失败:', error);
            this.showNotification('更新Prompt失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    async editTemplate(id) {
        try {
            const template = await window.api.getTemplate(id);
            if (!template) {
                this.showNotification('模板不存在', 'error');
                return;
            }

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">编辑模板</h2>
                        <p class="modal-subtitle">修改模板内容和设置</p>
                    </div>
                    
                    <form id="editTemplateForm" class="modern-form">
                        <div class="form-group-modern">
                            <label for="editTemplateName" class="form-label-modern">
                                <span class="label-text">模板名称</span>
                                <span class="label-required">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="editTemplateName" 
                                name="name" 
                                required 
                                placeholder="输入模板名称" 
                                value="${window.utils.escapeHtml(template.name)}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editTemplateContent" class="form-label-modern">
                                <span class="label-text">模板内容</span>
                                <span class="label-required">*</span>
                            </label>
                            <textarea 
                                id="editTemplateContent" 
                                name="content" 
                                required 
                                placeholder="输入模板内容，可以使用 {{变量名}} 作为占位符" 
                                rows="8" 
                                class="form-textarea-modern"
                            >${window.utils.escapeHtml(template.content)}</textarea>
                            <div class="input-hint">使用 {{变量名}} 创建可替换的占位符</div>
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editTemplateDescription" class="form-label-modern">
                                <span class="label-text">描述</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <textarea 
                                id="editTemplateDescription" 
                                name="description" 
                                placeholder="描述模板的用途和使用方法" 
                                rows="3" 
                                class="form-textarea-modern"
                            >${window.utils.escapeHtml(template.description || '')}</textarea>
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="editTemplateTags" class="form-label-modern">
                                <span class="label-text">标签</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <input 
                                type="text" 
                                id="editTemplateTags" 
                                name="tags" 
                                placeholder="模板, 写作, 通用..." 
                                value="${template.tags ? template.tags.join(', ') : ''}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                            <div class="input-hint">用逗号分隔多个标签</div>
                        </div>
                    </form>
                    
                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button type="button" class="btn-modern btn-primary-modern" onclick="window.app.submitEditTemplate('${id}')">
                            <span class="btn-icon">✓</span>
                            保存修改
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
        } catch (error) {
            console.error('编辑模板失败:', error);
            this.showNotification('加载模板信息失败', 'error');
        }
    }

    async submitEditTemplate(templateId) {
        // 表单验证
        const isValid = this.validateForm('editTemplateForm', {
            name: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入模板名称',
                maxLengthMessage: '名称不能超过200个字符'
            },
            content: {
                required: true,
                minLength: 1,
                requiredMessage: '请输入模板内容'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('editTemplateForm');
        const formData = new FormData(form);
        const name = formData.get('name')?.trim();
        const content = formData.get('content')?.trim();
        const description = formData.get('description')?.trim() || '';
        const tagsStr = formData.get('tags')?.trim();

        // 处理标签
        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>保存中...';
            submitBtn.disabled = true;

            // 调用API更新模板
            const updates = { name, content, description, tags };
            await window.api.updateTemplate(templateId, updates);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新模板列表
            await this.loadTemplates();
            
            // 重新选择更新后的模板
            await this.selectTemplate(templateId);
            
            // 显示成功消息
            this.showNotification('模板更新成功！', 'success');
            
        } catch (error) {
            console.error('更新模板失败:', error);
            this.showNotification('更新模板失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    async deletePrompt(id) {
        try {
            const prompt = await window.api.getPrompt(id);
            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            const confirmed = await window.components.modal.confirm(
                `确定要删除Prompt "${prompt.title}" 吗？`,
                '此操作将删除该Prompt及其所有版本历史，且不可撤销。'
            );
            
            if (confirmed) {
                try {
                    await window.api.deletePrompt(id);
                    
                    // 刷新列表
                    await this.loadPrompts();
                    
                    // 如果当前选中的是被删除的Prompt，切换到欢迎页
                    if (this.selectedPrompt?.id === id) {
                        this.showWelcomeView();
                    }
                    
                    this.showNotification('想法删除成功 🗑️', 'success');
                } catch (error) {
                    console.error('删除Prompt失败:', error);
                    this.showNotification('删除Prompt失败: ' + error.message, 'error');
                }
            }
        } catch (error) {
            console.error('删除Prompt失败:', error);
            this.showNotification('删除操作失败', 'error');
        }
    }

    async deleteTemplate(id) {
        try {
            const template = await window.api.getTemplate(id);
            if (!template) {
                this.showNotification('模板不存在', 'error');
                return;
            }

            const confirmed = await window.components.modal.confirm(
                `确定要删除模板 "${template.name}" 吗？`,
                '此操作不可撤销。'
            );
            
            if (confirmed) {
                try {
                    await window.api.deleteTemplate(id);
                    
                    // 刷新列表
                    await this.loadTemplates();
                    
                    // 如果当前选中的是被删除的模板，切换到欢迎页
                    if (this.selectedTemplate?.id === id) {
                        this.showWelcomeView();
                    }
                    
                    this.showNotification('模板删除成功', 'success');
                } catch (error) {
                    console.error('删除模板失败:', error);
                    this.showNotification('删除模板失败: ' + error.message, 'error');
                }
            }
        } catch (error) {
            console.error('删除模板失败:', error);
            this.showNotification('删除操作失败', 'error');
        }
    }

    async showVersionHistory(id) {
        try {
            const [prompt, versions] = await Promise.all([
                window.api.getPrompt(id),
                window.api.getVersionHistory(id)
            ]);

            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">版本历史</h2>
                        <p class="modal-subtitle">${window.utils.escapeHtml(prompt.title)}</p>
                    </div>
                    
                    <div class="version-list" style="padding: 32px; max-height: 500px; overflow-y: auto;">
                        ${versions.map(version => `
                            <div class="version-item ${version.id === prompt.current_version_id ? 'current' : ''}" data-version-id="${version.id}">
                                <div class="version-header">
                                    <div class="version-info">
                                        <span class="version-number">版本 ${version.version_number}</span>
                                        ${version.is_rollback ? '<span class="rollback-badge">回滚</span>' : ''}
                                        ${version.id === prompt.current_version_id ? '<span class="current-badge">当前</span>' : ''}
                                    </div>
                                    <div class="version-date">${window.utils.formatDate(version.created_at)}</div>
                                </div>
                                
                                <div class="version-note">${window.utils.escapeHtml(version.note || '无说明')}</div>
                                
                                <div class="version-content-preview">
                                    ${window.utils.truncateText(version.content, 200)}
                                </div>
                                
                                <div class="version-actions">
                                    <button class="btn-modern btn-secondary-modern version-preview-btn" data-version-id="${version.id}">预览</button>
                                    ${version.id !== prompt.current_version_id ? 
                                        `<button class="btn-modern btn-primary-modern version-rollback-btn" data-prompt-id="${id}" data-version-id="${version.id}" data-version-number="${version.version_number}">回滚到此版本</button>` : 
                                        ''
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button class="btn-modern btn-secondary-modern modal-close-btn">
                            <span class="btn-icon">✕</span>
                            关闭
                        </button>
                    </div>
                </div>
            `;
            
            const modal = window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
            
            // Store versions data for preview functionality
            this.currentVersions = versions;
            
            // Add event listeners using event delegation
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('version-preview-btn')) {
                    const versionId = e.target.dataset.versionId;
                    this.previewVersionById(versionId);
                } else if (e.target.classList.contains('version-rollback-btn')) {
                    const promptId = e.target.dataset.promptId;
                    const versionId = e.target.dataset.versionId;
                    const versionNumber = e.target.dataset.versionNumber;
                    this.rollbackToVersion(promptId, versionId, parseInt(versionNumber));
                } else if (e.target.classList.contains('modal-close-btn')) {
                    window.components.modal.close();
                }
            });
            
        } catch (error) {
            console.error('获取版本历史失败:', error);
            this.showNotification('获取版本历史失败: ' + error.message, 'error');
        }
    }

    async previewVersion(versionId, content) {
        const previewContent = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">版本内容预览</h2>
                    <p class="modal-subtitle">查看完整版本内容</p>
                </div>
                
                <div style="padding: 32px;">
                    <div class="content-preview-full">
                        ${window.utils.escapeHtml(content)}
                    </div>
                </div>
                
                <div class="modal-footer-modern">
                    <button class="btn-modern btn-secondary-modern" onclick="window.components.modal.close()">
                        <span class="btn-icon">✕</span>
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        window.components.modal.show(previewContent, {
            title: '',
            size: 'large',
            className: 'modern-modal'
        });
    }

    async previewVersionById(versionId) {
        try {
            // Find the version in the stored versions data
            const version = this.currentVersions?.find(v => v.id === versionId);
            if (version) {
                this.previewVersion(versionId, version.content);
            } else {
                this.showNotification('版本数据未找到', 'error');
            }
        } catch (error) {
            console.error('预览版本失败:', error);
            this.showNotification('预览版本失败: ' + error.message, 'error');
        }
    }

    async rollbackToVersion(promptId, versionId, versionNumber) {
        try {
            console.log('开始版本回滚流程:', { promptId, versionId, versionNumber });
            
            const confirmed = await window.components.modal.confirm(
                `确定要回滚到版本 ${versionNumber} 吗？`,
                '这将创建一个新版本，原有内容不会丢失。'
            );
            
            console.log('用户确认结果:', confirmed);
            
            if (confirmed) {
                try {
                    // 显示加载状态
                    const loadingNotificationId = this.showNotification('正在回滚版本...', 'info', 0);
                    
                    console.log('开始调用API回滚版本');
                    const note = `回滚到版本 ${versionNumber}`;
                    await window.api.rollbackToVersion(promptId, versionId, note);
                    console.log('API回滚成功');
                    
                    // 清除加载通知
                    if (loadingNotificationId) {
                        window.components.notifications.remove(loadingNotificationId);
                    }
                    
                    // 确保所有模态框都关闭
                    window.components.modal.close();
                    
                    // 强制清理任何残留的模态框状态
                    document.body.classList.remove('modal-open');
                    document.body.style.pointerEvents = '';
                    document.documentElement.style.pointerEvents = '';
                    
                    // 清理模态框容器
                    const modalContainer = document.getElementById('modalContainer');
                    if (modalContainer) {
                        modalContainer.innerHTML = '';
                    }
                    
                    console.log('开始刷新数据');
                    
                    // 刷新数据
                    await this.loadPrompts();
                    await this.selectPrompt(promptId);
                    
                    console.log('数据刷新完成');
                    
                    // 显示成功消息
                    this.showNotification('版本回滚成功', 'success');
                    
                } catch (error) {
                    console.error('版本回滚API调用失败:', error);
                    this.showNotification('版本回滚失败: ' + error.message, 'error');
                    
                    // 确保清理状态
                    document.body.classList.remove('modal-open');
                    document.body.style.pointerEvents = '';
                    document.documentElement.style.pointerEvents = '';
                }
            } else {
                console.log('用户取消了回滚操作');
            }
        } catch (error) {
            console.error('版本回滚流程失败:', error);
            this.showNotification('版本回滚失败: ' + error.message, 'error');
            
            // 确保清理状态
            document.body.classList.remove('modal-open');
            document.body.style.pointerEvents = '';
            document.documentElement.style.pointerEvents = '';
        }
    }

    async saveAsTemplate(id) {
        try {
            const prompt = await window.api.getPrompt(id);
            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">保存为模板</h2>
                        <p class="modal-subtitle">将Prompt转换为可重复使用的模板</p>
                    </div>
                    
                    <form id="saveAsTemplateForm" class="modern-form">
                        <div class="form-group-modern">
                            <label for="templateName" class="form-label-modern">
                                <span class="label-text">模板名称</span>
                                <span class="label-required">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="templateName" 
                                name="name" 
                                required 
                                placeholder="输入模板名称" 
                                value="${window.utils.escapeHtml(prompt.title)} - 模板"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="templateDescription" class="form-label-modern">
                                <span class="label-text">描述</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <textarea 
                                id="templateDescription" 
                                name="description" 
                                placeholder="描述模板的用途和使用方法" 
                                rows="3"
                                class="form-textarea-modern"
                            >基于Prompt "${window.utils.escapeHtml(prompt.title)}" 创建的模板</textarea>
                        </div>
                        
                        <div class="form-group-modern">
                            <label for="templateTags" class="form-label-modern">
                                <span class="label-text">标签</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <input 
                                type="text" 
                                id="templateTags" 
                                name="tags" 
                                placeholder="模板, 写作, 通用..." 
                                value="${prompt.tags ? prompt.tags.join(', ') : ''}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                            <div class="input-hint">将继承原Prompt的标签，可以添加新标签</div>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <span class="label-text">模板内容预览</span>
                            </label>
                            <div class="content-preview">${window.utils.truncateText(prompt.content, 300)}</div>
                        </div>
                    </form>
                    
                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button type="button" class="btn-modern btn-primary-modern" onclick="window.app.submitSaveAsTemplate('${id}')">
                            <span class="btn-icon">✓</span>
                            保存为模板
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
        } catch (error) {
            console.error('保存为模板失败:', error);
            this.showNotification('加载Prompt信息失败', 'error');
        }
    }

    async submitSaveAsTemplate(promptId) {
        // 表单验证
        const isValid = this.validateForm('saveAsTemplateForm', {
            name: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入模板名称',
                maxLengthMessage: '名称不能超过200个字符'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('saveAsTemplateForm');
        const formData = new FormData(form);
        const name = formData.get('name')?.trim();
        const description = formData.get('description')?.trim() || '';
        const tagsStr = formData.get('tags')?.trim();

        // 处理标签
        const additionalTags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>保存中...';
            submitBtn.disabled = true;

            // 调用API创建模板
            await window.api.createTemplateFromPrompt(promptId, name, description, additionalTags);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新模板列表
            await this.loadTemplates();
            
            // 显示成功消息
            this.showNotification('模板创建成功！', 'success');
            
        } catch (error) {
            console.error('保存为模板失败:', error);
            this.showNotification('保存为模板失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    async createFromTemplate(id) {
        try {
            const template = await window.api.getTemplate(id);
            if (!template) {
                this.showNotification('模板不存在', 'error');
                return;
            }

            // 检查模板中是否有变量占位符
            const variables = this.extractTemplateVariables(template.content);

            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">用模板写想法 📋</h2>
                        <p class="modal-subtitle">基于现有模板快速创建新想法</p>
                    </div>
                    
                    <form id="createFromTemplateForm" class="modern-form">
                        <div class="form-group-modern">
                            <label for="promptTitle" class="form-label-modern">
                                <span class="label-text">Prompt标题</span>
                                <span class="label-required">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="promptTitle" 
                                name="title" 
                                required 
                                placeholder="输入Prompt标题" 
                                value="基于模板: ${window.utils.escapeHtml(template.name)}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                        </div>
                        
                        ${variables.length > 0 ? `
                            <div class="form-section">
                                <h4>模板变量</h4>
                                <p class="form-help">请为模板中的变量提供具体值：</p>
                                ${variables.map(variable => `
                                    <div class="form-group-modern">
                                        <label for="var_${variable}" class="form-label-modern">
                                            <span class="label-text">{{${variable}}}</span>
                                            <span class="label-required">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            id="var_${variable}" 
                                            name="var_${variable}" 
                                            placeholder="输入 ${variable} 的值"
                                            class="form-input-modern"
                                            autocomplete="off"
                                        >
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="form-group-modern">
                            <label for="promptTags" class="form-label-modern">
                                <span class="label-text">标签</span>
                                <span class="label-optional">可选</span>
                            </label>
                            <input 
                                type="text" 
                                id="promptTags" 
                                name="tags" 
                                placeholder="AI, 写作, 创意..." 
                                value="${template.tags ? template.tags.join(', ') : ''}"
                                class="form-input-modern"
                                autocomplete="off"
                            >
                            <div class="input-hint">将继承模板的标签，可以添加新标签</div>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <span class="label-text">模板内容预览</span>
                            </label>
                            <div class="content-preview">${window.utils.escapeHtml(template.content)}</div>
                        </div>
                    </form>
                    
                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button type="button" class="btn-modern btn-primary-modern" onclick="window.app.submitCreateFromTemplate('${id}')">
                            <span class="btn-icon">✓</span>
                            创建Prompt
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
        } catch (error) {
            console.error('从模板创建失败:', error);
            this.showNotification('加载模板信息失败', 'error');
        }
    }

    extractTemplateVariables(content) {
        const regex = /\{\{(\w+)\}\}/g;
        const variables = new Set();
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            variables.add(match[1]);
        }
        
        return Array.from(variables);
    }

    async submitCreateFromTemplate(templateId) {
        // 表单验证
        const isValid = this.validateForm('createFromTemplateForm', {
            title: {
                required: true,
                minLength: 1,
                maxLength: 200,
                requiredMessage: '请输入Prompt标题',
                maxLengthMessage: '标题不能超过200个字符'
            }
        });

        if (!isValid) return;

        const form = document.getElementById('createFromTemplateForm');
        const formData = new FormData(form);
        const title = formData.get('title')?.trim();
        const tagsStr = formData.get('tags')?.trim();

        // 收集变量值
        const variables = {};
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('var_')) {
                const variableName = key.substring(4);
                variables[variableName] = value.trim();
            }
        }

        // 处理标签
        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>创建中...';
            submitBtn.disabled = true;

            // 调用API从模板创建Prompt
            const customizations = {
                title,
                tags,
                variables
            };
            
            const newPrompt = await window.api.createPromptFromTemplate(templateId, customizations);
            
            // 关闭模态框
            this.closeModal();
            
            // 刷新Prompt列表
            await this.loadPrompts();
            
            // 选择新创建的Prompt
            await this.selectPrompt(newPrompt.id);
            
            // 显示成功消息
            this.showNotification('从模板创建Prompt成功！', 'success');
            
        } catch (error) {
            console.error('从模板创建失败:', error);
            this.showNotification('从模板创建失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    async copyPrompt(id) {
        try {
            const prompt = await window.api.getPrompt(id);
            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            // 复制到剪贴板
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(prompt.content);
                this.showNotification('Prompt内容已复制到剪贴板', 'success');
            } else {
                // 降级方案：使用传统方法
                const textArea = document.createElement('textarea');
                textArea.value = prompt.content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('Prompt内容已复制到剪贴板', 'success');
            }
        } catch (error) {
            console.error('复制Prompt失败:', error);
            this.showNotification('复制失败: ' + error.message, 'error');
        }
    }

    async copyTemplate(id) {
        try {
            const template = await window.api.getTemplate(id);
            if (!template) {
                this.showNotification('模板不存在', 'error');
                return;
            }

            // 复制到剪贴板
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(template.content);
                this.showNotification('模板内容已复制到剪贴板', 'success');
            } else {
                // 降级方案：使用传统方法
                const textArea = document.createElement('textarea');
                textArea.value = template.content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('模板内容已复制到剪贴板', 'success');
            }
        } catch (error) {
            console.error('复制模板失败:', error);
            this.showNotification('复制失败: ' + error.message, 'error');
        }
    }

    async exportPrompt(id) {
        try {
            const prompt = await window.api.getPrompt(id);
            if (!prompt) {
                this.showNotification('Prompt不存在', 'error');
                return;
            }

            // 使用Electron的文件对话框选择保存位置
            if (window.electronAPI && window.electronAPI.showSaveDialog) {
                const result = await window.electronAPI.showSaveDialog({
                    title: '导出Prompt',
                    defaultPath: `${prompt.title}.json`,
                    filters: [
                        { name: 'JSON文件', extensions: ['json'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    await window.api.exportPrompt(id, result.filePath);
                    this.showNotification('Prompt导出成功', 'success');
                }
            } else {
                // 降级方案：下载文件
                const exportData = await window.api.exportPrompt(id);
                this.downloadFile(JSON.stringify(exportData, null, 2), `${prompt.title}.json`, 'application/json');
                this.showNotification('Prompt导出成功', 'success');
            }
        } catch (error) {
            console.error('导出Prompt失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }

    async exportAll() {
        try {
            // 使用Electron的文件对话框选择保存位置
            if (window.electronAPI && window.electronAPI.showSaveDialog) {
                const result = await window.electronAPI.showSaveDialog({
                    title: '导出全部数据',
                    defaultPath: `prompt-manager-backup-${new Date().toISOString().split('T')[0]}.json`,
                    filters: [
                        { name: 'JSON文件', extensions: ['json'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    const exportResult = await window.api.exportAll(result.filePath);
                    this.showNotification(`导出成功！共导出 ${exportResult.statistics.total_prompts} 个Prompt和 ${exportResult.statistics.total_templates} 个模板`, 'success');
                }
            } else {
                // 降级方案：下载文件
                const exportData = await window.api.exportAll();
                const filename = `prompt-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
                this.downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
                this.showNotification('全部数据导出成功', 'success');
            }
        } catch (error) {
            console.error('导出全部数据失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }

    async exportTemplates() {
        try {
            // 使用Electron的文件对话框选择保存位置
            if (window.electronAPI && window.electronAPI.showSaveDialog) {
                const result = await window.electronAPI.showSaveDialog({
                    title: '导出模板库',
                    defaultPath: `templates-${new Date().toISOString().split('T')[0]}.json`,
                    filters: [
                        { name: 'JSON文件', extensions: ['json'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    const exportResult = await window.api.exportTemplates(result.filePath);
                    this.showNotification(`模板库导出成功！共导出 ${exportResult.statistics.total_templates} 个模板`, 'success');
                }
            } else {
                // 降级方案：下载文件
                const exportData = await window.api.exportTemplates();
                const filename = `templates-${new Date().toISOString().split('T')[0]}.json`;
                this.downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
                this.showNotification('模板库导出成功', 'success');
            }
        } catch (error) {
            console.error('导出模板库失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }

    // 辅助方法：下载文件
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async importData() {
        try {
            // 使用Electron的文件对话框选择文件
            if (window.electronAPI && window.electronAPI.showOpenDialog) {
                const result = await window.electronAPI.showOpenDialog({
                    title: '选择导入文件',
                    filters: [
                        { name: 'JSON文件', extensions: ['json'] }
                    ],
                    properties: ['openFile']
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    
                    // 先验证文件
                    const validation = await window.api.validateImportFile(filePath);
                    
                    if (!validation.valid) {
                        this.showNotification('导入文件格式无效: ' + validation.errors.join(', '), 'error');
                        return;
                    }

                    // 显示导入选项对话框
                    this.showImportOptionsDialog(filePath, validation.info);
                }
            } else {
                // 降级方案：文件输入
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const content = await file.text();
                            const data = JSON.parse(content);
                            
                            // 简单验证
                            if (!data.export_info) {
                                this.showNotification('导入文件格式无效', 'error');
                                return;
                            }

                            // 直接导入（使用默认选项）
                            const result = await window.api.importData(data, { overwrite: false, includeVersions: true });
                            this.showImportResult(result);
                        } catch (error) {
                            this.showNotification('导入失败: ' + error.message, 'error');
                        }
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            this.showNotification('导入失败: ' + error.message, 'error');
        }
    }

    showImportOptionsDialog(filePath, fileInfo) {
        const content = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">导入数据</h2>
                    <p class="modal-subtitle">配置导入选项</p>
                </div>
                
                <div class="modern-form" style="padding: 32px;">
                    <div class="import-info">
                        <h4>文件信息</h4>
                        <p><strong>类型:</strong> ${fileInfo.type}</p>
                        <p><strong>导出时间:</strong> ${window.utils.formatDate(fileInfo.exported_at)}</p>
                        ${fileInfo.version ? `<p><strong>版本:</strong> ${fileInfo.version}</p>` : ''}
                    </div>
                    
                    <form id="importOptionsForm">
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <input type="checkbox" name="overwrite" value="true"> 
                                <span class="label-text">覆盖已存在的数据</span>
                            </label>
                            <div class="input-hint">如果取消选择，将跳过已存在的项目</div>
                        </div>
                        
                        <div class="form-group-modern">
                            <label class="form-label-modern">
                                <input type="checkbox" name="includeVersions" value="true" checked> 
                                <span class="label-text">包含版本历史</span>
                            </label>
                            <div class="input-hint">导入Prompt的完整版本历史</div>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer-modern">
                    <button type="button" class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                        <span class="btn-icon">✕</span>
                        取消
                    </button>
                    <button type="button" class="btn-modern btn-primary-modern" onclick="window.app.executeImport('${filePath}')">
                        <span class="btn-icon">📥</span>
                        开始导入
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

    async executeImport(filePath) {
        const form = document.getElementById('importOptionsForm');
        if (!form) return;

        const formData = new FormData(form);
        const options = {
            overwrite: formData.has('overwrite'),
            includeVersions: formData.has('includeVersions')
        };

        try {
            // 显示加载状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="loading-spinner"></span>导入中...';
            submitBtn.disabled = true;

            const result = await window.api.importData(filePath, options);
            
            // 关闭模态框
            this.closeModal();
            
            // 显示导入结果
            this.showImportResult(result);
            
            // 刷新数据
            await Promise.all([
                this.loadPrompts(),
                this.loadTemplates()
            ]);
            
        } catch (error) {
            console.error('导入失败:', error);
            this.showNotification('导入失败: ' + error.message, 'error');
            
            // 恢复按钮状态
            const submitBtn = document.querySelector('.modal-footer-modern .btn-primary-modern');
            if (submitBtn) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        }
    }

    showImportResult(result) {
        const { imported, conflicts, errors } = result;
        
        let message = `导入完成！`;
        if (imported.prompts > 0) message += ` 导入了 ${imported.prompts} 个Prompt`;
        if (imported.templates > 0) message += ` ${imported.templates} 个模板`;
        if (imported.versions > 0) message += ` ${imported.versions} 个版本`;
        
        if (conflicts.length > 0) {
            message += `\n跳过了 ${conflicts.length} 个冲突项目`;
        }
        
        if (errors.length > 0) {
            message += `\n${errors.length} 个项目导入失败`;
        }
        
        this.showNotification(message, result.success ? 'success' : 'warning');
    }
    
    async showStats() {
        try {
            const stats = await window.api.getAppStats();
            
            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">应用统计信息</h2>
                        <p class="modal-subtitle">查看您的使用数据和统计</p>
                    </div>
                    
                    <div style="padding: 32px;">
                        <div class="stats-grid">
                            <div class="stats-section">
                                <h3>Prompt统计</h3>
                                <div class="stats-item">
                                    <span class="stats-label">总数量:</span>
                                    <span class="stats-value">${stats.prompts.total_prompts}</span>
                                </div>
                                <div class="stats-item">
                                    <span class="stats-label">总版本数:</span>
                                    <span class="stats-value">${stats.prompts.total_versions}</span>
                                </div>
                                <div class="stats-item">
                                    <span class="stats-label">平均版本数:</span>
                                    <span class="stats-value">${stats.prompts.average_versions_per_prompt}</span>
                                </div>
                            </div>
                            
                            <div class="stats-section">
                                <h3>模板统计</h3>
                                <div class="stats-item">
                                    <span class="stats-label">总数量:</span>
                                    <span class="stats-value">${stats.templates.total_templates}</span>
                                </div>
                                <div class="stats-item">
                                    <span class="stats-label">总使用次数:</span>
                                    <span class="stats-value">${stats.templates.total_usage}</span>
                                </div>
                                <div class="stats-item">
                                    <span class="stats-label">平均使用次数:</span>
                                    <span class="stats-value">${stats.templates.average_usage}</span>
                                </div>
                                ${stats.templates.most_used_template ? `
                                    <div class="stats-item">
                                        <span class="stats-label">最常用模板:</span>
                                        <span class="stats-value">${window.utils.escapeHtml(stats.templates.most_used_template.name)} (${stats.templates.most_used_template.usage_count}次)</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="stats-section">
                                <h3>搜索统计</h3>
                                <div class="stats-item">
                                    <span class="stats-label">索引项目数:</span>
                                    <span class="stats-value">${stats.search.total_indexed}</span>
                                </div>
                                <div class="stats-item">
                                    <span class="stats-label">最后更新:</span>
                                    <span class="stats-value">${window.utils.formatDate(stats.search.last_updated)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="stats-footer">
                            <p><small>统计时间: ${window.utils.formatDate(stats.last_updated)}</small></p>
                        </div>
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button class="btn-modern btn-secondary-modern" onclick="window.components.modal.close()">
                            <span class="btn-icon">✕</span>
                            关闭
                        </button>
                        <button class="btn-modern btn-primary-modern" onclick="window.app.refreshStats()">
                            <span class="btn-icon">🔄</span>
                            刷新
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
        } catch (error) {
            console.error('获取统计信息失败:', error);
            this.showNotification('获取统计信息失败: ' + error.message, 'error');
        }
    }

    async refreshStats() {
        // 重新获取并显示统计信息
        await this.showStats();
    }

    async showSettings() {
        try {
            const content = `
                <div class="modern-modal-content">
                    <div class="modal-header-modern">
                        <h2 class="modal-title-modern">应用设置</h2>
                        <p class="modal-subtitle">个性化您的使用体验</p>
                    </div>
                    
                    <div style="padding: 32px;">
                        <div class="settings-tabs">
                            <button class="settings-tab active" onclick="window.app.switchSettingsTab('general')">常规</button>
                            <button class="settings-tab" onclick="window.app.switchSettingsTab('data')">数据管理</button>
                            <button class="settings-tab" onclick="window.app.switchSettingsTab('about')">关于</button>
                        </div>
                        
                        <div class="settings-content">
                            <div id="settings-general" class="settings-panel active">
                                <h3>常规设置</h3>
                                
                                <div class="setting-item">
                                    <label>界面主题</label>
                                    <select id="theme-select">
                                        <option value="light">浅色主题</option>
                                        <option value="dark">深色主题</option>
                                        <option value="auto">跟随系统</option>
                                    </select>
                                </div>
                                
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="auto-save" checked> 
                                        自动保存
                                    </label>
                                    <small>编辑时自动保存更改</small>
                                </div>
                                
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="confirm-delete" checked> 
                                        删除确认
                                    </label>
                                    <small>删除项目前显示确认对话框</small>
                                </div>
                            </div>
                            
                            <div id="settings-data" class="settings-panel">
                                <h3>数据管理</h3>
                                
                                <div class="setting-item">
                                    <label>数据存储位置</label>
                                    <div class="data-path-display">
                                        <span id="data-path">加载中...</span>
                                        <button class="btn btn-sm btn-secondary" onclick="window.app.openDataFolder()">打开文件夹</button>
                                    </div>
                                </div>
                                
                                <div class="setting-item">
                                    <label>数据库维护</label>
                                    <div class="maintenance-actions">
                                        <button class="btn btn-secondary" onclick="window.app.rebuildSearchIndex()">重建搜索索引</button>
                                        <button class="btn btn-secondary" onclick="window.app.performMaintenance()">数据库优化</button>
                                    </div>
                                </div>
                                
                                <div class="setting-item">
                                    <label>备份与恢复</label>
                                    <div class="backup-actions">
                                        <button class="btn btn-primary" onclick="window.app.exportAll()">创建完整备份</button>
                                        <button class="btn btn-secondary" onclick="window.app.importData()">从备份恢复</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="settings-about" class="settings-panel">
                                <div class="about-content">
                                    <div class="about-logo">📝</div>
                                    <h3>Prompt版本管理器</h3>
                                    <p class="version">版本 1.0.0</p>
                                    <p class="description">专业的Prompt版本管理解决方案</p>
                                    
                                    <div class="features-list">
                                        <div class="feature-item">✨ 自动版本控制</div>
                                        <div class="feature-item">📋 模板系统</div>
                                        <div class="feature-item">🔍 智能搜索</div>
                                        <div class="feature-item">💾 数据安全</div>
                                        <div class="feature-item">📤 导入导出</div>
                                        <div class="feature-item">🔄 版本回滚</div>
                                    </div>
                                    
                                    <div class="app-info">
                                        <p><strong>开发者:</strong> Prompt版本管理器团队</p>
                                        <p><strong>技术栈:</strong> Electron + SQLite</p>
                                        <p><strong>许可证:</strong> MIT License</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer-modern">
                        <button class="btn-modern btn-secondary-modern" onclick="window.app.closeModal()">
                            <span class="btn-icon">✕</span>
                            取消
                        </button>
                        <button class="btn-modern btn-primary-modern" onclick="window.app.saveSettings()">
                            <span class="btn-icon">✓</span>
                            保存设置
                        </button>
                    </div>
                </div>
            `;
            
            window.components.modal.show(content, {
                title: '',
                size: 'large',
                className: 'modern-modal'
            });
    
            // 加载数据路径
            this.loadDataPath();
            
            // 初始化主题选择器
            this.initThemeSelector();
            
        } catch (error) {
            console.error('显示设置失败:', error);
            this.showNotification('显示设置失败: ' + error.message, 'error');
        }
    }

    // 初始化主题选择器
    initThemeSelector() {
        // 使用setTimeout确保DOM元素已经渲染
        setTimeout(() => {
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                // 设置当前主题值
                const currentTheme = localStorage.getItem('app-theme') || 'auto';
                themeSelect.value = currentTheme;
                
                // 移除之前的事件监听器（如果有）
                themeSelect.removeEventListener('change', this.handleThemeChange);
                
                // 绑定主题切换事件
                this.handleThemeChange = (e) => {
                    this.setTheme(e.target.value);
                };
                themeSelect.addEventListener('change', this.handleThemeChange);
                
                console.log('主题选择器初始化完成，当前主题:', currentTheme);
            } else {
                console.warn('主题选择器元素未找到');
            }
        }, 100);
    }
    
    switchSettingsTab(tabName) {
        // 切换标签页
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        document.querySelector(`[onclick="window.app.switchSettingsTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`settings-${tabName}`).classList.add('active');
    }

    async loadDataPath() {
        try {
            if (window.api.getDataPath) {
                const dataPath = await window.api.getDataPath();
                const pathElement = document.getElementById('data-path');
                if (pathElement) {
                    pathElement.textContent = dataPath;
                }
            }
        } catch (error) {
            console.error('获取数据路径失败:', error);
        }
    }

    async openDataFolder() {
        try {
            if (window.electronAPI && window.electronAPI.openDataFolder) {
                await window.electronAPI.openDataFolder();
            } else {
                this.showNotification('此功能需要在Electron环境中使用', 'info');
            }
        } catch (error) {
            console.error('打开数据文件夹失败:', error);
            this.showNotification('打开数据文件夹失败', 'error');
        }
    }

    async saveSettings() {
        try {
            // 这里可以保存用户设置到本地存储或配置文件
            const settings = {
                theme: document.getElementById('theme-select')?.value || 'auto',
                autoSave: document.getElementById('auto-save')?.checked || true,
                confirmDelete: document.getElementById('confirm-delete')?.checked || true
            };

            // 保存到localStorage
            localStorage.setItem('app-settings', JSON.stringify(settings));
            localStorage.setItem('app-theme', settings.theme);
            
            // 应用主题设置
            this.applyTheme(settings.theme);
            
            this.closeModal();
            this.showNotification('设置已保存', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('保存设置失败', 'error');
        }
    }



    async rebuildSearchIndex() {
        try {
            const confirmed = await window.components.modal.confirm(
                '确定要重建搜索索引吗？',
                '这个操作可能需要一些时间，但会提高搜索性能。'
            );
            
            if (confirmed) {
                this.showNotification('正在重建搜索索引...', 'info');
                
                const result = await window.api.rebuildSearchIndex();
                
                if (result.success) {
                    this.showNotification('搜索索引重建完成', 'success');
                } else {
                    this.showNotification('搜索索引重建失败', 'error');
                }
            }
        } catch (error) {
            console.error('重建搜索索引失败:', error);
            this.showNotification('重建搜索索引失败: ' + error.message, 'error');
        }
    }

    async performMaintenance() {
        try {
            const confirmed = await window.components.modal.confirm(
                '确定要执行数据库维护吗？',
                '这将优化数据库性能并重建搜索索引，可能需要一些时间。'
            );
            
            if (confirmed) {
                this.showNotification('正在执行数据库维护...', 'info');
                
                const result = await window.api.performMaintenance();
                
                if (result.success) {
                    this.showNotification('数据库维护完成', 'success');
                } else {
                    this.showNotification('数据库维护失败', 'error');
                }
            }
        } catch (error) {
            console.error('数据库维护失败:', error);
            this.showNotification('数据库维护失败: ' + error.message, 'error');
        }
    }

    async showAbout() {
        const content = `
            <div class="modern-modal-content">
                <div class="modal-header-modern">
                    <h2 class="modal-title-modern">关于应用</h2>
                    <p class="modal-subtitle">Prompt版本管理器</p>
                </div>
                
                <div class="about-dialog" style="padding: 32px;">
                    <div class="about-logo">📝</div>
                    <h2>Prompt版本管理器</h2>
                    <p class="about-version">专业版 v1.0.0</p>
                    <p class="about-description">专业的Prompt版本管理解决方案</p>
                    <div class="about-features">
                        <p>✨ 自动版本控制</p>
                        <p>📋 模板系统</p>
                        <p>🔍 智能搜索</p>
                        <p>💾 数据安全</p>
                    </div>
                </div>
                
                <div class="modal-footer-modern">
                    <button class="btn-modern btn-primary-modern" onclick="window.components.modal.close()">
                        <span class="btn-icon">✓</span>
                        确定
                    </button>
                </div>
            </div>
        `;
        
        window.components.modal.show(content, {
            title: '',
            size: 'small',
            className: 'modern-modal'
        });
    }

    // 切换批量选择模式
    toggleBulkSelectionMode() {
        this.bulkSelectionMode = !this.bulkSelectionMode;
        this.selectedItems.clear();
        
        const toolbar = document.getElementById('bulkActionsToolbar');
        const listPanel = document.querySelector('.list-panel');
        
        if (!toolbar) {
            console.error('批量操作工具栏元素未找到');
            return;
        }
        
        if (this.bulkSelectionMode) {
            toolbar.style.display = 'flex';
            if (listPanel) {
                listPanel.classList.add('bulk-selection-mode');
            }
            this.renderCurrentList();
        } else {
            toolbar.style.display = 'none';
            if (listPanel) {
                listPanel.classList.remove('bulk-selection-mode');
            }
            this.renderCurrentList();
        }
        
        this.updateBulkActionsToolbar();
    }

    // 切换项目选择状态
    toggleItemSelection(itemId) {
        if (!this.bulkSelectionMode) return;
        
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        
        this.updateBulkActionsToolbar();
        this.updateItemSelectionUI(itemId);
    }

    // 更新批量操作工具栏
    updateBulkActionsToolbar() {
        const selectedCount = document.getElementById('selectedCount');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        if (selectedCount) {
            selectedCount.textContent = this.selectedItems.size;
        }
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = this.selectedItems.size === 0;
        }
    }

    // 更新项目选择UI
    updateItemSelectionUI(itemId) {
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            if (this.selectedItems.has(itemId)) {
                itemElement.classList.add('selected');
            } else {
                itemElement.classList.remove('selected');
            }
        } else {
            console.warn(`未找到ID为 ${itemId} 的项目元素`);
        }
    }

    // 渲染当前列表（根据当前标签页）
    renderCurrentList() {
        if (this.currentTab === 'prompts') {
            this.renderPromptsList();
        } else if (this.currentTab === 'templates') {
            this.renderTemplatesList();
        }
    }

    // 批量删除
    async bulkDelete() {
        if (this.selectedItems.size === 0) {
            this.showNotification('请先选择要删除的项目', 'warning');
            return;
        }

        const itemType = this.currentTab === 'prompts' ? 'Prompt' : '模板';
        const confirmed = await window.components.modal.confirm(
            `确定要删除选中的 ${this.selectedItems.size} 个${itemType}吗？`,
            '此操作不可撤销，请谨慎操作。'
        );

        if (!confirmed) return;

        try {
            const loadingNotificationId = this.showNotification(`正在删除 ${this.selectedItems.size} 个${itemType}...`, 'info', 0);
            
            const deletePromises = Array.from(this.selectedItems).map(itemId => {
                if (this.currentTab === 'prompts') {
                    return window.api.deletePrompt(itemId);
                } else {
                    return window.api.deleteTemplate(itemId);
                }
            });

            await Promise.all(deletePromises);

            // 清除加载通知
            if (loadingNotificationId) {
                window.components.notifications.remove(loadingNotificationId);
            }

            // 退出批量选择模式
            this.toggleBulkSelectionMode();

            // 刷新列表
            if (this.currentTab === 'prompts') {
                await this.loadPrompts();
            } else {
                await this.loadTemplates();
            }

            // 如果当前选中的项目被删除，切换到欢迎页
            if (this.currentTab === 'prompts' && this.selectedPrompt && this.selectedItems.has(this.selectedPrompt.id)) {
                this.showWelcomeView();
            } else if (this.currentTab === 'templates' && this.selectedTemplate && this.selectedItems.has(this.selectedTemplate.id)) {
                this.showWelcomeView();
            }

            this.showNotification(`成功删除 ${deletePromises.length} 个${itemType}`, 'success');

        } catch (error) {
            console.error('批量删除失败:', error);
            this.showNotification('批量删除失败: ' + error.message, 'error');
        }
    }

    // 取消批量选择
    cancelBulkSelection() {
        this.toggleBulkSelectionMode();
    }

    // 显示右键菜单
    showContextMenu(event, listItem) {
        const itemId = listItem.dataset.itemId;
        if (!itemId) return;

        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="select">选择此项</div>
            <div class="context-menu-item" data-action="bulk-mode">批量选择模式</div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="edit">编辑</div>
            <div class="context-menu-item" data-action="delete">删除</div>
        `;

        // 设置菜单位置
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';

        document.body.appendChild(contextMenu);

        // 添加事件监听
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(action, itemId);
            }
            this.hideContextMenu();
        });

        // 点击其他地方关闭菜单
        const hideMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
                document.removeEventListener('click', hideMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 0);
    }

    // 隐藏右键菜单
    hideContextMenu() {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
            contextMenu.remove();
        }
    }

    // 处理右键菜单操作
    handleContextMenuAction(action, itemId) {
        switch (action) {
            case 'select':
                if (this.currentTab === 'prompts') {
                    this.selectPrompt(itemId);
                } else {
                    this.selectTemplate(itemId);
                }
                break;
            case 'bulk-mode':
                this.toggleBulkSelectionMode();
                break;
            case 'edit':
                if (this.currentTab === 'prompts') {
                    this.editPrompt(itemId);
                } else {
                    this.editTemplate(itemId);
                }
                break;
            case 'delete':
                if (this.currentTab === 'prompts') {
                    this.deletePrompt(itemId);
                } else {
                    this.deleteTemplate(itemId);
                }
                break;
        }
    }

    // 视图模式切换
    switchViewMode(mode) {
        if (this.currentViewMode === mode) return;
        
        this.currentViewMode = mode;
        
        // 更新按钮状态
        document.querySelectorAll('.view-mode-buttons .icon-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(mode + 'ViewBtn');
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // 更新列表容器的类
        document.querySelectorAll('.item-list').forEach(list => {
            list.classList.remove('list-view', 'grid-view');
            list.classList.add(mode + '-view');
        });
        
        // 保存用户偏好
        localStorage.setItem('viewMode', mode);
        
        this.showNotification(`已切换到${mode === 'list' ? '列表' : '网格'}视图`, 'success', 2000);
    }
    
    // 排序功能
    toggleSortDropdown() {
        const dropdown = document.querySelector('.dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }
    
    closeSortDropdown() {
        const dropdown = document.querySelector('.dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }
    
    setSortBy(sortBy) {
        // 如果点击的是当前排序字段，切换排序顺序
        if (this.currentSortBy === sortBy) {
            this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortBy = sortBy;
            this.currentSortOrder = 'desc'; // 默认降序
        }
        
        // 更新下拉菜单状态
        this.updateSortDropdownUI();
        
        // 关闭下拉菜单
        this.closeSortDropdown();
        
        // 重新渲染列表
        this.applyCurrentFilters();
        
        // 保存用户偏好
        localStorage.setItem('sortBy', this.currentSortBy);
        localStorage.setItem('sortOrder', this.currentSortOrder);
        
        const sortNames = {
            'updated_at': '更新时间',
            'created_at': '创建时间',
            'title': '标题',
            'name': '名称',
            'usage_count': '使用次数'
        };
        
        const orderName = this.currentSortOrder === 'asc' ? '升序' : '降序';
        this.showNotification(`按${sortNames[sortBy]}${orderName}排序`, 'success', 2000);
    }
    
    updateSortDropdownUI() {
        const dropdown = document.querySelector('.dropdown');
        if (!dropdown) return;
        
        // 更新排序按钮文本
        const sortBtn = dropdown.querySelector('#sortBtn');
        const indicator = sortBtn?.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = this.currentSortOrder === 'asc' ? '↑' : '↓';
        }
        
        // 更新下拉菜单选项状态
        dropdown.querySelectorAll('[data-sort]').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.sort === this.currentSortBy) {
                option.classList.add('active');
            }
        });
    }
    
    // 排序数据
    sortItems(items) {
        return [...items].sort((a, b) => {
            let aValue, bValue;
            
            switch (this.currentSortBy) {
                case 'title':
                    // 对于模板使用name字段，对于prompt使用title字段
                    aValue = (a.title || a.name || '').toLowerCase();
                    bValue = (b.title || b.name || '').toLowerCase();
                    break;
                case 'created_at':
                case 'updated_at':
                    aValue = new Date(a[this.currentSortBy]);
                    bValue = new Date(b[this.currentSortBy]);
                    break;
                case 'usage_count':
                    aValue = a.usage_count || 0;
                    bValue = b.usage_count || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aValue < bValue) {
                return this.currentSortOrder === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.currentSortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    // 初始化用户偏好
    initializeUserPreferences() {
        // 恢复视图模式
        const savedViewMode = localStorage.getItem('viewMode') || 'list';
        this.switchViewMode(savedViewMode);
        
        // 恢复排序设置
        const savedSortBy = localStorage.getItem('sortBy') || 'updated_at';
        const savedSortOrder = localStorage.getItem('sortOrder') || 'desc';
        this.currentSortBy = savedSortBy;
        this.currentSortOrder = savedSortOrder;
        
        this.updateSortDropdownUI();
    }

    // 自定义分类管理相关方法
    getIconCategoryName(category) {
        const names = {
            business: '商业',
            technology: '科技',
            education: '教育',
            creative: '创意',
            health: '健康',
            food: '美食',
            travel: '旅行',
            sports: '运动',
            nature: '自然',
            symbols: '符号'
        };
        return names[category] || category;
    }

    bindCustomCategoryManagementEvents(modal) {
        // 分组图标选择
        const groupIconSelector = modal.querySelector('#groupIconSelector');
        const groupIconInput = modal.querySelector('input[name="groupIcon"]');
        
        groupIconSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('icon-option')) {
                // 清除之前的选择
                groupIconSelector.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
                // 选择当前图标
                e.target.classList.add('selected');
                groupIconInput.value = e.target.dataset.icon;
            }
        });

        // 添加分类项
        const addCategoryItemBtn = modal.querySelector('#addCategoryItemBtn');
        const categoryItemsBuilder = modal.querySelector('#categoryItemsBuilder');
        
        addCategoryItemBtn.addEventListener('click', () => {
            this.addCategoryItemInput(categoryItemsBuilder);
        });

        // 初始添加一个分类项
        this.addCategoryItemInput(categoryItemsBuilder);

        // 表单提交
        modal.addEventListener('click', (e) => {
            // 阻止图标选择按钮触发表单提交
            if (e.target.hasAttribute('data-action') && e.target.getAttribute('data-action') === 'select-icon') {
                return; // 不处理图标选择按钮的点击
            }
            
            if (e.target.classList.contains('modal-cancel-btn') || e.target.closest('.modal-cancel-btn')) {
                window.components.modal.close();
            } else if (e.target.classList.contains('modal-submit-btn') || e.target.closest('.modal-submit-btn')) {
                this.submitCreateCustomCategoryGroup();
            }
        });
    }

    addCategoryItemInput(container) {
        const template = container.querySelector('.category-item-template');
        const newItem = template.cloneNode(true);
        newItem.classList.remove('category-item-template');
        newItem.classList.add('category-item-input');

        // 动态添加颜色选项
        const colorSelector = newItem.querySelector('.category-color-selector');
        const colorInput = newItem.querySelector('.category-color-input');
        
        // 获取颜色选项
        const colorOptions = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
            '#f97316', '#6b7280', '#14b8a6', '#a855f7'
        ];
        
        // 清空现有内容（除了隐藏的input）
        const hiddenInput = colorSelector.querySelector('.category-color-input');
        colorSelector.innerHTML = '';
        
        // 添加颜色选项
        colorOptions.forEach((color, index) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.dataset.color = color;
            colorOption.style.backgroundColor = color;
            if (index === 0) {
                colorOption.classList.add('selected');
            }
            colorSelector.appendChild(colorOption);
        });
        
        // 重新添加隐藏的input并设置默认值
        colorInput.value = colorOptions[0]; // 设置默认颜色
        colorSelector.appendChild(hiddenInput);
        
        // 绑定颜色选择事件
        colorSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                colorSelector.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                colorInput.value = e.target.dataset.color;
            }
        });

        // 绑定图标选择事件
        const iconSelectBtn = newItem.querySelector('.icon-select-btn');
        const iconInput = newItem.querySelector('.category-icon-input');
        
        // 设置初始状态
        iconSelectBtn.textContent = '🔘 选择图标';
        iconSelectBtn.setAttribute('data-action', 'select-icon');
        iconInput.value = ''; // 确保初始值为空，强制用户选择
        
        iconSelectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            console.log('图标选择按钮被点击');
            
            try {
                await this.showIconSelector((selectedIcon) => {
                    console.log('图标选择回调被调用，选择的图标:', selectedIcon);
                    
                    // 更新按钮文本和样式
                    iconSelectBtn.textContent = selectedIcon;
                    iconInput.value = selectedIcon;
                    
                    // 更新按钮样式以显示已选择
                    iconSelectBtn.classList.add('selected');
                    iconSelectBtn.style.backgroundColor = 'var(--primary-light)';
                    iconSelectBtn.style.color = 'var(--primary-color)';
                    iconSelectBtn.style.borderColor = 'var(--primary-color)';
                    
                    console.log('图标选择完成，input值:', iconInput.value);
                });
            } catch (error) {
                console.error('图标选择过程中出错:', error);
                this.showNotification('图标选择失败: ' + error.message, 'error');
            }
        });

        // 绑定删除事件
        const removeBtn = newItem.querySelector('.remove-category-btn');
        removeBtn.addEventListener('click', () => {
            if (container.querySelectorAll('.category-item-input').length > 1) {
                newItem.remove();
            } else {
                this.showNotification('至少需要一个分类项', 'warning');
            }
        });

        container.appendChild(newItem);
    }

    // 测试图标选择功能
    async testIconSelector() {
        console.log('测试图标选择器...');
        try {
            await this.showIconSelector((selectedIcon) => {
                console.log('测试成功，选择的图标:', selectedIcon);
                this.showNotification(`测试成功，选择了图标: ${selectedIcon}`, 'success');
            });
        } catch (error) {
            console.error('测试失败:', error);
            this.showNotification('测试失败: ' + error.message, 'error');
        }
    }

    async showIconSelector(callback) {
        try {
            console.log('开始显示图标选择器...');
            const iconOptions = await window.api.getCustomCategoryIconOptions();
            console.log('获取到图标选项:', iconOptions);
            
            // 创建一个简单的弹出层，而不是模态框
            const overlay = document.createElement('div');
            overlay.className = 'icon-selector-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const popup = document.createElement('div');
            popup.className = 'icon-selector-popup';
            popup.style.cssText = `
                background: var(--bg-primary);
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            `;
            
            popup.innerHTML = `
                <h3 style="margin: 0 0 16px 0; color: var(--text-primary);">选择图标</h3>
                <div class="icon-selector-content">
                    ${Object.entries(iconOptions).map(([category, icons]) => `
                        <div class="icon-category" style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-secondary);">${this.getIconCategoryName(category)}</h4>
                            <div class="icon-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px;">
                                ${icons.map(icon => `
                                    <div class="icon-option selectable-icon" data-icon="${icon}" style="
                                        width: 40px;
                                        height: 40px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 20px;
                                        border: 2px solid var(--border-color);
                                        border-radius: 8px;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                        background: var(--bg-primary);
                                    ">${icon}</div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 16px; text-align: right;">
                    <button class="icon-selector-cancel btn btn-secondary">取消</button>
                </div>
            `;
            
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .icon-option:hover {
                    border-color: var(--primary-color) !important;
                    background: var(--primary-light) !important;
                    transform: scale(1.1);
                }
            `;
            document.head.appendChild(style);
            
            // 绑定事件
            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.target.classList.contains('selectable-icon')) {
                    const selectedIcon = e.target.dataset.icon;
                    console.log('选择了图标:', selectedIcon);
                    
                    // 清理
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                    
                    // 调用回调
                    callback(selectedIcon);
                } else if (e.target.classList.contains('icon-selector-cancel')) {
                    // 清理
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                }
            };
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                }
            });
            
            popup.addEventListener('click', handleClick);

        } catch (error) {
            console.error('显示图标选择器失败:', error);
            this.showNotification('加载图标选择器失败: ' + error.message, 'error');
        }
    }

    async submitCreateCustomCategoryGroup() {
        try {
            const form = document.getElementById('createCustomCategoryForm');
            const formData = new FormData(form);
            
            const groupName = formData.get('groupName')?.trim();
            const groupIcon = formData.get('groupIcon');
            
            if (!groupName || !groupIcon) {
                this.showNotification('请填写完整的分组信息', 'error');
                return;
            }

            // 收集分类项
            const categoryItems = [];
            const categoryInputs = document.querySelectorAll('.category-item-input');
            
            for (let i = 0; i < categoryInputs.length; i++) {
                const input = categoryInputs[i];
                const key = input.querySelector('.category-key-input').value.trim();
                const name = input.querySelector('.category-name-input').value.trim();
                const icon = input.querySelector('.category-icon-input').value;
                const color = input.querySelector('.category-color-input').value;
                
                console.log(`分类项 ${i + 1}:`, { key, name, icon, color });
                
                if (!key) {
                    this.showNotification(`第 ${i + 1} 个分类项缺少分类键（英文标识）`, 'error');
                    return;
                }
                if (!name) {
                    this.showNotification(`第 ${i + 1} 个分类项缺少分类名称`, 'error');
                    return;
                }
                if (!icon) {
                    this.showNotification(`第 ${i + 1} 个分类项缺少图标，请点击"选择图标"按钮`, 'error');
                    return;
                }
                if (!color) {
                    this.showNotification(`第 ${i + 1} 个分类项缺少颜色`, 'error');
                    return;
                }
                
                categoryItems.push({ key, name, icon, color });
            }

            if (categoryItems.length === 0) {
                this.showNotification('至少需要一个分类项', 'error');
                return;
            }

            // 生成唯一的分组类型
            const groupType = `custom_${groupName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

            const groupData = {
                groupType,
                groupName,
                groupIcon,
                categories: categoryItems
            };

            // 创建自定义分类组
            await window.api.createCustomCategoryGroup(groupData);
            
            // 关闭模态框
            window.components.modal.close();
            
            // 重新初始化分类筛选器
            await this.initializeCategoryFilter();
            
            // 显示成功消息
            this.showNotification('自定义分类组创建成功！', 'success');
            
        } catch (error) {
            console.error('创建自定义分类组失败:', error);
            this.showNotification('创建自定义分类组失败: ' + error.message, 'error');
        }
    }

    async deleteCustomCategoryGroup(groupType) {
        try {
            const confirmed = await window.components.modal.confirm(
                '确定要删除这个自定义分类组吗？',
                '删除后，使用此分类的Prompt和模板将失去分类信息。'
            );
            
            if (confirmed) {
                await window.api.deleteCustomCategoryGroup(groupType);
                
                // 重新初始化分类筛选器
                await this.initializeCategoryFilter();
                
                // 刷新当前显示的管理界面
                this.showCustomCategoryManagement();
                
                this.showNotification('自定义分类组删除成功', 'success');
            }
        } catch (error) {
            console.error('删除自定义分类组失败:', error);
            this.showNotification('删除自定义分类组失败: ' + error.message, 'error');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PromptManagerApp();
});