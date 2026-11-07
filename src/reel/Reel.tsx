// Ролик-вопрос. Сценарий (решающий, 2026-11-07):
// 1) медиа на весь экран — видео, картинка или песня (эквалайзер);
// 2) медиа сжимается в рамку, появляется вопрос, голос его читает (звук медиа приглушён);
// 3) таймер ровно 5 с — «пиши ответ в комменты»;
// 4) ответ: верный вариант подсвечен или ответ крупно, голос его называет; картинка может смениться на «ответ»;
// 5) концовка проявляется поверх.
// Всё стоит в безопасной зоне: верх ~8 % — вкладки TikTok, низ ~20 % и правый край — интерфейс площадок.
import type {ReactNode} from 'react';
import {
  AbsoluteFill,
  Easing,
  Freeze,
  Html5Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import {Background} from '../Background';
import {FONT, PALETTES, REEL, chipColors, textWidth, useFontReady, type Palette, type PaletteId} from '../brand';
import {Outro, outroSeconds, type VoiceId} from '../outro/Outro';
import {QUESTIONS, type QuestionId} from './questions';
import {LINES} from './voiceLines';

export type Media =
  // revealSrc — картинка на ответе; hide — [x, y, w, h] долями картинки: размыто до ответа (нужен aspect = ширина/высота)
  | {kind: 'image'; src: string; revealSrc?: string; fit?: 'cover' | 'contain'; aspect?: number; hide?: number[]; revealZoom?: number[]} // revealZoom — [x, y, во сколько раз] наезд на ответе
  | {kind: 'grid'; srcs: string[]} // ребус: картинки плитками 2×2
  // видео: на весь экран играет from…stopAt, на вопросе стоп-кадр, на ответе досматриваем revealFor секунд
  | {kind: 'video'; src: string; from?: number; stopAt?: number; revealFor?: number; muted?: boolean; fit?: 'cover' | 'contain'}
  | {kind: 'audio'; src: string; from?: number};

export type Question = {
  tag: string; // плашка сверху: «Угадай песню», «Да или нет», «Сколько стоит на Авито»
  text: string; // на экране
  say?: string; // голосом, если отличается от text
  options?: string[]; // варианты; без них ответ открытый — пишут в комменты
  answer: number | string; // номер верного варианта (с 0) или текст ответа
  answerSay?: string; // голосом на ответе; без него — «Правильный ответ — …»
  note?: string; // подпись под ответом
  media?: Media;
  revealAudio?: {src: string; from?: number}; // звук на ответе — например, сама песня
  hook?: string; // входящий хук: «ВНИМАНИЕ!» + эта строка крупно и голосом, например «Вопрос на знание Авито»
  hookSay?: string; // голосом, если отличается от «Внимание! {hook}!»
  music?: {src: string; from?: number}; // музыка, что играла на этом вопросе в игре — под всем роликом
};

export type ReelProps = {q: QuestionId; palette: PaletteId; voice: VoiceId}; // q — id из questions.json

const W = REEL.width;
const H = REEL.height;
const LEFT = 86;
const WIDTH = 850; // правый край 936 px: дальше — кнопки площадок
const CHIP_Y = 150; // выше — вкладки TikTok
const FOOTER_Y = 1418; // таймер до 1500; ниже — ник и подпись ролика
const OPT_H = 92;
const THINK = 5; // таймер, с — ровно 5
const C = {full: 1.6, shrink: 0.55, step: 0.12, fade: 0.35};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const reelTiming = (id: QuestionId, voice: VoiceId) => {
  const q = QUESTIONS[id];
  const lines = LINES[id]?.[voice];
  const hookAt = 0.05;
  const hookLen = q.hook ? Math.max(1.5, (lines?.h?.len ?? 1.4) + 0.3) : 0;
  const hookEnd = q.hook ? hookAt + hookLen : 0;
  const m = q.media;
  // сколько медиа на весь экран: видео — свой кусок, песня — подольше, картинка — коротко
  const fullBase = !m
    ? 0
    : m.kind === 'video'
      ? (m.stopAt ?? (m.from ?? 0) + 4) - (m.from ?? 0)
      : m.kind === 'audio'
        ? 2.5
        : m.kind === 'grid'
          ? 1.8
          : C.full;
  const full = Math.max(fullBase, hookEnd > 0 ? hookEnd + 0.35 : 0);
  const sayAt = full + 0.15;
  const sayLen = lines?.q.len ?? 2;
  const optsAt = full + 0.35;
  const optsEnd = optsAt + (q.options?.length ?? 0) * C.step + 0.3;
  const thinkAt = Math.max(sayAt + sayLen + 0.15, optsEnd);
  const reveal = thinkAt + THINK;
  const answerAt = reveal + 0.15;
  const answerLen = lines?.a.len ?? 1.5;
  const revealFor = m?.kind === 'video' ? (m.revealFor ?? 0) : 0;
  const hold = Math.max(2, 0.15 + answerLen + 0.6, revealFor, q.revealAudio ? 4 : 0);
  const outroAt = reveal + hold - C.fade;
  return {lines, hookAt, hookEnd, hookVoice: lines?.h?.len ?? 0, full, sayAt, sayLen, optsAt, thinkAt, reveal, answerAt, answerLen, outroAt, total: outroAt + outroSeconds(voice)};
};
type Timing = ReturnType<typeof reelTiming>;

export const reelMetadata: CalculateMetadataFunction<ReelProps> = ({props}) => ({
  durationInFrames: Math.round(reelTiming(props.q, props.voice).total * REEL.fps),
});

// Перенос по словам шрифтом бренда; самый крупный размер, при котором текст влезает в maxH
function fitText(text: string, maxW: number, maxH: number, sizes = [74, 68, 62, 56, 50, 46, 42]) {
  for (const size of sizes) {
    const lines: string[] = [];
    let cur = '';
    for (const word of text.split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = word;
      }
    }
    lines.push(cur);
    if (lines.length * size * 1.1 <= maxH) return {size, height: lines.length * size * 1.1};
  }
  return {size: sizes[sizes.length - 1], height: maxH};
}

