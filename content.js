/**
 * 即刻导航 (Act-Nav) - 主要内容脚本
 * 负责在AI对话页面注入侧边栏并管理对话目录
 * 支持多平台：DeepSeek、Kimi、ChatGPT等
 */

// 内联的Supabase客户端实现，避免ES6 import问题
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
  }

  async invokeFunction(functionName, options = {}) {
    try {
      console.log(`invokeFunction ${functionName} 开始调用，URL: ${this.url}/functions/v1/${functionName}`);
      console.log(`invokeFunction ${functionName} 请求体:`, options.body);
      
      const response = await fetch(`${this.url}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options.body || {})
      });

      console.log(`invokeFunction ${functionName} 响应状态:`, response.status, response.statusText);
      console.log(`invokeFunction ${functionName} 响应头:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`invokeFunction ${functionName} HTTP错误:`, response.status, errorText);
        
        // 提供更友好的错误信息
        let errorMessage = `HTTP错误 ${response.status}`;
        if (response.status === 404) {
          errorMessage = '云函数未找到，请检查配置';
        } else if (response.status === 500) {
          errorMessage = '云函数内部错误，请稍后重试';
        } else if (response.status === 403) {
          errorMessage = '访问被拒绝，请检查权限';
        } else if (response.status >= 400 && response.status < 500) {
          errorMessage = '请求参数错误，请检查输入';
        } else if (response.status >= 500) {
          errorMessage = '服务器错误，请稍后重试';
        }
        
        throw new Error(`${errorMessage} (状态码: ${response.status})`);
      }

      const result = await response.json();
      console.log(`invokeFunction ${functionName} 原始响应:`, result);
      console.log(`invokeFunction ${functionName} 响应类型:`, typeof result);
      console.log(`invokeFunction ${functionName} 响应键:`, Object.keys(result || {}));
      
      // 检查是否返回了错误对象
      if (result && result.error) {
        console.error(`invokeFunction ${functionName} 云函数返回错误:`, result.error);
        throw new Error(`云函数错误: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`invokeFunction ${functionName} 调用失败:`, error);
      throw error;
    }
  }

  /**
   * 删除知识卡片
   */
  async deleteKnowledgeCards(chatIds) {
    try {
      const result = await this.invokeFunction('delete-knowledge-cards', { 
        body: { chatIds } 
      });
      if (result.success) {
        console.log('知识卡片删除成功');
        return true;
      } else {
        console.error('知识卡片删除失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('删除知识卡片时出错:', error);
      return false;
    }
  }
}

// 站点适配器加载逻辑
// 由于浏览器扩展的限制，我们需要动态加载适配器
async function loadSiteAdapters() {
  try {
    // 创建适配器工厂的全局实例
    window.AdapterFactory = {
      adapters: [],
      
      register(adapter) {
        this.adapters.push(adapter);
      },
      
      getAdapter() {
        for (const adapter of this.adapters) {
          if (adapter.canHandle()) {
            return adapter;
          }
        }
        return null;
      },
      
      getAllAdapters() {
        return this.adapters;
      }
    };

    // 创建DeepSeek适配器
    const DeepSeekAdapter = {
      canHandle() {
        return window.location.hostname.includes('chat.deepseek.com');
      },
      
      getPlatformName() {
        return 'DeepSeek';
      },
      
      extractConversation() {
        const messages = [];
        
        try {
          console.log('DeepSeek适配器开始提取对话...');
          
          // 方法1: 使用正确的DeepSeek DOM选择器
          const userMessages = document.querySelectorAll('div.fbb737a4');
          const aiMessages = document.querySelectorAll('div.ds-markdown.ds-markdown--block');
          
          console.log(`找到 ${userMessages.length} 个用户消息容器`);
          console.log(`找到 ${aiMessages.length} 个AI回答容器`);
          
          // 提取用户消息
          userMessages.forEach((container, index) => {
            const text = extractMessageText(container);
            if (text && text.trim()) {
              console.log(`用户消息 ${index + 1}: 文本长度=${text.length}, 内容预览=${text.substring(0, 50)}...`);
              messages.push({
                role: 'user',
                text: text.trim()
              });
            }
          });
          
          // 提取AI回答
          aiMessages.forEach((container, index) => {
            const text = extractMessageText(container);
            if (text && text.trim()) {
              console.log(`AI回答 ${index + 1}: 文本长度=${text.length}, 内容预览=${text.substring(0, 50)}...`);
              messages.push({
                role: 'assistant',
                text: text.trim()
              });
            }
          });
          
          // 方法2: 如果主要方法没有找到足够消息，使用备用方案
          if (messages.length < 2) {
            console.log('主要方法提取的消息不足，使用备用方案...');
            extractMessagesFallback(messages, 'deepseek');
          }
          
          // 方法3: 如果仍然不足，尝试其他选择器
          if (messages.length < 2) {
            console.log('备用方案仍然不足，尝试其他选择器...');
            extractDeepSeekMessagesAlternative(messages);
          }
          
          console.log(`DeepSeek适配器最终提取到 ${messages.length} 条消息:`, messages.map(m => `${m.role}: ${m.text.substring(0, 50)}...`));
          
        } catch (error) {
          console.error('DeepSeek适配器提取对话失败:', error);
        }
        
        return {
          source: this.getPlatformName(),
          url: window.location.href,
          messages
        };
      }
    };

    // 创建Kimi适配器
    const KimiAdapter = {
      canHandle() {
        return window.location.hostname.includes('www.kimi.com');
      },
      
      getPlatformName() {
        return 'Kimi';
      },
      
      extractConversation() {
        const messages = [];
        
        try {
          console.log('Kimi适配器开始提取对话...');
          
          // 方法1: 使用正确的Kimi DOM选择器
          const userMessages = document.querySelectorAll('.user-content');
          const aiMessages = document.querySelectorAll('.paragraph');
          
          console.log(`找到 ${userMessages.length} 个用户消息容器`);
          console.log(`找到 ${aiMessages.length} 个AI回答容器`);
          
          // 提取用户消息
          userMessages.forEach((container, index) => {
            const text = extractMessageText(container);
            if (text && text.trim()) {
              console.log(`用户消息 ${index + 1}: 文本长度=${text.length}, 内容预览=${text.substring(0, 50)}...`);
              messages.push({
                role: 'user',
                text: text.trim()
              });
            }
          });
          
          // 提取AI回答
          aiMessages.forEach((container, index) => {
            const text = extractMessageText(container);
            if (text && text.trim()) {
              console.log(`AI回答 ${index + 1}: 文本长度=${text.length}, 内容预览=${text.substring(0, 50)}...`);
              messages.push({
                role: 'assistant',
                text: text.trim()
              });
            }
          });
          
          // 方法2: 如果主要方法没有找到足够消息，使用备用方案
          if (messages.length < 2) {
            console.log('主要方法提取的消息不足，使用备用方案...');
            extractMessagesFallback(messages, 'kimi');
          }
          
          // 方法3: 如果仍然不足，尝试其他选择器
          if (messages.length < 2) {
            console.log('备用方案仍然不足，尝试其他选择器...');
            extractKimiMessagesAlternative(messages);
          }
          
          console.log(`Kimi适配器最终提取到 ${messages.length} 条消息:`, messages.map(m => `${m.role}: ${m.text.substring(0, 50)}...`));
          
        } catch (error) {
          console.error('Kimi适配器提取对话失败:', error);
        }
        
        return {
          source: this.getPlatformName(),
          url: window.location.href,
          messages
        };
      }
    };

    // 创建豆包适配器
    const DoubaoAdapter = {
      canHandle() {
        return window.location.hostname.includes('www.doubao.com');
      },
      
      getPlatformName() {
        return '豆包';
      },
      
      extractConversation() {
        const messages = [];
        
        try {
          console.log('豆包适配器开始提取对话...');
          
          // 方法1: 使用正确的豆包DOM选择器
          const messageContainers = document.querySelectorAll('[data-testid="message_text_content"]');
          console.log(`找到 ${messageContainers.length} 个消息容器`);
          
          messageContainers.forEach((container, index) => {
            // 检查是否是用户消息还是AI回答
            const isUser = isUserMessage(container);
            const isAssistant = isAssistantMessage(container);
            
            if (isUser || isAssistant) {
              const text = extractMessageText(container);
              if (text && text.trim()) {
                const role = isUser ? 'user' : 'assistant';
                console.log(`消息 ${index + 1}: 角色=${role}, 文本长度=${text.length}, 内容预览=${text.substring(0, 50)}...`);
                messages.push({
                  role: role,
                  text: text.trim()
                });
              }
            }
          });
          
          // 方法2: 如果主要方法没有找到足够消息，使用备用方案
          if (messages.length < 2) {
            console.log('主要方法提取的消息不足，使用备用方案...');
            extractMessagesFallback(messages, 'doubao');
          }
          
          // 方法3: 如果仍然不足，尝试其他选择器
          if (messages.length < 2) {
            console.log('备用方案仍然不足，尝试其他选择器...');
            extractDoubaoMessagesAlternative(messages);
          }
          
          console.log(`豆包适配器最终提取到 ${messages.length} 条消息:`, messages.map(m => `${m.role}: ${m.text.substring(0, 50)}...`));
          
        } catch (error) {
          console.error('豆包适配器提取对话失败:', error);
        }
        
        return {
          source: this.getPlatformName(),
          url: window.location.href,
          messages
        };
      }
    };

    // 辅助函数
    function extractMessageText(element) {
      // 移除代码块，只保留文本内容
      const clone = element.cloneNode(true);
      const codeBlocks = clone.querySelectorAll('pre, code');
      codeBlocks.forEach(code => code.remove());
      
      // 获取纯文本内容
      let text = clone.textContent || clone.innerText || '';
      
      // 清理多余的空白字符
      text = text.replace(/\s+/g, ' ').trim();
      
      return text;
    }

    function isUserMessage(element) {
      // 豆包用户消息的特征 - 根据实际DOM结构
      return element.classList.contains('bg-s-color-bg-trans') ||
             element.classList.contains('container-ZzKwSY') ||
             element.closest('.user-message') !== null ||
             element.hasAttribute('data-role') && element.getAttribute('data-role') === 'user';
    }

    function isAssistantMessage(element) {
      // 豆包AI回答的特征 - 根据实际DOM结构
      return element.classList.contains('container-ZYIsnH') ||
             element.classList.contains('flow-markdown-body') ||
             element.classList.contains('theme-samantha-Nbr9UN') ||
             element.querySelector('.paragraph-JOTKXA') !== null ||
             element.closest('.assistant-message') !== null ||
             element.hasAttribute('data-role') && element.getAttribute('data-role') === 'assistant' ||
             element.querySelector('.markdown, .markdown-body, pre, code') !== null;
    }

    function extractMessagesFallback(messages, platform) {
      if (platform === 'deepseek') {
        console.log('DeepSeek备用方案：尝试其他选择器...');
        
        // 备用方案1: 尝试查找用户消息的其他可能选择器
        const userSelectors = [
          'div.fbb737a4',
          '[class*="user"]',
          '.user-message',
          '.message-user'
        ];
        
        for (const selector of userSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              const text = extractMessageText(msg);
              if (text && text.trim() && !isAlreadyProcessed(msg, messages)) {
                messages.push({
                  role: 'user',
                  text: text.trim()
                });
              }
            });
            break;
          }
        }
        
        // 备用方案2: 尝试查找AI回答的其他可能选择器
        const aiSelectors = [
          'div.ds-markdown.ds-markdown--block',
          '.ds-markdown-paragraph',
          '.markdown',
          'pre',
          'code'
        ];
        
        for (const selector of aiSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              if (!isAlreadyProcessed(msg, messages)) {
                const text = extractMessageText(msg);
                if (text && text.trim()) {
                  messages.push({
                    role: 'assistant',
                    text: text.trim()
                  });
                }
              }
            });
            break;
          }
        }
      } else if (platform === 'kimi') {
        console.log('Kimi备用方案：尝试其他选择器...');
        
        // 备用方案1: 尝试查找用户消息的其他可能选择器
        const userSelectors = [
          '.user-content',
          '.chat-item-user .chat-item-content',
          '[class*="user"]',
          '.user-message'
        ];
        
        for (const selector of userSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              const text = extractMessageText(msg);
              if (text && text.trim() && !isAlreadyProcessed(msg, messages)) {
                messages.push({
                  role: 'user',
                  text: text.trim()
                });
              }
            });
            break;
          }
        }
        
        // 备用方案2: 尝试查找AI回答的其他可能选择器
        const aiSelectors = [
          '.paragraph',
          '.markdown-body',
          '.assistant-content',
          '.chat-item-assistant .chat-item-content'
        ];
        
        for (const selector of aiSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              if (!isAlreadyProcessed(msg, messages)) {
                const text = extractMessageText(msg);
                if (text && text.trim()) {
                  messages.push({
                    role: 'assistant',
                    text: text.trim()
                  });
                }
              }
            });
            break;
          }
        }
      } else if (platform === 'doubao') {
        console.log('豆包备用方案：尝试其他选择器...');
        
        // 备用方案1: 尝试查找用户消息的其他可能选择器
        const userSelectors = [
          'div[data-testid="message_text_content"].bg-s-color-bg-trans',
          'div[data-testid="message_text_content"].container-ZzKwSY',
          '.user-message',
          '.message-user'
        ];
        
        for (const selector of userSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              const text = extractMessageText(msg);
              if (text && text.trim() && !isAlreadyProcessed(msg, messages)) {
                messages.push({
                  role: 'user',
                  text: text.trim()
                });
              }
            });
            break;
          }
        }
        
        // 备用方案2: 尝试查找AI回答的其他可能选择器
        const aiSelectors = [
          'div[data-testid="message_text_content"].container-ZYIsnH',
          'div[data-testid="message_text_content"].flow-markdown-body',
          '.paragraph-JOTKXA',
          '.assistant-message',
          '.markdown',
          '.markdown-body'
        ];
        
        for (const selector of aiSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`备用方案找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
            elements.forEach((msg) => {
              if (!isAlreadyProcessed(msg, messages)) {
                const text = extractMessageText(msg);
                if (text && text.trim()) {
                  messages.push({
                    role: 'assistant',
                    text: text.trim()
                  });
                }
              }
            });
            break;
          }
        }
      }
    }

    function isAlreadyProcessed(element, messages) {
      const text = extractMessageText(element);
      return messages.some(msg => msg.text === text);
    }

    // DeepSeek专用备用搜索函数
    function extractDeepSeekMessagesAlternative(messages) {
      console.log('DeepSeek备用搜索：尝试更多选择器...');
      
      // 搜索用户消息 - 尝试更多选择器
      const userSelectors = [
        'div.fbb737a4',
        '[class*="user"]',
        '.user-message',
        '.message-user',
        '[data-role="user"]'
      ];
      
      let userFound = false;
      for (const selector of userSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            const text = extractMessageText(el);
            if (text && text.trim() && text.length > 5 && !isAlreadyProcessed(el, messages)) {
              messages.push({
                role: 'user',
                text: text.trim()
              });
              userFound = true;
            }
          });
          if (userFound) break;
        }
      }
      
      // 搜索AI回答 - 尝试更多选择器
      const aiSelectors = [
        'div.ds-markdown.ds-markdown--block',
        '.ds-markdown-paragraph',
        '.markdown',
        '.markdown-body',
        'pre',
        'code',
        '[class*="assistant"]',
        '[data-role="assistant"]'
      ];
      
      let aiFound = false;
      for (const selector of aiSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            if (!isAlreadyProcessed(el, messages)) {
              const text = extractMessageText(el);
              if (text && text.trim() && text.length > 20) {
                messages.push({
                  role: 'assistant',
                  text: text.trim()
                });
                aiFound = true;
              }
            }
          });
          if (aiFound) break;
        }
      }
      
      console.log(`备用搜索完成: 用户消息=${userFound ? '是' : '否'}, AI回答=${aiFound ? '是' : '否'}`);
    }

    // 豆包专用备用搜索函数
    function extractDoubaoMessagesAlternative(messages) {
      console.log('豆包备用搜索：尝试更多选择器...');
      
      // 搜索用户消息 - 尝试更多选择器
      const userSelectors = [
        'div[data-testid="message_text_content"].bg-s-color-bg-trans',
        'div[data-testid="message_text_content"].container-ZzKwSY',
        '[class*="user"]',
        '.user-message',
        '.message-user',
        '[data-role="user"]'
      ];
      
      let userFound = false;
      for (const selector of userSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            const text = extractMessageText(el);
            if (text && text.trim() && text.length > 5 && !isAlreadyProcessed(el, messages)) {
              messages.push({
                role: 'user',
                text: text.trim()
              });
              userFound = true;
            }
          });
          if (userFound) break;
        }
      }
      
      // 搜索AI回答 - 尝试更多选择器
      const aiSelectors = [
        'div[data-testid="message_text_content"].container-ZYIsnH',
        'div[data-testid="message_text_content"].flow-markdown-body',
        'div[data-testid="message_text_content"].theme-samantha-Nbr9UN',
        '.paragraph-JOTKXA',
        '.paragraph-element',
        '.flow-markdown-body',
        '.theme-samantha-Nbr9UN',
        '[class*="assistant"]',
        '[data-role="assistant"]'
      ];
      
      let aiFound = false;
      for (const selector of aiSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            if (!isAlreadyProcessed(el, messages)) {
              const text = extractMessageText(el);
              if (text && text.trim() && text.length > 20) {
                messages.push({
                  role: 'assistant',
                  text: text.trim()
                });
                aiFound = true;
              }
            }
          });
          if (aiFound) break;
        }
      }
      
      console.log(`豆包备用搜索完成: 用户消息=${userFound ? '是' : '否'}, AI回答=${aiFound ? '是' : '否'}`);
    }

    // Kimi专用备用搜索函数
    function extractKimiMessagesAlternative(messages) {
      console.log('Kimi备用搜索：尝试更多选择器...');
      
      // 搜索用户消息 - 尝试更多选择器
      const userSelectors = [
        '.user-content',
        '.chat-item-user .chat-item-content',
        '[class*="user"]',
        '.user-message',
        '[data-role="user"]'
      ];
      
      let userFound = false;
      for (const selector of userSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到用户消息选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            const text = extractMessageText(el);
            if (text && text.trim() && text.length > 5 && !isAlreadyProcessed(el, messages)) {
              messages.push({
                role: 'user',
                text: text.trim()
              });
              userFound = true;
            }
          });
          if (userFound) break;
        }
      }
      
      // 搜索AI回答 - 尝试更多选择器
      const aiSelectors = [
        '.paragraph',
        '.markdown-body',
        '.assistant-content',
        '.chat-item-assistant .chat-item-content',
        '[class*="assistant"]',
        '[data-role="assistant"]'
      ];
      
      let aiFound = false;
      for (const selector of aiSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`备用搜索找到AI回答选择器: ${selector}, 数量: ${elements.length}`);
          elements.forEach((el, index) => {
            if (!isAlreadyProcessed(el, messages)) {
              const text = extractMessageText(el);
              if (text && text.trim() && text.length > 20) {
                messages.push({
                  role: 'assistant',
                  text: text.trim()
                });
                aiFound = true;
              }
            }
          });
          if (aiFound) break;
        }
      }
      
      console.log(`Kimi备用搜索完成: 用户消息=${userFound ? '是' : '否'}, AI回答=${aiFound ? '是' : '否'}`);
    }

    // 注册所有适配器
    window.AdapterFactory.register(DeepSeekAdapter);
    window.AdapterFactory.register(KimiAdapter);
    window.AdapterFactory.register(DoubaoAdapter);
    
    console.log('站点适配器已加载:', window.AdapterFactory.getAllAdapters().map(a => a.getPlatformName()));
    
  } catch (error) {
    console.error('加载站点适配器失败:', error);
  }
}

