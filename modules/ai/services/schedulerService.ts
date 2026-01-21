import { sendToDeepSeek } from '@/utils/deepseek';
import { getAppSecret } from '@/utils/secrets';
import { SCHEDULER_SYSTEM_PROMPT } from '../prompts/schedulerPrompts';
import { AIParseResult, AIScheduleSuggestion } from '../types';

const fetchAIAnalysis = async (userInput: string, contextData: any[] = []): Promise<AIParseResult[]> => {
  const currentDate = new Date().toString(); 
  const apiKey = await getAppSecret('DEEPSEEK_API_KEY');

  if (!apiKey) {
      throw new Error('未配置 DeepSeek API Key (既不在 Supabase 也不在局部变量)');
  }
  
  // 简化的 context 字符串
  const contextStr = JSON.stringify(contextData.map(item => ({
    title: item.title || item.name,
    is_course: !!item.is_course || item.id < 0, // id < 0 也是 course
    id: item.id
  })).slice(0, 50)); // 限制大小，防止 token 溢出

  const systemPrompt = SCHEDULER_SYSTEM_PROMPT
    .replace('{{currentDate}}', currentDate)
    .replace('{{currentSchedule}}', contextStr);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userInput }
  ];

  try {
    const aiMessage = await sendToDeepSeek(messages, apiKey);
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
      action: t.action || 'create',
      targetType: t.targetType || 'task',
      originalTitle: t.originalTitle,
      
      title: t.title,
      description: t.description,
      startTime: t.startTime || null,
      endTime: t.endTime || null,
      estimatedDuration: t.estimatedDuration || 30,
      isFloating: !!t.isFloating,
      priority: t.priority || 'medium',
      
      location: t.location,
      dayOfWeek: t.dayOfWeek
    }));

  } catch (error: any) {
    console.error('AI Analysis Failed:', error);
    // Mock 数据也改为数组
    return [{
      action: 'create',
      targetType: 'task',
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
  processAIPrompt: async (userInput: string, contextData: any[] = []): Promise<AIScheduleSuggestion[]> => {
    // 1. 调用大模型获取基础拆解
    const aiResults = await fetchAIAnalysis(userInput, contextData);
    
    // 2. 为每个任务附加回归模型建议
    return aiResults.map(aiResult => {
        const mathSuggestion = {
            predictedDuration: aiResult.estimatedDuration || 30, 
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
