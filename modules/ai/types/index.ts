// AI 解析结果的基础接口
export interface AIParseResult {
  title: string;
  description?: string;
  startTime: string | null; // ISO String
  endTime: string | null;   // ISO String
  estimatedDuration: number; // minutes
  isFloating: boolean; // 是否为浮动任务（无具体时间）
  priority?: 'high' | 'medium' | 'low';
}

// 包含回归模型建议的完整结果
export interface AIScheduleSuggestion extends AIParseResult {
  mathSuggestion: {
    predictedDuration: number;
    confidence: number;
    isMathVerified: boolean;
  };
}
