# My Time App (Archive)

> 本项目已停止维护更新，现以开源归档形式发布，供学习与二次开发参考。

## 项目简介
My Time App 是一个基于 Expo + React Native 的个人时间管理应用，包含以下核心能力：

- 日程管理：任务/课程管理、时间视图、列表视图
- AI 助手：基于 DeepSeek 的排程与文本解析（通过 Supabase secrets 读取密钥）
- 健康状态面板：作息/饮食/主观状态记录与趋势分析
- 成长模块：算法竞赛成长面板、英语学习成长面板

## 适合开源社区的可复用部分

- 通用日程架构（任务 + 课程 + Store + 多视图）
- Expo 端的本地数据 + 云端数据混合模式
- 面向学习场景的成长面板实现（可改造为任意领域）
- AI 交互提示词工程与动作执行框架（需自行审计和加固）

## 技术栈

- Expo 54
- React Native 0.81
- TypeScript
- Zustand
- Supabase

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

复制 `.env.example` 到 `.env` 并填写：

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

可选（仅本地调试）:

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_DEEPSEEK_API_KEY`
- `EXPO_PUBLIC_BAIDU_API_KEY`
- `EXPO_PUBLIC_BAIDU_SECRET_KEY`

### 3) 初始化 Supabase

执行 `supabase_setup.sql`（已提供安全模板，不含真实密钥），并根据注释替换占位符。

### 4) 运行

```bash
npm run start
```

## 安全说明

- 仓库不再包含硬编码 Supabase 凭证。
- 真实 API Key 请仅放入你自己的环境变量或 Supabase `app_secrets`。
- 请勿提交任何 `.env` 文件。

## 维护状态

- 状态：Archived / 不再主动维护
- 欢迎 Fork 自行演进

## License

见 `LICENSE`。