// 平台配置对象
const PLATFORM_CONFIGS = {
  'chat.deepseek.com': {
    // 用于从URL中提取唯一对话ID的正则表达式
    chatIdRegex: /\/chat\/(s\/)?(([\w-]+))/,
    // 用户发送的消息的DOM选择器
    userMessageSelector: 'div.fbb737a4',
    // 输入框选择器
    inputSelectors: [
      'textarea.ds-textarea',
      'textarea[placeholder*="发送消息"]',
      'textarea[placeholder*="Send a message"]',
      '[contenteditable="true"]',
      '.chat-input textarea',
      'textarea[role="textbox"]'
    ],
    // 提交按钮选择器
    submitSelectors: [
      'button.e1328ad',
      'button[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      '.send-button',
      'button[type="submit"]'
    ]
  },
  'www.kimi.com': {
    // Kimi的URL通常是 /chat/{uuid} 格式
    chatIdRegex: /\/chat\/(([\w-]+))/,
    // Kimi的用户消息元素选择器
    userMessageSelector: '.user-content, .chat-item-user .chat-item-content',
    // 输入框选择器
    inputSelectors: [
      'textarea[placeholder*="请输入"]',
      'textarea[placeholder*="输入消息"]',
      '[contenteditable="true"]',
      'textarea[role="textbox"]',
      '.input-area textarea'
    ],
    // 提交按钮选择器
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      '.send-button',
      'button[type="submit"]'
    ]
  },
  'chat.openai.com': {
    // ChatGPT的URL通常是 /c/{uuid} 格式
    chatIdRegex: /\/c\/((\[\w-]+))/,
    // ChatGPT的用户消息元素选择器
    userMessageSelector: 'div[data-message-author-role="user"]',
    // 输入框选择器
    inputSelectors: [
      'textarea[placeholder*="Message"]',
      '[contenteditable="true"]',
      'textarea[role="textbox"]'
    ],
    // 提交按钮选择器
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      '.send-button'
    ]
  },
  'www.doubao.com': {
    // 豆包的URL通常是 /chat/{id} 格式
    chatIdRegex: /\/chat\/(([\[\w-]+))/,
    // 豆包的用户消息元素选择器 - 使用更精确的选择器区分用户消息和AI回答
    userMessageSelector: 'div[data-testid="message_text_content"].container-ZzKwSY.bg-s-color-bg-trans',
    // 输入框选择器
    inputSelectors: [
      'textarea[placeholder*="请输入"]',
      'textarea[placeholder*="输入消息"]',
      '[contenteditable="true"]',
      'textarea[role="textbox"]',
      '.input-area textarea'
    ],
    // 提交按钮选择器
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      '.send-button',
      'button[type="submit"]'
    ]
  }
};