const Rise = ({t, at, children}: {t: number; at: number; children: ReactNode}) => {
  const k = interpolate(t, [at, at + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return <div style={{opacity: k, transform: `translateY(${(1 - k) * 28}px)`}}>{children}</div>;
};

// Эквалайзер, когда вопрос — песня. Не по звуку, но живой
const Equalizer = ({p, t, bars = 18}: {p: Palette; t: number; bars?: number}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: '1.2%', width: '100%', height: '100%', padding: '0 6%'}}>
    {Array.from({length: bars}, (_, i) => {
      const sp = 5 + random(`eq-s${i}`) * 7;
      const ph = random(`eq-p${i}`) * Math.PI * 2;
      const h = 0.18 + 0.82 * Math.pow(Math.abs(Math.sin(t * sp + ph)), 1.4);
      return <div key={i} style={{flex: 1, height: `${h * 60}%`, borderRadius: 99, background: p.ink, opacity: 0.85}} />;
    })}
  </div>
);

// Громкость звука медиа: полная, пока медиа на весь экран; тише под голосом; к концовке — в ноль
function mediaVolume(t: number, s: Timing) {
  const under = (a: number, b: number) => interpolate(t, [a - 0.15, a, b, b + 0.15], [0, 1, 1, 0], clamp);
  const duck = Math.max(under(s.hookAt, s.hookAt + s.hookVoice), under(s.sayAt, s.sayAt + s.sayLen), under(s.answerAt, s.answerAt + s.answerLen));
  const base = t < s.thinkAt ? 1 : 0.75;
  const end = interpolate(t, [s.outroAt - 0.3, s.outroAt + C.fade], [1, 0], clamp);
  return base * (1 - 0.78 * duck) * end;
}

