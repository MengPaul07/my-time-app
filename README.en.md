# My Time App

[中文](./README.md) | [English](./README.en.md)

> A learning-focused **time management AI agent app** built with **Expo + React Native**. This repository is currently published as an archived open-source project for study and customization.

## 1. Project Overview

My Time App combines daily planning, study execution tracking, and growth dashboards in one mobile app.

Main goals:

- Structure learning plans with tasks and courses
- Quantify execution with stats and trends
- Reduce input overhead with AI-assisted parsing and scheduling

## 2. Core Features

### 2.1 Schedule Module

- Dual model for tasks and courses
- Calendar strip and list-based views
- Storage layer that supports local and Supabase-backed data

### 2.2 Growth Modules

- Competitive Programming growth panel
- English learning growth panel
- Progress and trend visualization based on user activity

### 2.3 Profile and Analytics

- Profile and settings management
- Daily and weekly focus-time stats
- Charts for learning trends

### 2.4 AI Capabilities

- Global AI assistant entry
- Text parsing, schedule understanding, and planning support
- Prompt and service layers designed for model/provider replacement

## 3. Tech Stack

- Expo 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- Zustand
- i18next + react-i18next
- Supabase

## 4. Important Directories

- app/: page routes and tab structure
- components/: reusable UI and feature components
- hooks/: shared logic hooks
- modules/: business modules (auth, schedule, ai, cp, english, timer, themes)
- locales/: Chinese and English dictionaries
- utils/: i18n, Supabase, audio, secrets utilities
- scripts/: helper scripts
- supabase_setup.sql / cleanup_zombies.sql / refactor_db.sql: database scripts

## 5. Requirements

- Node.js 20+ (LTS recommended)
- npm 10+
- Expo CLI (npx is enough)
- A Supabase project for cloud features

## 6. Quick Start

### 6.1 Install dependencies

```bash
npm install
```

### 6.2 Configure environment variables

Copy .env.example to .env and fill values as needed.

Required:

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

Optional:

- EXPO_PUBLIC_DEEPSEEK_API_KEY
- EXPO_PUBLIC_BAIDU_API_KEY
- EXPO_PUBLIC_BAIDU_SECRET_KEY
- EXPO_PUBLIC_BACKEND_URL (legacy compatibility field)

### 6.3 Initialize database

Run SQL scripts in your own Supabase/database environment:

1. supabase_setup.sql
2. refactor_db.sql
3. cleanup_zombies.sql

Read script comments before execution.

### 6.4 Run app

```bash
npm run start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## 7. Internationalization

- Default language: Chinese (zh)
- Supported languages: Chinese (zh), English (en)
- Dictionaries: locales/zh.json and locales/en.json
- Language logic: utils/i18n.ts and profile settings

When adding new text:

1. Add keys to both locale files
2. Avoid hardcoded strings in UI
3. Keep keys grouped by module (for example, profile.settingsModal.xxx)

## 8. Extension Guidelines

- Add new business features under modules/
- Keep UI components focused on rendering; place logic in hooks/stores
- Follow prompts + services layering in modules/ai for maintainability
- Never hardcode secrets; use environment variables or remote secret storage

## 9. FAQ

### 9.1 App fails to start

- Verify .env values
- Reinstall dependencies and restart Expo
- Clear cache with: npx expo start -c

### 9.2 Database errors

- Validate Supabase URL and anon key
- Confirm initialization SQL has been executed
- Check schema compatibility with current code

### 9.3 i18n text not updated

- Ensure keys exist in both locale files
- Restart Metro or clear cache

## 10. Security Notes

- No real production credentials are included in this repository
- Do not commit .env files or private keys
- Run your own security hardening before production deployment

## 11. Maintenance Status

- Current status: Archive
- Forks and custom evolution are welcome

## 12. License

See LICENSE in the repository root.
