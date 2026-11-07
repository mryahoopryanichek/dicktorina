// Аватар профиля, 1080×1080: TikTok, Instagram, YouTube. Площадки режут его в круг — всё важное
// внутри 75 % диаметра. Кадр n композиции «Avatars» — вариант n (лист для выбора).
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, textWidth, useFontReady, type PaletteId} from '../brand';

export const AVATAR_SIZE = 1080;
export const AVATAR_KINDS = ['D', 'D?', '8=D'] as const;
export type AvatarKind = (typeof AVATAR_KINDS)[number];
const AVATAR_PALETTES: PaletteId[] = ['emerald', 'night', 'sunset'];
export const AVATAR_VARIANTS = AVATAR_KINDS.flatMap((kind) => AVATAR_PALETTES.map((palette) => ({kind, palette})));

const FILL = {D: 0.5, 'D?': 0.6, '8=D': 0.7}; // доля ширины под текст: в круге по краям места меньше

export const Avatar = ({kind, palette}: {kind: AvatarKind; palette: PaletteId}) => {
  const ready = useFontReady();
  const p = PALETTES[palette];
  const size = ready ? Math.floor((100 * AVATAR_SIZE * FILL[kind]) / textWidth(kind, 100)) : 0;
  return (
    <AbsoluteFill>
      {/* Фон в момент 1,2 с: блик в стороне, искры не мельтешат */}
      <Sequence from={-72} layout="none">
        <Background palette={p} />
      </Sequence>
      {ready && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT.fontFamily,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1,
            color: p.ink,
            letterSpacing: kind === '8=D' ? -size * 0.02 : 0,
            // Буквы Unbounded сидят чуть выше середины строки — опустить
            paddingTop: size * 0.08,
            textShadow: '0 10px 40px rgba(0,0,0,0.18)',
          }}
        >
          {kind}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const Avatars = () => {
  const v = AVATAR_VARIANTS[useCurrentFrame() % AVATAR_VARIANTS.length];
  return <Avatar kind={v.kind} palette={v.palette} />;
};
