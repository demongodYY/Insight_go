# Generate Cards Function

这个 Supabase Edge Function 用于从完整的用户与AI对话中生成知识卡片。

## 功能特点

- **融合问题+回答**：每张卡片都包含问题背景和AI回答要点
- **智能主题拆分**：按主题自动拆分对话内容
- **结构化输出**：生成标题、摘要、标签的完整卡片
- **严格JSON格式**：确保输出格式的一致性
- **备用解析机制**：当JSON解析失败时自动回退

## API 接口

### 请求方法
POST

### 请求体
```json
{
  "text": "完整的对话文本",
  "max_cards": 5,
  "chatId": "对话ID（可选）"
}
```

### 响应格式
```json
{
  "cards": [
    {
      "title": "卡片标题（≤12字）",
      "summary": "卡片摘要（100-150字）",
      "tags": ["标签1", "标签2", "标签3"]
    }
  ]
}
```

## 使用示例

### JavaScript/TypeScript
```typescript
const { data, error } = await supabase.functions.invoke('generate-cards', {
  body: {
    text: "用户：什么是人工智能？\nAI：人工智能是...",
    max_cards: 3,
    chatId: "chat-123"
  }
});

if (data?.cards) {
  console.log('生成的卡片:', data.cards);
}
```

### cURL
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-cards" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "用户：什么是人工智能？\nAI：人工智能是...",
    "max_cards": 3
  }'
```

## 环境变量

需要在 Supabase 项目设置中配置：

- `SILICONFLOW_API_KEY`: SiliconFlow API 密钥

## 部署

```bash
supabase functions deploy generate-cards
```

## 错误处理

- 400: 对话文本为空
- 500: 内部错误（API调用失败、解析失败等）

## 技术细节

- 使用 DeepSeek-V3 模型进行内容分析
- 支持长文本分段处理
- 智能标签提取和分类
- 多重解析保障机制
