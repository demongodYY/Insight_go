# delete-knowledge-cards

删除指定对话的知识卡片。

## 功能

- 删除指定chatIds对应的所有知识卡片
- 支持批量删除多个对话的知识卡片
- 包含CORS支持

## 使用方法

发送POST请求到云函数端点，请求体格式：

```json
{
  "chatIds": ["chat1", "chat2", "chat3"]
}
```

## 响应

成功时返回：
```json
{
  "success": true
}
```

失败时返回：
```json
{
  "error": "错误信息"
}
```

## 权限要求

需要SUPABASE_SERVICE_ROLE_KEY权限来删除数据库记录。
