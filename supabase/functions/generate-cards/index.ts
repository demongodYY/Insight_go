// supabase/functions/generate-cards/index.ts (Deno Edge Function)
import { serve } from "https://deno.land/std/http/server.ts";

type Card = { 
  title: string; 
  summary: string; 
  tags: string[]; 
};

type Payload = { 
  text: string; 
  max_cards?: number;
  chatId?: string;
};

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const SYS = `你是"知识卡片提炼器"。从完整的用户与AI对话中，
按"主题"拆分并生成3-5张卡片。每张卡片必须融合问题与回答的关键信息。

要求：
- title：<=12字，直指主题（如"川西旅游攻略""清明赏花点""Python异常处理"）
- summary：100-150字，信息密度高，融合问题背景和AI回答要点，可直接复用
- tags：2-4个，短标签（技术领域/应用场景/关键词等）

提取策略：
1. 识别对话中的核心主题
2. 将相关问题与回答合并分析
3. 提炼出可独立使用的知识点
4. 确保每张卡片信息完整且实用

仅输出严格JSON：{"cards":[{"title":"","summary":"","tags":["",""]}]}
不要输出任何解释性文字。`;

const USR = (text: string, max = 5) => `请基于下方"完整对话文本"提取不超过${max}张卡片。
若主题高度相近可合并。每张卡片要体现问题与回答的完整信息。

完整对话文本：
${text}

请生成${max}张知识卡片：`;

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, max_cards = 5, chatId } = await req.json() as Payload;
    
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        cards: [], 
        error: "对话文本不能为空" 
      }), { 
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    const prompt = USR(text, Math.min(Math.max(max_cards, 3), 5));
    console.log(`开始生成知识卡片，chatId: ${chatId}, 文本长度: ${text.length}`);

    // 调用 SiliconFlow Chat Completions（DeepSeek-V3）
    const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SILICONFLOW_API_KEY")!}`
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          { role: "system", content: SYS }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API调用失败: ${response.status} ${errorText}`);
      throw new Error(`API调用失败: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    
    console.log(`API返回原始内容: ${raw.substring(0, 200)}...`);
    
    const parsed = safeParse(raw);
    
    if (parsed.cards.length === 0) {
      console.warn("解析结果为空，尝试备用解析方法");
      const fallback = fallbackParse(raw);
      if (fallback.cards.length > 0) {
        console.log("备用解析成功");
        parsed.cards = fallback.cards;
      }
    }

    console.log(`成功生成 ${parsed.cards.length} 张卡片`);
    
    return new Response(JSON.stringify(parsed), { 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
    
  } catch (e) {
    console.error("生成知识卡片失败:", e);
    return new Response(JSON.stringify({ 
      cards: [], 
      error: String(e) 
    }), { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});

function safeParse(raw: string): { cards: Card[] } {
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j.cards)) {
      const cards = j.cards
        .map((c: any) => ({
          title: String(c.title || '未命名').slice(0, 24),
          summary: String(c.summary || '').slice(0, 500),
          tags: Array.isArray(c.tags) ? c.tags.slice(0, 6).map(String) : []
        }))
        .filter(c => c.title && c.summary);
      return { cards };
    }
  } catch (e) {
    console.error("JSON解析失败:", e);
  }
  return { cards: [] };
}

function fallbackParse(raw: string): { cards: Card[] } {
  try {
    // 尝试提取JSON部分
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return safeParse(jsonMatch[0]);
    }
    
    // 尝试提取卡片信息
    const cards: Card[] = [];
    const lines = raw.split('\n');
    let currentCard: Partial<Card> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('title:') || trimmed.startsWith('标题:')) {
        if (currentCard.title && currentCard.summary) {
          cards.push(currentCard as Card);
          currentCard = {};
        }
        currentCard.title = trimmed.replace(/^(title|标题):\s*/i, '').slice(0, 24);
      } else if (trimmed.startsWith('summary:') || trimmed.startsWith('摘要:')) {
        currentCard.summary = trimmed.replace(/^(summary|摘要):\s*/i, '').slice(0, 500);
      } else if (trimmed.startsWith('tags:') || trimmed.startsWith('标签:')) {
        const tagsText = trimmed.replace(/^(tags|标签):\s*/i, '');
        currentCard.tags = tagsText.split(/[,，;；]/).map(t => t.trim()).filter(t => t).slice(0, 6);
      }
    }
    
    if (currentCard.title && currentCard.summary) {
      cards.push(currentCard as Card);
    }
    
    return { cards };
  } catch (e) {
    console.error("备用解析失败:", e);
  }
  return { cards: [] };
}
