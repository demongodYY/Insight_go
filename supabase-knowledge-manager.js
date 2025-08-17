/**
 * Supabase知识库管理器
 */

class SupabaseKnowledgeManager {
  constructor() {
    this.config = null;
    this.supabase = null;
    this.userId = null;
    this.isInitialized = false;
    this.init();
  }
  
  async init() {
    try {
      if (typeof window.SupabaseConfig === 'function') {
        this.config = new window.SupabaseConfig();
        let attempts = 0;
        while (!this.config.isReady() && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        if (this.config.isReady()) {
          this.supabase = this.config.supabase;
          this.userId = this.config.getCurrentUserId();
          this.isInitialized = true;
          console.log('Supabase知识库管理器初始化成功');
        }
      }
    } catch (error) {
      console.error('初始化失败:', error);
    }
  }
  
  isReady() {
    return this.isInitialized && this.supabase !== null;
  }
  
  async addKnowledgeCard(cardData) {
    if (!this.isReady()) {
      throw new Error('Supabase未初始化');
    }
    
    try {
      const card = {
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
        is_favorite: false
      };
      
      const { data, error } = await this.supabase
        .from('knowledge_cards')
        .insert([card])
        .select()
        .single();
      
      if (error) throw new Error(`插入失败: ${error.message}`);
      
      console.log('知识卡片已保存到Supabase:', data);
      this.saveToLocalStorage(cardData);
      return data;
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  }
  
  async getKnowledgeCards(options = {}) {
    if (!this.isReady()) throw new Error('Supabase未初始化');
    
    try {
      let query = this.supabase
        .from('knowledge_cards')
        .select('*')
        .eq('user_id', this.userId);
      
      if (options.category) query = query.eq('category', options.category);
      if (options.platform) query = query.eq('platform', options.platform);
      if (options.chatId) query = query.eq('chat_id', options.chatId);
      if (options.search) query = query.textSearch('title,content,summary', options.search);
      
      query = query.order('created_at', { ascending: false });
      if (options.limit) query = query.limit(options.limit);
      
      const { data, error } = await query;
      if (error) throw new Error(`查询失败: ${error.message}`);
      
      return data || [];
    } catch (error) {
      console.error('获取失败:', error);
      throw error;
    }
  }
  
  async updateKnowledgeCard(cardId, updates) {
    if (!this.isReady()) throw new Error('Supabase未初始化');
    
    try {
      const { data, error } = await this.supabase
        .from('knowledge_cards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .eq('user_id', this.userId)
        .select()
        .single();
      
      if (error) throw new Error(`更新失败: ${error.message}`);
      return data;
    } catch (error) {
      console.error('更新失败:', error);
      throw error;
    }
  }
  
  async deleteKnowledgeCard(cardId) {
    if (!this.isReady()) throw new Error('Supabase未初始化');
    
    try {
      const { error } = await this.supabase
        .from('knowledge_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', this.userId);
      
      if (error) throw new Error(`删除失败: ${error.message}`);
      return true;
    } catch (error) {
      console.error('删除失败:', error);
      throw error;
    }
  }
  
  async getStats() {
    try {
      const cards = await this.getKnowledgeCards({ limit: 10000 });
      const stats = { total: cards.length, categories: {}, platforms: {}, favorites: 0 };
      
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
  
  async exportToJSON(options = {}) {
    try {
      const cards = await this.getKnowledgeCards(options);
      const exportData = {
        exportTime: new Date().toISOString(),
        version: '1.0',
        source: 'Supabase',
        userId: this.userId,
        cards: cards,
        count: cards.length
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `知识库_Supabase_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('导出失败:', error);
      return false;
    }
  }
  
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
      link.download = `知识库_Supabase_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      return true;
    } catch (error) {
      console.error('导出失败:', error);
      return false;
    }
  }
  
  saveToLocalStorage(cardData) {
    try {
      const existingData = localStorage.getItem('act-nav-knowledge-base');
      const cards = existingData ? JSON.parse(existingData) : [];
      const exists = cards.some(card => 
        card.id === cardData.id || 
        (card.chatId === cardData.chatId && card.title === cardData.title)
      );
      
      if (!exists) {
        cards.push({
          ...cardData,
          syncedToSupabase: true,
          syncedAt: new Date().toISOString()
        });
        localStorage.setItem('act-nav-knowledge-base', JSON.stringify(cards));
      }
    } catch (error) {
      console.error('保存到localStorage失败:', error);
    }
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
      supabaseUrl: this.config?.supabaseUrl,
      isReady: this.isReady()
    };
  }
}

if (typeof window !== 'undefined') {
  window.SupabaseKnowledgeManager = SupabaseKnowledgeManager;
}
