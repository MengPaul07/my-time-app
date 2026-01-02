import { Colors } from '@/components/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedProps,
    useDerivedValue,
    useSharedValue
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const R = CIRCLE_SIZE / 2;
const STROKE_WIDTH = 20;
const RADIUS = R - STROKE_WIDTH ;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularSliderProps {
  totalDuration: number; // in seconds
  timeLeft: number; // in seconds
  onTimeChange: (time: number) => void;
  isActive: boolean;
  theme: 'light' | 'dark';
}

export default function CircularSlider({
  totalDuration,
  timeLeft,
  onTimeChange,
  isActive,
  theme,
}: CircularSliderProps) {
  // 角度: 0 - 2PI
  // 映射: 0 -> 0 min, 2PI -> 300 min (5 hours)
  const MAX_MINUTES = 300;
  const MIN_MINUTES = 25;
  
  // 将当前总时长转换为角度 (用于滑块位置)
  // totalDuration / 60 / MAX_MINUTES * 2PI
  const initialAngle = (totalDuration / 60 / MAX_MINUTES) * 2 * Math.PI;
  
  const theta = useSharedValue(initialAngle);
  const lastMinutes = useSharedValue(MIN_MINUTES);
  
  // 监听外部 totalDuration 变化 (比如重置时)
  React.useEffect(() => {
    if (!isActive) {
      theta.value = (totalDuration / 60 / MAX_MINUTES) * 2 * Math.PI;
    }
  }, [totalDuration, isActive]);

  const context = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      if (isActive || timeLeft < totalDuration) return; // 计时中或已开始过不可拖动
      context.value = theta.value;
    })
    .onUpdate((e) => {
      if (isActive || timeLeft < totalDuration) return; // 计时中或已开始过不可拖动
      
      // 计算触摸点相对于圆心的坐标
      // 圆心在 (R, R)
      const x = e.x - R;
      const y = e.y - R;
      
      // 计算角度 (atan2 返回 -PI 到 PI)
      // 我们需要将其转换为 0 到 2PI，且从 12 点钟方向开始
      // atan2(y, x) 0 是 3点钟方向。
      // 让我们修正坐标系: 
      // 12点钟: x=0, y=-R. atan2(-R, 0) = -PI/2
      
      let angle = Math.atan2(y, x) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;

      // 限制范围逻辑：防止跨圈拖动
      // 25分钟对应的弧度
      const minRad = (MIN_MINUTES / MAX_MINUTES) * 2 * Math.PI;

      // 如果角度在 0 到 25分钟之间 (死区)
      if (angle < minRad) {
        // 根据之前的角度判断是靠近起点还是终点
        if (theta.value > Math.PI) {
          angle = 2 * Math.PI - 0.0001; // 锁定在最大值
        } else {
          angle = minRad; // 锁定在最小值
        }
      }
      
      theta.value = angle;
      
      // 计算对应的分钟数
      let minutes = (angle / (2 * Math.PI)) * MAX_MINUTES;
      
      // 步进：每 5 分钟一档
      minutes = Math.round(minutes / 5) * 5;
      
      // 限制范围
      if (minutes < MIN_MINUTES) minutes = MIN_MINUTES;
      if (minutes > MAX_MINUTES) minutes = MAX_MINUTES;

      // 震动反馈
      if (minutes !== lastMinutes.value) {
        lastMinutes.value = minutes;
        runOnJS(Haptics.selectionAsync)();
      }
      
      const seconds = minutes * 60;
      runOnJS(onTimeChange)(seconds);
    });

  // 进度条显示的长度
  // 已开始过（计时中或暂停）：显示当前进度，不重置
  // 完全未开始：显示编辑位置（用户拖动的 theta）
  
  const strokeDashoffset = useDerivedValue(() => {
    if (timeLeft < totalDuration) {
      // 已开始过，无论是否暂停，都显示当前进度
      const progress = timeLeft / totalDuration;
      return CIRCUMFERENCE * (1 - progress);
    } else {
      // 完全未开始，显示编辑位置
      const progress = theta.value / (2 * Math.PI);
      return CIRCUMFERENCE * (1 - progress);
    }
  });

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: strokeDashoffset.value,
    };
  });

  // 滑块(Knob)的位置
  const knobStyle = useAnimatedProps(() => {
    // 如果已经开始计时（暂停或计时中），显示当前进度位置
    // 只有在完全未开始（timeLeft === totalDuration）时，才显示编辑位置 theta.value
    
    let currentAngle = theta.value;
    if (timeLeft < totalDuration) {
       // 已开始过，无论是否暂停，都基于 timeLeft 显示
       currentAngle = (timeLeft / totalDuration) * 2 * Math.PI;
    }

    // 角度转坐标
    // 0度在12点钟 (x=0, y=-R)
    // x = R + r * sin(angle)
    // y = R - r * cos(angle)
    const x = R + RADIUS * Math.sin(currentAngle);
    const y = R - RADIUS * Math.cos(currentAngle);

    return {
      cx: x,
      cy: y,
    };
  });

  const activeColor = Colors[theme].tint;
  const inactiveColor = Colors[theme].icon;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* 背景轨道 */}
            <Circle
              cx={R}
              cy={R}
              r={RADIUS}
              stroke={inactiveColor}
              strokeWidth={STROKE_WIDTH}
              strokeOpacity={0.2}
              fill="transparent"
            />
            {/* 进度条 */}
            <G rotation="-90" origin={`${R}, ${R}`}>
              <AnimatedCircle
                cx={R}
                cy={R}
                r={RADIUS}
                stroke={activeColor}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                animatedProps={animatedProps}
                strokeLinecap="round"
              />
            </G>
            {/* 滑块 Knob */}
            <AnimatedCircle
              r={STROKE_WIDTH/1.5} // 稍微大一点
              fill="#fff"
              stroke={activeColor}
              strokeWidth={2}
              animatedProps={knobStyle}
              // 阴影效果
            />
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
