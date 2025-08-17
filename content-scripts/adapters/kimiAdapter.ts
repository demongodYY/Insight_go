import { SiteAdapter, ConversationData, ConversationMessage } from './siteAdapter';

/**
 * Kimi平台适配器
 * 用于从Kimi对话页面提取完整的对话内容
 */
export class KimiAdapter implements SiteAdapter {
  
  canHandle(): boolean {
    return window.location.hostname.includes('www.kimi.com');
  }
  
  getPlatformName(): string {
    return 'Kimi';
  }
  
  extractConversation(): ConversationData {
    const messages: ConversationMessage[] = [];
    
    try {
      // 查找所有对话消息容器
      const messageContainers = document.querySelectorAll('.chat-item');
      
      messageContainers.forEach((container) => {
        const isUser = container.classList.contains('chat-item-user');
        const isAssistant = container.classList.contains('chat-item-assistant');
        
        if (isUser || isAssistant) {
          const text = this.extractMessageText(container);
          if (text && text.trim()) {
            messages.push({
              role: isUser ? 'user' : 'assistant',
              text: text.trim()
            });
          }
        }
      });
      
      // 如果没有找到.chat-item元素，尝试其他选择器
      if (messages.length === 0) {
        this.extractMessagesFallback(messages);
      }
      
      console.log(`Kimi适配器提取到 ${messages.length} 条消息`);
      
    } catch (error) {
      console.error('Kimi适配器提取对话失败:', error);
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
    const userMessages = document.querySelectorAll('.user-content, .chat-item-user .chat-item-content');
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
    const aiMessages = document.querySelectorAll('.markdown-body, .assistant-content, .chat-item-assistant .chat-item-content');
    aiMessages.forEach((msg) => {
      // 找到包含AI回答的父容器
      const container = msg.closest('.chat-item-assistant') || 
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
