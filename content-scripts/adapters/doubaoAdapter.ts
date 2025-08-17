import { SiteAdapter, ConversationData, ConversationMessage } from './siteAdapter';

/**
 * 豆包平台适配器
 * 用于从豆包对话页面提取完整的对话内容
 */
export class DoubaoAdapter implements SiteAdapter {
  
  canHandle(): boolean {
    return window.location.hostname.includes('www.doubao.com');
  }
  
  getPlatformName(): string {
    return '豆包';
  }
  
  extractConversation(): ConversationData {
    const messages: ConversationMessage[] = [];
    
    try {
      // 查找所有对话消息容器
      const messageContainers = document.querySelectorAll('[data-testid="message_text_content"]');
      
      messageContainers.forEach((container) => {
        // 检查是否是用户消息还是AI回答
        const isUser = this.isUserMessage(container);
        const isAssistant = this.isAssistantMessage(container);
        
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
      
      // 如果没有找到消息元素，尝试其他选择器
      if (messages.length === 0) {
        this.extractMessagesFallback(messages);
      }
      
      console.log(`豆包适配器提取到 ${messages.length} 条消息`);
      
    } catch (error) {
      console.error('豆包适配器提取对话失败:', error);
    }
    
    return {
      source: this.getPlatformName(),
      url: window.location.href,
      messages
    };
  }
  
  /**
   * 检查是否是用户消息
   */
  private isUserMessage(element: Element): boolean {
    // 豆包用户消息的特征
    return element.classList.contains('bg-s-color-bg-trans') ||
           element.closest('.user-message') !== null ||
           element.hasAttribute('data-role') && element.getAttribute('data-role') === 'user';
  }
  
  /**
   * 检查是否是AI回答
   */
  private isAssistantMessage(element: Element): boolean {
    // 豆包AI回答的特征
    return element.classList.contains('bg-s-color-bg-primary') ||
           element.closest('.assistant-message') !== null ||
           element.hasAttribute('data-role') && element.getAttribute('data-role') === 'assistant' ||
           element.querySelector('.markdown, .markdown-body, pre, code') !== null;
  }
  
  /**
   * 备用提取方法，使用更通用的选择器
   */
  private extractMessagesFallback(messages: ConversationMessage[]): void {
    // 尝试查找用户消息
    const userMessages = document.querySelectorAll('div[data-testid="message_text_content"].bg-s-color-bg-trans, .user-message');
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
    const aiMessages = document.querySelectorAll('div[data-testid="message_text_content"].bg-s-color-bg-primary, .assistant-message, .markdown, .markdown-body');
    aiMessages.forEach((msg) => {
      // 找到包含AI回答的父容器
      const container = msg.closest('[data-testid="message_text_content"]') || 
                       msg.closest('.assistant-message') || 
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
