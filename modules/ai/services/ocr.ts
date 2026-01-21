/**
 * OCR 服务接口
 * 用于将图片 URI 转换为原始文本
 */
export interface LocalOCRService {
  recognizeText(imageUri: string): Promise<string>;
  recognizeWithPos(imageUri: string): Promise<any>;
}


import { Platform } from 'react-native';
import { BACKEND_URL } from '@/constants/backend';
import { supabase } from '@/utils/supabase';

// 临时方案：完全开启客户端 OCR 模式，不再请求本地后端
const USE_CLIENT_SIDE_OCR = true;

// 缓存 Keys
let cachedBaiduKeys: { ak: string, sk: string } | null = null;
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getBaiduKeys() {
  if (cachedBaiduKeys) return cachedBaiduKeys;

  try {
    const { data, error } = await supabase
      .from('app_secrets')
      .select('name, value')
      .in('name', ['BAIDU_API_KEY', 'BAIDU_SECRET_KEY']);

    if (data && data.length > 0) {
      const ak = data.find(r => r.name === 'BAIDU_API_KEY')?.value;
      const sk = data.find(r => r.name === 'BAIDU_SECRET_KEY')?.value;
      
      if (ak && sk) {
        cachedBaiduKeys = { ak, sk };
        return cachedBaiduKeys;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Baidu keys from Supabase:', err);
  }
  
  // 用于开发的 Fallback
  return {
    ak: process.env.EXPO_PUBLIC_BAIDU_API_KEY || '',
    sk: process.env.EXPO_PUBLIC_BAIDU_SECRET_KEY || ''
  };
}

async function getAccessToken() {
    // 复用 Token
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
        return cachedAccessToken;
    }

    const keys = await getBaiduKeys();
    if (!keys || !keys.ak || !keys.sk) {
        throw new Error('未配置百度 API Key/Secret Key (既不在 Supabase 也不在局部变量)');
    }

    try {
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${keys.ak}&client_secret=${keys.sk}`;
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        
        if (data.access_token) {
            cachedAccessToken = data.access_token;
            // Token 有效期设为过期前一天
            tokenExpiresAt = Date.now() + (data.expires_in - 86400) * 1000; 
            return cachedAccessToken;
        } else {
            throw new Error('Failed to get Access Token: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Baidu Token Error:', error);
        throw error;
    }
}

/**
 * 百度云在线 OCR 服务 (混合模式：Client or Backend)
 */
export const BaiduOCRService: LocalOCRService = {
  recognizeText: async (imageUri: string) => {
    // 复用 recognizeWithPos 的逻辑，只提取文字
    const result = await BaiduOCRService.recognizeWithPos(imageUri);
    if (!result || !result.words_result) return "";
    return result.words_result.map((item: any) => item.words).join('\n');
  },

  recognizeWithPos: async (imageUri: string) => {
    try {
      // 1. 读取图片并转 Base64
      console.log('[BaiduOCR] 正在读取图片...');
      const FileSystem = require('expo-file-system/legacy');
      const base64Img = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64', 
      });

      if (USE_CLIENT_SIDE_OCR) {
        // --- 客户端直连模式 ---
        console.log('[BaiduOCR] Client Side Mode: Fetching Token...');
        const accessToken = await getAccessToken();
        
        console.log('[BaiduOCR] Sending to Baidu Cloud...');
        const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=${accessToken}`;
        
        // 手动构建 x-www-form-urlencoded body
        const bodyProp = `image=${encodeURIComponent(base64Img)}&language_type=CHN_ENG`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyProp
        });

        const ocrResult = await response.json();
        if (ocrResult.error_code) {
             throw new Error(`Baidu API Error: ${ocrResult.error_msg}`);
        }
        console.log('[BaiduOCR] 识别成功, 词条数:', ocrResult.words_result_num);
        return ocrResult;

      } else {
        // --- 原有后端模式 ---
        console.log('[BaiduOCR] Sending to Backend (Payload size: ' + base64Img.length + ')...');
        
        const response = await fetch(`${BACKEND_URL}/api/ocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Img }),
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Backend API Error ${response.status}: ${text}`);
        }
        
        const ocrResult = await response.json();
        
        if (ocrResult.error_code) {
          throw new Error(`百度 OCR 错误: ${ocrResult.error_msg}`);
        }

        console.log('[BaiduOCR] 识别成功, 词条数:', ocrResult.words_result_num);
        return ocrResult; 
      }

    } catch (error) {
      console.error('[BaiduOCR] Failed:', error);
      throw error;
    }
  }
};


