/**
 * 本地存储知识库管理器
 * 替代 Supabase 的本地解决方案
 */

class LocalStorageManager {
  constructor() {
    this.storageKey = 'act-nav-knowledge-base';
    this.userId = this.getUserId();
    this.isInitialized = true;
    this.init();
  }
  
  init() {
    try {
      // 初始化本地存储
      if (!localStorage.getItem(this.storageKey)) {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
      }
      console.log('本地存储管理器初始化成功');
    } catch (error) {
      console.error('初始化失败:', error);
    }
  }
  
  isReady() {
    return this.isInitialized;
  }
  
  /**
   * 添加知识卡片
   */
  async addKnowledgeCard(cardData) {
    try {
      const cards = this.getAllCards();
      const card = {
        id: this.generateId(),
        user_id: this.userId,
        title: cardData.title || '未命名',
        content: cardData.content || '',
        summary: cardData.summary || cardData.content?.substring(0, 200) || '',
        category: cardData.category || '未分类',
        tags: cardData.tags || [],
        source: cardData.source || window.location.href,
        chat_id: cardData.chatId || this.generateChatId(),
        platform: this.getCurrentPlatform(),
        metadata: { originalData: cardData, addedAt: new Date().toISOString() },
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      cards.push(card);
      this.saveCards(cards);
      
      console.log('要点已保存到本地存储:', card);
      return card;
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取知识卡片
   */
  async getKnowledgeCards(options = {}) {
    try {
      let cards = this.getAllCards();
      
      // 按用户ID过滤
      cards = cards.filter(card => card.user_id === this.userId);
      
      // 按分类过滤
      if (options.category) {
        cards = cards.filter(card => card.category === options.category);
      }
      
      // 按平台过滤
      if (options.platform) {
        cards = cards.filter(card => card.platform === options.platform);
      }
      
      // 按聊天ID过滤
      if (options.chatId) {
        cards = cards.filter(card => card.chat_id === options.chatId);
      }
      
      // 搜索功能
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        cards = cards.filter(card => 
          card.title.toLowerCase().includes(searchTerm) ||
          card.content.toLowerCase().includes(searchTerm) ||
          card.summary.toLowerCase().includes(searchTerm)
        );
      }
      
      // 排序
      cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // 限制数量
      if (options.limit) {
        cards = cards.slice(0, options.limit);
      }
      
      return cards;
    } catch (error) {
      console.error('获取失败:', error);
      return [];
    }
  }
  
  /**
   * 更新知识卡片
   */
  async updateKnowledgeCard(cardId, updates) {
    try {
      const cards = this.getAllCards();
      const index = cards.findIndex(card => card.id === cardId && card.user_id === this.userId);
      
      if (index === -1) {
        throw new Error('卡片未找到');
      }
      
      cards[index] = {
        ...cards[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      this.saveCards(cards);
      return cards[index];
    } catch (error) {
      console.error('更新失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除知识卡片
   */
  async deleteKnowledgeCard(cardId) {
    try {
      const cards = this.getAllCards();
      const filteredCards = cards.filter(card => 
        !(card.id === cardId && card.user_id === this.userId)
      );
      
      if (filteredCards.length === cards.length) {
        throw new Error('卡片未找到');
      }
      
      this.saveCards(filteredCards);
      return true;
    } catch (error) {
      console.error('删除失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量删除知识卡片
   */
  async deleteKnowledgeCards(chatIds) {
    try {
      const cards = this.getAllCards();
      const filteredCards = cards.filter(card => 
        !(chatIds.includes(card.chat_id) && card.user_id === this.userId)
      );
      
      this.saveCards(filteredCards);
      return true;
    } catch (error) {
      console.error('批量删除失败:', error);
      return false;
    }
  }
  
  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const cards = await this.getKnowledgeCards({ limit: 10000 });
      const stats = { 
        total: cards.length, 
        categories: {}, 
        platforms: {}, 
        favorites: 0 
      };
      
      cards.forEach(card => {
        const category = card.category || '未分类';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
        
        const platform = card.platform || '未知';
        stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
        
        if (card.is_favorite) stats.favorites++;
      });
      
      return stats;
    } catch (error) {
      console.error('获取统计失败:', error);
      return { total: 0, categories: {}, platforms: {}, favorites: 0 };
    }
  }
  
  /**
   * 导出为JSON
   */
  async exportToJSON(options = {}) {
    try {
      const cards = await this.getKnowledgeCards(options);
      const exportData = {
        exportTime: new Date().toISOString(),
        version: '1.0',
        source: 'LocalStorage',
        userId: this.userId,
        cards: cards,
        count: cards.length
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `知识库_本地存储_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('导出失败:', error);
      return false;
    }
  }
  
  /**
   * 导出为CSV
   */
  async exportToCSV(options = {}) {
    try {
      const cards = await this.getKnowledgeCards(options);
      if (cards.length === 0) return false;
      
      const headers = ['标题', '内容', '摘要', '分类', '标签', '来源', '平台', '创建时间', '收藏'];
      const csvContent = [
        headers.join(','),
        ...cards.map(card => [
          `"${(card.title || '').replace(/"/g, '""')}"`,
          `"${(card.content || '').replace(/"/g, '""')}"`,
          `"${(card.summary || '').replace(/"/g, '""')}"`,
          `"${(card.category || '').replace(/"/g, '""')}"`,
          `"${(card.tags || []).join(';').replace(/"/g, '""')}"`,
          `"${(card.source || '').replace(/"/g, '""')}"`,
          `"${(card.platform || '').replace(/"/g, '""')}"`,
          `"${card.created_at || ''}"`,
          `"${card.is_favorite ? '是' : '否'}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `知识库_本地存储_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      return true;
    } catch (error) {
      console.error('导出失败:', error);
      return false;
    }
  }
  
  /**
   * 导入数据
   */
  async importData(jsonData) {
    try {
      if (!jsonData || !jsonData.cards || !Array.isArray(jsonData.cards)) {
        throw new Error('无效的导入数据格式');
      }
      
      const existingCards = this.getAllCards();
      const importedCards = jsonData.cards.map(card => ({
        ...card,
        id: this.generateId(),
        user_id: this.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      const allCards = [...existingCards, ...importedCards];
      this.saveCards(allCards);
      
      console.log(`成功导入 ${importedCards.length} 条数据`);
      return importedCards.length;
    } catch (error) {
      console.error('导入失败:', error);
      throw error;
    }
  }
  
  /**
   * 清空所有数据
   */
  async clearAllData() {
    try {
      localStorage.removeItem(this.storageKey);
      this.init();
      console.log('所有数据已清空');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
  
  /**
   * 获取存储使用情况
   */
  getStorageInfo() {
    try {
      const data = localStorage.getItem(this.storageKey);
      const size = new Blob([data]).size;
      const cards = this.getAllCards();
      
      return {
        totalCards: cards.length,
        storageSize: size,
        storageSizeKB: (size / 1024).toFixed(2),
        storageSizeMB: (size / (1024 * 1024)).toFixed(4),
        maxStorage: '5-10MB (取决于浏览器)'
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }
  
  // 私有方法
  getAllCards() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取卡片失败:', error);
      return [];
    }
  }
  
  saveCards(cards) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cards));
    } catch (error) {
      console.error('保存卡片失败:', error);
      throw error;
    }
  }
  
  getUserId() {
    let userId = localStorage.getItem('act-nav-user-id');
    if (!userId) {
      userId = this.generateAnonymousUserId();
      this.saveUserId(userId);
    }
    return userId;
  }
  
  saveUserId(userId) {
    localStorage.setItem('act-nav-user-id', userId);
  }
  
  generateAnonymousUserId() {
    return 'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
  }
  
  generateId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  getCurrentPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('deepseek')) return 'deepseek';
    if (hostname.includes('kimi')) return 'kimi';
    if (hostname.includes('openai')) return 'openai';
    if (hostname.includes('doubao')) return 'doubao';
    return 'unknown';
  }
  
  getConfig() {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      storageType: 'LocalStorage',
      isReady: this.isReady()
    };
  }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.LocalStorageManager = LocalStorageManager;
}

// 如果使用ES6模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalStorageManager;
}
