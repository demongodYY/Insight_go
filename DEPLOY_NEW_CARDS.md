# 新知识卡片生成功能部署说明

## 概述

本次升级实现了改进的知识卡片生成功能，主要特点：

- **融合问题+回答**：每张卡片都包含问题背景和AI回答要点
- **智能主题拆分**：按主题自动拆分对话内容
- **结构化输出**：生成标题、摘要、标签的完整卡片
- **严格JSON格式**：确保输出格式的一致性

## 需要部署的文件

### 1. 新的云函数
```
supabase/functions/generate-cards/
├── index.ts          # 主函数文件
└── README.md         # 说明文档
```

### 2. 更新的前端代码
- `content.js` - 已更新，调用新的云函数
- 支持新的卡片结构（title, summary, tags）

## 部署步骤

### 步骤 1：部署新的云函数

```bash
# 进入项目目录
cd your-project-directory

# 部署新的云函数（包含CORS修复）
supabase functions deploy generate-cards

# 验证部署状态
supabase functions list
```

**注意**：如果遇到CORS错误，可以使用提供的部署脚本：
- Linux/Mac: `./deploy-fix-cors.sh`
- Windows: `deploy-fix-cors.bat`

### 步骤 2：配置环境变量

在 Supabase 项目设置中配置以下环境变量：

1. 进入 Supabase Dashboard
2. 选择你的项目
3. 进入 Settings > Edge Functions
4. 添加环境变量：
   - `SILICONFLOW_API_KEY`: 你的 SiliconFlow API 密钥

### 步骤 3：测试新功能

使用提供的测试页面验证功能：

1. 打开 `test-new-cards.html`
2. 输入测试对话内容
3. 点击"生成知识卡片"按钮
4. 验证生成的卡片格式

## 功能验证

### 1. 云函数部署验证

```bash
# 测试云函数是否正常响应
curl -X POST "https://your-project.supabase.co/functions/v1/generate-cards" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "用户：什么是人工智能？\nAI：人工智能是...",
    "max_cards": 3
  }'
```

### 2. 前端集成验证

1. 在浏览器中打开任意AI对话页面
2. 确保插件已加载
3. 点击"提取知识卡片"按钮
4. 验证生成的卡片包含：
   - 标题（≤12字）
   - 摘要（100-150字）
   - 标签（2-4个）

## 回退方案

如果新功能出现问题，可以快速回退：

### 1. 回退云函数

```bash
# 删除新函数
supabase functions delete generate-cards

# 重新部署旧函数
supabase functions deploy generate-summary
```

### 2. 回退前端代码

在 `content.js` 中将调用改回：

```javascript
// 改回旧的调用
const result = await this.supabase.invokeFunction('generate-summary', {
  body: { chatId: this.chatId, conversationText }
});
```

## 监控和日志

### 1. 云函数日志

```bash
# 查看云函数日志
supabase functions logs generate-cards

# 实时监控日志
supabase functions logs generate-cards --follow
```

### 2. 前端日志

在浏览器控制台中查看：
- 适配器加载状态
- 整页抽取结果
- 云函数调用状态
- 卡片渲染结果

## 性能优化建议

### 1. 云函数优化

- 设置合适的 `max_tokens` 限制
- 使用 `response_format: { type: "json_object" }` 确保格式
- 实现智能文本分段处理

### 2. 前端优化

- 实现卡片懒加载
- 添加卡片缓存机制
- 优化大量卡片的渲染性能

## 故障排除

### 常见问题

1. **CORS 跨域错误**
   - 错误信息：`Access to fetch at '...' has been blocked by CORS policy`
   - 解决方案：重新部署云函数（已修复CORS配置）
   - 运行：`./deploy-fix-cors.sh` (Linux/Mac) 或 `deploy-fix-cors.bat` (Windows)

2. **云函数调用失败**
   - 检查环境变量配置
   - 验证 API 密钥有效性
   - 查看云函数日志

3. **卡片生成失败**
   - 检查对话文本格式
   - 验证 JSON 解析逻辑
   - 查看备用解析机制

4. **前端渲染异常**
   - 检查卡片数据结构
   - 验证 CSS 样式兼容性
   - 查看浏览器控制台错误

### 调试命令

```bash
# 查看云函数状态
supabase functions list

# 查看环境变量
supabase secrets list

# 重新部署函数
supabase functions deploy generate-cards --no-verify-jwt
```

## 总结

新功能部署完成后，用户将获得：

- 更准确的知识卡片（融合问题+回答）
- 更丰富的卡片信息（标题、摘要、标签）
- 更智能的内容分析（主题自动拆分）
- 更稳定的输出格式（严格JSON）

所有功能都保持向后兼容，确保现有用户不受影响。
