/**
 * 即刻导航 (Act-Nav) - 弹出窗口脚本
 */

class PopupManager {
  constructor() {
    this.init();
  }

  /**
   * 初始化弹出窗口
   */
  async init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * 设置弹出窗口功能
   */
  async setup() {
    // 绑定事件
    this.bindEvents();
    
    // 更新状态和统计信息
    await this.updateStatus();
    await this.updateStats();
    
    // 检查当前标签页是否在deepseek
    this.checkCurrentTab();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 打开侧边栏按钮
    const openSidebarBtn = document.getElementById('open-sidebar');
    if (openSidebarBtn) {
      openSidebarBtn.addEventListener('click', () => this.openSidebar());
    }

    // 清除数据按钮
    const clearDataBtn = document.getElementById('clear-data');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.clearData());
    }

    // 反馈链接
    const feedbackLink = document.getElementById('feedback-link');
    if (feedbackLink) {
      feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openFeedback();
      });
    }

    // GitHub链接
    const githubLink = document.getElementById('github-link');
    if (githubLink) {
      githubLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openGitHub();
      });
    }
  }

  /**
   * 检查当前标签页
   */
  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        // 在deepseek页面上，启用功能
        this.enableFeatures();
      } else {
        // 不在deepseek页面上，禁用功能
        this.disableFeatures();
      }
    } catch (error) {
      console.error('检查当前标签页失败:', error);
      this.disableFeatures();
    }
  }

  /**
   * 启用功能
   */
  enableFeatures() {
    const statusIndicator = document.querySelector('.status-indicator');
    const openSidebarBtn = document.getElementById('open-sidebar');
    
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator active';
      statusIndicator.querySelector('span').textContent = '已在当前页面激活';
    }
    
    if (openSidebarBtn) {
      openSidebarBtn.disabled = false;
      openSidebarBtn.style.opacity = '1';
    }
  }

  /**
   * 禁用功能
   */
  disableFeatures() {
    const statusIndicator = document.querySelector('.status-indicator');
    const openSidebarBtn = document.getElementById('open-sidebar');
    
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      statusIndicator.querySelector('span').textContent = '请在deepseek页面使用';
    }
    
    if (openSidebarBtn) {
      openSidebarBtn.disabled = true;
      openSidebarBtn.style.opacity = '0.5';
    }
  }

  /**
   * 更新状态
   */
  async updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        // 检查侧边栏是否已注入
        const result = await chrome.tabs.sendMessage(tab.id, { action: 'check-status' });
        if (result && result.active) {
          this.enableFeatures();
        } else {
          this.disableFeatures();
        }
      } else {
        this.disableFeatures();
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      this.disableFeatures();
    }
  }

  /**
   * 更新统计信息
   */
  async updateStats() {
    try {
      // 获取问题数量
      const questionsResult = await chrome.storage.local.get('act-nav-questions');
      const questions = questionsResult['act-nav-questions'] || [];
      
      const questionCountElement = document.getElementById('question-count');
      if (questionCountElement) {
        questionCountElement.textContent = questions.length;
      }

      // 计算会话时长
      const sessionTimeElement = document.getElementById('session-time');
      if (sessionTimeElement) {
        const sessionStart = await this.getSessionStart();
        const sessionTime = sessionStart ? Math.floor((Date.now() - sessionStart) / 60000) : 0;
        sessionTimeElement.textContent = sessionTime;
      }
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }

  /**
   * 获取会话开始时间
   */
  async getSessionStart() {
    try {
      const result = await chrome.storage.local.get('act-nav-session-start');
      return result['act-nav-session-start'];
    } catch (error) {
      return null;
    }
  }

  /**
   * 打开侧边栏
   */
  async openSidebar() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        // 向内容脚本发送消息，显示侧边栏
        await chrome.tabs.sendMessage(tab.id, { action: 'show-sidebar' });
        
        // 关闭弹出窗口
        window.close();
      } else {
        // 如果不在deepseek页面，打开deepseek
        await chrome.tabs.create({ url: 'https://chat.deepseek.com' });
        window.close();
      }
    } catch (error) {
      console.error('打开侧边栏失败:', error);
    }
  }

  /**
   * 清除数据
   */
  async clearData() {
    try {
      // 显示确认对话框
      const confirmed = confirm('确定要清除所有对话目录数据吗？此操作不可撤销。');
      
      if (confirmed) {
        // 清除存储的数据
        await chrome.storage.local.clear();
        
        // 更新统计信息
        await this.updateStats();
        
        // 显示成功消息
        this.showMessage('数据已清除', 'success');
      }
    } catch (error) {
      console.error('清除数据失败:', error);
      this.showMessage('清除数据失败', 'error');
    }
  }

  /**
   * 打开反馈页面
   */
  openFeedback() {
    // 打开GitHub Issues页面
    chrome.tabs.create({ 
      url: 'https://github.com/your-username/act-nav/issues/new' 
    });
  }

  /**
   * 打开GitHub页面
   */
  openGitHub() {
    // 打开GitHub项目页面
    chrome.tabs.create({ 
      url: 'https://github.com/your-username/act-nav' 
    });
  }

  /**
   * 显示消息
   */
  showMessage(text, type = 'info') {
    // 创建消息元素
    const message = document.createElement('div');
    message.className = `popup-message ${type}`;
    message.textContent = text;
    
    // 添加到页面
    document.body.appendChild(message);
    
    // 自动移除
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }
}

// 初始化弹出窗口管理器
new PopupManager(); 