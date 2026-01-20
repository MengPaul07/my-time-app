/**
 * OCR 服务接口
 * 用于将图片 URI 转换为原始文本
 */
export interface LocalOCRService {
  recognizeText(imageUri: string): Promise<string>;
  recognizeWithPos(imageUri: string): Promise<any>;
}

const BAIDU_API_KEY = process.env.EXPO_PUBLIC_BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.EXPO_PUBLIC_BAIDU_SECRET_KEY;

/**
 * 百度云在线 OCR 服务
 * 使用 fetch 调用 REST API，无需原生依赖
 */
export const BaiduOCRService: LocalOCRService = {
  recognizeText: async (imageUri: string) => {
    // 复用 recognizeWithPos 的逻辑，只提取文字
    const result = await BaiduOCRService.recognizeWithPos(imageUri);
    if (!result || !result.words_result) return "";
    return result.words_result.map((item: any) => item.words).join('\n');
  },

  recognizeWithPos: async (imageUri: string) => {
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      throw new Error('请在 .env 中配置 EXPO_PUBLIC_BAIDU_API_KEY 和 EXPO_PUBLIC_BAIDU_SECRET_KEY');
    }

    try {
      console.log(`[BaiduOCR] Config Check: API_KEY=${BAIDU_API_KEY?.slice(0, 4)}***, SECRET_KEY=${BAIDU_SECRET_KEY?.slice(0, 4)}***`);
      console.log('[BaiduOCR] 正在获取 Access Token...');
      // 1. 获取 Access Token
      const tokenResponse = await fetch(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`,
        { method: 'POST' }
      );
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('获取百度 Access Token 失败: ' + JSON.stringify(tokenData));
      }
      const accessToken = tokenData.access_token;

      // 2. 读取图片并转 Base64
      console.log('[BaiduOCR] 正在读取图片...');
      // SDK 54+ 中 readAsStringAsync 已被移至 legacy，需从 expo-file-system/legacy 导入
      const FileSystem = require('expo-file-system/legacy');
      
      // 安全修复：直接使用字符串 'base64'，避免访问可能未定义的枚举属性
      // 有些环境或版本下 FileSystem.EncodingType 可能未正确导出
      const base64Img = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64', 
      });
      
      // 3. 调用通用文字识别 API (标准版) - 包含位置信息
      console.log('[BaiduOCR] 正在识别文字 (Payload size: ' + base64Img.length + ')...');
      
      // 使用 general 接口，默认包含位置信息 (location -> {top, left, width, height})
      const targetUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/general?access_token=${accessToken}`;
  
      const ocrResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          // 必须对 Base64 进行 URL 编码，否则特殊字符会导致请求失败
          body: `image=${encodeURIComponent(base64Img)}&language_type=CHN_ENG`,
        }
      ).catch(async (directErr) => {
         console.warn("Direct fetch failed, trying fallback...", directErr);
         throw directErr;
      });
      
      if (!ocrResponse.ok) {
        const text = await ocrResponse.text();
        throw new Error(`OCR HTTP Error ${ocrResponse.status}: ${text}`);
      }
      
      const ocrResult = await ocrResponse.json();
      
      if (ocrResult.error_code) {
        throw new Error(`百度 OCR 错误: ${ocrResult.error_msg}`);
      }

      console.log('[BaiduOCR] 识别成功, 词条数:', ocrResult.words_result_num);
      return ocrResult; // 返回完整 JSON，包含 words_result 和 location

    } catch (error) {
      console.error('[BaiduOCR] Failed:', error);
      throw error;
    }
  }
};
