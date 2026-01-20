// AI 解析结果的基础接口
export interface AIParseResult {
  action: 'create' | 'update' | 'delete'; // 操作类型
  targetType: 'task' | 'course';          // 操作对象
  originalTitle?: string;                 // 用于定位原任务/课程的标题（Update/Delete时必需）
  
  // Create/Update 用的字段
  title?: string;
  description?: string;
  startTime?: string | null; // ISO String
  endTime?: string | null;   // ISO String
  estimatedDuration?: number; // minutes
  isFloating?: boolean; 
  priority?: 'high' | 'medium' | 'low';
  
  // 课程专用字段
  location?: string;
  dayOfWeek?: number;
}

// 包含回归模型建议的完整结果
export interface AIScheduleSuggestion extends AIParseResult {
  // 仅在 Create/Update 且是 Task 时可能有建议
  mathSuggestion?: {
    predictedDuration: number;
    confidence: number;
    isMathVerified: boolean;
  };
}
