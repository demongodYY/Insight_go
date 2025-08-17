-- 创建知识卡片表
CREATE TABLE IF NOT EXISTS knowledge_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- 用户标识符
  title TEXT NOT NULL, -- 卡片标题
  content TEXT, -- 卡片内容
  summary TEXT, -- 摘要
  category TEXT, -- 分类
  tags TEXT[], -- 标签数组
  source TEXT, -- 来源页面
  chat_id TEXT, -- 对话ID
  platform TEXT, -- 平台标识 (deepseek, kimi, openai, doubao)
  metadata JSONB, -- 额外元数据
  is_favorite BOOLEAN DEFAULT false, -- 是否收藏
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表（可选，用于多用户支持）
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL, -- 用户标识符
  email TEXT, -- 邮箱（可选）
  name TEXT, -- 用户名（可选）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_user_id ON knowledge_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_category ON knowledge_cards(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_platform ON knowledge_cards(platform);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_created_at ON knowledge_cards(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_chat_id ON knowledge_cards(chat_id);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_search ON knowledge_cards USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, ''))
);

-- 启用行级安全策略（RLS）
ALTER TABLE knowledge_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能访问自己的数据
CREATE POLICY "Users can view own knowledge cards" ON knowledge_cards
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own knowledge cards" ON knowledge_cards
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own knowledge cards" ON knowledge_cards
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own knowledge cards" ON knowledge_cards
  FOR DELETE USING (auth.uid()::text = user_id);

-- 创建策略：用户只能访问自己的用户信息
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 创建函数来更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_knowledge_cards_updated_at 
  BEFORE UPDATE ON knowledge_cards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建函数来生成用户ID（如果没有认证）
CREATE OR REPLACE FUNCTION generate_anonymous_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'anon_' || substr(md5(random()::text), 1, 16);
END;
$$ language 'plpgsql';

-- 插入示例数据（可选）
-- INSERT INTO knowledge_cards (user_id, title, content, category, tags, source, platform) 
-- VALUES 
--   ('demo_user', '示例知识卡片', '这是一个示例知识卡片的内容', '技术', ARRAY['示例', '技术'], 'https://example.com', 'deepseek');
