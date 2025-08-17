# ActNav 稳健去重机制实现说明

## 总体目标

1. **只在"用户提交时"添加目录**：Observer 仅用于补历史或非提交路径的情况
2. **用 sessionStorage 做"短时去重"**：跨内容脚本重载也有效；TTL 建议 20 秒
3. **允许相同文本在之后再次提问时入录**：超过 TTL 即可入录，不做长期文本去重

## 新增工具函数

### 1. makeMsgKey(text)
- 基于 `(chatId + text.trim().slice(0,200))` 生成稳定哈希
- 使用 FNV1a 变体算法，32 位整数转 36 进制
- 确保相同文本在同一对话中生成相同的 key

### 2. setPending(text)
- 将 `act-nav-pending-${key} = Date.now()` 写入 sessionStorage
- 返回生成的 key，便于调试和标记 DOM 元素
- 在 `handleQuestionSubmit` 中调用，设置短时去重标记

### 3. isPendingAndConsume(text)
- 若 `Date.now() - stored < TTL`，则从 sessionStorage 移除该 key 并返回 true
- 否则返回 false
- 在 `processUserMessage` 中调用，拦截同一次提交引起的再次渲染

### 4. prunePendingKeys()
- 初始化时清理过期 pending key
- 在 `init()` 和 `setup()` 中调用，确保每次加载都清理过期数据

## 核心逻辑流程

### 提交路径：handleQuestionSubmit
```javascript
// 1. 先设置"短时去重"标记（跨 reload 生效）
const key = this.setPending(questionText);

// 2. 执行"添加到目录"的既有逻辑（保持立即落地效果）
this.addQuestion(questionText, lastUserMessage);

// 3. 给当前 DOM 打标，防止同节点被 Observer 再处理
lastUserMessage.setAttribute('data-act-nav-processed', '1');
if (key) lastUserMessage.setAttribute('data-act-nav-mid', key);
```

### 观察者路径：processUserMessage
```javascript
// 1. 已处理的 DOM，直接跳过
if (messageElement.getAttribute('data-act-nav-processed') === '1') {
  return;
}

// 2. 提取文本
const messageText = this.extractMessageText(messageElement);

// 3. 关键：若命中"同一次提交"的 pending，跳过 Observer 的重复添加
if (this.isPendingAndConsume(messageText)) {
  messageElement.setAttribute('data-act-nav-processed', '1');
  return;
}

// 4. 只有在不属于"当前 pending"的情况下，才继续走"添加到目录"的逻辑
this.addQuestion(messageText, messageElement);
messageElement.setAttribute('data-act-nav-processed', '1');
```

## 关键特性

### 1. 短时去重窗口
- TTL 设置为 20 秒
- 同一次提交期间，AI 回答/DOM 再渲染被跳过
- 跨内容脚本重载有效（使用 sessionStorage）

### 2. 允许重复提问
- 相同文本在超过 TTL 后可以再次入录
- 不做长期文本去重，满足用户需求

### 3. 稳健的 DOM 标记
- 使用 `data-act-nav-processed='1'` 标记已处理元素
- 使用 `data-act-nav-mid=<key>` 关联 pending key
- 防止 Observer 重复处理同一元素

### 4. 自动清理机制
- 每次初始化时自动清理过期 pending key
- 避免 sessionStorage 积累过多无用数据

## 调试信息

所有关键操作都有 console.log 输出：
- `[ActNav] setPending: <key>` - 设置 pending 标记
- `[ActNav] hit pending, consume & skip: <key>` - 命中 pending，跳过处理
- `[ActNav] prunePendingKeys done` - 清理完成

## 使用场景

1. **用户提交问题**：立即添加到目录，设置 pending 标记
2. **AI 回答触发 DOM 变化**：Observer 检测到，但被 pending 拦截
3. **页面刷新/重载**：pending 标记仍然有效，防止重复添加
4. **20 秒后再次提问**：pending 已过期，允许正常添加

## 优势

1. **精确控制**：只在用户主动提交时添加，避免 AI 回答干扰
2. **跨会话有效**：sessionStorage 确保重载后去重仍然有效
3. **性能优化**：避免重复处理相同内容，减少不必要的计算
4. **用户体验**：允许用户重复提问，满足实际使用需求
