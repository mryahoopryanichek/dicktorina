// Концовка ролика: вверху заставка Dикторины, ниже вопрос и призыв, стрелка вниз — на ник автора:
// на TikTok, Reels и Shorts он внизу слева. Всё выровнено по левому краю слова «Dикторина».
// Нижние ~20 % кадра и правый край закрыты интерфейсом площадок — текст стоит выше и левее.
// Пока звучит голос, 8=====D едет вправо; с концом фразы всё исчезает за EXIT секунд.
import type {ReactNode} from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, REEL, chipColors, textWidth, useFontReady, type Palette, type PaletteId} from '../brand';
import {IntroLayer, LINE_IN_END, logoMetrics} from '../intro/Intro';
import {VOICES, type VoiceId} from './voices';

export type {VoiceId};

export const CTA_TEXT = {
  question: ['Поиграл бы в такую', 'викторину?'],
  voice: 'Поиграл бы в такую викторину? Если да, регистрируйся на сайте. Наберём десять тысяч игроков — сделаем!',
  arrow: 'ссылка в профиле',
};

// Голоса — public/voices/<id>.mp3 и src/outro/voices.ts, их делает tools/voice.py

const VOICE_AT = 0.15; // голос начинается
const EXIT = 0.5; // за сколько всё исчезает в конце
const timing = (voice: VoiceId) => {
  const v = VOICES[voice];
  const end = VOICE_AT + v.len + 0.05;
  return {v, end, total: end + EXIT};
};
export const outroSeconds = (voice: VoiceId) => timing(voice).total; // длина концовки с этим голосом

