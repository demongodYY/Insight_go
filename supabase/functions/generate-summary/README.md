# AI对话总结 Edge Function

## 功能说明

这个Edge Function用于为"即刻导航"插件生成AI对话总结。它会：

1. 接收对话内容和对话ID
2. 调用硅基流动平台的DeepSeek-V3模型生成总结
3. 将总结保存到Supabase数据库
4. 返回总结结果给前端

## 环境变量配置

在Supabase仪表盘的Settings > Edge Functions中，需要设置以下环境变量：

- `SILICONFLOW_API_KEY`: 硅基流动平台的API密钥
- `SILICONFLOW_BASE_URL`: 硅基流动平台的API基础URL
- `SUPABASE_URL`: 你的Supabase项目URL
- `SERVICE_ROLE_KEY`: Supabase服务角色密钥（用于数据库写入）

## 数据库表结构

需要创建一个名为`summaries`的表，包含以下字段：

```sql
CREATE TABLE summaries (
  id SERIAL PRIMARY KEY,
  chat_id TEXT UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_summaries_updated_at 
    BEFORE UPDATE ON summaries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 部署命令

在项目根目录执行：

```bash
supabase functions deploy generate-summary --no-verify-jwt
```

注意：`--no-verify-jwt`参数是必需的，因为浏览器插件无法提供JWT令牌。

## 测试

部署完成后，可以通过以下方式测试：

1. 在浏览器插件中点击"生成对话总结"按钮
2. 检查浏览器控制台的日志输出
3. 查看Supabase数据库中的summaries表

## 错误处理

函数包含完整的错误处理机制：

- API调用失败时会返回详细的错误信息
- 数据库写入失败不会中断总结生成流程
- 所有错误都会记录到控制台日志中
