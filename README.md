# My Time App

[中文](./README.md) | [English](./README.en.md)

> 这是一个基于 Expo + React Native 的个人时间管理应用，当前以归档开源形式提供，适合学习与二次开发。

## 1. 项目定位

My Time App 聚焦“学习场景下的时间管理”，将任务管理、课程安排、学习反馈与成长面板整合到同一个移动端应用中。

核心目标：

- 把每天的学习计划结构化（任务 + 课程）
- 让执行结果可量化（完成情况、时长统计、趋势图表）
- 用 AI 辅助提取与排程，降低录入和整理成本

## 2. 核心功能

### 2.1 日程模块

- 任务与课程双模型管理
- 日历条、列表视图、多种交互组件
- 可扩展的数据存储层（本地 + Supabase）

### 2.2 学习成长模块

- 竞赛成长面板（CP）
- 英语学习成长面板
- 结合行为记录做阶段统计和可视化

### 2.3 个人中心与统计

- 个人资料与设置
- 每日/周维度学习时长统计
- 趋势图与基础成就数据展示

### 2.4 AI 能力

- 全局 AI 助手入口
- 文本解析、课表/计划理解、排程辅助
- 通过 prompts + service 分层组织，便于替换模型与供应商

## 3. 技术栈

- Expo 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- Zustand
- i18next + react-i18next
- Supabase

## 4. 目录结构（关键部分）

- app/：页面路由与 Tab 结构
- components/：通用 UI 与功能组件
- hooks/：跨页面逻辑复用
- modules/：业务模块（auth、schedule、ai、cp、english、timer、themes）
- locales/：中英文文案字典
- utils/：基础能力（i18n、supabase、audio、secrets）
- scripts/：开发辅助脚本
- supabase_setup.sql / cleanup_zombies.sql / refactor_db.sql：数据库脚本

## 5. 环境要求

- Node.js 20 及以上（推荐 LTS）
- npm 10 及以上
- Expo CLI（通过 npx 使用即可）
- 可用的 Supabase 项目（如需云端能力）

## 6. 快速开始

### 6.1 安装依赖

```bash
npm install
```

### 6.2 配置环境变量

复制 .env.example 为 .env，然后按需填写。

必填：

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

可选（部分功能增强）：

- EXPO_PUBLIC_DEEPSEEK_API_KEY
- EXPO_PUBLIC_BAIDU_API_KEY
- EXPO_PUBLIC_BAIDU_SECRET_KEY
- EXPO_PUBLIC_BACKEND_URL（历史兼容字段，可不配置）

### 6.3 初始化数据库

首次接入 Supabase 时，执行项目中的 SQL 脚本：

1. supabase_setup.sql（基础初始化）
2. refactor_db.sql（结构重构）
3. cleanup_zombies.sql（数据清理辅助）

请先阅读脚本注释，再在自己的数据库环境执行。

### 6.4 启动项目

```bash
npm run start
```

常用命令：

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## 7. 国际化说明

- 默认语言：中文（zh）
- 支持语言：中文（zh）、英文（en）
- 文案来源：locales/zh.json 与 locales/en.json
- 语言设置：utils/i18n.ts + 个人设置页

新增文案时建议：

1. 同步更新中英文 key
2. 避免硬编码 UI 文案
3. 保持命名按模块聚合（如 profile.settingsModal.xxx）

## 8. 架构与二次开发建议

- 新增业务优先放入 modules/ 下独立目录
- UI 与状态逻辑分离：组件只负责展示，复杂逻辑放 hooks/store
- AI 能力走 modules/ai 的 prompts + services 结构，便于审计和替换
- 涉及密钥与敏感信息，一律使用环境变量或远端 secrets 管理

## 9. 常见问题

### 9.1 启动失败或白屏

- 先检查 .env 是否完整
- 执行 npm install 后重启 Expo
- 清理缓存：npx expo start -c

### 9.2 数据库相关报错

- 确认 Supabase URL 和匿名 Key 正确
- 确认已执行初始化 SQL
- 检查表结构是否与当前代码一致

### 9.3 i18n 文案不生效

- 确认 key 在两个 locale 文件都存在
- 重启 Metro 或清理缓存后重试

## 10. 安全与合规

- 仓库不包含真实生产凭证
- 不要提交任何 .env、私钥、服务账号信息
- 生产部署前请自行完成安全审计（鉴权、限流、日志脱敏）

## 11. 维护状态

- 当前状态：Archive（不承诺持续维护）
- 接受 Fork 与自定义演进

## 12. License

本项目使用仓库内 LICENSE 文件声明的许可协议。
