import { getAppSecret } from './secrets';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class DeepSeekRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'DeepSeekRequestError';
    this.status = status;
    this.code = code;
  }
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_TIMEOUT_MS = 25000;
const DEFAULT_MAX_RETRIES = 1;

export interface DeepSeekRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

const shouldRetry = (error: unknown, attempt: number, maxRetries: number) => {
  if (attempt >= maxRetries) {
    return false;
  }

  if (error instanceof DeepSeekRequestError) {
    return (
      error.code === 'timeout' ||
      error.status === 408 ||
      error.status === 429 ||
      (error.status !== undefined && error.status >= 500)
    );
  }

  return true;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendToDeepSeek = async (
  messages: ChatMessage[],
  apiKey?: string,
  options: DeepSeekRequestOptions = {}
) => {
  const keyToUse = apiKey || (await getAppSecret('DEEPSEEK_API_KEY'));
  if (!keyToUse) {
    throw new DeepSeekRequestError('DeepSeek API Key missing: 请在 Supabase app_secrets 配置 DEEPSEEK_API_KEY', 401, 'missing_api_key');
  }

  const timeoutMs = options.timeoutMs ?? DEEPSEEK_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          stream: false,
        }),
        signal: controller.signal,
      });

      if (timer) {
        clearTimeout(timer);
      }

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.error?.message ||
          (response.status === 401 ? 'DeepSeek 鉴权失败，请检查 API Key。' : `DeepSeek 请求失败 (${response.status})`);
        throw new DeepSeekRequestError(message, response.status, data?.error?.code);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new DeepSeekRequestError('DeepSeek 返回为空，请稍后重试。', response.status, 'empty_response');
      }

      return data.choices[0].message;
    } catch (error: any) {
      const normalizedError =
        error?.name === 'AbortError'
          ? new DeepSeekRequestError('DeepSeek 请求超时，请检查网络后重试。', 408, 'timeout')
          : error;

      if (shouldRetry(normalizedError, attempt, maxRetries)) {
        await sleep(800);
        continue;
      }

      console.error('DeepSeek API Error:', normalizedError);
      throw normalizedError;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  throw new DeepSeekRequestError('DeepSeek 请求失败，请稍后重试。', 500, 'unknown');
};

/**
 * Parses raw text (e.g., from OCR) into a structured schedule object using DeepSeek.
 */
export const parseGenericScheduleText = async (rawText: string, apiKey?: string) => {
  const systemPrompt = `
You are a smart schedule assistant. Your goal is to extract a single task/schedule item from the provided text (which is OCR output from an image).
Return a JSON object matching this TypeScript interface:

interface AIParseResult {
  title: string;          // A concise summary of the task
  description?: string;   // More details if available
  startTime: string | null; // ISO 8601 string (e.g. "2024-01-20T14:30:00") or null. Assume current year/date if only time is given, unless context implies otherwise.
  endTime: string | null;   // ISO 8601 string
  estimatedDuration: number; // in minutes. Estimate if not explicit.
  isFloating: boolean;    // true if no specific start time is found
  priority?: 'high' | 'medium' | 'low';
}

Current context date: ${new Date().toISOString()}
Rules:
1. If text is messy, do your best to infer the task.
2. If multiple tasks appear, pick the most prominent one or summarize the main intent.
3. Return ONLY valid JSON.
`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Here is the text extracted from an image:\n\n"${rawText}"` }
  ];

  const result = await sendToDeepSeek(messages, apiKey);
  try {
    return JSON.parse(result.content);
  } catch (e) {
    console.error('Failed to parse DeepSeek JSON response', e);
    return null;
  }
};
