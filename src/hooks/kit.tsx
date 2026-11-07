// Общее для хуков: безопасная зона кадра, подгонка текста под ширину, появление строк, плашка, тряска.
// Нижние ~20 % кадра, правый край ~120 px и верхние ~7 % закрыты интерфейсом площадок — всё стоит внутри SAFE.
import type {CSSProperties, ReactNode} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {chipColors, textWidth, type Palette} from '../brand';

// Что закрыто: верх до top (вкладки TikTok), низ от bottom (ник, подпись), правее right (кнопки)
export const ZONES = {top: 134, bottom: 1536, right: 960};
// Где стоят текст и заглушки — с запасом от закрытых зон
export const SAFE = {left: 80, right: 940, top: 200, bottom: 1490};
export const SAFE_W = SAFE.right - SAFE.left;
// Ширина, под которую подгоняется текст: с запасом на перелёт масштаба (OVER)
export const FITW = Math.floor(SAFE_W / 1.04);

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const OVER = 1.04; // наибольший перелёт масштаба у выпрыгивающей строки
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Наибольший кегль, не больше max, при котором каждая строка влезает в width
export const fit = (lines: string[], width: number = SAFE_W, max = 120) =>
  Math.min(max, Math.floor(Math.min(...lines.map((l) => (100 * width) / textWidth(l, 100)))));

export const useTime = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps, t: frame / fps};
};

// Пружинка 0→1 с перелётом, начиная с момента at (с)
export const pop = (frame: number, fps: number, at: number, damping = 11) => {
  const f = frame - Math.round(at * fps);
  return f <= 0 ? 0 : spring({frame: f, fps, config: {damping, stiffness: 260, mass: 0.6}});
};

// Тряска кадра после удара в момент at
export const shake = (t: number, at: number, dur = 0.35, amp = 16) => {
  const d = t - at;
  if (d < 0 || d > dur) return {x: 0, y: 0};
  const k = 1 - d / dur;
  return {x: amp * k * Math.sin(d * 95), y: amp * k * Math.cos(d * 71)};
};

const luma = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Подложка под текст: белому — тёмная тень, тёмному — светлое свечение. Иначе текст тонет в блике и искрах
export const inkShadow = (p: Palette) =>
  luma(p.ink) > 0.5
    ? '0 4px 0 rgba(0,0,0,0.18), 0 0 30px rgba(0,0,0,0.45)'
    : '0 0 28px rgba(255,255,255,0.55), 0 0 8px rgba(255,255,255,0.35)';

// Строка хука. at ≤ 0 — видна с первого кадра (ролик не начинается с пустоты) и чуть дорастает до размера;
// at > 0 — выпрыгивает к этому моменту, место под ней занято заранее, блок не прыгает.
// Масштаб не больше OVER: строки подогнаны под ширину безопасной зоны, крупнее — заедут под кнопки площадок
export const Line = ({
  at = 0,
  size,
  children,
  rotate = 0,
  style,
}: {
  at?: number;
  size: number;
  children: ReactNode;
  rotate?: number;
  style?: CSSProperties;
}) => {
  const {frame, fps, t} = useTime();
  let scale = 1;
  let opacity = 1;
  let y = 0;
  if (at <= 0) {
    const k = clamp01(t / 0.22);
    scale = 0.9 + 0.1 * (1 - Math.pow(1 - k, 3));
  } else {
    const k = pop(frame, fps, at);
    opacity = clamp01(k * 3);
    scale = Math.min(OVER, 0.5 + 0.5 * k);
    y = (1 - k) * 34;
  }
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1.12,
        whiteSpace: 'nowrap',
        opacity,
        transform: `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: '0% 50%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Плашка-акцент: заливка цветом текста, буквы — контрастным цветом палитры
export const Chip = ({p, children, style}: {p: Palette; children: ReactNode; style?: CSSProperties}) => {
  const {fill, label} = chipColors(p);
  return (
    <span
      style={{
        display: 'inline-block',
        background: fill,
        color: label,
        borderRadius: '0.2em',
        padding: '0.02em 0.24em 0.08em',
        textShadow: 'none',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

// Блок строк хука: от левого края безопасной зоны
export const Block = ({p, top = SAFE.top + 30, children}: {p: Palette; top?: number; children: ReactNode}) => (
  <div style={{position: 'absolute', left: SAFE.left, top, textShadow: inkShadow(p)}}>{children}</div>
);

// Для проверки: закрытые интерфейсом зоны красным
export const Zones = () => {
  const z = {position: 'absolute', background: 'rgba(255,0,0,0.28)'} as const;
  return (
    <>
      <div style={{...z, left: 0, right: 0, top: 0, height: ZONES.top}} />
      <div style={{...z, left: 0, right: 0, top: ZONES.bottom, bottom: 0}} />
      <div style={{...z, left: ZONES.right, right: 0, top: ZONES.top, height: ZONES.bottom - ZONES.top}} />
    </>
  );
};
