/**
 * Insight Go (Act-Nav) - 弹出窗口脚本
 */

class PopupManager {
  constructor() {
    this.init();
  }

  /**
   * 初始化弹出窗口
   */
  async init() {
    console.log('init 方法被调用，当前 document.readyState:', document.readyState);
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      console.log('DOM 还在加载中，等待 DOMContentLoaded 事件');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded 事件触发');
        this.setup();
      });
    } else {
      console.log('DOM 已加载完成，直接调用 setup');
      this.setup();
    }
  }

  /**
   * 设置弹出窗口功能
   */
  async setup() {
    console.log('setup 方法被调用');
    
    // 绑定事件
    console.log('开始绑定事件...');
    this.bindEvents();
    
    // 更新状态和统计信息
    console.log('开始更新状态...');
    await this.updateStatus();
    console.log('开始更新统计信息...');
    await this.updateStats();
    
    // 检查当前标签页是否在deepseek
    console.log('开始检查当前标签页...');
    this.checkCurrentTab();
    
    console.log('setup 方法完成');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    console.log('开始绑定事件...');
    
    // 打开侧边栏按钮
    const openSidebarBtn = document.getElementById('open-sidebar');
    if (openSidebarBtn) {
      console.log('找到打开侧边栏按钮，绑定点击事件');
      openSidebarBtn.addEventListener('click', () => {
        console.log('打开侧边栏按钮被点击');
        this.openSidebar();
      });
    } else {
      console.error('找不到打开侧边栏按钮');
    }

    // 清除数据按钮
    const clearDataBtn = document.getElementById('clear-data');
    if (clearDataBtn) {
      console.log('找到清除数据按钮，绑定点击事件');
      clearDataBtn.addEventListener('click', () => {
        console.log('清除数据按钮被点击');
        this.clearData();
      });
    } else {
      console.error('找不到清除数据按钮');
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
      
      // 支持的平台列表
      const supportedPlatforms = [
        'chat.deepseek.com',
        'www.kimi.com',
        'chat.openai.com'
      ];
      
      const isSupported = supportedPlatforms.some(platform => 
        tab.url && tab.url.includes(platform)
      );
      
      if (isSupported) {
        // 在支持的页面上，启用功能
        this.enableFeatures();
      } else {
        // 不在支持的页面上，禁用功能
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
      statusIndicator.querySelector('span').textContent = '请在支持的AI对话页面使用';
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
      console.log('开始更新统计信息');
      
      // 获取当前标签页的问题数量
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('当前标签页:', tab);
      
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        console.log('在deepseek页面，尝试获取问题数量');
        
        // 从content脚本获取当前对话的问题数量
        try {
          console.log('发送 get-question-count 消息到content脚本');
          const result = await chrome.tabs.sendMessage(tab.id, { action: 'get-question-count' });
          console.log('从content脚本获取的问题数量:', result);
          
          const questionCount = result && result.count !== undefined ? result.count : 0;
          console.log('解析后的问题数量:', questionCount);
          
          const questionCountElement = document.getElementById('question-count');
          if (questionCountElement) {
            questionCountElement.textContent = questionCount;
            console.log('问题数量已更新到UI:', questionCount);
          } else {
            console.error('找不到问题数量显示元素');
          }
        } catch (err) {
          console.log('无法从content脚本获取数据，尝试从存储获取:', err);
          // 如果无法获取，尝试从存储中获取当前对话的问题数量
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url) {
              // 从URL中提取chatId
              const urlMatch = tab.url.match(/\/chat\/(s\/)?(([\w-]+))/);
              if (urlMatch) {
                const chatId = `chat.deepseek.com-${urlMatch[2]}`;
                const storageKey = `act-nav-questions-${chatId}`;
                console.log('从存储获取问题，存储键:', storageKey);
                
                const questionsResult = await chrome.storage.local.get(storageKey);
                const questions = questionsResult[storageKey] || [];
                console.log('从存储获取的问题:', questions);
                
                const questionCountElement = document.getElementById('question-count');
                if (questionCountElement) {
                  questionCountElement.textContent = questions.length;
                  console.log('从存储更新问题数量:', questions.length);
                }
              } else {
                console.log('无法从URL提取chatId');
                const questionCountElement = document.getElementById('question-count');
                if (questionCountElement) {
                  questionCountElement.textContent = '0';
                }
              }
            }
          } catch (storageErr) {
            console.log('从存储获取数据也失败:', storageErr);
            const questionCountElement = document.getElementById('question-count');
            if (questionCountElement) {
              questionCountElement.textContent = '0';
            }
          }
        }
      } else {
        console.log('不在deepseek页面，显示0');
        // 不在支持的页面，显示0
        const questionCountElement = document.getElementById('question-count');
        if (questionCountElement) {
          questionCountElement.textContent = '0';
        }
      }
    } catch (error) {
      console.error('更新统计信息失败:', error);
      const questionCountElement = document.getElementById('question-count');
      if (questionCountElement) {
        questionCountElement.textContent = '0';
      }
    }
  }

  /**
   * 打开侧边栏
   */
  async openSidebar() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否在支持的AI对话页面
      const supportedPlatforms = ['chat.deepseek.com', 'www.kimi.com', 'chat.openai.com'];
      const isOnSupportedPlatform = supportedPlatforms.some(platform => 
        tab.url && tab.url.includes(platform)
      );
      
      if (isOnSupportedPlatform) {
        // 向内容脚本发送消息，切换侧边栏
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
        
        // 关闭弹出窗口
        window.close();
      } else {
        // 如果不在支持的页面，打开deepseek
        await chrome.tabs.create({ url: 'https://chat.deepseek.com' });
        window.close();
      }
    } catch (error) {
      console.error('打开侧边栏失败:', error);
    }
  }

  /**
   * 清除问题目录数据
   */
  async clearData() {
    console.log('clearData 方法被调用');
    try {
      // 显示确认对话框
      const confirmed = confirm('确定要清除当前对话的问题目录吗？此操作不可撤销。');
      console.log('用户确认状态:', confirmed);
      
      if (confirmed) {
        console.log('用户确认清除数据');
        
        // 通知content脚本清除当前对话的问题目录
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          // 支持所有AI聊天平台
          const supportedDomains = ['chat.deepseek.com', 'www.kimi.com', 'chat.openai.com', 'www.doubao.com'];
          const isSupported = supportedDomains.some(domain => tab.url && tab.url.includes(domain));
          
          if (isSupported) {
            console.log('发送清除数据消息到content脚本');
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'clear-question-data' });
            console.log('清除数据结果:', result);
            
            if (result && result.success) {
              console.log('问题目录清除成功');
              // 更新统计信息
              await this.updateStats();
              // 显示成功消息
              this.showMessage('问题目录已清除', 'success');
            } else {
              console.error('清除数据失败，没有收到成功响应');
              this.showMessage('清除数据失败', 'error');
            }
          } else {
            console.log('当前页面不支持清除数据');
            this.showMessage('当前页面不支持此功能', 'error');
          }
        } catch (err) {
          console.error('通知content脚本清除数据失败:', err);
          this.showMessage('清除数据失败: ' + err.message, 'error');
        }
      }
    } catch (error) {
      console.error('清除数据失败:', error);
      this.showMessage('清除数据失败: ' + error.message, 'error');
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