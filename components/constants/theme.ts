import { Platform } from 'react-native';

// 亮色模式：富有生命力的湖水青 (Teal 600)
const tintColorLight = '#0D9488'; 
// 暗夜模式：清爽透明的薄荷青 (Teal 400)，在暗色下更通透
const tintColorDark = '#2DD4BF'; 

export const Colors = {
  light: {
    text: '#1F2937',        // 深炭灰，比纯黑更自然
    background: '#F9FAFB',  // 极淡的暖灰白，类似自然光下的纸张
    tint: tintColorLight,
    icon: '#4B5563',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',        // 纯白卡片，在暖灰背景上浮起
    border: '#E5E7EB',
  },
  dark: {
    text: '#F3F4F6',        // 柔和的白
    background: '#0F172A',  // 深邃的午夜蓝绿调背景，比纯黑更具自然深度
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#4B5563',
    tabIconSelected: tintColorDark,
    card: '#1E293B',        // 稍微亮一点的深石板色，模拟层级
    border: '#334155',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});