/**
 * 站点适配器接口定义
 * 用于从不同AI对话平台提取完整的对话内容
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ConversationData {
  source: string; // 平台名称
  url: string;    // 当前页面URL
  messages: ConversationMessage[]; // 对话消息数组
}

export interface SiteAdapter {
  /**
   * 检查当前页面是否支持此适配器
   */
  canHandle(): boolean;
  
  /**
   * 提取当前页面的完整对话内容
   */
  extractConversation(): ConversationData;
  
  /**
   * 获取平台名称
   */
  getPlatformName(): string;
}

/**
 * 适配器工厂类
 * 根据当前页面自动选择合适的适配器
 */
export class AdapterFactory {
  private static adapters: SiteAdapter[] = [];
  
  /**
   * 注册适配器
   */
  static register(adapter: SiteAdapter): void {
    this.adapters.push(adapter);
  }
  
  /**
   * 获取适合当前页面的适配器
   */
  static getAdapter(): SiteAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle()) {
        return adapter;
      }
    }
    return null;
  }
  
  /**
   * 获取所有已注册的适配器
   */
  static getAllAdapters(): SiteAdapter[] {
    return this.adapters;
  }
}
