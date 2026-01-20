import React from 'react';
import { ColorValue } from 'react-native';

export interface ThemeColors {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  card: string;
  border: string;
}

export interface ThemeSounds {
  backgroundNoise?: any; // e.g., require('./noise.mp3')
  lofi?: any;           // e.g., require('./lofi.mp3')
  accent?: any;         // e.g., require('./accent.mp3')
  events: {
    start: any | string;
    complete: any | string;
    end: any | string;
    tick: any | string;
  };
}

export interface ThemeDefinition {
  id: string;
  name: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  sounds: ThemeSounds;
  // The main animation component for the home screen
  AnimationComponent: React.ComponentType<any>; 
}
