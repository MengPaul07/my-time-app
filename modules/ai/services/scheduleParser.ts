import { BaiduOCRService } from './ocr';
import { sendToDeepSeek, ChatMessage } from '@/utils/deepseek';
import { getAppSecret } from '@/utils/secrets';
import { Course } from '@/types/app';

const SCHEDULE_PARSE_TIMEOUT_MS = 90000;
const SCHEDULE_PARSE_FALLBACK_TIMEOUT_MS = 60000;
const SCHEDULE_IMPORT_OCR_DIAG_MODE = false;

type OCRWordItem = {
  words: string;
  location?: { left?: number; top?: number; width?: number; height?: number };
};

const normalizeOCRItems = (rawItems: any[]): OCRWordItem[] => {
  return (rawItems || [])
    .map((item: any) => {
      const words = String(item?.words || '').trim();
      const location = item?.location;
      return {
        words,
        location: location
          ? {
              left: Number(location.left || 0),
              top: Number(location.top || 0),
              width: Number(location.width || 0),
              height: Number(location.height || 0),
            }
          : undefined,
      };
    })
    .filter((item: OCRWordItem) => item.words.length > 0);
};

const buildLayoutLines = (items: OCRWordItem[], maxLines = 80) => {
  const itemsWithPos = items
    .filter((item) => item.location)
    .map((item) => ({
      words: item.words,
      x: item.location?.left || 0,
      y: (item.location?.top || 0) + (item.location?.height || 0) / 2,
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const rowTolerance = 14;
  const rows: Array<{ y: number; items: Array<{ x: number; words: string }> }> = [];

  for (const token of itemsWithPos) {
    const row = rows.find((r) => Math.abs(r.y - token.y) <= rowTolerance);
    if (row) {
      row.items.push({ x: token.x, words: token.words });
      row.y = (row.y + token.y) / 2;
    } else {
      rows.push({ y: token.y, items: [{ x: token.x, words: token.words }] });
    }
  }

  return rows
    .sort((a, b) => a.y - b.y)
    .slice(0, maxLines)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((it) => it.words).join(' | '))
    .join('\n');
};

const SCHEDULE_OCR_SYSTEM_PROMPT = `
你是一个顶尖的课程表 OCR 数据解析助理。
用户将上传一张课表图片的百度 OCR 识别结果（包含内容 words 和位置坐标 location）。

你的任务是：
1. 观察文本的二维空间分布规律：
   - 课表通常有表头（周一到周日，或数字 1-7）。
   - 课表通常有左侧的时间轴（节次，如“第1-2节”或具体时间如“08:00-09:40”）。
2. 根据文本的坐标（同在一列大概率为同一天，同在一行大概率为同一时间），准确组合被切碎的课程名称、地点信息。
3. 从课表中提取出所有课程的具体时间。如果只有节次没有具体时间，请按中国大学一般作息合理估算（如早晨1-2节通常为08:00-09:40，下午5-6节通常为14:00-15:40）。

# 必须返回的 JSON 结构
严格返回一段 JSON 对象，不要包括 \`\`\`json 等 Markdown 包裹：
{
  "courses": [
    {
      "name": "课程名称，如果有教师名字可省略或标注",
      "location": "上课地点，如果没有请填 '未知'",
      "day_of_week": 1, // 整数 1-7 (1=周一，7=周日)
      "start_time": "08:00", // 格式必须是 HH:mm (24小时制)
      "end_time": "09:40" // 格式必须是 HH:mm
    }
  ]
}
`;

export const parseScheduleFromImage = async (imageUri: string): Promise<Omit<Course, 'id' | 'user_id'>[]> => {
  // 1. OCR with position
  const ocrResult = await BaiduOCRService.recognizeWithPos(imageUri);
  
  if (!ocrResult || !ocrResult.words_result) {
    throw new Error('OCR 识别失败或无内容');
  }

  if (SCHEDULE_IMPORT_OCR_DIAG_MODE) {
    const ocrDebugPayload = {
      provider: 'baidu-ocr',
      words_result_num: ocrResult.words_result_num || 0,
      words_result: (ocrResult.words_result || []).slice(0, 120).map((item: any) => ({
        words: item?.words || '',
        location: item?.location || null,
      })),
    };

    console.log('[ScheduleParser][OCR_DIAG] OCR JSON:', JSON.stringify(ocrDebugPayload));
    throw new Error('诊断模式：百度 OCR 已成功返回 JSON（已打印到日志），当前未调用 DeepSeek。');
  }

  console.log(`[ScheduleParser] OCR Success, words count: ${ocrResult.words_result_num}. Calling DeepSeek...`);

  const apiKey = await getAppSecret('DEEPSEEK_API_KEY');
  if (!apiKey) {
      throw new Error('未配置 DeepSeek API Key (既不在 Supabase 也不在局部变量)');
  }

  const normalizedItems = normalizeOCRItems(ocrResult.words_result || []);

  const layoutLines = buildLayoutLines(normalizedItems);
  const plainOCRText = normalizedItems.map((item) => item.words).join('\n').slice(0, 4000);

  // 2. Prepare DeepSeek prompt
  const userPrompt = `
请解析以下来自课表的 OCR 坐标及文字识别数据。
数据已经按坐标聚合为“行文本”，请优先依赖该结构判断“列=星期、行=时间段”。

**OCR 行文本（按坐标聚合）**:
${layoutLines}

**补充 OCR 纯文本**:
${plainOCRText}
`;
  
  const messages: ChatMessage[] = [
    { role: 'system', content: SCHEDULE_OCR_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  // 3. Call DeepSeek
  try {
    const response = await sendToDeepSeek(messages, apiKey, {
      timeoutMs: SCHEDULE_PARSE_TIMEOUT_MS,
      maxRetries: 2,
    });
    
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
     const err = e as any;
     const isTimeout = err?.code === 'timeout' || err?.status === 408;
     if (!isTimeout) {
       console.error("Schedule Parse Error:", e);
       throw e;
     }

     console.warn('[ScheduleParser] Primary parse timed out, trying fallback prompt...');

     const fallbackMessages: ChatMessage[] = [
      { role: 'system', content: SCHEDULE_OCR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `
以下是课表 OCR 的行文本（已按坐标聚合），请在信息不完整时做合理推断。

${layoutLines}

补充原始 OCR 文本：
${plainOCRText}
`,
      },
    ];

    const fallbackResp = await sendToDeepSeek(fallbackMessages, apiKey, {
      timeoutMs: SCHEDULE_PARSE_FALLBACK_TIMEOUT_MS,
      maxRetries: 2,
    });

    const fallbackContent = fallbackResp.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const fallbackStart = fallbackContent.indexOf('{');
    const fallbackEnd = fallbackContent.lastIndexOf('}');
    if (fallbackStart === -1 || fallbackEnd === -1) {
      throw new Error('课表解析超时，且回退解析失败。请更换更清晰的课表截图后重试。');
    }

    const fallbackResult = JSON.parse(fallbackContent.substring(fallbackStart, fallbackEnd + 1));
    if (!fallbackResult.courses || !Array.isArray(fallbackResult.courses)) {
      return [];
    }

    return fallbackResult.courses;
  }
}
