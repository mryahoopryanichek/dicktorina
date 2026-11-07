// Концовка ролика: вверху заставка Dикторины, ниже вопрос и призыв, стрелка вниз — на ник автора:
// на TikTok, Reels и Shorts он внизу слева. Всё выровнено по левому краю слова «Dикторина».
// Нижние ~20 % кадра и правый край закрыты интерфейсом площадок — текст стоит выше и левее.
import type {ReactNode} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, chipColors, textWidth, useFontReady, type Palette, type PaletteId} from '../brand';
import {IntroLayer, logoMetrics} from '../intro/Intro';

// Голос призыва: начала кусков фразы, с — по образцу en-US-AvaMultilingualNeural (out/voices/1-ava.mp3).
// Строки текста появляются вместе со своим куском.
const VOICE_AT = 0.15;
const VOICE_LEN = 6.0;
const CUES = [0, 1.66, 2.41, 3.86, 5.44];
const cue = (i: number) => VOICE_AT + CUES[i];

export const OUTRO_SECONDS = 6.5;
export const OUTRO_STILL_AT = 5.8; // всё на экране: для листа палитр
const LEAVE: [number, number] = [VOICE_AT + VOICE_LEN - 0.2, OUTRO_SECONDS]; // 8=====D уезжает с концом фразы

const LEFT = 86; // левый край слова и текста, px
const LOGO_Y = 0.2; // середина слова, доля высоты кадра
const Q_TOP = 0.3; // верх вопроса
const SUB_MAX = 820; // ширина строк призыва: правее — кнопки площадок
const ARROW_TOP = 1210; // стрелка до ~1490 px: ниже начинается ник и подпись ролика

export const CTA_TEXT = {
  question: ['Поиграл бы в такую', 'викторину?'],
  voice: 'Поиграл бы в такую викторину? Если да — регистрируйся на сайте. Когда нас будет тысяча — сделаем!',
  arrow: 'ссылка в профиле',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Строка выплывает снизу к моменту at
const Reveal = ({t, at, children}: {t: number; at: number; children: ReactNode}) => {
  const k = interpolate(t, [at, at + 0.28], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return <div style={{opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>{children}</div>;
};

const Arrow = ({color}: {color: string}) => (
  <svg width="100" height="250" viewBox="0 0 100 250" style={{display: 'block', overflow: 'visible'}}>
    <g fill="none" stroke={color} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 14 V222" />
      <path d="M12 166 L50 226 L88 166" />
    </g>
  </svg>
);

const Cta = ({palette, t}: {palette: Palette; t: number}) => {
  const {width, height} = useVideoConfig();
  const {fill, label} = chipColors(palette);
  const {full} = logoMetrics(width, LEFT);

  // Первая строка вопроса — ровно шириной слова: 8=====D над ней кончается там же, где фраза
  const qSize = Math.floor((100 * full) / textWidth(CTA_TEXT.question[0], 100));
  // Строки короткие, чтобы шрифт был крупнее: широкая строка уходит под кнопки площадок
  const subLines = ['Если да —', 'регистрируйся', 'на сайте.', 'Когда нас будет', '1000 — сделаем!'];
  const subSize = Math.min(56, Math.floor((100 * (SUB_MAX - 60)) / Math.max(...subLines.map((l) => textWidth(l, 100)))));

  const tA = cue(2) + 0.6; // стрелка появляется после «на сайте»
  const a = interpolate(t, [tA, tA + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
  const bounce = t > tA ? 26 * (1 - Math.abs(Math.sin(Math.PI * 1.5 * (t - tA)))) : 0; // стучит вниз
  const glow = (Math.sin((t - tA) * Math.PI * 3) + 1) / 2;

  return (
    <AbsoluteFill style={{fontFamily: FONT.fontFamily, fontWeight: 800, color: palette.ink}}>
      <div style={{position: 'absolute', left: LEFT, top: Q_TOP * height}}>
        <div style={{fontSize: qSize, lineHeight: 1.08, whiteSpace: 'nowrap'}}>
          <Reveal t={t} at={0.1}>
            {CTA_TEXT.question[0]}
          </Reveal>
          <Reveal t={t} at={0.22}>
            {CTA_TEXT.question[1]}
          </Reveal>
        </div>
        <div style={{fontSize: subSize, lineHeight: 1.28, marginTop: 0.8 * qSize, whiteSpace: 'nowrap'}}>
          <Reveal t={t} at={cue(1)}>
            {subLines[0]}
          </Reveal>
          <Reveal t={t} at={cue(2)}>
            {subLines[1]}
          </Reveal>
          <Reveal t={t} at={cue(2) + 0.45}>
            {subLines[2]}
          </Reveal>
          <Reveal t={t} at={cue(3)}>
            {subLines[3]}
          </Reveal>
          <div style={{display: 'flex', gap: '0.3em'}}>
            <Reveal t={t} at={cue(3) + 0.7}>
              <span style={{background: fill, color: label, borderRadius: 14, padding: '0 14px'}}>1000</span> —
            </Reveal>
            <Reveal t={t} at={cue(4)}>
              сделаем!
            </Reveal>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: ARROW_TOP,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 26,
          opacity: Math.min(1, a),
          transform: `scale(${0.6 + 0.4 * a})`,
          transformOrigin: '50px 0',
        }}
      >
        <div
          style={{
            transform: `translateY(${bounce}px)`,
            filter: `drop-shadow(0 0 ${10 + 16 * glow}px ${label})`,
          }}
        >
          <Arrow color={palette.ink} />
        </div>
        <div style={{fontSize: Math.min(50, subSize), lineHeight: 1.1, marginTop: 6, textShadow: `0 0 ${8 + 18 * glow}px ${label}`}}>
          {CTA_TEXT.arrow}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export type OutroProps = {palette: PaletteId};

export const Outro = ({palette}: OutroProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ready = useFontReady();
  const p = PALETTES[palette];
  return (
    <AbsoluteFill>
      <Background palette={p} />
      <IntroLayer ink={p.ink} y={LOGO_Y} left={LEFT} leaveAt={LEAVE} />
      {ready && <Cta palette={p} t={frame / fps} />}
    </AbsoluteFill>
  );
};