// Наезд на ответе: точка [x, y] картинки уезжает в центр рамки, увеличение z
const ZOOM = {start: 0.45, end: 1.25};
function zoomTransform(t: number, s: Timing, k: number, zoom?: number[]) {
  const base = t < s.full ? 1 + 0.05 * (t / s.full) : 1.05 - 0.05 * k;
  if (!zoom) return `scale(${base})`;
  const zk = interpolate(t, [s.reveal + ZOOM.start, s.reveal + ZOOM.end], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const z = base * (1 + (zoom[2] - 1) * zk);
  return `translate(${-(zoom[0] - 0.5) * z * 100 * zk}%, ${-(zoom[1] - 0.5) * z * 100 * zk}%) scale(${z})`;
}

// Видео: играет кусок до развязки → стоп-кадр, пока вопрос и таймер → развязка на ответе
const VideoPhases = ({m, s}: {m: Extract<Media, {kind: 'video'}>; s: Timing}) => {
  const {fps} = useVideoConfig();
  const from = m.from ?? 0;
  const stop = m.stopAt ?? from + s.full;
  const contain = m.fit === 'contain';
  const style = contain
    ? ({position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain'} as const)
    : ({width: '100%', height: '100%', objectFit: m.fit ?? 'cover'} as const);
  const back = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.6)', transform: 'scale(1.15)'} as const;
  const src = staticFile(`media/${m.src}`);
  // фон-размытие идёт той же копией видео без звука
  const blur = (trim: number) => (contain ? <OffthreadVideo src={src} trimBefore={trim} muted style={back} /> : null);
  return (
    <>
      <Sequence durationInFrames={Math.round(s.full * fps)} layout="none">
        {blur(Math.round(from * fps))}
        <OffthreadVideo src={src} trimBefore={Math.round(from * fps)} muted={m.muted} volume={(f) => mediaVolume(f / fps, s)} style={style} />
      </Sequence>
      <Sequence from={Math.round(s.full * fps)} durationInFrames={Math.round((s.reveal - s.full) * fps)} layout="none">
        <Freeze frame={0}>
          {blur(Math.round(stop * fps))}
          <OffthreadVideo src={src} trimBefore={Math.round(stop * fps)} muted style={style} />
        </Freeze>
      </Sequence>
      <Sequence from={Math.round(s.reveal * fps)} layout="none">
        {blur(Math.round(stop * fps))}
        <OffthreadVideo
          src={src}
          trimBefore={Math.round(stop * fps)}
          muted={m.muted}
          volume={(f) => mediaVolume(s.reveal + f / fps, s)}
          style={style}
        />
      </Sequence>
    </>
  );
};

function musicVolume(t: number, s: Timing, q: Question) {
  const under = (a: number, b: number) => interpolate(t, [a - 0.15, a, b, b + 0.15], [0, 1, 1, 0], clamp);
  const duck = Math.max(under(s.hookAt, s.hookAt + s.hookVoice), under(s.sayAt, s.sayAt + s.sayLen), under(s.answerAt, s.answerAt + s.answerLen));
  const m = q.media;
  const quietAfterReveal = q.revealAudio || (m?.kind === 'video' && (m.revealFor ?? 0) > 0);
  const afterReveal = quietAfterReveal ? interpolate(t, [s.reveal - 0.1, s.reveal + 0.3], [1, 0], clamp) : 1;
  const start = m?.kind === 'video' ? interpolate(t, [s.full, s.full + 0.4], [0, 1], clamp) : interpolate(t, [0, 0.3], [0, 1], clamp);
  const end = interpolate(t, [s.outroAt - 0.3, s.outroAt + C.fade], [1, 0], clamp);
  return 0.55 * (1 - 0.75 * duck) * afterReveal * start * end;
}

// Входящий хук: затемнение медиа, мигающее «ВНИМАНИЕ!» и строка крупно со штампом
const Hook = ({q, t, s}: {q: Question; t: number; s: Timing}) => {
  const {fps} = useVideoConfig();
  const ready = useFontReady();
  if (!q.hook || t > s.hookEnd + 0.3) return null;
  const local = t - s.hookAt;
  const inK = spring({frame: Math.round(local * fps), fps, config: {damping: 9, stiffness: 190, mass: 0.7}});
  const outK = interpolate(t, [s.hookEnd - 0.05, s.hookEnd + 0.25], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const shake = local < 0.3 ? Math.sin(local * 95) * 10 * (1 - local / 0.3) : 0;
  const red = Math.floor(local * 4) % 2 === 0;
  const fit = ready ? fitText(q.hook, WIDTH, 420, [104, 96, 88, 80, 72, 64]) : {size: 80, height: 300};
  return (
    <AbsoluteFill style={{background: `rgba(0,0,0,${0.5 * (1 - outK)})`}}>
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: 560,
          width: WIDTH,
          opacity: Math.min(1, inK * 2) * (1 - outK),
          transform: `translateX(${shake}px) scale(${(1.35 - 0.35 * inK) * (1 + 0.12 * outK)}) rotate(-2deg)`,
          transformOrigin: 'left center',
          fontFamily: FONT.fontFamily,
          fontWeight: 800,
          color: '#fff',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            background: red ? '#FF2D3A' : '#fff',
            color: red ? '#fff' : '#FF2D3A',
            borderRadius: 16,
            padding: '10px 26px',
            fontSize: 52,
            letterSpacing: 2,
          }}
        >
          ВНИМАНИЕ!
        </span>
        <div style={{marginTop: 28, fontSize: fit.size, lineHeight: 1.06, textShadow: '0 6px 30px rgba(0,0,0,0.7)'}}>{q.hook}</div>
      </div>
    </AbsoluteFill>
  );
};

const Options = ({q, p, t, at, reveal}: {q: Question; p: Palette; t: number; at: number; reveal: number}) => {
  const {fps} = useVideoConfig();
  const opts = q.options ?? [];
  const {fill, label} = chipColors(p);
  const short = opts.every((o) => o.length <= 13);
  const shown = t >= reveal;
  const pop = spring({frame: Math.round((t - reveal) * fps), fps, config: {damping: 10, stiffness: 160}});
  return (
    <div style={{display: 'grid', gridTemplateColumns: short ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 16}}>
      {opts.map((o, i) => {
        const right = i === q.answer;
        return (
          <Rise key={o} t={t} at={at + i * C.step}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                height: OPT_H,
                padding: '0 24px',
                borderRadius: 28,
                fontSize: short ? 40 : 32,
                lineHeight: 1.1,
                whiteSpace: short ? 'nowrap' : 'normal',
                overflow: 'hidden',
                background: shown && right ? fill : `${p.ink}1F`,
                color: shown && right ? label : p.ink,
                border: `3px solid ${p.ink}40`,
                opacity: shown && !right ? 0.35 : 1,
                transform: shown && right ? `scale(${1 + 0.06 * Math.max(0, 1 - Math.abs(pop - 1) * 3)})` : undefined,
              }}
            >
              <span style={{opacity: 0.6, fontSize: 30}}>{shown && right ? '✓' : 'ABCD'[i]}</span>
              <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{o}</span>
            </div>
          </Rise>
        );
      })}
    </div>
  );
};

