# 🚀 Insight Go - 智能浏览器扩展

> 一个强大的浏览器扩展，集成多平台AI助手，为你的浏览体验提供智能支持

## ✨ 功能特性

### 🤖 多平台AI助手支持
- **DeepSeek** - 深度思考AI助手
- **豆包** - 字节跳动AI助手  
- **Kimi** - 月之暗面AI助手
- **智能适配器** - 自动识别并适配不同AI平台

### 🎯 核心功能
- **智能内容注入** - 自动识别网页内容并生成AI响应
- **本地存储管理** - 安全的数据存储和同步
- **现代化UI界面** - 响应式设计，支持深色/浅色主题
- **Supabase集成** - 云端数据同步和用户管理
- **知识卡片系统** - 智能问答和知识管理

## 🛠️ 技术架构

### 前端技术
- **JavaScript/TypeScript** - 核心开发语言
- **Chrome Extension API** - 浏览器扩展功能
- **CSS3** - 现代化样式设计
- **HTML5** - 语义化标记

### 后端服务
- **Supabase** - 数据库和认证服务
- **本地存储** - IndexedDB和LocalStorage
- **适配器模式** - 灵活的AI服务集成

## 📦 安装说明

### 开发者安装
```bash
# 克隆仓库
git clone https://github.com/demongodYY/Insight_go.git

# 进入项目目录
cd Insight_go

# 安装依赖（如果有package.json）
npm install
```

### 浏览器安装
1. 下载项目文件
2. 打开Chrome扩展管理页面 (`chrome://extensions/`)
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 🚀 使用方法

### 基本操作
1. **安装扩展** - 按照安装说明完成安装
2. **配置AI助手** - 在设置页面配置你的AI API密钥
3. **开始使用** - 在任意网页上点击扩展图标
4. **智能问答** - 选择内容，AI助手将提供智能回答

### 高级功能
- **知识卡片** - 创建和管理个人知识库
- **数据同步** - 通过Supabase同步数据到云端
- **自定义设置** - 个性化扩展行为

## 📁 项目结构

```
insight-go-extension/
├── content-scripts/          # 内容脚本
│   └── adapters/            # AI适配器
│       ├── deepseekAdapter.ts
│       ├── doubaoAdapter.ts
│       ├── kimiAdapter.ts
│       └── siteAdapter.ts
├── lib/                     # 核心库文件
│   ├── library.html
│   ├── library.js
│   └── supabaseClient.js
├── ui/                      # 用户界面
│   ├── options.html
│   └── options.js
├── icons/                   # 扩展图标
├── background.js            # 后台脚本
├── content.js               # 内容脚本
├── popup.js                 # 弹窗脚本
├── manifest.json            # 扩展清单
└── README.md               # 项目文档
```

## 🔧 配置说明

### 环境变量
```javascript
// config.js
const config = {
  SUPABASE_URL: 'your-supabase-url',
  SUPABASE_ANON_KEY: 'your-supabase-key',
  AI_API_KEYS: {
    deepseek: 'your-deepseek-key',
    doubao: 'your-doubao-key',
    kimi: 'your-kimi-key'
  }
};
```

### AI服务配置
- **DeepSeek**: 需要API密钥和端点URL
- **豆包**: 需要字节跳动开发者账号
- **Kimi**: 需要月之暗面API访问权限

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint代码规范
- 添加适当的注释和文档
- 确保代码测试覆盖率

## 📝 更新日志

### v1.0.0 (最新)
- ✨ 初始版本发布
- 🚀 多平台AI助手集成
- 🎨 现代化UI设计
- 🔧 完整的扩展功能

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- **Chrome Extension API** - 浏览器扩展支持
- **Supabase** - 后端服务支持
- **AI服务提供商** - DeepSeek、豆包、Kimi等

## 📞 联系方式

- **项目主页**: [https://github.com/demongodYY/Insight_go](https://github.com/demongodYY/Insight_go)
- **问题反馈**: [Issues](https://github.com/demongodYY/Insight_go/issues)
- **功能建议**: [Discussions](https://github.com/demongodYY/Insight_go/discussions)

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！
