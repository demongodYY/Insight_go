# ActNav 去重机制优化说明

## 优化目标

1. **当用户输入问题并点击发送时，只提取一次**，不要等 AI 回答时重复提取
2. **允许相同文本的问题在目录中多次记录**，满足用户重复提问的需求
3. **保持原有功能不变**，包括知识卡片提取、侧边栏显示和跳转等

## 主要修改

### 1. 删除基于文本内容的去重逻辑

#### a) 注释掉 `recentlyProcessedQuestions` 相关代码
```javascript
// 在构造函数中
// this.recentlyProcessedQuestions = null; // 注释掉：允许相同文本多次记录

// 在 setup() 方法中
// if (this.recentlyProcessedQuestions) {
//   this.recentlyProcessedQuestions.clear();
//   console.log('已清空重复处理记录');
// }

// 在 URL 变化处理中
// if (this.recentlyProcessedQuestions) {
//   this.recentlyProcessedQuestions.clear();
//   console.log('URL变化时已清空重复处理记录');
// }

// 在对话切换处理中
// if (this.recentlyProcessedQuestions) {
//   this.recentlyProcessedQuestions.clear();
//   console.log('对话切换时已清空重复处理记录');
// }
```

#### b) 注释掉基于 `pendingQuestionText` 的文本去重逻辑
```javascript
// 在 processUserMessage 方法中
// 注释掉：使用 data-act-nav-processed 属性进行更精确的去重
// if (this.pendingQuestionText && this.pendingQuestionTimestamp) {
//   const timeDiff = Date.now() - this.pendingQuestionTimestamp;
//   const textMatch = this.pendingQuestionText.trim() === messageText.trim();
//   
//   // 如果时间差小于2秒且文本匹配，说明这是同一个问题，跳过处理
//   if (timeDiff < 2000 && textMatch) {
//     console.log(`跳过重复处理的问题: ${messageText.substring(0, 50)}... (已有待处理的问题)`);
//     return;
//   }
// }
```

#### c) 简化 `handleQuestionSubmit` 方法
```javascript
// 删除不再需要的标记设置和清理
// this.pendingQuestionText = questionText;
// this.pendingQuestionTimestamp = Date.now();
// 
// // 清除待处理标记
// this.pendingQuestionText = null;
// this.pendingQuestionTimestamp = null;
```

### 2. 强化基于 DOM 元素的去重机制

#### a) 在 `handleQuestionSubmit` 中标记元素
```javascript
// 给对应消息元素加 data-act-nav-processed 属性，标记已处理
lastUserMessage.setAttribute('data-act-nav-processed', '1');
if (key) lastUserMessage.setAttribute('data-act-nav-mid', key);
```

#### b) 在 `processUserMessage` 中检查标记
```javascript
// 已处理的 DOM，直接跳过
if (messageElement && messageElement.getAttribute && messageElement.getAttribute('data-act-nav-processed') === '1') {
  return;
}

// 检查元素是否已经通过 handleQuestionSubmit 处理过
if (messageElement.hasAttribute('data-act-nav-processed')) {
  console.log('检测到已通过提交按钮处理过的消息，跳过处理');
  return;
}
```

#### c) 基于元素唯一性的去重
```javascript
// 检查元素是否已经处理过（通过检查是否已有ID）
if (messageElement.id && messageElement.id.startsWith('act-nav-')) {
  // 如果不是当前 chatId，移除 id 和 data-chatid
  if (messageElement.getAttribute('data-chatid') !== this.chatId) {
    messageElement.removeAttribute('id');
    messageElement.removeAttribute('data-chatId');
  } else {
    // 已经处理过且 chatId 匹配，不需要重复处理
    return;
  }
}
```

## 去重机制层次

### 第一层：DOM 元素标记去重
- 使用 `data-act-nav-processed='1'` 标记已处理的元素
- 使用 `data-act-nav-mid=<key>` 关联 pending key
- 最直接、最可靠的去重方式

### 第二层：元素 ID 和 chatId 去重
- 基于元素的唯一标识符
- 支持对话切换时的状态管理
- 防止同一元素被重复处理

### 第三层：短时 pending 去重
- 使用 sessionStorage 存储 pending 状态
- TTL 20秒，跨重载有效
- 拦截同一次提交引起的重复渲染

## 优势

### 1. 精确控制
- 只在用户主动提交时添加问题
- 避免 AI 回答和 DOM 变化导致的重复提取
- 基于元素唯一性，而非文本内容

### 2. 支持重复提问
- 相同文本可以多次记录
- 满足用户实际使用需求
- 保持对话历史的完整性

### 3. 性能优化
- 减少不必要的文本比较
- 避免重复的 DOM 操作
- 更高效的去重判断

### 4. 状态一致性
- 支持对话切换
- 跨页面重载保持去重状态
- 自动清理过期数据

## 工作流程

### 1. 用户提交问题
```
用户输入 → 点击发送 → handleQuestionSubmit → setPending → 添加到目录 → 标记 DOM 元素
```

### 2. AI 回答触发 DOM 变化
```
Observer 检测到变化 → processUserMessage → 检查 data-act-nav-processed → 跳过已处理元素
```

### 3. 相同文本再次提问
```
用户再次输入相同问题 → 超过 TTL → 正常添加到目录 → 新的 DOM 元素被标记
```

## 调试信息

所有关键操作都有清晰的日志输出：
- `准备添加新问题: <text>` - 开始处理新问题
- `检测到已通过提交按钮处理过的消息，跳过处理` - 跳过已处理元素
- `[ActNav] setPending: <key>` - 设置 pending 标记
- `[ActNav] hit pending, consume & skip: <key>` - 命中 pending，跳过处理

## 总结

通过这次优化，我们实现了：

1. ✅ **精确的一次性提取**：用户提交时只记录一次，AI 回答不重复提取
2. ✅ **支持重复提问**：相同文本可以多次记录，满足用户需求
3. ✅ **保持原有功能**：知识卡片、侧边栏、跳转等功能完全不变
4. ✅ **更高效的去重**：基于 DOM 元素唯一性，而非文本内容比较
5. ✅ **跨会话有效**：sessionStorage 确保重载后去重仍然有效

现在的去重机制更加精确、高效，同时保持了灵活性，完全满足你的需求！
