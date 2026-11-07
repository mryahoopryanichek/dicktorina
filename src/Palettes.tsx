// Лист палитр: кадр n — концовка в палитре n, застывшая на моменте, когда на экране всё.
// Подпись внизу, в зоне, которую на площадках всё равно закрывает интерфейс.
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, PALETTES, PALETTE_IDS} from './brand';
import {Outro, outroStillAt} from './outro/Outro';


export const Palettes = () => {
  const frame = useCurrentFrame();
  const at = Math.round(outroStillAt('andrew') * useVideoConfig().fps);
  const id = PALETTE_IDS[frame % PALETTE_IDS.length];
  return (
    <AbsoluteFill>
      {/* Сдвиг начала: внутри всегда кадр at. <Freeze> в 4.0.538 тут застывал не на том кадре */}
      <Sequence from={frame - at} layout="none">
        <Outro palette={id} voice="andrew" silent />
      </Sequence>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
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
