export interface AIParseResult {
    action: 'create' | 'update' | 'delete';
    targetType: 'task' | 'course';
    originalTitle?: string;
  
    title?: string;
    description?: string;
    startTime?: string; // ISO 8601
    endTime?: string; // ISO 8601
    estimatedDuration?: number; // Minutes
    isFloating?: boolean; 
    priority?: 'high' | 'medium' | 'low';
  
    location?: string;
    dayOfWeek?: number; // 1-7
  }
