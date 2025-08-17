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
  console.log('get-knowledge-cards 函数开始执行，请求方法:', req.method);
  
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    console.log('处理CORS预检请求');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. 获取请求参数 ---
    console.log('开始解析请求体...');
    const { chatId } = await req.json();
    console.log('get-knowledge-cards 收到请求，chatId:', chatId);
    
    if (!chatId) {
      const errorMsg = "缺少必需的chatId参数";
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- 2. 初始化Supabase客户端 ---
    console.log('开始检查环境变量...');
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore - Ignore TypeScript errors for Deno.env in local development
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY");

    console.log('get-knowledge-cards 环境变量检查:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      const missingVars = [];
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

    console.log('环境变量检查通过，开始初始化Supabase客户端...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // --- 3. 从数据库查询知识卡片 ---
    console.log('开始查询数据库，chatId:', chatId);
    
    const { data: cards, error: dbError } = await supabaseAdmin
      .from('knowledge_cards')
      .select('point, logic')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (dbError) {
      console.error('查询知识卡片失败:', dbError);
      return new Response(JSON.stringify({ error: `数据库查询失败: ${dbError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    console.log('数据库查询结果:', { cardsCount: cards?.length || 0, cards });

    // --- 4. 返回查询结果 ---
    const response = { 
      cards: cards || [],
      count: cards ? cards.length : 0
    };
    
    console.log('get-knowledge-cards 返回响应:', response);
    
    return new Response(JSON.stringify(response), {
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
