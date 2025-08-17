/**
 * Supabase配置文件
 * 用于管理数据库连接和配置
 */

class SupabaseConfig {
  constructor() {
    // Supabase项目配置
    this.supabaseUrl = 'https://hkhtzeqtovrobrfxrobrfxjmmh.supabase.co'; // 替换为您的Supabase项目URL
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraHR6ZXF0b3Zyb2JyZnhqbW1oIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTQ4OTMxNjcsImV4cCI6MjA3MDQ2OTE2N30._ZvMw0YcoND2dle5'; // 替换为您的匿名密钥
    
    // 数据库表名
    this.tables = {
      knowledgeCards: 'knowledge_cards',
      users: 'users'
    };
    
    // 初始化状态
    this.isInitialized = false;
    this.supabase = null;
    
    // 用户ID管理
    this.userId = this.getUserId();
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化Supabase客户端
   */
  async init() {
    try {
      // 动态加载Supabase客户端库
      if (typeof window !== 'undefined' && !window.supabase) {
        await this.loadSupabaseLibrary();
      }
      
      if (window.supabase) {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        this.isInitialized = true;
        console.log('Supabase客户端初始化成功');
        
        // 设置认证状态监听器
        this.setupAuthListener();
      } else {
        console.error('无法加载Supabase库');
      }
    } catch (error) {
      console.error('初始化Supabase失败:', error);
    }
  }
  
  /**
   * 动态加载Supabase库
   */
  async loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@supabase/supabase-js@2';
      script.onload = () => {
        console.log('Supabase库加载成功');
        resolve();
      };
      script.onerror = () => {
        console.error('Supabase库加载失败');
        reject(new Error('Supabase库加载失败'));
      };
      document.head.appendChild(script);
    });
  }
  
  /**
   * 设置认证状态监听器
   */
  setupAuthListener() {
    if (!this.supabase) return;
    
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event, session);
      if (session && session.user) {
        this.userId = session.user.id;
        this.saveUserId(this.userId);
      } else {
        // 用户未登录，使用匿名ID
        this.userId = this.getUserId();
      }
    });
  }
  
  /**
   * 获取或生成用户ID
   */
  getUserId() {
    let userId = localStorage.getItem('act-nav-user-id');
    if (!userId) {
      userId = this.generateAnonymousUserId();
      this.saveUserId(userId);
    }
    return userId;
  }
  
  /**
   * 保存用户ID
   */
  saveUserId(userId) {
    localStorage.setItem('act-nav-user-id', userId);
  }
  
  /**
   * 生成匿名用户ID
   */
  generateAnonymousUserId() {
    return 'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
  }
  
  /**
   * 检查是否已初始化
   */
  isReady() {
    return this.isInitialized && this.supabase !== null;
  }
  
  /**
   * 获取当前用户ID
   */
  getCurrentUserId() {
    return this.userId;
  }
  
  /**
   * 设置Supabase凭据
   */
  setCredentials(url, key) {
    this.supabaseUrl = url;
    this.supabaseAnonKey = key;
    this.init();
  }
  
  /**
   * 获取配置信息
   */
  getConfig() {
    return {
      url: this.supabaseUrl,
      key: this.supabaseAnonKey,
      isInitialized: this.isInitialized,
      userId: this.userId
    };
  }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.SupabaseConfig = SupabaseConfig;
}

// 如果使用ES6模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseConfig;
}
