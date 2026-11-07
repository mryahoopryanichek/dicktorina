// Лист палитр: кадр n — концовка в палитре n, застывшая на моменте `8=====D` + кнопка.
// Подпись внизу, в зоне, которую на площадках всё равно закрывает интерфейс.
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {FONT, PALETTES, PALETTE_IDS} from './brand';
import {Outro} from './outro/Outro';

export const PALETTE_SHEET_AT = 120; // кадр концовки, 2 с

export const Palettes = () => {
  const frame = useCurrentFrame();
  const id = PALETTE_IDS[frame % PALETTE_IDS.length];
  return (
    <AbsoluteFill>
      {/* Сдвиг начала: внутри всегда кадр PALETTE_SHEET_AT. <Freeze> в 4.0.538 тут застывал не на том кадре */}
      <Sequence from={frame - PALETTE_SHEET_AT} layout="none">
        <Outro palette={id} />
      </Sequence>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 120,
          textAlign: 'center',
          fontFamily: FONT.fontFamily,
          fontWeight: 800,
          fontSize: 64,
          color: '#fff',
          textShadow: '0 3px 12px rgba(0,0,0,0.6)',
        }}
      >
        <div>{id}</div>
        <div style={{fontSize: 44, marginTop: 10}}>{PALETTES[id].name}</div>
      </div>
    </AbsoluteFill>
  );
};
