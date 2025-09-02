/**
 * 配置文件
 * 用于管理API密钥和其他配置项
 */

const CONFIG = {
  // DeepSeek API配置
  DEEPSEEK: {
    API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
    MODEL: 'deepseek-ai/DeepSeek-V3',
    MAX_TOKENS: 3000,
    TEMPERATURE: 0.7,
    API_KEY: 'sk-9c52484408e245d799bf984bebaa30df' // 默认API密钥
  },
  
  // SiliconFlow API配置（用于代理DeepSeek API）
  SILICONFLOW: {
    API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
    MODEL: 'deepseek-ai/DeepSeek-V3',
    MAX_TOKENS: 3000,
    TEMPERATURE: 0.7,
    API_KEY: 'sk-9c52484408e245d799bf984bebaa30df' // 默认API密钥
  },
  
  // 其他配置
  UI: {
    NOTIFICATION_DURATION: 5000,
    LOADING_TIMEOUT: 30000
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
