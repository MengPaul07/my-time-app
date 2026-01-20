import { ThemeDefinition } from '@/modules/themes/types';
import { DefaultColors } from './colors';
import { DefaultSounds } from './sounds';
import { MainAnimation } from './components/MainAnimation';

export const DefaultTheme: ThemeDefinition = {
  id: 'default',
  name: 'Default (Blue/Teal)',
  colors: DefaultColors,
  sounds: DefaultSounds,
  AnimationComponent: MainAnimation,
};
