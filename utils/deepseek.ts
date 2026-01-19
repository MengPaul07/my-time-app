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
