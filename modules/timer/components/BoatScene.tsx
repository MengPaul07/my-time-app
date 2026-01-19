import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors } from '@/components/constants/theme';

interface BoatSceneProps {
  theme: 'light' | 'dark';
  boatStyle: any;
  boatSceneStyle: any;
  waveStyle: any;
}

export const BoatScene: React.FC<BoatSceneProps> = ({
  theme,
  boatStyle,
  boatSceneStyle,
  waveStyle,
}) => {
  return (
    <Animated.View style={[styles.boatScene, boatSceneStyle]}>
       {/* 船 */}
       <Animated.View style={[{ position: 'absolute', bottom: 2, zIndex: 10 }, boatStyle]}>
          <Svg width="60" height="50" viewBox="0 0 24 24" fill="none">
            <Path d="M2 16C2 16 4 20 12 20C20 20 22 16 22 16H2Z" fill={Colors[theme].tint} />
            <Path d="M12 3V16H18L12 3Z" fill={Colors[theme].tint} opacity={0.8} />
            <Path d="M11 6V16H6L11 6Z" fill={Colors[theme].tint} opacity={0.6} />
          </Svg>
       </Animated.View>
       
       {/* 波浪 */}
       <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, zIndex: 20 }, waveStyle]}>
          <Svg width={2000} height="30" viewBox="0 0 2000 30">
             <Defs>
               <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                 <Stop offset="0" stopColor={Colors[theme].tint} stopOpacity="0.3" />
                 <Stop offset="1" stopColor={Colors[theme].tint} stopOpacity="0.1" />
               </LinearGradient>
             </Defs>
             <Path 
               d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 T 450 10 T 500 10 T 550 10 T 600 10 T 650 10 T 700 10 T 750 10 T 800 10 T 850 10 T 900 10 T 950 10 T 1000 10 T 1050 10 T 1100 10 T 1150 10 T 1200 10 T 1250 10 T 1300 10 T 1350 10 T 1400 10 T 1450 10 T 1500 10 T 1550 10 T 1600 10 T 1650 10 T 1700 10 T 1750 10 T 1800 10 T 1850 10 T 1900 10 T 1950 10 T 2000 10 V 30 H 0 Z" 
               fill="url(#waveGrad)" 
             />
             <Path 
               d="M0 15 Q 25 5 50 15 T 100 15 T 150 15 T 200 15 T 250 15 T 300 15 T 350 15 T 400 15 T 450 15 T 500 15 T 550 15 T 600 15 T 650 15 T 700 15 T 750 15 T 800 15 T 850 15 T 900 15 T 950 15 T 1000 15 T 1050 15 T 1100 15 T 1150 15 T 1200 15 T 1250 15 T 1300 15 T 1350 15 T 1400 15 T 1450 15 T 1500 15 T 1550 15 T 1600 15 T 1650 15 T 1700 15 T 1750 15 T 1800 15 T 1850 15 T 1900 15 T 1950 15 T 2000 15 V 30 H 0 Z" 
               fill={Colors[theme].tint} 
               opacity={0.5} 
             />
          </Svg>
       </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  boatScene: {
    position: 'absolute',
    width: '100%',
    height: 150,
    bottom: '15%', // 相对于容器置于较低位置
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});
