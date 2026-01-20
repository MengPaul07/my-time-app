export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;

export const sendToDeepSeek = async (messages: ChatMessage[], apiKey?: string) => {
  const keyToUse = apiKey || DEEPSEEK_API_KEY;
  if (!keyToUse) {
    console.error('DeepSeek API Key is missing. process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY is:', process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY);
    throw new Error('DeepSeek API Key not configured. Please set EXPO_PUBLIC_DEEPSEEK_API_KEY in .env');
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToUse}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.1, // 降低随机性
        response_format: { type: 'json_object' }, // 强制 JSON 返回
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek API request failed');
    }

    return data.choices[0].message;
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw error;
  }
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