export const Reel = ({q: id, palette, voice}: ReelProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ready = useFontReady();
  const t = frame / fps;
  const q = QUESTIONS[id];
  const p = PALETTES[palette];
  const {fill, label} = chipColors(p);
  const s = reelTiming(id, voice);
  const m = q.media;

  // Раскладка сверху вниз: плашка, вопрос, рамка медиа, варианты, таймер
  const nOpt = q.options?.length ?? 0;
  const short = (q.options ?? []).every((o) => o.length <= 13);
  const optsH = nOpt ? (short ? Math.ceil(nOpt / 2) : nOpt) * (OPT_H + 16) - 16 : 0;
  const optsY = FOOTER_Y - 30 - optsH;
  const textY = CHIP_Y + 82;
  const fit = ready ? fitText(q.text, WIDTH, m ? 300 : optsY - textY - 60) : {size: 60, height: 200};
  const boxY = textY + fit.height + 34;
  const boxH = (nOpt ? optsY : FOOTER_Y) - 34 - boxY;

  // Медиа: весь экран → рамка
  const k = interpolate(t, [s.full, s.full + C.shrink], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const rect = {
    left: interpolate(k, [0, 1], [0, LEFT]),
    top: interpolate(k, [0, 1], [0, boxY]),
    width: interpolate(k, [0, 1], [W, WIDTH]),
    height: interpolate(k, [0, 1], [H, boxH]),
  };
  const radius = interpolate(k, [0, 1], [0, 34]);
  const ui = interpolate(t, [s.outroAt, s.outroAt + C.fade], [1, 0], clamp);
  const revealed = t >= s.reveal;
  const swap = m?.kind === 'image' && revealed && m.revealSrc;
  const pop = spring({frame: Math.round((t - s.reveal) * fps), fps, config: {damping: 11, stiffness: 150}});
  const timerK = interpolate(t, [s.thinkAt, s.reveal], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Background palette={p} />
      <AbsoluteFill style={{opacity: ui, fontFamily: FONT.fontFamily, fontWeight: 800, color: p.ink}}>
        {m && (
          <div
            style={{
              position: 'absolute',
              ...rect,
              borderRadius: radius,
              overflow: 'hidden',
              boxShadow: k > 0 ? `0 18px 50px rgba(0,0,0,${0.3 * k})` : undefined,
              background: m.kind === 'audio' ? `${p.ink}1A` : '#000',
            }}
          >
            {m.kind === 'image' && !m.aspect && (
              <Img
                src={staticFile(`media/${swap ? m.revealSrc : m.src}`)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: swap ? 'contain' : m.fit ?? 'cover',
                  // пока на весь экран — медленный наезд
                  transform: `scale(${t < s.full ? 1 + 0.06 * (t / s.full) : 1.06 - 0.06 * k})`,
                }}
              />
            )}
            {m.kind === 'image' && m.aspect && (
              // картинка целиком с известными пропорциями: на неё можно положить размытие по долям
              <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${p.ink}14`}}>
                <div
                  style={{
                    position: 'relative',
                    height: rect.width / rect.height > m.aspect ? '100%' : undefined,
                    width: rect.width / rect.height > m.aspect ? undefined : '100%',
                    aspectRatio: String(m.aspect),
                    transform: zoomTransform(t, s, k, m.revealZoom),
                  }}
                >
                  <Img src={staticFile(`media/${swap ? m.revealSrc : m.src}`)} style={{width: '100%', height: '100%', display: 'block'}} />
                  {m.hide && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${m.hide[0] * 100}%`,
                        top: `${m.hide[1] * 100}%`,
                        width: `${m.hide[2] * 100}%`,
                        height: `${m.hide[3] * 100}%`,
                        borderRadius: 12,
                        backdropFilter: 'blur(14px)',
                        background: `${fill}CC`,
                        opacity: interpolate(t, [s.reveal, s.reveal + 0.35], [1, 0], clamp),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: label,
                        fontSize: 40,
                      }}
                    >
                      ???
                    </div>
                  )}
                </div>
                {m.revealZoom && t > s.reveal + ZOOM.end && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 300,
                      height: 300,
                      marginLeft: -150,
                      marginTop: -150,
                      borderRadius: '50%',
                      border: `8px solid ${label}`,
                      boxShadow: `0 0 30px ${label}`,
                      transform: `scale(${1 + 0.08 * Math.sin((t - s.reveal) * 9)})`,
                      opacity: interpolate(t, [s.reveal + ZOOM.end, s.reveal + ZOOM.end + 0.2], [0, 1], clamp),
                    }}
                  />
                )}
              </div>
            )}
            {m.kind === 'grid' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: 18,
                  padding: 22,
                  width: '100%',
                  height: '100%',
                  background: `${p.ink}14`,
                }}
              >
                {m.srcs.map((src, i) => (
                  <div
                    key={src}
                    style={{
                      minHeight: 0,
                      background: 'rgba(255,255,255,0.92)',
                      borderRadius: 22,
                      padding: 18,
                      opacity: interpolate(t, [0.15 + i * 0.25, 0.4 + i * 0.25], [0, 1], clamp),
                      transform: `scale(${interpolate(t, [0.15 + i * 0.25, 0.4 + i * 0.25], [0.85, 1], clamp)})`,
                    }}
                  >
                    <Img src={staticFile(`media/${src}`)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                  </div>
                ))}
              </div>
            )}
            {m.kind === 'video' && <VideoPhases m={m} s={s} />}
            {m.kind === 'audio' && (
              <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
                <div style={{flex: 1}}>
                  <Equalizer p={p} t={t} />
                </div>
                <div style={{textAlign: 'center', paddingBottom: '6%', fontSize: interpolate(k, [0, 1], [64, 34])}}>
                  🔊 Включи звук
                </div>
              </div>
            )}
          </div>
        )}

        <Hook q={q} t={t} s={s} />

        <div style={{position: 'absolute', left: LEFT, top: CHIP_Y}}>
          <Rise t={t} at={s.full + C.shrink * 0.6}>
            <span style={{background: fill, color: label, borderRadius: 99, padding: '10px 26px', fontSize: 32, textTransform: 'uppercase'}}>
              {q.tag}
            </span>
          </Rise>
        </div>
        <div style={{position: 'absolute', left: LEFT, top: textY, width: WIDTH}}>
          <Rise t={t} at={s.full + C.shrink * 0.7}>
            <div style={{fontSize: fit.size, lineHeight: 1.1}}>{q.text}</div>
          </Rise>
        </div>

        {nOpt > 0 && (
          <div style={{position: 'absolute', left: LEFT, top: optsY, width: WIDTH}}>
            <Options q={q} p={p} t={t} at={s.optsAt} reveal={s.reveal} />
          </div>
        )}

        <div style={{position: 'absolute', left: LEFT, top: FOOTER_Y, width: WIDTH}}>
          {!revealed ? (
            <Rise t={t} at={s.thinkAt - 0.25}>
              <div style={{display: 'flex', alignItems: 'center', gap: 20, fontSize: 34}}>
                <span style={{fontSize: 60, minWidth: 46}}>{t >= s.thinkAt ? Math.ceil(s.reveal - t) : ''}</span>
                <div style={{flex: 1}}>
                  <div style={{marginBottom: 12}}>Пиши ответ в комменты 👇</div>
                  <div style={{height: 14, borderRadius: 99, background: `${p.ink}26`, overflow: 'hidden'}}>
                    <div style={{width: `${timerK * 100}%`, height: '100%', borderRadius: 99, background: p.ink}} />
                  </div>
                </div>
              </div>
            </Rise>
          ) : (
            q.note && (
              <div style={{fontSize: 34, opacity: Math.min(1, pop * 2), transform: `translateY(${(1 - pop) * 20}px)`}}>{q.note}</div>
            )
          )}
        </div>

        {/* Открытый ответ — крупной плашкой в верхнем углу рамки медиа (внизу на скриншотах обычно цена) */}
        {revealed && typeof q.answer === 'string' && (
          <div
            style={{
              position: 'absolute',
              left: LEFT,
              top: m ? boxY - 30 : FOOTER_Y - 150,
              transform: `scale(${0.6 + 0.4 * pop}) rotate(-3deg)`,
              transformOrigin: 'left top',
              opacity: Math.min(1, pop * 2),
              background: fill,
              color: label,
              borderRadius: 30,
              padding: '20px 34px',
              fontSize: 64,
              boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
            }}
          >
            {q.answer}
          </div>
        )}
      </AbsoluteFill>

      {m?.kind === 'audio' && (
        <Sequence durationInFrames={Math.round((s.outroAt + C.fade) * fps)} layout="none">
          <Html5Audio src={staticFile(`media/${m.src}`)} trimBefore={Math.round((m.from ?? 0) * fps)} volume={(f) => mediaVolume(f / fps, s)} />
        </Sequence>
      )}
      {q.music && (
        <Sequence durationInFrames={Math.round((s.outroAt + C.fade) * fps)} layout="none">
          <Html5Audio
            src={staticFile(`media/${q.music.src}`)}
            trimBefore={Math.round((q.music.from ?? 0) * fps)}
            volume={(f) => musicVolume(f / fps, s, q)}
          />
        </Sequence>
      )}
      {s.lines?.h && (
        <Sequence from={Math.round(s.hookAt * fps)} layout="none">
          <Html5Audio src={staticFile(`voices/${s.lines.h.file}`)} />
        </Sequence>
      )}
      {q.revealAudio && (
        <Sequence from={Math.round(s.reveal * fps)} durationInFrames={Math.round((s.outroAt + C.fade - s.reveal) * fps)} layout="none">
          <Html5Audio
            src={staticFile(`media/${q.revealAudio.src}`)}
            trimBefore={Math.round((q.revealAudio.from ?? 0) * fps)}
            volume={(f) => mediaVolume(s.reveal + f / fps, s) * interpolate(f / fps, [0, 0.3], [0, 1], clamp)}
          />
        </Sequence>
      )}
      {s.lines && (
        <>
          <Sequence from={Math.round(s.sayAt * fps)} layout="none">
            <Html5Audio src={staticFile(`voices/${s.lines.q.file}`)} />
          </Sequence>
          <Sequence from={Math.round(s.answerAt * fps)} layout="none">
            <Html5Audio src={staticFile(`voices/${s.lines.a.file}`)} />
          </Sequence>
        </>
      )}

      <Sequence from={Math.round(s.outroAt * fps)} layout="none">
        <AbsoluteFill style={{opacity: interpolate(t, [s.outroAt, s.outroAt + C.fade], [0, 1], clamp)}}>
          <Outro palette={palette} voice={voice} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
