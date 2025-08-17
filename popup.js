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
    // 打开“我的收藏”列表（Options 页面）
    const openLibraryBtn = document.getElementById('open-library');
    if (openLibraryBtn) {
      openLibraryBtn.addEventListener('click', async () => {
        try {
          console.log('尝试显示收藏内容...');
          await this.showLibraryContent();
          
        } catch (error) {
          console.error('打开"我的收藏"页面失败:', error);
          alert('打开失败: ' + error.message);
        }
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

  /**
   * 显示收藏内容
   */
  async showLibraryContent() {
    try {
      const libraryContent = document.getElementById('library-content');
      const libraryList = document.getElementById('library-list');
      
      if (!libraryContent || !libraryList) {
        throw new Error('找不到收藏内容显示元素');
      }
      
      // 显示加载状态
      libraryList.innerHTML = '<div class="library-loading">加载中...</div>';
      libraryContent.style.display = 'block';
      
      // 获取收藏数据
      const libraryData = await this.getLibraryData();
      
      if (libraryData && libraryData.length > 0) {
        // 渲染收藏列表
        this.renderLibraryList(libraryData);
      } else {
        // 显示空状态
        this.showEmptyLibrary();
      }
      
      // 隐藏其他内容
      this.hideOtherContent();
      
    } catch (error) {
      console.error('显示收藏内容失败:', error);
      this.showEmptyLibrary();
    }
  }

  /**
   * 隐藏收藏内容
   */
  hideLibraryContent() {
    const libraryContent = document.getElementById('library-content');
    if (libraryContent) {
      libraryContent.style.display = 'none';
    }
    
    // 显示其他内容
    this.showOtherContent();
  }

  /**
   * 获取收藏数据
   */
  async getLibraryData() {
    try {
      // 方法1: 优先从Chrome存储获取（主要方式）
      try {
        const storageResult = await chrome.storage.local.get(['act-nav-local-library']);
        if (storageResult['act-nav-local-library'] && storageResult['act-nav-local-library'].length > 0) {
          console.log('从Chrome存储获取到收藏数据:', storageResult['act-nav-local-library'].length, '项');
          return storageResult['act-nav-local-library'];
        }
      } catch (storageError) {
        console.log('Chrome存储获取失败:', storageError);
      }
      
      // 方法2: 尝试从content脚本获取本地存储数据
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        try {
          const localResult = await chrome.tabs.sendMessage(tab.id, { action: 'get-local-library-data' });
          if (localResult && localResult.data && localResult.data.length > 0) {
            console.log('从本地存储获取到收藏数据:', localResult.data.length, '项');
            return localResult.data;
          }
        } catch (localError) {
          console.log('本地存储获取失败:', localError);
        }
      }
      
      return [];
      
    } catch (error) {
      console.error('获取收藏数据失败:', error);
      return [];
    }
  }

  /**
   * 渲染收藏列表
   */
  renderLibraryList(data) {
    const libraryList = document.getElementById('library-list');
    if (!libraryList) return;
    
    const html = data.map(item => `
      <div class="library-item" data-id="${item.id || item.localId}" data-collection='${JSON.stringify(item)}'>
        <div class="library-item-header">
          <div class="library-item-title">${this.escapeHtml(item.title || '无标题')}</div>
          <div class="library-item-actions">
            <button class="library-locate-btn" title="定位到对话位置">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </button>
            <button class="library-delete-btn" title="删除此收藏" data-id="${item.id || item.localId}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="library-item-body" style="white-space:pre-wrap;">
          ${item.content ? `<div class="library-item-text">${this.escapeHtml(this.getTruncatedContent(item))}</div>` : '<div class="muted">（无正文）</div>'}
          ${item.hasExpandableContent ? `<button class="library-expand-btn" data-id="${item.id || item.localId}">展开全文</button>` : ''}
          ${item.tags && item.tags.length ? `<div class="library-item-tags">${item.tags.map(t=>`<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="library-item-meta">
          <div class="library-item-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
            </svg>
            ${item.addedToLibrary ? new Date(item.addedToLibrary).toLocaleDateString() : '未知时间'}
          </div>
          <div class="library-item-source">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            ${item.source || 'deepseek'}
          </div>
        </div>
      </div>
    `).join('');
    
    libraryList.innerHTML = html;
    
    // 绑定点击事件
    this.bindLibraryItemEvents();
  }

  /**
   * 显示空收藏状态
   */
  showEmptyLibrary() {
    const libraryList = document.getElementById('library-list');
    if (!libraryList) return;
    
    libraryList.innerHTML = `
      <div class="library-empty">
        <div class="library-empty-icon">📚</div>
        <div class="library-empty-text">暂无收藏内容</div>
        <div class="library-empty-hint">在AI对话中点击"收藏"按钮来添加内容</div>
      </div>
    `;
  }

  /**
   * 绑定收藏项事件
   */
  bindLibraryItemEvents() {
    const libraryItems = document.querySelectorAll('.library-item');
    libraryItems.forEach(item => {
      // 绑定定位按钮点击事件
      const locateBtn = item.querySelector('.library-locate-btn');
      if (locateBtn) {
        locateBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          await this.locateToCollection(item);
        });
      }
      
      // 绑定删除按钮点击事件
      const deleteBtn = item.querySelector('.library-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          await this.deleteCollectionItem(item);
        });
      }
      
      // 绑定展开按钮点击事件
      const expandBtn = item.querySelector('.library-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          this.toggleLibraryItemExpand(item);
        });
      }
      
      // 绑定整个收藏项的点击事件
      item.addEventListener('click', () => {
        console.log('点击收藏项:', item.dataset.id);
      });
    });
  }

  /**
   * 定位到收藏的对话位置
   */
  async locateToCollection(item) {
    try {
      const collectionData = JSON.parse(item.dataset.collection);
      console.log('定位到收藏:', collectionData);
      
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否需要跳转到其他页面
      if (collectionData.page_url && collectionData.page_url !== tab.url) {
        console.log('需要跳转到其他页面:', collectionData.page_url);
        
        try {
          // 跳转到收藏的页面
          await chrome.tabs.update(tab.id, { url: collectionData.page_url });
          
          // 等待页面加载完成后，发送定位消息
          setTimeout(async () => {
            try {
              // 先发送消息确保布局样式正确应用
              await chrome.tabs.sendMessage(tab.id, { 
                action: 'ensure-layout-styles'
              });
              
              // 然后发送定位消息
              const result = await chrome.tabs.sendMessage(tab.id, { 
                action: 'scroll-to-collection',
                collectionData: collectionData
              });
              
              if (result && result.success) {
                this.showMessage('已跳转并定位到收藏位置', 'success');
              } else {
                this.showMessage('跳转成功，但定位失败', 'warning');
              }
            } catch (error) {
              console.log('页面跳转后定位失败:', error);
              this.showMessage('已跳转到收藏页面，请手动定位', 'info');
            }
          }, 3000); // 等待3秒让页面加载
          
          this.showMessage('正在跳转到收藏页面...', 'info');
          // 关闭弹窗
          this.hideLibraryContent();
          return;
        } catch (error) {
          console.error('页面跳转失败:', error);
          this.showMessage('页面跳转失败: ' + error.message, 'error');
          return;
        }
      }
      
      // 在当前页面定位
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        // 发送定位消息到content脚本
        const result = await chrome.tabs.sendMessage(tab.id, { 
          action: 'scroll-to-collection',
          collectionData: collectionData
        });
        
        if (result && result.success) {
          this.showMessage('正在定位到对话位置...', 'success');
          // 关闭弹窗
          this.hideLibraryContent();
        } else {
          this.showMessage('定位失败: ' + (result?.error || '未知错误'), 'error');
        }
      } else {
        this.showMessage('请在AI对话页面使用此功能', 'warning');
      }
      
    } catch (error) {
      console.error('定位到收藏失败:', error);
      this.showMessage('定位失败: ' + error.message, 'error');
    }
  }

  /**
   * 删除收藏项
   */
  async deleteCollectionItem(item) {
    try {
      const collectionData = JSON.parse(item.dataset.collection);
      const itemId = item.dataset.id;
      
      // 确认删除
      if (!confirm(`确定要删除"${collectionData.title || '此收藏'}"吗？\n\n删除后无法恢复。`)) {
        return;
      }
      
      console.log('删除收藏项:', collectionData);
      
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        // 发送删除消息到content脚本
        const result = await chrome.tabs.sendMessage(tab.id, { 
          action: 'delete-collection-item',
          itemId: itemId,
          collectionData: collectionData
        });
        
        if (result && result.success) {
          this.showMessage('收藏已删除', 'success');
          // 从界面中移除该项
          item.remove();
          
          // 检查是否还有收藏项
          const remainingItems = document.querySelectorAll('.library-item');
          if (remainingItems.length === 0) {
            this.showEmptyLibrary();
          }
        } else {
          this.showMessage('删除失败: ' + (result?.error || '未知错误'), 'error');
        }
      } else {
        // 如果不在AI对话页面，只从本地存储删除
        await this.deleteFromLocalStorage(itemId);
        this.showMessage('收藏已从本地删除', 'success');
        item.remove();
        
        // 检查是否还有收藏项
        const remainingItems = document.querySelectorAll('.library-item');
        if (remainingItems.length === 0) {
          this.showEmptyLibrary();
        }
      }
      
    } catch (error) {
      console.error('删除收藏失败:', error);
      this.showMessage('删除失败: ' + error.message, 'error');
    }
  }

  /**
   * 从本地存储删除收藏项
   */
  async deleteFromLocalStorage(itemId) {
    try {
      // 从chrome.storage.local删除
      const result = await chrome.storage.local.get(['act-nav-local-library']);
      if (result['act-nav-local-library']) {
        let libraryData = result['act-nav-local-library'];
        libraryData = libraryData.filter(item => item.id !== itemId && item.localId !== itemId);
        await chrome.storage.local.set({ 'act-nav-local-library': libraryData });
        console.log('已从Chrome存储删除收藏项:', itemId);
      }
      
      // 同时尝试从localStorage删除（通过content脚本）
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.url.includes('chat.deepseek.com')) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'delete-collection-item', 
            itemId: itemId,
            collectionData: { id: itemId }
          });
        } catch (error) {
          console.log('通过content脚本删除失败:', error.message);
        }
      }
      
      console.log('已从所有存储位置删除收藏项:', itemId);
    } catch (error) {
      console.error('从本地存储删除失败:', error);
    }
  }

  /**
   * 切换收藏项展开状态
   */
  toggleLibraryItemExpand(item) {
    try {
      const itemId = item.dataset.id;
      const collectionData = JSON.parse(item.dataset.collection);
      const expandBtn = item.querySelector('.library-expand-btn');
      const textElement = item.querySelector('.library-item-text');
      
      if (!expandBtn || !textElement) return;
      
      const isExpanded = item.dataset.expanded === '1';
      const newState = isExpanded ? '0' : '1';
      
      // 设置新的展开状态
      item.dataset.expanded = newState;
      
      if (newState === '1') {
        // 展开：显示完整内容
        const fullContent = this.getFullContent(collectionData);
        textElement.innerHTML = this.escapeHtml(fullContent);
        expandBtn.textContent = '收起';
        item.classList.add('expanded');
      } else {
        // 收起：显示截断内容
        const truncatedContent = this.getTruncatedContent(collectionData);
        textElement.innerHTML = this.escapeHtml(truncatedContent);
        expandBtn.textContent = '展开全文';
        item.classList.remove('expanded');
      }
      
      console.log('收藏项展开状态切换:', collectionData.title, newState === '1' ? '展开' : '收起');
      
    } catch (error) {
      console.error('切换收藏项展开状态失败:', error);
    }
  }

  /**
   * 获取完整内容
   */
  getFullContent(collectionData) {
    // 按优先级返回最完整的内容
    return collectionData.originalAnswer || 
           collectionData.originalSummary || 
           collectionData.originalContent || 
           collectionData.originalDetails || 
           collectionData.originalLogic || 
           collectionData.originalText || 
           collectionData.content || 
           '无内容';
  }

  /**
   * 获取截断内容
   */
  getTruncatedContent(collectionData) {
    const fullContent = this.getFullContent(collectionData);
    if (fullContent.length <= 80) return fullContent;
    
    // 截断到80个字符，并添加省略号
    return fullContent.substring(0, 80) + '...';
  }

  /**
   * 隐藏其他内容
   */
  hideOtherContent() {
    const elementsToHide = [
      '.popup-status',
      '.popup-stats',
      '.popup-actions',
      '.popup-footer'
    ];
    
    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * 显示其他内容
   */
  showOtherContent() {
    const elementsToShow = [
      '.popup-status',
      '.popup-stats',
      '.popup-actions',
      '.popup-footer'
    ];
    
    elementsToShow.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'block';
      }
    });
  }

  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化弹出窗口管理器
new PopupManager();