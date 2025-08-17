# 会话存储功能升级说明

## 问题描述

在之前的版本中，插件使用持久化存储（chrome.storage.local）来保存问题目录，这导致：
1. 刷新页面后侧边栏会重复提取目录，产生重复问题
2. 关闭页面后目录数据仍然保留
3. 重新打开页面时会加载旧的问题数据

## 解决方案

我们将插件的存储机制从持久化存储改为会话存储（sessionStorage），实现：
1. 刷新页面后侧边栏不会重复提取目录（避免重复问题）
2. 关闭页面后目录清空
3. 重新打开页面时侧边栏重新提取问题形成目录

## 主要修改

### 1. 新增会话存储方法

#### `saveQuestionsToSession()` 方法
```javascript
saveQuestionsToSession() {
  try {
    const sessionKey = this.getSessionKey();
    
    if (this.questions.length > 0) {
      const questionsData = this.questions.map(q => ({
        id: q.id,
        text: q.text,
        fullText: q.fullText,
        timestamp: q.timestamp
      }));
      
      sessionStorage.setItem(sessionKey, JSON.stringify(questionsData));
      console.log(`保存 ${this.questions.length} 个问题到会话存储 ${sessionKey}`);
    }
  } catch (error) {
    console.error('保存问题到会话存储失败:', error);
  }
}
```

#### `getSessionKey()` 方法
```javascript
getSessionKey() {
  if (!this.chatId) {
    this.extractChatId();
  }
  
  const key = `act-nav-session-questions-${this.chatId || 'default'}`;
  return key;
}
```

### 2. 修改问题添加逻辑

将 `addQuestion()` 方法中的存储调用改为会话存储：
```javascript
// 修改前
this.saveQuestions();

// 修改后
this.saveQuestionsToSession();
```

### 3. 修改问题恢复逻辑

`restoreQuestions()` 方法现在优先从会话存储恢复：
```javascript
// 优先从会话存储恢复问题（当前会话的数据）
const sessionKey = this.getSessionKey();
const sessionData = sessionStorage.getItem(sessionKey);

if (sessionData) {
  const parsedData = JSON.parse(sessionData);
  if (Array.isArray(parsedData)) {
    this.questions = parsedData.map(q => ({
      ...q,
      chatId: this.chatId
    }));
    
    // 恢复问题后，标记已存在的DOM元素，防止重复处理
    this.markExistingElements();
    return this.questions.length;
  }
}

// 如果会话存储中没有数据，尝试从持久化存储恢复（向后兼容）
// ... 原有的持久化存储恢复逻辑
```

### 4. 修改URL变化时的数据保存

将URL变化时保存旧对话问题的逻辑改为会话存储：
```javascript
// 修改前
const oldStorageKey = `act-nav-questions-${oldChatId}`;
chrome.storage.local.set({
  [oldStorageKey]: this.questions.map(q => ({...}))
});

// 修改后
const oldSessionKey = `act-nav-session-questions-${oldChatId}`;
const questionsData = this.questions.map(q => ({...}));
sessionStorage.setItem(oldSessionKey, JSON.stringify(questionsData));
```

### 5. 添加页面卸载时的清理逻辑

在构造函数中添加页面卸载事件监听：
```javascript
// 监听页面卸载事件，清理会话存储
window.addEventListener('beforeunload', () => {
  this.cleanupSessionStorage();
});

// 监听页面隐藏事件，作为页面关闭的备用检测
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    setTimeout(() => {
      if (document.visibilityState === 'hidden') {
        this.cleanupSessionStorage();
      }
    }, 1000);
  }
});
```

#### `cleanupSessionStorage()` 方法
```javascript
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
```

## 存储机制对比

### 修改前（持久化存储）
- **存储方式**: `chrome.storage.local`
- **数据持久性**: 永久保存，除非手动清除
- **页面刷新**: 数据保留，可能导致重复问题
- **页面关闭**: 数据保留，下次打开仍存在
- **跨会话**: 数据在不同会话间共享

### 修改后（会话存储）
- **存储方式**: `sessionStorage`
- **数据持久性**: 仅在当前会话期间有效
- **页面刷新**: 数据保留，但不会重复提取
- **页面关闭**: 数据自动清空
- **跨会话**: 每次新会话都是干净的开始

## 功能特点

### 1. 避免重复问题
- 刷新页面时，会话存储中的数据会被恢复，但不会重复提取DOM中的问题
- 每个问题都有唯一的ID和时间戳，确保不会重复记录

### 2. 会话级别的数据隔离
- 每个浏览器会话都有独立的问题目录
- 不同标签页之间不会相互影响
- 关闭页面后数据自动清理

### 3. 向后兼容
- 保留了原有的持久化存储方法
- 如果会话存储中没有数据，会尝试从持久化存储恢复
- 支持数据清除标记机制

### 4. 智能清理
- 页面卸载时自动清理会话存储
- 页面隐藏时延迟清理，确保数据不丢失
- 支持手动清除所有数据

## 使用场景

### 1. 正常使用流程
1. 用户打开AI对话页面
2. 插件自动提取页面中的问题，形成目录
3. 用户刷新页面，目录保持不变（不会重复提取）
4. 用户关闭页面，目录数据自动清空
5. 用户重新打开页面，插件重新提取问题形成新目录

### 2. 对话切换
1. 用户在同一个页面切换不同对话
2. 旧对话的问题保存到会话存储
3. 新对话的问题从会话存储恢复（如果存在）
4. 每个对话都有独立的问题目录

### 3. 数据清理
1. 用户点击"清除数据"按钮
2. 清除当前内存中的问题
3. 清除会话存储中的数据
4. 清除持久化存储中的数据
5. 设置清除标记，防止数据恢复

## 测试验证

使用 `test-session-storage.html` 文件可以测试会话存储功能：

1. **添加测试问题**: 点击"添加测试问题"按钮，添加问题到会话存储
2. **刷新页面**: 点击"刷新页面"按钮，验证会话存储数据保留
3. **模拟关闭页面**: 点击"模拟关闭页面"按钮，验证会话存储被清理
4. **检查存储状态**: 点击"检查存储状态"按钮，查看当前存储情况

## 注意事项

### 1. 浏览器兼容性
- `sessionStorage` 在现代浏览器中广泛支持
- 需要确保浏览器支持 `beforeunload` 和 `visibilitychange` 事件

### 2. 数据丢失风险
- 会话存储的数据在页面关闭后会丢失
- 如果用户意外关闭页面，当前会话的问题目录会丢失
- 建议在重要对话中及时保存关键信息

### 3. 多标签页行为
- 每个标签页都有独立的会话存储
- 不同标签页之间不会共享问题目录
- 这确保了每个对话的独立性

### 4. 性能影响
- 会话存储的读写性能优于持久化存储
- 减少了与Chrome扩展API的交互
- 提高了插件的响应速度

## 兼容性

- 完全向后兼容现有功能
- 支持所有已支持的AI对话平台
- 自动处理新旧数据格式
- 保持所有已实现特性

## 日志和调试

插件会在控制台输出详细的会话存储日志：
- 问题保存到会话存储的过程
- 问题从会话存储恢复的过程
- 页面关闭时的清理过程
- 错误和异常情况的处理

这些日志有助于调试和了解插件的运行状态。

## 未来优化建议

1. **智能数据备份**: 在页面关闭前自动备份重要数据
2. **会话恢复**: 支持恢复意外关闭的会话数据
3. **数据同步**: 在不同标签页间同步问题目录
4. **存储优化**: 优化会话存储的数据结构
5. **清理策略**: 实现更智能的存储清理策略
