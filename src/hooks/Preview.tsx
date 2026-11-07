// Превью хуков: все варианты подряд, у каждого своя палитра; в левом верхнем углу (зона вкладок TikTok,
// в настоящем ролике её не видно) — номер варианта и тип вопроса. zones — закрытые интерфейсом зоны красным.
import {AbsoluteFill, Series, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, useFontReady} from '../brand';
import {Zones} from './kit';
import {HOOKS, type HookDef} from './variants';

export type HooksPreviewProps = {zones?: boolean};

export const hooksFrames = (fps: number) => HOOKS.reduce((n, h) => n + Math.round(h.seconds * fps), 0);

const Tag = ({n, h}: {n: number; h: HookDef}) => (
  <div
    style={{
      position: 'absolute',
      left: 24,
      top: 30,
      padding: '12px 20px 14px',
      borderRadius: 14,
      background: 'rgba(0,0,0,0.62)',
      color: '#fff',
      fontSize: 30,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      textShadow: 'none',
    }}
  >
    №{n} · {h.kind} · {h.title}
  </div>
);

export const HookFrame = ({h, n, zones}: {h: HookDef; n: number; zones?: boolean}) => {
  const p = PALETTES[h.palette];
  return (
    <AbsoluteFill style={{fontFamily: FONT.fontFamily, fontWeight: 800, color: p.ink}}>
      <Background palette={p} />
      <h.C p={p} />
      {zones && <Zones />}
      <Tag n={n} h={h} />
    </AbsoluteFill>
  );
};

export const HooksPreview = ({zones}: HooksPreviewProps) => {
  const {fps} = useVideoConfig();
  const ready = useFontReady(); // до загрузки шрифта мерить текст нельзя
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {ready && (
        <Series>
          {HOOKS.map((h, i) => (
            <Series.Sequence key={i} durationInFrames={Math.round(h.seconds * fps)}>
              <HookFrame h={h} n={i + 1} zones={zones} />
            </Series.Sequence>
          ))}
        </Series>
      )}
    </AbsoluteFill>
  );
};

// Один вариант отдельно: n — номер с 1
export const HookOne = ({n, zones}: {n: number; zones?: boolean}) => {
  const ready = useFontReady();
  return <AbsoluteFill style={{background: '#000'}}>{ready && <HookFrame h={HOOKS[n - 1]} n={n} zones={zones} />}</AbsoluteFill>;
};
