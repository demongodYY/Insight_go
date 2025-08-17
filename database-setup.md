# 数据库设置说明

## 需要创建的数据库表

### knowledge_cards 表

这个表用于存储从AI对话中提取的知识卡片。

#### 表结构

```sql
CREATE TABLE knowledge_cards (
  id BIGSERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  point TEXT NOT NULL,
  logic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_knowledge_cards_chat_id ON knowledge_cards(chat_id);
CREATE INDEX idx_knowledge_cards_created_at ON knowledge_cards(created_at);

-- 可选：添加约束
ALTER TABLE knowledge_cards ADD CONSTRAINT knowledge_cards_point_not_empty CHECK (length(trim(point)) > 0);
ALTER TABLE knowledge_cards ADD CONSTRAINT knowledge_cards_logic_not_empty CHECK (length(trim(logic)) > 0);
```

#### 字段说明

- `id`: 主键，自增
- `chat_id`: 对话的唯一标识符，用于关联特定对话
- `point`: 核心知识点或结论，一句话总结
- `logic`: 对知识点的逻辑解释，不超过三句话
- `created_at`: 创建时间，自动设置
- `updated_at`: 更新时间，自动设置

#### 使用场景

1. **存储AI提取的知识卡片**: 当用户点击"提取知识卡片"按钮时，AI会分析对话内容并生成多个知识卡片，这些卡片会被存储到此表中
2. **跨会话持久化**: 用户下次打开同一对话时，之前提取的知识卡片会自动加载并显示
3. **知识管理**: 为每个对话维护结构化的知识点记录

#### 数据示例

```json
{
  "id": 1,
  "chat_id": "chat.deepseek.com-abc123",
  "point": "JavaScript中的闭包可以访问外部函数的作用域",
  "logic": "闭包是JavaScript的一个重要特性，它允许内部函数访问外部函数中定义的变量。这种机制使得函数可以"记住"并访问其创建时的环境。",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## 部署步骤

1. 在Supabase仪表盘中打开SQL编辑器
2. 执行上述CREATE TABLE语句
3. 验证表是否创建成功
4. 确保云函数有权限访问此表（使用SERVICE_ROLE_KEY）

## 注意事项

- `chat_id` 应该与前端生成的对话ID格式保持一致
- 每次生成新的知识卡片时，会先删除该对话的旧卡片，确保数据最新
- 表支持并发访问，适合多用户同时使用
