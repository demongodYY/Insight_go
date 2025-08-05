# 即刻导航 (Act-Nav)

> 为deepseek生成实时对话目录，让你瞬间定位任何历史信息，心流不再中断

## 🚀 最新更新

- 修复了问题记录功能，现在可以正确捕获用户提问
- 优化了锚点定位系统，支持精准跳转到对应问题位置
- 改进了DOM选择器，适配deepseek最新的页面结构
- 增强了高亮效果，使导航更加直观

## 🌟 功能特性

### 核心功能
- **自动注入与激活**: 仅在 `chat.deepseek.com` 域名下自动激活
- **问题提取与目录生成**: 实时监听用户提问，自动生成对话目录
- **锚点定位与平滑跳转**: 点击目录条目平滑滚动到对应对话位置
- **智能去重**: 自动识别重复问题，避免目录冗余

### UI/UX 特性
- **极简设计**: 与deepseek风格保持一致
- **自动适配**: 支持深浅色模式自动切换
- **可折叠侧边栏**: 240px宽度，可收起/展开，记住用户偏好
- **响应式设计**: 适配不同屏幕尺寸
- **平滑动画**: 滚动定位和高亮效果

### 技术特性
- **状态持久化**: 使用Chrome存储API保存目录数据和用户偏好
- **DOM监听**: 使用MutationObserver监测页面变化
- **精准定位**: 考虑deepseek动态加载特性，实现稳定滚动定位
- **性能优化**: 防抖处理，避免频繁DOM操作

## 📦 安装说明

### 方法一：开发者模式安装（推荐）

1. **下载源码**
   ```bash
   git clone https://github.com/your-username/act-nav.git
   cd act-nav
   ```

2. **打开Chrome扩展管理页面**
   - 在Chrome地址栏输入：`chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 右上角打开"开发者模式"开关

4. **加载插件**
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

5. **验证安装**
   - 插件图标出现在工具栏
   - 访问 `https://chat.deepseek.com` 测试功能

### 方法二：打包安装

1. **打包扩展**
   ```bash
   # 在项目根目录执行
   zip -r act-nav.zip . -x "*.git*" "README.md" "*.DS_Store"
   ```

2. **安装打包文件**
   - 将生成的 `act-nav.zip` 拖拽到 `chrome://extensions/` 页面

## 🚀 使用方法

### 基本使用

1. **访问DeepSeek**
   - 打开 `https://chat.deepseek.com`
   - 插件自动激活，右侧出现侧边栏

2. **开始对话**
   - 正常与AI对话
   - 每个问题自动添加到目录

3. **导航定位**
   - 点击侧边栏中的问题条目
   - 页面平滑滚动到对应位置
   - 目标位置会有高亮效果

### 高级功能

1. **侧边栏控制**
   - 点击侧边栏右上角的收起/展开按钮
   - 状态会自动保存

2. **插件管理**
   - 点击工具栏插件图标打开管理面板
   - 查看统计信息（问题数量、会话时长）
   - 清除数据或打开侧边栏

3. **快捷键支持**
   - 建议设置快捷键快速打开/关闭侧边栏
   - 在 `chrome://extensions/shortcuts` 中配置

## 🛠️ 技术实现

### 架构设计

```
├── manifest.json          # 插件配置文件
├── content.js            # 主要内容脚本
├── content.css           # 侧边栏样式
├── popup.html            # 弹出窗口HTML
├── popup.css             # 弹出窗口样式
├── popup.js              # 弹出窗口逻辑
└── icons/                # 图标资源
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 核心技术

- **DOM监听**: 使用MutationObserver监听deepseek页面变化
- **事件捕获**: 监听用户提问提交事件
- **锚点系统**: 为每个问题生成唯一ID，实现精准定位
- **状态管理**: Chrome Storage API持久化数据
- **通信机制**: Chrome Runtime API实现弹出窗口与内容脚本通信

### 兼容性

- **浏览器**: Chrome 88+, Edge 88+, 其他Chromium内核浏览器
- **网站**: 专门针对 `chat.deepseek.com` 优化
- **系统**: Windows, macOS, Linux

## 🔧 开发指南

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/act-nav.git
   cd act-nav
   ```

2. **修改代码**
   - 编辑相应文件
   - 在Chrome扩展页面点击"重新加载"

3. **调试**
   - 打开开发者工具查看控制台输出
   - 使用Chrome扩展调试工具

### 构建部署

1. **代码压缩**（可选）
   ```bash
   # 使用工具压缩JS和CSS文件
   npm install -g uglify-js clean-css-cli
   uglifyjs content.js -o content.min.js
   cleancss content.css -o content.min.css
   ```

2. **打包发布**
   ```bash
   zip -r act-nav-v1.0.0.zip . -x "*.git*" "README.md" "*.DS_Store"
   ```

## 🐛 故障排除

### 常见问题

1. **侧边栏不显示**
   - 确认在 `chat.deepseek.com` 页面
   - 检查插件是否已启用
   - 刷新页面重试

2. **问题不自动添加**
   - 检查浏览器控制台是否有错误
   - 确认deepseek页面结构未变化
   - 尝试重新加载插件

3. **滚动定位不准确**
   - 等待页面完全加载
   - 检查是否有动态内容影响布局
   - 刷新页面重试

### 调试模式

1. **启用详细日志**
   - 在 `content.js` 中添加 `console.log` 语句
   - 打开开发者工具查看输出

2. **检查DOM结构**
   - 使用开发者工具检查deepseek页面结构
   - 确认选择器是否正确

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎯 核心导航功能实现
- 🎨 极简UI设计
- 🔧 自动适配深浅色模式
- 💾 状态持久化支持

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. **Fork项目**
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m 'Add amazing feature'`
4. **推送分支**: `git push origin feature/amazing-feature`
5. **提交Pull Request**

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- 感谢DeepSeek提供优秀的AI对话平台
- 感谢Chrome扩展开发社区的支持
- 感谢所有贡献者的付出

## 📞 联系我们

- **GitHub Issues**: [提交问题](https://github.com/your-username/act-nav/issues)
- **邮箱**: your-email@example.com
- **项目地址**: https://github.com/your-username/act-nav

---

⭐ 如果这个项目对你有帮助，请给它一个星标！