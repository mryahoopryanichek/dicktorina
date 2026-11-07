// Концовка ролика, 4 с: вверху заставка Dикторины, ниже — призыв записаться кнопкой.
// Нижние ~20 % кадра и правый край закрыты интерфейсом TikTok, Reels и Shorts — призыв стоит выше
// и чуть левее середины.
import {AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, buttonColors, type Palette, type PaletteId} from '../brand';
import {INTRO_SECONDS, IntroLayer} from '../intro/Intro';

export const OUTRO_SECONDS = 4;
const LOGO_Y = 0.27; // середина слова, доля высоты кадра
const CTA_TOP = 0.505; // верх призыва
const CTA_LEFT = 90; // призыв: x от 90 до 910 — правее кнопки площадок
const CTA_WIDTH = 820;

export const CTA_TEXT = {
  question: ['Хотите', 'полную игру?'],
  button: 'Регистрируйтесь',
  hint: 'ссылка в профиле',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Cta = ({palette}: {palette: Palette}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const {fill, label} = buttonColors(palette);

  // Вопрос выплывает снизу, кнопка следом выпрыгивает
  const q = interpolate(t, [0.1, 0.5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const pop = spring({frame: frame - Math.round(0.35 * fps), fps, config: {damping: 9, stiffness: 140, mass: 0.8}});

  // Потом кнопка дышит, по ней бежит блик, от неё расходятся кольца — как от нажатия
  const beat = (Math.sin((t - 0.35) * Math.PI * 2 * 1.4) + 1) / 2; // 0..1, 1,4 раза в секунду
  const live = t > 0.8 ? 1 : 0;
  const scale = pop * (1 + live * 0.035 * beat);
  const SHINE_S = 1.3;
  const shine = t < 0.9 ? -1 : ((t - 0.9) % SHINE_S) / SHINE_S; // 0..1 — блик проходит за первую половину
  const RING_S = 1.0;
  const ring = t < 1.0 ? -1 : ((t - 1.0) % RING_S) / RING_S;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${CTA_TOP * 100}%`,
        left: CTA_LEFT,
        width: CTA_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT.fontFamily,
        fontWeight: 800,
        color: palette.ink,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 84,
          lineHeight: 1.12,
          letterSpacing: -1,
          opacity: q,
          transform: `translateY(${(1 - q) * 40}px)`,
        }}
      >
        {CTA_TEXT.question.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div style={{position: 'relative', marginTop: 54, transform: `scale(${scale})`, opacity: Math.min(1, pop * 3)}}>
        {ring >= 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              border: `6px solid ${fill}`,
              opacity: 0.8 * (1 - ring),
              transform: `scale(${1 + ring * 0.28}, ${1 + ring * 0.6})`,
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 999,
            background: fill,
            color: label,
            padding: '30px 64px 32px',
            boxShadow: `0 0 ${36 + 34 * beat * live}px ${label}, 0 14px 30px rgba(0,0,0,0.28)`,
          }}
        >
          <div style={{fontSize: 58, lineHeight: 1.05, letterSpacing: -0.5}}>{CTA_TEXT.button}</div>
          <div style={{fontSize: 30, lineHeight: 1.2, marginTop: 10, letterSpacing: 1, opacity: 0.85}}>
            {CTA_TEXT.hint}
          </div>
          {shine >= 0 && shine < 0.55 && (
            <div
              style={{
                position: 'absolute',
                top: -20,
                bottom: -20,
                width: 120,
                left: `${-30 + (shine / 0.55) * 160}%`,
                transform: 'skewX(-20deg)',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export type OutroProps = {palette: PaletteId};

export const Outro = ({palette}: OutroProps) => {
  const {fps} = useVideoConfig();
  const p = PALETTES[palette];
  return (
    <AbsoluteFill>
      <Background palette={p} />
      <Sequence durationInFrames={Math.round(INTRO_SECONDS * fps)} layout="none">
        <IntroLayer ink={p.ink} y={LOGO_Y} />
      </Sequence>
      <Cta palette={p} />
    </AbsoluteFill>
  );
};
