# 贡献指南 / Contributing Guide

首先，感谢你花时间为 MyTime 做出贡献！🎉  
Thank you for taking the time to contribute to MyTime!

> **注意 / Note**：本项目由原作者不再主动维护，但欢迎社区通过 Fork & PR 的方式持续改进。  
> The original author is no longer actively maintaining this project, but community contributions via Fork & PR are very welcome.

---

## 如何贡献 / How to Contribute

### 报告 Bug / Report a Bug

1. 先在 [Issues](../../issues) 中搜索，避免重复提交。
2. 点击 **New Issue** → 选择 **Bug Report** 模板。
3. 尽量提供：复现步骤、期望行为、实际行为、截图、设备/系统信息。

### 提交功能建议 / Request a Feature

1. 在 [Issues](../../issues) 中搜索是否已有相关讨论。
2. 点击 **New Issue** → 选择 **Feature Request** 模板。

### 提交代码 / Submit Code

1. **Fork** 本仓库。
2. 从 `main` 分支创建新分支：  
   ```bash
   git checkout -b feat/your-feature-name
   # 或
   git checkout -b fix/your-bug-description
   ```
3. 在你的分支上进行修改并提交。
4. 确保代码通过 Lint 检查：  
   ```bash
   npm run lint
   ```
5. 向本仓库的 `main` 分支发起 **Pull Request**，并填写 PR 模板。

---

## 开发环境搭建 / Development Setup

参考 [README.md](README.md) 中的「快速开始」部分。  
See the "Getting Started" section in [README.md](README.md).

---

## 代码风格 / Code Style

- 使用 **TypeScript**，避免 `any`（必要时加注释说明）。
- 遵循现有文件的命名和结构风格（组件使用 PascalCase，hook 使用 `use-` 前缀）。
- 提交信息使用英文，格式参考：`feat: add dark mode toggle` / `fix: timer not resetting on end`。

---

## 许可证 / License

向本仓库贡献代码，即表示你同意你的贡献将以 [MIT License](LICENSE) 发布。  
By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
