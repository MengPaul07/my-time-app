import { supabase } from '@/utils/supabase';
import { ASSISTANT_SYSTEM_PROMPT } from '../prompts/assistantPrompts';
import { sendToDeepSeek } from '@/utils/deepseek';

// 临时方案：完全开启客户端 AI 模式，不再请求本地后端
const USE_CLIENT_SIDE_AI = true;

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface AssistantAction {
  type: 'create_task' | 'update_task' | 'delete_task' | 'create_course' | 'update_course' | 'delete_course' | 'query_schedule' | 'chat';
  data?: any;
}

interface AssistantResponse {
  plan?: string;
  reason?: string;
  reply: string;
  actions: AssistantAction[];
}

// 缓存 Key 避免每次都请求数据库
let cachedDeepSeekKey: string | null = null;

async function getDeepSeekKey() {
  if (cachedDeepSeekKey) return cachedDeepSeekKey;

  try {
    // 尝试从 Supabase 获取密钥
    const { data, error } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('name', 'DEEPSEEK_API_KEY')
      .single();

    if (data && data.value) {
      cachedDeepSeekKey = data.value;
      return data.value;
    }
  } catch (err) {
    console.warn('Failed to fetch key from Supabase, falling back to env:', err);
  }

  // 回退：使用本地环境变量 (开发用)
  return process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
}

export const assistantService = {
    async processUserRequest(userInput: string, tasksContext: string, coursesContext: string, history: Array<{ role: 'user' | 'assistant', content: string }> = []): Promise<AssistantResponse> {
    
        if (USE_CLIENT_SIDE_AI) {
            // --- 客户端直连模式 (任何人可用) ---
            try {
                const apiKey = await getDeepSeekKey();
                if (!apiKey) {
                    throw new Error('未配置 DeepSeek API Key (既不在 Supabase 也不在局部变量)');
                }

                // 1. 组装 Prompt
                const currentDate = new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const systemPrompt = ASSISTANT_SYSTEM_PROMPT
                    .replace('{{currentDate}}', currentDate)
                    .replace('{{tasksContext}}', tasksContext || "暂无今日任务")
                    .replace('{{coursesContext}}', coursesContext || "暂无今日课程");

                const messages = [
                    { role: 'system' as const, content: systemPrompt },
                    ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
                    { role: 'user' as const, content: userInput }
                ];

                // 2. 请求 DeepSeek
                // 注意：sendToDeepSeek 里我们也需要传 apiKey，如果不传它会读 env，但这里我们需要优先用 supabase 的 key
                const aiMsg = await sendToDeepSeek(messages, apiKey);
                const content = aiMsg.content;

                // 3. 解析 JSON
                let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    jsonStr = jsonStr.substring(start, end + 1);
                }

                const result = JSON.parse(jsonStr);
                return result;

            } catch (error) {
                console.error("Client-side Assistant Error:", error);
                return {
                    reply: `抱歉，AI 连接出了点问题: ${error instanceof Error ? error.message : '未知错误'}`,
                    actions: []
                };
            }

        } else {
            // --- 原有的本地后端模式 ---
            try {
                const response = await fetch(`${BACKEND_URL}/api/ai`, {

                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userInput,
                        tasksContext,
                        coursesContext,
                        history
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Backend API Error: ${response.status}`);
                }

                const result = await response.json();
                return result as AssistantResponse;

            } catch (e) {
                console.error("Assistant Service Error:", e);
                return {
                    reply: "抱歉，无法连接到 AI 服务端。",
                    actions: []
                };
            }
        }
    }
}

