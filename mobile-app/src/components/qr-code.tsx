import { useMemo } from 'react';
import { Svg, Rect } from 'react-native-svg';

import { Brand } from '@/constants/brand';

export function QRCode({ value, size = 120, color = '#1e293b' }: { value: string; size?: number; color?: string }) {
  const modules = useMemo(() => {
    const qr = require('qrcode-generator')(0, 'H');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const matrix: boolean[][] = [];
    for (let r = 0; r < count; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c));
      }
      matrix.push(row);
    }
    return matrix;
  }, [value]);

  const count = modules.length;
  const cellSize = size / count;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill="#fff" />
      {modules.map((row, r) =>
        row.map((isDark, c) =>
          isDark ? (
            <Rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}