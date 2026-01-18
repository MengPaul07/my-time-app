export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const sendToDeepSeek = async (messages: ChatMessage[], apiKey: string) => {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
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
