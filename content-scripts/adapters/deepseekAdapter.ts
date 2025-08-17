import { SiteAdapter, ConversationData, ConversationMessage } from './siteAdapter';

/**
 * DeepSeek平台适配器
 * 用于从DeepSeek对话页面提取完整的对话内容
 */
export class DeepSeekAdapter implements SiteAdapter {
  
  canHandle(): boolean {
    return window.location.hostname.includes('chat.deepseek.com');
  }
  
  getPlatformName(): string {
    return 'DeepSeek';
  }
  
  extractConversation(): ConversationData {
    const messages: ConversationMessage[] = [];
    
    try {
      // 查找所有对话消息容器
      const messageContainers = document.querySelectorAll('[data-message-author-role]');
      
      messageContainers.forEach((container) => {
        const role = container.getAttribute('data-message-author-role');
        if (role === 'user' || role === 'assistant') {
          const text = this.extractMessageText(container);
          if (text && text.trim()) {
            messages.push({
              role: role as 'user' | 'assistant',
              text: text.trim()
            });
          }
        }
      });
      
      // 如果没有找到带data-message-author-role的元素，尝试其他选择器
      if (messages.length === 0) {
        this.extractMessagesFallback(messages);
      }
      
      console.log(`DeepSeek适配器提取到 ${messages.length} 条消息`);
      
    } catch (error) {
      console.error('DeepSeek适配器提取对话失败:', error);
    }
    
    return {
      source: this.getPlatformName(),
      url: window.location.href,
      messages
    };
  }
  
  /**
   * 备用提取方法，使用更通用的选择器
   */
  private extractMessagesFallback(messages: ConversationMessage[]): void {
    // 尝试查找用户消息
    const userMessages = document.querySelectorAll('div.fbb737a4');
    userMessages.forEach((msg) => {
      const text = this.extractMessageText(msg);
      if (text && text.trim()) {
        messages.push({
          role: 'user',
          text: text.trim()
        });
      }
    });
    
    // 尝试查找AI回答
    const aiMessages = document.querySelectorAll('.ds-markdown-paragraph, .markdown, pre, code');
    aiMessages.forEach((msg) => {
      // 找到包含AI回答的父容器
      const container = msg.closest('[data-message-author-role="assistant"]') || 
                       msg.closest('.assistant') || 
                       msg.closest('.ai-response');
      
      if (container && !this.isAlreadyProcessed(container, messages)) {
        const text = this.extractMessageText(container);
        if (text && text.trim()) {
          messages.push({
            role: 'assistant',
            text: text.trim()
          });
        }
      }
    });
  }
  
  /**
   * 检查消息是否已经被处理过
   */
  private isAlreadyProcessed(element: Element, messages: ConversationMessage[]): boolean {
    const text = this.extractMessageText(element);
    return messages.some(msg => msg.text === text);
  }
  
  /**
   * 提取消息文本内容
   */
  private extractMessageText(element: Element): string {
    // 移除代码块，只保留文本内容
    const clone = element.cloneNode(true) as Element;
    const codeBlocks = clone.querySelectorAll('pre, code');
    codeBlocks.forEach(code => code.remove());
    
    // 获取纯文本内容
    let text = clone.textContent || clone.innerText || '';
    
    // 清理多余的空白字符
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
}
