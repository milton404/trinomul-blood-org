import { useId } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Brand } from '@/constants/brand';

const DROP_PATH =
  'M24 2 C 38 18, 45 28, 45 34 C 45 42, 38 46, 24 46 C 10 46, 3 42, 3 34 C 3 28, 10 18, 24 2 Z';

export function BloodDrop({ size = 48 }: { size?: number }) {
  const rawId = useId().replace(/:/g, '');
  const gradId = `blood-grad-${rawId}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={Brand.gradientStart} />
          <Stop offset="100%" stopColor={Brand.gradientEnd} />
        </LinearGradient>
      </Defs>
      <Path d={DROP_PATH} fill={`url(#${gradId})`} />
    </Svg>
  );
}