class ActNav {
  constructor() {
    // --- 新增代码开始 ---
    // 使用你在Supabase仪表盘 "API" 设置中找到的公共密钥
    const supabaseUrl = 'https://hkhtzeqtovrobrfxjmmh.supabase.co'; // 替换成你的URL
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraHR6ZXF0b3Zyb2JyZnhqbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTMxNjcsImV4cCI6MjA3MDQ2OTE2N30._ZvMw0YcoND2dle57fYo23h_2RLFE8feN_IZ2aRxBeQ'; // 替换成你的anon key
    this.supabase = new SupabaseClient(supabaseUrl, supabaseAnonKey);
    // --- 新增代码结束 ---
    
    // 20 秒窗口：同一次提交期间，AI 回答/DOM 再渲染被跳过；稍后再次提问可入录
    this.PENDING_DEDUP_TTL = 20 * 1000;
    
    // 获取平台配置
    this.config = this.getPlatformConfig();
    if (!this.config) {
      console.error('ActNav: 当前平台不受支持。');
      return; // 如果不支持，则不继续执行
    }
    
    // 初始化基本属性
    this.questions = [];
    this.isSidebarVisible = true;
    this.observer = null;
    this.chatId = null; // 当前对话ID
    this.currentChatId = null; // 新增：保存当前对话ID，用于跟踪对话状态
    this.sidebar = null; // 新增：保存侧边栏DOM引用
    
    // 防止重复处理问题的标记
    this.pendingQuestionText = null;
    this.pendingQuestionTimestamp = null;
    
    // 记录最近处理的问题，防止重复处理（所有平台通用）
    // this.recentlyProcessedQuestions = null; // 注释掉：允许相同文本多次记录
    
    // 初始化标志位
    this.initialized = false;
    
    // 会话状态管理
    this.sessionState = 'idle'; // 'idle' | 'waiting_for_ai_response' | 'processing_ai_response'
    this.lastUserQuestion = null; // 记录最后提交的用户问题
    this.lastUserQuestionTime = null; // 记录最后提交的时间
    
    // 立即提取当前对话ID
    try {
      const url = window.location.href;
      console.log('初始化时的URL:', url);
      console.log('当前平台配置:', this.config);
    } catch (error) {
      console.error('获取初始URL失败:', error);
    }
    
    // 加载站点适配器
    loadSiteAdapters();
    
    // 启动插件
    this.init();
    
    // 设置全局实例引用，用于重试等功能
    window.actNavInstance = this;
    
    // 监听页面卸载事件，清理会话存储
    window.addEventListener('beforeunload', () => {
      this.cleanupSessionStorage();
    });
    
    // 监听页面隐藏事件，作为页面关闭的备用检测
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时，延迟清理会话存储，给页面关闭留出时间
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            this.cleanupSessionStorage();
          }
        }, 1000);
      }
    });
  }
  
  /**
   * 初始化知识库管理器
   */
  initKnowledgeBaseManager() {
    try {
      console.log('开始初始化知识库管理器...');
      
      // 等待一段时间确保KnowledgeBaseManager类已加载
      setTimeout(() => {
        this.tryInitKnowledgeBaseManager();
      }, 100);
    } catch (error) {
      console.error('初始化知识库管理器失败:', error);
    }
  }

  /**
   * 尝试初始化知识库管理器
   */
  tryInitKnowledgeBaseManager() {
    try {
      console.log('开始尝试初始化知识库管理器...');
      
      // 检查知识库管理器实例是否已存在且功能完整
      if (window.knowledgeBaseManagerInstance && typeof window.knowledgeBaseManagerInstance.getAllCards === 'function') {
        console.log('知识库管理器实例已存在且功能完整');
        return;
      }
      
      // 检查KnowledgeBaseManager类是否存在
      if (typeof window.KnowledgeBaseManager === 'function') {
        try {
          console.log('创建新的知识库管理器实例...');
          window.knowledgeBaseManagerInstance = new window.KnowledgeBaseManager();
          console.log('知识库管理器实例创建成功');
          
          // 验证实例是否工作正常
          if (window.knowledgeBaseManagerInstance && typeof window.knowledgeBaseManagerInstance.getAllCards === 'function') {
            console.log('知识库管理器实例验证成功');
            
            // 测试基本功能
            try {
              const testCards = window.knowledgeBaseManagerInstance.getAllCards();
              console.log('知识库管理器功能测试成功，当前卡片数量:', testCards.length);
            } catch (testError) {
              console.error('知识库管理器功能测试失败:', testError);
              this.createFallbackKnowledgeManager();
            }
          } else {
            console.error('知识库管理器实例创建失败，方法不可用');
            this.createFallbackKnowledgeManager();
          }
        } catch (instanceError) {
          console.error('创建知识库管理器实例失败:', instanceError);
          this.createFallbackKnowledgeManager();
        }
      } else {
        console.warn('KnowledgeBaseManager类不可用，创建备用管理器');
        this.createFallbackKnowledgeManager();
      }
    } catch (error) {
      console.error('尝试初始化知识库管理器失败:', error);
      this.createFallbackKnowledgeManager();
    }
  }

  /**
   * 创建备用知识库管理器
   */
  createFallbackKnowledgeManager() {
    try {
      console.log('创建备用知识库管理器...');
      
      // 创建一个简单的备用知识库管理器
      window.knowledgeBaseManagerInstance = {
        getAllCards() {
          try {
            const stored = localStorage.getItem('act-nav-knowledge-base');
            return stored ? JSON.parse(stored) : [];
          } catch (error) {
            console.error('备用管理器获取卡片失败:', error);
            return [];
          }
        },
        
        addKnowledgeCard(card) {
          try {
            const cards = this.getAllCards();
            const newCard = {
              id: Date.now().toString(),
              ...card,
              createdAt: new Date().toISOString(),
              addedToLibrary: new Date().toISOString()
            };
            cards.push(newCard);
            localStorage.setItem('act-nav-knowledge-base', JSON.stringify(cards));
            console.log('备用管理器添加卡片成功:', newCard.id);
            return newCard.id;
          } catch (error) {
            console.error('备用管理器添加卡片失败:', error);
            throw error;
          }
        },
        
        searchCards(query) {
          try {
            const cards = this.getAllCards();
            if (!query) return cards;
            return cards.filter(card => 
              card.title.includes(query) || 
              card.content.includes(query) ||
              (card.tags && card.tags.some(tag => tag.includes(query)))
            );
          } catch (error) {
            console.error('备用管理器搜索卡片失败:', error);
            return [];
          }
        },
        
        deleteCard(cardId) {
          try {
            const cards = this.getAllCards();
            const filteredCards = cards.filter(card => card.id !== cardId);
            localStorage.setItem('act-nav-knowledge-base', JSON.stringify(cards));
            console.log('备用管理器删除卡片成功:', cardId);
            return true;
          } catch (error) {
            console.error('备用管理器删除卡片失败:', error);
            return false;
          }
        },
        
        exportToCSV() {
          try {
            const cards = this.getAllCards();
            if (cards.length === 0) return '';
            
            const headers = ['标题', '内容', '标签', '来源', '分类', '创建时间'];
            const csvContent = [
              headers.join(','),
              ...cards.map(card => [
                `"${card.title || ''}"`,
                `"${card.content || ''}"`,
                `"${(card.tags || []).join(';')}"`,
                `"${card.source || ''}"`,
                `"${card.category || ''}"`,
                `"${card.createdAt || ''}"`
              ].join(','))
            ].join('\n');
            
            return '\ufeff' + csvContent; // 添加BOM确保中文正确显示
          } catch (error) {
            console.error('备用管理器导出CSV失败:', error);
            return '';
          }
        }
      };
      
      console.log('备用知识库管理器创建成功');
    } catch (error) {
      console.error('创建备用知识库管理器失败:', error);
      // 最后的备用方案：直接操作localStorage
      window.knowledgeBaseManagerInstance = null;
    }
  }

  /**
   * 获取当前平台的配置
   */
  getPlatformConfig() {
    const hostname = window.location.hostname;
    console.log('检测平台hostname:', hostname);
    
    for (const key in PLATFORM_CONFIGS) {
      if (hostname.includes(key)) {
        console.log('匹配到平台配置:', key);
        return PLATFORM_CONFIGS[key];
      }
    }
    
    console.warn('未找到匹配的平台配置');
    return null;
  }

  /**
   * 初始化插件
   */
  async init() {
    console.log('ActNav.init() 被调用');
    
    // 防止重复初始化监听器
    if (this.initialized) {
      console.log('ActNav 已初始化，跳过重复绑定');
      return;
    }
    this.initialized = true;
    
    // 初始化知识库管理器
    this.initKnowledgeBaseManager();
    
    // 确保每次加载都清理过期 pending
    this.prunePendingKeys();
    
    const newChatId = this.extractChatId();
    // 只有当对话ID发生变化时，才重新加载
    if (this.currentChatId !== newChatId) {
      console.log(`ActNav: 对话ID变化，从 ${this.currentChatId} 到 ${newChatId}，重新初始化。`);
      this.currentChatId = newChatId;
      // 移除旧的侧边栏
      if (this.sidebar) {
        this.sidebar.remove();
        this.sidebar = null;
      }
      // 启动新的实例
      await this.setup();
    } else {
      console.log(`ActNav: 对话ID未变，无需重新初始化。`);
    }
  }

  /**
   * 设置插件功能
   * 确保在初始化时清空问题列表并正确设置chatId
   */
  async setup() {
    console.log('初始化插件...');
    console.log(`当前URL: ${window.location.href}`);
    console.log(`当前hostname: ${window.location.hostname}`);
    
    // 确保每次加载都清理过期 pending
    this.prunePendingKeys();
    
    // 先清空问题列表，确保每次初始化时都是干净的状态
    this.questions = [];
    console.log('已清空问题列表，确保初始化时没有残留数据');
    
    // 重置防止重复处理的标记
    this.pendingQuestionText = null;
    this.pendingQuestionTimestamp = null;
    console.log('已重置重复处理标记');
    
    // 重置重复处理记录
    // if (this.recentlyProcessedQuestions) {
    //   this.recentlyProcessedQuestions.clear();
    //   console.log('已清空重复处理记录');
    // }
    
    // 提取当前对话ID
    this.extractChatId();
    console.log('初始化时提取的对话ID:', this.chatId);
    
    // 加载用户偏好设置
    await this.loadPreferences();
    console.log(`加载用户偏好设置完成，侧边栏可见性: ${this.isSidebarVisible}`);
    
    // 注入侧边栏
    this.injectSidebar();
    console.log('侧边栏已注入');
    
    // 设置布局监听器，确保页面跳转后样式正确应用
    this.setupLayoutObserver();
    console.log('布局监听器已设置');
    
    // 检查是否设置了数据清除标记，如果设置了则不恢复数据
    let shouldRestoreData = true;
    try {
      const clearResult = await chrome.storage.local.get(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
      if (clearResult['act-nav-data-cleared']) {
        const clearTime = clearResult['act-nav-clear-timestamp'];
        const now = Date.now();
        const timeDiff = now - clearTime;
        
        // 如果清除标记存在且时间在24小时内，则不恢复数据
        if (timeDiff < 24 * 60 * 60 * 1000) {
          console.log(`检测到数据清除标记，清除时间: ${new Date(clearTime).toLocaleString()}`);
          console.log(`距离清除时间: ${Math.floor(timeDiff / 60 / 1000)} 分钟，跳过数据恢复`);
          shouldRestoreData = false;
        } else {
          console.log('数据清除标记已过期（超过24小时），允许恢复数据');
          // 清除过期的标记
          await chrome.storage.local.remove(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
        }
      }
    } catch (clearCheckError) {
      console.log('检查清除标记时出错，继续正常恢复流程:', clearCheckError);
    }
    
    if (shouldRestoreData) {
      // 恢复已保存的对话目录
      const restoredCount = await this.restoreQuestions();
      console.log(`已恢复 ${restoredCount} 个问题到当前对话(${this.chatId})`);
      
      // 加载并显示已保存的知识卡片
      await this.loadAndRenderCards(this.chatId);
    } else {
      console.log('由于数据清除标记，跳过数据恢复');
      // 确保知识卡片容器显示空状态
      const cardsContainer = document.getElementById('act-nav-cards-container');
      if (cardsContainer) {
        cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
      }
    }
    
    // 开始监听DOM变化（在恢复问题之后）
    this.startObserving();
    console.log('DOM变化监听已启动');
    
    // 监听页面滚动以更新当前问题高亮
    this.setupScrollListener();
    console.log('滚动监听已设置');
    
    // 监听URL变化，以便在切换对话时更新chatId
    this.setupUrlChangeListener();
    console.log('URL变化监听已设置');
    
    // 定期检查URL变化，以防History API监听失效
    // 创建防抖版本的checkUrlChange方法，避免短时间内重复触发
    const debouncedCheckUrlChange = this.debounce(async () => {
      try {
        await this.checkUrlChange();
      } catch (error) {
        console.error('定期URL检查出错:', error);
      }
    }, 500);
    setInterval(debouncedCheckUrlChange, 1000);
    console.log('定期URL检查已设置（带防抖功能）');
    
    // 设置消息监听器
    this.setupMessageListener();
    console.log('消息监听器已设置');
    
    console.log(`插件初始化完成，当前URL: ${window.location.href}`);
    console.log(`当前对话ID: ${this.chatId}，问题数量: ${this.questions.length}`);
  }
  
  /**
   * 检查URL变化
   * 在URL变化时保存旧对话问题并加载新对话问题
   */
  /**
   * 定期检查URL变化
   * 作为History API监听的备份机制
   * 使用防抖函数避免短时间内重复触发
   */
  async checkUrlChange() {
    // 如果URL没有变化，直接返回，避免重复检查
    if (window.location.href === this.lastExtractedUrl && this.chatId) {
      return;
    }
    
    const oldChatId = this.chatId;
    const oldUrl = window.location.href;
    
    // 提取新的对话ID
    this.extractChatId();
    const newChatId = this.chatId;
    const newUrl = window.location.href;
    
    // 如果对话ID变化，保存旧对话问题并加载新对话问题
    if (oldChatId && oldChatId !== newChatId) {
      console.log(`定期检查：对话ID变化: ${oldChatId} -> ${newChatId}，保存旧对话问题并加载新对话问题`);
      console.log(`URL变化: ${oldUrl} -> ${newUrl}`);
      
      // 1. 断开 MutationObserver 监听，防止竞态
      if (this.observer) {
        try {
          this.observer.disconnect();
          console.log('已断开 MutationObserver，防止竞态');
        } catch (e) {
          console.warn('断开 MutationObserver 时出错:', e);
        }
      }

      // 保存旧对话的问题到会话存储（如果有）
      if (oldChatId && this.questions.length > 0) {
        const oldSessionKey = `act-nav-session-questions-${oldChatId}`;
        try {
          const questionsData = this.questions.map(q => ({
            id: q.id,
            text: q.text,
            fullText: q.fullText,
            timestamp: q.timestamp,
            chatId: oldChatId // 确保保存时设置正确的chatId
          }));
          
          sessionStorage.setItem(oldSessionKey, JSON.stringify(questionsData));
          console.log(`保存旧对话(${oldChatId})的 ${this.questions.length} 个问题到会话存储 ${oldSessionKey}`);
        } catch (error) {
          console.error(`尝试保存旧对话(${oldChatId})问题到会话存储时发生错误:`, error);
        }
      }
      
      // 清空当前问题列表
      this.questions = [];
      console.log(`已清空当前问题列表，准备加载新对话(${newChatId})的问题`);
      
                // 重置防止重复处理的标记
      this.pendingQuestionText = null;
      this.pendingQuestionTimestamp = null;
      console.log('URL变化时已重置重复处理标记');
    
      // 重置重复处理记录
      // if (this.recentlyProcessedQuestions) {
      //   this.recentlyProcessedQuestions.clear();
      //   console.log('URL变化时已清空重复处理记录');
      // }
      
      // 重置初始化标志位，允许新对话重新初始化
      this.initialized = false;
      console.log('URL变化时已重置初始化标志位');
      
      // 重置会话状态
      this.sessionState = 'idle';
      this.lastUserQuestion = null;
      this.lastUserQuestionTime = null;
      console.log('[状态管理] URL变化时已重置会话状态');
      
      // 清理所有已处理消息元素的 act-nav- 前缀 id、data-chatid 和 data-act-nav-processed，防止 observer 恢复后重复采集和 id 冲突
      document.querySelectorAll('[id^="act-nav-"]').forEach(el => {
        el.removeAttribute('id');
        el.removeAttribute('data-chatid');
      });
      // 清理所有 data-act-nav-processed 标记，允许新对话重新处理消息
      document.querySelectorAll('[data-act-nav-processed]').forEach(el => {
        el.removeAttribute('data-act-nav-processed');
        el.removeAttribute('data-act-nav-mid');
      });
      console.log('已清理所有 act-nav- 前缀的消息元素 id、data-chatid 和 data-act-nav-processed 标记');

      // 立即更新侧边栏显示
      this.updateSidebar();
      
      // 2. 恢复新对话问题，并在完成后恢复 observer 监听
      try {
        // 检查是否设置了数据清除标记
        let shouldRestoreData = true;
        try {
          const clearResult = await chrome.storage.local.get(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
          if (clearResult['act-nav-data-cleared']) {
            const clearTime = clearResult['act-nav-clear-timestamp'];
            const now = Date.now();
            const timeDiff = now - clearTime;
            
            // 如果清除标记存在且时间在24小时内，则不恢复数据
            if (timeDiff < 24 * 60 * 60 * 1000) {
              console.log(`检测到数据清除标记，清除时间: ${new Date(clearTime).toLocaleString()}`);
              console.log(`距离清除时间: ${Math.floor(timeDiff / 60 / 1000)} 分钟，跳过数据恢复`);
              shouldRestoreData = false;
            } else {
              console.log('数据清除标记已过期（超过24小时），允许恢复数据');
              // 清除过期的标记
              await chrome.storage.local.remove(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
            }
          }
        } catch (clearCheckError) {
          console.log('检查清除标记时出错，继续正常恢复流程:', clearCheckError);
        }
        
        if (shouldRestoreData) {
          this.restoreQuestions().then((count) => {
            console.log(`已从存储中恢复新对话(${newChatId})的问题，当前问题数量: ${count}`);
            // 恢复 observer 监听
            if (this.observer) {
              try {
                this.observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true
                });
                console.log('已恢复 MutationObserver 监听');
              } catch (e) {
                console.warn('恢复 MutationObserver 监听时出错:', e);
              }
            }
          }).catch(error => {
            console.error(`恢复新对话(${newChatId})问题失败:`, error);
            // 出错时也尝试恢复 observer 监听
            if (this.observer) {
              try {
                this.observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true
                });
                console.log('已恢复 MutationObserver 监听（异常分支）');
              } catch (e) {
                console.warn('恢复 MutationObserver 监听时出错（异常分支）:', e);
              }
            }
          });
        } else {
          console.log('由于数据清除标记，跳过新对话的数据恢复');
          // 确保知识卡片容器显示空状态
          const cardsContainer = document.getElementById('act-nav-cards-container');
          if (cardsContainer) {
            cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
          }
          
          // 恢复 observer 监听
          if (this.observer) {
            try {
              this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
              });
              console.log('已恢复 MutationObserver 监听');
            } catch (e) {
              console.warn('恢复 MutationObserver 监听时出错:', e);
            }
          }
        }
      } catch (error) {
        console.error(`尝试恢复新对话(${newChatId})问题时发生错误:`, error);
        // 出错时也尝试恢复 observer 监听
        if (this.observer) {
          try {
            this.observer.observe(document.body, {
              childList: true,
              subtree: true,
              characterData: true
            });
            console.log('已恢复 MutationObserver 监听（异常分支2）');
          } catch (e) {
            console.warn('恢复 MutationObserver 监听时出错（异常分支2）:', e);
          }
        }
      }
    } else if (oldUrl !== newUrl) {
      // URL变化但chatId未变，记录日志
      console.log(`定期检查：URL变化但chatId未变: ${oldUrl} -> ${newUrl}, chatId: ${this.chatId}`);
    }
  }
  
  /**
   * 从URL中提取对话ID
   * 加入hostname作为前缀，防止不同平台之间的冲突
   */
  // ... existing code ...

  // 防抖函数，避免短时间内重复执行
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  // 上次提取的URL，用于避免重复提取相同URL的chatId
  lastExtractedUrl = '';
  
  /**
   * 提取当前URL中的对话ID
   * 添加防抖和缓存机制，避免重复提取相同URL的chatId
   */
  extractChatId() {
    if (!this.config) {
      console.error('无法提取对话ID：平台配置未找到');
      return null;
    }
    
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    // 如果URL没有变化，直接返回当前chatId，避免重复提取
    if (url === this.lastExtractedUrl && this.chatId) {
      console.log(`URL未变化，跳过chatId提取，当前chatId: ${this.chatId}`);
      return this.chatId;
    }
    
    // 更新最后提取的URL
    this.lastExtractedUrl = url;
    
    console.log(`提取对话ID，当前URL: ${url}, hostname: ${hostname}`);
    
    // 使用平台配置中的正则表达式匹配
    let chatIdPart = null;
    const match = url.match(this.config.chatIdRegex);
    
    if (match && match[2]) {
      chatIdPart = match[2];
    }
    
    // 如果找到了匹配的ID，使用 hostname-id 格式
    if (chatIdPart) {
      const newChatId = `${hostname}-${chatIdPart}`;
      
      // 如果chatId变化，记录日志
      if (this.chatId !== newChatId) {
        console.log(`对话ID变化: ${this.chatId || '无'} -> ${newChatId}`);
        this.chatId = newChatId;
      }
      
      console.log('成功提取对话ID:', this.chatId);
    } else {
      // 如果所有格式都不匹配，使用 hostname-hash 格式
      const newChatId = `${hostname}-${this.simpleHash(url)}` || `${hostname}-default`;
      
      // 如果chatId变化，记录日志
      if (this.chatId !== newChatId) {
        console.log(`对话ID变化: ${this.chatId || '无'} -> ${newChatId}`);
        this.chatId = newChatId;
      }
      
      console.log('未找到标准对话ID格式，使用URL哈希作为ID:', this.chatId);
    }
    
    return this.chatId;
  }
  
  /**
   * 设置URL变化监听
   * 确保在URL变化时正确处理对话ID变化
   * 使用防抖函数避免短时间内重复触发
   */
  setupUrlChangeListener() {
    // 使用History API监听URL变化
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
    };
    
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
    });
    
    // 创建防抖版本的URL变化处理函数
    const debouncedHandleLocationChange = this.debounce(async () => {
      const oldChatId = this.chatId;
      const oldUrl = window.location.href;
      
      // 提取新的对话ID
      this.extractChatId();
      const newChatId = this.chatId;
      const newUrl = window.location.href;
      
      console.log(`检测到URL变化: ${oldUrl} -> ${newUrl}`);
      console.log(`对话ID: ${oldChatId} -> ${newChatId}`);
      
      // 如果对话ID变化，保存旧对话问题并加载新对话问题
      if (oldChatId && oldChatId !== newChatId) {
        console.log(`对话ID变化: ${oldChatId} -> ${newChatId}，保存旧对话问题并加载新对话问题`);
        
        // 1. 断开 MutationObserver 监听，防止竞态
        if (this.observer) {
          try {
            this.observer.disconnect();
            console.log('已断开 MutationObserver，防止竞态');
          } catch (e) {
            console.warn('断开 MutationObserver 时出错:', e);
          }
        }

        // 保存旧对话的问题到会话存储（如果有）
        if (oldChatId && this.questions.length > 0) {
          const oldSessionKey = `act-nav-session-questions-${oldChatId}`;
          try {
            const questionsData = this.questions.map(q => ({
              id: q.id,
              text: q.text,
              fullText: q.fullText,
              timestamp: q.timestamp,
              chatId: oldChatId // 确保保存时设置正确的chatId
            }));
            
            sessionStorage.setItem(oldSessionKey, JSON.stringify(questionsData));
            console.log(`保存旧对话(${oldChatId})的 ${this.questions.length} 个问题到会话存储 ${oldSessionKey}`);
          } catch (error) {
            console.error(`尝试保存旧对话(${oldChatId})问题到会话存储时发生错误:`, error);
          }
        }

        // 清空当前问题列表
        this.questions = [];
        console.log(`已清空当前问题列表，准备加载新对话(${newChatId})的问题`);
        
        // 重置防止重复处理的标记
        this.pendingQuestionText = null;
        this.pendingQuestionTimestamp = null;
        console.log('URL变化监听时已重置重复处理标记');

        // 重置初始化标志位，允许新对话重新初始化
        this.initialized = false;
        console.log('URL变化监听时已重置初始化标志位');

        // 清理所有已处理消息元素的 act-nav- 前缀 id 和 data-chatid，防止 observer 恢复后重复采集和 id 冲突
        document.querySelectorAll('[id^="act-nav-"]').forEach(el => {
          el.removeAttribute('id');
          el.removeAttribute('data-chatid');
        });
        console.log('已清理所有 act-nav- 前缀的消息元素 id 和 data-chatid');

        // 重新注入侧边栏，确保在对话切换时正确显示
        this.injectSidebar();
        // 立即更新侧边栏显示
        this.updateSidebar();

        // 2. 恢复新对话问题，并在完成后恢复 observer 监听
        try {
          // 检查是否设置了数据清除标记
          let shouldRestoreData = true;
          try {
            const clearResult = await chrome.storage.local.get(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
            if (clearResult['act-nav-data-cleared']) {
              const clearTime = clearResult['act-nav-clear-timestamp'];
              const now = Date.now();
              const timeDiff = now - clearTime;
              
              // 如果清除标记存在且时间在24小时内，则不恢复数据
              if (timeDiff < 24 * 60 * 60 * 1000) {
                console.log(`检测到数据清除标记，清除时间: ${new Date(clearTime).toLocaleString()}`);
                console.log(`距离清除时间: ${Math.floor(timeDiff / 60 / 1000)} 分钟，跳过数据恢复`);
                shouldRestoreData = false;
              } else {
                console.log('数据清除标记已过期（超过24小时），允许恢复数据');
                // 清除过期的标记
                await chrome.storage.local.remove(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
              }
            }
          } catch (clearCheckError) {
            console.log('检查清除标记时出错，继续正常恢复流程:', clearCheckError);
          }
          
          if (shouldRestoreData) {
            this.restoreQuestions().then(async (count) => {
              console.log(`已从存储中恢复新对话(${newChatId})的问题，当前问题数量: ${count}`);
              
              // 加载并显示新对话的知识卡片
              await this.loadAndRenderCards(newChatId);
              
              // 恢复 observer 监听
              if (this.observer) {
                try {
                  this.observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                  });
                  console.log('已恢复 MutationObserver 监听');
                } catch (e) {
                  console.warn('恢复 MutationObserver 监听时出错:', e);
                }
              }
            }).catch(error => {
              console.error(`恢复新对话(${newChatId})问题失败:`, error);
              // 出错时也尝试恢复 observer 监听
              if (this.observer) {
                try {
                  this.observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                  });
                  console.log('已恢复 MutationObserver 监听（异常分支）');
                } catch (e) {
                  console.warn('恢复 MutationObserver 监听时出错（异常分支）:', e);
                }
              }
            });
          } else {
            console.log('由于数据清除标记，跳过新对话的数据恢复');
            // 确保知识卡片容器显示空状态
            const cardsContainer = document.getElementById('act-nav-cards-container');
            if (cardsContainer) {
              cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
            }
            
            // 恢复 observer 监听
            if (this.observer) {
              try {
                this.observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true
                });
                console.log('已恢复 MutationObserver 监听');
              } catch (e) {
                console.warn('恢复 MutationObserver 监听时出错:', e);
              }
            }
          }
        } catch (error) {
          console.error(`尝试恢复新对话(${newChatId})问题时发生错误:`, error);
          // 出错时也尝试恢复 observer 监听
          if (this.observer) {
            try {
              this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
              });
              console.log('已恢复 MutationObserver 监听（异常分支2）');
            } catch (e) {
              console.warn('恢复 MutationObserver 监听时出错（异常分支2）:', e);
            }
          }
        }
      } else if (oldUrl !== newUrl) {
        // URL变化但chatId未变，记录日志
        console.log(`URL变化但chatId未变: ${oldUrl} -> ${newUrl}, chatId: ${this.chatId}`);
      }
    }, 300); // 300毫秒的防抖延迟
    
    // 使用防抖函数处理locationchange事件
    window.addEventListener('locationchange', debouncedHandleLocationChange);
  }

  /**
   * 注入侧边栏到页面
   * 确保侧边栏被注入到 document.body 的最顶层，避免受到中间层级父元素的干扰
   */
  injectSidebar() {
    // 彻底清理所有可能存在的侧边栏DOM元素
    document.querySelectorAll('#act-nav-sidebar, .act-nav-sidebar, [id*="act-nav-sidebar"], [class*="act-nav-sidebar"], #act-nav-show-btn').forEach(el => {
      el.remove();
    });
    
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
    <div class="act-nav-summary-section">
      <button id="act-nav-summarize-btn" class="summary-button">提取知识卡片</button>
      <div id="act-nav-cards-container" class="cards-container"></div>
    </div>
    <div class="act-nav-questions"></div>
  </div>
`;

    
    // 强制设置关键样式，确保固定定位不被覆盖
    sidebar.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 240px !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
    `;
    
    // 添加到页面body的最顶层，确保使用固定定位
    document.body.appendChild(sidebar);
    
    // 创建显示按钮（当侧边栏隐藏时显示）
    this.createShowButton();
    
    // 保存侧边栏DOM引用
    this.sidebar = sidebar;
    
    // 绑定事件
    this.bindSidebarEvents();
    
    console.log('侧边栏已重新注入到 document.body，并强制应用固定定位样式');
  }

  /**
   * 创建显示按钮
   */
  createShowButton() {
    const showBtn = document.createElement('button');
    showBtn.id = 'act-nav-show-btn';
    showBtn.title = '显示对话目录';
    showBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18m-9-9l9 9-9 9"/>
      </svg>
    `;
    
    // 设置显示按钮样式
    showBtn.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      right: 10px !important;
      transform: translateY(-50%) !important;
      width: 40px !important;
      height: 40px !important;
      background: rgba(59, 130, 246, 0.9) !important;
      border: none !important;
      border-radius: 50% !important;
      color: white !important;
      cursor: pointer !important;
      z-index: 2147483646 !important;
      display: ${this.isSidebarVisible ? 'none' : 'flex'} !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
      transition: all 0.3s ease !important;
    `;
    
    // 添加悬停效果
    showBtn.addEventListener('mouseenter', () => {
      showBtn.style.background = 'rgba(59, 130, 246, 1) !important';
      showBtn.style.transform = 'translateY(-50%) scale(1.1) !important';
    });
    
    showBtn.addEventListener('mouseleave', () => {
      showBtn.style.background = 'rgba(59, 130, 246, 0.9) !important';
      showBtn.style.transform = 'translateY(-50%) scale(1) !important';
    });
    
    // 点击显示侧边栏
    showBtn.addEventListener('click', () => {
      this.showSidebar();
      this.updateShowButtonVisibility();
    });
    
    document.body.appendChild(showBtn);
  }

  /**
   * 更新显示按钮的可见性
   */
  updateShowButtonVisibility() {
    const showBtn = document.getElementById('act-nav-show-btn');
    if (showBtn) {
      showBtn.style.display = this.isSidebarVisible ? 'none' : 'flex';
    }
  }

  /**
   * 绑定侧边栏事件
   */
  bindSidebarEvents() {
    const sidebar = document.getElementById('act-nav-sidebar');
    const toggleBtn = sidebar.querySelector('.act-nav-toggle');
    
    // 更新切换按钮图标
    this.updateToggleIcon(toggleBtn);
    
    // 切换侧边栏显示/隐藏
    toggleBtn.addEventListener('click', () => {
      this.isSidebarVisible = !this.isSidebarVisible;
      sidebar.classList.toggle('collapsed', !this.isSidebarVisible);
      sidebar.classList.toggle('visible', this.isSidebarVisible);
      this.updateToggleIcon(toggleBtn);
      this.updateShowButtonVisibility();
      this.savePreferences();
    });
    
    // 绑定AI总结功能事件
    this.bindSummaryFeatureEvents();


  }

  /**
   * 更新切换按钮图标
   */
  updateToggleIcon(toggleBtn) {
    const svg = toggleBtn.querySelector('svg');
    if (this.isSidebarVisible) {
      // 显示状态：显示收起图标（向左箭头）
      svg.innerHTML = '<path d="M15 18l-6-6 6-6"/>';
      toggleBtn.title = '收起侧边栏';
    } else {
      // 隐藏状态：显示展开图标（向右箭头）
      svg.innerHTML = '<path d="M9 18l6-6-6-6"/>';
      toggleBtn.title = '展开侧边栏';
    }
  }

  /**
   * 开始监听DOM变化
   */
  startObserving() {
    // 使用MutationObserver监听页面变化
    this.observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      let removedUserMessages = 0;
      let addedUserMessages = 0;
      let removedNodes = [];
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          let mutationHasChanges = false;
          
          // 检查是否添加了相关的DOM元素
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查是否是用户问题元素
              if (node.matches && node.matches(this.config.userMessageSelector)) {
                // 状态管理：如果正在等待AI回答，完全跳过用户问题处理
                if (this.sessionState === 'waiting_for_ai_response') {
                  console.log(`[Observer] 正在等待AI回答，完全跳过用户问题处理: ${this.sessionState}`);
                  // 标记为已处理，防止后续重复处理
                  if (node.setAttribute) {
                    node.setAttribute('data-act-nav-processed', '1');
                  }
                  continue;
                }
                
                // 只处理未标记的消息元素
                if (!node.id || !node.id.startsWith('act-nav-')) {
                  // 额外检查：是否已经被处理过
                  if (!node.hasAttribute('data-act-nav-processed')) {
                    this.processUserMessage(node);
                    hasRelevantChanges = true;
                    mutationHasChanges = true;
                    addedUserMessages++;
                  } else {
                    console.log('Observer: 跳过已处理的消息元素');
                  }
                }
              }
              // 检查是否包含用户问题元素
              const userMessages = node.querySelectorAll(this.config.userMessageSelector);
              if (userMessages.length > 0) {
                userMessages.forEach(message => {
                  // 状态管理：如果正在等待AI回答，完全跳过用户问题处理
                  if (this.sessionState === 'waiting_for_ai_response') {
                    console.log(`[Observer] 正在等待AI回答，完全跳过用户问题处理: ${this.sessionState}`);
                    // 标记为已处理，防止后续重复处理
                    if (message.setAttribute) {
                      message.setAttribute('data-act-nav-processed', '1');
                    }
                    return;
                  }
                  
                  // 只处理未标记的消息元素
                  if (!message.id || !message.id.startsWith('act-nav-')) {
                    // 额外检查：是否已经被处理过
                    if (!message.hasAttribute('data-act-nav-processed')) {
                      this.processUserMessage(message);
                      hasRelevantChanges = true;
                      mutationHasChanges = true;
                      addedUserMessages++;
                    } else {
                      console.log('Observer: 跳过已处理的消息元素');
                    }
                  }
                });
              }
            }
          }
          // 检查被移除的节点
          for (let i = 0; i < mutation.removedNodes.length; i++) {
            const node = mutation.removedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches && node.matches(this.config.userMessageSelector)) {
                removedUserMessages++;
                removedNodes.push(node);
              }
              const userMessages = node.querySelectorAll(this.config.userMessageSelector);
              if (userMessages.length > 0) {
                removedUserMessages += userMessages.length;
                removedNodes.push(...userMessages);
              }
            }
          }
          
          // 处理当前mutation的DOM变化
          if (mutationHasChanges) {
            this.handleDOMChanges(mutation);
          }
        }
      });

      // 新对话检测逻辑：如果一次性移除了大量用户消息节点，且当前 questions 不为空，判定为新对话
      if (removedUserMessages >= 2 && this.questions.length > 0 && addedUserMessages === 0) {
        console.log('[ActNav] 检测到大量用户消息节点被移除，判定为新对话，强制触发 handleChatSwitch');
        // 触发一次伪URL变化，强制执行切换流程
        if (this.handleChatSwitch) {
          this.handleChatSwitch().catch(error => {
            console.error('handleChatSwitch 执行出错:', error);
          });
        }
        return;
      }
      
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
    if (!this.config) {
      console.error('无法扫描消息：平台配置未找到');
      return;
    }
    
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    const userMessages = document.querySelectorAll(this.config.userMessageSelector);
    if (userMessages.length > 0) {
      userMessages.forEach(message => {
        // 状态管理：如果正在等待AI回答，跳过用户问题处理
        if (this.sessionState === 'waiting_for_ai_response') {
          console.log(`[scanExistingMessages] 正在等待AI回答，跳过用户问题处理: ${this.sessionState}`);
          // 标记为已处理，防止后续重复处理
          if (message.setAttribute) {
            message.setAttribute('data-act-nav-processed', '1');
          }
          return;
        }
        
        // 只处理未标记的消息元素
        if (!message.id || !message.id.startsWith('act-nav-')) {
          // 额外检查：是否已经被处理过
          if (!message.hasAttribute('data-act-nav-processed')) {
            this.processUserMessage(message);
          } else {
            console.log('scanExistingMessages: 跳过已处理的消息元素');
          }
        }
      });
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
    if (!this.config) {
      return;
    }
    
    // 查找用户消息容器 - 使用平台配置中的选择器
    const userMessages = element.querySelectorAll(this.config.userMessageSelector);
    userMessages.forEach(message => {
      // 状态管理：如果正在等待AI回答，跳过用户问题处理
      if (this.sessionState === 'waiting_for_ai_response') {
        console.log(`[checkForNewMessages] 正在等待AI回答，跳过用户问题处理: ${this.sessionState}`);
        // 标记为已处理，防止后续重复处理
        if (message.setAttribute) {
          message.setAttribute('data-act-nav-processed', '1');
        }
        return;
      }
      
      // 只处理未标记的消息元素
      if (!message.id || !message.id.startsWith('act-nav-')) {
        // 额外检查：是否已经被处理过
        if (!message.hasAttribute('data-act-nav-processed')) {
          this.processUserMessage(message);
        } else {
          console.log('checkForNewMessages: 跳过已处理的消息元素');
        }
      }
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
    if (!this.config) {
      return null;
    }
    
    // 使用平台配置中的输入框选择器
    for (const selector of this.config.inputSelectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  /**
   * 查找提交按钮
   */
  findSubmitButton() {
    if (!this.config) {
      return null;
    }
    
    // 使用平台配置中的提交按钮选择器
    for (const selector of this.config.submitSelectors) {
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
      // 记录所有问题，即使内容相同也记录
      console.log(`准备添加新问题: ${questionText}`);
      
      // 先设置"短时去重"标记（跨 reload 生效）
      const key = this.setPending(questionText);
      
      // 设置会话状态：等待AI回答
      this.sessionState = 'waiting_for_ai_response';
      this.lastUserQuestion = questionText;
      this.lastUserQuestionTime = Date.now();
      console.log(`[状态管理] 用户提交问题，状态设置为: ${this.sessionState}`);
      
      // 设置超时，防止状态卡住（30秒后自动重置）
      setTimeout(() => {
        if (this.sessionState === 'waiting_for_ai_response') {
          this.sessionState = 'idle';
          console.log(`[状态管理] 超时自动重置状态为: ${this.sessionState}`);
        }
      }, 30000);
      
      // 立即添加到目录，不等待DOM更新
      this.addQuestion(questionText);
      console.log(`handleQuestionSubmit: 立即添加问题到目录: ${questionText.substring(0, 50)}...`);
      
      // 添加延迟，等待DOM更新后标记元素
      setTimeout(() => {
        if (!this.config) {
          return;
        }
        
        // 尝试查找最新添加的用户消息元素
        const userMessages = document.querySelectorAll(this.config.userMessageSelector);
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        if (lastUserMessage && lastUserMessage.textContent.trim() === questionText.trim()) {
          // 给对应消息元素加 data-act-nav-processed 属性，标记已处理
          lastUserMessage.setAttribute('data-act-nav-processed', '1');
          if (key) lastUserMessage.setAttribute('data-act-nav-mid', key);
          console.log(`handleQuestionSubmit: 已标记消息元素为已处理，问题: ${questionText.substring(0, 50)}...`);
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
    // 已处理的 DOM，直接跳过 - 检查任何 data-act-nav-processed 属性值
    if (messageElement && messageElement.hasAttribute('data-act-nav-processed')) {
      console.log('processUserMessage: 检测到已处理的消息元素，跳过处理');
      return;
    }
    
    // 检查元素是否已经处理过（通过检查是否已有ID）
    if (messageElement.id && messageElement.id.startsWith('act-nav-')) {
      // 如果不是当前 chatId，移除 id 和 data-chatid
      if (messageElement.getAttribute('data-chatid') !== this.chatId) {
        messageElement.removeAttribute('id');
        messageElement.removeAttribute('data-chatId');
      } else {
        // 已经处理过且 chatId 匹配，不需要重复处理
        console.log('processUserMessage: 元素已处理且chatId匹配，跳过处理');
        return;
      }
    }
    
    // 状态管理：如果正在等待AI回答，跳过所有用户问题处理
    if (this.sessionState === 'waiting_for_ai_response') {
      console.log(`[状态管理] 正在等待AI回答，跳过用户问题处理: ${this.sessionState}`);
      // 标记为已处理，防止后续重复处理
      if (messageElement && messageElement.setAttribute) {
        messageElement.setAttribute('data-act-nav-processed', '1');
      }
      return;
    }
    
    // 检查是否是AI回答，如果是则跳过处理
    if (this.isAIResponse(messageElement)) {
      console.log('processUserMessage: 检测到AI回答，跳过处理');
      
      // 状态管理：检测到AI回答，重置会话状态
      if (this.sessionState === 'waiting_for_ai_response') {
        this.sessionState = 'idle';
        console.log(`[状态管理] 检测到AI回答，状态重置为: ${this.sessionState}`);
      }
      
      return;
    }
    
    // 额外检查：如果消息元素包含用户消息的特征，则认为是用户消息
    if (this.isUserMessage(messageElement)) {
      console.log('processUserMessage: 确认是用户消息，继续处理');
    } else {
      console.log('processUserMessage: 无法确定消息类型，跳过处理');
      return;
    }
    
    // 提取消息文本
    const messageText = this.extractMessageText(messageElement);
    if (!messageText || !messageText.trim()) {
      console.log('processUserMessage: 消息文本为空，跳过处理');
      return;
    }
    
    // ⬇️ 关键：若命中"同一次提交"的 pending，跳过 Observer 的重复添加
    if (this.isPendingAndConsume(messageText)) {
      if (messageElement && messageElement.setAttribute) {
        messageElement.setAttribute('data-act-nav-processed', '1');
      }
      console.log(`processUserMessage: 命中pending标记，跳过重复添加: ${messageText.substring(0, 50)}...`);
      return;
    }
    
    // 删除基于文本内容的去重逻辑，允许相同文本的问题多次记录
    // 只基于元素的唯一性（ID 或 data-chatid）进行去重
    
    // 这里是首屏回放或非 submit 场景：允许添加（因为没有命中 pending）
    console.log(`processUserMessage: 准备处理用户消息: ${messageText.substring(0, 50)}...`);
    
    // 添加新问题
    this.addQuestion(messageText, messageElement);
    if (messageElement && messageElement.setAttribute) {
      messageElement.setAttribute('data-act-nav-processed', '1');
      console.log(`processUserMessage: 已标记消息元素为已处理，问题: ${messageText.substring(0, 50)}...`);
    }
  }

  /**
   * 检查是否是AI回答
   */
  isAIResponse(messageElement) {
    if (!this.config) {
      return false;
    }
    
    const hostname = window.location.hostname;
    
    // 根据不同平台检测AI回答
    if (hostname.includes('deepseek.com')) {
      // 对于deepseek，检查是否包含AI回答的特征
      // AI回答通常包含 .ds-markdown-paragraph 类
      if (messageElement.querySelector('.ds-markdown-paragraph')) {
        return true;
      }
      
      // 检查是否包含AI回答的其他特征
      if (messageElement.querySelector('.markdown')) {
        return true;
      }
      
      // 检查是否包含代码块等AI回答特征
      if (messageElement.querySelector('pre, code')) {
        return true;
      }
      
      // 检查是否包含AI回答的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'assistant') {
        return true;
      }
      
      // 检查是否包含AI回答的特定类名
      if (messageElement.classList.contains('assistant') || messageElement.classList.contains('ai-response')) {
        return true;
      }
      
      // 检查是否包含AI回答的特定结构（非用户消息的特征）
      if (messageElement.querySelector('.ds-markdown-paragraph, .markdown, pre, code')) {
        return true;
      }
    } else if (hostname.includes('kimi.com')) {
      // 对于Kimi，检查是否包含AI回答的特征
      // AI回答通常包含 .markdown-body 类
      if (messageElement.querySelector('.markdown-body')) {
        return true;
      }
      
      // 检查是否包含代码块等AI回答特征
      if (messageElement.querySelector('pre, code')) {
        return true;
      }
      
      // 检查是否包含AI回答的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'assistant') {
        return true;
      }
    } else if (hostname.includes('openai.com')) {
      // 对于ChatGPT，检查是否包含AI回答的特征
      // AI回答通常包含特定的类名或属性
      if (messageElement.querySelector('.markdown')) {
        return true;
      }
      
      // 检查是否包含代码块等AI回答特征
      if (messageElement.querySelector('pre, code')) {
        return true;
      }
      
      // 检查是否包含AI回答的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'assistant') {
        return true;
      }
    } else if (hostname.includes('doubao.com')) {
      // 对于豆包，检查是否包含AI回答的特征
      // AI回答通常包含特定的类名或属性
      if (messageElement.querySelector('.markdown, .markdown-body')) {
        return true;
      }
      
      // 检查是否包含代码块等AI回答特征
      if (messageElement.querySelector('pre, code')) {
        return true;
      }
      
      // 检查是否包含AI回答的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'assistant') {
        return true;
      }
    }
    
    // 通用检测：如果包含代码块、markdown等特征，认为是AI回答
    if (messageElement.querySelector('pre, code, .markdown, .markdown-body')) {
      return true;
    }
    
    // 检查是否包含AI回答的通用特征
    if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'assistant') {
      return true;
    }
    
    // 检查是否包含AI回答的通用类名
    if (messageElement.classList.contains('assistant') || messageElement.classList.contains('ai-response') || 
        messageElement.classList.contains('bot') || messageElement.classList.contains('gpt')) {
      return true;
    }
    
    return false;
  }

  /**
   * 检查是否是用户消息
   */
  isUserMessage(messageElement) {
    if (!this.config) {
      return false;
    }
    
    const hostname = window.location.hostname;
    
    // 根据不同平台检测用户消息
    if (hostname.includes('deepseek.com')) {
      // 对于deepseek，检查是否包含用户消息的特征
      // 用户消息通常包含 .fbb737a4 类
      if (messageElement.classList.contains('fbb737a4')) {
        return true;
      }
      
      // 检查是否包含用户消息的其他特征
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'user') {
        return true;
      }
      
      // 检查是否包含用户消息的特定类名
      if (messageElement.classList.contains('user') || messageElement.classList.contains('user-message')) {
        return true;
      }
      
      // 检查是否包含用户消息的特定结构
      if (messageElement.querySelector('.user-content, .user-message')) {
        return true;
      }
    } else if (hostname.includes('kimi.com')) {
      // 对于Kimi，检查是否包含用户消息的特征
      if (messageElement.classList.contains('user-content')) {
        return true;
      }
      
      if (messageElement.classList.contains('chat-item-content')) {
        return true;
      }
      
      // 检查是否包含用户消息的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'user') {
        return true;
      }
    } else if (hostname.includes('openai.com')) {
      // 对于ChatGPT，检查是否包含用户消息的特征
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'user') {
        return true;
      }
      
      // 检查是否包含用户消息的特定类名
      if (messageElement.classList.contains('user') || messageElement.classList.contains('user-message')) {
        return true;
      }
    } else if (hostname.includes('doubao.com')) {
      // 对于豆包，检查是否包含用户消息的特征
      if (messageElement.hasAttribute('data-testid') && messageElement.getAttribute('data-testid') === 'message_text_content') {
        return true;
      }
      
      // 检查是否包含用户消息的特定属性或类名
      if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'user') {
        return true;
      }
      
      // 豆包平台的额外检查：检查是否包含用户消息的特定类名
      if (messageElement.classList.contains('user') || messageElement.classList.contains('user-message') || 
          messageElement.classList.contains('user-content') || messageElement.classList.contains('container-ZzKwSY')) {
        return true;
      }
      
      // 豆包平台的额外检查：检查是否包含用户消息的特定结构
      if (messageElement.querySelector('.user-content, .user-message, .user, .container-ZzKwSY')) {
        return true;
      }
    }
    
    // 通用检测：检查是否包含用户消息的通用特征
    if (messageElement.hasAttribute('data-role') && messageElement.getAttribute('data-role') === 'user') {
      return true;
    }
    
    // 检查是否包含用户消息的通用类名
    if (messageElement.classList.contains('user') || messageElement.classList.contains('user-message') || 
        messageElement.classList.contains('user-content')) {
      return true;
    }
    
    // 检查是否包含用户消息的通用结构
    if (messageElement.querySelector('.user-content, .user-message, .user')) {
      return true;
    }
    
    return false;
  }

  /**
   * 提取消息文本
   */
  extractMessageText(messageElement) {
    if (!this.config) {
      return messageElement.textContent || messageElement.innerText;
    }
    
    const hostname = window.location.hostname;
    
    // 根据不同平台处理消息文本提取
    if (hostname.includes('deepseek.com')) {
      // 对于deepseek的用户消息，直接获取div.fbb737a4的文本内容
      if (messageElement.classList.contains('fbb737a4')) {
        return messageElement.textContent || messageElement.innerText;
      }
      
      // 对于AI回答，查找ds-markdown-paragraph类
      const aiResponse = messageElement.querySelector('.ds-markdown-paragraph');
      if (aiResponse) {
        return aiResponse.textContent || aiResponse.innerText;
      }
    } else if (hostname.includes('kimi.com')) {
      // 对于Kimi的用户消息，使用精确的文本提取逻辑
      // 优先使用 .markdown-body p 精确定位到包含文本的 <p> 标签
      const markdownBodyP = messageElement.querySelector('.markdown-body p');
      if (markdownBodyP) {
        const text = (markdownBodyP.textContent || markdownBodyP.innerText).trim();
        if (text) {
          return text;
        }
      }
      
      // 如果找不到 .markdown-body p，回退到 .markdown-body
      const markdownBody = messageElement.querySelector('.markdown-body');
      if (markdownBody) {
        const text = (markdownBody.textContent || markdownBody.innerText).trim();
        if (text) {
          return text;
        }
      }
      
      // 对于Kimi的用户消息，直接处理user-content类
      if (messageElement.classList.contains('user-content')) {
        const text = (messageElement.textContent || messageElement.innerText).trim();
        if (text) {
          return text;
        }
      }
      
      // 对于Kimi的用户消息，直接获取chat-item-content的文本内容
      if (messageElement.classList.contains('chat-item-content')) {
        const text = (messageElement.textContent || messageElement.innerText).trim();
        if (text) {
          return text;
        }
      }
      
      // 兼容其他可能的结构
      const userContentElement = messageElement.querySelector('.user-content');
      if (userContentElement) {
        const text = (userContentElement.textContent || userContentElement.innerText).trim();
        if (text) {
          return text;
        }
      }
    } else if (hostname.includes('openai.com')) {
      // 对于ChatGPT的用户消息，查找消息内容
      const messageContent = messageElement.querySelector('[data-message-content]');
      if (messageContent) {
        return messageContent.textContent || messageContent.innerText;
      }
    } else if (hostname.includes('doubao.com')) {
      // 对于豆包的用户消息，直接获取data-testid="message_text_content"的文本内容
      if (messageElement.hasAttribute('data-testid') && messageElement.getAttribute('data-testid') === 'message_text_content') {
        const text = (messageElement.textContent || messageElement.innerText).trim();
        if (text) {
          return text;
        }
      }
    }
    
    // 查找其他可能的消息内容容器
    const contentSelectors = [
      '.markdown-body p',
      '.markdown-body',
      '.markdown-content',
      '.message-content',
      '[data-message-content]',
      '.prose',
      'p'
    ];
    
    for (const selector of contentSelectors) {
      const content = messageElement.querySelector(selector);
      if (content) {
        const text = (content.textContent || content.innerText).trim();
        if (text) {
          return text;
        }
      }
    }
    
    // 如果没有找到特定容器，使用整个消息的文本
    const fallbackText = (messageElement.textContent || messageElement.innerText).trim();
    return fallbackText;
  }

  /**
   * 添加问题到目录
   */
  addQuestion(text, element = null) {
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    // 记录所有问题，即使内容相同也记录
    console.log(`添加新问题到目录: ${text.substring(0, 50)}...`);
    
    const question = {
      id: this.generateQuestionId(),
      text: this.truncateText(text, 50),
      fullText: text.trim(),
      timestamp: Date.now(),
      element: element,
      chatId: this.chatId // 记录问题所属的对话ID
    };
    
    this.questions.push(question);
    this.updateSidebar();
    
    // 使用会话存储而不是持久化存储，确保页面关闭后数据清空
    this.saveQuestionsToSession();
    
    // 为消息元素添加锚点和 chatId 标记
    if (element) {
      element.id = question.id;
      element.setAttribute('data-chatid', this.chatId);
    }
    
    console.log(`问题已添加到目录(chatId: ${this.chatId}):`, question);
  }

  /**
   * 生成问题ID
   */
  generateQuestionId() {
  const timestamp = Date.now();
  // 在哈希内容中加入一个随机数，确保即使在同一毫秒内也能生成不同的ID
  const randomPart = Math.random().toString(36).substr(2, 9); 
  const hash = this.simpleHash(`${timestamp}-${randomPart}`);
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
    
    // 只显示当前对话的问题，并按时间排序（早的在上面，新的在下面）
    const currentChatQuestions = this.questions
      .filter(question => question.chatId === this.chatId)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    questionsContainer.innerHTML = currentChatQuestions
      .map(question => `
        <div class="act-nav-question" data-id="${question.id}" title="${this.escapeHtml(question.fullText)}">
          <div class="act-nav-question-text">${this.escapeHtml(question.text)}</div>
          <button class="act-nav-delete-btn" data-id="${question.id}" title="删除此条目">×</button>
        </div>
      `).join('');
    
    // 绑定点击事件
    this.bindQuestionEvents();
  }

  /**
   * 绑定问题点击事件
   */
  bindQuestionEvents() {
    const questionsContainer = document.querySelector('.act-nav-questions');
    if (!questionsContainer) return;
    // 事件委托
    questionsContainer.addEventListener('click', (event) => {
      const target = event.target;
      // 检查是否点击了删除按钮
      if (target.classList.contains('act-nav-delete-btn')) {
        event.stopPropagation();
        const questionId = target.getAttribute('data-id');
        this.deleteQuestion(questionId);
        return;
      }
      // 检查是否点击了问题条目本身（用于跳转）
      const questionElement = target.closest('.act-nav-question');
      if (questionElement) {
        const questionId = questionElement.getAttribute('data-id');
        this.scrollToQuestion(questionId);
      }
    });
  }

  /**
   * 滚动到指定问题
   * 确保只跳转当前页面中存在的元素
   */
  scrollToQuestion(questionId) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // 容错机制：尝试多次查找目标元素
    const attemptScroll = (attempt = 0) => {
      const maxAttempts = 5;
      const delay = attempt * 100; // 递增延迟：0ms, 100ms, 200ms, 300ms, 400ms
      
      // 只跳转到 chatId 匹配的唯一元素
      const elements = document.querySelectorAll(`#${questionId}`);
      let target = null;
      
      if (elements.length === 1) {
        target = elements[0];
      } else if (elements.length > 1) {
        target = Array.from(elements).find(el => el.getAttribute('data-chatid') === this.chatId) || elements[0];
      }
      
      if (target) {
        // 检查目标元素是否真正可见和可访问
        const rect = target.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const isInDocument = document.contains(target);
        
        if (isVisible && isInDocument) {
          // 使用 requestAnimationFrame 确保在下一个渲染帧执行滚动
          requestAnimationFrame(() => {
            try {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              this.highlightElement(target);
              console.log(`成功滚动到问题: ${question.text}`);
            } catch (error) {
              console.warn(`滚动时发生错误: ${error.message}`);
              // 降级处理：使用简单滚动
              target.scrollIntoView({ block: 'center' });
              this.highlightElement(target);
            }
          });
          return;
        }
      }
      
      // 如果未找到目标或目标不可见，且还有重试机会
      if (attempt < maxAttempts) {
        setTimeout(() => attemptScroll(attempt + 1), delay);
        console.log(`第 ${attempt + 1} 次尝试查找目标元素，${delay}ms 后重试...`);
      } else {
        const truncatedText = question.fullText ? question.fullText.substring(0, 50) + '...' : '(无文本)';
        console.warn(`警告: 经过 ${maxAttempts} 次尝试，仍未能在当前页面找到目标问题元素: ${truncatedText}`);
      }
    };
    
    // 开始尝试滚动
    attemptScroll();
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
   * 确保只查找当前对话的问题元素
   */
  findCurrentVisibleQuestion() {
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset;
    const visibleQuestions = [];
    
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
      console.log(`查找可见问题前确认当前对话ID: ${this.chatId}`);
    }
    
    console.log(`查找当前可见问题，当前对话ID: ${this.chatId}，问题总数: ${this.questions.length}`);
    
    // 首先过滤出当前对话的问题
    const currentChatQuestions = this.questions.filter(q => q.chatId === this.chatId);
    console.log(`当前对话的问题数量: ${currentChatQuestions.length}，非当前对话问题数量: ${this.questions.length - currentChatQuestions.length}`);
    
    // 如果发现有非当前对话的问题，输出详细日志
    if (currentChatQuestions.length < this.questions.length) {
      const otherChatQuestions = this.questions.filter(q => q.chatId !== this.chatId);
      console.log(`发现 ${otherChatQuestions.length} 个非当前对话的问题:`);
      otherChatQuestions.forEach((q, index) => {
        console.log(`非当前对话问题 ${index + 1}: id=${q.id}, chatId=${q.chatId}, text=${q.text}`);
      });
    }
    
    if (currentChatQuestions.length === 0) {
      console.log('当前对话没有问题，无需查找可见问题');
      return null;
    }
    
    // 尝试通过ID查找当前对话的问题元素
    for (let i = 0; i < currentChatQuestions.length; i++) {
      const question = currentChatQuestions[i];
      
      // 再次确认问题属于当前对话
      if (question.chatId !== this.chatId) {
        console.log(`跳过非当前对话的问题: ${question.id}, chatId: ${question.chatId}, 当前chatId: ${this.chatId}`);
        continue;
      }
      
      let element = document.getElementById(question.id);
      if (element) {
        console.log(`通过ID找到问题元素: ${question.id}`);
      }
      
      // 如果没有找到，尝试通过内容匹配查找
      if (!element) {
        const userMessages = document.querySelectorAll('div.fbb737a4');
        console.log(`尝试通过内容匹配查找问题元素: ${question.id}, 页面上有 ${userMessages.length} 个用户消息元素`);
        
        for (const message of userMessages) {
          if (message.textContent.trim() === question.fullText.trim()) {
            element = message;
            // 为找到的元素添加ID，方便下次查找
            element.id = question.id;
            console.log(`通过内容匹配找到问题元素: ${question.id}, 文本: ${question.text}`);
            break;
          }
        }
        
        if (!element) {
          console.log(`通过内容匹配未找到问题元素: ${question.id}, 文本: ${question.text}`);
        }
      }
      
      // 确保元素存在且在当前文档中
      if (element && document.body.contains(element)) {
        const rect = element.getBoundingClientRect();
        // 检查元素是否在视口中或刚刚离开视口上方
        if (rect.top <= viewportHeight * 0.5 && rect.bottom >= 0) {
          visibleQuestions.push({
            question,
            element,
            position: rect.top
          });
          console.log(`找到可见问题: ${question.text}, 位置: ${rect.top}, chatId: ${question.chatId}`);
        }
      } else if (element) {
        console.log(`问题元素 ${question.id} 不在当前文档中`);
      } else {
        console.log(`未找到问题元素: ${question.id}, 文本: ${question.text}`);
      }
    }
    
    console.log(`找到 ${visibleQuestions.length} 个可见问题`);
    
    // 如果有可见的问题，返回最靠近视口顶部的一个
    if (visibleQuestions.length > 0) {
      // 按照元素位置排序，选择最靠近顶部但仍在视口内的问题
      visibleQuestions.sort((a, b) => a.position - b.position);
      // 优先选择位置为正的元素（在视口内），如果没有则选择最接近视口的元素
      const inViewport = visibleQuestions.filter(q => q.position >= 0);
      const selectedQuestion = (inViewport.length > 0 ? inViewport[0] : visibleQuestions[0]).question;
      console.log(`选择可见问题: ${selectedQuestion.text}, chatId: ${selectedQuestion.chatId}`);
      return selectedQuestion;
    }
    
    return null;
  }

  /**
   * 获取当前对话的会话存储键
   */
  getSessionKey() {
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    // 使用chatId生成会话存储键，确保不为空
    const key = `act-nav-session-questions-${this.chatId || 'default'}`;
    return key;
  }

  /**
   * 获取当前对话的持久化存储键
   */
  getStorageKey() {
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    // 使用chatId生成持久化存储键，确保不为空
    const key = `act-nav-questions-${this.chatId || 'default'}`;
    return key;
  }

  /**
   * 保存问题到会话存储
   * 使用sessionStorage确保页面关闭后数据清空
   */
  saveQuestionsToSession() {
    try {
      // 确保chatId已正确设置
      if (!this.chatId) {
        this.extractChatId();
      }
      
      const sessionKey = this.getSessionKey();
      
      // 只有当有问题时才保存到会话存储
      if (this.questions.length > 0) {
        const questionsData = this.questions.map(q => ({
          id: q.id,
          text: q.text,
          fullText: q.fullText,
          timestamp: q.timestamp
        }));
        
        sessionStorage.setItem(sessionKey, JSON.stringify(questionsData));
        console.log(`保存 ${this.questions.length} 个问题到会话存储 ${sessionKey}，当前chatId: ${this.chatId}`);
      } else {
        console.log(`当前没有问题需要保存到会话存储，chatId: ${this.chatId}`);
      }
    } catch (error) {
      console.error('保存问题到会话存储失败:', error);
    }
  }

  /**
   * 保存问题到持久化存储（保留原有方法以兼容）
   */
  async saveQuestions() {
    try {
      // 确保chatId已正确设置
      if (!this.chatId) {
        this.extractChatId();
      }
      
      const storageKey = this.getStorageKey();
      
      // 只有当有问题时才保存
      if (this.questions.length > 0) {
        await chrome.storage.local.set({
          [storageKey]: this.questions.map(q => ({
            id: q.id,
            text: q.text,
            fullText: q.fullText,
            timestamp: q.timestamp
          }))
        });
        console.log(`保存 ${this.questions.length} 个问题到持久化存储 ${storageKey}，当前chatId: ${this.chatId}`);
      } else {
        console.log(`当前没有问题需要保存到持久化存储，chatId: ${this.chatId}`);
      }
    } catch (error) {
      console.error('保存问题到持久化存储失败:', error);
    }
  }

  /**
   * 恢复问题从会话存储
   * 确保在恢复问题之前清空旧数据
   */
  async restoreQuestions() {
    try {
      // 确保chatId已正确设置
      if (!this.chatId) {
        this.extractChatId();
      }
      
      // 先清空当前问题列表，确保不会混合不同对话的问题
      this.questions = [];
      console.log(`恢复问题前已清空问题列表，当前chatId: ${this.chatId}`);
      
      // 优先从会话存储恢复问题（当前会话的数据）
      const sessionKey = this.getSessionKey();
      console.log(`尝试从会话存储 ${sessionKey} 恢复问题，当前chatId: ${this.chatId}`);
      
      try {
        const sessionData = sessionStorage.getItem(sessionKey);
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          if (Array.isArray(parsedData)) {
            // 为每个恢复的问题添加当前chatId属性（如果没有）
            this.questions = parsedData.map(q => ({
              ...q,
              chatId: this.chatId // 强制使用当前chatId，确保问题归属正确
            }));
            
            console.log(`从会话存储 ${sessionKey} 恢复了 ${this.questions.length} 个问题`);
            console.log('恢复的问题详情:');
            this.questions.forEach((q, index) => {
              console.log(`问题 ${index + 1}:`, {
                id: q.id,
                text: q.text,
                chatId: q.chatId
              });
            });
            
            // 恢复问题后，标记已存在的DOM元素，防止重复处理
            this.markExistingElements();
            
            // 更新侧边栏显示
            this.updateSidebar();
            
            return this.questions.length; // 返回恢复的问题数量
          }
        }
      } catch (sessionError) {
        console.log('从会话存储恢复问题失败:', sessionError);
      }
      
      // 如果会话存储中没有数据，检查是否有数据清除标记
      try {
        const clearResult = await chrome.storage.local.get(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
        if (clearResult['act-nav-data-cleared']) {
          const clearTime = clearResult['act-nav-clear-timestamp'];
          const now = Date.now();
          const timeDiff = now - clearTime;
          
          // 如果清除标记存在且时间在24小时内，则不恢复数据
          if (timeDiff < 24 * 60 * 60 * 1000) {
            console.log(`检测到数据清除标记，清除时间: ${new Date(clearTime).toLocaleString()}`);
            console.log(`距离清除时间: ${Math.floor(timeDiff / 1000 / 60)} 分钟，跳过数据恢复`);
            
            // 清空问题列表
            this.questions = [];
            this.updateSidebar();
            
            // 清除知识卡片容器
            const cardsContainer = document.getElementById('act-nav-cards-container');
            if (cardsContainer) {
              cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
            }
            
            return 0; // 返回0表示没有恢复任何问题
          } else {
            console.log('数据清除标记已过期（超过24小时），允许恢复数据');
            // 清除过期的标记
            await chrome.storage.local.remove(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
          }
        }
      } catch (clearCheckError) {
        console.log('检查清除标记时出错，继续正常恢复流程:', clearCheckError);
      }
      
      // 如果会话存储和清除标记都没有数据，尝试从持久化存储恢复（向后兼容）
      const storageKey = this.getStorageKey();
      console.log(`尝试从持久化存储 ${storageKey} 恢复问题，当前chatId: ${this.chatId}`);
      
      try {
        const result = await chrome.storage.local.get(storageKey);
        if (result[storageKey] && Array.isArray(result[storageKey])) {
          // 为每个恢复的问题添加当前chatId属性（如果没有）
          this.questions = result[storageKey].map(q => ({
            ...q,
            chatId: this.chatId // 强制使用当前chatId，确保问题归属正确
          }));
          
          console.log(`从持久化存储 ${storageKey} 恢复了 ${this.questions.length} 个问题`);
          console.log('恢复的问题详情:');
          this.questions.forEach((q, index) => {
            console.log(`问题 ${index + 1}:`, {
              id: q.id,
              text: q.text,
              chatId: q.chatId
            });
          });
          
          // 恢复问题后，标记已存在的DOM元素，防止重复处理
          this.markExistingElements();
        } else {
          console.log(`未找到 ${storageKey} 的问题，问题列表保持为空`);
        }
      } catch (storageError) {
        console.log('从持久化存储恢复问题失败:', storageError);
      }
      
      // 更新侧边栏显示
      this.updateSidebar();
      
      return this.questions.length; // 返回恢复的问题数量
    } catch (error) {
      console.error('恢复问题失败:', error);
      // 出错时也确保问题列表为空
      this.questions = [];
      this.updateSidebar();
      console.error('由于错误，问题列表已清空');
      return 0;
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
      // 如果是首次访问（没有存储的偏好设置），默认显示侧边栏
      if (result['act-nav-sidebar-visible'] === undefined) {
        this.isSidebarVisible = true;
        // 保存默认设置
        await this.savePreferences();
      } else {
        this.isSidebarVisible = result['act-nav-sidebar-visible'] !== false;
      }
      
      // 确保侧边栏状态与偏好设置一致
      const sidebar = document.getElementById('act-nav-sidebar');
      if (sidebar) {
        if (this.isSidebarVisible) {
          sidebar.classList.remove('collapsed');
        } else {
          sidebar.classList.add('collapsed');
        }
      }
    } catch (error) {
      console.error('加载偏好失败:', error);
      this.isSidebarVisible = true;
    }
  }

  /**
   * 标记已存在的DOM元素，防止重复处理
   */
  markExistingElements() {
    if (!this.config) return;
    
    // 查找所有用户消息元素
    const userMessages = document.querySelectorAll(this.config.userMessageSelector);
    
    userMessages.forEach(messageElement => {
      const messageText = this.extractMessageText(messageElement);
      if (!messageText || !messageText.trim()) return;
      
      // 查找匹配的已恢复问题
      const matchingQuestion = this.questions.find(q => 
        q.chatId === this.chatId && 
        q.fullText === messageText.trim()
      );
      
      if (matchingQuestion) {
        // 标记元素为已处理
        messageElement.id = matchingQuestion.id;
        messageElement.setAttribute('data-chatid', this.chatId);
        console.log(`标记已存在的DOM元素: ${matchingQuestion.id} - ${matchingQuestion.text}`);
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
    console.log('setupMessageListener 被调用');
    
    // 检查 chrome.runtime 是否可用
    if (!chrome.runtime) {
      console.error('chrome.runtime 不可用');
      return;
    }
    
    if (!chrome.runtime.onMessage) {
      console.error('chrome.runtime.onMessage 不可用');
      return;
    }
    
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('收到消息:', request, '来自:', sender);
        
        try {
          switch (request.action) {
            case 'check-status':
              console.log('处理 check-status 消息');
              sendResponse({ active: true, questionsCount: this.questions.length });
              break;
            case 'show-sidebar':
              console.log('处理 show-sidebar 消息');
              this.showSidebar();
              sendResponse({ success: true });
              break;
            case 'hide-sidebar':
              console.log('处理 hide-sidebar 消息');
              this.hideSidebar();
              sendResponse({ success: true });
              break;
            case 'get-questions':
              console.log('处理 get-questions 消息');
              sendResponse({ questions: this.questions });
              break;
            case 'clear-questions':
              console.log('处理 clear-questions 消息');
              this.clearQuestions();
              sendResponse({ success: true });
              break;
            case 'clear-all-questions':
              console.log('处理 clear-all-questions 消息');
              this.clearAllQuestions();
              sendResponse({ success: true });
              break;
            case 'get-question-count':
              console.log('处理 get-question-count 消息，当前问题数量:', this.questions.length);
              sendResponse({ count: this.questions.length });
              break;
            case 'get-library-count':
              console.log('处理 get-library-count 消息');
              try {
                let libraryCount = 0;
                if (window.KnowledgeBaseManager) {
                  libraryCount = window.KnowledgeBaseManager.getAllCards().length;
                } else {
                  // 从localStorage获取
                  const stored = localStorage.getItem('act-nav-knowledge-base');
                  libraryCount = stored ? JSON.parse(stored).length : 0;
                }
                sendResponse({ count: libraryCount });
              } catch (error) {
                console.error('获取知识库统计失败:', error);
                sendResponse({ count: 0, error: error.message });
              }
              break;
            case 'get-library-data':
              console.log('处理 get-library-data 消息');
              try {
                let libraryData = [];
                if (window.KnowledgeBaseManager) {
                  libraryData = window.KnowledgeBaseManager.getAllCards();
                } else {
                  // 从localStorage获取
                  const stored = localStorage.getItem('act-nav-knowledge-base');
                  libraryData = stored ? JSON.parse(stored) : [];
                }
                sendResponse({ data: libraryData });
              } catch (error) {
                console.error('获取知识库数据失败:', error);
                sendResponse({ data: [], error: error.message });
              }
              break;
            case 'get-local-library-data':
              console.log('处理 get-local-library-data 消息');
              try {
                const localData = this.getLocalLibraryData();
                sendResponse({ data: localData });
              } catch (error) {
                console.error('获取本地收藏数据失败:', error);
                sendResponse({ data: [], error: error.message });
              }
              break;
            case 'ensure-layout-styles':
              console.log('处理 ensure-layout-styles 消息');
              try {
                this.ensureLayoutStyles();
                sendResponse({ success: true });
              } catch (error) {
                console.error('确保布局样式失败:', error);
                sendResponse({ success: false, error: error.message });
              }
              break;
            case 'scroll-to-collection':
              console.log('处理 scroll-to-collection 消息');
              try {
                const { collectionData } = request;
                const success = this.scrollToCollectionPosition(collectionData);
                sendResponse({ success });
              } catch (error) {
                console.error('定位到收藏位置失败:', error);
                sendResponse({ success: false, error: error.message });
              }
              break;
            case 'delete-collection-item':
              console.log('处理 delete-collection-item 消息');
              try {
                const { itemId, collectionData } = request;
                this.deleteCollectionItem(itemId, collectionData).then(success => {
                  sendResponse({ success });
                }).catch(error => {
                  console.error('删除收藏项失败:', error);
                  sendResponse({ success: false, error: error.message });
                });
                return true; // 保持消息通道开放
              } catch (error) {
                console.error('删除收藏项失败:', error);
                sendResponse({ success: false, error: error.message });
              }
              break;
            case 'clear-question-data':
              console.log('处理 clear-question-data 消息');
              // 清除问题目录数据
              this.clearQuestionData().then(success => {
                console.log('clearQuestionData 完成，结果:', success);
                sendResponse({ success: success });
              }).catch(error => {
                console.error('清除问题目录失败:', error);
                sendResponse({ success: false, error: error.message });
              });
              return true; // 保持消息通道开放，等待异步操作完成
            case 'toggleSidebar':
              console.log('处理 toggleSidebar 消息');
              const sidebar = document.getElementById('act-nav-sidebar');
              if (sidebar) {
                const isCollapsed = sidebar.classList.contains('collapsed');
                if (isCollapsed) {
                  sidebar.classList.remove('collapsed');
                  this.isSidebarVisible = true;
                } else {
                  sidebar.classList.add('collapsed');
                  this.isSidebarVisible = false;
                }
                this.savePreferences();
                // 更新切换按钮图标
                const toggleBtn = document.querySelector('.act-nav-toggle');
                if (toggleBtn) {
                  this.updateToggleIcon(toggleBtn);
                }
              }
              sendResponse({ success: true });
              break;
            default:
              console.log('未知的消息类型:', request.action);
              sendResponse({ error: 'Unknown action' });
          }
        } catch (error) {
          console.error('处理消息时出错:', error);
          sendResponse({ error: error.message });
        }
      });
      console.log('消息监听器设置完成');
    } catch (error) {
      console.error('设置消息监听器时出错:', error);
    }
  }

  /**
   * 显示侧边栏
   */
  showSidebar() {
    const sidebar = document.getElementById('act-nav-sidebar');
    if (sidebar) {
      this.isSidebarVisible = true;
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('visible');
      // 更新切换按钮图标
      const toggleBtn = sidebar.querySelector('.act-nav-toggle');
      if (toggleBtn) {
        this.updateToggleIcon(toggleBtn);
      }
      // 更新显示按钮可见性
      this.updateShowButtonVisibility();
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
      sidebar.classList.remove('visible');
      // 更新切换按钮图标
      const toggleBtn = sidebar.querySelector('.act-nav-toggle');
      if (toggleBtn) {
        this.updateToggleIcon(toggleBtn);
      }
      // 更新显示按钮可见性
      this.updateShowButtonVisibility();
      this.savePreferences();
    }
  }

  /**
   * 清空当前对话的问题目录
   */
  async clearQuestions() {
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    // 清空问题数组
    this.questions = [];
    
    // 更新侧边栏显示
    this.updateSidebar();
    
    // 从存储中删除当前对话的问题
    try {
      const storageKey = this.getStorageKey();
      await chrome.storage.local.remove(storageKey);
      console.log(`已清空当前对话(${this.chatId})的问题目录，存储键: ${storageKey}`);
    } catch (error) {
      console.error(`清除当前对话(${this.chatId})问题失败:`, error);
    }
  }
  
  /**
   * 清空所有对话的问题目录
   */
  async clearAllQuestions() {
    // 确保chatId已正确设置
    if (!this.chatId) {
      this.extractChatId();
    }
    
    // 清空当前问题数组
    this.questions = [];
    
    // 更新侧边栏显示
    this.updateSidebar();
    
    // 获取所有存储键
    try {
      const result = await chrome.storage.local.get(null);
      const keys = Object.keys(result).filter(key => key.startsWith('act-nav-questions-'));
      
      // 删除所有对话的问题
      if (keys.length > 0) {
        await chrome.storage.local.remove(keys);
        console.log(`已清空所有对话的问题目录，共 ${keys.length} 个对话，当前对话ID: ${this.chatId}`);
        
        // 记录被删除的键
        console.log('被删除的存储键:', keys);
      } else {
        console.log('没有找到任何对话的问题目录');
      }
    } catch (error) {
      console.error('清除所有对话问题失败:', error);
    }
  }

  /**
   * 手动触发对话切换（用于新对话检测）
   */
  async handleChatSwitch() {
    const oldChatId = this.chatId;
    const oldUrl = window.location.href;
    // 提取新的对话ID
    this.extractChatId();
    const newChatId = this.chatId;
    const newUrl = window.location.href;
    // 复用原有切换流程
    if (oldChatId && oldChatId !== newChatId) {
      // 直接调用 setupUrlChangeListener 里的切换核心逻辑
      // 复制自 setupUrlChangeListener 的 debouncedHandleLocationChange
      if (this.observer) {
        try { this.observer.disconnect(); } catch (e) {}
      }
      if (oldChatId && this.questions.length > 0) {
        const oldSessionKey = `act-nav-session-questions-${oldChatId}`;
        try {
          const questionsData = this.questions.map(q => ({
            id: q.id,
            text: q.text,
            fullText: q.fullText,
            timestamp: q.timestamp,
            chatId: oldChatId
          }));
          
          sessionStorage.setItem(oldSessionKey, JSON.stringify(questionsData));
        } catch (error) {}
      }
      this.questions = [];
      document.querySelectorAll('[id^="act-nav-"]').forEach(el => { el.removeAttribute('id'); });
      
          // 重置防止重复处理的标记
    this.pendingQuestionText = null;
    this.pendingQuestionTimestamp = null;
    console.log('对话切换时已重置重复处理标记');
    
    // 重置重复处理记录
    // if (this.recentlyProcessedQuestions) {
    //   this.recentlyProcessedQuestions.clear();
    //   console.log('对话切换时已清空重复处理记录');
    // }
    
    // 重置初始化标志位，允许新对话重新初始化
    this.initialized = false;
    console.log('对话切换时已重置初始化标志位');
      
      // 重新注入侧边栏，确保在新对话中正确显示
      this.injectSidebar();
      this.updateSidebar();
      
      try {
        // 检查是否设置了数据清除标记
        let shouldRestoreData = true;
        try {
          const clearResult = await chrome.storage.local.get(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
          if (clearResult['act-nav-data-cleared']) {
            const clearTime = clearResult['act-nav-clear-timestamp'];
            const now = Date.now();
            const timeDiff = now - clearTime;
            
            // 如果清除标记存在且时间在24小时内，则不恢复数据
            if (timeDiff < 24 * 60 * 60 * 1000) {
              console.log(`检测到数据清除标记，清除时间: ${new Date(clearTime).toLocaleString()}`);
              console.log(`距离清除时间: ${Math.floor(timeDiff / 60 / 1000)} 分钟，跳过数据恢复`);
              shouldRestoreData = false;
            } else {
              console.log('数据清除标记已过期（超过24小时），允许恢复数据');
              // 清除过期的标记
              await chrome.storage.local.remove(['act-nav-data-cleared', 'act-nav-clear-timestamp']);
            }
          }
        } catch (clearCheckError) {
          console.log('检查清除标记时出错，继续正常恢复流程:', clearCheckError);
        }
        
        if (shouldRestoreData) {
          this.restoreQuestions().then(() => {
            if (this.observer) {
              try {
                this.observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true
                });
              } catch (e) {}
            }
          });
        } else {
          console.log('由于数据清除标记，跳过新对话的数据恢复');
          // 确保知识卡片容器显示空状态
          const cardsContainer = document.getElementById('act-nav-cards-container');
          if (cardsContainer) {
            cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
          }
          
          // 恢复 observer 监听
          if (this.observer) {
            try {
              this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
              });
            } catch (e) {}
          }
        }
      } catch (error) {
        if (this.observer) {
          try {
            this.observer.observe(document.body, {
              childList: true,
              subtree: true,
              characterData: true
            });
          } catch (e) {}
        }
      }
    } else {
      // 新对话ID和旧ID一致，或旧ID为空，直接清空 questions
      this.questions = [];
      document.querySelectorAll('[id^="act-nav-"]').forEach(el => { el.removeAttribute('id'); });
      this.updateSidebar();
      if (this.observer) {
        try {
          this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
        } catch (e) {}
      }
    }
  }
  renderKnowledgeCards(cards) {
    const container = document.getElementById('act-nav-cards-container');
    if (!container) return;
  
    const esc = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const pick = (obj, keys) => keys.map(k => obj?.[k]).find(v => typeof v === 'string' && v.trim()) || '';
  
    // 调试：输出完整的卡片数据
    console.log('渲染知识卡片，原始数据:', cards);
    
    container.innerHTML = (cards || []).map((c, idx) => {
      // 优先使用AI返回的字段，然后回退到其他字段
      const title = pick(c, ['title', 'point', 'question', 'summary']) || '未命名卡片';
      const body = pick(c, ['summary', 'answer', 'content', 'details', 'logic', 'text', 'question']);
      const tags = Array.isArray(c.tags) ? c.tags : [];
      const needExpand = (body || '').length > 80;
      
      // 调试信息：显示每个卡片的字段信息
      console.log(`卡片${idx}详细信息:`, {
        title,
        body,
        bodyLength: (body || '').length,
        bodyPreview: (body || '').substring(0, 100) + '...',
        needExpand,
        tags,
        allFields: Object.keys(c).reduce((acc, key) => {
          acc[key] = {
            value: c[key],
            type: typeof c[key],
            hasValue: !!c[key]
          };
          return acc;
        }, {})
      });
      
      // 确保卡片有内容显示
      if (!body || body.trim() === '') {
        console.warn(`卡片${idx}缺少正文内容:`, c);
      }
  
      return `
        <div class="act-nav-card" data-card-idx="${idx}" data-expanded="0">
          <div class="act-nav-card-header">
            <div class="act-nav-card-title">${esc(title)}</div>
            <div class="act-nav-card-actions">
              <button class="act-nav-card-collect ${c.is_collected ? 'is-collected':''}" data-card-idx="${idx}">
                ${c.is_collected ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>
          </div>
          <div class="act-nav-card-body" style="white-space:pre-wrap;">
            ${body ? `<div class="act-nav-card-text">${esc(body)}</div>` : '<div class="muted">（无正文）</div>'}
            ${needExpand ? `<button class="act-nav-expand-btn" data-card-idx="${idx}">展开全文</button>` : ''}
            ${tags.length ? `<div class="act-nav-card-tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  
    // —— 收藏按钮（简化逻辑，优先使用本地存储）——
    container.querySelectorAll('.act-nav-card-collect').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-card-idx'));
        const card = cards[idx];
        const oldText = btn.textContent;
        const wasCollected = !!card.is_collected;
        const desired = !wasCollected;
  
        btn.disabled = true; 
        btn.textContent = '…';
  
        try {
          // 优先使用本地存储，避免网络问题
          card.is_collected = desired;
          
          // 尝试云端同步（可选）
          if (this.supabase && desired) {
            try {
              // 只在新收藏时尝试云端保存
              const payload = {
                card: {
                  source: card.source || 'deepseek',
                  thread_id: card.thread_id || this.chatId || location.pathname,
                  message_id: card.message_id ?? null,
                  title: card.title || (card.question || '').slice(0,40) || '未命名卡片',
                  question: card.question || '',
                  answer: card.answer || '',
                  tags: Array.isArray(card.tags) ? card.tags : [],
                  keywords: Array.isArray(card.keywords) ? card.keywords : [],
                  summary: card.summary || '',
                  link: card.link || '',
                  meta: card.meta || {},
                  is_collected: desired,
                }
              };
              
              const res = await this.supabase.invokeFunction('save-knowledge-card', { body: payload });
              if (res && !res.error) {
                card.id = res.data?.id || card.id;
                console.log('云端保存成功:', card.title);
              }
            } catch (cloudError) {
              console.warn('云端保存失败，使用本地存储:', cloudError.message);
              // 云端失败不影响本地收藏
            }
          }
          
          // 保存到本地存储（主要方式）
          this.saveCardToLocalStorage(card);
          
          // 更新按钮状态和样式
          btn.textContent = card.is_collected ? '★ 已收藏' : '☆ 收藏';
          btn.classList.toggle('is-collected', card.is_collected);
          btn.title = card.is_collected ? '取消收藏' : '收藏此知识卡片';
          
          // 显示成功提示
          if (card.is_collected) {
            this.showNotification?.('已添加到收藏库', 'success');
          } else {
            this.showNotification?.('已从收藏库移除', 'success');
          }
          
        } catch (e) {
          console.error('收藏操作失败:', e);
          btn.textContent = oldText;
          this.showNotification?.('操作失败，请重试', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  
    // —— 展开/收起：用事件委托，后续重新渲染也无需重复绑 —— 
    container.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.act-nav-expand-btn');
      if (!btn) return;
      
      const cardEl = btn.closest('.act-nav-card');
      if (!cardEl) return;
      
      const expanded = cardEl.getAttribute('data-expanded') === '1';
      const newState = expanded ? '0' : '1';
      
      // 设置新的展开状态
      cardEl.setAttribute('data-expanded', newState);
      
      // 同时设置CSS类，确保兼容性
      if (newState === '1') {
        cardEl.classList.add('expanded');
      } else {
        cardEl.classList.remove('expanded');
      }
      
      // 更新按钮文字
      btn.textContent = expanded ? '展开全文' : '收起';
      
      // 调试信息
      console.log('展开状态切换:', {
        cardId: cardEl.querySelector('.act-nav-card-title')?.textContent || '未知卡片',
        oldState: expanded ? '展开' : '收起',
        newState: newState === '1' ? '展开' : '收起',
        dataExpanded: cardEl.getAttribute('data-expanded'),
        hasExpandedClass: cardEl.classList.contains('expanded')
      });
      
      // 强制重绘以确保CSS生效
      cardEl.style.display = 'none';
      cardEl.offsetHeight; // 触发重排
      cardEl.style.display = '';
    }, { once: false });
  }
  

  /**
   * 绑定AI知识卡片提取功能事件
   */
  bindSummaryFeatureEvents() {
    const summarizeBtn = document.getElementById('act-nav-summarize-btn');
    if (!summarizeBtn) return;

    summarizeBtn.addEventListener('click', async () => {
      const cardsContainer = document.getElementById('act-nav-cards-container');

      // 1. 显示加载状态
      cardsContainer.innerHTML = '<div class="act-nav-loading"><div class="act-nav-spinner"></div><span>正在提取知识卡片...</span></div>';
      summarizeBtn.disabled = true;

      // 2. 使用新的整页抽取方法收集对话内容
      const conversationData = this.extractFullPageConversation();
      console.log('整页抽取的对话数据:', conversationData);
      
      // 调试：检查对话数据的完整性
      if (conversationData && conversationData.messages) {
        console.log('对话数据详情:', {
          source: conversationData.source,
          url: conversationData.url,
          messageCount: conversationData.messages.length,
          firstMessage: conversationData.messages[0],
          lastMessage: conversationData.messages[conversationData.messages.length - 1]
        });
        
        // 检查每条消息的内容
        conversationData.messages.forEach((msg, index) => {
          console.log(`消息${index}:`, {
            role: msg.role,
            textLength: msg.text.length,
            textPreview: msg.text.substring(0, 100) + '...'
          });
        });
      }
      
      if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
        cardsContainer.innerHTML = '<p class="no-cards-info">没有找到对话内容，请确保页面已加载完成。</p>';
        summarizeBtn.disabled = false;
        return;
      }

      // 3. 生成对话文本
      const conversationText = conversationData.messages.map(msg => 
        `${msg.role === 'user' ? '用户提问' : 'AI回答'}： ${msg.text}`
      ).join('\n\n');
      
      console.log('生成的对话文本长度:', conversationText.length);
      console.log('对话文本预览:', conversationText.substring(0, 200) + '...');

      try {
        // 4. 调用云端函数
        console.log(`ActNav: 调用云函数 'generate-cards'，chatId: ${this.chatId}`);
        console.log('准备发送的数据:', { 
          chatId: this.chatId, 
          conversationTextLength: conversationText.length,
          source: conversationData.source,
          messageCount: conversationData.messages.length
        });
        
        console.log('准备调用云函数 generate-cards，参数:', {
          textLength: conversationText.length,
          max_cards: 5,
          chatId: this.chatId,
          textPreview: conversationText.substring(0, 200) + '...'
        });
        
        const result = await this.supabase.invokeFunction('generate-cards', {
          body: { 
            text: conversationText,
            max_cards: 5,
            chatId: this.chatId 
          }
        });

        // 调试：输出完整的返回结果
        console.log('云函数返回结果:', result);
        console.log('结果类型:', typeof result);
        console.log('结果键:', Object.keys(result || {}));

        // 5. 显示知识卡片结果
        console.log('检查结果对象:', {
          hasResult: !!result,
          resultType: typeof result,
          resultKeys: result ? Object.keys(result) : [],
          hasCards: result && 'cards' in result,
          cardsValue: result?.cards,
          cardsLength: result?.cards?.length || 0
        });
        
        // 调试：输出完整的返回结果结构
        if (result && result.cards) {
          console.log('AI返回的知识卡片数据:', result.cards);
          console.log('第一张卡片示例:', result.cards[0]);
          
          // 验证每张卡片的数据完整性
          result.cards.forEach((card, index) => {
            console.log(`卡片${index}数据验证:`, {
              hasTitle: !!card.title,
              hasSummary: !!card.summary,
              hasTags: Array.isArray(card.tags),
              title: card.title,
              summary: card.summary,
              tags: card.tags
            });
          });
          
          this.renderKnowledgeCards(result.cards);
        } else {
          console.error('API返回数据异常:', result);
          throw new Error('API返回格式异常，未找到知识卡片内容');
        }

      } catch (error) {
        console.error('提取知识卡片失败:', error);
        console.error('错误详情:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        let errorMessage = '提取知识卡片失败，请检查网络或联系管理员。';
        if (error.message.includes('HTTP error')) {
          errorMessage = '网络请求失败，请检查网络连接。';
        } else if (error.message.includes('API返回格式异常')) {
          errorMessage = 'AI服务返回格式异常，请稍后重试。';
        }
        
        cardsContainer.innerHTML = `<p class="error-info">${errorMessage}</p>`;
      } finally {
        summarizeBtn.disabled = false;
      }
    });
  }

  /**
   * 使用新的适配器体系提取整页对话内容
   */
  extractFullPageConversation() {
    try {
      // 动态加载适配器模块
      if (typeof window.AdapterFactory === 'undefined') {
        // 如果适配器未加载，回退到原有的侧边栏方法
        console.log('适配器未加载，回退到侧边栏方法');
        return this.extractSidebarConversation();
      }

      // 使用适配器工厂获取适合当前页面的适配器
      const adapter = window.AdapterFactory.getAdapter();
      if (adapter) {
        console.log(`使用适配器: ${adapter.getPlatformName()}`);
        return adapter.extractConversation();
      } else {
        console.log('未找到合适的适配器，回退到侧边栏方法');
        return this.extractSidebarConversation();
      }
    } catch (error) {
      console.error('整页抽取失败，回退到侧边栏方法:', error);
      return this.extractSidebarConversation();
    }
  }

  /**
   * 回退方法：使用原有的侧边栏问题列表
   */
  extractSidebarConversation() {
    console.log('使用侧边栏方法提取对话内容');
    const messages = this.questions.map(q => ({
      role: 'user',
      text: q.fullText
    }));
    
    return {
      source: '侧边栏回退',
      url: window.location.href,
      messages
    };
  }

  /**
   * 渲染知识卡片到UI
   */
  // === 最终版：渲染知识卡片（带 AI 总结正文 + 去重 + 收藏 + 展开/收起）===

  /**
   * 绑定添加到知识库按钮事件
   */
  bindAddToLibraryEvents() {
    const addToLibraryButtons = document.querySelectorAll('.card-add-to-library-btn');
    addToLibraryButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const cardId = button.getAttribute('data-card-id');
        if (cardId) {
          // 使用箭头函数确保this上下文正确
          this.addCardToLibrary(cardId).catch(error => {
            console.error('添加知识卡片失败:', error);
            this.showNotification('添加失败，请重试', 'error');
          });
        }
      });
    });
  }

  /**
   * 在切换对话时加载已保存的卡片
   */
  async loadAndRenderCards(chatId) {
    console.log('loadAndRenderCards 被调用，chatId:', chatId);
    const container = document.getElementById('act-nav-cards-container');
    if (container) container.innerHTML = '<div class="act-nav-loading">正在加载知识卡片...</div>';

    try {
      // 调用新的云函数获取知识卡片
      console.log('准备调用 get-knowledge-cards 云函数');
      const result = await this.supabase.invokeFunction('get-knowledge-cards', {
        body: { chatId }
      });
      
      // 调试：输出完整的返回结果
      console.log('get-knowledge-cards 返回结果:', result);
      console.log('结果类型:', typeof result);
      console.log('结果键:', Object.keys(result || {}));
      
      if (result && result.error) throw new Error(result.error);
      
      if (result && result.cards && result.cards.length > 0) {
        this.renderKnowledgeCards(result.cards);
      } else {
        if (container) container.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
      }
    } catch (error) {
      console.error('加载知识卡片失败:', error);
      
      // 提供更友好的错误信息
      let errorMessage = '加载知识卡片失败';
      if (error.message.includes('云函数未找到')) {
        errorMessage = '知识卡片服务暂时不可用，请稍后重试';
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else if (error.message.includes('权限')) {
        errorMessage = '权限不足，无法访问知识卡片服务';
      }
      
      if (container) {
        container.innerHTML = `
          <div class="error-info">
            <p>${errorMessage}</p>
            <button onclick="window.actNavInstance?.retryLoadCards('${chatId}')" style="margin-top: 10px; padding: 5px 10px;">
              重试
            </button>
          </div>
        `;
      }
      
      // 尝试从本地存储加载备用数据
      this.loadFallbackCards(chatId);
    }
  }

  /**
   * 从本地存储加载备用知识卡片数据
   */
  loadFallbackCards(chatId) {
    try {
      console.log('尝试从本地存储加载备用知识卡片数据...');
      
      // 从localStorage加载知识库数据
      const knowledgeBase = JSON.parse(localStorage.getItem('act-nav-knowledge-base') || '[]');
      
      // 查找与当前对话相关的卡片
      const relatedCards = knowledgeBase.filter(card => 
        card.source === chatId || card.source.includes(chatId)
      );
      
      if (relatedCards.length > 0) {
        console.log(`从本地存储找到 ${relatedCards.length} 张相关卡片`);
        this.renderKnowledgeCards(relatedCards);
      } else {
        console.log('本地存储中没有找到相关卡片');
      }
    } catch (error) {
      console.error('加载备用知识卡片失败:', error);
    }
  }

  /**
   * 重试加载知识卡片
   */
  async retryLoadCards(chatId) {
    console.log('重试加载知识卡片...');
    await this.loadAndRenderCards(chatId);
  }

  /**
   * 将知识卡片添加到知识库
   * @param {string} cardId - 要添加的卡片的ID
   */
  async addCardToLibrary(cardId) {
    try {
      // 找到对应的卡片数据
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      if (!cardElement) {
        console.error('找不到对应的卡片元素:', cardId);
        return;
      }

      // 提取卡片信息
      const title = cardElement.querySelector('.card-title').textContent;
      const summary = cardElement.querySelector('.card-summary').textContent;
      const tags = Array.from(cardElement.querySelectorAll('.tag')).map(tag => tag.textContent);
      
      // 创建知识库卡片对象
      const libraryCard = {
        title: title,
        content: summary,
        tags: tags,
        source: this.chatId || 'unknown',
        category: tags.length > 0 ? tags[0] : '未分类'
      };

      // 检查是否已经添加到知识库
      const knowledgeManager = window.KnowledgeBaseManager || window.knowledgeBaseManagerInstance;
      
      console.log('知识库管理器状态:', {
        hasKnowledgeBaseManager: !!window.KnowledgeBaseManager,
        hasInstance: !!window.knowledgeBaseManagerInstance,
        knowledgeManager: !!knowledgeManager,
        managerType: typeof knowledgeManager,
        hasGetAllCards: knowledgeManager && typeof knowledgeManager.getAllCards === 'function',
        hasAddKnowledgeCard: knowledgeManager && typeof knowledgeManager.addKnowledgeCard === 'function'
      });
      
      if (knowledgeManager && typeof knowledgeManager.getAllCards === 'function' && typeof knowledgeManager.addKnowledgeCard === 'function') {
        try {
          const existingCards = knowledgeManager.getAllCards();
          console.log('获取现有卡片成功，数量:', existingCards.length);
          
          const isDuplicate = existingCards.some(card => 
            card.title === libraryCard.title && 
            card.content === libraryCard.content
          );

          if (isDuplicate) {
            this.showNotification('此卡片已在知识库中', 'info');
            return;
          }

          // 添加到知识库
          const newCardId = knowledgeManager.addKnowledgeCard(libraryCard);
          console.log('添加卡片成功，新ID:', newCardId);
          
          // 更新按钮状态
          const addButton = cardElement.querySelector('.card-add-to-library-btn');
          if (addButton) {
            addButton.textContent = '✅';
            addButton.title = '已添加到知识库';
            addButton.disabled = true;
            addButton.style.opacity = '0.6';
          }

          this.showNotification('知识卡片已添加到知识库', 'success');
          console.log('知识卡片已添加到知识库:', newCardId);
        } catch (managerError) {
          console.error('知识库管理器操作失败:', managerError);
          this.showNotification('知识库操作失败: ' + managerError.message, 'error');
        }
      } else {
        console.error('知识库管理器未正确初始化或方法不可用');
        console.error('尝试重新初始化知识库管理器...');
        
        // 尝试重新初始化
        this.tryInitKnowledgeBaseManager();
        
        // 显示用户友好的错误信息
        this.showNotification('知识库管理器初始化中，请稍后重试', 'info');
        
        // 等待一段时间后重试
        setTimeout(() => {
          this.retryAddCardToLibrary(cardId, libraryCard, cardElement);
        }, 1000);
      }
    } catch (error) {
      console.error('添加知识卡片到知识库失败:', error);
      this.showNotification('添加失败，请重试', 'error');
    }
  }

  /**
   * 重试添加知识卡片到知识库
   */
  retryAddCardToLibrary(cardId, libraryCard, cardElement) {
    try {
      console.log('重试添加知识卡片到知识库...');
      
      const knowledgeManager = window.KnowledgeBaseManager || window.knowledgeBaseManagerInstance;
      
      if (knowledgeManager && typeof knowledgeManager.getAllCards === 'function' && typeof knowledgeManager.addKnowledgeCard === 'function') {
        try {
          const existingCards = knowledgeManager.getAllCards();
          const isDuplicate = existingCards.some(card => 
            card.title === libraryCard.title && 
            card.content === libraryCard.content
          );

          if (isDuplicate) {
            this.showNotification('此卡片已在知识库中', 'info');
            return;
          }

          // 添加到知识库
          const newCardId = knowledgeManager.addKnowledgeCard(libraryCard);
          
          // 更新按钮状态
          const addButton = cardElement.querySelector('.card-add-to-library-btn');
          if (addButton) {
            addButton.textContent = '✅';
            addButton.title = '已添加到知识库';
            addButton.disabled = true;
            addButton.style.opacity = '0.6';
          }

          this.showNotification('知识卡片已添加到知识库（重试成功）', 'success');
          console.log('重试添加知识卡片成功:', newCardId);
        } catch (managerError) {
          console.error('重试时知识库管理器操作仍然失败:', managerError);
          this.showNotification('知识库操作失败，请刷新页面重试', 'error');
        }
      } else {
        console.error('重试时知识库管理器仍然不可用');
        
        // 最后一次尝试：直接操作localStorage
        try {
          console.log('尝试直接操作localStorage...');
          const stored = localStorage.getItem('act-nav-knowledge-base');
          const cards = stored ? JSON.parse(stored) : [];
          
          const newCard = {
            id: Date.now().toString(),
            ...libraryCard,
            createdAt: new Date().toISOString(),
            addedToLibrary: new Date().toISOString()
          };
          
          cards.push(newCard);
          localStorage.setItem('act-nav-knowledge-base', JSON.stringify(cards));
          
          // 更新按钮状态
          const addButton = cardElement.querySelector('.card-add-to-library-btn');
          if (addButton) {
            addButton.textContent = '✅';
            addButton.title = '已添加到知识库';
            addButton.disabled = true;
            addButton.style.opacity = '0.6';
          }
          
          this.showNotification('知识卡片已添加到知识库（备用模式）', 'success');
          console.log('直接操作localStorage成功:', newCard.id);
        } catch (localStorageError) {
          console.error('直接操作localStorage失败:', localStorageError);
          this.showNotification('知识库管理器不可用，请刷新页面重试', 'error');
        }
      }
    } catch (error) {
      console.error('重试添加知识卡片失败:', error);
      this.showNotification('重试失败，请刷新页面重试', 'error');
    }
  }

  /**
   * 从目录中删除一个问题
   * @param {string} questionId - 要删除的问题的ID
   */
  async deleteQuestion(questionId) {
    if (!questionId) return;
    // 从内存中过滤掉被删除的问题
    this.questions = this.questions.filter(q => q.id !== questionId);
    // 更新UI
    this.updateSidebar();
    // 保存到会话存储
    this.saveQuestionsToSession();
    console.log(`ActNav: 已删除问题 ${questionId}`);
  }

  /**
   * 删除知识卡片
   */
  async deleteKnowledgeCard(cardId) {
    try {
      // 从本地存储中移除卡片
      const cardsContainer = document.querySelector('#act-nav-cards-container');
      if (cardsContainer) {
        const cardElement = cardsContainer.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
          cardElement.remove();
          console.log(`本地知识卡片已移除: ${cardId}`);
        }
      }
      
      // 注意：当前的云函数只能删除整个对话的所有知识卡片
      // 如果需要删除单个卡片，需要修改云函数或数据库结构
      // 这里暂时只做本地删除，并显示提示
      this.showNotification('知识卡片已删除（仅本地）', 'info');
      
      // 如果容器中没有卡片了，显示无卡片信息
      const remainingCards = cardsContainer?.querySelectorAll('.knowledge-card');
      if (!remainingCards || remainingCards.length === 0) {
        cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
      }
      
    } catch (error) {
      console.error('删除知识卡片时出错:', error);
      this.showNotification('删除知识卡片时出错', 'error');
    }
  }

  /**
   * 清除问题目录数据
   */
  async clearQuestionData() {
    try {
      console.log('开始清除问题目录数据，当前chatId:', this.chatId);
      
      // 清除当前对话的问题
      this.questions = [];
      console.log('内存中的问题列表已清空');
      
      // 更新侧边栏显示
      this.updateSidebar();
      console.log('侧边栏已更新');
      
      // 清除会话存储中的问题（当前会话的数据）
      try {
        const sessionKey = this.getSessionKey();
        sessionStorage.removeItem(sessionKey);
        console.log(`已清除会话存储中的问题: ${sessionKey}`);
      } catch (sessionError) {
        console.error('清除会话存储数据时出错:', sessionError);
      }
      
      // 清除本地持久化存储中的问题 - 不仅清除当前对话，还要清除所有对话的问题
      try {
        // 获取所有存储键
        const result = await chrome.storage.local.get(null);
        const keys = Object.keys(result).filter(key => key.startsWith('act-nav-questions-'));
        
        // 删除所有对话的问题
        if (keys.length > 0) {
          await chrome.storage.local.remove(keys);
          console.log(`已清除所有对话的问题目录，共 ${keys.length} 个对话，包括当前对话ID: ${this.chatId}`);
          
          // 记录被删除的键
          console.log('被删除的存储键:', keys);
        } else {
          console.log('没有找到任何对话的问题目录');
        }
        
        // 额外清除当前对话的存储键（以防万一）
        const currentStorageKey = this.getStorageKey();
        await chrome.storage.local.remove(currentStorageKey);
        console.log('额外清除当前对话的存储键:', currentStorageKey);
        
      } catch (storageError) {
        console.error('清除持久化存储数据时出错:', storageError);
        // 即使存储清除失败，也要确保内存中的数据被清除
      }
      
      // 清除所有已处理消息元素的 act-nav- 前缀 id 和 data-chatid
      document.querySelectorAll('[id^="act-nav-"]').forEach(el => {
        el.removeAttribute('id');
        el.removeAttribute('data-chatid');
      });
      console.log('已清理所有消息元素的标记');
      
      // 重置防止重复处理的标记
      this.pendingQuestionText = null;
      this.pendingQuestionTimestamp = null;
      console.log('清除数据时已重置重复处理标记');
      
          // 重置重复处理记录
    // if (this.recentlyProcessedQuestions) {
    //   this.recentlyProcessedQuestions.clear();
    //   console.log('清除数据时已清空重复处理记录');
    // }
      
      // 清除知识卡片容器
      const cardsContainer = document.getElementById('act-nav-cards-container');
      if (cardsContainer) {
        cardsContainer.innerHTML = '<p class="no-cards-info">暂无知识卡片。</p>';
        console.log('知识卡片容器已清空');
      }
      
      // 设置一个标记，防止页面刷新后恢复数据
      try {
        await chrome.storage.local.set({
          'act-nav-data-cleared': true,
          'act-nav-clear-timestamp': Date.now()
        });
        console.log('已设置数据清除标记');
      } catch (markError) {
        console.error('设置清除标记失败:', markError);
      }
      
      console.log('问题目录数据已完全清除');
      
      // 显示清除成功提示
      this.showNotification('问题目录已彻底清除，刷新页面不会恢复', 'success');
      
      return true;
    } catch (error) {
      console.error('清除问题目录时出错:', error);
      this.showNotification('清除问题目录时出错', 'error');
      return false;
    }
  }

  /**
   * 清理会话存储
   * 在页面关闭时调用，确保会话数据被清空
   */
  cleanupSessionStorage() {
    try {
      if (this.chatId) {
        const sessionKey = this.getSessionKey();
        sessionStorage.removeItem(sessionKey);
        console.log(`页面关闭时清理会话存储: ${sessionKey}`);
      }
      
      // 清理所有以 act-nav-session- 开头的会话存储键
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('act-nav-session-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`清理会话存储键: ${key}`);
      });
      
      console.log(`页面关闭时清理了 ${keysToRemove.length} 个会话存储键`);
    } catch (error) {
      console.error('清理会话存储时出错:', error);
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `act-nav-notification act-nav-notification-${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * 保存卡片到本地存储
   */
  saveCardToLocalStorage(card) {
    try {
      // 获取现有的本地收藏数据
      const storageKey = 'act-nav-local-library';
      const existingData = localStorage.getItem(storageKey);
      let libraryData = existingData ? JSON.parse(existingData) : [];
      
      if (card.is_collected) {
        // 添加到收藏
        const existingIndex = libraryData.findIndex(item => 
          item.id === card.id || 
          (item.title === card.title && item.content === card.content)
        );
        
        if (existingIndex === -1) {
          // 新卡片，添加到收藏
          const cardToSave = {
            ...card,
            localId: Date.now().toString(), // 本地唯一ID
            addedToLibrary: new Date().toISOString(),
            source: card.source || 'deepseek',
            thread_id: card.thread_id || this.chatId || location.pathname,
            // 保存更多定位信息
            question: card.question || '',
            answer: card.answer || '',
            message_id: card.message_id || null,
            // 保存对话中的位置信息
            conversation_position: this.getConversationPosition(card),
            // 保存页面URL信息
            page_url: window.location.href,
            page_title: document.title,
            // 保存更多页面信息用于定位
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            // 保存完整内容用于显示
            content: card.answer || card.summary || card.question || '无内容',
            // 保存原始字段，用于展开功能
            originalAnswer: card.answer || '',
            originalSummary: card.summary || '',
            originalContent: card.content || '',
            originalDetails: card.details || '',
            originalLogic: card.logic || '',
            originalText: card.text || '',
            // 保存标签信息
            tags: Array.isArray(card.tags) ? card.tags : [],
            // 保存展开状态信息
            hasExpandableContent: (card.answer || card.summary || card.content || '').length > 80
          };
          libraryData.push(cardToSave);
          console.log('新卡片已添加到收藏:', card.title);
        } else {
          // 更新现有卡片
          libraryData[existingIndex] = {
            ...libraryData[existingIndex],
            ...card,
            is_collected: true,
            updatedAt: new Date().toISOString(),
            // 更新定位信息
            conversation_position: this.getConversationPosition(card),
            page_url: window.location.href,
            page_title: document.title,
            // 更新内容信息
            content: card.answer || card.summary || card.question || '无内容',
            originalAnswer: card.answer || '',
            originalSummary: card.summary || '',
            originalContent: card.content || '',
            originalDetails: card.details || '',
            originalLogic: card.logic || '',
            originalText: card.text || '',
            tags: Array.isArray(card.tags) ? card.tags : [],
            hasExpandableContent: (card.answer || card.summary || card.content || '').length > 80
          };
          console.log('现有卡片已更新:', card.title);
        }
      } else {
        // 从收藏中移除
        const removedCount = libraryData.length;
        libraryData = libraryData.filter(item => 
          !(item.id === card.id || 
            (item.title === card.title && item.content === card.content))
        );
        console.log('卡片已从收藏中移除:', card.title, `(移除了 ${removedCount - libraryData.length} 项)`);
      }
      
      // 保存到本地存储
      localStorage.setItem(storageKey, JSON.stringify(libraryData));
      
      // 同时保存到chrome.storage.local（如果可用）
      if (chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ [storageKey]: libraryData });
        } catch (chromeError) {
          console.warn('Chrome存储保存失败:', chromeError);
        }
      }
      
      console.log('收藏库状态已更新，当前共有', libraryData.length, '项收藏');
      
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储获取收藏数据
   */
  getLocalLibraryData() {
    try {
      const storageKey = 'act-nav-local-library';
      const existingData = localStorage.getItem(storageKey);
      return existingData ? JSON.parse(existingData) : [];
    } catch (error) {
      console.error('从本地存储获取数据失败:', error);
      return [];
    }
  }

  /**
   * 获取对话中的位置信息
   */
  getConversationPosition(card) {
    try {
      // 尝试通过问题文本找到对应的对话位置
      if (card.question) {
        // 查找包含问题文本的元素
        const questionElements = document.querySelectorAll('.markdown-body p, .markdown-body div');
        for (let i = 0; i < questionElements.length; i++) {
          const element = questionElements[i];
          if (element.textContent.includes(card.question.trim())) {
            return {
              elementIndex: i,
              elementText: card.question.trim(),
              elementId: element.id || `pos-${i}`,
              timestamp: Date.now()
            };
          }
        }
      }
      
      // 如果找不到问题，尝试通过答案文本定位
      if (card.answer) {
        const answerElements = document.querySelectorAll('.markdown-body p, .markdown-body div');
        for (let i = 0; i < answerElements.length; i++) {
          const element = answerElements[i];
          if (element.textContent.includes(card.answer.trim())) {
            return {
              elementIndex: i,
              elementText: card.answer.trim(),
              elementId: element.id || `pos-${i}`,
              timestamp: Date.now()
            };
          }
        }
      }
      
      // 如果都找不到，返回基本信息
      return {
        elementIndex: -1,
        elementText: card.title || '未知位置',
        elementId: null,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('获取对话位置信息失败:', error);
      return {
        elementIndex: -1,
        elementText: '获取位置失败',
        elementId: null,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 定位到收藏的对话位置
   */
  scrollToCollectionPosition(collectionData) {
    try {
      console.log('尝试定位到收藏位置:', collectionData);
      
      // 等待页面内容加载完成
      const waitForContent = () => {
        return new Promise((resolve) => {
          const checkContent = () => {
            const markdownBody = document.querySelector('.markdown-body');
            if (markdownBody && markdownBody.children.length > 0) {
              resolve(true);
            } else {
              setTimeout(checkContent, 100);
            }
          };
          checkContent();
        });
      };
      
      // 异步定位，等待内容加载
      waitForContent().then(() => {
        this.performScrollToPosition(collectionData);
      });
      
      return true; // 立即返回成功，表示开始定位
      
    } catch (error) {
      console.error('定位到收藏位置失败:', error);
      this.showNotification?.('定位失败: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 执行具体的定位逻辑
   */
  performScrollToPosition(collectionData) {
    try {
      console.log('执行定位逻辑:', collectionData);
      
      // 确保页面布局样式正确应用
      this.ensureLayoutStyles();
      
      // 方法1: 通过保存的元素ID定位
      if (collectionData.conversation_position && collectionData.conversation_position.elementId) {
        const targetElement = document.getElementById(collectionData.conversation_position.elementId);
        if (targetElement) {
          this.scrollToElement(targetElement, collectionData.title);
          return true;
        }
      }
      
      // 方法2: 通过问题文本搜索定位（更精确的搜索）
      if (collectionData.question) {
        const questionText = collectionData.question.trim();
        const questionElements = document.querySelectorAll('.markdown-body p, .markdown-body div, .markdown-body li');
        for (const element of questionElements) {
          if (element.textContent.includes(questionText) && questionText.length > 10) {
            this.scrollToElement(element, collectionData.title);
            return true;
          }
        }
      }
      
      // 方法3: 通过答案文本搜索定位
      if (collectionData.answer) {
        const answerText = collectionData.answer.trim();
        const answerElements = document.querySelectorAll('.markdown-body p, .markdown-body div, .markdown-body li');
        for (const element of answerElements) {
          if (element.textContent.includes(answerText) && answerText.length > 20) {
            this.scrollToElement(element, collectionData.title);
            return true;
          }
        }
      }
      
      // 方法4: 通过标题文本搜索定位
      if (collectionData.title) {
        const titleText = collectionData.title.trim();
        const titleElements = document.querySelectorAll('.markdown-body p, .markdown-body div, .markdown-body li, h1, h2, h3, h4, h5, h6');
        for (const element of titleElements) {
          if (element.textContent.includes(titleText) && titleText.length > 5) {
            this.scrollToElement(element, collectionData.title);
            return true;
          }
        }
      }
      
      // 方法5: 通过内容片段搜索定位
      if (collectionData.content) {
        const contentText = collectionData.content.trim();
        if (contentText.length > 30) {
          const contentElements = document.querySelectorAll('.markdown-body p, .markdown-body div, .markdown-body li');
          for (const element of contentElements) {
            if (element.textContent.includes(contentText.substring(0, 50))) {
              this.scrollToElement(element, collectionData.title);
              return true;
            }
          }
        }
      }
      
      // 如果都找不到，显示提示
      this.showNotification?.('未找到对应的对话位置，可能页面已更新', 'warning');
      return false;
      
    } catch (error) {
      console.error('执行定位逻辑失败:', error);
      this.showNotification?.('定位失败: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 确保页面布局样式正确应用
   */
  ensureLayoutStyles() {
    try {
      // 强制应用布局样式到所有可能的容器
      const containers = document.querySelectorAll(`
        .main-content, 
        .ds-container, 
        .ds-chat-container,
        [class*="chat-container"],
        [class*="main-content"],
        [class*="container"]:not(#act-nav-sidebar):not(.act-nav-*),
        body > div:not(#act-nav-sidebar):not(.act-nav-*),
        body > main:not(#act-nav-sidebar):not(.act-nav-*),
        body > section:not(#act-nav-sidebar):not(.act-nav-*)
      `);
      
      containers.forEach(container => {
        if (container && !container.classList.contains('act-nav-*')) {
          container.style.marginRight = '240px';
          container.style.width = 'calc(100% - 240px)';
          container.style.maxWidth = 'calc(100% - 240px)';
          container.style.transition = 'margin-right 0.3s ease, width 0.3s ease, max-width 0.3s ease';
        }
      });
      
      console.log('已强制应用布局样式到', containers.length, '个容器');
      
    } catch (error) {
      console.error('应用布局样式失败:', error);
    }
  }

  /**
   * 监听页面变化，自动应用布局样式
   */
  setupLayoutObserver() {
    try {
      // 创建MutationObserver监听DOM变化
      const layoutObserver = new MutationObserver((mutations) => {
        let shouldApplyStyles = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // 检查是否添加了新的聊天容器
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches && (
                  node.matches('.markdown-body') ||
                  node.matches('[class*="chat"]') ||
                  node.matches('[class*="container"]')
                )) {
                  shouldApplyStyles = true;
                }
              }
            });
          }
        });
        
        if (shouldApplyStyles) {
          // 延迟应用样式，确保DOM完全加载
          setTimeout(() => {
            this.ensureLayoutStyles();
          }, 100);
        }
      });
      
      // 开始监听
      layoutObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('布局监听器已设置');
      
    } catch (error) {
      console.error('设置布局监听器失败:', error);
    }
  }

  /**
   * 滚动到指定元素并高亮
   */
  scrollToElement(element, title) {
    try {
      // 平滑滚动到目标元素
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // 高亮目标元素
      this.highlightElement(element);
      
      // 显示成功提示
      this.showNotification?.(`已定位到: ${title}`, 'success');
      
      console.log('成功定位到元素:', title);
      
    } catch (error) {
      console.error('滚动到元素失败:', error);
      // 降级处理：使用简单滚动
      element.scrollIntoView({ block: 'center' });
    }
  }

  /**
   * 高亮目标元素
   */
  highlightElement(element) {
    try {
      // 移除之前的高亮
      const previousHighlights = document.querySelectorAll('.act-nav-highlight');
      previousHighlights.forEach(el => {
        el.classList.remove('act-nav-highlight');
      });
      
      // 添加高亮样式
      element.classList.add('act-nav-highlight');
      
      // 3秒后自动移除高亮
      setTimeout(() => {
        element.classList.remove('act-nav-highlight');
      }, 3000);
      
    } catch (error) {
      console.error('高亮元素失败:', error);
    }
  }

  /**
   * 删除收藏项
   */
  async deleteCollectionItem(itemId, collectionData) {
    try {
      console.log('删除收藏项:', itemId, collectionData);
      
      // 方法1: 如果有云端ID，尝试从云端删除
      if (collectionData.id && this.supabase) {
        try {
          const res = await this.supabase.invokeFunction('set-collect-state', { 
            body: { id: collectionData.id, desired: false } 
          });
          if (res && !res.error) {
            console.log('已从云端删除收藏项');
          }
        } catch (error) {
          console.warn('从云端删除失败，继续本地删除:', error);
        }
      }
      
      // 方法2: 从本地存储删除
      const storageKey = 'act-nav-local-library';
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        let libraryData = JSON.parse(existingData);
        libraryData = libraryData.filter(item => 
          item.id !== itemId && 
          item.localId !== itemId &&
          !(item.title === collectionData.title && item.content === collectionData.content)
        );
        localStorage.setItem(storageKey, JSON.stringify(libraryData));
        console.log('已从本地存储删除收藏项');
      }
      
      // 方法3: 从chrome.storage.local删除
      if (chrome.storage && chrome.storage.local) {
        try {
          const result = await chrome.storage.local.get([storageKey]);
          if (result[storageKey]) {
            let libraryData = result[storageKey];
            libraryData = libraryData.filter(item => 
              item.id !== itemId && 
              item.localId !== itemId &&
              !(item.title === collectionData.title && item.content === collectionData.content)
            );
            await chrome.storage.local.set({ [storageKey]: libraryData });
            console.log('已从chrome.storage.local删除收藏项');
          }
        } catch (error) {
          console.warn('从chrome.storage.local删除失败:', error);
        }
      }
      
      // 更新当前页面的收藏状态
      this.updateLocalCollectionStatus(collectionData, false);
      
      this.showNotification?.('收藏已删除', 'success');
      return true;
      
    } catch (error) {
      console.error('删除收藏项失败:', error);
      this.showNotification?.('删除失败: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 更新本地收藏状态
   */
  updateLocalCollectionStatus(collectionData, isCollected) {
    try {
      // 查找页面中对应的知识卡片
      const cards = document.querySelectorAll('.act-nav-card');
      cards.forEach(card => {
        const title = card.querySelector('.act-nav-card-title')?.textContent;
        const content = card.querySelector('.act-nav-card-text')?.textContent;
        
        if (title === collectionData.title || content === collectionData.content) {
          const collectBtn = card.querySelector('.act-nav-card-collect');
          if (collectBtn) {
            collectBtn.textContent = isCollected ? '★ 已收藏' : '☆ 收藏';
            collectBtn.classList.toggle('is-collected', isCollected);
            collectBtn.title = isCollected ? '取消收藏' : '收藏此知识卡片';
          }
        }
      });
    } catch (error) {
      console.error('更新本地收藏状态失败:', error);
    }
  }

  /**
   * 基于 (chatId + text.trim().slice(0,200)) 生成稳定哈希（32 位整数转 36 进制即可）
   */
  makeMsgKey(text) {
    const chatId = this.currentChatId || this.chatId || this.extractChatId() || '';
    const s = (String(text || '')).trim().slice(0, 200) + '|' + chatId;
    // 简易 32 位 hash（FNV1a 变体）
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  }

  /**
   * 将 `act-nav-pending-${key} = Date.now()` 写入 sessionStorage
   */
  setPending(text) {
    try {
      const key = this.makeMsgKey(text);
      sessionStorage.setItem('act-nav-pending-' + key, String(Date.now()));
      this._lastPendingKey = key; // 可选：便于调试
      console.log('[ActNav] setPending:', key);
      return key;
    } catch (e) {
      console.warn('setPending failed:', e);
      return null;
    }
  }

  /**
   * 若 `Date.now() - stored < TTL`，则从 sessionStorage 移除该 key 并返回 true；否则返回 false
   */
  isPendingAndConsume(text) {
    try {
      const key = this.makeMsgKey(text);
      const ts = Number(sessionStorage.getItem('act-nav-pending-' + key));
      if (ts && Date.now() - ts < this.PENDING_DEDUP_TTL) {
        sessionStorage.removeItem('act-nav-pending-' + key);
        console.log('[ActNav] hit pending, consume & skip:', key);
        return true;
      }
    } catch (e) {
      console.warn('isPendingAndConsume failed:', e);
    }
    return false;
  }

  /**
   * 初始化时清理过期 pending key
   */
  prunePendingKeys() {
    try {
      const prefix = 'act-nav-pending-';
      const now = Date.now();
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const ts = Number(sessionStorage.getItem(k));
          if (!ts || now - ts >= this.PENDING_DEDUP_TTL) {
            sessionStorage.removeItem(k);
          }
        }
      }
      console.log('[ActNav] prunePendingKeys done');
    } catch (e) {
      console.warn('prunePendingKeys failed:', e);
    }
  }
}

// 插入删除按钮样式和知识卡片样式
(function injectActNavStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* ——— 目录条目 + 删除按钮 ——— */
    .act-nav-question {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-right: 8px;
    }
    .act-nav-delete-btn {
      opacity: 0.3;
      background: none;
      border: none;
      color: #f33;
      font-size: 16px;
      cursor: pointer;
      margin-left: 8px;
      transition: opacity 0.2s;
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
      padding: 0 4px;
      line-height: 1;
      border-radius: 2px;
    }
    .act-nav-question:hover .act-nav-delete-btn { opacity: 1; background: #fff3; }
    .act-nav-delete-btn:focus { outline: 1px solid #f33; }

    /* ——— 容器：兼容 id 和旧 class ——— */
    #act-nav-cards-container,
    .cards-container {
      margin-top: 10px;
      max-height: 300px;
      overflow-y: auto;
    }

    /* ——— 卡片容器：兼容 .act-nav-card 与旧 .knowledge-card ——— */
    .act-nav-card,
    .knowledge-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }
    .act-nav-card:hover,
    .knowledge-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateY(-1px);
    }

    /* ——— 卡片头部/标题 ——— */
    .act-nav-card-header,
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }
    .act-nav-card-title,
    .card-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      line-height: 1.4;
      word-break: break-word;
    }

    /* ——— 正文/摘要（多种字段都美化） ——— */
    .act-nav-card-text,
    .act-nav-card-answer,
    .act-nav-card-question,
    .card-summary {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #6c757d;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ——— 标签区 ——— */
    .act-nav-card-tags,
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .act-nav-card-tags .tag,
    .tag {
      background: #e9ecef;
      color: #495057;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 10px;
      line-height: 1.2;
      white-space: nowrap;
    }

    /* ——— 卡片操作区（收藏/删除/加入库） ——— */
    .act-nav-card-actions,
    .card-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }

    /* 收藏按钮（新版本） */
    .act-nav-card-collect {
      background: none;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s;
      opacity: 0.9;
    }
    .act-nav-card-collect:hover { opacity: 1; }
    .act-nav-card-collect.is-collected {
      border-color: #ffd166;
      background: #fff7e0;
      color: #e09b00;
    }

    /* 旧版本的“加入知识库/删除”按钮（可选） */
    .card-add-to-library-btn,
    .card-delete-btn {
      opacity: 0.3;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      transition: opacity 0.2s;
      padding: 0 4px;
      line-height: 1;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .card-add-to-library-btn { color: #28a745; }
    .card-delete-btn { color: #dc3545; }
    .knowledge-card:hover .card-add-to-library-btn,
    .knowledge-card:hover .card-delete-btn,
    .act-nav-card:hover .card-add-to-library-btn,
    .act-nav-card:hover .card-delete-btn { opacity: 1; background: #fff3; }
    .card-add-to-library-btn:focus { outline: 1px solid #28a745; }
    .card-delete-btn:focus { outline: 1px solid #dc3545; }
    .card-add-to-library-btn:disabled { cursor: not-allowed; opacity: .5; }

    /* ——— 空/错误提示 ——— */
    .no-cards-info {
      text-align: center;
      color: #6c757d;
      font-style: italic;
      margin: 20px 0;
    }
    .error-info {
      text-align: center;
      color: #dc3545;
      font-style: italic;
      margin: 20px 0;
    }

    /* ——— 通知 ——— */
    .act-nav-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      z-index: 2147483648;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    }
    .act-nav-notification-success { background: #28a745; }
    .act-nav-notification-error { background: #dc3545; }
    .act-nav-notification-info { background: #17a2b8; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }

    /* ——— 加载态 ——— */
    .act-nav-loading {
      text-align: center;
      color: #6c757d;
      margin: 20px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .act-nav-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #e9ecef;
      border-top: 2px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();


// 确保插件只初始化一次
let actNavInstance = null;

// 初始化函数
function initializeActNav() {
  if (actNavInstance) {
    console.log('插件已经初始化，跳过重复初始化');
    return;
  }
  
  console.log('初始化插件...');
  console.log('当前URL:', window.location.href);
  console.log('当前hostname:', window.location.hostname);
  
  // 初始化插件
  actNavInstance = new ActNav();
  
  // 创建 MutationObserver 监听 URL 变化
  const urlChangeObserver = new MutationObserver(() => {
    if (actNavInstance) {
      // 每次URL变化时，调用 init() 方法
      actNavInstance.init();
    }
  });
  
  // 启动 URL 变化监听
  urlChangeObserver.observe(document.body, { childList: true, subtree: true });
  console.log('URL变化监听已启动');
  
  console.log('插件初始化完成');
}

// 定义初始化处理函数
function handleInitialization() {
  console.log('DOM已加载，准备初始化插件...');
  console.log('当前URL:', window.location.href);
  
  // 检查是否已经初始化
  if (actNavInstance) {
    console.log('插件已经初始化，跳过重复初始化');
    return;
  }
  
  // 初始化插件
  initializeActNav();
}

// 等待DOM完全加载后初始化插件
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded事件触发');
  handleInitialization();
});

// 如果DOM已经加载完成，立即初始化
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM已经加载，立即初始化插件...');
  console.log('当前document.readyState:', document.readyState);
  // 使用setTimeout确保只初始化一次
  setTimeout(handleInitialization, 0);
}