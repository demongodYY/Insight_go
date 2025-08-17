#!/bin/bash

# 修复CORS问题的部署脚本
echo "🚀 开始部署修复CORS问题的云函数..."

# 检查是否在正确的目录
if [ ! -f "supabase/functions/generate-cards/index.ts" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 部署云函数
echo "📦 部署 generate-cards 云函数..."
supabase functions deploy generate-cards --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ 云函数部署成功！"
    echo ""
    echo "🔧 现在需要重新加载浏览器页面来测试："
    echo "1. 刷新或重新打开AI对话页面"
    echo "2. 点击'提取知识卡片'按钮"
    echo "3. 检查是否还有CORS错误"
    echo ""
    echo "📋 如果仍有问题，请检查："
    echo "- 云函数是否成功部署"
    echo "- 浏览器控制台错误信息"
    echo "- 网络请求状态"
else
    echo "❌ 云函数部署失败！"
    echo "请检查："
    echo "- Supabase CLI 是否正确安装"
    echo "- 是否已登录 Supabase"
    echo "- 项目配置是否正确"
fi
