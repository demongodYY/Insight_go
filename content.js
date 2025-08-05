/**
 * 即刻导航 (Act-Nav) - 主要内容脚本
 * 负责在deepseek页面注入侧边栏并管理对话目录
 */

class ActNav {
  constructor() {
    this.questions = [];
    this.isSidebarVisible = true;
    this.observer = null;
    this.init();
  }

  /**
   * 初始化插件
   */
  async init() {
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * 设置插件功能
   */
  async setup() {
    // 加载用户偏好设置
    await this.loadPreferences();
    
    // 注入侧边栏
    this.injectSidebar();
    
    // 开始监听DOM变化
    this.startObserving();
    
    // 恢复已保存的对话目录
    await this.restoreQuestions();
    
    // 监听页面滚动以更新当前问题高亮
    this.setupScrollListener();
  }

  /**
   * 注入侧边栏到页面
   */
  injectSidebar() {
    // 创建侧边栏容器
    const sidebar = document.createElement('div');
    sidebar.id = 'act-nav-sidebar';
    sidebar.className = `act-nav-sidebar ${this.isSidebarVisible ? 'visible' : 'collapsed'}`;
    
    // 设置侧边栏HTML结构
    sidebar.innerHTML = `
      <div class="act-nav-header">
        <h3 class="act-nav-title">对话目录</h3>
        <button class="act-nav-toggle" title="收起/展开">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>
      <div class="act-nav-content">
        <div class="act-nav-questions"></div>
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(sidebar);
    
    // 绑定事件
    this.bindSidebarEvents();
  }

  /**
   * 绑定侧边栏事件
   */
  bindSidebarEvents() {
    const sidebar = document.getElementById('act-nav-sidebar');
    const toggleBtn = sidebar.querySelector('.act-nav-toggle');
    
    // 切换侧边栏显示/隐藏
    toggleBtn.addEventListener('click', () => {
      this.isSidebarVisible = !this.isSidebarVisible;
      sidebar.classList.toggle('collapsed', !this.isSidebarVisible);
      this.savePreferences();
    });
  }

  /**
   * 开始监听DOM变化
   */
  startObserving() {
    // 使用MutationObserver监听页面变化
    this.observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 检查是否添加了相关的DOM元素
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查是否是用户问题元素
              if (node.classList && node.classList.contains('fbb737a4')) {
                this.processUserMessage(node);
                hasRelevantChanges = true;
              }
              // 检查是否包含用户问题元素
              const userMessages = node.querySelectorAll('div.fbb737a4');
              if (userMessages.length > 0) {
                userMessages.forEach(message => this.processUserMessage(message));
                hasRelevantChanges = true;
              }
            }
          }
          
          // 如果有相关变化，处理DOM变化
          if (hasRelevantChanges) {
            this.handleDOMChanges(mutation);
          }
        }
      });
      
      // 如果有相关变化，更新侧边栏
      if (hasRelevantChanges) {
        this.updateSidebar();
      }
    });
    
    // 监听整个文档的变化
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // 定期检查是否有新的问题提交
    setInterval(() => this.checkForNewQuestions(), 1000);
    
    // 初始扫描页面上已有的用户消息
    this.scanExistingMessages();
  }
  
  /**
   * 扫描页面上已有的用户消息
   */
  scanExistingMessages() {
    const userMessages = document.querySelectorAll('div.fbb737a4');
    if (userMessages.length > 0) {
      userMessages.forEach(message => this.processUserMessage(message));
      this.updateSidebar();
    }
  }

  /**
   * 处理DOM变化
   */
  handleDOMChanges(mutation) {
    // 检查是否有新的对话消息
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.checkForNewMessages(node);
      }
    });
  }

  /**
   * 检查新消息
   */
  checkForNewMessages(element) {
    // 查找deepseek的用户消息容器 - 根据截图中的DOM结构更新选择器
    const userMessages = element.querySelectorAll('div.fbb737a4');
    userMessages.forEach(message => {
      this.processUserMessage(message);
    });
  }

  /**
   * 定期检查新问题
   */
  checkForNewQuestions() {
    // 查找输入框和提交按钮
    const inputBox = this.findInputBox();
    const submitButton = this.findSubmitButton();
    
    if (inputBox && submitButton) {
      // 监听提交事件
      if (!submitButton.hasAttribute('data-act-nav-listener')) {
        submitButton.setAttribute('data-act-nav-listener', 'true');
        submitButton.addEventListener('click', () => {
          setTimeout(() => this.handleQuestionSubmit(inputBox), 100);
        });
      }
    }
  }

  /**
   * 查找输入框
   */
  findInputBox() {
    // deepseek的输入框选择器 - 根据实际DOM结构更新
    const selectors = [
      // 添加可能的deepseek输入框选择器
      'textarea.ds-textarea',
      'textarea[placeholder*="发送消息"]',
      'textarea[placeholder*="Send a message"]',
      '[contenteditable="true"]',
      '.chat-input textarea',
      'textarea[role="textbox"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  /**
   * 查找提交按钮
   */
  findSubmitButton() {
    // deepseek的提交按钮选择器 - 根据实际DOM结构更新
    const selectors = [
      // 添加可能的deepseek提交按钮选择器
      'button.e1328ad',
      'button[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      '.send-button',
      'button[type="submit"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && !element.disabled) return element;
    }
    return null;
  }

  /**
   * 处理问题提交
   */
  handleQuestionSubmit(inputBox) {
    const questionText = this.extractQuestionText(inputBox);
    if (questionText && questionText.trim()) {
      // 添加延迟，等待DOM更新后再添加问题
      setTimeout(() => {
        // 尝试查找最新添加的用户消息元素
        const userMessages = document.querySelectorAll('div.fbb737a4');
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        if (lastUserMessage && lastUserMessage.textContent.trim() === questionText.trim()) {
          // 如果找到匹配的消息元素，使用它添加问题
          this.addQuestion(questionText, lastUserMessage);
        } else {
          // 如果没有找到匹配的元素，仅使用文本添加问题
          this.addQuestion(questionText);
        }
      }, 500); // 500ms延迟，等待DOM更新
    }
  }

  /**
   * 提取问题文本
   */
  extractQuestionText(inputBox) {
    if (inputBox.tagName === 'TEXTAREA') {
      return inputBox.value;
    } else if (inputBox.getAttribute('contenteditable') === 'true') {
      return inputBox.textContent || inputBox.innerText;
    }
    return '';
  }

  /**
   * 处理用户消息
   */
  processUserMessage(messageElement) {
    // 检查元素是否已经处理过（通过检查是否已有ID）
    if (messageElement.id && messageElement.id.startsWith('act-nav-')) {
      // 已经处理过的元素，检查是否需要更新
      const questionId = messageElement.id;
      const existingQuestion = this.questions.find(q => q.id === questionId);
      if (existingQuestion) {
        // 已存在的问题，不需要处理
        return;
      }
    }
    
    // 提取消息文本
    const messageText = this.extractMessageText(messageElement);
    if (messageText && messageText.trim()) {
      // 检查是否已经存在相同内容的问题
      const existingQuestion = this.questions.find(q => q.fullText.trim() === messageText.trim());
      if (existingQuestion) {
        // 如果存在相同内容的问题，更新元素引用
        existingQuestion.element = messageElement;
        messageElement.id = existingQuestion.id;
      } else {
        // 添加新问题
        this.addQuestion(messageText, messageElement);
      }
    }
  }

  /**
   * 提取消息文本
   */
  extractMessageText(messageElement) {
    // 对于deepseek的用户消息，直接获取div.fbb737a4的文本内容
    if (messageElement.classList.contains('fbb737a4')) {
      return messageElement.textContent || messageElement.innerText;
    }
    
    // 对于AI回答，查找ds-markdown-paragraph类
    const aiResponse = messageElement.querySelector('.ds-markdown-paragraph');
    if (aiResponse) {
      return aiResponse.textContent || aiResponse.innerText;
    }
    
    // 查找其他可能的消息内容容器
    const contentSelectors = [
      '.markdown-content',
      '.message-content',
      '[data-message-content]',
      '.prose',
      'p'
    ];
    
    for (const selector of contentSelectors) {
      const content = messageElement.querySelector(selector);
      if (content) {
        return content.textContent || content.innerText;
      }
    }
    
    // 如果没有找到特定容器，使用整个消息的文本
    return messageElement.textContent || messageElement.innerText;
  }

  /**
   * 添加问题到目录
   */
  addQuestion(text, element = null) {
    // 检查是否已经存在相同的问题
    const existingQuestion = this.questions.find(q => q.fullText.trim() === text.trim());
    if (existingQuestion) {
      // 如果提供了元素，更新现有问题的元素引用
      if (element) {
        existingQuestion.element = element;
        element.id = existingQuestion.id;
      }
      return;
    }
    
    const question = {
      id: this.generateQuestionId(),
      text: this.truncateText(text, 50),
      fullText: text,
      timestamp: Date.now(),
      element: element
    };
    
    this.questions.push(question);
    this.updateSidebar();
    this.saveQuestions();
    
    // 为消息元素添加锚点
    if (element) {
      element.id = question.id;
    }
    
    console.log('添加问题到目录:', question);
  }

  /**
   * 生成问题ID
   */
  generateQuestionId() {
    const timestamp = Date.now();
    const hash = this.simpleHash(timestamp.toString());
    return `act-nav-${timestamp}-${hash}`;
  }

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 截断文本
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 更新侧边栏显示
   */
  updateSidebar() {
    const questionsContainer = document.querySelector('.act-nav-questions');
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = this.questions.map(question => `
      <div class="act-nav-question" data-id="${question.id}">
        <div class="act-nav-question-text">${this.escapeHtml(question.text)}</div>
        <div class="act-nav-question-time">${this.formatTime(question.timestamp)}</div>
      </div>
    `).join('');
    
    // 绑定点击事件
    this.bindQuestionEvents();
  }

  /**
   * 绑定问题点击事件
   */
  bindQuestionEvents() {
    const questionElements = document.querySelectorAll('.act-nav-question');
    questionElements.forEach(element => {
      element.addEventListener('click', () => {
        const questionId = element.getAttribute('data-id');
        this.scrollToQuestion(questionId);
      });
    });
  }

  /**
   * 滚动到指定问题
   */
  scrollToQuestion(questionId) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // 首先尝试通过ID查找元素
    let targetElement = document.getElementById(questionId);
    
    // 如果没有找到，尝试通过内容匹配查找
    if (!targetElement) {
      const userMessages = document.querySelectorAll('div.fbb737a4');
      for (const message of userMessages) {
        if (message.textContent.trim() === question.fullText.trim()) {
          targetElement = message;
          // 为找到的元素添加ID，方便下次查找
          targetElement.id = questionId;
          break;
        }
      }
    }
    
    if (targetElement) {
      // 确保目标元素在视口中可见
      const rect = targetElement.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      // 平滑滚动到目标位置
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // 添加高亮效果
      this.highlightElement(targetElement);
    }
  }

  /**
   * 高亮元素
   */
  highlightElement(element) {
    element.classList.add('act-nav-highlight');
    setTimeout(() => {
      element.classList.remove('act-nav-highlight');
    }, 2000);
  }

  /**
   * 设置滚动监听
   */
  setupScrollListener() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.updateCurrentQuestionHighlight();
      }, 100);
    });
  }

  /**
   * 更新当前问题高亮
   */
  updateCurrentQuestionHighlight() {
    const questionElements = document.querySelectorAll('.act-nav-question');
    questionElements.forEach(element => {
      element.classList.remove('active');
    });
    
    // 找到当前可见的问题
    const currentQuestion = this.findCurrentVisibleQuestion();
    if (currentQuestion) {
      const sidebarElement = document.querySelector(`[data-id="${currentQuestion.id}"]`);
      if (sidebarElement) {
        sidebarElement.classList.add('active');
      }
    }
  }

  /**
   * 查找当前可见的问题
   */
  findCurrentVisibleQuestion() {
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset;
    const visibleQuestions = [];
    
    // 首先尝试通过ID查找所有问题元素
    for (let i = 0; i < this.questions.length; i++) {
      const question = this.questions[i];
      let element = document.getElementById(question.id);
      
      // 如果没有找到，尝试通过内容匹配查找
      if (!element) {
        const userMessages = document.querySelectorAll('div.fbb737a4');
        for (const message of userMessages) {
          if (message.textContent.trim() === question.fullText.trim()) {
            element = message;
            // 为找到的元素添加ID，方便下次查找
            element.id = question.id;
            break;
          }
        }
      }
      
      if (element) {
        const rect = element.getBoundingClientRect();
        // 检查元素是否在视口中或刚刚离开视口上方
        if (rect.top <= viewportHeight * 0.5 && rect.bottom >= 0) {
          visibleQuestions.push({
            question,
            element,
            position: rect.top
          });
        }
      }
    }
    
    // 如果有可见的问题，返回最靠近视口顶部的一个
    if (visibleQuestions.length > 0) {
      // 按照元素位置排序，选择最靠近顶部但仍在视口内的问题
      visibleQuestions.sort((a, b) => a.position - b.position);
      // 优先选择位置为正的元素（在视口内），如果没有则选择最接近视口的元素
      const inViewport = visibleQuestions.filter(q => q.position >= 0);
      return (inViewport.length > 0 ? inViewport[0] : visibleQuestions[0]).question;
    }
    
    return null;
  }

  /**
   * 保存问题到存储
   */
  async saveQuestions() {
    try {
      await chrome.storage.local.set({
        'act-nav-questions': this.questions.map(q => ({
          id: q.id,
          text: q.text,
          fullText: q.fullText,
          timestamp: q.timestamp
        }))
      });
    } catch (error) {
      console.error('保存问题失败:', error);
    }
  }

  /**
   * 恢复问题从存储
   */
  async restoreQuestions() {
    try {
      const result = await chrome.storage.local.get('act-nav-questions');
      if (result['act-nav-questions']) {
        this.questions = result['act-nav-questions'];
        this.updateSidebar();
      }
    } catch (error) {
      console.error('恢复问题失败:', error);
    }
  }

  /**
   * 保存用户偏好
   */
  async savePreferences() {
    try {
      await chrome.storage.local.set({
        'act-nav-sidebar-visible': this.isSidebarVisible
      });
    } catch (error) {
      console.error('保存偏好失败:', error);
    }
  }

  /**
   * 加载用户偏好
   */
  async loadPreferences() {
    try {
      const result = await chrome.storage.local.get('act-nav-sidebar-visible');
      this.isSidebarVisible = result['act-nav-sidebar-visible'] !== false;
    } catch (error) {
      console.error('加载偏好失败:', error);
      this.isSidebarVisible = true;
    }
  }

  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * 监听来自弹出窗口的消息
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'check-status':
          sendResponse({ active: true, questionsCount: this.questions.length });
          break;
        case 'show-sidebar':
          this.showSidebar();
          sendResponse({ success: true });
          break;
        case 'hide-sidebar':
          this.hideSidebar();
          sendResponse({ success: true });
          break;
        case 'get-questions':
          sendResponse({ questions: this.questions });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  /**
   * 显示侧边栏
   */
  showSidebar() {
    const sidebar = document.getElementById('act-nav-sidebar');
    if (sidebar) {
      this.isSidebarVisible = true;
      sidebar.classList.remove('collapsed');
      this.savePreferences();
    }
  }

  /**
   * 隐藏侧边栏
   */
  hideSidebar() {
    const sidebar = document.getElementById('act-nav-sidebar');
    if (sidebar) {
      this.isSidebarVisible = false;
      sidebar.classList.add('collapsed');
      this.savePreferences();
    }
  }
}

// 初始化插件
const actNav = new ActNav();

// 设置消息监听器
actNav.setupMessageListener();