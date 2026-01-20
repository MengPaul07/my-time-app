import { sendToDeepSeek } from '@/utils/deepseek';
import { ASSISTANT_SYSTEM_PROMPT } from '../prompts/assistantPrompts';

interface AssistantAction {
  type: 'create_task' | 'update_task' | 'delete_task' | 'create_course' | 'update_course' | 'delete_course' | 'query_schedule' | 'chat';
  data?: any;
}

interface AssistantResponse {
  reply: string;
  actions: AssistantAction[];
}

export const assistantService = {
  async processUserRequest(userInput: string, tasksContext: string, coursesContext: string): Promise<AssistantResponse> {
    // 获取当前本地时间字符串，例如 "2026-01-20 17:35:00 周二"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    const currentDate = `${year}-${month}-${day} ${hours}:${minutes} ${weekday}`;

    const prompt = ASSISTANT_SYSTEM_PROMPT
        .replace('{{currentDate}}', currentDate)
        .replace('{{tasksContext}}', tasksContext || "No tasks Loaded")
        .replace('{{coursesContext}}', coursesContext || "No courses Loaded");

    const messages = [
        { role: 'system' as const, content: prompt },
        { role: 'user' as const, content: userInput }
    ];

    try {
        const aiMsg = await sendToDeepSeek(messages);
        const content = aiMsg.content;
        
        // Extract JSON
        let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start, end + 1);
        }
        
        const result = JSON.parse(jsonStr);
        
        // Backwards compatibility for single action structure if model gets confused
        if ((result as any).action && !(result as any).actions) {
             return {
                 reply: result.reply,
                 actions: [{ type: (result as any).action, data: (result as any).data }]
             };
        }

        return result;
    } catch (e) {
        console.error("Assistant Parse Error", e);
        return {
            reply: "抱歉，我的大脑暂时短路了，请再说一遍？",
            actions: []
        };
    }
  }
};
