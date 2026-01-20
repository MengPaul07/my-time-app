import { LocalOCRService, BaiduOCRService } from './ocr';
import { parseGenericScheduleText } from '@/utils/deepseek';
import { AIParseResult } from '../types';

// 定义一个兼容接口，匹配 OCR 服务应有的结构
interface OCRServiceInterface {
  recognizeText(imageUri: string): Promise<string>;
}

/**
 * 协调 OCR 和 DeepSeek 的高层服务
 */
export class PhotoParserService {
  private ocrService: OCRServiceInterface;

  // 默认使用百度 OCR (真实环境)
  constructor(ocrService: OCRServiceInterface = BaiduOCRService) {
    this.ocrService = ocrService;
  }

  /**
   * 从图片中提取日程信息
   * @param imageUri 图片的本地 URI
   * @param onProgress 进度回调 (可选)
   */
    
  async parseScheduleFromPhoto(
    imageUri: string,
    onProgress?: (status: 'ocr' | 'analyzing' | 'done') => void
  ): Promise<AIParseResult | null> {
    try {
      // 1. OCR 识别
      if (onProgress) onProgress('ocr');
      const rawText = await this.ocrService.recognizeText(imageUri);
      
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('未识别到文字');
      }
      console.log('[PhotoParser] OCR Text:', rawText);

      // 2. DeepSeek 语义分析
      if (onProgress) onProgress('analyzing');
      const result = await parseGenericScheduleText(rawText);

      if (onProgress) onProgress('done');
      return result;

    } catch (error) {
      console.error('[PhotoParser] Failed:', error);
      throw error;
    }
  }
}

export const photoParser = new PhotoParserService();
