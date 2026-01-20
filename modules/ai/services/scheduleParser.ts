import { BaiduOCRService } from './ocr';
import { sendToDeepSeek, ChatMessage } from '@/utils/deepseek';
import { SCHEDULE_OCR_PROMPT } from '../prompts/schedulerPrompts';
import { Course } from '@/types/app';

export const parseScheduleFromImage = async (imageUri: string): Promise<Omit<Course, 'id' | 'user_id'>[]> => {
  // 1. OCR with position
  const ocrResult = await BaiduOCRService.recognizeWithPos(imageUri);
  
  if (!ocrResult || !ocrResult.words_result) {
    throw new Error('OCR 识别失败或无内容');
  }

  console.log(`[ScheduleParser] OCR Success, words count: ${ocrResult.words_result_num}. Calling DeepSeek...`);

  // Limit OCR data size if necessary, DeepSeek context window is large but good to be safe.
  // We send the whole words_result specifically because layout depends on all items.
  const ocrDataStr = JSON.stringify(ocrResult.words_result);

  // 2. Prepare DeepSeek prompt
  const userPrompt = SCHEDULE_OCR_PROMPT.replace('{{ocrData}}', ocrDataStr);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a helpful assistant specialized in parsing schedule data from OCR.' },
    { role: 'user', content: userPrompt }
  ];

  // 3. Call DeepSeek
  try {
    const response = await sendToDeepSeek(messages);
    
    if (!response || !response.content) {
      throw new Error("DeepSeek 返回内容为空");
    }

    // 4. Parse JSON
    const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
    // Sometimes there might be text before/after JSON
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
       throw new Error("无法从 AI 响应中提取 JSON");
    }
    const jsonStr = content.substring(jsonStart, jsonEnd + 1);
    
    const result = JSON.parse(jsonStr);
    
    if (!result.courses || !Array.isArray(result.courses)) {
      console.warn("DeepSeek result structure unexpected:", result);
      return [];
    }

    return result.courses;
  } catch (e) {
     console.error("Schedule Parse Error:", e);
     throw e;
  }
}
