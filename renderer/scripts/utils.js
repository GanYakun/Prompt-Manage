// 工具函数

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 日期格式化
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    }
    
    // 小于1天
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
    }
    
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 相对时间格式化
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
    
    if (diff < 60000) {
        return rtf.format(-Math.floor(diff / 1000), 'second');
    } else if (diff < 3600000) {
        return rtf.format(-Math.floor(diff / 60000), 'minute');
    } else if (diff < 86400000) {
        return rtf.format(-Math.floor(diff / 3600000), 'hour');
    } else if (diff < 604800000) {
        return rtf.format(-Math.floor(diff / 86400000), 'day');
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 文件大小格式化
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 截断文本
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 生成随机ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 深拷贝
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 数组去重
function uniqueArray(arr) {
    return [...new Set(arr)];
}

// 对象数组去重
function uniqueArrayByKey(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

// 搜索高亮
function highlightSearchTerms(text, searchTerms) {
    if (!searchTerms || searchTerms.length === 0) return escapeHtml(text);
    
    let highlightedText = escapeHtml(text);
    
    searchTerms.forEach(term => {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 验证邮箱
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 验证URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 获取文件扩展名
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// 下载文件
function downloadFile(content, filename, contentType = 'application/json') {
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

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// 从剪贴板读取
async function readFromClipboard() {
    try {
        return await navigator.clipboard.readText();
    } catch (err) {
        console.warn('无法从剪贴板读取内容:', err);
        return '';
    }
}

// 本地存储工具
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('存储失败:', err);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('读取存储失败:', err);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.error('删除存储失败:', err);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (err) {
            console.error('清空存储失败:', err);
            return false;
        }
    }
};

// 主题管理
const theme = {
    get current() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },
    
    set(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        storage.set('theme', themeName);
    },
    
    toggle() {
        const current = this.current;
        this.set(current === 'dark' ? 'light' : 'dark');
    },
    
    init() {
        const saved = storage.get('theme');
        if (saved) {
            this.set(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.set('dark');
        }
    }
};

// 密度设置
const density = {
    get current() {
        return document.documentElement.getAttribute('data-density') || 'normal';
    },
    
    set(densityName) {
        document.documentElement.setAttribute('data-density', densityName);
        storage.set('density', densityName);
    },
    
    init() {
        const saved = storage.get('density');
        if (saved) {
            this.set(saved);
        }
    }
};

// 键盘快捷键处理
function handleKeyboardShortcuts(event) {
    const { ctrlKey, metaKey, shiftKey, altKey, key } = event;
    const isCtrlOrCmd = ctrlKey || metaKey;
    
    // Ctrl/Cmd + N: 新建Prompt
    if (isCtrlOrCmd && !shiftKey && key === 'n') {
        event.preventDefault();
        window.app?.createNewPrompt();
        return;
    }
    
    // Ctrl/Cmd + Shift + N: 新建模板
    if (isCtrlOrCmd && shiftKey && key === 'N') {
        event.preventDefault();
        window.app?.createNewTemplate();
        return;
    }
    
    // Ctrl/Cmd + F: 搜索
    if (isCtrlOrCmd && !shiftKey && key === 'f') {
        event.preventDefault();
        document.getElementById('searchInput')?.focus();
        return;
    }
    
    // Ctrl/Cmd + Shift + F: 高级搜索
    if (isCtrlOrCmd && shiftKey && key === 'F') {
        event.preventDefault();
        window.app?.showAdvancedSearch();
        return;
    }
    
    // Ctrl/Cmd + E: 导出
    if (isCtrlOrCmd && key === 'e') {
        event.preventDefault();
        window.app?.exportAll();
        return;
    }
    
    // Ctrl/Cmd + I: 导入
    if (isCtrlOrCmd && key === 'i') {
        event.preventDefault();
        window.app?.importData();
        return;
    }
    
    // ESC: 关闭模态框
    if (key === 'Escape') {
        window.app?.closeModal();
        return;
    }
}

// 初始化工具
function initUtils() {
    // 初始化主题
    theme.init();
    
    // 初始化密度
    density.init();
    
    // 绑定键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!storage.get('theme')) {
            theme.set(e.matches ? 'dark' : 'light');
        }
    });
}

// 导出工具函数
window.utils = {
    debounce,
    throttle,
    escapeHtml,
    formatDate,
    formatRelativeTime,
    formatFileSize,
    truncateText,
    generateId,
    deepClone,
    uniqueArray,
    uniqueArrayByKey,
    highlightSearchTerms,
    escapeRegExp,
    isValidEmail,
    isValidUrl,
    getFileExtension,
    downloadFile,
    copyToClipboard,
    readFromClipboard,
    storage,
    theme,
    density,
    init: initUtils
};