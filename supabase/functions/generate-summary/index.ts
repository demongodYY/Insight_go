// Node.js compatible version for Supabase Edge Functions
// This file is designed to work with Supabase Edge Functions runtime
// The Deno imports will work correctly in the Supabase runtime environment

// @ts-ignore - Ignore TypeScript errors for Deno imports in local development
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Ignore TypeScript errors for Deno imports in local development
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 设置CORS头，允许所有来源的请求
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore - Ignore TypeScript errors for Deno runtime
serve(async (req: any) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chatId, conversationText } = await req.json();
    
    // 验证输入参数
    if (!chatId || !conversationText) {
      const errorMsg = `缺少必要参数: chatId=${!!chatId}, conversationText=${!!conversationText}`;
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log('收到请求参数:', { chatId, conversationTextLength: conversationText?.length || 0 });
    
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const siliconflowApiKey = Deno.env.get("SILICONFLOW_API_KEY");
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const apiBaseUrl = Deno.env.get("SILICONFLOW_BASE_URL");
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY");

    console.log('环境变量检查:', {
      hasSiliconflowApiKey: !!siliconflowApiKey,
      hasApiBaseUrl: !!apiBaseUrl,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey
    });

    if (!siliconflowApiKey || !apiBaseUrl || !supabaseUrl || !supabaseServiceKey) {
      const missingVars = [];
      // @ts-ignore - Ignore TypeScript errors for Deno types
      if (!siliconflowApiKey) missingVars.push('SILICONFLOW_API_KEY');
      // @ts-ignore - Ignore TypeScript errors for Deno types
      if (!apiBaseUrl) missingVars.push('SILICONFLOW_BASE_URL');
      // @ts-ignore - Ignore TypeScript errors for Deno types
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      // @ts-ignore - Ignore TypeScript errors for Deno types
      if (!supabaseServiceKey) missingVars.push('SERVICE_ROLE_KEY');
      
      const errorMsg = `关键环境变量未正确设置: ${missingVars.join(', ')}`;
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const fullApiUrl = `${apiBaseUrl}/chat/completions`;

    // 测试数据库连接
    console.log('测试数据库连接...');
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('knowledge_cards')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('数据库连接测试失败:', testError);
        return new Response(JSON.stringify({ error: `数据库连接失败: ${testError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      console.log('数据库连接测试成功');
    } catch (dbTestError) {
      console.error('数据库连接测试异常:', dbTestError);
      return new Response(JSON.stringify({ error: `数据库连接异常: ${dbTestError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const prompt = `
      你是一个信息提取和知识管理专家。请仔细分析以下对话记录，从中提取出3到5个最有价值的核心知识点。
      对于每一个知识点，请遵循以下格式生成一个JSON对象：
      {
        "point": "一句话总结的核心知识点或结论。",
        "logic": "对这个知识点进行简要的背景、原因或逻辑解释，不超过三句话。"
      }
      请将所有这些JSON对象组成一个数组，并只返回这个JSON数组，不要添加任何额外的解释或文字。

      --- 对话记录开始 ---
      ${conversationText}
      --- 对话记录结束 ---
    `;

    console.log('准备调用AI API，URL:', fullApiUrl);
    console.log('发送的prompt长度:', prompt.length);

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${siliconflowApiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [{ "role": "user", "content": prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5,
      })
    });

    console.log('AI API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMsg = `AI API 请求失败: ${response.status} - ${errorBody}`;
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('AI API调用成功，开始解析响应...');
    const result = await response.json();
    console.log('AI API 完整响应:', JSON.stringify(result, null, 2));
    
    const rawContent = result.choices?.[0]?.message?.content;
    console.log('AI 返回的原始内容:', rawContent);
    
    if (!rawContent) {
      const errorMsg = "AI API返回内容为空";
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // --- 关键修复点开始 ---

    // 1. 增加关键日志，查看AI到底返回了什么
    console.log("AI 原始返回内容:", rawContent);

    if (!rawContent) {
      throw new Error("AI服务返回内容为空");
    }

    let knowledgeCards: Array<{point: string, logic: string}> = [];
    try {
        // 2. 智能提取JSON：使用正则表达式从返回文本中找到被[]包裹的JSON数组
        const jsonMatch = rawContent.match(/(\[[\s\S]*\])/);
        
        if (jsonMatch && jsonMatch[0]) {
            console.log("从文本中成功提取到JSON字符串:", jsonMatch[0]);
            knowledgeCards = JSON.parse(jsonMatch[0]);
        } else {
            // 如果正则匹配失败，可能是AI返回了纯净的JSON，直接尝试解析
            console.log("未匹配到JSON数组，尝试直接解析整个返回内容...");
            knowledgeCards = JSON.parse(rawContent);
        }
        
        // 3. 验证解析结果
        if (!Array.isArray(knowledgeCards)) {
            console.error("解析后的内容不是一个数组:", knowledgeCards);
            return new Response(JSON.stringify({ error: "AI返回的JSON格式不正确，根对象不是数组。" }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            });
        }

    } catch (parseError) {
        console.error("解析AI返回的JSON时出错:", parseError);
        console.error("原始内容:", rawContent);
        return new Response(JSON.stringify({ error: `AI服务返回了无法解析的格式: ${parseError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
    }
    
    // --- 关键修复点结束 ---

    // 在插入新卡片前，先删除此对话所有旧的卡片
    console.log('准备删除旧的卡片，chatId:', chatId);
    const { error: deleteError } = await supabaseAdmin.from('knowledge_cards').delete().eq('chat_id', chatId);
    if (deleteError) {
      console.error('删除旧卡片失败:', deleteError);
      return new Response(JSON.stringify({ error: `删除旧卡片失败: ${deleteError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    } else {
      console.log('旧卡片删除成功');
    }

    const cardsToInsert = knowledgeCards.map(card => ({
      chat_id: chatId,
      point: card.point,
      logic: card.logic
    }));

    if (cardsToInsert.length > 0) {
        console.log('准备插入的卡片:', JSON.stringify(cardsToInsert, null, 2));
        const { error: dbError } = await supabaseAdmin.from('knowledge_cards').insert(cardsToInsert);
        if (dbError) {
          console.error('知识卡片存入数据库失败:', dbError);
          return new Response(JSON.stringify({ error: `知识卡片存入数据库失败: ${dbError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        } else {
          console.log('知识卡片存入数据库成功');
        }
    }

    console.log("准备返回知识卡片，数量:", knowledgeCards.length);
    const finalResponse = { cards: knowledgeCards };
    console.log('最终返回给前端的响应:', JSON.stringify(finalResponse, null, 2));
    
    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('云函数执行出错:', error);
    console.error('错误堆栈:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
