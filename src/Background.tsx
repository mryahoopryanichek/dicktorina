// Фон ролика: градиент палитры (low — низ-лево, high — верх) медленно переливается,
// по нему раз в несколько секунд проходит блик, вверху мерцают искры, сверху лёгкое зерно.
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Palette} from './brand';

const SPARKS = 34; // искр в кадре
const SWEEP_S = 3.2; // период блика, с

const sparks = Array.from({length: SPARKS}, (_, i) => ({
  x: random(`sx${i}`) * 100,
  y: Math.pow(random(`sy${i}`), 1.6) * 60, // гуще вверху, в «золоте»
  size: 8 + random(`ss${i}`) * 22,
  speed: 1.5 + random(`sv${i}`) * 2.5,
  phase: random(`sp${i}`) * Math.PI * 2,
}));

const Star = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={{display: 'block'}}>
    <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill="#fff" />
  </svg>
);

export const Background = ({palette}: {palette: Palette}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dx = Math.sin(t * 0.7) * 7;
  const dy = Math.cos(t * 0.55) * 5;
  const sweep = ((t % SWEEP_S) / SWEEP_S) * 260 - 80;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(130% 85% at ${8 + dx}% ${98 + dy}%, ${palette.low} 0%, transparent 62%)`,
            `radial-gradient(120% 80% at ${72 - dx}% ${2 - dy}%, ${palette.high} 0%, transparent 64%)`,
            `linear-gradient(205deg, ${palette.high} 0%, ${palette.low} 100%)`,
          ].join(','),
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(115deg, transparent ${sweep - 14}%, rgba(255,255,255,0.45) ${sweep}%, transparent ${sweep + 14}%)`,
          mixBlendMode: 'soft-light',
        }}
      />
      {sparks.map((s, i) => {
        const a = Math.pow(Math.max(0, Math.sin(t * s.speed + s.phase)), 6);
        if (a < 0.02) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              opacity: a,
              transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * a}) rotate(${t * 40 + i * 13}deg)`,
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.9))',
            }}
          >
            <Star size={s.size} />
          </div>
        );
      })}
      <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'overlay'}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
