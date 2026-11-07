// Шапка YouTube-канала, 2560×1440. Целиком видна только на телевизоре; на компьютере — полоса
// 2560×423 по центру, на телефоне — 1546×423. Слово и подпись — в телефонной зоне,
// линия «8=====» — левее, её видно на компьютере. Кадр n композиции «Banners» — вариант n.
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, WORD, textWidth, useFontReady, type PaletteId} from '../brand';

export const BANNER = {width: 2560, height: 1440, safe: {width: 1546, height: 423}};
export const BANNER_VARIANTS = [
  {kind: 'shaft', palette: 'emerald'},
  {kind: 'word', palette: 'emerald'},
  {kind: 'shaft', palette: 'night'},
  {kind: 'word', palette: 'night'},
] as const satisfies readonly {kind: 'shaft' | 'word'; palette: PaletteId}[];

// Тон — как в описании профиля (решающий, 2026-11-07)
const TAGLINE = ['Квиз не про знания, а про чёрный юмор,', 'шутки ниже пояса и песни, которые стыдно знать'];

export const Banner = ({kind, palette}: {kind: 'shaft' | 'word'; palette: PaletteId}) => {
  const ready = useFontReady();
  const p = PALETTES[palette];
  const word = WORD.head + WORD.tail;
  const size = ready ? Math.floor((100 * 1150) / textWidth(word, 100)) : 0;
  const wordW = ready ? textWidth(word, size) : 0;
  const left = (BANNER.width - wordW) / 2;
  const tag = ready ? Math.min(44, Math.floor((100 * 1400) / Math.max(...TAGLINE.map((l) => textWidth(l, 100))))) : 0;
  const eq = ready ? Math.floor((left - 110 - textWidth('8', size)) / textWidth('=', size)) : 0;
  const cy = BANNER.height / 2 - 70; // слово и две строки подписи — в зоне телефона 1546×423

  return (
    <AbsoluteFill>
      <Sequence from={-72} layout="none">
        <Background palette={p} />
      </Sequence>
      {ready && (
        <AbsoluteFill style={{fontFamily: FONT.fontFamily, fontWeight: 800, color: p.ink, whiteSpace: 'nowrap'}}>
          {kind === 'shaft' && (
            <div style={{position: 'absolute', right: BANNER.width - left, top: cy, transform: 'translateY(-50%)', fontSize: size, lineHeight: 1}}>
              {'8' + '='.repeat(eq)}
            </div>
          )}
          <div style={{position: 'absolute', left, top: cy, transform: 'translateY(-50%)', fontSize: size, lineHeight: 1}}>
            {word}
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: cy + size * 0.6, textAlign: 'center', fontSize: tag, lineHeight: 1.3}}>
            {TAGLINE.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const Banners = () => {
  const v = BANNER_VARIANTS[useCurrentFrame() % BANNER_VARIANTS.length];
  return <Banner kind={v.kind} palette={v.palette} />;
};
