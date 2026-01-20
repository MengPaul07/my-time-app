import React from 'react';
import { Dimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { BoatScene } from '@/modules/timer/components/BoatScene';

const { width } = Dimensions.get('window');
const TRACK_WIDTH = width - 80;

export interface ThemeAnimationProps {
  theme: 'light' | 'dark';
  animState: SharedValue<number>;
  smoothProgress: SharedValue<number>;
  waveAnim: SharedValue<number>;
  rockAnim: SharedValue<number>;
  bobAnim: SharedValue<number>;
  isSessionActive: boolean;
}

export const MainAnimation: React.FC<ThemeAnimationProps> = ({
  theme,
  animState,
  smoothProgress,
  waveAnim,
  rockAnim,
  bobAnim,
  isSessionActive
}) => {
  const boatSceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animState.value, [0.5, 1], [0, 1]),
    transform: [{ translateY: interpolate(animState.value, [0, 1], [20, 0]) }],
    zIndex: isSessionActive ? 10 : 0,
  }));

  const boatStyle = useAnimatedStyle(() => {
    const translateX = interpolate(smoothProgress.value, [0, 1], [-TRACK_WIDTH/2 + 20, TRACK_WIDTH/2 - 20]);
    return {
      transform: [
        { translateX },
        { translateY: bobAnim.value },
        { rotate: `${rockAnim.value}deg` }
      ],
    };
  });
  
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(waveAnim.value, [0, 1], [0, -200]) }],
    flexDirection: 'row',
    width: TRACK_WIDTH * 2, 
  }));

  return (
    <BoatScene 
      theme={theme}
      boatStyle={boatStyle}
      boatSceneStyle={boatSceneStyle}
      waveStyle={waveStyle}
    />
  );
};