const LEFT = 86; // левый край слова и текста, px
const LOGO_Y = 0.175; // середина слова, доля высоты кадра
const Q_TOP = 0.265; // верх вопроса
const SUB_MAX = 760; // ширина строк призыва: правее — кнопки площадок
const ARROW_TOP = 1096; // стрелка до ~1470 px: ниже начинается ник и подпись ролика

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Кусок текста выплывает снизу к моменту at
const Reveal = ({t, at, inline, children}: {t: number; at: number; inline?: boolean; children: ReactNode}) => {
  const k = interpolate(t, [at, at + 0.28], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{display: inline ? 'inline-block' : 'block', opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>
      {children}
    </div>
  );
};

// Стрелка-росчерк: дуга от подписи вниз к нику. Рисуется за 0,4 с, потом стучит по направлению острия.
const TIP_DIR = {x: 0.254, y: 0.967}; // куда смотрит острие
const Arrow = ({ink, glow, draw, beat}: {ink: string; glow: string; draw: number; beat: number}) => {
  const head = interpolate(draw, [0.75, 1], [0, 1], clamp);
  const body = {strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none'} as const;
  const shaft = 'M130 12 C40 70 30 200 70 352';
  const tip = 'M88 303 L70 352 L30 318';
  return (
    <svg
      width="160"
      height="380"
      viewBox="0 0 160 380"
      style={{
        display: 'block',
        overflow: 'visible',
        transform: `translate(${TIP_DIR.x * 22 * beat}px, ${TIP_DIR.y * 22 * beat}px)`,
        filter: `drop-shadow(0 0 ${8 + 14 * beat}px ${glow})`,
      }}
    >
      {/* Обводка цветом свечения и сердцевина цветом текста — читается на любом фоне */}
      <path d={shaft} {...body} stroke={glow} strokeWidth={34} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path d={shaft} {...body} stroke={ink} strokeWidth={18} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <g opacity={head} transform={`translate(70 352) scale(${0.4 + 0.6 * head}) translate(-70 -352)`}>
        <path d={tip} {...body} stroke={glow} strokeWidth={34} />
        <path d={tip} {...body} stroke={ink} strokeWidth={18} />
      </g>
    </svg>
  );
};

const Cta = ({palette, voice, t}: {palette: Palette; voice: VoiceId; t: number}) => {
  const {width, height} = useVideoConfig();
  const {fill, label} = chipColors(palette);
  const {full} = logoMetrics(width, LEFT);
  const {v, end} = timing(voice);
  const at = (s: number) => VOICE_AT + s;

  // Первая строка вопроса — ровно шириной слова «Dикторина» над ней
  const qSize = Math.floor((100 * full) / textWidth(CTA_TEXT.question[0], 100));
  // Строки короткие, чтобы шрифт был крупнее
  const widest = textWidth('игроков — сделаем!', 100);
  const subSize = Math.min(56, Math.floor((100 * SUB_MAX) / widest));

  const tA = at(v.reg) + 0.6; // стрелка — после «на сайте»
  const draw = interpolate(t, [tA, tA + 0.45], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const beat = t > tA + 0.45 ? Math.pow(Math.abs(Math.sin(Math.PI * 1.4 * (t - tA - 0.45))), 2) : 0;
  const labelIn = interpolate(t, [tA + 0.3, tA + 0.6], [0, 1], clamp);

  // В конце всё исчезает
  const out = interpolate(t, [end, end + EXIT], [1, 0], {...clamp, easing: Easing.in(Easing.cubic)});

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT.fontFamily,
        fontWeight: 800,
        color: palette.ink,
        opacity: out,
        transform: `translateY(${(1 - out) * -30}px)`,
      }}
    >
      <div style={{position: 'absolute', left: LEFT, top: Q_TOP * height, whiteSpace: 'nowrap'}}>
        <div style={{fontSize: qSize, lineHeight: 1.08}}>
          <Reveal t={t} at={0.1}>
            {CTA_TEXT.question[0]}
          </Reveal>
          <Reveal t={t} at={0.22}>
            {CTA_TEXT.question[1]}
          </Reveal>
        </div>
        <div style={{fontSize: subSize, lineHeight: 1.28, marginTop: 0.7 * qSize}}>
          <Reveal t={t} at={at(v.yes)}>
            Если да,
          </Reveal>
          <Reveal t={t} at={at(v.reg)}>
            регистрируйся
          </Reveal>
          <Reveal t={t} at={at(v.reg) + 0.45}>
            на сайте.
          </Reveal>
          <Reveal t={t} at={at(v.gather)}>
            Наберём <span style={{background: fill, color: label, borderRadius: 14, padding: '0 14px'}}>10&nbsp;000</span>
          </Reveal>
          <div>
            <Reveal t={t} at={at(v.gather) + 0.5} inline>
              игроков —
            </Reveal>{' '}
            <Reveal t={t} at={at(v.done)} inline>
              сделаем!
            </Reveal>
          </div>
        </div>
      </div>

      <div style={{position: 'absolute', left: LEFT - 30, top: ARROW_TOP}}>
        <Arrow ink={palette.ink} glow={label} draw={draw} beat={beat} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: LEFT + 130,
          top: ARROW_TOP + 262,
          fontSize: Math.min(50, subSize),
          lineHeight: 1.1,
          opacity: labelIn,
          transform: `translateX(${(1 - labelIn) * -24}px)`,
          textShadow: `0 0 ${10 + 14 * beat}px ${label}`,
        }}
      >
        {CTA_TEXT.arrow}
      </div>
    </AbsoluteFill>
  );
};

export type OutroProps = {palette: PaletteId; voice: VoiceId; silent?: boolean};

// Длина ролика — по длине голоса
export const outroMetadata: CalculateMetadataFunction<OutroProps> = ({props}) => ({
  durationInFrames: Math.round(timing(props.voice).total * REEL.fps),
});
export const outroStillAt = (voice: VoiceId) => timing(voice).end - 0.05; // всё на экране: для листа палитр

export const Outro = ({palette, voice, silent}: OutroProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ready = useFontReady();
  const p = PALETTES[palette];
  const {end} = timing(voice);
  return (
    <AbsoluteFill>
      <Background palette={p} />
      <IntroLayer ink={p.ink} y={LOGO_Y} left={LEFT} drift={[LINE_IN_END, end]} exit={EXIT} />
      {ready && <Cta palette={p} voice={voice} t={frame / fps} />}
      {!silent && (
        <Sequence from={Math.round(VOICE_AT * fps)} layout="none">
          <Html5Audio src={staticFile(`voices/${voice}.mp3`)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
