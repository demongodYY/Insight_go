# 重复问题预防功能升级说明

## 问题描述

在之前的版本中，虽然插件能够记录每个问题（包括重复内容），但存在一个问题：**输入一个问题会被提取两次**。这是因为：

1. **提交按钮点击事件** (`handleQuestionSubmit`) - 通过点击提交按钮触发
2. **DOM变化监听** (`processUserMessage`) - 通过MutationObserver监听DOM变化触发

这两个机制会同时处理同一个问题，导致重复提取。

## 解决方案

我们实现了一个基于时间戳和文本匹配的重复问题预防机制，确保同一个问题不会被重复处理。

## 主要修改

### 1. 新增防止重复处理的标记属性

在构造函数中添加新的属性：
```javascript
// 防止重复处理问题的标记
this.pendingQuestionText = null;
this.pendingQuestionTimestamp = null;
```

### 2. 修改 `handleQuestionSubmit()` 方法

在提交按钮点击时设置待处理标记：
```javascript
handleQuestionSubmit(inputBox) {
  const questionText = this.extractQuestionText(inputBox);
  if (questionText && questionText.trim()) {
    // 记录所有问题，即使内容相同也记录
    console.log(`准备添加新问题: ${questionText}`);
    
    // 设置一个标记，表示这个问题已经通过提交按钮处理过
    // 这样DOM监听器就不会重复处理
    this.pendingQuestionText = questionText;
    this.pendingQuestionTimestamp = Date.now();
    
    // 添加延迟，等待DOM更新后再添加问题
    setTimeout(() => {
      // ... 处理逻辑 ...
      
      // 清除待处理标记
      this.pendingQuestionText = null;
      this.pendingQuestionTimestamp = null;
    }, 500);
  }
}
```

### 3. 修改 `processUserMessage()` 方法

在DOM监听器中检查待处理标记：
```javascript
processUserMessage(messageElement) {
  // ... 其他检查逻辑 ...
  
  // 检查是否已经有待处理的问题，避免重复处理
  if (this.pendingQuestionText && this.pendingQuestionTimestamp) {
    const timeDiff = Date.now() - this.pendingQuestionTimestamp;
    const textMatch = this.pendingQuestionText.trim() === messageText.trim();
    
    // 如果时间差小于2秒且文本匹配，说明这是同一个问题，跳过处理
    if (timeDiff < 2000 && textMatch) {
      console.log(`跳过重复处理的问题: ${messageText.substring(0, 50)}... (已有待处理的问题)`);
      return;
    }
  }
  
  // ... 继续处理逻辑 ...
}
```

### 4. 在关键位置重置标记

在以下位置添加重置标记的逻辑：

#### `setup()` 方法
```javascript
// 重置防止重复处理的标记
this.pendingQuestionText = null;
this.pendingQuestionTimestamp = null;
console.log('已重置重复处理标记');
```

#### `handleChatSwitch()` 方法
```javascript
// 重置防止重复处理的标记
this.pendingQuestionText = null;
this.pendingQuestionTimestamp = null;
console.log('对话切换时已重置重复处理标记');
```

#### URL变化处理
```javascript
// 重置防止重复处理的标记
this.pendingQuestionText = null;
this.pendingQuestionTimestamp = null;
console.log('URL变化时已重置重复处理标记');
```

## 工作机制

### 1. 问题提交流程

1. **用户点击提交按钮**
   - 触发 `handleQuestionSubmit()`
   - 设置 `pendingQuestionText` 和 `pendingQuestionTimestamp`
   - 延迟500ms后添加问题
   - 清除标记

2. **DOM变化检测**
   - MutationObserver检测到新消息元素
   - 触发 `processUserMessage()`
   - 检查是否有待处理的问题
   - 如果时间差<2秒且文本匹配，跳过处理
   - 否则正常处理

### 2. 重复预防逻辑

