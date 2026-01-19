import { sendToDeepSeek } from '@/utils/deepseek';
import { SCHEDULER_SYSTEM_PROMPT } from '../prompts/schedulerPrompts';
import { AIParseResult, AIScheduleSuggestion } from '../types';

const fetchAIAnalysis = async (userInput: string): Promise<AIParseResult[]> => {
  const currentDate = new Date().toString(); 
  const systemPrompt = SCHEDULER_SYSTEM_PROMPT.replace('{{currentDate}}', currentDate);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userInput }
  ];

  try {
    const aiMessage = await sendToDeepSeek(messages);
    const content = aiMessage.content;
    
    let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    const result = JSON.parse(jsonStr);
    
    // 兼容可能返回的单对象或新版数组结构
    const rawTasks = Array.isArray(result.tasks) ? result.tasks : (Array.isArray(result) ? result : [result]);

    return rawTasks.map((t: any) => ({
      title: t.title,
      description: t.description,
      startTime: t.startTime || null,
      endTime: t.endTime || null,
      estimatedDuration: t.estimatedDuration || 30,
      isFloating: !!t.isFloating,
      priority: t.priority || 'medium'
    }));

  } catch (error: any) {
    console.error('AI Analysis Failed:', error);
    // Mock 数据也改为数组
    return [{
      title: `(Mock) ${userInput.slice(0, 10)}...`,
      description: `AI解析失败 (Mock数据)\n错误信息: ${error.message || JSON.stringify(error)}`,
      startTime: null,
      endTime: null,
      estimatedDuration: 45,
      isFloating: true, 
      priority: 'medium'
    }];
  }
};

export const schedulerService = {
  processAIPrompt: async (userInput: string): Promise<AIScheduleSuggestion[]> => {
    // 1. 调用大模型获取基础拆解
    const aiResults = await fetchAIAnalysis(userInput);
    
    // 2. 为每个任务附加回归模型建议
    return aiResults.map(aiResult => {
        const mathSuggestion = {
            predictedDuration: aiResult.estimatedDuration, 
            confidence: 1.0, 
            isMathVerified: false 
        };
        return {
            ...aiResult,
            mathSuggestion
        };
    });
  }
};
