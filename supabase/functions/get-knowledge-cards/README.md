# Get Knowledge Cards Function

这个Supabase Edge Function用于获取指定对话ID的知识卡片。

## 功能

- 根据chatId查询已保存的知识卡片
- 返回结构化的知识卡片数据
- 支持CORS跨域请求

## 使用方法

### 请求

```javascript
const { data, error } = await supabase.functions.invoke('get-knowledge-cards', {
  body: { chatId: 'your-chat-id' }
});
```

### 请求参数

- `chatId` (string, 必需): 对话的唯一标识符

### 响应格式

```json
{
  "cards": [
    {
      "point": "核心知识点",
      "logic": "逻辑解释"
    }
  ],
  "count": 1
}
```

### 响应字段

- `cards` (array): 知识卡片数组，每个卡片包含point和logic字段
- `count` (number): 卡片总数

## 环境变量

- `SUPABASE_URL`: Supabase项目URL
- `SERVICE_ROLE_KEY`: Supabase服务角色密钥

## 数据库表

函数查询 `knowledge_cards` 表，该表应包含以下字段：
- `chat_id`: 对话ID
- `point`: 知识点
- `logic`: 逻辑解释
- `created_at`: 创建时间（自动排序）