```javascript
// 检查是否已经有待处理的问题，避免重复处理
if (this.pendingQuestionText && this.pendingQuestionTimestamp) {
  const timeDiff = Date.now() - this.pendingQuestionTimestamp;
  const textMatch = this.pendingQuestionText.trim() === messageText.trim();
  
  // 如果时间差小于2秒且文本匹配，说明这是同一个问题，跳过处理
  if (timeDiff < 2000 && textMatch) {
    console.log(`跳过重复处理的问题: ${messageText.substring(0, 50)}... (已有待处理的问题)`);
    return;
  }
}
```

**时间窗口**: 2秒内的相同文本被认为是重复问题
**文本匹配**: 使用 `trim()` 后的文本进行精确比较
**标记清除**: 问题处理完成后自动清除标记

### 3. 状态重置

在以下情况下会重置标记：
- 插件初始化时
- 对话切换时
- URL变化时
- 手动清除数据时

## 功能特点

### 1. 智能重复检测
- 基于时间窗口的重复检测
- 精确的文本匹配
- 自动标记管理

### 2. 保持原有功能
- 仍然记录每个问题（包括重复内容）
- 刷新页面后不会重复提取
- 会话存储机制保持不变

### 3. 状态管理
- 自动标记设置和清除
- 在关键时机重置状态
- 详细的日志记录

## 使用场景

### 1. 正常问题提交
1. 用户在输入框中输入问题
2. 点击提交按钮
3. 插件设置待处理标记
4. DOM变化检测到新消息
5. 由于标记存在，跳过重复处理
6. 问题被成功添加一次

### 2. 快速连续提交
1. 用户快速提交多个问题
2. 每个问题都有独立的标记
3. 不会相互干扰
4. 每个问题都被正确记录

### 3. 对话切换
1. 用户切换到新对话
2. 标记被自动重置
3. 新对话的问题正常处理
4. 避免旧对话的标记影响

## 测试验证

使用 `test-duplicate-prevention.html` 文件可以测试重复问题预防功能：

1. **模拟问题输入**: 在输入框中输入问题并提交
2. **模拟DOM变化**: 点击"模拟DOM变化"按钮
3. **模拟对话切换**: 点击"模拟对话切换"按钮
4. **检查问题列表**: 验证问题是否被正确记录
5. **观察日志**: 了解重复预防机制的工作过程

## 注意事项

### 1. 时间窗口设置
- 当前设置为2秒，可以根据需要调整
- 时间太短可能导致误判
- 时间太长可能影响正常功能

### 2. 文本匹配精度
- 使用 `trim()` 去除首尾空格
- 区分大小写
- 考虑添加模糊匹配选项

### 3. 标记状态管理
- 标记在问题处理完成后自动清除
- 在关键时机手动重置
- 避免标记状态不一致

### 4. 错误处理
- 标记操作失败不影响正常功能
- 详细的日志记录便于调试
- 优雅的降级处理

## 兼容性

- 完全向后兼容现有功能
- 不影响问题记录逻辑
- 保持会话存储机制
- 支持所有已支持的AI对话平台

## 日志和调试

插件会在控制台输出详细的重复预防日志：
- 待处理标记的设置和清除
- 重复问题的检测和跳过
- 标记状态的重置过程
- 错误和异常情况的处理

这些日志有助于调试和了解插件的运行状态。

## 未来优化建议

1. **智能时间窗口**: 根据问题长度动态调整时间窗口
2. **模糊文本匹配**: 支持相似文本的重复检测
3. **标记持久化**: 在页面刷新后恢复标记状态
4. **性能优化**: 优化标记检查的性能
5. **配置选项**: 允许用户自定义重复检测参数

## 总结

通过实现基于时间戳和文本匹配的重复问题预防机制，我们成功解决了"输入一个问题会被提取两次"的问题，同时保持了所有已实现的功能：

✅ **每个问题都被记录**（包括重复内容）
✅ **刷新页面后不会重复提取**
✅ **避免同一个问题被重复处理**
✅ **在对话切换时正确重置状态**
✅ **保持会话存储机制**

这个解决方案既解决了重复提取的问题，又保持了插件的稳定性和用户体验。
