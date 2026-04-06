// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'arrow.counterclockwise': 'refresh',
  'arrow.clockwise': 'refresh',
  'person.fill': 'person',
  'stop.fill': 'stop',
  'calendar': 'calendar-today',
  'sun.max.fill': 'wb-sunny',
  'moon.fill': 'nightlight-round',
  'plus': 'add',
  'arrow.right.circle.fill': 'arrow-forward',
  'globe': 'language',
  'laptop': 'computer',
  'speaker.slash.fill': 'volume-off',
  'speaker.wave.2.fill': 'volume-up',
  'bubble.left.fill': 'chat',
  'xmark.circle.fill': 'close',
  'arrow.up.circle.fill': 'arrow-upward',
  'heart.fill': 'favorite',
  'book.fill': 'menu-book',
  'checkmark.circle.fill': 'check-circle',
  'circle': 'radio-button-unchecked',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
